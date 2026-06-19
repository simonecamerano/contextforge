import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execSync } from 'node:child_process';
import { Command } from 'commander';
import { runScan } from './scan.js';

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

const DEFAULT_SCELTA_MODELLO_TEMPLATE = `---
trigger: always_on
---

# Rule: Optimal Model Selection — 3-Step Protocol

> ⚠️ **HARD CONSTRAINTS — leggi prima di tutto il resto:**
> 1. **Rispondi sempre a Simone in italiano.** L'inglese è riservato agli artefatti di codice (variabili, commenti, documentazione tecnica), mai alla chat.
> 2. **Non implementare mai tu stesso.** Se un task è assegnato a un altro modello, chiamalo via CLI. Nessuna eccezione salvo Simone dica esplicitamente "fallo tu".
> 3. **Usa ContextForge come mappa di routing del contesto.** La mappa serve a scegliere quali file reali leggere o passare agli agenti, non sostituisce il codice sorgente.

For every programming task, Gemini executes the protocol described below before proposing a model. For destructive, multi-file, architectural, dependency, deployment, git push/merge, or public API changes, Gemini must wait for Simone's explicit approval before executing. For low-risk read-only analysis, test execution, formatting checks, or trivial single-file fixes, Gemini may proceed after clearly stating the action.

---

## 1. Model Role Table

| Model | Role | Typical tasks | Fallback | Constraint |
|---|---|---|---|---|
| **Qwen (local)** | 🐴 Workhorse | Boilerplate, CRUD, standard components, light local refactoring | DeepSeek | None (local) |
| **Claude Pro** | 🧠 Architect | Architecture, complex reasoning, multi-file debugging, code review, test design | Gemini Pro High | Rate limit |
| **Gemini Pro High** | 🔭 Wide-context analyst | Full repo analysis, planning, roadmaps, long-context tasks | Claude | Rate limit |
| **Gemini Flash** | ⚡ Sprinter | Simple tasks, quick answers, short docs, minor refactoring | Qwen local | Rate limit (higher) |
| **Codex / GPT-4o** | 🎨 Designer | CSS, Tailwind, layouts, UI, transitions, visual frontend | Gemini Flash | Rate limit |
| **DeepSeek API** | 💡 Coding specialist | Advanced algorithms, optimization — use when genuinely the best fit | Qwen local | API cost (low) |
| **Claude CLI / Codex CLI** | 🚜 Batch file editor | End-of-project batch cleanup, broad test expansion, docs, multi-file normalization, shell/Git workflow help | Simone decides manually | Request limit / sandbox risk |

---

## 2. End-of-Project Batch Cleanup Rule

These categories should usually be postponed until Simone explicitly says the project is ready for final cleanup. Do not spend specialist model calls on broad cleanup during active development unless the current task specifically requires it.

### Tasks usually reserved for final cleanup

| Category | Examples | Allowed exception |
|---|---|---|
| Routine comments & docstrings | JSDoc, docstrings, explanatory comments for obvious code | Critical comments explaining non-obvious logic in the current task |
| Broad test coverage expansion | Full unit/integration test suites across modules | Minimal task-specific tests needed to verify the current behavior, bug fix, or public API change |
| Repo documentation | README, CHANGELOG, wiki, docs/ folder | Documentation required for the current deliverable or user-facing behavior change |
| Global normalization | Multi-file style cleanup, global string replacement, light refactoring | A focused refactor required to safely complete the current task |

> **Tool note:** Use Claude CLI or Codex CLI for batch file editing, broad docs, test generation, multi-file refactoring, and shell/Git workflow suggestions — they can read and edit files directly.

### Automatic instruction to include in model prompts

Gemini includes this instruction in **every** prompt passed to other models:

> When generating code for this task:
> - Do NOT add routine comments or docstrings.
> - Do NOT create broad test suites unless explicitly requested.
> - DO add or update minimal task-specific tests when needed to verify behavior, bug fixes, or public API changes.
> - Full coverage expansion, routine docstrings, and repository documentation are handled at project completion.
> - Generate only the working code required by the task.
> - **Language rule: all code, comments, CLI output strings, error messages, and documentation must be written in English. No Italian.**

### Activating final cleanup

Final cleanup activates **only on Simone's explicit trigger** ("project done, let's run final cleanup"), in this order:
1. Broad test coverage expansion
2. Critical docstrings and comments
3. Repo documentation generation
4. Light global refactoring or normalization

---

## 3. CLI Execution & Strict Delegation (Only after Simone's approval when required)

Always inject ContextForge context into the prompt using this format when a \`.contextforge/\` directory exists:

\`\`\`bash
# Claude
claude -p "$(cat .contextforge/ai-brief.md)

---

TASK: [PROMPT]"

# Claude (batch file editing — multi-file refactoring, global replacement)
claude --dangerously-skip-permissions -p "$(cat .contextforge/ai-brief.md)

---

TASK: [PROMPT]"

# Codex
codex exec --dangerously-bypass-approvals-and-sandbox "$(cat .contextforge/ai-brief.md)

---

TASK: [PROMPT]"

# DeepSeek
source venv/bin/activate && python3 ds.py "$(cat .contextforge/ai-brief.md)

---

TASK: [PROMPT]"
\`\`\`

- **Qwen local**: run directly from Antigravity IDE (local Ollama) — paste \`ai-brief.md\` content manually in the context field
- **Gemini**: run directly from Antigravity IDE

**Strict Model Delegation Rule:**
If a microtask is assigned to a model other than Gemini (i.e., Qwen, Claude, DeepSeek, Codex), Gemini **MUST NOT** write or modify files directly using its own generation capabilities. Gemini **MUST** execute the specified CLI command or MCP tool to invoke the assigned model, obtain the generated output from that model, and then apply that specific output. Bypassing the selected model to implement the task directly as Gemini is strictly forbidden.

---

## 4. 3-Step Protocol

Gemini executes these 3 steps in sequence for every programming task before proposing a model.

### Step 1 — Decompose

**First — final-cleanup check:** remove from the task any broad final-cleanup parts (routine comments, docstrings, broad test suites, repo docs, global refactoring) unless Simone explicitly requested them now. Keep minimal task-specific tests and verification inside the active task.

**Mandatory Deconstruct Rule:**
Does the remaining task have distinct components (e.g., UI/CSS styling vs. application logic vs. boilerplate)?
- **YES / MIXED → You MUST split it into microtasks.** Grouping different components (e.g., writing React hooks AND styling the CSS/layout) under a single model is strictly forbidden.
- **NO → atomic task**, proceed to Step 2 as a single task. If you decide the task is atomic but it involves multiple areas (like logic and visual design), you MUST explicitly justify why it cannot be decomposed.

Natural decomposition examples:
- Boilerplate + complex logic → Qwen + Claude
- Implementation + task-specific tests → Qwen + Claude/DeepSeek
- Backend code + UI/CSS → Qwen/Claude + Codex
- Architecture + implementation → Claude + Qwen

### Step 2 — Assign roles

For each microtask (or the single task), apply the role table in Section 1.

**Strict specialized routing:**
- Assign **Qwen (local)** ONLY for boilerplate, simple CRUD, standard components, or light local refactoring.
- Assign **Claude Pro** or **DeepSeek** for complex logic, algorithms, state management, or multi-file debugging.
- Assign **Codex / GPT-4o** for CSS, Tailwind, layouts, transitions, or visual frontend styling.
- Assign **Claude CLI / Codex CLI** for end-of-project batch file editing and shell/Git workflow suggestions.

**Ambiguity rule:** if the task falls between two categories, choose the model with the lowest rate limit cost (priority: Qwen, then Gemini Flash, then others), unless correctness or security requires the stronger model.

### Step 3 — Load check

Has the chosen model reached or is it approaching its rate limit in the current session?

Practical signals: throttling errors, slow responses, IDE warnings.

- **NO → proceed with the chosen model**
- **YES → activate the named fallback from the Role Table (Section 1)**

Always state the reason: *"Claude seems close to its limit — using Gemini Pro High as fallback."*

If the fallback model is also rate-limited: drop to Qwen local (for coding tasks) or Gemini Flash (for anything else), then flag the situation to Simone.

---

## 5. Proposal Format & Tool Constraints

### Proposal Tool Constraints
**CRITICAL:** When presenting a model proposal that requires Simone's approval, you MUST NOT include any tool calls (e.g., \`run_command\`, \`write_to_file\`, \`replace_file_content\`) in your response. Output only the proposal text and stop your turn to wait for Simone's explicit text confirmation in the chat. Any eager execution of tools during the proposal phase is strictly prohibited.

### Proposal Text Format
The suggestion goes at the start of the response and ends with a confirmation request:

> 💡 **Task:** [task name]
> **Decomposition:** [yes → microtask A → Qwen / microtask B → Claude | no — single task]
> **Model:** [model name]
> **Reason:** [why this model for this specific task]
> Shall I proceed?

For tasks decomposed into microtasks, use this extended format:

> 💡 **Task:** [task name]
> **Decomposition:** yes
> **Microtask A:** [description] → **Model:** [name] · **Reason:** [why]
> **Microtask B:** [description] → **Model:** [name] · **Reason:** [why]
> Shall I proceed with the first microtask (Microtask A)?

---

## 6. General Development Rules

1. **Code Comments**: During active development, skip routine comments and docstrings. Add comments only when they explain critical non-obvious logic or an architectural decision in the current task context.
2. **Task-Specific Tests**: Minimal task-specific tests are allowed and encouraged when they verify the current behavior, bug fix, edge case, or public API change. Broad coverage expansion is a final-cleanup activity.
3. **Post-task QA**: At the end of every implementation task, run a thorough check on the diff and written code. Where possible, verify the implementation actually works (e.g., targeted tests, build/typecheck, browser smoke test, CLI smoke test, checking for console errors).
4. **Planning, Tests and Roadmap (New Projects)**:
   - Every new project must include sufficient test coverage, planned from the start.
   - When a plan for a new project is approved, generate a **Roadmap** artifact with checkable tasks (\`[ ]\`) and keep it updated as work progresses.
5. **Constant Best Practices**: Every project or component must be developed and optimized following best practices for **SEO**, **GEO** (localization), **Accessibility** (A11y, ARIA) and **Performance** (load optimization) when relevant to the project type.
6. **English Only**: All code, comments, JSDoc, CLI output strings, error messages, template content, and documentation must be written in **English**. This applies to every model and to final cleanup. No Italian in any project artifact.

---

## 7. Context-Aware Agent Workflow (ContextForge Integration)

When working on a project that has a \`.contextforge/\` directory initialized, ContextForge must be used as the routing map for context selection.

> After \`contextforge init\`, populate \`roadmap.md\` in the project root with the approved plan tasks before running \`contextforge scan\`. ContextForge will track progress automatically in \`active-context.md\` and \`ai-brief.md\`.

### 7.1 Refresh policy

Run \`contextforge update\` before implementation or delegation if:
- project files changed since the last task,
- the task depends on current repository state,
- a previous model/agent modified files,
- final verification is about to run.

For pure discussion or early ideation, read existing \`.contextforge\` files without updating unless freshness is required.

### 7.2 Memory files

Always read:
- \`.contextforge/active-context.md\` (branch, latest commits, active TODOs, roadmap progress)
- \`.contextforge/architecture.md\` (structural map of files, classes, exports, imports)

Read when relevant:
- \`.contextforge/project-overview.md\` for dependencies, scripts, configuration, or general overview
- \`.contextforge/technical-decisions.md\` / ADRs for architectural decisions if present
- \`.contextforge/ai-brief.md\` or query ContextForge context when constructing compact prompts for external models

### 7.3 Context routing rule

ContextForge is a map, not the implementation source of truth.

Gemini uses ContextForge to identify relevant files and build focused prompts. The target model/agent MUST read the actual source files before modifying them or making detailed implementation claims.

### 7.4 Minimal but expandable context

Start with the smallest reasonable file set.

The target model/agent may request or read additional files only when justified by imports, tests, runtime errors, failing checks, or missing context. The reason for expanding context must be stated briefly.

### 7.5 Verification

Every implementation task must end with real verification, choosing the smallest sufficient check:
- targeted test when available,
- build/typecheck when relevant,
- lint when configured,
- smoke test for CLI/server/UI flows,
- \`contextforge update\` when generated project memory must reflect the final state.

Do not declare the task complete without reporting the actual command/check that was run and its result.
`;

