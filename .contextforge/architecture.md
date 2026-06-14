# Architecture

This document provides a structured overview of the project's source modules.

## TypeScript / JavaScript Modules

### [eslint.config.js](../eslint.config.js)
- **Exports:** *none*
- **Imports from:** `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `globals`

### [src/cli/commands/ask.ts](../src/cli/commands/ask.ts)
- **Exports:** `registerAskCommand`
- **Functions:** `registerAskCommand`
- **Imports from:** `node:fs`, `node:path`, `commander`, `../../core/query/retriever.js`, `../../providers/factory.js`

### [src/cli/commands/brief.ts](../src/cli/commands/brief.ts)
- **Exports:** `registerBriefCommand`
- **Functions:** `registerBriefCommand`
- **Imports from:** `node:fs`, `node:path`, `commander`, `../../core/scanner/ignore-engine.js`, `../../core/scanner/file-walker.js`, `../../core/scanner/summarizer.js`, `../../core/generators/ai-brief.js`

### [src/cli/commands/decisions.ts](../src/cli/commands/decisions.ts)
- **Exports:** `registerDecisionsCommand`
- **Functions:** `formatDate`, `registerDecisionsCommand`
- **Imports from:** `node:fs`, `node:path`, `node:readline/promises`, `node:process`, `commander`

### [src/cli/commands/init.ts](../src/cli/commands/init.ts)
- **Exports:** `registerInitCommand`
- **Functions:** `ask`, `normalizeProvider`, `writeProviderEnv`, `registerInitCommand`
- **Imports from:** `node:fs`, `node:path`, `node:readline`, `node:child_process`, `commander`, `./scan.js`

### [src/cli/commands/scan.ts](../src/cli/commands/scan.ts)
- **Exports:** `runScan`, `registerScanCommand`
- **Functions:** `runScan`, `registerScanCommand`
- **Imports from:** `node:fs`, `node:path`, `node:crypto`, `commander`, `../../core/scanner/ignore-engine.js`, `../../core/scanner/file-walker.js`, `../../core/scanner/summarizer.js`, `../../core/generators/project-overview.js`, `../../core/generators/architecture.js`, `../../core/generators/active-context.js`, `../../core/generators/ai-brief.js`, `../../core/stats/compression-stats.js`

### [src/cli/commands/update.ts](../src/cli/commands/update.ts)
- **Exports:** `registerUpdateCommand`
- **Functions:** `registerUpdateCommand`
- **Imports from:** `node:fs`, `node:path`, `commander`, `../../core/scanner/ignore-engine.js`, `../../core/scanner/file-walker.js`, `../../core/scanner/summarizer.js`, `../../core/updater/change-detector.js`, `../../core/updater/selective-update.js`, `../../core/stats/compression-stats.js`

### [src/cli/index.ts](../src/cli/index.ts)
- **Exports:** *none*
- **Imports from:** `commander`, `./commands/init.js`, `./commands/scan.js`, `./commands/decisions.js`, `./commands/update.js`, `./commands/brief.js`, `./commands/ask.js`

### [src/core/generators/active-context.ts](../src/core/generators/active-context.ts)
- **Exports:** `generateActiveContext`
- **Functions:** `generateActiveContext`
- **Imports from:** `../scanner/summarizer.js`, `../scanner/summarizer.js`

### [src/core/generators/ai-brief.ts](../src/core/generators/ai-brief.ts)
- **Exports:** `generateAIBrief`
- **Functions:** `generateAIBrief`
- **Imports from:** `../scanner/summarizer.js`

### [src/core/generators/architecture.ts](../src/core/generators/architecture.ts)
- **Exports:** `generateArchitecture`
- **Functions:** `relativeMarkdownLink`, `generateArchitecture`
- **Imports from:** `../scanner/summarizer.js`

### [src/core/generators/generators.test.ts](../src/core/generators/generators.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./project-overview.js`, `./architecture.js`, `./active-context.js`, `./ai-brief.js`, `../scanner/summarizer.js`

### [src/core/generators/project-overview.ts](../src/core/generators/project-overview.ts)
- **Exports:** `generateProjectOverview`
- **Functions:** `generateProjectOverview`
- **Imports from:** `../scanner/summarizer.js`

### [src/core/query/retriever.test.ts](../src/core/query/retriever.test.ts)
- **Exports:** *none*
- **Functions:** `makeDirent`
- **Imports from:** `vitest`, `./retriever.js`, `node:fs`

### [src/core/query/retriever.ts](../src/core/query/retriever.ts)
- **Exports:** `retrieveContext`
- **Functions:** `retrieveContext`
- **Imports from:** `node:fs`, `node:path`

### [src/core/scanner/file-walker.test.ts](../src/core/scanner/file-walker.test.ts)
- **Exports:** *none*
- **Functions:** `makeStat`, `makeIgnoreEngine`
- **Imports from:** `vitest`, `./file-walker.js`, `./ignore-engine.js`, `node:fs/promises`

