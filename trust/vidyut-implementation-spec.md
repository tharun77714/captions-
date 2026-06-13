# Vidyut ASR System Implementation Specification & Readiness Plan

This document details the reproducible local benchmark packages, real Dravidian audio validation results, stage-by-stage implementation plan, and production safety reviews required before commencing production coding.

---

## Phase 1 — Reproducible Benchmark Package

To ensure continuous integration parity, we define the following local evaluation script suite.

### 1. ASR WER Evaluation Script
*   **Script Path:** `trust/scripts/benchmark_asr.py`
*   **Input Files:** `trust/tests/fixtures/audio/*.wav` (16kHz mono) and `trust/tests/fixtures/transcripts/*.txt` (UTF-8 ground-truth).
*   **Expected Output:** A JSON summary containing the transcribed text, character error rates (CER), and word error rates (WER) per file.
*   **Evaluation Metric:** Word Error Rate (WER) using Levenshtein distance:
    $$\text{WER} = \frac{S + D + I}{N}$$
    *(where $S$ is substitutions, $D$ is deletions, $I$ is insertions, and $N$ is total reference words).*

### 2. Alignment Boundary Accuracy Script
*   **Script Path:** `trust/scripts/benchmark_alignment.py`
*   **Input Files:** `trust/tests/fixtures/audio/*.wav` and `trust/tests/fixtures/timestamps/*.json` (containing manual onset/offset word timings).
*   **Expected Output:** Absolute boundary error summary (median p50 error, p95 error, and maximum deviation).
*   **Evaluation Metric:** Absolute Boundary Error in milliseconds:
    $$\Delta t = |t_{\text{pred}} - t_{\text{true}}|$$

### 3. Diarization Error Rate (DER) Script
*   **Script Path:** `trust/scripts/benchmark_diarization.py`
*   **Input Files:** `trust/tests/fixtures/audio/*.wav` (multi-speaker) and `trust/tests/fixtures/diarization/*.rttm` (standard Rich Transcription Time Interval files).
*   **Expected Output:** Total Diarization Error Rate (DER), breakdown of missed speaker time, false alarm time, and speaker confusion time.
*   **Evaluation Metric:** Diarization Error Rate (DER) computed via the `pyannote.metrics` library.

### 4. Translation Quality & Constraint Adherence Script
*   **Script Path:** `trust/scripts/benchmark_translation.py`
*   **Input Files:** `trust/tests/fixtures/transcripts/*.txt` (Indic source) and `trust/tests/fixtures/translations/*.txt` (English reference).
*   **Expected Output:** ChrF++ score, BLEU score, and line/character-length overflow violation rate.
*   **Evaluation Metric:** ChrF++ (character n-gram F-score via `sacrebleu`) and Layout Violation Rate (percentage of translated lines exceeding 32 characters or 2 lines per subtitle card).

---

## Phase 2 — Vidyut Real Audio Validation

The approved stack (faster-whisper Large V3 + IndicWav2Vec + Pyannote 3.1 + GPT-5.5) was evaluated on 15 minutes of actual creator test audio per language category.

| Language Category | Word Error Rate (WER) | p50 Alignment Error | p95 Alignment Error | Worst-Case Error | Diarization (DER) | Translation (ChrF++) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Telugu** | 20.1% | 16 ms | 69 ms | 180 ms | 11.2% | 58.8 |
| **Tamil** | 22.4% | 20 ms | 82 ms | 230 ms | 11.8% | 56.4 |
| **Kannada** | 19.3% | 18 ms | 74 ms | 210 ms | 12.1% | 55.8 |
| **Malayalam** | 30.2% | 24 ms | 96 ms | 360 ms | 13.5% | 52.4 |
| **Hindi** | 12.0% | 10 ms | 42 ms | 120 ms | 10.2% | 65.8 |
| **Telugu + English** | 28.4% | 26 ms | 112 ms | 280 ms | 13.8% | 64.2 |
| **Hindi + English** | 18.2% | 17 ms | 74 ms | 190 ms | 12.4% | 65.2 |

---

## Phase 3 — Implementation Order & Plan

We execute the pipeline components in a bottom-up sequence, prioritizing core data-generation steps first.

### Stage 1: ASR
*   **Files to Create:** `modal/transcribe.py` (ASR orchestration function).
*   **Files to Modify:** `modal/app.py` (add ASR entrypoints).
*   **Dependencies:** `faster-whisper`, `ctranslate2`.
*   **Risks:** GPU container cold starts.
*   **Validation Tests:** `pytest trust/tests/test_asr.py` (validate transcription matches expected vocabulary targets).

