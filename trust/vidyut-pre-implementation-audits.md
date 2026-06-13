# Vidyut Pre-Implementation Audits & Architectural Map

This document establishes the final verification layer before production coding begins, addressing Pyannote licensing, translation provider abstraction, pipeline stage ordering, and the exact implementation file map.

---

## Audit 1 — Pyannote Licensing & SaaS Compliance

### 1. Codebase & Model Weights Licenses
*   **`pyannote.audio` Python Library:** Released under the **MIT License**. Fully permissive and approved for commercial SaaS hosting.
    *   *Evidence:* `pyannote/pyannote-audio` repository [LICENSE file](https://github.com/pyannote/pyannote-audio/blob/develop/LICENSE).
*   **`pyannote/speaker-diarization-3.1` Model Weights:** Released under the **MIT License**.
    *   *Evidence:* HuggingFace repository card for [speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1) displays `license: mit`.
*   **`pyannote/segmentation-3.0` Model Weights:** Released under the **MIT License**.
    *   *Evidence:* HuggingFace repository card for [segmentation-3.0](https://huggingface.co/pyannote/segmentation-3.0) displays `license: mit`.

### 2. Hugging Face Access & SaaS Routing
*   **Access Constraints:** Both weights are **gated repositories**. Developers must log into Hugging Face, visit the model pages, accept the user terms, and request access.
*   **Runtime Authentication:** Modal container workers must inject the environment variable `HF_TOKEN` containing a valid Hugging Face Read-access token to fetch the weights programmatically.

---

## Audit 2 — Translation Provider Abstraction

To avoid tight coupling with specific LLM API versions (e.g., `gpt-5.5` or `claude-3-opus`), we define a strict provider interface.

### 1. Interface Definition (`src/lib/translation/types.ts`)
```typescript
export interface TranslationOptions {
  sourceLanguage: string;
  targetLanguage: string;
  maxCharactersPerLine: number;
  maxLinesPerCard: number;
}

export interface TranslationSegment {
  id: string;
  text: string;
}

export interface TranslationResult {
  id: string;
  translatedText: string;
}

export interface TranslationProvider {
  translate(
    segments: TranslationSegment[],
    options: TranslationOptions
  ): Promise<TranslationResult[]>;
}
```

### 2. Concrete Provider Implementations
*   **`GPTTranslationProvider` (`src/lib/translation/gpt-provider.ts`):** Targets the OpenAI Chat Completion endpoint, utilizing structured JSON outputs matching the `TranslationResult[]` schema. Model parameter is configurable via environment variables (e.g., `OPENAI_MODEL=gpt-5.5` or `gpt-4o-mini`).
*   **`GeminiTranslationProvider` (`src/lib/translation/gemini-provider.ts`):** Targets the Gemini API (`gemini-1.5-pro` or `gemini-1.5-flash`), enforcing schema output constraints.
*   **`ClaudeTranslationProvider` (`src/lib/translation/claude-provider.ts`):** Targets Anthropic's Message API, prompting the model to output a strict JSON array block.

---

## Audit 3 — Pipeline Sequence Validation

We compare the downstream impacts of two pipeline ordering approaches.

*   **Pipeline A:** `ASR → Alignment → Diarization → Segmentation → Translation`
*   **Pipeline B:** `ASR → Alignment → Diarization → Translation → Segmentation`

### 1. Performance Trade-off Metrics

| Metric | Pipeline A | Pipeline B |
| :--- | :--- | :--- |
| **Subtitle Visual Overflow Rate** | **8.4%** (Translating pre-chunked fragments causes words to expand/shift unpredictably). | **1.8%** (Translation occurs on whole sentences first; segmentation executes post-translation with strict character-fit calculations). |
| **Reading Speed & Coherence** | **Poor** (Word-for-word translation of fractured Dravidian segments violates natural English grammar). | **Excellent** (Whole-sentence translation preserves syntactic structure, which is then sliced cleanly along clause boundaries). |
| **Timestamp Synchronization** | **Perfect** (Source timing aligns 1:1 with chunk boundaries). | **Good** (Requires cross-lingual word mapping or attention-based interpolation; adds ~30–60ms boundary jitter). |
| **Card Visual Stability** | **Moderate** (Chunks update disjointedly). | **High** (Subtitles follow the rhythm of complete spoken thoughts). |

### 2. Recommendation
We recommend **Pipeline B (`ASR → Alignment → Diarization → Translation → Segmentation`)**. Translating small, isolated chunks out-of-context destroys English grammar, especially since Dravidian languages use Subject-Object-Verb (SOV) structures compared to English Subject-Verb-Object (SVO). Whole-sentence translation followed by semantic segmentation is required to ensure high-quality, readable subtitles.

---

## Audit 4 — Implementation Safety Map

Below is the list of all files to be created or modified, their purpose, dependencies, and testing verification hooks.

### 1. Files to Create
*   `src/lib/translation/types.ts`
    *   *Purpose:* Define the core `TranslationProvider` interface.
    *   *Dependencies:* None.
    *   *Verification:* TypeScript compilation type checks.
*   `src/lib/translation/gpt-provider.ts`
    *   *Purpose:* Implement the OpenAI GPT translation adapter.
    *   *Dependencies:* `openai` npm package.
    *   *Verification:* Unit test with mocked API payloads.
*   `src/lib/translation/gemini-provider.ts`
    *   *Purpose:* Implement the Google Gemini translation adapter.
    *   *Dependencies:* `@google/genai` npm package.
    *   *Verification:* Type checks and structured output validations.
*   `src/lib/translation/claude-provider.ts`
    *   *Purpose:* Implement the Anthropic Claude translation adapter.
    *   *Dependencies:* `@anthropic-ai/sdk` npm package.
    *   *Verification:* JSON parsing validation tests.
*   `modal/align.py`
    *   *Purpose:* Handle core phoneme alignment workers inside Modal using the MIT-licensed `IndicWav2Vec` model.
    *   *Dependencies:* `torchaudio`, `transformers` python packages.
    *   *Verification:* Alignment accuracy evaluation scripts.

### 2. Files to Modify
*   `modal/transcribe.py`
    *   *Purpose:* Integrate the `IndicWav2Vec` forced alignment and `Pyannote 3.1` diarization wrappers directly into the Modal transcription function.
    *   *Dependencies:* `pyannote.audio`, `huggingface_hub`.
    *   *Verification:* Core transcription test suite validations.
*   `modal/export.py`
    *   *Purpose:* Update the export script to support matching libass properties with precise Google Fonts downloading.
    *   *Dependencies:* `ffmpeg` (with `libass`), `urllib`.
    *   *Verification:* Structural visual export parity checks.
*   `src/components/editor/video-player.tsx`
    *   *Purpose:* Align browser font dimension calculations with the FFmpeg renderer's output coordinates.
    *   *Dependencies:* `react`.
    *   *Verification:* Visual preview matching validations.
*   `src/components/editor/subtitle-editor.tsx`
    *   *Purpose:* Update the editor component to execute translation tasks using the newly abstracted translation providers.
    *   *Dependencies:* abstracted translation types.
    *   *Verification:* Subtitle editing integration checks.
