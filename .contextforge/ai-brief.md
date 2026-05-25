# AI Brief

Questo documento contiene una sintesi ottimizzata del contesto di progetto per gli LLM.

## Project Overview
- **Progetto:** contextforge
- **Linguaggi:** JavaScript, JSON, TypeScript, Text
- **Branch:** main

### Dipendenze Principali
- `commander`: `^12.1.0`
- `cosmiconfig`: `^9.0.0`
- `eta`: `^3.4.0`
- `ignore`: `^5.3.1`
- `zod`: `^3.23.8`

### Struttura dei Moduli
#### Moduli TypeScript/JavaScript
- `eslint.config.js`:
- `src/cli/commands/brief.ts`:
  - **Exports:** `registerBriefCommand`
- `src/cli/commands/decisions.ts`:
  - **Exports:** `registerDecisionsCommand`
- `src/cli/commands/init.ts`:
  - **Exports:** `registerInitCommand`
- `src/cli/commands/scan.ts`:
  - **Exports:** `registerScanCommand`
- `src/cli/commands/update.ts`:
  - **Exports:** `registerUpdateCommand`
- `src/cli/index.ts`:
- `src/core/generators/active-context.ts`:
  - **Exports:** `generateActiveContext`
- `src/core/generators/ai-brief.ts`:
  - **Exports:** `generateAIBrief`
- `src/core/generators/architecture.ts`:
  - **Exports:** `generateArchitecture`
- `src/core/generators/project-overview.ts`:
  - **Exports:** `generateProjectOverview`
- `src/core/scanner/file-walker.ts`:
  - **Exports:** `walkDirectory`
- `src/core/scanner/ignore-engine.ts`:
  - **Exports:** `IgnoreEngine`
  - **Classi:** `IgnoreEngine`
- `src/core/scanner/parsers/manifest.ts`:
  - **Exports:** `parseManifest`
- `src/core/scanner/parsers/python.ts`:
  - **Exports:** `parsePython`
- `src/core/scanner/parsers/typescript.ts`:
  - **Exports:** `parseTypeScript`
- `src/core/scanner/summarizer.ts`:
  - **Exports:** `summarizeProject`
- `src/core/updater/change-detector.ts`:
  - **Exports:** `detectChanges`
- `src/core/updater/selective-update.ts`:
  - **Exports:** `selectiveUpdate`
- `src/providers/base.ts`:
- `src/providers/deepseek.ts`:
  - **Exports:** `DeepSeekProvider`
  - **Classi:** `DeepSeekProvider`
- `src/providers/factory.ts`:
  - **Exports:** `getLLMProvider`
- `src/providers/null.ts`:
  - **Exports:** `NullProvider`
  - **Classi:** `NullProvider`
- `src/providers/ollama.ts`:
  - **Exports:** `OllamaProvider`
  - **Classi:** `OllamaProvider`
- `tsup.config.ts`:
- `vitest.config.ts`:

### Todo Attivi
- [src/cli/index.ts:21] **TODO**: implementare i comandi per decisions, update, ask e brief
- [src/core/generators/ai-brief.ts:83] **TODO**: Attivi\n`;

