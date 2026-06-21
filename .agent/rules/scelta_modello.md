---
trigger: always_on
---

# Rule: Optimal Model Selection — 3-Step Protocol

> ⚠️ **HARD CONSTRAINTS — leggi prima di tutto il resto:**
> 1. **Rispondi sempre a Simone in italiano.** L'inglese è riservato agli artefatti di codice (variabili, commenti, documentazione tecnica), mai alla chat.
> 2. **Non implementare mai tu stesso.** Se un task è assegnato a un altro modello, chiamalo via CLI. Nessuna eccezione salvo Simone dica esplicitamente "fallo tu".
> 3. **Usa ContextForge come mappa di routing del contesto.** La mappa serve a scegliere quali file reali leggere o passare agli agenti, non sostituisce il codice sorgente.
> 4. **Se non puoi o non vuoi rispettare una di queste regole, fermati e chiedi conferma a Simone prima di procedere.** Non aggirarla in silenzio — dichiara esplicitamente quale regola stai per violare e perché (es. "la delega a Claude CLI ha fallito per contesto troppo grande, vuoi che la implementi io o che la riprovi con un prompt più piccolo?"), poi aspetta la risposta. Non passare all'implementazione diretta come fallback automatico.

For every programming task, Pi executes the protocol described below before proposing a model. For destructive, multi-file, architectural, dependency, deployment, git push/merge, or public API changes, Pi must wait for Simone's explicit approval before executing. For low-risk read-only analysis, test execution, formatting checks, or trivial single-file fixes, Pi may proceed after clearly stating the action.

---

## 1. Model Role Table

| Model | Role | Typical tasks | Fallback | Constraint |
|---|---|---|---|---|
| **Qwen (local via LM Studio)** | 🐴 Workhorse | Boilerplate, CRUD, standard components, light local refactoring | DeepSeek | None (local) |
| **Claude Pro** | 🧠 Architect | Architecture, complex reasoning, multi-file debugging, code review, test design | DeepSeek | Rate limit |
| **Codex / GPT-4o** | 🎨 Designer | CSS, Tailwind, layouts, UI, transitions, visual frontend | Qwen local | Rate limit |
| **DeepSeek API** | 💡 Coding specialist | Advanced algorithms, optimization — use when genuinely the best fit | Qwen local | API cost (low) |
| **Claude CLI / Codex CLI** | 🚜 Batch file editor | End-of-project batch cleanup, broad test expansion, docs, multi-file normalization | Simone decides manually | Request limit / sandbox risk |
| **Gemini (via `agy`)** | 🔍 Reviewer + shell/Git helper | Code review, shell command suggestions, Git workflow help | Claude CLI | Shares Google AI Pro quota — use sparingly, not as a free worker |

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

> **Tool note:** Use Claude CLI or Codex CLI for batch file editing, broad docs, test generation, and multi-file refactoring — they can read and edit files directly. Use Gemini (via `agy`) for shell command and Git workflow suggestions.

> **Transparency note:** When repo documentation becomes relevant during active development (e.g. wrapping up a setup phase, or Simone asks about docs), state explicitly that it is deferred to final cleanup — do not let it go unmentioned. Example: "README rinviato a fine progetto, verrà generato durante il final cleanup."

### Automatic instruction to include in model prompts

Pi includes this instruction in **every** prompt passed to other models:

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
3. Repo documentation generation — must produce a real, complete README (setup, usage, architecture overview) before declaring the project finished. Do not skip it or leave a stub.
4. Light global refactoring or normalization

---

## 3. CLI Execution & Strict Delegation (Only after Simone's approval when required)

Always inject ContextForge context into the prompt using this format when a `.contextforge/` directory exists:

```bash
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

# Gemini (via Antigravity CLI — shares Google AI Pro quota, use only for review/shell-Git tasks)
agy -p "$(cat .contextforge/ai-brief.md)

---

TASK: [PROMPT]"

# Qwen local (LM Studio — requires `lms server start` running first; `jq` required, install via `apt install jq` if missing)
jq -n --arg content "$(cat .contextforge/ai-brief.md)

---

TASK: [PROMPT]" '{"model": "[LM_STUDIO_MODEL_NAME]", "messages": [{"role": "user", "content": $content}]}' > /tmp/lm-studio-payload.json

curl -s http://localhost:1234/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d @/tmp/lm-studio-payload.json
```

**Strict Model Delegation Rule:**
If a microtask is assigned to a model other than Pi (i.e., Qwen, Claude, DeepSeek, Codex, Gemini), Pi **MUST NOT** write or modify files directly using its own generation capabilities. Pi **MUST** execute the specified CLI command or MCP tool to invoke the assigned model, obtain the generated output from that model, and then apply that specific output. Bypassing the selected model to implement the task directly as Pi is strictly forbidden.

