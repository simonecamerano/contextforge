import type { LLMProvider, CompletionOptions } from './base.js';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export class DeepSeekProvider implements LLMProvider {
  readonly name = 'deepseek';

  private readonly apiKey: string;
  private readonly defaultModel: string;

  constructor(apiKey?: string, defaultModel = 'deepseek-chat') {
    this.apiKey = apiKey ?? process.env['DEEPSEEK_API_KEY'] ?? '';
    this.defaultModel = defaultModel;
  }

  async isAvailable(): Promise<boolean> {
    return this.apiKey.length > 0;
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
    };

    if (options?.maxTokens !== undefined) body.max_tokens = options.maxTokens;
    if (options?.temperature !== undefined) body.temperature = options.temperature;

    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`DeepSeek request failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const content = data.choices?.[0]?.message?.content ?? '';

    const promptTokens = data.usage?.prompt_tokens ?? estimateTokens(prompt + (options?.systemPrompt ?? ''));
    const completionTokens = data.usage?.completion_tokens ?? estimateTokens(content);
    const totalTokens = data.usage?.total_tokens ?? promptTokens + completionTokens;

    console.log(`[DeepSeek] token usage — prompt: ${promptTokens}, completion: ${completionTokens}, total: ${totalTokens}`);

    return content;
  }
}
