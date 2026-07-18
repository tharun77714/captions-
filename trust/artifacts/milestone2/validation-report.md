# Milestone 2 Browser Determinism Validation

- Result: **PASSED**
- Actual React preview: `/test-parity`
- Browser: headless Chromium via Playwright
- Playback control: `window.SET_CURRENT_TIME(time)`
- Pixel differences: **none**

## Timing

| Metric | Milliseconds |
| --- | ---: |
| Browser startup | 78.79 |
| Zustand hydration | 0.30 |
| Font loading | 46.50 |
| Ready-state wait | 2726.45 |
| Screenshot capture | 6016.29 |
| Total execution | 9310.50 |

## Repeated-capture pixel comparison

| Frame | Repeat | Identical | Differing pixels |
| --- | --- | --- | ---: |
| frame-0-000pct | frame-0-000pct-repeat-1.png | yes | 0 |
| frame-0-000pct | frame-0-000pct-repeat-2.png | yes | 0 |
| frame-1-025pct | frame-1-025pct-repeat-1.png | yes | 0 |
| frame-1-025pct | frame-1-025pct-repeat-2.png | yes | 0 |
| frame-2-050pct | frame-2-050pct-repeat-1.png | yes | 0 |
| frame-2-050pct | frame-2-050pct-repeat-2.png | yes | 0 |
| frame-3-075pct | frame-3-075pct-repeat-1.png | yes | 0 |
| frame-3-075pct | frame-3-075pct-repeat-2.png | yes | 0 |
| frame-4-100pct | frame-4-100pct-repeat-1.png | yes | 0 |
| frame-4-100pct | frame-4-100pct-repeat-2.png | yes | 0 |

All screenshots, any generated diff, this report, the JSON report, and the full harness log are in this directory.
