import type { LLMProvider, CompletionOptions } from './base.js';

export class NullProvider implements LLMProvider {
  readonly name = 'null';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async complete(_prompt: string, _options?: CompletionOptions): Promise<string> {
    return '';
  }
}
