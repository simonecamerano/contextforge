# Architecture

This document provides a structured overview of the project's source modules.

## TypeScript / JavaScript Modules

### [eslint.config.js](file:///eslint.config.js)
- **Exports:** *none*
- **Imports from:** `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `globals`

### [src/cli/commands/ask.ts](file:///src/cli/commands/ask.ts)
- **Exports:** `registerAskCommand`
- **Functions:** `registerAskCommand`
- **Imports from:** `node:fs`, `node:path`, `commander`, `../../core/query/retriever.js`, `../../providers/factory.js`

### [src/cli/commands/brief.ts](file:///src/cli/commands/brief.ts)
- **Exports:** `registerBriefCommand`
- **Functions:** `registerBriefCommand`
- **Imports from:** `node:fs`, `node:path`, `commander`, `../../core/scanner/ignore-engine.js`, `../../core/scanner/file-walker.js`, `../../core/scanner/summarizer.js`, `../../core/generators/ai-brief.js`

### [src/cli/commands/decisions.ts](file:///src/cli/commands/decisions.ts)
- **Exports:** `registerDecisionsCommand`
- **Functions:** `formatDate`, `registerDecisionsCommand`
- **Imports from:** `node:fs`, `node:path`, `node:readline/promises`, `node:process`, `commander`

### [src/cli/commands/init.ts](file:///src/cli/commands/init.ts)
- **Exports:** `registerInitCommand`
- **Functions:** `ask`, `registerInitCommand`
- **Imports from:** `node:fs`, `node:path`, `node:readline`, `node:child_process`, `commander`, `./scan.js`

### [src/cli/commands/scan.ts](file:///src/cli/commands/scan.ts)
- **Exports:** `runScan`, `registerScanCommand`
- **Functions:** `runScan`, `registerScanCommand`
- **Imports from:** `node:fs`, `node:path`, `node:crypto`, `commander`, `../../core/scanner/ignore-engine.js`, `../../core/scanner/file-walker.js`, `../../core/scanner/summarizer.js`, `../../core/generators/project-overview.js`, `../../core/generators/architecture.js`, `../../core/generators/active-context.js`, `../../core/stats/compression-stats.js`

### [src/cli/commands/update.ts](file:///src/cli/commands/update.ts)
- **Exports:** `registerUpdateCommand`
- **Functions:** `registerUpdateCommand`
- **Imports from:** `node:fs`, `node:path`, `commander`, `../../core/scanner/ignore-engine.js`, `../../core/scanner/file-walker.js`, `../../core/scanner/summarizer.js`, `../../core/updater/change-detector.js`, `../../core/updater/selective-update.js`, `../../core/stats/compression-stats.js`

### [src/cli/index.ts](file:///src/cli/index.ts)
- **Exports:** *none*
- **Imports from:** `commander`, `./commands/init.js`, `./commands/scan.js`, `./commands/decisions.js`, `./commands/update.js`, `./commands/brief.js`, `./commands/ask.js`

### [src/core/generators/active-context.ts](file:///src/core/generators/active-context.ts)
- **Exports:** `generateActiveContext`
- **Functions:** `generateActiveContext`
- **Imports from:** `../scanner/summarizer.js`

### [src/core/generators/ai-brief.ts](file:///src/core/generators/ai-brief.ts)
- **Exports:** `generateAIBrief`
- **Functions:** `generateAIBrief`
- **Imports from:** `../scanner/summarizer.js`

### [src/core/generators/architecture.ts](file:///src/core/generators/architecture.ts)
- **Exports:** `generateArchitecture`
- **Functions:** `generateArchitecture`
- **Imports from:** `../scanner/summarizer.js`

### [src/core/generators/generators.test.ts](file:///src/core/generators/generators.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./project-overview.js`, `./architecture.js`, `./active-context.js`, `./ai-brief.js`, `../scanner/summarizer.js`

### [src/core/generators/project-overview.ts](file:///src/core/generators/project-overview.ts)
- **Exports:** `generateProjectOverview`
- **Functions:** `generateProjectOverview`
- **Imports from:** `../scanner/summarizer.js`

### [src/core/query/retriever.test.ts](file:///src/core/query/retriever.test.ts)
- **Exports:** *none*
- **Functions:** `makeDirent`
- **Imports from:** `vitest`, `./retriever.js`, `node:fs`

### [src/core/query/retriever.ts](file:///src/core/query/retriever.ts)
- **Exports:** `retrieveContext`
- **Functions:** `retrieveContext`
- **Imports from:** `node:fs`, `node:path`

### [src/core/scanner/file-walker.test.ts](file:///src/core/scanner/file-walker.test.ts)
- **Exports:** *none*
- **Functions:** `makeStat`, `makeIgnoreEngine`
- **Imports from:** `vitest`, `./file-walker.js`, `./ignore-engine.js`, `node:fs/promises`

### [src/core/scanner/file-walker.ts](file:///src/core/scanner/file-walker.ts)
- **Exports:** `walkDirectory`
- **Functions:** `walkDirectory`
- **Imports from:** `node:fs/promises`, `node:path`, `./ignore-engine.js`

### [src/core/scanner/ignore-engine.test.ts](file:///src/core/scanner/ignore-engine.test.ts)
- **Exports:** *none*
- **Functions:** `makeNormalFileStat`, `makeDirStat`, `setupNormalFile`
- **Imports from:** `vitest`, `node:fs`, `./ignore-engine.js`