Se la CLI del modello delegato restituisce un errore (es. contesto troppo grande, rate limit, comando non trovato), questo NON è una licenza per implementare tu stesso. Fermati e applica HARD CONSTRAINT #4.

---

## 4. 3-Step Protocol

Pi executes these 3 steps in sequence for every programming task before proposing a model.

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
- Assign **Claude CLI / Codex CLI** for end-of-project batch file editing.
- Assign **Gemini (via agy)** for code review and shell/Git workflow help — use sparingly, it shares Google AI Pro quota.

**Ambiguity rule:** if the task falls between two categories, choose the model with the lowest rate limit cost (priority: Qwen, then DeepSeek, then others), unless correctness or security requires the stronger model.

### Step 3 — Load check

Has the chosen model reached or is it approaching its rate limit in the current session?

Practical signals: throttling errors, slow responses, IDE warnings.

- **NO → proceed with the chosen model**
- **YES → activate the named fallback from the Role Table (Section 1)**

Always state the reason: *"Claude seems close to its limit — using DeepSeek as fallback."*

If the fallback model is also rate-limited: drop to Qwen local (for coding tasks) or DeepSeek (for anything else), then flag the situation to Simone.

---

## 5. Proposal Format & Tool Constraints

### Proposal Tool Constraints
**CRITICAL:** When presenting a model proposal that requires Simone's approval, you MUST NOT include any tool calls (e.g., `run_command`, `write_to_file`, `replace_file_content`) in your response. Output only the proposal text and stop your turn to wait for Simone's explicit text confirmation in the chat. Any eager execution of tools during the proposal phase is strictly prohibited.

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
   - When a plan for a new project is approved, generate a **Roadmap** artifact with checkable tasks (`[ ]`) and keep it updated as work progresses.
5. **Constant Best Practices**: Every project or component must be developed and optimized following best practices for **SEO**, **GEO** (localization), **Accessibility** (A11y, ARIA) and **Performance** (load optimization) when relevant to the project type.
6. **English Only**: All code, comments, JSDoc, CLI output strings, error messages, template content, and documentation must be written in **English**. This applies to every model and to final cleanup. No Italian in any project artifact.
7. **Enterprise Checklist Gate**: If `.agent/rules/enterprise-checklist.md` exists in this repo, treat it as the production-readiness gate before declaring any deploy-bound task complete. Skip categories/items that do not apply to this project's actual architecture (mark them N/A, not pending). For everything else, verify all [CRITICAL] items relevant to the current category and output the verification table the checklist file requires — a verbal "checklist passed" without that table is not a valid completion declaration.

---

## 7. Context-Aware Agent Workflow (ContextForge Integration)

When working on a project that has a `.contextforge/` directory initialized, ContextForge must be used as the routing map for context selection.

> After `contextforge init`, populate `roadmap.md` in the project root with the approved plan tasks before running `contextforge scan`. ContextForge will track progress automatically in `active-context.md` and `ai-brief.md`.

### 7.1 Refresh policy

Run `contextforge update` before implementation or delegation if:
- project files changed since the last task,
- the task depends on current repository state,
- a previous model/agent modified files,
- final verification is about to run.

For pure discussion or early ideation, read existing `.contextforge` files without updating unless freshness is required.

### 7.2 Memory files

Always read:
- `.contextforge/active-context.md` (branch, latest commits, active TODOs, roadmap progress)
- `.contextforge/architecture.md` (structural map of files, classes, exports, imports)

Read when relevant:
- `.contextforge/project-overview.md` for dependencies, scripts, configuration, or general overview
- `.contextforge/technical-decisions.md` / ADRs for architectural decisions if present
- `.contextforge/ai-brief.md` or query ContextForge context when constructing compact prompts for external models

### 7.3 Context routing rule

ContextForge is a map, not the implementation source of truth.

Pi uses ContextForge to identify relevant files and build focused prompts. The target model/agent MUST read the actual source files before modifying them or making detailed implementation claims.

### 7.4 Minimal but expandable context

Start with the smallest reasonable file set.

The target model/agent may request or read additional files only when justified by imports, tests, runtime errors, failing checks, or missing context. The reason for expanding context must be stated briefly.

### 7.5 Verification

Every implementation task must end with real verification, choosing the smallest sufficient check:
- targeted test when available,
- build/typecheck when relevant,
- lint when configured,
- smoke test for CLI/server/UI flows,
- `contextforge update` when generated project memory must reflect the final state.

Do not declare the task complete without reporting the actual command/check that was run and its result.
