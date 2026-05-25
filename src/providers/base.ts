export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  model?: string;
}

export interface LLMProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
}
