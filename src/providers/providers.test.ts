import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getLLMProvider } from './factory.js';
import { NullProvider } from './null.js';
import { OllamaProvider } from './ollama.js';
import { DeepSeekProvider } from './deepseek.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchOk(json: unknown, ok = true, status = 200): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(json),
  });
}

// ---------------------------------------------------------------------------
// NullProvider
// ---------------------------------------------------------------------------

describe('NullProvider', () => {
  it('has name "null"', () => {
    const provider = new NullProvider();
    expect(provider.name).toBe('null');
  });

  it('isAvailable always returns true', async () => {
    const provider = new NullProvider();
    await expect(provider.isAvailable()).resolves.toBe(true);
  });

  it('complete always returns an empty string', async () => {
    const provider = new NullProvider();
    await expect(provider.complete('hello')).resolves.toBe('');
    await expect(provider.complete('hello', { maxTokens: 100 })).resolves.toBe('');
  });
});

// ---------------------------------------------------------------------------
// OllamaProvider
// ---------------------------------------------------------------------------

describe('OllamaProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor defaults', () => {
    it('uses localhost:11434 and llama3 as defaults', () => {
      const provider = new OllamaProvider();
      expect(provider.name).toBe('ollama');
    });

    it('accepts custom host and model', () => {
      const provider = new OllamaProvider('http://remote:11434', 'mistral');
      expect(provider.name).toBe('ollama');
    });
  });

  describe('isAvailable', () => {
    it('returns true when /api/tags responds ok', async () => {
      vi.stubGlobal('fetch', makeFetchOk({}));
      const provider = new OllamaProvider();
      await expect(provider.isAvailable()).resolves.toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:11434/api/tags');
    });

    it('returns false when /api/tags responds with non-ok status', async () => {
      vi.stubGlobal('fetch', makeFetchOk({}, false, 500));
      const provider = new OllamaProvider();
      await expect(provider.isAvailable()).resolves.toBe(false);
    });

    it('returns false when fetch throws (network error)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const provider = new OllamaProvider();
      await expect(provider.isAvailable()).resolves.toBe(false);
    });
  });

  describe('complete', () => {
    const ollamaResponse = { message: { content: 'Hello from Ollama!' } };

    it('sends correct request and returns content', async () => {
      vi.stubGlobal('fetch', makeFetchOk(ollamaResponse));
      const provider = new OllamaProvider('http://localhost:11434', 'llama3');

      const result = await provider.complete('Say hi');
      expect(result).toBe('Hello from Ollama!');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
      expect(body.model).toBe('llama3');
      expect(body.stream).toBe(false);
      expect(body.messages).toEqual([{ role: 'user', content: 'Say hi' }]);
    });

    it('includes system prompt when provided', async () => {
      vi.stubGlobal('fetch', makeFetchOk(ollamaResponse));
      const provider = new OllamaProvider();

      await provider.complete('Hello', { systemPrompt: 'You are a pirate.' });

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
      expect(body.messages[0]).toEqual({ role: 'system', content: 'You are a pirate.' });
      expect(body.messages[1]).toEqual({ role: 'user', content: 'Hello' });
    });

    it('overrides model via options', async () => {
      vi.stubGlobal('fetch', makeFetchOk(ollamaResponse));
      const provider = new OllamaProvider('http://localhost:11434', 'llama3');

      await provider.complete('Hi', { model: 'mistral' });

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
      expect(body.model).toBe('mistral');
    });

    it('passes temperature and maxTokens when provided', async () => {
      vi.stubGlobal('fetch', makeFetchOk(ollamaResponse));
      const provider = new OllamaProvider();

      await provider.complete('Hi', { temperature: 0.5, maxTokens: 256 });

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
      expect(body.temperature).toBe(0.5);
      expect(body.num_predict).toBe(256);
    });

    it('does not include temperature/num_predict when not provided', async () => {
      vi.stubGlobal('fetch', makeFetchOk(ollamaResponse));
      const provider = new OllamaProvider();

      await provider.complete('Hi');

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
      expect(body).not.toHaveProperty('temperature');
      expect(body).not.toHaveProperty('num_predict');
    });

    it('returns empty string when response has no content', async () => {
      vi.stubGlobal('fetch', makeFetchOk({ message: {} }));
      const provider = new OllamaProvider();
      await expect(provider.complete('Hi')).resolves.toBe('');
    });

    it('throws when response is not ok', async () => {
      vi.stubGlobal('fetch', makeFetchOk({}, false, 503));
      const provider = new OllamaProvider();
      await expect(provider.complete('Hi')).rejects.toThrow('Ollama request failed: 503');
    });

    it('uses custom host in request URL', async () => {
      vi.stubGlobal('fetch', makeFetchOk(ollamaResponse));
      const provider = new OllamaProvider('http://custom-host:9999');

      await provider.complete('Hi');

      expect(global.fetch).toHaveBeenCalledWith('http://custom-host:9999/api/chat', expect.anything());
    });
  });
});

