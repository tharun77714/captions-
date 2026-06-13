# Speaker Diarization Models Comparison

This report investigates the diarization capabilities of **Pyannote**, **WhisperX**, **AssemblyAI**, and **Google Cloud Speech-to-Text**. The comparison focuses on podcast quality, interview quality, multi-speaker environments, and speaker confusion rates. 

## 1. Pyannote.audio (v3.1+)
**Type:** Open-Source (Self-hosted, GPU-accelerated)

Pyannote is widely considered the "gold standard" for open-source diarization models.
*   **Podcast Quality:** Strong on clean, well-recorded tracks. However, casual podcasts with frequent crosstalk, laughter, and interruptions can degrade performance.
*   **Interview Quality:** Excellent for structured 1-on-1 interviews with minimal overlap.
*   **Multi-Speaker Quality:** Handles multi-speaker scenarios decently, achieving a Diarization Error Rate (DER) of **11%–19%** on standard benchmarks (like AMI and DIHARD). Performance dips slightly as the number of speakers increases beyond 4.
*   **Speaker Confusion Rates:** Speaker confusion is its primary source of error when dealing with overlapping speech or similar-sounding voices. Requires careful pre-processing (like noise reduction or source separation using tools like Demucs) to minimize confusion in noisy environments.

## 2. WhisperX
**Type:** Open-Source Pipeline (ASR + Diarization)

WhisperX isn't a standalone diarization model; it is an integration layer that aligns OpenAI's Whisper transcripts with **Pyannote's** diarization.
*   **Podcast Quality:** Very popular among podcast creators because it combines highly accurate transcription (Whisper) with word-level timestamps. 
*   **Interview Quality:** Great for interviews, though its diarization accuracy is bound by Pyannote's underlying performance. 
*   **Multi-Speaker Quality:** Inherits Pyannote's multi-speaker capabilities. 
*   **Speaker Confusion Rates:** Because it relies on Pyannote, it suffers from the same speaker confusion issues during overlap. However, the precise word-level alignment helps clean up transcript boundaries, making the final output feel more cohesive than raw Pyannote.

## 3. AssemblyAI (Universal-2 / Universal-3)
**Type:** Commercial Managed API

AssemblyAI provides highly optimized, production-ready proprietary models designed specifically for real-world, noisy data.
*   **Podcast Quality:** Highly optimized for long-form content like podcasts. Recent updates (like Universal-2) introduced a **64% reduction in speaker counting errors** for audio longer than 2 minutes.
*   **Interview Quality:** Exceptional. It maintains consistent speaker labels over long durations and handles topic changes seamlessly.
*   **Multi-Speaker Quality:** Extremely robust in multi-speaker environments. It handles short utterances (down to 250ms) and overlapping voices much better than out-of-the-box open-source models.
*   **Speaker Confusion Rates:** Significantly lower than open-source models. AssemblyAI reports a low **speaker-count error rate of ~2.9%**. It allows developers to specify expected speaker counts (`min_speakers` / `max_speakers`), which heavily constrains the clustering algorithm and virtually eliminates "phantom" speakers and severe confusion.

## 4. Google Cloud Speech-to-Text
**Type:** Commercial Enterprise API

Google's diarization is integrated into its broader Cloud STT service, leveraging large-scale proprietary architectures (including their Chirp models).
*   **Podcast Quality:** Reliable, but can be rigid. It often requires specific parameter tuning depending on the domain (e.g., medical vs. general podcast).
*   **Interview Quality:** Good for structured, clean interviews (e.g., telephone or meeting datasets).
*   **Multi-Speaker Quality:** Handles multi-speaker environments reasonably well but independent benchmarks often place it slightly behind specialized speech APIs (like AssemblyAI) in highly dynamic, conversational settings.
*   **Speaker Confusion Rates:** Prone to speaker confusion if the audio features heavy crosstalk without multi-channel separation. It lacks some of the hyper-specific developer controls (like AssemblyAI's contextual labeling) to force correct clustering.

---

## Summary Recommendations
*   **For maximum accuracy in podcasts/interviews:** Record on **separate tracks** (multi-channel audio) to bypass AI diarization entirely.
*   **For production-ready, hassle-free scaling:** **AssemblyAI** is currently the top performer for conversational, multi-speaker audio with heavy overlap.
*   **For free, self-hosted workflows:** Use **WhisperX** (leveraging Pyannote 3.1), provided you have the GPU resources to run it and your audio isn't overly noisy.
