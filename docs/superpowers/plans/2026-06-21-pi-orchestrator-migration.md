# Pi Orchestrator Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the orchestrator actor in ContextForge's generated rule files from "Gemini" to "Pi", narrow Gemini's role to reviewer + shell/Git helper invoked via Antigravity CLI (`agy`), switch Qwen's local invocation from Ollama/Antigravity-IDE to a scripted LM Studio HTTP call, and propagate all of this to every location these files currently live.

**Architecture:** Two template constants in `src/cli/commands/init.ts` (`DEFAULT_SCELTA_MODELLO_TEMPLATE`, `DEFAULT_AGENTS_TEMPLATE`) are edited directly — this is plain text-template maintenance, no new code paths or data structures. After the templates are correct and tested, the same content is copied verbatim (via a `sed`-based extraction, already verified working) into the global and ContextForge's own already-deployed copies of these files, plus one brand-new file for Pi's global config.

**Tech Stack:** TypeScript, Commander.js, Vitest (default pool works fine on this project's vitest v4.1.8 — no `--pool=forks` needed).

## Global Constraints

- Every reference to "Gemini" as the acting orchestrator becomes "Pi" — but "Gemini" as a worker name (e.g. the Model Role Table row, the `agy` invocation comment) stays "Gemini".
- "Gemini Pro High" and "Gemini Flash" are removed everywhere as standalone role-table entries; any other place that names them as a fallback/priority option is updated to name a still-existing entry instead (DeepSeek, in every case found).
- Gemini's new role is exactly: code review + shell/Git workflow help. Nothing else. It must be described as sharing Google AI Pro quota and used sparingly, not as a free worker — this exact framing must appear wherever Gemini is assigned a task.
- "Shell/Git workflow suggestions" is removed from Claude CLI/Codex CLI's scope in every place it appears, and reassigned to Gemini.
- Qwen's local backend changes from Ollama/manual-paste-into-Antigravity to a scripted LM Studio REST call (`http://localhost:1234/v1/chat/completions`, server started via `lms server start`). The JSON payload is built with `jq -n --arg` and written to a temp file, then sent via `curl --data @file` — never raw string interpolation into the `-d` flag (verified empirically: this exact `jq` pattern handles embedded quotes and multi-line content correctly).
- `AGENTS.md`'s Hard Constraints block is written in **English** (matching the rest of `AGENTS.md`'s existing content), even though `scelta_modello.md`'s HARD CONSTRAINTS block is in Italian — these are two different files with two different established languages; this is intentional, not an inconsistency to fix.

---

### Task 1: Rewrite `DEFAULT_SCELTA_MODELLO_TEMPLATE`

**Files:**
- Modify: `src/cli/commands/init.ts` (the `DEFAULT_SCELTA_MODELLO_TEMPLATE` constant, currently lines 18-264)
- Test: `src/cli/commands/init.test.ts` (the first `it(...)` block, currently lines 45-64)

**Interfaces:**
- No new exports or function signatures — this task only changes the string content of the existing module-local `DEFAULT_SCELTA_MODELLO_TEMPLATE` constant. Task 3 reads this constant's *resulting* text via a shell extraction; it does not depend on any in-code interface from this task.

- [ ] **Step 1: Write the failing test assertions**

In `src/cli/commands/init.test.ts`, inside the first `it(...)` block (`'generates agent model-selection rules with ContextForge routing and task-specific verification guidance'`), add these lines after the existing `expect(content).toContain('output the verification table the checklist file requires');` line and before the closing `});`:

```ts
    expect(content).toContain('Pi executes the protocol described below');
    expect(content).toContain('Gemini (via `agy`)');
    expect(content).not.toContain('Gemini Pro High');
    expect(content).not.toContain('Gemini Flash');
    expect(content).toContain('agy -p "$(cat .contextforge/ai-brief.md)');
    expect(content).toContain('lm-studio-payload.json');
    expect(content).toContain('Qwen, Claude, DeepSeek, Codex, Gemini');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/cli/commands/init.test.ts`

Expected: FAIL — the new assertions reference text (`'Pi executes the protocol described below'`, `'Gemini (via \`agy\`)'`, `'agy -p "$(cat .contextforge/ai-brief.md)'`, `'lm-studio-payload.json'`, `'Qwen, Claude, DeepSeek, Codex, Gemini'`) that does not exist yet in the template, and the `.not.toContain` assertions for `'Gemini Pro High'`/`'Gemini Flash'` currently fail because those strings ARE still present.

- [ ] **Step 3: Apply the template edits**