const DEFAULT_AGENTS_TEMPLATE = `# Agent Instructions

This repository uses ContextForge for agentic development.

## Mandatory startup protocol

Before planning, editing, or delegating work in this repository:

1. Read \`.agent/rules/scelta_modello.md\`.
2. Read \`.contextforge/active-context.md\`.
3. Read \`.contextforge/architecture.md\`.
4. Use \`.contextforge/project-overview.md\` when dependencies, scripts, or configuration matter.
5. Use \`.contextforge/ai-brief.md\` when constructing compact prompts for external models.

## ContextForge rule

ContextForge is a routing map, not the implementation source of truth.

Use it to identify relevant files, then read the actual source files before making implementation claims or changes.

## Verification rule

Do not declare implementation tasks complete without real verification:
- targeted tests when available,
- build/typecheck when relevant,
- smoke test for CLI/server/UI flows.
`;

interface InitOptions {
  provider?: string;
  model?: string;
  ollamaHost?: string;
  deepseekApiKey?: string;
  yes?: boolean;
}

const VALID_PROVIDERS = new Set(['deepseek', 'ollama', 'null']);

function normalizeProvider(provider?: string): string | undefined {
  if (!provider) return undefined;
  const normalized = provider.toLowerCase();
  if (!VALID_PROVIDERS.has(normalized)) {
    throw new Error(`Invalid provider "${provider}". Use one of: deepseek, ollama, null.`);
  }
  return normalized;
}