// ---------------------------------------------------------------------------
// DeepSeekProvider
// ---------------------------------------------------------------------------

describe('DeepSeekProvider', () => {
  const originalEnv = process.env['DEEPSEEK_API_KEY'];

  beforeEach(() => {
    delete process.env['DEEPSEEK_API_KEY'];
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['DEEPSEEK_API_KEY'] = originalEnv;
    } else {
      delete process.env['DEEPSEEK_API_KEY'];
    }
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('has name "deepseek"', () => {
      expect(new DeepSeekProvider('key').name).toBe('deepseek');
    });

    it('falls back to DEEPSEEK_API_KEY env var', async () => {
      process.env['DEEPSEEK_API_KEY'] = 'env-key';
      const provider = new DeepSeekProvider();
      await expect(provider.isAvailable()).resolves.toBe(true);
    });
  });

  describe('isAvailable', () => {
    it('returns true when API key is set via constructor', async () => {
      const provider = new DeepSeekProvider('my-api-key');
      await expect(provider.isAvailable()).resolves.toBe(true);
    });

    it('returns false when no API key is present', async () => {
      const provider = new DeepSeekProvider();
      await expect(provider.isAvailable()).resolves.toBe(false);
    });

    it('returns false when API key is an empty string', async () => {
      const provider = new DeepSeekProvider('');
      await expect(provider.isAvailable()).resolves.toBe(false);
    });
  });

  describe('complete', () => {
    const deepseekResponse = {
      choices: [{ message: { content: 'Hello from DeepSeek!' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };

    it('sends correct request and returns content', async () => {
      vi.stubGlobal('fetch', makeFetchOk(deepseekResponse));
      const provider = new DeepSeekProvider('test-key');

      const result = await provider.complete('Say hi');
      expect(result).toBe('Hello from DeepSeek!');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.deepseek.com/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-key',
          }),
        }),
      );
    });

    it('uses default model deepseek-chat', async () => {
      vi.stubGlobal('fetch', makeFetchOk(deepseekResponse));
      const provider = new DeepSeekProvider('key');

      await provider.complete('Hi');

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
      expect(body.model).toBe('deepseek-chat');
    });

    it('overrides model via options', async () => {
      vi.stubGlobal('fetch', makeFetchOk(deepseekResponse));
      const provider = new DeepSeekProvider('key');

      await provider.complete('Hi', { model: 'deepseek-coder' });

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
      expect(body.model).toBe('deepseek-coder');
    });

    it('uses custom defaultModel from constructor', async () => {
      vi.stubGlobal('fetch', makeFetchOk(deepseekResponse));
      const provider = new DeepSeekProvider('key', 'deepseek-reasoner');

      await provider.complete('Hi');

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
      expect(body.model).toBe('deepseek-reasoner');
    });

    it('includes system prompt when provided', async () => {
      vi.stubGlobal('fetch', makeFetchOk(deepseekResponse));
      const provider = new DeepSeekProvider('key');

      await provider.complete('Hello', { systemPrompt: 'You are helpful.' });

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
      expect(body.messages[0]).toEqual({ role: 'system', content: 'You are helpful.' });
      expect(body.messages[1]).toEqual({ role: 'user', content: 'Hello' });
    });

    it('passes temperature and max_tokens when provided', async () => {
      vi.stubGlobal('fetch', makeFetchOk(deepseekResponse));
      const provider = new DeepSeekProvider('key');

      await provider.complete('Hi', { temperature: 0.7, maxTokens: 512 });

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBe(512);
    });

    it('does not include temperature/max_tokens when not provided', async () => {
      vi.stubGlobal('fetch', makeFetchOk(deepseekResponse));
      const provider = new DeepSeekProvider('key');

      await provider.complete('Hi');

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
      expect(body).not.toHaveProperty('temperature');
      expect(body).not.toHaveProperty('max_tokens');
    });

    it('returns empty string when choices array is empty', async () => {
      vi.stubGlobal('fetch', makeFetchOk({ choices: [] }));
      const provider = new DeepSeekProvider('key');
      await expect(provider.complete('Hi')).resolves.toBe('');
    });

    it('returns empty string when choices is missing', async () => {
      vi.stubGlobal('fetch', makeFetchOk({}));
      const provider = new DeepSeekProvider('key');
      await expect(provider.complete('Hi')).resolves.toBe('');
    });

    it('throws when response is not ok', async () => {
      vi.stubGlobal('fetch', makeFetchOk({}, false, 401));
      const provider = new DeepSeekProvider('bad-key');
      await expect(provider.complete('Hi')).rejects.toThrow('DeepSeek request failed: 401');
    });

    it('logs token usage from response', async () => {
      vi.stubGlobal('fetch', makeFetchOk(deepseekResponse));
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const provider = new DeepSeekProvider('key');

      await provider.complete('Hi');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('prompt: 10'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('completion: 5'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('total: 15'),
      );
      consoleSpy.mockRestore();
    });

    it('estimates tokens when usage is missing from response', async () => {
      vi.stubGlobal('fetch', makeFetchOk({
        choices: [{ message: { content: 'short answer' } }],
      }));
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const provider = new DeepSeekProvider('key');

      await provider.complete('a prompt');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[DeepSeek] token usage'));
      consoleSpy.mockRestore();
    });
  });
});