In `src/cli/commands/init.ts`, apply these 12 edits to `DEFAULT_SCELTA_MODELLO_TEMPLATE`, in order:

**3a.** Replace the orchestrator-actor paragraph right after the HARD CONSTRAINTS block:

Find:
```
For every programming task, Gemini executes the protocol described below before proposing a model. For destructive, multi-file, architectural, dependency, deployment, git push/merge, or public API changes, Gemini must wait for Simone's explicit approval before executing. For low-risk read-only analysis, test execution, formatting checks, or trivial single-file fixes, Gemini may proceed after clearly stating the action.
```

Replace with:
```
For every programming task, Pi executes the protocol described below before proposing a model. For destructive, multi-file, architectural, dependency, deployment, git push/merge, or public API changes, Pi must wait for Simone's explicit approval before executing. For low-risk read-only analysis, test execution, formatting checks, or trivial single-file fixes, Pi may proceed after clearly stating the action.
```

**3b.** Replace the entire Model Role Table:

Find:
```
| Model | Role | Typical tasks | Fallback | Constraint |
|---|---|---|---|---|
| **Qwen (local)** | 🐴 Workhorse | Boilerplate, CRUD, standard components, light local refactoring | DeepSeek | None (local) |
| **Claude Pro** | 🧠 Architect | Architecture, complex reasoning, multi-file debugging, code review, test design | Gemini Pro High | Rate limit |
| **Gemini Pro High** | 🔭 Wide-context analyst | Full repo analysis, planning, roadmaps, long-context tasks | Claude | Rate limit |
| **Gemini Flash** | ⚡ Sprinter | Simple tasks, quick answers, short docs, minor refactoring | Qwen local | Rate limit (higher) |
| **Codex / GPT-4o** | 🎨 Designer | CSS, Tailwind, layouts, UI, transitions, visual frontend | Gemini Flash | Rate limit |
| **DeepSeek API** | 💡 Coding specialist | Advanced algorithms, optimization — use when genuinely the best fit | Qwen local | API cost (low) |
| **Claude CLI / Codex CLI** | 🚜 Batch file editor | End-of-project batch cleanup, broad test expansion, docs, multi-file normalization, shell/Git workflow help | Simone decides manually | Request limit / sandbox risk |
```

Replace with:
```
| Model | Role | Typical tasks | Fallback | Constraint |
|---|---|---|---|---|
| **Qwen (local via LM Studio)** | 🐴 Workhorse | Boilerplate, CRUD, standard components, light local refactoring | DeepSeek | None (local) |
| **Claude Pro** | 🧠 Architect | Architecture, complex reasoning, multi-file debugging, code review, test design | DeepSeek | Rate limit |
| **Codex / GPT-4o** | 🎨 Designer | CSS, Tailwind, layouts, UI, transitions, visual frontend | Qwen local | Rate limit |
| **DeepSeek API** | 💡 Coding specialist | Advanced algorithms, optimization — use when genuinely the best fit | Qwen local | API cost (low) |
| **Claude CLI / Codex CLI** | 🚜 Batch file editor | End-of-project batch cleanup, broad test expansion, docs, multi-file normalization | Simone decides manually | Request limit / sandbox risk |
| **Gemini (via \`agy\`)** | 🔍 Reviewer + shell/Git helper | Code review, shell command suggestions, Git workflow help | Claude CLI | Shares Google AI Pro quota — use sparingly, not as a free worker |
```

**3c.** Replace the tool note:

Find:
```
> **Tool note:** Use Claude CLI or Codex CLI for batch file editing, broad docs, test generation, multi-file refactoring, and shell/Git workflow suggestions — they can read and edit files directly.
```

Replace with:
```
> **Tool note:** Use Claude CLI or Codex CLI for batch file editing, broad docs, test generation, and multi-file refactoring — they can read and edit files directly. Use Gemini (via \`agy\`) for shell command and Git workflow suggestions.
```

**3d.** Replace the per-model-prompt instruction intro:

Find:
```
Gemini includes this instruction in **every** prompt passed to other models:
```

Replace with:
```
Pi includes this instruction in **every** prompt passed to other models:
```

**3e.** Replace the entire CLI bash block plus the two IDE-invocation bullets that follow it:

Find:
```
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
```