### [src/core/scanner/ignore-engine.ts](file:///src/core/scanner/ignore-engine.ts)
- **Exports:** `IgnoreEngine`
- **Classes:**
  - `IgnoreEngine` (Methods: `shouldIgnore`)
- **Imports from:** `node:fs`, `node:path`, `ignore`

### [src/core/scanner/parsers/manifest.test.ts](file:///src/core/scanner/parsers/manifest.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./manifest.js`

### [src/core/scanner/parsers/manifest.ts](file:///src/core/scanner/parsers/manifest.ts)
- **Exports:** `parseManifest`
- **Functions:** `parseManifest`, `parsePackageJson`, `parseRequirementsTxt`, `parsePyprojectToml`
- **Imports from:** `node:path`

### [src/core/scanner/parsers/python.test.ts](file:///src/core/scanner/parsers/python.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./python.js`

### [src/core/scanner/parsers/python.ts](file:///src/core/scanner/parsers/python.ts)
- **Exports:** `parsePython`
- **Functions:** `parsePython`

### [src/core/scanner/parsers/typescript.test.ts](file:///src/core/scanner/parsers/typescript.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./typescript.js`

### [src/core/scanner/parsers/typescript.ts](file:///src/core/scanner/parsers/typescript.ts)
- **Exports:** `parseTypeScript`
- **Functions:** `parseTypeScript`, `visit`
- **Imports from:** `typescript`

### [src/core/scanner/summarizer.test.ts](file:///src/core/scanner/summarizer.test.ts)
- **Exports:** *none*
- **Functions:** `setupDefaultMocks`
- **Imports from:** `vitest`, `./summarizer.js`, `node:fs/promises`, `node:child_process`, `./parsers/typescript.js`, `./parsers/python.js`, `./parsers/manifest.js`

### [src/core/scanner/summarizer.ts](file:///src/core/scanner/summarizer.ts)
- **Exports:** `summarizeProject`
- **Functions:** `summarizeProject`
- **Imports from:** `node:fs/promises`, `node:path`, `node:child_process`, `./parsers/typescript.js`, `./parsers/python.js`, `./parsers/manifest.js`

### [src/core/stats/compression-stats.ts](file:///src/core/stats/compression-stats.ts)
- **Exports:** `computeCompressionStats`
- **Functions:** `computeCompressionStats`
- **Imports from:** `node:fs`, `node:path`

### [src/core/updater/change-detector.test.ts](file:///src/core/updater/change-detector.test.ts)
- **Exports:** *none*
- **Functions:** `hashOf`
- **Imports from:** `vitest`, `node:crypto`, `./change-detector.js`, `node:fs/promises`

### [src/core/updater/change-detector.ts](file:///src/core/updater/change-detector.ts)
- **Exports:** `detectChanges`
- **Functions:** `detectChanges`
- **Imports from:** `node:fs/promises`, `node:path`, `node:crypto`

### [src/core/updater/selective-update.test.ts](file:///src/core/updater/selective-update.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./selective-update.js`, `../scanner/summarizer.js`, `node:fs/promises`, `../generators/project-overview.js`, `../generators/architecture.js`, `../generators/active-context.js`

### [src/core/updater/selective-update.ts](file:///src/core/updater/selective-update.ts)
- **Exports:** `selectiveUpdate`
- **Functions:** `isManifest`, `isSource`, `selectiveUpdate`
- **Imports from:** `node:fs/promises`, `node:path`, `./change-detector.js`, `../scanner/summarizer.js`, `../generators/project-overview.js`, `../generators/architecture.js`, `../generators/active-context.js`

### [src/providers/base.ts](file:///src/providers/base.ts)
- **Exports:** *none*

### [src/providers/deepseek.ts](file:///src/providers/deepseek.ts)
- **Exports:** `DeepSeekProvider`
- **Classes:**
  - `DeepSeekProvider` (Methods: `isAvailable`, `complete`)
- **Functions:** `estimateTokens`
- **Imports from:** `./base.js`

### [src/providers/factory.ts](file:///src/providers/factory.ts)
- **Exports:** `getLLMProvider`
- **Functions:** `getLLMProvider`
- **Imports from:** `./base.js`, `./null.js`, `./ollama.js`, `./deepseek.js`

### [src/providers/null.ts](file:///src/providers/null.ts)
- **Exports:** `NullProvider`
- **Classes:**
  - `NullProvider` (Methods: `isAvailable`, `complete`)
- **Imports from:** `./base.js`

### [src/providers/ollama.ts](file:///src/providers/ollama.ts)
- **Exports:** `OllamaProvider`
- **Classes:**
  - `OllamaProvider` (Methods: `isAvailable`, `complete`)
- **Imports from:** `./base.js`

### [src/providers/providers.test.ts](file:///src/providers/providers.test.ts)
- **Exports:** *none*
- **Functions:** `makeFetchOk`
- **Imports from:** `vitest`, `./factory.js`, `./null.js`, `./ollama.js`, `./deepseek.js`

### [tsup.config.ts](file:///tsup.config.ts)
- **Exports:** *none*
- **Imports from:** `tsup`

### [vitest.config.ts](file:///vitest.config.ts)
- **Exports:** *none*
- **Imports from:** `vitest/config`

