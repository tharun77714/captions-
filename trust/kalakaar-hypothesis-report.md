# Kalakaar App Tech Stack Hypothesis: Reverse Engineering Report

**Date:** June 13, 2026
**Target:** Kalakaar.io (AI-powered audio enhancement and trendy captions for South Asian creators)

Based on an analysis of current state-of-the-art (SOTA) AI video editing paradigms, specifically tailored for South Asian languages (code-switching, Hindi, Tamil, Telugu, etc.), the following is a highly probable architectural breakdown of the Kalakaar app's core processing stacks. 

---

## 1. ASR (Automatic Speech Recognition) Stack
**Hypothesis:** `faster-whisper` (Whisper Large-v3) or `AI4Bharat IndicConformer`
**Confidence Score:** **85%**

* **Reasoning:** For "studio-grade" accuracy across South Asian languages, OpenAI's Whisper (Large-v3) is the industry standard due to its exceptional handling of code-mixing (e.g., Hinglish) and varied accents. However, to run this cost-effectively and at low latency, it is almost certainly deployed using `faster-whisper` (based on CTranslate2) or vLLM rather than the raw HuggingFace transformers library.
* **Alternative:** Given the niche focus on South Asia, they might also utilize models from Bhashini / AI4Bharat (like IndicWav2Vec or IndicConformer) for specific regional languages where Whisper underperforms, though Whisper is vastly easier to maintain as a unified pipeline.

## 2. Alignment Stack
**Hypothesis:** `WhisperX` (Wav2Vec2 Forced Alignment)
**Confidence Score:** **95%**

* **Reasoning:** Standard ASR models chunk text in multi-second segments. To achieve the "trendy," single-word highlight styling (popularized by Alex Hormozi), precise word-level millisecond timestamps are required. `WhisperX` is the undisputed leader here. It takes the Whisper transcript and aligns it using a phoneme-based `Wav2Vec2` model. For Indic languages, they likely swap the default English alignment model with a multilingual one like Meta's `mms-align` to ensure accurate word boundaries in Hindi/Telugu/etc.

## 3. Subtitle Segmentation Stack
**Hypothesis:** Custom Heuristics + `Silero VAD` + NLP Boundary Detection (Spacy)
**Confidence Score:** **90%**

* **Reasoning:** Once word-level timestamps are extracted, grouping them into visually appealing subtitles (e.g., 2-4 words per line) requires custom logic. There is no standard "Hormozi-style" segmentation library. The stack likely relies on:
  1. **Silero VAD (Voice Activity Detection):** To ensure subtitles split naturally during speaker pauses.
  2. **Linguistic chunking:** Splitting by punctuation (commas, periods) using basic NLP (`spacy` or regex).
  3. **Visual chunking:** A sliding-window algorithm checking Maximum Characters Per Line (CPL) and Characters Per Second (CPS) to ensure text fits the screen and reads naturally.

## 4. Translation Stack
**Hypothesis:** `AI4Bharat IndicTrans2` or `LLM API (GPT-4o-mini / Claude 3 Haiku)`
**Confidence Score:** **75%**

* **Reasoning:** If the app offers high-fidelity translation between Indic languages and English, `IndicTrans2` is the open-source SOTA for South Asian languages. However, many modern AI wrappers utilize fast, low-cost LLMs like `GPT-4o-mini` to translate subtitle JSONs while preserving context, slang, and formatting, which traditional translation APIs (like Google Cloud Translate) often strip out.

## 5. Rendering Stack
**Hypothesis:** `Remotion` (React-based Video Rendering) or `Nexrender` (Adobe After Effects Automation)
**Confidence Score:** **80%**

* **Reasoning:** To achieve bouncy animations, glowing text, word-by-word color reveals, and emoji integrations, traditional hardcoding via `FFmpeg` (using `.ass` subtitle files) is too rigid and complex. 
  * **Remotion** is the most popular stack for this in the current SaaS ecosystem. It allows developers to build complex, animated video templates using React and Framer Motion, and render them on AWS Lambda.
  * **Alternative:** If the templates look *exactly* like Adobe After Effects plugins, they are likely using `Nexrender`, which runs headless After Effects instances on cloud GPUs to inject the subtitle JSON into a pre-made AE template.

---
### Summary of Likely Architecture
1. **Upload:** Audio extracted via FFmpeg.
2. **ASR & Align:** Pushed to GPU worker running Faster-Whisper -> WhisperX (mms-align).
3. **Segmentation:** Python script processes the WhisperX JSON into short, punchy 3-word chunks.
4. **Translation:** Sent via API to LLM or IndicTrans2 to map translated chunks to original timestamps.
5. **Render:** JSON sent to a Remotion Lambda function, which returns the final `.mp4` with React-rendered animations burned in.
