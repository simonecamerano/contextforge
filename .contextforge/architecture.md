# Architecture

Questo documento fornisce una panoramica strutturata dei moduli sorgente del progetto.

## Moduli TypeScript / JavaScript

### [eslint.config.js](file:///eslint.config.js)
- **Exports:** *nessuno*
- **Imports da:** `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `globals`

### [src/cli/commands/ask.ts](file:///src/cli/commands/ask.ts)
- **Exports:** `registerAskCommand`
- **Funzioni:** `registerAskCommand`
- **Imports da:** `node:fs`, `node:path`, `commander`, `../../core/query/retriever.js`, `../../providers/factory.js`

### [src/cli/commands/brief.ts](file:///src/cli/commands/brief.ts)
- **Exports:** `registerBriefCommand`
- **Funzioni:** `registerBriefCommand`
- **Imports da:** `node:fs`, `node:path`, `commander`, `../../core/scanner/ignore-engine.js`, `../../core/scanner/file-walker.js`, `../../core/scanner/summarizer.js`, `../../core/generators/ai-brief.js`

### [src/cli/commands/decisions.ts](file:///src/cli/commands/decisions.ts)
- **Exports:** `registerDecisionsCommand`
- **Funzioni:** `formatDate`, `registerDecisionsCommand`
- **Imports da:** `node:fs`, `node:path`, `node:readline/promises`, `node:process`, `commander`

### [src/cli/commands/init.ts](file:///src/cli/commands/init.ts)
- **Exports:** `registerInitCommand`
- **Funzioni:** `registerInitCommand`
- **Imports da:** `node:fs`, `node:path`, `commander`

### [src/cli/commands/scan.ts](file:///src/cli/commands/scan.ts)
- **Exports:** `registerScanCommand`
- **Funzioni:** `registerScanCommand`
- **Imports da:** `node:fs`, `node:path`, `node:crypto`, `commander`, `../../core/scanner/ignore-engine.js`, `../../core/scanner/file-walker.js`, `../../core/scanner/summarizer.js`, `../../core/generators/project-overview.js`, `../../core/generators/architecture.js`, `../../core/generators/active-context.js`

### [src/cli/commands/update.ts](file:///src/cli/commands/update.ts)
- **Exports:** `registerUpdateCommand`
- **Funzioni:** `registerUpdateCommand`
- **Imports da:** `node:fs`, `node:path`, `commander`, `../../core/scanner/ignore-engine.js`, `../../core/scanner/file-walker.js`, `../../core/scanner/summarizer.js`, `../../core/updater/change-detector.js`, `../../core/updater/selective-update.js`

### [src/cli/index.ts](file:///src/cli/index.ts)
- **Exports:** *nessuno*
- **Imports da:** `commander`, `./commands/init.js`, `./commands/scan.js`, `./commands/decisions.js`, `./commands/update.js`, `./commands/brief.js`, `./commands/ask.js`

### [src/core/generators/active-context.ts](file:///src/core/generators/active-context.ts)
- **Exports:** `generateActiveContext`
- **Funzioni:** `generateActiveContext`
- **Imports da:** `../scanner/summarizer.js`

### [src/core/generators/ai-brief.ts](file:///src/core/generators/ai-brief.ts)
- **Exports:** `generateAIBrief`
- **Funzioni:** `generateAIBrief`
- **Imports da:** `../scanner/summarizer.js`

### [src/core/generators/architecture.ts](file:///src/core/generators/architecture.ts)
- **Exports:** `generateArchitecture`
- **Funzioni:** `generateArchitecture`
- **Imports da:** `../scanner/summarizer.js`

### [src/core/generators/generators.test.ts](file:///src/core/generators/generators.test.ts)
- **Exports:** *nessuno*
- **Imports da:** `vitest`, `./project-overview.js`, `./architecture.js`, `./active-context.js`, `./ai-brief.js`, `../scanner/summarizer.js`

### [src/core/generators/project-overview.ts](file:///src/core/generators/project-overview.ts)
- **Exports:** `generateProjectOverview`
- **Funzioni:** `generateProjectOverview`
- **Imports da:** `../scanner/summarizer.js`

### [src/core/query/retriever.test.ts](file:///src/core/query/retriever.test.ts)
- **Exports:** *nessuno*
- **Funzioni:** `makeDirent`
- **Imports da:** `vitest`, `./retriever.js`, `node:fs`

### [src/core/query/retriever.ts](file:///src/core/query/retriever.ts)
- **Exports:** `retrieveContext`
- **Funzioni:** `retrieveContext`
- **Imports da:** `node:fs`, `node:path`

### [src/core/scanner/file-walker.test.ts](file:///src/core/scanner/file-walker.test.ts)
- **Exports:** *nessuno*
- **Funzioni:** `makeStat`, `makeIgnoreEngine`
- **Imports da:** `vitest`, `./file-walker.js`, `./ignore-engine.js`, `node:fs/promises`

### [src/core/scanner/file-walker.ts](file:///src/core/scanner/file-walker.ts)
- **Exports:** `walkDirectory`
- **Funzioni:** `walkDirectory`
- **Imports da:** `node:fs/promises`, `node:path`, `./ignore-engine.js`

### [src/core/scanner/ignore-engine.test.ts](file:///src/core/scanner/ignore-engine.test.ts)
- **Exports:** *nessuno*
- **Funzioni:** `makeNormalFileStat`, `makeDirStat`, `setupNormalFile`
- **Imports da:** `vitest`, `node:fs`, `./ignore-engine`

### [src/core/scanner/ignore-engine.ts](file:///src/core/scanner/ignore-engine.ts)
- **Exports:** `IgnoreEngine`
- **Classi:**
  - `IgnoreEngine` (Metodi: `shouldIgnore`)
- **Imports da:** `node:fs`, `node:path`, `ignore`

### [src/core/scanner/parsers/manifest.test.ts](file:///src/core/scanner/parsers/manifest.test.ts)
- **Exports:** *nessuno*
- **Imports da:** `vitest`, `./manifest.js`

### [src/core/scanner/parsers/manifest.ts](file:///src/core/scanner/parsers/manifest.ts)
- **Exports:** `parseManifest`
- **Funzioni:** `parseManifest`, `parsePackageJson`, `parseRequirementsTxt`, `parsePyprojectToml`
- **Imports da:** `node:path`

### [src/core/scanner/parsers/python.test.ts](file:///src/core/scanner/parsers/python.test.ts)
- **Exports:** *nessuno*
- **Imports da:** `vitest`, `./python.js`

### [src/core/scanner/parsers/python.ts](file:///src/core/scanner/parsers/python.ts)
- **Exports:** `parsePython`
- **Funzioni:** `parsePython`

### [src/core/scanner/parsers/typescript.test.ts](file:///src/core/scanner/parsers/typescript.test.ts)
- **Exports:** *nessuno*
- **Imports da:** `vitest`, `./typescript.js`

### [src/core/scanner/parsers/typescript.ts](file:///src/core/scanner/parsers/typescript.ts)
- **Exports:** `parseTypeScript`
- **Funzioni:** `parseTypeScript`, `visit`
- **Imports da:** `typescript`

### [src/core/scanner/summarizer.test.ts](file:///src/core/scanner/summarizer.test.ts)
- **Exports:** *nessuno*
- **Funzioni:** `setupDefaultMocks`
- **Imports da:** `vitest`, `./summarizer.js`, `node:fs/promises`, `node:child_process`, `./parsers/typescript.js`, `./parsers/python.js`, `./parsers/manifest.js`

### [src/core/scanner/summarizer.ts](file:///src/core/scanner/summarizer.ts)
- **Exports:** `summarizeProject`
- **Funzioni:** `summarizeProject`
- **Imports da:** `node:fs/promises`, `node:path`, `node:child_process`, `./parsers/typescript.js`, `./parsers/python.js`, `./parsers/manifest.js`

### [src/core/updater/change-detector.test.ts](file:///src/core/updater/change-detector.test.ts)
- **Exports:** *nessuno*
- **Funzioni:** `hashOf`
- **Imports da:** `vitest`, `node:crypto`, `./change-detector.js`, `node:fs/promises`

### [src/core/updater/change-detector.ts](file:///src/core/updater/change-detector.ts)
- **Exports:** `detectChanges`
- **Funzioni:** `detectChanges`
- **Imports da:** `node:fs/promises`, `node:path`, `node:crypto`

### [src/core/updater/selective-update.test.ts](file:///src/core/updater/selective-update.test.ts)
- **Exports:** *nessuno*
- **Imports da:** `vitest`, `./selective-update.js`, `../scanner/summarizer.js`, `node:fs/promises`, `../generators/project-overview.js`, `../generators/architecture.js`, `../generators/active-context.js`

### [src/core/updater/selective-update.ts](file:///src/core/updater/selective-update.ts)
- **Exports:** `selectiveUpdate`
- **Funzioni:** `isManifest`, `isSource`, `selectiveUpdate`
- **Imports da:** `node:fs/promises`, `node:path`, `./change-detector.js`, `../scanner/summarizer.js`, `../generators/project-overview.js`, `../generators/architecture.js`, `../generators/active-context.js`

### [src/providers/base.ts](file:///src/providers/base.ts)
- **Exports:** *nessuno*

### [src/providers/deepseek.ts](file:///src/providers/deepseek.ts)
- **Exports:** `DeepSeekProvider`
- **Classi:**
  - `DeepSeekProvider` (Metodi: `isAvailable`, `complete`)
- **Funzioni:** `estimateTokens`
- **Imports da:** `./base.js`

### [src/providers/factory.ts](file:///src/providers/factory.ts)
- **Exports:** `getLLMProvider`
- **Funzioni:** `getLLMProvider`
- **Imports da:** `./base.js`, `./null.js`, `./ollama.js`, `./deepseek.js`

### [src/providers/null.ts](file:///src/providers/null.ts)
- **Exports:** `NullProvider`
- **Classi:**
  - `NullProvider` (Metodi: `isAvailable`, `complete`)
- **Imports da:** `./base.js`

### [src/providers/ollama.ts](file:///src/providers/ollama.ts)
- **Exports:** `OllamaProvider`
- **Classi:**
  - `OllamaProvider` (Metodi: `isAvailable`, `complete`)
- **Imports da:** `./base.js`

### [src/providers/providers.test.ts](file:///src/providers/providers.test.ts)
- **Exports:** *nessuno*
- **Funzioni:** `makeFetchOk`
- **Imports da:** `vitest`, `./factory.js`, `./null.js`, `./ollama.js`, `./deepseek.js`

### [tsup.config.ts](file:///tsup.config.ts)
- **Exports:** *nessuno*
- **Imports da:** `tsup`

### [vitest.config.ts](file:///vitest.config.ts)
- **Exports:** *nessuno*
- **Imports da:** `vitest/config`

