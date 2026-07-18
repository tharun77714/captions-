"""Milestone 2: deterministic Playwright validation of the actual React preview."""

import hashlib
import json
import shutil
import tempfile
import time
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Sequence

from PIL import Image, ImageChops
from playwright.async_api import Browser, BrowserContext, Page, async_playwright

from composition_engine.models.payload import RenderPayload
from composition_engine.encoders.base import Renderer, Frame, EngineConfig, EventBus


class DeterminismError(RuntimeError):
    """A repeated frame differs; no later frame may be captured."""


@dataclass
class PixelComparison:
    frame_label: str
    reference_file: str
    repeat_file: str
    identical: bool
    differing_pixels: int
    diff_file: str | None = None


class ChromiumRenderer(Renderer):
    def __init__(self, port: int = 3001, output_dir: str | Path | None = None, page: Page = None):
        self.base_url = f"http://localhost:{port}"
        self.workspace_root = Path(__file__).resolve().parents[2]
        self.output_dir = Path(output_dir) if output_dir else self.workspace_root / "trust" / "artifacts" / "milestone2"
        self.logs: List[str] = []
        self.page = page
        self.config = None
        self.event_bus = None
        self.session_id = "default_session"

    async def initialize(self, config: EngineConfig, event_bus: EventBus, session_id: str, page: Page = None) -> None:
        self.config = config
        self.event_bus = event_bus
        self.session_id = session_id
        if page:
            self.page = page
        if not self.page:
            raise RuntimeError("ChromiumRenderer requires a Page to be initialized.")
        
        # Inject CSS overrides to disable all CSS animations and transitions
        await self.page.add_style_tag(content="""
            *, *:before, *:after {
                transition: none !important;
                animation: none !important;
                transition-duration: 0s !important;
                animation-duration: 0s !important;
            }
            nextjs-portal, #__next-prerender-indicator, .nextjs-static-indicator {
                display: none !important;
            }
        """)

    async def render_frame(self, frame_index: int, presentation_timestamp: float) -> Frame:
        capture_start = time.time()
        command_id = await self._set_time_and_wait_for_commit(self.page, presentation_timestamp)
        image_payload = await self.page.screenshot(type="png")
        capture_end = time.time()
        capture_duration = capture_end - capture_start
        
        viewport = self.page.viewport_size
        width = viewport["width"] if viewport else 1080
        height = viewport["height"] if viewport else 1920
        
        sha256_hash = hashlib.sha256(image_payload).hexdigest()
        
        return Frame(
            frame_id=str(uuid.uuid4()),
            frame_index=frame_index,
            presentation_timestamp=presentation_timestamp,
            capture_start_time=capture_start,
            capture_end_time=capture_end,
            capture_duration=capture_duration,
            image_payload=image_payload,
            image_format="png",
            image_width=width,
            image_height=height,
            byte_size=len(image_payload),
            sha256_hash=sha256_hash
        )

    async def close(self) -> None:
        self.page = None

    def _log(self, message: str) -> None:
        line = f"[{time.strftime('%H:%M:%S')}] {message}"
        self.logs.append(line)
        print(line, flush=True)

    def _prepare_output(self) -> None:
        self.output_dir.mkdir(parents=True, exist_ok=True)
        for artifact in self.output_dir.glob("frame-*.png"):
            artifact.unlink()

    async def _serve_local_assets(self, context: BrowserContext) -> None:
        font_path = self.workspace_root / "trust" / "fonts" / "Inter-700.ttf"
        video_path = self.workspace_root / "trust" / "tests" / "export_after_fix.mp4"
        if not font_path.is_file() or not video_path.is_file():
            raise FileNotFoundError("Milestone 2 requires the checked-in local Inter font and MP4 fixture.")
        font_bytes, video_bytes = font_path.read_bytes(), video_path.read_bytes()

        async def google_css(route: Any) -> None:
            await route.fulfill(
                status=200,
                content_type="text/css; charset=utf-8",
                body='@font-face { font-family: "Inter"; font-style: normal; font-weight: 700; font-display: block; src: url("/milestone2-assets/Inter-700.ttf") format("truetype"); }',
            )

        async def font(route: Any) -> None:
            await route.fulfill(status=200, content_type="font/ttf", body=font_bytes)

        async def video(route: Any) -> None:
            await route.fulfill(status=200, content_type="video/mp4", body=video_bytes)

        await context.route("https://fonts.googleapis.com/**", google_css)
        await context.route("**/milestone2-assets/Inter-700.ttf", font)
        await context.route("**/milestone2-assets/background.mp4", video)
        self._log("Registered deterministic local assets; the /test-parity React page is served normally.")

    @staticmethod
    def _compare_images(frame_label: str, reference_path: Path, repeat_path: Path, diff_path: Path) -> PixelComparison:
        with Image.open(reference_path) as source, Image.open(repeat_path) as candidate:
            reference, repeat = source.convert("RGBA"), candidate.convert("RGBA")
            if reference.size != repeat.size:
                return PixelComparison(frame_label, reference_path.name, repeat_path.name, False, max(reference.width * reference.height, repeat.width * repeat.height))
            diff = ImageChops.difference(reference, repeat)
            if diff.convert("RGB").getbbox() is None:
                return PixelComparison(frame_label, reference_path.name, repeat_path.name, True, 0)
            pixels = sum(a != b for a, b in zip(reference.getdata(), repeat.getdata()))
            diff.save(diff_path)
            return PixelComparison(frame_label, reference_path.name, repeat_path.name, False, pixels, diff_path.name)

    async def _wait_for_ready_contract(self, page: Page) -> Dict[str, Any]:
        await page.wait_for_function(
            """() => {
              const state = window.__RENDER_READY_STATE__;
              return window.__IS_READY_TO_RENDER__ === true && state?.phase === 'ready' &&
                state.zustandHydrated && state.fontsLoaded && state.videoReady && state.documentReady &&
                typeof window.SET_CURRENT_TIME === 'function';
            }""",
            timeout=20_000,
        )
        return await page.evaluate("() => window.__RENDER_READY_STATE__")

    async def _set_time_and_wait_for_commit(self, page: Page, time_point: float) -> int:
        command_id = await page.evaluate("""(time) => {
          if (typeof window.SET_CURRENT_TIME !== 'function') throw new Error('SET_CURRENT_TIME is unavailable.');
          return window.SET_CURRENT_TIME(time);
        }""", time_point)
        try:
            await page.wait_for_function(
                """({time, commandId}) => {
                  const state = window.__RENDER_READY_STATE__;
                  const signal = document.getElementById('render-commit-signal');
                  return state?.phase === 'ready' && state.renderedTime === time && state.renderedCommandId === commandId &&
                    signal?.getAttribute('data-rendered-time') === String(time) &&
                    signal?.getAttribute('data-rendered-command-id') === String(commandId);
                }""",
                arg={"time": time_point, "commandId": command_id},
                timeout=10_000,
            )
        except Exception as e:
            state_info = await page.evaluate("""() => {
                const signal = document.getElementById('render-commit-signal');
                return {
                    state: window.__RENDER_READY_STATE__,
                    signalTimeAttr: signal ? signal.getAttribute('data-rendered-time') : 'no_signal',
                    signalCommandAttr: signal ? signal.getAttribute('data-rendered-command-id') : 'no_signal',
                    currentTimeInStore: window.__INITIAL_PAYLOAD__ ? null : 'no_store' // placeholder
                };
            }""")
            print(f"\n--- COMMIT TIMEOUT DIAGNOSTIC INFO ---")
            print(f"Target Time:        {time_point}")
            print(f"Target Command ID:  {command_id}")
            print(f"State object:       {state_info['state']}")
            print(f"Signal time attr:   {state_info['signalTimeAttr']}")
            print(f"Signal command attr: {state_info['signalCommandAttr']}")
            print(f"--------------------------------------\n")
            raise e
        return command_id

    def _write_report(self, report: Dict[str, Any]) -> None:
        (self.output_dir / "validation.log").write_text("\n".join(self.logs) + "\n", encoding="utf-8")
        (self.output_dir / "validation-report.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        m, comparisons = report["metrics"], report["comparisons"]
        lines = [
            "# Milestone 2 Browser Determinism Validation", "",
            f"- Result: **{report['result'].upper()}**",
            "- Actual React preview: `/test-parity`",
            "- Browser: headless Chromium via Playwright",
            "- Playback control: `window.SET_CURRENT_TIME(time)`",
            f"- Pixel differences: **{'present' if report['pixel_differences_exist'] else 'none'}**", "",
            "## Timing", "", "| Metric | Milliseconds |", "| --- | ---: |",
            f"| Browser startup | {m.get('browser_startup_ms', 0):.2f} |",
            f"| Zustand hydration | {m.get('hydration_time_ms', 0):.2f} |",
            f"| Font loading | {m.get('font_loading_time_ms', 0):.2f} |",
            f"| Ready-state wait | {m.get('ready_state_wait_ms', 0):.2f} |",
            f"| Screenshot capture | {m.get('screenshot_capture_total_ms', 0):.2f} |",
            f"| Total execution | {m.get('total_execution_ms', 0):.2f} |", "",
            "## Repeated-capture pixel comparison", "", "| Frame | Repeat | Identical | Differing pixels |", "| --- | --- | --- | ---: |",
        ]
        lines.extend(f"| {c['frame_label']} | {c['repeat_file']} | {'yes' if c['identical'] else 'no'} | {c['differing_pixels']} |" for c in comparisons)
        lines.extend(["", "All screenshots, any generated diff, this report, the JSON report, and the full harness log are in this directory.", ""])
        (self.output_dir / "validation-report.md").write_text("\n".join(lines), encoding="utf-8")

    async def render_session(self, payload: RenderPayload, time_points: Sequence[float], repeats_per_frame: int = 3) -> Dict[str, Any]:
        if len(time_points) != 5 or repeats_per_frame < 2:
            raise ValueError("Milestone 2 requires five time points and at least two captures per frame.")
        
        # Keep original output dir, and use a temp dir for execution to avoid triggering dev server Fast Refresh
        target_output_dir = self.output_dir
        temp_dir = tempfile.TemporaryDirectory(prefix="vidyut-render-")
        self.output_dir = Path(temp_dir.name)

        self._prepare_output()
        started_at = time.perf_counter()
        metrics: Dict[str, float] = {}
        screenshots: Dict[str, bytes] = {}
        screenshot_paths: List[str] = []
        comparisons: List[PixelComparison] = []
        console, page_errors = [], []
        ready_state: Dict[str, Any] | None = None
        failure: str | None = None
        browser: Browser | None = None
        result = "failed"
        report: Dict[str, Any] = {"milestone": 2, "result": result, "time_points": list(time_points), "repeats_per_frame": repeats_per_frame, "screenshots": screenshot_paths, "comparisons": [], "pixel_differences_exist": False, "metrics": metrics, "ready_state": None, "browser_console": console, "browser_errors": page_errors, "failure": None}
        try:
            async with async_playwright() as playwright:
                browser_started_at = time.perf_counter()
                browser = await playwright.chromium.launch(headless=True, args=["--disable-gpu", "--force-color-profile=srgb", "--font-render-hinting=none"])
                metrics["browser_startup_ms"] = (time.perf_counter() - browser_started_at) * 1_000
                self._log(f"Headless Chromium launched in {metrics['browser_startup_ms']:.2f} ms.")
                context = await browser.new_context(viewport={"width": payload.dimensions.width, "height": payload.dimensions.height}, device_scale_factor=1, color_scheme="dark", locale="en-US", timezone_id="UTC", reduced_motion="reduce")
                await self._serve_local_assets(context)
                page = await context.new_page()
                page.on("console", lambda message: console.append(f"{message.type}: {message.text}"))
                page.on("pageerror", lambda error: page_errors.append(str(error)))
                await page.add_init_script(script=f"window.__INITIAL_PAYLOAD__ = {json.dumps(payload.model_dump(by_alias=True))}; window.__EXPORT_MODE__ = true;")
                self._log("Injected the validated RenderPayload before React scripts executed.")
                ready_started_at = time.perf_counter()
                await page.goto(f"{self.base_url}/test-parity?export=true", wait_until="domcontentloaded")
                ready_state = await self._wait_for_ready_contract(page)
                metrics["ready_state_wait_ms"] = (time.perf_counter() - ready_started_at) * 1_000
                metrics["hydration_time_ms"] = float(ready_state["timings"]["hydrationMs"])
                metrics["font_loading_time_ms"] = float(ready_state["timings"]["fontLoadingMs"])
                self._log("Ready-state contract confirmed: Zustand, fonts, video, document, and SET_CURRENT_TIME are ready.")
                
                # Disable all transitions/animations for frame-level determinism
                await page.add_style_tag(content="""
                    *, *:before, *:after {
                        transition: none !important;
                        animation: none !important;
                        transition-duration: 0s !important;
                        animation-duration: 0s !important;
                    }
                    nextjs-portal, #__next-prerender-indicator, .nextjs-static-indicator {
                        display: none !important;
                    }
                """)
                self._log("Injected CSS overrides to disable all CSS animations and transitions.")
                
                capture_started_at = time.perf_counter()
                for index, time_point in enumerate(time_points):
                    label = f"frame-{index}-{index * 25:03d}pct"
                    reference = self.output_dir / f"{label}.png"
                    for repeat_index in range(repeats_per_frame):
                        command_id = await self._set_time_and_wait_for_commit(page, time_point)
                        capture = reference if repeat_index == 0 else self.output_dir / f"{label}-repeat-{repeat_index}.png"
                        image = await page.screenshot(path=str(capture), type="png")
                        screenshot_paths.append(capture.name)
                        self._log(f"Captured {capture.name} after SET_CURRENT_TIME({time_point}) command {command_id}.")
                        if repeat_index == 0:
                            screenshots[label] = image
                            continue
                        comparison = self._compare_images(label, reference, capture, self.output_dir / f"{label}-repeat-{repeat_index}-diff.png")
                        comparisons.append(comparison)
                        if not comparison.identical:
                            report["pixel_differences_exist"] = True
                            self._log(f"FAILED {label}: {comparison.differing_pixels} pixels differ; stopping before later frames.")
                            raise DeterminismError(f"{label} differs from its repeat ({comparison.differing_pixels} pixels; {comparison.diff_file}).")
                        self._log(f"Pixel comparison passed for {capture.name}: 0 differing pixels.")
                metrics["screenshot_capture_total_ms"] = (time.perf_counter() - capture_started_at) * 1_000
                metrics["screenshot_capture_average_ms"] = metrics["screenshot_capture_total_ms"] / len(screenshot_paths)
                result = "passed"
                self._log("All five frames passed repeated pixel-identical capture checks.")
                await context.close()
                await browser.close()
                browser = None
        except Exception as error:
            failure = str(error)
            self._log(f"Validation failed: {failure}")
            raise
        finally:
            if browser is not None:
                await browser.close()
            metrics["total_execution_ms"] = (time.perf_counter() - started_at) * 1_000
            report.update({"result": result, "screenshots": screenshot_paths, "comparisons": [asdict(c) for c in comparisons], "pixel_differences_exist": report["pixel_differences_exist"] or any(not c.identical for c in comparisons), "metrics": metrics, "ready_state": ready_state, "failure": failure})
            self._write_report(report)
            
            # Copy all files from the temp directory to the final output directory
            target_output_dir.mkdir(parents=True, exist_ok=True)
            for artifact in target_output_dir.glob("*"):
                if artifact.is_file():
                    artifact.unlink()
            for temp_file in self.output_dir.glob("*"):
                if temp_file.is_file():
                    shutil.copy2(temp_file, target_output_dir)
            
            # Restore output_dir and cleanup temp_dir
            self.output_dir = target_output_dir
            try:
                temp_dir.cleanup()
            except Exception:
                pass
        return {"screenshots": screenshots, "screenshot_paths": screenshot_paths, "determinism_verified": len(comparisons) == len(time_points) * (repeats_per_frame - 1) and all(c.identical for c in comparisons), "pixel_differences_exist": report["pixel_differences_exist"], "metrics": metrics, "artifact_directory": str(self.output_dir), "report": report}


