# Architecture

Questo documento fornisce una panoramica strutturata dei moduli sorgente del progetto.

## Moduli TypeScript / JavaScript

### [eslint.config.js](file:///eslint.config.js)
- **Exports:** *nessuno*
- **Imports da:** `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`

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
- **Imports da:** `commander`, `./commands/init.js`, `./commands/scan.js`, `./commands/decisions.js`, `./commands/update.js`

### [src/core/generators/active-context.ts](file:///src/core/generators/active-context.ts)
- **Exports:** `generateActiveContext`
- **Funzioni:** `generateActiveContext`
- **Imports da:** `../scanner/summarizer.js`

### [src/core/generators/architecture.ts](file:///src/core/generators/architecture.ts)
- **Exports:** `generateArchitecture`
- **Funzioni:** `generateArchitecture`
- **Imports da:** `../scanner/summarizer.js`

### [src/core/generators/project-overview.ts](file:///src/core/generators/project-overview.ts)
- **Exports:** `generateProjectOverview`
- **Funzioni:** `generateProjectOverview`
- **Imports da:** `../scanner/summarizer.js`

### [src/core/scanner/file-walker.ts](file:///src/core/scanner/file-walker.ts)
- **Exports:** `walkDirectory`
- **Funzioni:** `walkDirectory`
- **Imports da:** `node:fs/promises`, `node:path`, `./ignore-engine.js`

### [src/core/scanner/ignore-engine.ts](file:///src/core/scanner/ignore-engine.ts)
- **Exports:** `IgnoreEngine`
- **Classi:**
  - `IgnoreEngine` (Metodi: `shouldIgnore`)
- **Imports da:** `node:fs`, `node:path`, `ignore`

### [src/core/scanner/parsers/manifest.ts](file:///src/core/scanner/parsers/manifest.ts)
- **Exports:** `parseManifest`
- **Funzioni:** `parseManifest`, `parsePackageJson`, `parseRequirementsTxt`, `parsePyprojectToml`
- **Imports da:** `node:path`

### [src/core/scanner/parsers/python.ts](file:///src/core/scanner/parsers/python.ts)
- **Exports:** `parsePython`
- **Funzioni:** `parsePython`

### [src/core/scanner/parsers/typescript.ts](file:///src/core/scanner/parsers/typescript.ts)
- **Exports:** `parseTypeScript`
- **Funzioni:** `parseTypeScript`, `visit`
- **Imports da:** `typescript`

### [src/core/scanner/summarizer.ts](file:///src/core/scanner/summarizer.ts)
- **Exports:** `summarizeProject`
- **Funzioni:** `summarizeProject`
- **Imports da:** `node:fs/promises`, `node:path`, `node:child_process`, `./parsers/typescript.js`, `./parsers/python.js`, `./parsers/manifest.js`

### [src/core/updater/change-detector.ts](file:///src/core/updater/change-detector.ts)
- **Exports:** `detectChanges`
- **Funzioni:** `detectChanges`
- **Imports da:** `node:fs/promises`, `node:path`, `node:crypto`

### [src/core/updater/selective-update.ts](file:///src/core/updater/selective-update.ts)
- **Exports:** `selectiveUpdate`
- **Funzioni:** `isManifest`, `isSource`, `selectiveUpdate`
- **Imports da:** `node:fs/promises`, `node:path`, `./change-detector.js`, `../scanner/summarizer.js`, `../generators/project-overview.js`, `../generators/architecture.js`, `../generators/active-context.js`

### [tsup.config.ts](file:///tsup.config.ts)
- **Exports:** *nessuno*
- **Imports da:** `tsup`

### [vitest.config.ts](file:///vitest.config.ts)
- **Exports:** *nessuno*
- **Imports da:** `vitest/config`

