import type { LLMProvider, CompletionOptions } from './base.js';

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';

  private readonly host: string;
  private readonly defaultModel: string;

  constructor(host = 'http://localhost:11434', defaultModel = 'llama3') {
    this.host = host;
    this.defaultModel = defaultModel;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.host}/api/tags`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const model = options?.model ?? this.defaultModel;
    const messages: { role: string; content: string }[] = [];

    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const body: Record<string, unknown> = {
      model,
      messages,
      stream: false,
    };

    if (options?.temperature !== undefined) body.temperature = options.temperature;
    if (options?.maxTokens !== undefined) body.num_predict = options.maxTokens;

    const res = await fetch(`${this.host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Ollama request failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { message?: { content?: string } };
    return data.message?.content ?? '';
  }
}
