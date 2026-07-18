import asyncio
import copy
from pathlib import Path

from composition_engine.models.payload import RenderPayload
from composition_engine.renderers.chromium import ChromiumRenderer
from composition_engine.tests.test_milestone1 import BASE_PAYLOAD


async def run_deterministic_frame_capture_inner() -> None:
    payload_data = copy.deepcopy(BASE_PAYLOAD)
    payload_data["backgroundVideo"]["url"] = "http://localhost:3001/milestone2-assets/background.mp4"
    payload = RenderPayload(**payload_data)
    output_dir = Path(__file__).resolve().parents[2] / "trust" / "artifacts" / "milestone2"
    result = await ChromiumRenderer(port=3001, output_dir=output_dir).render_session(
        payload, [0.0, 2.5, 5.0, 7.5, 10.0], repeats_per_frame=3
    )
    assert len(result["screenshots"]) == 5
    assert len(result["screenshot_paths"]) == 15
    assert result["determinism_verified"] is True
    assert result["pixel_differences_exist"] is False
    assert all((output_dir / name).is_file() for name in ("validation.log", "validation-report.json", "validation-report.md"))
    metrics = result["metrics"]
    print("\n=== MILESTONE 2 VALIDATION REPORT ===")
    print(f"Browser Startup Time:   {metrics['browser_startup_ms']:.2f} ms")
    print(f"Hydration Time:         {metrics['hydration_time_ms']:.2f} ms")
    print(f"Font Loading Time:      {metrics['font_loading_time_ms']:.2f} ms")
    print(f"Ready-State Wait Time:  {metrics['ready_state_wait_ms']:.2f} ms")
    print(f"Screenshot Capture:     {metrics['screenshot_capture_total_ms']:.2f} ms")
    print(f"Total Execution Time:   {metrics['total_execution_ms']:.2f} ms")
    print("Pixel Differences:      none")
    print(f"Artifacts:              {output_dir}")


def test_deterministic_frame_capture() -> None:
    asyncio.run(run_deterministic_frame_capture_inner())

