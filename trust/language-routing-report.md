# Language Detection & Routing for Code-Switched South Indian Languages

This report evaluates strategies for detecting and routing code-switched queries—specifically mixtures of English with Telugu, Tamil, Kannada, and Malayalam. These mixed dialects (often referred to as Tenglish, Tanglish, Kanglish, and Manglish) present unique challenges for traditional language identification (LID) systems because they feature frequent intra-sentential switching (mid-sentence language changes) and heavily rely on Latin-script transliteration.

---

## 1. Comparison of Language Detection Methods

### A. Whisper Detection (OpenAI)
**Context:** Speech-to-Text / Audio input.
*   **How it Works:** Whisper uses a specialized token in its decoder to predict the probability of the language being spoken in the first 30 seconds of audio.
*   **Pros:** Highly robust for monolingual speech; handles a vast array of global languages natively.
*   **Cons:** **Single-Language Bias.** Whisper does not have a native "code-switching" mode. When a user speaks a mix of Tamil and English, Whisper typically locks onto the dominant language and attempts to transcribe *everything* in that language. This causes hallucinations, phonetic transliterations into the wrong script (e.g., writing English words in Devanagari/Tamil script), and high Word Error Rates (WER).
*   **Verdict:** Out-of-the-box Whisper is insufficient for dense code-switching without heavy prompt engineering or using parameter-efficient fine-tuning (LoRA) specifically on mixed-audio datasets.

### B. FastText (Meta)
**Context:** Text classification (often `lid.176.bin` or `lid.323`).
*   **How it Works:** Uses sub-word character n-grams to classify the language of a given text segment.
*   **Pros:** Blazing fast, lightweight, and can output the top *k* probabilities (e.g., returning both `en` and `te` scores). Sub-word n-grams are generally good at capturing Dravidian morphology.
*   **Cons:** Designed for **sentence-level**, not word-level, detection. When fed a Kanglish sentence, it will simply output a blended probability rather than identifying *where* the language switched. Furthermore, the pre-trained models struggle heavily with Romanized Indic languages, as they expect native scripts.
*   **Verdict:** Poor for granular routing unless custom-trained as a sequence labeler (token-by-token classification) on transliterated code-mixed datasets.

### C. Google Detection (CLD3 / Cloud Translation API)
**Context:** General text identification.
*   **How it Works:** CLD3 is a lightweight neural network for text language identification. Google Cloud API offers more robust backend detection.
*   **Pros:** High accuracy for monolingual blocks of text. API supports mixed language detection at a block level.
*   **Cons:** Fails at **intra-sentential code-switching**. Like FastText, CLD3 biases heavily toward the dominant language character set. If a user writes "Enna problem aachu with the database?", CLD3 will likely tag it as English due to the Latin characters and English nouns, missing the Tamil grammar. 
*   **Verdict:** Not recommended for conversational, Romanized code-switched social media text or chat interfaces.

### D. Custom Routing (LLM / Sequence Labeling)
**Context:** Advanced text and intent routing.
*   **How it Works:** Employs a multi-stage architecture. A fast, word-level LID model (like a fine-tuned mBERT or XLM-RoBERTa) tags every token. A "Router" calculates the mixing entropy and directs the query to the appropriate "Expert" model.
*   **Pros:** Specifically handles mid-sentence switching, captures Romanized transliteration, and prevents the "hallucination" seen in monolithic models.
*   **Cons:** Higher latency and infrastructure complexity (requires running an intent router and maintaining multiple expert models).
*   **Verdict:** **The optimal choice** for production-grade applications dealing with South Indian code-mixing. 

---

## 2. Investigation: South Indian Language Pairs

Dravidian languages combined with English form highly agglutinative and morphologically rich code-mixed variants.

### Telugu + English (Tenglish)
*   **Characteristics:** Frequent attachment of Telugu suffixes to English nouns/verbs (e.g., "Deploy *chesava*?", "Server *down aindi*").
*   **Challenge:** Standard models often misclassify Romanized Telugu as Indonesian or Tagalog. 
*   **Routing Needs:** Requires a tokenizer highly optimized for Telugu morphological boundaries to separate the English root from the Telugu suffix.

### Tamil + English (Tanglish)
*   **Characteristics:** High prevalence in tech and social media. Often involves deep structural mixing (e.g., "Code *run aagudha* illaya nu check *pannu*").
*   **Challenge:** Tamil has vastly different phonetics and grammar structures compared to English. Monolingual LLMs often fail to maintain the Subject-Object-Verb (SOV) structure when generating Tanglish.
*   **Routing Needs:** A fine-tuned Tanglish expert model is crucial. The router must detect the high entropy and avoid sending Tanglish queries to a standard English LLM.

### Kannada + English (Kanglish)
*   **Characteristics:** Very common in Bangalore tech circles (e.g., "Meeting *ideya*?", "System *restart maadi*"). 
*   **Challenge:** Kanglish datasets are relatively lower-resource compared to Tanglish. Detection models often confuse Romanized Kannada with Telugu due to shared vocabulary and phonetic similarities.
*   **Routing Needs:** Sequence labelers need specific Kannada-English datasets (like those from FIRE shared tasks) to accurately map the token boundaries.

### Malayalam + English (Manglish)
*   **Characteristics:** Unique phonetic combinations and heavy suffixing (e.g., "File *save cheytho*?").
*   **Challenge:** Malayalam script and its Romanized equivalent possess long string lengths for words due to agglutination. FastText n-grams often fail here because the character sequences don't match typical English or standard Malayalam text.
*   **Routing Needs:** Word-level LID models (like fine-tuned XLM-R) are absolutely necessary here to identify the linguistic boundaries before routing.

---

## 3. Recommended Architecture: Custom LLM Routing Pipeline

To effectively handle these four language pairs, a **Custom Router Architecture** is recommended:

1.  **Input Layer (Word-Level LID):** 
    *   Deploy a lightweight Sequence Labeler (e.g., fine-tuned `mBERT` on DravidianCodeMix datasets). 
    *   This model tags every token as `[EN]`, `[TE]`, `[TA]`, `[KN]`, or `[ML]`.
2.  **Entropy Router:**
    *   The router evaluates the tags. 
    *   If the text is >90% English -> Route to **Monolingual English Expert** (e.g., standard GPT-4o / Claude 3.5).
    *   If the text is >90% Native -> Route to **Monolingual Native Expert** (e.g., IndicLLM / AI4Bharat models).
    *   If there is a mix -> Route to the **Code-Switching Expert** (a custom fine-tuned model or an LLM prompted specifically with few-shot examples for that exact language pair).
3.  **Code-Switched Generation:** 
    *   Ensure the Code-Switching Expert generates responses that align with the user's mixing ratio. If the user asks in Tanglish, the model should ideally reply in Tanglish or clean English based on product requirements, but *never* hallucinate a mix of native scripts.

### Summary
Off-the-shelf tools (Whisper, FastText, Google CLD3) are built for monolithic language paradigms and fail at the token-level granularity required for Tenglish, Tanglish, Kanglish, and Manglish. A Custom Routing system utilizing word-level Language Identification (LID) and Mixture of Experts (MoE) routing is the only reliable way to handle intra-sentential South Indian code-switching in production.