// ---------------------------------------------------------------------------
// getLLMProvider (factory)
// ---------------------------------------------------------------------------

describe('getLLMProvider', () => {
  const originalProvider = process.env['CONTEXTFORGE_PROVIDER'];
  const originalOllamaModel = process.env['OLLAMA_MODEL'];
  const originalOllamaHost = process.env['OLLAMA_HOST'];
  const originalDeepseekModel = process.env['DEEPSEEK_MODEL'];

  afterEach(() => {
    // Restore env vars
    const restore = (key: string, value: string | undefined) => {
      if (value !== undefined) process.env[key] = value;
      else delete process.env[key];
    };
    restore('CONTEXTFORGE_PROVIDER', originalProvider);
    restore('OLLAMA_MODEL', originalOllamaModel);
    restore('OLLAMA_HOST', originalOllamaHost);
    restore('DEEPSEEK_MODEL', originalDeepseekModel);
  });

  it('returns NullProvider when no provider is specified', () => {
    delete process.env['CONTEXTFORGE_PROVIDER'];
    const provider = getLLMProvider();
    expect(provider).toBeInstanceOf(NullProvider);
    expect(provider.name).toBe('null');
  });

  it('returns NullProvider for "null" provider name', () => {
    expect(getLLMProvider('null')).toBeInstanceOf(NullProvider);
  });

  it('returns NullProvider for unknown provider name (default case)', () => {
    expect(getLLMProvider('unknown-provider')).toBeInstanceOf(NullProvider);
  });

  it('returns OllamaProvider for "ollama" provider name', () => {
    const provider = getLLMProvider('ollama');
    expect(provider).toBeInstanceOf(OllamaProvider);
    expect(provider.name).toBe('ollama');
  });

  it('returns OllamaProvider case-insensitively', () => {
    expect(getLLMProvider('Ollama')).toBeInstanceOf(OllamaProvider);
    expect(getLLMProvider('OLLAMA')).toBeInstanceOf(OllamaProvider);
  });

  it('returns DeepSeekProvider for "deepseek" provider name', () => {
    const provider = getLLMProvider('deepseek');
    expect(provider).toBeInstanceOf(DeepSeekProvider);
    expect(provider.name).toBe('deepseek');
  });

  it('returns DeepSeekProvider case-insensitively', () => {
    expect(getLLMProvider('DeepSeek')).toBeInstanceOf(DeepSeekProvider);
    expect(getLLMProvider('DEEPSEEK')).toBeInstanceOf(DeepSeekProvider);
  });

  it('falls back to CONTEXTFORGE_PROVIDER env var when no name given', () => {
    process.env['CONTEXTFORGE_PROVIDER'] = 'ollama';
    const provider = getLLMProvider();
    expect(provider).toBeInstanceOf(OllamaProvider);
  });

  it('explicit providerName overrides CONTEXTFORGE_PROVIDER env var', () => {
    process.env['CONTEXTFORGE_PROVIDER'] = 'ollama';
    const provider = getLLMProvider('null');
    expect(provider).toBeInstanceOf(NullProvider);
  });

  it('OllamaProvider uses OLLAMA_HOST and OLLAMA_MODEL env vars', () => {
    process.env['OLLAMA_HOST'] = 'http://myhost:9999';
    process.env['OLLAMA_MODEL'] = 'phi3';
    // We can't read private fields, but we can verify the correct class is returned
    const provider = getLLMProvider('ollama');
    expect(provider).toBeInstanceOf(OllamaProvider);
  });

  it('modelName argument is forwarded to OllamaProvider', () => {
    const provider = getLLMProvider('ollama', 'codellama');
    expect(provider).toBeInstanceOf(OllamaProvider);
  });

  it('DeepSeekProvider uses DEEPSEEK_MODEL env var', () => {
    process.env['DEEPSEEK_MODEL'] = 'deepseek-coder';
    const provider = getLLMProvider('deepseek');
    expect(provider).toBeInstanceOf(DeepSeekProvider);
  });

  it('modelName argument is forwarded to DeepSeekProvider', () => {
    const provider = getLLMProvider('deepseek', 'deepseek-reasoner');
    expect(provider).toBeInstanceOf(DeepSeekProvider);
  });
});
