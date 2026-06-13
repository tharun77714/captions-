import { TranslationProvider, TranslationSegment, TranslationOptions, TranslationResult } from './types';

export class ClaudeTranslationProvider implements TranslationProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest'; // Configurable default
  }

  async translate(
    segments: TranslationSegment[],
    options: TranslationOptions
  ): Promise<TranslationResult[]> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not defined.');
    }

    const prompt = `You are a professional subtitle translator.
Translate the following subtitle segments from ${options.sourceLanguage} to ${options.targetLanguage}.

Constraints:
1. Preserve the meaning, tone, and context of the conversation.
2. Adhere strictly to the line length constraints: Maximum ${options.maxCharactersPerLine} characters per line, and maximum ${options.maxLinesPerCard} lines per card.
3. Do not include any explanations, notes, or extra text. Output ONLY the raw JSON array containing translation objects with "id" and "translatedText" keys.

Segments to translate:
${JSON.stringify(segments, null, 2)}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'Anthropic-Version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4000,
          system: 'You are a precise subtitle translator. You only output valid JSON arrays containing the translated segments, without markdown code fences or conversational text.',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Claude API request failed: ${response.statusText}. Details: ${errText}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;
      if (!content) {
        throw new Error('Claude returned an empty translation response.');
      }

      // Cleanup codeblock wraps if the model hallucinated markdown formatting
      let cleaned = content.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
      cleaned = cleaned.trim();

      const parsed = JSON.parse(cleaned);
      const result: TranslationResult[] = Array.isArray(parsed) ? parsed : (parsed.translations || parsed.results || Object.values(parsed)[0]);

      if (!Array.isArray(result)) {
        throw new Error(`Invalid JSON format returned from Claude: ${content}`);
      }

      return result;
    } catch (error) {
      console.error('Claude translation failed:', error);
      throw error;
    }
  }
}
