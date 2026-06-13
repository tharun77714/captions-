import { TranslationProvider, TranslationSegment, TranslationOptions, TranslationResult } from './types';

export class GPTTranslationProvider implements TranslationProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.OPENAI_MODEL || 'gpt-4o'; // Default fallback, configurable via env
  }

  async translate(
    segments: TranslationSegment[],
    options: TranslationOptions
  ): Promise<TranslationResult[]> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not defined.');
    }

    const prompt = `You are a professional subtitle translator.
Translate the following subtitle segments from ${options.sourceLanguage} to ${options.targetLanguage}.

Constraints:
1. Preserve the meaning, tone, and context of the conversation.
2. Adhere strictly to the line length constraints: Maximum ${options.maxCharactersPerLine} characters per line, and maximum ${options.maxLinesPerCard} lines per card.
3. Do not include any explanations, notes, or extra text. Output ONLY the JSON array matching the request format.

Segments to translate:
${JSON.stringify(segments, null, 2)}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a translator that strictly outputs valid JSON matching the requested structure.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API request failed: ${response.statusText}. Details: ${errText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI returned an empty translation response.');
      }

      // The model might return wrapper object like { "translations": [...] } or direct array inside a key
      const parsed = JSON.parse(content);
      const result: TranslationResult[] = parsed.translations || parsed.results || parsed.segments || (Array.isArray(parsed) ? parsed : Object.values(parsed)[0]);

      if (!Array.isArray(result)) {
        throw new Error(`Invalid JSON format returned from GPT: ${content}`);
      }

      return result;
    } catch (error) {
      console.error('GPT translation failed:', error);
      throw error;
    }
  }
}
