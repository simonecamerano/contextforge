# AI Brief

This document contains an optimized summary of the project context for LLMs.

## Project Overview
- **Project:** contextforge
- **Languages:** Markdown, JavaScript, JSON, TypeScript
- **Branch:** main

### Key Dependencies
- `commander`: `^12.1.0`
- `cosmiconfig`: `^9.0.0`
- `eta`: `^3.4.0`
- `ignore`: `^5.3.1`
- `zod`: `^3.23.8`

### Module Structure
#### TypeScript/JavaScript Modules
- `eslint.config.js`:
- `src/cli/commands/ask.ts`:
  - **Exports:** `registerAskCommand`
- `src/cli/commands/brief.ts`:
  - **Exports:** `registerBriefCommand`
- `src/cli/commands/decisions.ts`:
  - **Exports:** `registerDecisionsCommand`
- `src/cli/commands/init.ts`:
  - **Exports:** `registerInitCommand`
- `src/cli/commands/scan.ts`:
  - **Exports:** `runScan`, `registerScanCommand`
- `src/cli/commands/update.ts`:
  - **Exports:** `registerUpdateCommand`
- `src/cli/index.ts`:
- `src/core/generators/active-context.ts`:
  - **Exports:** `generateActiveContext`
- `src/core/generators/ai-brief.ts`:
  - **Exports:** `generateAIBrief`
- `src/core/generators/architecture.ts`:
  - **Exports:** `generateArchitecture`
- `src/core/generators/generators.test.ts`:
- `src/core/generators/project-overview.ts`:
  - **Exports:** `generateProjectOverview`
- `src/core/query/retriever.test.ts`:
- `src/core/query/retriever.ts`:
  - **Exports:** `retrieveContext`
- `src/core/scanner/file-walker.test.ts`:
- `src/core/scanner/file-walker.ts`:
  - **Exports:** `walkDirectory`
- `src/core/scanner/ignore-engine.test.ts`:
- `src/core/scanner/ignore-engine.ts`:
  - **Exports:** `IgnoreEngine`
  - **Classes:** `IgnoreEngine`
- `src/core/scanner/parsers/manifest.test.ts`:
- `src/core/scanner/parsers/manifest.ts`:
  - **Exports:** `parseManifest`
- `src/core/scanner/parsers/python.test.ts`:
- `src/core/scanner/parsers/python.ts`:
  - **Exports:** `parsePython`
- `src/core/scanner/parsers/typescript.test.ts`:
- `src/core/scanner/parsers/typescript.ts`:
  - **Exports:** `parseTypeScript`
- `src/core/scanner/summarizer.test.ts`:
- `src/core/scanner/summarizer.ts`:
  - **Exports:** `summarizeProject`
- `src/core/stats/compression-stats.ts`:
  - **Exports:** `computeCompressionStats`
- `src/core/updater/change-detector.test.ts`:
- `src/core/updater/change-detector.ts`:
  - **Exports:** `detectChanges`
- `src/core/updater/selective-update.test.ts`:
- `src/core/updater/selective-update.ts`:
  - **Exports:** `selectiveUpdate`
- `src/providers/base.ts`:
- `src/providers/deepseek.ts`:
  - **Exports:** `DeepSeekProvider`
  - **Classes:** `DeepSeekProvider`
- `src/providers/factory.ts`:
  - **Exports:** `getLLMProvider`
- `src/providers/null.ts`:
  - **Exports:** `NullProvider`
  - **Classes:** `NullProvider`
- `src/providers/ollama.ts`:
  - **Exports:** `OllamaProvider`
  - **Classes:** `OllamaProvider`
- `src/providers/providers.test.ts`:
- `tsup.config.ts`:
- `vitest.config.ts`:

### Active Todos
- [src/core/scanner/summarizer.test.ts:140] **TODO**: comment', async () => {
- [src/core/scanner/summarizer.test.ts:141] **TODO**: refactor this\n');
- [src/core/scanner/summarizer.test.ts:151] **FIXME**: comment', async () => {
- [src/core/scanner/summarizer.test.ts:152] **FIXME**: broken logic\nconst y = 2;\n');
- [src/core/scanner/summarizer.test.ts:162] **TODO**: comment in Python files', async () => {
- [src/core/scanner/summarizer.test.ts:163] **TODO**: improve performance\n');
- [src/core/scanner/summarizer.test.ts:173] **TODO**: comment (triple-slash style)', async () => {
- [src/core/scanner/summarizer.test.ts:174] **TODO**: document this\n');
- [src/core/scanner/summarizer.test.ts:185] **TODO**: lowercase\n// fixme: also lowercase\n');
- [src/core/scanner/summarizer.test.ts:196] **TODO**: first file\n')
- [src/core/scanner/summarizer.test.ts:197] **FIXME**: second file\n');
- [src/core/scanner/summarizer.test.ts:217] **TODO**: on line four\n');
- [src/core/scanner/summarizer.test.ts:424] **TODO**: second file\n');