function writeProviderEnv(envPath: string, provider: string, options: InitOptions): void {
  switch (provider) {
    case 'deepseek': {
      const apiKey = options.deepseekApiKey ?? process.env['DEEPSEEK_API_KEY'] ?? '';
      const model = options.model ?? 'deepseek-chat';
      fs.writeFileSync(envPath, `CONTEXTFORGE_PROVIDER=deepseek\nDEEPSEEK_API_KEY=${apiKey}\nDEEPSEEK_MODEL=${model}\n`, 'utf8');
      console.log('LLM Provider configured: DeepSeek.');
      if (!apiKey) {
        console.warn('Warning: DeepSeek provider selected but no API key was provided. Set DEEPSEEK_API_KEY before using it.');
      }
      break;
    }
    case 'ollama': {
      const host = options.ollamaHost ?? 'http://localhost:11434';
      const model = options.model ?? 'llama3';
      fs.writeFileSync(envPath, `CONTEXTFORGE_PROVIDER=ollama\nOLLAMA_HOST=${host}\nOLLAMA_MODEL=${model}\n`, 'utf8');
      console.log('LLM Provider configured: Ollama.');
      break;
    }
    case 'null':
    default:
      fs.writeFileSync(envPath, `CONTEXTFORGE_PROVIDER=null\n`, 'utf8');
      console.log('LLM Provider configured: Offline.');
  }
}