### [src/core/scanner/file-walker.ts](../src/core/scanner/file-walker.ts)
- **Exports:** `walkDirectory`
- **Functions:** `walkDirectory`
- **Imports from:** `node:fs/promises`, `node:path`, `./ignore-engine.js`

### [src/core/scanner/ignore-engine.test.ts](../src/core/scanner/ignore-engine.test.ts)
- **Exports:** *none*
- **Functions:** `makeNormalFileStat`, `makeDirStat`, `setupNormalFile`
- **Imports from:** `vitest`, `node:fs`, `./ignore-engine.js`

### [src/core/scanner/ignore-engine.ts](../src/core/scanner/ignore-engine.ts)
- **Exports:** `IgnoreEngine`
- **Classes:**
  - `IgnoreEngine` (Methods: `shouldIgnore`)
- **Imports from:** `node:fs`, `node:path`, `ignore`

### [src/core/scanner/parsers/csharp.test.ts](../src/core/scanner/parsers/csharp.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./csharp.js`

### [src/core/scanner/parsers/csharp.ts](../src/core/scanner/parsers/csharp.ts)
- **Exports:** `parseCSharp`
- **Functions:** `parseCSharp`

### [src/core/scanner/parsers/go.test.ts](../src/core/scanner/parsers/go.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./go.js`

### [src/core/scanner/parsers/go.ts](../src/core/scanner/parsers/go.ts)
- **Exports:** `parseGo`
- **Functions:** `parseGo`

### [src/core/scanner/parsers/java.test.ts](../src/core/scanner/parsers/java.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./java.js`

### [src/core/scanner/parsers/java.ts](../src/core/scanner/parsers/java.ts)
- **Exports:** `parseJava`
- **Functions:** `parseJava`

### [src/core/scanner/parsers/kotlin.test.ts](../src/core/scanner/parsers/kotlin.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./kotlin.js`

### [src/core/scanner/parsers/kotlin.ts](../src/core/scanner/parsers/kotlin.ts)
- **Exports:** `parseKotlin`
- **Functions:** `parseKotlin`

### [src/core/scanner/parsers/manifest.test.ts](../src/core/scanner/parsers/manifest.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./manifest.js`

### [src/core/scanner/parsers/manifest.ts](../src/core/scanner/parsers/manifest.ts)
- **Exports:** `parseManifest`
- **Functions:** `parseManifest`, `parsePackageJson`, `parseRequirementsTxt`, `parsePyprojectToml`
- **Imports from:** `node:path`

### [src/core/scanner/parsers/php.test.ts](../src/core/scanner/parsers/php.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./php.js`

### [src/core/scanner/parsers/php.ts](../src/core/scanner/parsers/php.ts)
- **Exports:** `parsePHP`
- **Functions:** `parsePHP`

### [src/core/scanner/parsers/python.test.ts](../src/core/scanner/parsers/python.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./python.js`

### [src/core/scanner/parsers/python.ts](../src/core/scanner/parsers/python.ts)
- **Exports:** `parsePython`
- **Functions:** `parsePython`

### [src/core/scanner/parsers/roadmap.test.ts](../src/core/scanner/parsers/roadmap.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./roadmap.js`

### [src/core/scanner/parsers/roadmap.ts](../src/core/scanner/parsers/roadmap.ts)
- **Exports:** `parseRoadmap`
- **Functions:** `parseRoadmap`

### [src/core/scanner/parsers/ruby.test.ts](../src/core/scanner/parsers/ruby.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./ruby.js`

### [src/core/scanner/parsers/ruby.ts](../src/core/scanner/parsers/ruby.ts)
- **Exports:** `parseRuby`
- **Functions:** `parseRuby`

### [src/core/scanner/parsers/rust.test.ts](../src/core/scanner/parsers/rust.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./rust.js`

### [src/core/scanner/parsers/rust.ts](../src/core/scanner/parsers/rust.ts)
- **Exports:** `parseRust`
- **Functions:** `parseRust`

### [src/core/scanner/parsers/svelte.test.ts](../src/core/scanner/parsers/svelte.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./svelte.js`

### [src/core/scanner/parsers/svelte.ts](../src/core/scanner/parsers/svelte.ts)
- **Exports:** `parseSvelte`
- **Functions:** `parseSvelte`
- **Imports from:** `./typescript.js`

### [src/core/scanner/parsers/typescript.test.ts](../src/core/scanner/parsers/typescript.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./typescript.js`

### [src/core/scanner/parsers/typescript.ts](../src/core/scanner/parsers/typescript.ts)
- **Exports:** `parseTypeScript`
- **Functions:** `parseTypeScript`, `visit`
- **Imports from:** `typescript`