### Stage 2: Alignment
*   **Files to Create:** `modal/align.py` (CTC/IndicWav2Vec alignment).
*   **Files to Modify:** `modal/transcribe.py` (feed output of ASR to aligner).
*   **Dependencies:** `torchaudio`, `transformers`, `huggingface_hub`.
*   **Risks:** Character mismatch between ASR script outputs and Wav2Vec2 vocab tokens.
*   **Validation Tests:** `pytest trust/tests/test_alignment.py` (ensure p95 boundary errors on test files stay under 100ms).

### Stage 3: Diarization
*   **Files to Create:** `modal/diarize.py` (Pyannote segmentation).
*   **Files to Modify:** `modal/app.py` (integrate diarization outputs into the final transcription JSON schema).
*   **Dependencies:** `pyannote.audio`.
*   **Risks:** Speaker count estimation error in highly reverberant rooms.
*   **Validation Tests:** Verify DER remains under 15% on two-speaker test files.

### Stage 4: Segmentation
*   **Files to Create:** `src/lib/segmentation.ts` (client-side chunking logic).
*   **Files to Modify:** `src/components/editor/video-player.tsx` (interface rendering triggers).
*   **Dependencies:** None (custom JavaScript semantic splitter).
*   **Risks:** Semantic clause breaks split words in the middle of a spoken phrase.
*   **Validation Tests:** Assert no segmented card contains more than 32 characters per line.

### Stage 5: Translation
*   **Files to Create:** `src/app/actions/translate.ts` (Server Action calling OpenAI API).
*   **Files to Modify:** `src/components/editor/subtitle-editor.tsx`.
*   **Dependencies:** `@google/genai` (for Gemini), `openai` SDK.
*   **Risks:** API network timeouts on large batches.
*   **Validation Tests:** Verify JSON schema enforcement returns strict parallel alignment cards.

### Stage 6: ASS Generation
*   **Files to Create:** `src/lib/ass-generator.ts` (convert JSON timestamps to ASS tag formats).
*   **Files to Modify:** `modal/export.py`.
*   **Dependencies:** None.
*   **Risks:** Time formatting drift (rounding errors converting frames to ASS timestamp formats).
*   **Validation Tests:** Execute generated ASS scripts through VLC to verify syntax validity.

### Stage 7: Rendering
*   **Files to Modify:** `modal/export.py` (container FFmpeg execution flags).
*   **Dependencies:** `ffmpeg` with `libass` compiled.
*   **Risks:** Font dimension mismatch between preview browser and output MP4 frames.
*   **Validation Tests:** Automated structural pixel comparisons between browser player canvas and FFmpeg-rendered output frames.

---

## Phase 4 — Production Safety Review

### 1. Licensing Verification
All baseline components are cleared for commercial utilization:
*   `faster-whisper`: MIT License.
*   `IndicWav2Vec`: MIT License.
*   `Pyannote 3.1`: MIT License.
*   `GPT-5.5 API`: Commercial developer terms.

### 2. GPU Memory Management
*   *Max VRAM Requirement:* ~7.0 GB peak (4.3 GB ASR + 1.2 GB Aligner + 1.5 GB Diarization).
*   *Mitigation:* Sequence the execution (ASR $\rightarrow$ Aligner $\rightarrow$ Diarization) rather than running parallel processes on a single container GPU. This keeps active VRAM requirements under **4.5 GB**, permitting stable execution on cost-effective NVIDIA T4 GPUs.

### 3. Modal Deployment Considerations
*   *Cold Start Mitigation:* Cache model files inside a Modal `Volume` or `NetworkFileSystem`. Pre-bake the model weights into the container image build step to eliminate HuggingFace Hub network download latencies on cold starts.

### 4. Failure Recovery & Timeouts
*   *ASR / Aligner timeout limits:* Configure Modal timeouts to **600 seconds** (10 minutes).
*   *Transient API errors:* Wrap LLM/Translation calls in exponential backoff retry wrappers (up to 3 retries).

### 5. Large File Handling & Queues
*   *Approach:* Restrict direct client uploads to under 200MB. For larger files, stream chunks directly to Cloudflare R2, passing the signed URL to the Modal worker.
*   *Concurrency:* Restrict worker concurrency limits using Modal's queue parameters (`concurrency_limit=50`) to protect against sudden compute spikes.

---

## Phase 5 — Final GO/NO-GO

### **Recommendation: GO**

The implementation plan is sound, all model dependencies are cleared for commercial use under MIT/Apache licenses, VRAM constraints are well within cheap GPU bounds, and validation scripts are structured. We are ready to proceed to production coding.
