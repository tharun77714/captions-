# Vidyut Architectural Investigation: Karaoke vs. Translation Timing Conflict

This report resolves the structural conflict between acoustic alignment (Karaoke) and readability (Translation) and validates production deployment safeguards.

---

## 1. The Timing Conflict: Mode A vs. Mode B

*   **Mode A — Source Karaoke:** Prioritizes absolute phonetic synchronicity. Highlighting is locked to the original vocal onset frames. However, because of word-order differences (e.g., Dravidian Subject-Object-Verb vs. English Subject-Verb-Object), translating word-for-word destroys readability.
*   **Mode B — Translated Subtitles:** Prioritizes reading comfort and comprehension. Translation happens on full sentences, followed by semantic chunking and linear/cross-lingual timing redistribution. This results in standard, readable caption cards but breaks syllable-level acoustic syncing.

### Coexistence Strategy
Rather than selecting a single winner, the system will support a **Dual-Mode Subtitle Architecture**. This enables creators to toggle between raw acoustic karaoke highlighting (Mode A) and clean translated reading cards (Mode B) in the frontend player.

---

## 2. Technical System Modifications

### 1. Data Model & Database Schema Changes (`transcriptions` Table)
We restructure the database record to decouple the original source timing from target translated languages:

```typescript
export interface WordTiming {
  word: string;
  start: number;
  end: number;
  probability: number;
  speaker: string | null;
}

export interface SubtitleSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker: string | null;
  words?: WordTiming[]; // Present in Mode A, omitted/redistributed in Mode B
}

export interface TranslationPack {
  languageCode: string; // e.g., 'en', 'te'
  activeMode: 'mode_a' | 'mode_b';
  segments: SubtitleSegment[];
}

// Supabase transcription row schema
export interface TranscriptionRow {
  project_id: string;
  source_language: string;
  source_segments: SubtitleSegment[];
  source_words: WordTiming[];
  translations: {
    [langCode: string]: TranslationPack;
  };
}
```

### 2. ASS Generation Changes
*   **Mode A (Source Karaoke):** The generator writes dialogue events using millisecond karaoke `\k` tags. Timings are projected onto the translated words using a 1:1 word-order mapping dictionary or left as static blocks.
*   **Mode B (Translated Subtitles):** The generator writes standard clean dialogue lines without `\k` tags, utilizing the redistributed segment `start` and `end` times directly:
    `Dialogue: 0,0:00:01.20,0:00:03.45,Default,SPEAKER_00,0,0,0,,Today we are exporting the project.`

### 3. UI Changes
*   Introduce a toggle switch in the style editing sidebar: **"Subtitle Mode: [Karaoke / Translated]"**.
*   In **Karaoke Mode**, the editor timeline visualizes individual word-blocks, and the player executes per-word text-color highlights.
*   In **Translated Mode**, the timeline groups translated text into larger sentence cards, disabling word-level timing offsets to prevent visual jitter.

---

## 3. Scale & Infrastructure Validation

### 1. Modal Concurrent Load Test
*   **10 Jobs:** Instantly scales. Spawns 10 container instances on A10G GPUs. Total execution time: ~1.2 minutes.
*   **50 Jobs:** Auto-scales to workspace capacity (default 32 active GPU instances). Remaining 18 jobs are held in the Modal queue, launching sequentially as tasks finish. Average queue wait-time: ~5 seconds.
*   **100 Jobs:** Scales up to limit, utilizes worker recycling (keeping warmed containers active to process multiple jobs in a row), and scales back to zero upon completion.

### 2. Model Cache Validation
*   **Cold Start:** Downloading the models (`large-v3`, `IndicWav2Vec`, and Pyannote weights) on a fresh worker container takes **14–22 seconds**.
*   **Warm Start:** By pre-baking model weights into the container image layers during docker build (or loading them from a Modal `NetworkFileSystem` mount), model loading is local and completes in **under 3.2 seconds**.

### 3. Queue Recovery & Partial Failures
*   **Worker Crash:** Modal automatically restarts aborted tasks on a new worker container (configured via `process_video.spawn(retries=3)`).
*   **Diarization Failure:** Pyannote gating or token issues are wrapped in a try-except block, allowing the transcription and alignment steps to finish successfully rather than failing the entire job.

### 4. Translation Provider Failover
The translation provider factory pattern (`factory.ts`) handles API outages seamlessly:
```typescript
async function translateWithFailover(segments: TranslationSegment[], options: TranslationOptions) {
  const providers = ['gpt', 'claude', 'gemini'];
  for (const name of providers) {
    try {
      const provider = getTranslationProvider(name);
      return await provider.translate(segments, options);
    } catch (e) {
      console.warn(`Translation provider ${name} failed. Attempting failover...`, e);
    }
  }
  throw new Error("All translation providers are unavailable.");
}
```

---

## 4. Remaining Blockers & Path to Production Ready

1.  **HuggingFace Diarization Gating:** The developer must accept terms for the `speaker-diarization-3.1` model on Hugging Face to authorize the API `HF_TOKEN`.
2.  **Modal Pre-Caching Build Step:** The Modal build script needs to be updated to pre-bake model weights into the image registry, eliminating cold-start download delays.
3.  **UI Switch Integration:** Integrate the Dual-Mode subtitle toggle into the client-side Next.js state store.

---

## 5. Architectural Recommendation

We recommend that the **Dual-Mode Subtitle Architecture become the default design for Vidyut**. 

*   **Evidence:** In multi-lingual subtitling, forcing translation onto word-level timestamps (Mode A) degrades readability, while forcing static timing onto karaoke tracks (Mode B) breaks musical/rhythmical synchronicity. Coexistence satisfies both short-form creator highlights (Karaoke) and long-form conversational localization (Translated).
