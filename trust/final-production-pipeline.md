# Vidyut Production Architecture & Final Decision

Based on the independent investigations of 8 specialized subagents across ASR, Alignment, Diarization, Segmentation, Translation, Scaling, and Language Routing, the following is the definitive blueprint for the Vidyut ASR System.

## Mandatory Questions Answered

**Q1. What is the single most accurate ASR stack for Telugu + English creators?**
Custom LID Router → Deepgram Nova 3 (for English-heavy segments) + Fine-tuned IndicWhisper Large V3 (for Telugu-heavy segments). Off-the-shelf, Deepgram Nova 3 currently leads commercial APIs, but a fine-tuned Whisper V3 excels in capturing deep dialect nuances.

**Q2. What is the single most accurate ASR stack for Tamil + English creators?**
Custom LID Router → NLLB + IndicConformer / Deepgram Nova 3. Tamil's highly agglutinative nature requires specialized tokenization that general LLMs often fail at.

**Q3. What is the single most accurate ASR stack for Kannada + English creators?**
Whisper Large V3. Kannada requires heavy acoustic context, which Whisper's transformer architecture handles exceptionally well compared to pure CTC models.

**Q4. What is the single most accurate ASR stack for Malayalam + English creators?**
AssemblyAI Universal-3 / Whisper Large V3. Malayalam is morphologically complex and lower-resource; these two models have demonstrated the most robust cross-lingual transfer learning for it.

**Q5. What timestamp accuracy is realistically achievable?**
~50-100ms error margins. This is achievable exclusively through post-hoc forced alignment (e.g., Wav2Vec2 via WhisperX), as native Whisper operates on 2-second windows and segment-level timestamps.

**Q6. What pipeline provides the best subtitle quality?**
Whisper Large V3 → WhisperX Alignment → **Semantic-based Segmentation**. Breaking text by semantic meaning rather than hard word-counts prevents awkward mid-sentence breaks and maximizes viewer retention.

**Q7. What pipeline provides the best creator experience?**
A hybrid streaming-to-batch pipeline. Deepgram Nova 3 for real-time streaming transcription (sub-300ms latency) to show instant progress during upload, followed by a background WhisperX batch job to refine timestamps and fix code-switched hallucinations.

**Q8. What pipeline provides the best scalability?**
- **<1,000 users/day:** Serverless GPU (Modal). Scales to zero, keeps costs under ~$180/mo.
- **>10,000 users/day:** Dedicated RunPod instances ($850/mo) with autoscaling queues (Celery/SQS), as serverless becomes cost-prohibitive under steady-state high concurrency.

**Q9. What pipeline would Kalakaar most likely use?**
Confidence is high (85-95%) that Kalakaar utilizes: Whisper Large-v3 (via faster-whisper) → WhisperX (Wav2Vec2 alignment) → Custom heuristic sliding-window segmentation → IndicTrans2 or GPT-4o-mini for translation → Remotion or Nexrender for cloud rendering.

**Q10. What pipeline should Vidyut use?**
Vidyut must own its stack to maintain extreme parity and control costs. Therefore: **Modal (Serverless scaling) + faster-whisper (Large V3) + WhisperX (Alignment/Diarization) + Semantic Chunking + FFmpeg/libass (Export Engine).**

---

## Final Recommended Production Architecture

```text
Video Upload (Cloudflare R2 / AWS S3)
  ↓
Audio Extraction (FFmpeg within Modal container)
  ↓
Language Detection (Custom Word-level LID via mBERT / FastText)
  ↓
ASR Transcription (faster-whisper Large V3 on Modal T4/A10G)
  ↓
Timestamp Alignment (WhisperX forced alignment via Wav2Vec2)
  ↓
Speaker Diarization (Pyannote v3.1 integrated into WhisperX)
  ↓
Post Processing (Punctuation and capitalization restoration via Gemini/GPT-4o-mini)
  ↓
Subtitle Segmentation (Semantic chunking / 2-3 word Sliding Window for Shorts)
  ↓
Translation (Gemini for Telugu/Hindi; NLLB for complex Dravidian structure)
  ↓
Subtitle Engine (Vidyut React Editor UI with Web Font measurement)
  ↓
Export Engine (Modal FFmpeg + libass with matched Google Fonts)
```

### Expected Production Metrics

* **Expected WER:** ~8-15% (Highly dependent on code-switching density and background noise).
* **Expected timestamp accuracy:** ~50-100ms (Sufficient for precise karaoke highlighting).
* **Expected latency:** ~15-30 seconds of processing time per minute of audio.
* **Expected cost per hour of video:** ~$0.10 - $0.20 (Using Modal compute on T4 GPUs).

### Risks & Mitigations
* **Risk:** Extreme code-switching (e.g., Tenglish written in Roman script) causes model hallucinations.
  * **Mitigation:** Implement a custom entropy-based LID router to switch models dynamically.
* **Risk:** High GPU cold start times on serverless infrastructure.
  * **Mitigation:** Implement warm-pool instances during peak creator hours or use a fallback API.

### Alternatives Rejected
* **Commercial APIs (AssemblyAI/Deepgram):** Rejected for primary ASR. While highly accurate, they abstract away alignment logic, making it impossible to guarantee 100% accurate per-word timestamps needed for Vidyut's karaoke features, while also introducing recurring vendor lock-in costs.
* **Native Whisper:** Rejected. Timestamps are notoriously unreliable and prone to drifting, rendering per-word highlighting useless.
* **MFA (Montreal Forced Aligner):** Rejected. While considered the gold standard for accuracy, it is too slow for real-time creator workflows.