Replace with:
```
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

# Gemini (via Antigravity CLI — shares Google AI Pro quota, use only for review/shell-Git tasks)
agy -p "$(cat .contextforge/ai-brief.md)

---

TASK: [PROMPT]"

# Qwen local (LM Studio — requires \`lms server start\` running first; \`jq\` required, install via \`apt install jq\` if missing)
jq -n --arg content "$(cat .contextforge/ai-brief.md)

---

TASK: [PROMPT]" '{"model": "[LM_STUDIO_MODEL_NAME]", "messages": [{"role": "user", "content": $content}]}' > /tmp/lm-studio-payload.json

curl -s http://localhost:1234/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d @/tmp/lm-studio-payload.json
\`\`\`
```

**3f.** Replace the Strict Model Delegation Rule:

Find:
```
**Strict Model Delegation Rule:**
If a microtask is assigned to a model other than Gemini (i.e., Qwen, Claude, DeepSeek, Codex), Gemini **MUST NOT** write or modify files directly using its own generation capabilities. Gemini **MUST** execute the specified CLI command or MCP tool to invoke the assigned model, obtain the generated output from that model, and then apply that specific output. Bypassing the selected model to implement the task directly as Gemini is strictly forbidden.
```

Replace with:
```
**Strict Model Delegation Rule:**
If a microtask is assigned to a model other than Pi (i.e., Qwen, Claude, DeepSeek, Codex, Gemini), Pi **MUST NOT** write or modify files directly using its own generation capabilities. Pi **MUST** execute the specified CLI command or MCP tool to invoke the assigned model, obtain the generated output from that model, and then apply that specific output. Bypassing the selected model to implement the task directly as Pi is strictly forbidden.
```

**3g.** Replace the 3-Step Protocol intro:

Find:
```
Gemini executes these 3 steps in sequence for every programming task before proposing a model.
```

Replace with:
```
Pi executes these 3 steps in sequence for every programming task before proposing a model.
```

**3h.** Replace the "Strict specialized routing" bullet list:

Find:
```
- Assign **Claude CLI / Codex CLI** for end-of-project batch file editing and shell/Git workflow suggestions.
```

Replace with:
```
- Assign **Claude CLI / Codex CLI** for end-of-project batch file editing.
- Assign **Gemini (via agy)** for code review and shell/Git workflow help — use sparingly, it shares Google AI Pro quota.
```

**3i.** Replace the Ambiguity rule's dangling reference to the now-removed Gemini Flash entry:

Find:
```
**Ambiguity rule:** if the task falls between two categories, choose the model with the lowest rate limit cost (priority: Qwen, then Gemini Flash, then others), unless correctness or security requires the stronger model.
```

Replace with:
```
**Ambiguity rule:** if the task falls between two categories, choose the model with the lowest rate limit cost (priority: Qwen, then DeepSeek, then others), unless correctness or security requires the stronger model.
```

**3j.** Replace the example fallback-reasoning quote, which named the now-removed Gemini Pro High entry:

Find:
```
Always state the reason: *"Claude seems close to its limit — using Gemini Pro High as fallback."*
```

Replace with:
```
Always state the reason: *"Claude seems close to its limit — using DeepSeek as fallback."*
```

**3k.** Replace Step 3's final fallback line, which named the now-removed Gemini Flash entry:

Find:
```
If the fallback model is also rate-limited: drop to Qwen local (for coding tasks) or Gemini Flash (for anything else), then flag the situation to Simone.
```

Replace with:
```
If the fallback model is also rate-limited: drop to Qwen local (for coding tasks) or DeepSeek (for anything else), then flag the situation to Simone.
```

**3l.** Replace the Context routing rule's actor reference:

Find:
```
Gemini uses ContextForge to identify relevant files and build focused prompts. The target model/agent MUST read the actual source files before modifying them or making detailed implementation claims.
```

Replace with:
```
Pi uses ContextForge to identify relevant files and build focused prompts. The target model/agent MUST read the actual source files before modifying them or making detailed implementation claims.
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/cli/commands/init.test.ts`

