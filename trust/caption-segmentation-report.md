# Caption Segmentation & Chunking Report

An in-depth investigation into how captions should be chunked across various video platforms, comparing length-based and meaning-based segmentation strategies.

## 1. Overview of Caption Chunking Strategies

Caption chunking (or segmentation) is the process of breaking down transcription text into smaller, readable pieces that display on-screen. The method used dictates the pacing of the video, viewer retention, and accessibility.

### 2-Word and 3-Word Chunking (The "Hormozi Style")
* **Concept:** Displaying only 1 to 3 words on screen at a time, perfectly synced with the speaker's cadence.
* **Pros:** Extremely high visual engagement. It creates a "popping" or "bouncing" effect that keeps the viewer's eyes glued to the center of the screen. Prevents viewers from scrolling away.
* **Cons:** Exhausting to read over long periods. Loses larger context if viewers have auditory processing issues or are reading without sound. 
* **Best For:** High-energy hooks, 15-60 second clips, and motivational content.

### 5-Word Chunking
* **Concept:** A rough heuristic limiting captions to 5 words per screen to prevent text walling.
* **Pros:** Strikes a middle ground between rapid-fire text and full sentences. It's usually small enough to be styled boldly without covering the speaker's face.
* **Cons:** If strictly enforced, it often breaks sentences at unnatural points (e.g., splitting an adjective from its noun). This "stuttering" effect increases cognitive load.
* **Best For:** A fallback baseline when automated phrase-based parsing isn't available.

### Phrase-Based Chunking
* **Concept:** Breaking text at natural linguistic boundaries (clauses, prepositional phrases, punctuation).
* **Pros:** Matches the natural rhythm of speech. It prevents the eyes from pausing at awkward moments, lowering cognitive fatigue. Aligns with standard accessibility guidelines (WCAG).
* **Cons:** Slower visual pacing compared to 2-word chunks, which might lack the "hyper-engaging" feel needed for extremely short content.
* **Best For:** Educational content, storytelling, and long-form video.

### Semantic-Based Chunking
* **Concept:** Grouping words by meaning and emphasis rather than strict grammar. For example, isolating a punchline or a key metric ("TEN THOUSAND DOLLARS") on its own screen for impact.
* **Pros:** Maximizes retention by visually reinforcing the most important parts of the message. Often combines phrase-based logic with strategic 1-2 word emphasis.
* **Cons:** Difficult to automate perfectly without advanced AI; often requires manual tweaking to match the exact vocal stress of the speaker.
* **Best For:** Premium edited content where visual storytelling is key.

---

## 2. Platform-Specific Best Practices

### TikTok
* **Vibe:** Bold, animated, fast-paced, expressive.
* **Ideal Strategy:** **2-3 word chunks or semantic-based.** 
* **Guidelines:** Users scroll fast, so the screen needs constant visual movement. Keep text large, center-screen (or lower-middle), and use dynamic highlighting (e.g., coloring the active word yellow or green).

### Instagram Reels
* **Vibe:** Aesthetic, clean, engaging but slightly more polished than TikTok.
* **Ideal Strategy:** **3-5 word chunks or semantic-based.**
* **Guidelines:** Reels audiences respond well to the Hormozi style, but they also tolerate slightly longer, phrase-based chunks if the content is highly aesthetic or educational. Avoid placing captions too low, as the UI overlay will obscure them.

### YouTube Shorts
* **Vibe:** Informative, straightforward, loopable.
* **Ideal Strategy:** **Phrase-based or 3-word chunks.**
* **Guidelines:** Shorts viewers often watch to learn or see a quick process. Captions should be fixed-position and highly legible. While rapid 2-word chunks work for hooks, educational Shorts benefit from phrase-based chunks so the viewer can process the information clearly.

### YouTube Long-Form
* **Vibe:** Relaxed, immersive, information-dense.
* **Ideal Strategy:** **Phrase-based (Max 2 lines, 32-42 characters per line).**
* **Guidelines:** Never use 2-3 word chunking for a 10-minute video; it will cause severe eye fatigue. Captions should stay on screen for 1.33 to 6 seconds. Break lines at natural pauses. Ideally, use Closed Captions (CC) so the user can toggle them off if desired, rather than burning them into the video center.

---

## 3. Summary Recommendations

1. **For Maximum Viral Potential (Shorts/Reels/TikTok):** Use Semantic or 2-3 Word chunking. Animate the text, use heavy sans-serif fonts (like Montserrat Black or Anton), and sync perfectly to vocal stress.
2. **For Viewer Retention & Accessibility (Long-form):** Use Phrase-based chunking. Keep it to a maximum of 2 lines (around 5-7 words total) and ensure text only breaks at natural conversational pauses.
3. **Avoid Strict Length Rules:** A strict "5-word" rule is inferior to phrase-based and semantic logic. The human brain reads by meaning, not by word count.
