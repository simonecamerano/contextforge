import type { LLMProvider } from './base.js';
import { NullProvider } from './null.js';
import { OllamaProvider } from './ollama.js';
import { DeepSeekProvider } from './deepseek.js';

export function getLLMProvider(providerName?: string, modelName?: string): LLMProvider {
  const name = providerName ?? process.env['CONTEXTFORGE_PROVIDER'] ?? 'null';

  switch (name.toLowerCase()) {
    case 'ollama': {
      const host = process.env['OLLAMA_HOST'] ?? 'http://localhost:11434';
      const model = modelName ?? process.env['OLLAMA_MODEL'] ?? 'llama3';
      return new OllamaProvider(host, model);
    }
    case 'deepseek': {
      const model = modelName ?? process.env['DEEPSEEK_MODEL'] ?? 'deepseek-chat';
      return new DeepSeekProvider(undefined, model);
    }
    case 'null':
    default:
      return new NullProvider();
  }
}
