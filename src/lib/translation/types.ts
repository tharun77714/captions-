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
