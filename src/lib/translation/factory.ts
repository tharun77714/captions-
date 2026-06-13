import { TranslationProvider } from './types';
import { GPTTranslationProvider } from './gpt-provider';
import { GeminiTranslationProvider } from './gemini-provider';
import { ClaudeTranslationProvider } from './claude-provider';

export function getTranslationProvider(providerName: string): TranslationProvider {
  switch (providerName.toLowerCase()) {
    case 'gpt':
    case 'openai':
      return new GPTTranslationProvider();
    case 'gemini':
    case 'google':
      return new GeminiTranslationProvider();
    case 'claude':
    case 'anthropic':
      return new ClaudeTranslationProvider();
    default:
      throw new Error(`Unsupported translation provider: ${providerName}`);
  }
}