Expected: PASS — all tests in the file green (this is the first task touching this file in this plan, so the count is the current file's existing 8 tests, all passing).

- [ ] **Step 5: Commit**

```bash
git add src/cli/commands/init.ts src/cli/commands/init.test.ts
git commit -m "feat: rename orchestrator from Gemini to Pi, narrow Gemini to reviewer role"
```

---

### Task 2: Add Hard Constraints block to `DEFAULT_AGENTS_TEMPLATE`

**Files:**
- Modify: `src/cli/commands/init.ts` (the `DEFAULT_AGENTS_TEMPLATE` constant)
- Test: `src/cli/commands/init.test.ts` (the second `it(...)` block)

**Interfaces:**
- No interface changes — same as Task 1, pure string-content edit. Independent of Task 1: this touches a different constant and a different test.

- [ ] **Step 1: Write the failing test assertions**

In `src/cli/commands/init.test.ts`, inside the second `it(...)` block (`'generates a root AGENTS.md bootstrap that points agents to ContextForge and model-selection rules'`), add these lines after the existing `expect(content).toContain('Do not declare implementation tasks complete without real verification');` line and before the closing `});`:

```ts
    expect(content).toContain('## Hard Constraints');
    expect(content).toContain('Never implement directly.');
    expect(content).toContain('If you cannot or will not follow one of these rules, stop and ask Simone for confirmation');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/cli/commands/init.test.ts`

Expected: FAIL on the three new assertions — `DEFAULT_AGENTS_TEMPLATE` does not contain a "Hard Constraints" section yet.

- [ ] **Step 3: Add the Hard Constraints block**

In `src/cli/commands/init.ts`, inside `DEFAULT_AGENTS_TEMPLATE`, find:

```
5. Use \`.contextforge/ai-brief.md\` when constructing compact prompts for external models.

## ContextForge rule
```

Replace with:

```
5. Use \`.contextforge/ai-brief.md\` when constructing compact prompts for external models.

## Hard Constraints

1. **Always respond to Simone in Italian.** English is reserved for code artifacts (variables, comments, technical documentation), never for chat.
2. **Never implement directly.** If a task is assigned to another model, call it via CLI. No exception unless Simone explicitly says "do it yourself."
3. **Use ContextForge as the context routing map.** It selects which real files to read or pass to agents — it does not replace the source code.
4. **If you cannot or will not follow one of these rules, stop and ask Simone for confirmation before proceeding.** Do not work around it silently — state explicitly which rule you are about to violate and why, then wait for a response. Do not fall back to implementing directly.

## ContextForge rule
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/cli/commands/init.test.ts`

Expected: PASS — all tests in the file green.

- [ ] **Step 5: Commit**

```bash
git add src/cli/commands/init.ts src/cli/commands/init.test.ts
git commit -m "feat: add Hard Constraints safety net to AGENTS.md template"
```

---

### Task 3: Build, verify, and propagate to all deployed locations

**Files:**
- Modify (propagation targets, full resync — no partial edits):
  - `/home/simone/Documenti/start2impact/.agent/rules/scelta_modello.md`
  - `/home/simone/Documenti/start2impact/Progetti-personali/ContextForge/.agent/rules/scelta_modello.md`
  - `/home/simone/Documenti/start2impact/Progetti-personali/ContextForge/AGENTS.md`
- Create:
  - `/home/simone/.pi/agent/AGENTS.md` (and its parent directories, which do not exist yet)

**Interfaces:** None — this task only runs verification commands and copies already-finalized template text (from Tasks 1 and 2) into more files. No code interfaces are involved.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: all test files pass (22 files, same count as before this plan — Tasks 1 and 2 changed existing tests' assertions, they did not add new test files or new `it(...)` blocks).

- [ ] **Step 2: Build**

Run: `npm run build`

Expected: ESM and DTS builds succeed with no errors.

- [ ] **Step 3: Reinstall the global package**

Run: `npm install -g .`

Expected: completes without error. This makes the updated templates available to any `contextforge init` run from this point on.

- [ ] **Step 4: Extract the two finalized templates to temp files**

Run, from the repo root (`/home/simone/Documenti/start2impact/Progetti-personali/ContextForge`):

```bash
sed -n '/^const DEFAULT_SCELTA_MODELLO_TEMPLATE = `/,/^`;$/p' src/cli/commands/init.ts | sed '1s/^const DEFAULT_SCELTA_MODELLO_TEMPLATE = `//' | sed '$d' | sed 's/\\`/`/g' > /tmp/scelta_modello_final.md

sed -n '/^const DEFAULT_AGENTS_TEMPLATE = `/,/^`;$/p' src/cli/commands/init.ts | sed '1s/^const DEFAULT_AGENTS_TEMPLATE = `//' | sed '$d' | sed 's/\\`/`/g' > /tmp/agents_template_final.md
```

Expected: both commands succeed silently (no output). Verify the extraction worked:

```bash
head -5 /tmp/scelta_modello_final.md
```

Expected output:
```
---
trigger: always_on
---

# Rule: Optimal Model Selection — 3-Step Protocol
```

```bash
grep -c "Gemini Pro High\|Gemini Flash" /tmp/scelta_modello_final.md
```

Expected output: `0` (confirms Task 1's removal of these dangling references made it into the extracted file).

- [ ] **Step 5: Propagate to the global `scelta_modello.md`**

Run:

```bash
cp /tmp/scelta_modello_final.md /home/simone/Documenti/start2impact/.agent/rules/scelta_modello.md
```

Verify:

```bash
diff /tmp/scelta_modello_final.md /home/simone/Documenti/start2impact/.agent/rules/scelta_modello.md
```

Expected: no output (files identical).

- [ ] **Step 6: Resync ContextForge's own `.agent/rules/scelta_modello.md`**

Run:

```bash
cp /tmp/scelta_modello_final.md /home/simone/Documenti/start2impact/Progetti-personali/ContextForge/.agent/rules/scelta_modello.md
```

Verify:

```bash
diff /tmp/scelta_modello_final.md /home/simone/Documenti/start2impact/Progetti-personali/ContextForge/.agent/rules/scelta_modello.md
```

Expected: no output. (This file predated even this session's earlier HARD CONSTRAINTS work — this step fully catches it up to the current template.)

- [ ] **Step 7: Resync ContextForge's own root `AGENTS.md`**

Run:

```bash
cp /tmp/agents_template_final.md /home/simone/Documenti/start2impact/Progetti-personali/ContextForge/AGENTS.md
```

Verify:

```bash
diff /tmp/agents_template_final.md /home/simone/Documenti/start2impact/Progetti-personali/ContextForge/AGENTS.md
```

Expected: no output.

- [ ] **Step 8: Create `~/.pi/agent/AGENTS.md`**

Run:

```bash
mkdir -p /home/simone/.pi/agent
```

Then create `/home/simone/.pi/agent/AGENTS.md` with this exact content:

```markdown
# Pi Global Instructions

These instructions apply to every project Pi works in, regardless of whether it uses ContextForge.

## Hard Constraints

1. **Always respond to Simone in Italian.** English is reserved for code artifacts (variables, comments, technical documentation), never for chat.
2. **Never implement directly.** If a task is assigned to another model, call it via CLI. No exception unless Simone explicitly says "do it yourself."
3. **Use ContextForge as the context routing map when this project has one.** It selects which real files to read or pass to agents, instead of dumping the whole repo into a prompt.
4. **If you cannot or will not follow one of these rules, stop and ask Simone for confirmation before proceeding.** Do not work around it silently — state explicitly which rule you are about to violate and why, then wait for a response. Do not fall back to implementing directly.

## Project-specific rules

If the current project has these files, read them before planning, editing, or delegating work:

1. `.agent/rules/scelta_modello.md` — detailed model-routing rules, if this project was initialized with ContextForge.
2. `.contextforge/active-context.md` — current work state, active branch, TODOs, roadmap progress.
3. `.contextforge/architecture.md` — structural map of files, classes, exports, imports.

If none of these exist, proceed using the Hard Constraints above as your only binding rules.
```

Verify:

```bash
test -f /home/simone/.pi/agent/AGENTS.md && echo "exists" && wc -l /home/simone/.pi/agent/AGENTS.md
```

Expected: `exists` followed by a line count (20 lines of content).

- [ ] **Step 9: Clean up temp files**

```bash
rm /tmp/scelta_modello_final.md /tmp/agents_template_final.md
```

- [ ] **Step 10: Commit the propagated copies**

The four propagation targets are outside the `ContextForge` git repo except for the two ContextForge-internal files (Steps 6-7). Commit those two from inside the repo:

```bash
cd /home/simone/Documenti/start2impact/Progetti-personali/ContextForge
git add .agent/rules/scelta_modello.md AGENTS.md
git commit -m "chore: resync ContextForge's own AGENTS.md and scelta_modello.md with current template"
```

The global file (Step 5) and the new Pi config (Step 8) live outside this repo (`/home/simone/Documenti/start2impact/.agent/rules/` and `~/.pi/agent/`) and are not under this project's git tracking — no commit needed for those, consistent with how the global `scelta_modello.md` has been handled throughout this session.

- [ ] **Step 11: Manual smoke test**

In a scratch directory:

```bash
mkdir -p /tmp/pi-migration-smoke-test && cd /tmp/pi-migration-smoke-test
contextforge init -y
grep -c "Gemini Pro High\|Gemini Flash" .agent/rules/scelta_modello.md
grep "Pi executes the protocol" .agent/rules/scelta_modello.md
grep "agy -p" .agent/rules/scelta_modello.md
grep "## Hard Constraints" AGENTS.md
cd /home/simone/Documenti/start2impact/Progetti-personali/ContextForge
rm -rf /tmp/pi-migration-smoke-test
```

Expected: the `grep -c` prints `0`; the three `grep` commands each print one matching line; no errors from any command.