export function registerInitCommand(program: Command) {
  program
    .command('init')
    .description('Initialize ContextForge in the current repository')
    .option('-p, --provider <name>', 'LLM provider (deepseek, ollama, null)')
    .option('-m, --model <name>', 'Default model for the selected provider')
    .option('--ollama-host <url>', 'Ollama server URL', 'http://localhost:11434')
    .option('--deepseek-api-key <key>', 'DeepSeek API key for non-interactive setup')
    .option('-y, --yes', 'Use Offline provider without prompting when no provider is specified')
    .action(async (options: InitOptions) => {
      const cwd = process.cwd();
      const contextForgeDir = path.join(cwd, '.contextforge');
      const localDir = path.join(contextForgeDir, 'local');
      
      // 1. Auto Git Init if not present
      const gitDir = path.join(cwd, '.git');
      if (!fs.existsSync(gitDir)) {
        try {
          console.log('Initializing local git repository...');
          execSync('git init', { stdio: 'ignore' });
          console.log('Git repository initialized.');
        } catch {
          console.warn('Warning: Could not initialize Git repository automatically. Make sure Git is installed.');
        }
      }

      if (fs.existsSync(contextForgeDir)) {
        console.warn('Warning: The .contextforge folder already exists in this repository.');
        return;
      }

      const envPath = path.join(cwd, '.env');
      if (!fs.existsSync(envPath)) {
        try {
          const providerFromOptions = normalizeProvider(options.provider);
          if (providerFromOptions) {
            writeProviderEnv(envPath, providerFromOptions, options);
          } else if (options.yes) {
            writeProviderEnv(envPath, 'null', options);
          } else {
            const providerChoice = await ask(
              `\nWhich LLM provider do you want to use for this project?\n  1) DeepSeek (Cloud API)\n  2) Ollama (Local)\n  3) Offline (none)\nEnter choice [1/2/3]: `
            );

            switch (providerChoice.trim()) {
              case '1': {
                const apiKey = await ask('Enter your DeepSeek API key: ');
                writeProviderEnv(envPath, 'deepseek', { ...options, deepseekApiKey: apiKey });
                break;
              }
              case '2':
                writeProviderEnv(envPath, 'ollama', options);
                break;
              case '3':
                writeProviderEnv(envPath, 'null', options);
                break;
              default:
                console.log('Invalid choice. Defaulting to Offline.');
                writeProviderEnv(envPath, 'null', options);
            }
          }
        } catch (error) {
          console.error(error instanceof Error ? error.message : error);
          process.exit(1);
        }
      } else {
        console.log('Skipping .env creation — file already exists.');
      }

      try {
        fs.mkdirSync(contextForgeDir, { recursive: true });
        fs.mkdirSync(localDir, { recursive: true });
        console.log('Created .contextforge/ and .contextforge/local/ directories');

        const markdownFiles = {
          'project-overview.md': '# Project Overview\n\nGeneral overview of the project, description and technologies.',
          'architecture.md': '# Architecture\n\nModule structure and main architectural decisions.',
          'active-context.md': '# Active Context\n\nCurrent work state, active branch and extracted TODOs.',
          'coding-rules.md': '# Coding Rules\n\nGuidelines for writing code and project style conventions.',
          'technical-decisions.md': '# Technical Decisions\n\nHistorical record of architectural decisions (ADR).',
          'open-questions.md': '# Open Questions\n\nOpen questions, tracked bugs and points to clarify.',
          'ai-brief.md': '# AI Brief\n\nSummarized brief optimized for LLM context.'
        };

        for (const [filename, content] of Object.entries(markdownFiles)) {
          const filePath = path.join(contextForgeDir, filename);
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`Created memory file: .contextforge/${filename}`);
        }

        const gitignorePath = path.join(cwd, '.gitignore');
        const ignoreLine = '.contextforge/local/';

        if (fs.existsSync(gitignorePath)) {
          const content = fs.readFileSync(gitignorePath, 'utf8');
          if (!content.includes(ignoreLine)) {
            const separator = content.endsWith('\n') ? '' : '\n';
            fs.writeFileSync(gitignorePath, `${content}${separator}${ignoreLine}\n`, 'utf8');
            console.log('Updated .gitignore with ContextForge local directory.');
          }
        } else {
          fs.writeFileSync(gitignorePath, `${ignoreLine}\n`, 'utf8');
          console.log('Created .gitignore with ContextForge local directory.');
        }

        // 2. Auto-scaffold root AGENTS.md bootstrap and .agent/rules/scelta_modello.md
        const agentsPath = path.join(cwd, 'AGENTS.md');
        if (!fs.existsSync(agentsPath)) {
          fs.writeFileSync(agentsPath, DEFAULT_AGENTS_TEMPLATE, 'utf8');
          console.log('Created agent bootstrap: AGENTS.md');
        }

        const agentDir = path.join(cwd, '.agent');
        const rulesDir = path.join(agentDir, 'rules');
        const sceltaModelloPath = path.join(rulesDir, 'scelta_modello.md');

        if (!fs.existsSync(sceltaModelloPath)) {
          fs.mkdirSync(rulesDir, { recursive: true });
          fs.writeFileSync(sceltaModelloPath, DEFAULT_SCELTA_MODELLO_TEMPLATE, 'utf8');
          console.log('Created agent rules: .agent/rules/scelta_modello.md');
        }

        const roadmapPath = path.join(cwd, 'roadmap.md');
        if (!fs.existsSync(roadmapPath)) {
          const roadmapTemplate = [
            '# Roadmap',
            '',
            '> Fill in your planned tasks below using `- [ ] task` for open and `- [x] task` for completed.',
            '> Group tasks under `##` phase headings. ContextForge tracks progress automatically in active-context.md.',
            '',
            '## Phase 1 — Setup',
            '- [ ] ',
            '',
            '## Phase 2 — Core Features',
            '- [ ] ',
            '',
            '## Phase 3 — Polish',
            '- [ ] ',
            '',
          ].join('\n');
          fs.writeFileSync(roadmapPath, roadmapTemplate, 'utf8');
          console.log('Created roadmap.md template in project root.');
        }

        console.log('\nInitialization complete! ContextForge is ready.');

        // 3. Auto-Scan
        console.log('\nRunning initial codebase scan...');
        await runScan(cwd);

      } catch (error) {
        console.error('Error during initialization:', error);
        process.exit(1);
      }
    });
}
