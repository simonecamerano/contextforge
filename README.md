# ContextForge

[![CI](https://github.com/Galdrial/contextforge/actions/workflows/ci.yml/badge.svg)](https://github.com/Galdrial/contextforge/actions/workflows/ci.yml)

> **Local-first project memory engine for developers and AI agents.**

![ContextForge demo](./demo.gif)

ContextForge scans your codebase and builds a structured, version-controlled memory layer — a set of Markdown documents in `.contextforge/` — that captures your project's architecture, active context, technical decisions, and open questions. This memory can be queried directly from the terminal or used as a precise context window when prompting an LLM.

```
contextforge init    → scaffold the memory layer
contextforge scan    → analyse the repo and populate the docs
contextforge update  → re-sync only what changed
contextforge ask "how is authentication handled?"
```

---


## Table of Contents

- [Why ContextForge](#why-contextforge)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [CLI Commands](#cli-commands)
  - [init](#init)
  - [scan](#scan)
  - [update](#update)
  - [decisions](#decisions)
  - [brief](#brief)
  - [ask](#ask)
- [LLM Providers](#llm-providers)
  - [Ollama (local)](#ollama-local)
  - [DeepSeek (cloud)](#deepseek-cloud)
  - [No provider (offline mode)](#no-provider-offline-mode)
- [Environment Variables](#environment-variables)
- [The `.contextforge/` Directory](#the-contextforge-directory)
- [Ignore Rules](#ignore-rules)
- [Running Tests](#running-tests)
- [Development](#development)

---

## Why ContextForge

Modern AI assistants hallucinate project details, forget context between sessions, and lack awareness of the decisions made weeks ago. ContextForge solves this by maintaining a **local, deterministic, git-tracked memory** of your project that you control completely:

- **No cloud dependency** — all scanning and document generation runs locally.
- **LLM-agnostic** — pluggable providers; works offline with `null` provider.
- **Incremental** — the `update` command detects file-level changes (SHA-256 hashes) and re-generates only the affected documents.
- **Human-readable** — every artefact is plain Markdown, editable by hand.
- **Token-aware** — `brief` compresses context into a token-budget you set, making it safe to paste into any LLM prompt.

---

## Architecture

ContextForge is organised in three layers:

```
┌─────────────────────────────────────────────────┐
│                   CLI layer                      │
│  init · scan · update · decisions · brief · ask  │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│                  Core layer                      │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Scanner  │  │ Updater  │  │   Generators  │  │
│  │          │  │          │  │               │  │
│  │IgnoreEng │  │ChangeDet │  │ProjectOverview│  │
│  │FileWalker│  │SelectUpd │  │Architecture   │  │
│  │Summarizer│  └──────────┘  │ActiveContext  │  │
│  │ Parsers  │                │AIBrief        │  │
│  └──────────┘                └───────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │             Query / Retriever            │   │
│  │  TF-IDF-style keyword scoring over .md  │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│               Providers layer                    │
│         OllamaProvider · DeepSeekProvider        │
│               NullProvider (offline)             │
└─────────────────────────────────────────────────┘
```

### Scanner

| Module | Responsibility |
|---|---|
| `IgnoreEngine` | Layers `.gitignore` + `.contextforgeignore` + hardcoded defaults (e.g. `node_modules/`, `dist/`). Also filters binary files and files > 500 KB. |
| `FileWalker` | Recursive directory traversal that delegates every path decision to `IgnoreEngine`. |
| `Summarizer` | Reads each file and builds a `ProjectSummary` — imports, exports, classes, functions, TODOs, git metadata. Dispatches structural parsing via `PARSER_REGISTRY`. |
| `parsers/typescript` | Regex-based extraction for `.ts`/`.tsx`/`.js`/`.jsx` (React). |
| `parsers/python` | Regex-based extraction for `.py` files. |
| `parsers/vue` | Extracts `<script>` block from `.vue` SFCs and delegates to `parseTypeScript`. |
| `parsers/svelte` | Extracts `<script>` block from `.svelte` SFCs and delegates to `parseTypeScript`. |
| `parsers/php` | Regex-based extraction for `.php` — `use` imports, classes, public methods, functions. |
| `parsers/ruby` | Regex-based extraction for `.rb` — `require`/`require_relative`, classes, modules, methods. |
| `parsers/go` | Regex-based extraction for `.go` — import blocks, exported structs, methods, functions. |
| `parsers/java` | Regex-based extraction for `.java` — imports, public classes/interfaces, methods. |
| `parsers/kotlin` | Regex-based extraction for `.kt` — imports, classes, objects, top-level functions. |
| `parsers/csharp` | Regex-based extraction for `.cs` — `using` directives, classes, interfaces, methods. |
| `parsers/rust` | Regex-based extraction for `.rs` — `use` statements, pub structs/enums, impl methods, pub fns. |
| `parsers/manifest` | Parses `package.json`, `requirements.txt`, and `pyproject.toml`. |

### Updater

| Module | Responsibility |
|---|---|
| `ChangeDetector` | Computes SHA-256 hashes for all current files and diffs them against the hashes stored in `.contextforge/local/meta.json`. |
| `SelectiveUpdate` | Given the change diff, decides which generator(s) need to re-run. Source file changes trigger architecture + active-context regeneration; manifest changes also trigger project-overview regeneration. |

### Generators

Each generator receives a `ProjectSummary` and produces one Markdown document:

| Generator | Output file |
|---|---|
| `generateProjectOverview` | `project-overview.md` |
| `generateArchitecture` | `architecture.md` |
| `generateActiveContext` | `active-context.md` |
| `generateAIBrief` | `ai-brief.md` |

### Query / Retriever

`retrieveContext` implements a simple **keyword-frequency retrieval** over all Markdown files in `.contextforge/` (excluding `ai-brief.md` to avoid duplication). Files are split into sections at `##`/`###` headings; each section is scored by the fraction of query terms it contains, and the top-5 chunks are returned. These chunks are fed to the active LLM provider (or printed directly in offline mode).

### Providers

All providers implement the `LLMProvider` interface:

```ts
interface LLMProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
}
```

---

## Project Structure

```
ContextForge/
├── src/
│   ├── cli/
│   │   ├── index.ts                  # CLI entry point (Commander)
│   │   └── commands/
│   │       ├── init.ts
│   │       ├── scan.ts
│   │       ├── update.ts
│   │       ├── decisions.ts
│   │       ├── brief.ts
│   │       └── ask.ts
│   ├── core/
│   │   ├── scanner/
│   │   │   ├── file-walker.ts
│   │   │   ├── ignore-engine.ts
│   │   │   ├── summarizer.ts
│   │   │   └── parsers/
│   │   │       ├── typescript.ts
│   │   │       ├── python.ts
│   │   │       ├── vue.ts
│   │   │       ├── svelte.ts
│   │   │       ├── php.ts
│   │   │       ├── ruby.ts
│   │   │       ├── go.ts
│   │   │       ├── java.ts
│   │   │       ├── kotlin.ts
│   │   │       ├── csharp.ts
│   │   │       ├── rust.ts
│   │   │       └── manifest.ts
│   │   ├── updater/
│   │   │   ├── change-detector.ts
│   │   │   └── selective-update.ts
│   │   ├── generators/
│   │   │   ├── project-overview.ts
│   │   │   ├── architecture.ts
│   │   │   ├── active-context.ts
│   │   │   └── ai-brief.ts
│   │   └── query/
│   │       └── retriever.ts
│   └── providers/
│       ├── base.ts                   # LLMProvider interface
│       ├── factory.ts                # getLLMProvider()
│       ├── ollama.ts
│       ├── deepseek.ts
│       └── null.ts
├── .contextforge/                    # Memory layer (git-tracked)
│   ├── project-overview.md
│   ├── architecture.md
│   ├── active-context.md
│   ├── coding-rules.md
│   ├── technical-decisions.md
│   ├── open-questions.md
│   ├── ai-brief.md
│   └── local/                        # Machine-local, git-ignored
│       └── meta.json                 # File hashes for incremental updates
├── dist/                             # Compiled output (tsup)
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

---

## Installation & Setup

### Prerequisites

- **Node.js ≥ 20**
- **npm ≥ 10**
- **Git** (optional, but enables branch and commit metadata in generated docs)

### Install from source

```bash
git clone https://github.com/your-username/contextforge.git
cd contextforge
npm install
npm run build
```

### Link globally (recommended for development)

```bash
npm link
```

After linking, the `contextforge` command is available anywhere on your machine:

```bash
contextforge --version   # 0.1.0
contextforge --help
```

### Use in a project without global install

```bash
npx contextforge init
```

Or add it as a dev dependency:

```bash
npm install --save-dev contextforge
```

Then invoke it through your `package.json` scripts or via `npx`.

---

## CLI Commands

### `init`

Initializes ContextForge in the current directory.

```bash
contextforge init
```

**What it does:**
1. **Initializes Git**: If no local Git repository (`.git` folder) is detected in the current directory, it runs `git init` automatically.
2. **Scaffolds ContextForge**: Creates the `.contextforge/` directory with seven starter Markdown files and the local machine-specific `.contextforge/local/` directory (automatically appended to `.gitignore`).
3. **Scaffolds Agent Rules**: Automatically scaffolds the agent rules directory and template at `.agent/rules/scelta_modello.md` to enable out-of-the-box model selection routing and context injection.
4. **Performs Initial Scan**: Automatically runs a full scan of the codebase to populate your `.contextforge/` files immediately.

**ContextForge Files Created:**

```
.contextforge/
├── project-overview.md       # Project description and tech stack
├── architecture.md           # Module structure and architectural decisions
├── active-context.md         # Current work state, active branch, TODOs
├── coding-rules.md           # Style guide and coding conventions
├── technical-decisions.md    # Historical ADR log
├── open-questions.md         # Open bugs, questions, and clarifications
└── ai-brief.md               # LLM-optimised summary
```

> Run this once per project. If `.contextforge/` already exists, the command exits early with a warning.

---

### `scan`

Walks the entire repository, builds a `ProjectSummary` (imports, exports, classes, functions, TODOs, Git metadata), and overwrites `project-overview.md`, `architecture.md`, and `active-context.md` with freshly generated content. Also writes `.contextforge/local/meta.json` with SHA-256 hashes of every scanned file (used by `update`).

```bash
contextforge scan
```

**Example output:**

```
Starting repository scan...
Found 42 files to analyze.
Updated: .contextforge/project-overview.md
Updated: .contextforge/architecture.md
Updated: .contextforge/active-context.md
Updated: .contextforge/local/meta.json

Scan completed successfully!
```

> Run `scan` whenever you want a full refresh from scratch (although `update` is recommended for daily incremental runs).

---

### `update`

Computes SHA-256 hashes for all current files, diffs them against the baseline stored in `meta.json`, and re-generates only the documents affected by the changes. This is significantly faster than a full `scan` on large repositories.

```bash
contextforge update
```

**Change categories detected:**

| Category | Documents re-generated |
|---|---|
| Source file modified / added / removed | `architecture.md`, `active-context.md` |
| Manifest changed (`package.json`, etc.) | `project-overview.md` + the above |
| No changes | Nothing — exits immediately |

**Example output:**

```
Trovati 42 file. Rilevamento modifiche...
Rilevate modifiche: 3 modificati, 1 aggiunti, 0 rimossi.
Aggiornato: .contextforge/architecture.md
Aggiornato: .contextforge/active-context.md
Aggiornato: .contextforge/local/meta.json

Aggiornamento completato con successo!
```

---

### `decisions`

Records a new **Architecture Decision Record (ADR)** in `technical-decisions.md` and adds a timestamped link to `active-context.md`. Options can be supplied as flags; any missing values are prompted interactively.

```bash
contextforge decisions [options]
```

**Options:**

| Flag | Description |
|---|---|
| `-t, --title <title>` | Title of the decision |
| `-c, --context <context>` | Background and situation |
| `-d, --decision <decision>` | The decision taken |
| `-a, --alternatives <alternatives>` | Alternatives that were considered |
| `-g, --consequences <consequences>` | Consequences (trade-offs) |

**Non-interactive example:**

```bash
contextforge decisions \
  --title "Use Zod for schema validation" \
  --context "We need runtime validation of external API responses" \
  --decision "Adopt Zod as the single validation library" \
  --alternatives "Joi, Yup, hand-rolled validators" \
  --consequences "Smaller bundle, TypeScript-first inference; adds a runtime dependency"
```

**Interactive example:**

```bash
contextforge decisions
# Titolo della decisione: Switch to pnpm
# Contesto (Qual è la situazione?): npm installs are slow on CI
# ...
```

**What gets written to `technical-decisions.md`:**

```markdown
## [2025-11-15] Use Zod for schema validation

- **Stato:** Approved
- **Contesto:** We need runtime validation of external API responses
- **Decisione:** Adopt Zod as the single validation library
- **Alternative Considerate:** Joi, Yup, hand-rolled validators
- **Conseguenze:** Smaller bundle, TypeScript-first inference; adds a runtime dependency
```

---

### `brief`

Generates `.contextforge/ai-brief.md` — a **token-budget-aware summary** of the entire project, suitable for pasting directly into an LLM prompt. The generator trims dependency lists, truncates module exports, and caps the output at the specified token budget (defaulting to 4 000 tokens, estimated at 4 characters per token).

```bash
contextforge brief [options]
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `-b, --budget <tokens>` | `4000` | Maximum token budget for the brief |

**Examples:**

```bash
# Default 4 000-token budget
contextforge brief

# Tight budget for models with small context windows
contextforge brief --budget 1500

# Generous budget for models supporting large contexts
contextforge brief --budget 8000
```

**Example output:**

```
Generazione AI Brief con un budget di 4000 token...
Aggiornato: .contextforge/ai-brief.md
Dimensione stimata del brief: ~1823 token (su 4000 max).
```

The generated `ai-brief.md` contains:

- Project name, detected languages, active Git branch
- Main production dependencies (truncated if many)
- Module structure — exports and classes per file (trimmed when budget is tight)
- Active TODOs and FIXMEs extracted from comments

---

### `ask`

Retrieves the most relevant sections from `.contextforge/` documents for a given question and either prints them (offline mode) or sends them to an LLM for a synthesised answer.

```bash
contextforge ask "<question>" [options]
```

**Options:**

| Flag | Description |
|---|---|
| `-p, --provider <name>` | LLM provider: `ollama`, `deepseek`, or `null` |
| `-m, --model <name>` | Model name (overrides the default for the chosen provider) |

**Offline mode** (no provider configured):

```bash
contextforge ask "where are the parsers defined?"
```

```
Risultati locali per: "where are the parsers defined?"

--- [architecture.md] Parsers (score: 0.75) ---
...content of the matching section...

--- [project-overview.md] Project Overview (score: 0.50) ---
...
```

**With Ollama:**

```bash
contextforge ask "how does the ignore engine work?" --provider ollama --model llama3
```

**With DeepSeek** (requires `DEEPSEEK_API_KEY`):

```bash
contextforge ask "what technical decisions have been made?" --provider deepseek
```

**How retrieval works:**

1. All `.md` files in `.contextforge/` (except `ai-brief.md`) are read.
2. Each file is split into sections at `##`/`###` headings.
3. Every query term longer than 2 characters is matched against each section.
4. Sections are ranked by the fraction of terms matched (score in `[0, 1]`).
5. The top 5 sections are assembled as a context block and fed to the LLM.

---

## LLM Providers

### Ollama (local)

[Ollama](https://ollama.com) runs open-source models (Llama 3, Mistral, Gemma, …) entirely on your machine — no API key required.

**Setup:**

```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3
```

**Use with ContextForge:**

```bash
contextforge ask "explain the scanner architecture" --provider ollama
# Uses llama3 on http://localhost:11434 by default

contextforge ask "list all TODOs" --provider ollama --model mistral
```

**Configuration via environment variables:**

```bash
export CONTEXTFORGE_PROVIDER=ollama
export OLLAMA_HOST=http://localhost:11434   # default
export OLLAMA_MODEL=llama3                  # default
```

---

### DeepSeek (cloud)

[DeepSeek](https://platform.deepseek.com) offers a cost-effective cloud LLM API compatible with the OpenAI message format.

**Setup:**

1. Create an account at [platform.deepseek.com](https://platform.deepseek.com).
2. Generate an API key in the dashboard.
3. Export it as an environment variable:

```bash
export DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

**Use with ContextForge:**

```bash
contextforge ask "summarise recent architectural decisions" --provider deepseek

# Override the model
contextforge ask "what is the active branch?" --provider deepseek --model deepseek-reasoner
```

**Configuration via environment variables:**

```bash
export CONTEXTFORGE_PROVIDER=deepseek
export DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
export DEEPSEEK_MODEL=deepseek-chat         # default
```

Token usage is printed after every DeepSeek call:

```
[DeepSeek] token usage — prompt: 512, completion: 128, total: 640
```

---

### No provider (offline mode)

When no provider is set (or `--provider null` is passed), `ask` skips the LLM call and prints the raw retrieved chunks with their relevance scores. This is useful for quickly inspecting what context would be sent to a model, or for entirely air-gapped environments.

```bash
contextforge ask "authentication" --provider null
```

---

## Environment Variables

| Variable | Used by | Default | Description |
|---|---|---|---|
| `CONTEXTFORGE_PROVIDER` | `ask` | `null` | Default LLM provider (`ollama`, `deepseek`, `null`) |
| `OLLAMA_HOST` | Ollama provider | `http://localhost:11434` | Base URL of the Ollama server |
| `OLLAMA_MODEL` | Ollama provider | `llama3` | Default Ollama model |
| `DEEPSEEK_API_KEY` | DeepSeek provider | — | **Required** for DeepSeek. Get yours at platform.deepseek.com |
| `DEEPSEEK_MODEL` | DeepSeek provider | `deepseek-chat` | Default DeepSeek model |

All variables can be set in a `.env` file at the project root (load it with `dotenv` or your shell's `source` command before running ContextForge).

---

## The `.contextforge/` Directory

After `init` + `scan`, the memory layer looks like this:

```
.contextforge/
├── project-overview.md      # Auto-generated — project name, stack, deps, scripts
├── architecture.md          # Auto-generated — module-by-module export/import map
├── active-context.md        # Auto-generated — current branch, recent commits, TODOs
├── coding-rules.md          # Manual — fill in your team's style guide
├── technical-decisions.md   # Append-only ADR log (managed by `decisions`)
├── open-questions.md        # Manual — bugs, questions, areas of uncertainty
├── ai-brief.md              # Auto-generated — token-budget-aware summary for LLMs
└── local/                   # Git-ignored (machine-local state)
    └── meta.json            # File hashes baseline for incremental `update`
```

**Commit strategy:**
- Commit all files except `local/` (already excluded via `.gitignore`).
- `coding-rules.md` and `open-questions.md` are intended to be maintained by hand.
- `technical-decisions.md` accumulates entries via `contextforge decisions`.
- The auto-generated files (`project-overview.md`, `architecture.md`, `active-context.md`, `ai-brief.md`) are regenerated on every `scan`/`update` — committing them keeps a browseable history of your project's evolution.

---

## Ignore Rules

ContextForge respects a three-layer ignore system:

| Priority | Source | Notes |
|---|---|---|
| 1 (lowest) | Built-in defaults | `node_modules/`, `.git/`, `dist/`, `build/`, `coverage/`, `.contextforge/`, `.DS_Store` |
| 2 | `.gitignore` | All rules from the project's existing `.gitignore` |
| 3 (highest) | `.contextforgeignore` | ContextForge-specific exclusions (same syntax as `.gitignore`) |

Additionally, the engine **always excludes**:
- Files that do not exist or cannot be read.
- Files larger than **500 KB** (avoids processing minified bundles).
- Binary files (detected by scanning the first 1 024 bytes for null bytes — the same heuristic used by Git).

**Example `.contextforgeignore`:**

```gitignore
# Exclude test fixtures from memory generation
tests/fixtures/
*.snap

# Exclude generated proto files
src/generated/
```

---

## Running Tests

Tests are written with [Vitest](https://vitest.dev/) and cover the core modules.

```bash
# Run all tests once
npm test

# Watch mode during development
npx vitest
```

**Test files:**

| Test file | Module under test |
|---|---|
| `src/core/scanner/file-walker.test.ts` | `FileWalker` |
| `src/core/scanner/ignore-engine.test.ts` | `IgnoreEngine` |
| `src/core/scanner/summarizer.test.ts` | `Summarizer` + registry dispatch |
| `src/core/scanner/parsers/typescript.test.ts` | TypeScript/React parser |
| `src/core/scanner/parsers/python.test.ts` | Python parser |
| `src/core/scanner/parsers/vue.test.ts` | Vue SFC parser |
| `src/core/scanner/parsers/svelte.test.ts` | Svelte SFC parser |
| `src/core/scanner/parsers/php.test.ts` | PHP parser |
| `src/core/scanner/parsers/ruby.test.ts` | Ruby parser |
| `src/core/scanner/parsers/go.test.ts` | Go parser |
| `src/core/scanner/parsers/java.test.ts` | Java parser |
| `src/core/scanner/parsers/kotlin.test.ts` | Kotlin parser |
| `src/core/scanner/parsers/csharp.test.ts` | C# parser |
| `src/core/scanner/parsers/rust.test.ts` | Rust parser |
| `src/core/updater/change-detector.test.ts` | `ChangeDetector` |
| `src/core/updater/selective-update.test.ts` | `SelectiveUpdate` |
| `src/core/query/retriever.test.ts` | `retrieveContext` |
| `src/core/generators/generators.test.ts` | All generators |
| `src/providers/providers.test.ts` | All LLM providers |

---

## Development

```bash
# Install dependencies
npm install

# Build once
npm run build

# Watch mode (rebuilds on save)
npm run dev

# Lint
npx eslint .

# Format
npx prettier --write .
```

The project targets **Node.js 20** and is compiled to ESM via [tsup](https://tsup.egoist.dev/). The compiled entry point is `dist/cli/index.js`, registered as the `contextforge` binary in `package.json`.

---

## Agentic AI Workflow Integration

ContextForge is designed to integrate seamlessly into agentic AI workflows (such as Google Antigravity or other system-prompted agents) to manage context dynamically and optimize token usage.

When you run `contextforge init`, it automatically creates an agent rules file at `.agent/rules/scelta_modello.md`. In an agent-supported IDE:
1. The agent reads this rule file at the start of any task.
2. It detects the `.contextforge/` directory.
3. It runs `contextforge update` automatically to ensure the codebase context is fresh.
4. It reads the generated `.contextforge/active-context.md` and `architecture.md` files.
5. It injects this pre-compressed, structured context directly into the prompt of the chosen implementing model (Claude, Qwen, DeepSeek, etc.), avoiding raw codebase dumps and saving up to **60-80% on token overhead**.

---

## Roadmap

- [ ] **MCP Server support**: Expose ContextForge scan, update, and search capabilities as a native Model Context Protocol (MCP) server, allowing instant integration as an agent tool in Claude Desktop, Cursor, Windsurf, and other compatible clients.
- [x] **Multi-language Parser Expansion**: Regex-based structural parsers for Go, Rust, Java, Kotlin, C#, PHP, Ruby, Vue, and Svelte. Language detection (without structural parsing) for SCSS, CSS, Less, HTML, Shell, YAML, and Dockerfile.
- [ ] **Semantic Context Search**: Upgrade the keyword-frequency retriever with local vector embeddings for semantic query matching.

---

## License

MIT

