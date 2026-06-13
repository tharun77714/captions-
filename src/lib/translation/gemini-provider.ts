import { TranslationProvider, TranslationSegment, TranslationOptions, TranslationResult } from './types';

export class GeminiTranslationProvider implements TranslationProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'; // Configurable default
  }

  async translate(
    segments: TranslationSegment[],
    options: TranslationOptions
  ): Promise<TranslationResult[]> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not defined.');
    }

    const prompt = `You are a professional subtitle translator.
Translate the following subtitle segments from ${options.sourceLanguage} to ${options.targetLanguage}.

Constraints:
1. Preserve the meaning, tone, and context of the conversation.
2. Adhere strictly to the line length constraints: Maximum ${options.maxCharactersPerLine} characters per line, and maximum ${options.maxLinesPerCard} lines per card.
3. Do not include any explanations, notes, or extra text. Output ONLY the JSON array matching the request format under a "translations" key.

Segments to translate:
${JSON.stringify(segments, null, 2)}`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                translations: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      id: { type: 'STRING' },
                      translatedText: { type: 'STRING' }
                    },
                    required: ['id', 'translatedText']
                  }
                }
              },
              required: ['translations']
            },
            temperature: 0.3,
          }
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API request failed: ${response.statusText}. Details: ${errText}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error('Gemini returned an empty translation response.');
      }

      const parsed = JSON.parse(content);
      if (!parsed.translations || !Array.isArray(parsed.translations)) {
        throw new Error(`Invalid JSON format returned from Gemini: ${content}`);
      }

      return parsed.translations;
    } catch (error) {
      console.error('Gemini translation failed:', error);
      throw error;
    }
  }
}