### [src/core/scanner/parsers/vue.test.ts](../src/core/scanner/parsers/vue.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./vue.js`

### [src/core/scanner/parsers/vue.ts](../src/core/scanner/parsers/vue.ts)
- **Exports:** `parseVue`
- **Functions:** `parseVue`
- **Imports from:** `./typescript.js`

### [src/core/scanner/summarizer.test.ts](../src/core/scanner/summarizer.test.ts)
- **Exports:** *none*
- **Functions:** `setupDefaultMocks`
- **Imports from:** `vitest`, `./summarizer.js`, `node:fs/promises`, `node:child_process`, `./parsers/typescript.js`, `./parsers/python.js`, `./parsers/manifest.js`, `./parsers/roadmap.js`, `./parsers/vue.js`, `./parsers/svelte.js`, `./parsers/php.js`, `./parsers/ruby.js`, `./parsers/go.js`, `./parsers/java.js`, `./parsers/kotlin.js`, `./parsers/csharp.js`, `./parsers/rust.js`

### [src/core/scanner/summarizer.ts](../src/core/scanner/summarizer.ts)
- **Exports:** `RoadmapItem`, `summarizeProject`
- **Functions:** `summarizeProject`
- **Imports from:** `node:fs/promises`, `node:path`, `node:child_process`, `./parsers/typescript.js`, `./parsers/python.js`, `./parsers/manifest.js`, `./parsers/roadmap.js`, `./parsers/vue.js`, `./parsers/svelte.js`, `./parsers/php.js`, `./parsers/ruby.js`, `./parsers/go.js`, `./parsers/java.js`, `./parsers/kotlin.js`, `./parsers/csharp.js`, `./parsers/rust.js`

### [src/core/stats/compression-stats.ts](../src/core/stats/compression-stats.ts)
- **Exports:** `computeCompressionStats`
- **Functions:** `computeCompressionStats`
- **Imports from:** `node:fs`, `node:path`

### [src/core/updater/change-detector.test.ts](../src/core/updater/change-detector.test.ts)
- **Exports:** *none*
- **Functions:** `hashOf`
- **Imports from:** `vitest`, `node:crypto`, `./change-detector.js`, `node:fs/promises`

### [src/core/updater/change-detector.ts](../src/core/updater/change-detector.ts)
- **Exports:** `detectChanges`
- **Functions:** `detectChanges`
- **Imports from:** `node:fs/promises`, `node:path`, `node:crypto`

### [src/core/updater/selective-update.test.ts](../src/core/updater/selective-update.test.ts)
- **Exports:** *none*
- **Imports from:** `vitest`, `./selective-update.js`, `../scanner/summarizer.js`, `node:fs/promises`, `../generators/project-overview.js`, `../generators/architecture.js`, `../generators/active-context.js`, `../generators/ai-brief.js`

### [src/core/updater/selective-update.ts](../src/core/updater/selective-update.ts)
- **Exports:** `selectiveUpdate`
- **Functions:** `isManifest`, `isSource`, `selectiveUpdate`
- **Imports from:** `node:fs/promises`, `node:path`, `./change-detector.js`, `../scanner/summarizer.js`, `../generators/project-overview.js`, `../generators/architecture.js`, `../generators/active-context.js`, `../generators/ai-brief.js`

### [src/providers/base.ts](../src/providers/base.ts)
- **Exports:** *none*

### [src/providers/deepseek.ts](../src/providers/deepseek.ts)
- **Exports:** `DeepSeekProvider`
- **Classes:**
  - `DeepSeekProvider` (Methods: `isAvailable`, `complete`)
- **Functions:** `estimateTokens`
- **Imports from:** `./base.js`

### [src/providers/factory.ts](../src/providers/factory.ts)
- **Exports:** `getLLMProvider`
- **Functions:** `getLLMProvider`
- **Imports from:** `./base.js`, `./null.js`, `./ollama.js`, `./deepseek.js`

### [src/providers/null.ts](../src/providers/null.ts)
- **Exports:** `NullProvider`
- **Classes:**
  - `NullProvider` (Methods: `isAvailable`, `complete`)
- **Imports from:** `./base.js`

### [src/providers/ollama.ts](../src/providers/ollama.ts)
- **Exports:** `OllamaProvider`
- **Classes:**
  - `OllamaProvider` (Methods: `isAvailable`, `complete`)
- **Imports from:** `./base.js`

### [src/providers/providers.test.ts](../src/providers/providers.test.ts)
- **Exports:** *none*
- **Functions:** `makeFetchOk`
- **Imports from:** `vitest`, `./factory.js`, `./null.js`, `./ollama.js`, `./deepseek.js`

### [tsup.config.ts](../tsup.config.ts)
- **Exports:** *none*
- **Imports from:** `tsup`

### [vitest.config.ts](../vitest.config.ts)
- **Exports:** *none*
- **Imports from:** `vitest/config`

