# Pi Orchestrator Migration — Design Spec

**Date:** 2026-06-21
**Status:** Approved
**Scope:** Replace Gemini-in-Antigravity as the orchestrator described in `scelta_modello.md`/`AGENTS.md` with **Pi** (pi.dev, configured with GPT), update the Model Role Table and CLI invocation patterns accordingly, and propagate the change to every location these rule files currently live.

---

## Problem

Earlier in this session we diagnosed why Gemini-as-orchestrator-inside-Antigravity kept self-implementing instead of delegating, and mitigated it with HARD CONSTRAINT #4 (stop-and-confirm) and a mandatory verification table for the enterprise checklist. Independently, Simone wants to stop using Antigravity's chat as the orchestrator entirely — it was consuming the Google AI Pro plan's time window on orchestration overhead (reading rules, planning, deciding) in addition to any real implementation work, leaving too little quota for Gemini's actual strengths.

The proposed replacement is **Pi** (pi.dev, Mario Zechner/Earendil — a minimal, provider-agnostic coding agent CLI), configured to run on a GPT subscription, acting as an external orchestrator that calls Claude/Codex/Gemini/Qwen as workers via CLI/HTTP — the same delegation pattern `scelta_modello.md` already describes for Claude CLI and Codex CLI today.

This requires updating `scelta_modello.md` and `AGENTS.md` (both the ContextForge-generated templates and every location they're currently deployed) to reflect the new orchestrator, the new role boundaries this creates, and two new CLI/HTTP invocation mechanisms.

---

## Verified Facts (researched this session, not assumed)

These facts were confirmed via web research and the user's own empirical testing, and they directly shape the design below:

1. **Pi has native Read/Write/Edit/Bash tools.** It is not a pure dispatcher — it has exactly the same capability to self-implement that Gemini had inside Antigravity. Moving the orchestrator to Pi does **not** remove the structural risk diagnosed earlier; HARD CONSTRAINTS #1-4 and the Strict Delegation Rule remain just as necessary, just addressed to a different actor.
2. **Pi reads `AGENTS.md` automatically** at startup, from `~/.pi/agent/`, parent directories, and the current directory. It has **no native equivalent of Antigravity's `.agent/rules/` always-on loading** — the only way `scelta_modello.md` content reaches Pi is if `AGENTS.md` tells it to read that file, and Pi's Read tool executes that instruction. This is a single point of failure that didn't exist with Antigravity (which auto-injects `.agent/rules/*.md` regardless of whether the agent "reads" it).
3. **Antigravity CLI (`agy`) works standalone** (no IDE session required) and **shares the same Google AI Pro quota** as the Antigravity IDE chat — confirmed empirically: the account's usage indicator dropped from 100% to 99% after 5 real `agy -p "..."` calls. It is not a free/separate pool; it must be used for targeted tasks, not as a general-purpose free worker.
4. **LM Studio exposes an OpenAI-compatible REST API** at `http://localhost:1234/v1/chat/completions` (server started via `lms server start`). There is no simple one-shot CLI prompt command equivalent to `claude -p`; invocation is via HTTP POST with a JSON body.

---

## Solution

Pi fully replaces Gemini-in-Antigravity as the orchestrator (no dual-mode support — confirmed with Simone). `scelta_modello.md` and `AGENTS.md` are rewritten to address **Pi** by name as the acting orchestrator, the same way they currently address "Gemini." The four HARD CONSTRAINTS are duplicated into `AGENTS.md` itself (not just referenced) as a safety net against fact #2 above. Gemini's role narrows from orchestrator to a single worker role — reviewer + shell/Git workflow help (reclaimed from Claude CLI/Codex CLI, which absorbed it when Copilot was deprecated) — invoked via `agy`. Qwen's invocation mechanism changes from "paste manually into Antigravity's context field" to a scripted LM Studio HTTP call. The change is made at the template level (`init.ts`) so all future `contextforge init` runs produce this version, then propagated to every existing deployment of these files.

---

## A. Document Voice

Every instance of "Gemini" as the acting orchestrator in `DEFAULT_SCELTA_MODELLO_TEMPLATE` and `DEFAULT_AGENTS_TEMPLATE` (`src/cli/commands/init.ts`) is replaced with "Pi" — e.g. "Gemini executes the protocol..." → "Pi executes the protocol...", "Gemini MUST NOT..." → "Pi MUST NOT...". This is a like-for-like rename throughout both templates; no other wording in these sentences changes.

`DEFAULT_AGENTS_TEMPLATE` gains the four HARD CONSTRAINTS, copied verbatim from `scelta_modello.md`'s opening block, inserted right after the existing "Mandatory startup protocol" numbered list and before "## ContextForge rule":

```markdown
## Hard Constraints

1. **Always respond to Simone in Italian.** English is reserved for code artifacts (variables, comments, technical documentation), never for chat.
2. **Never implement directly.** If a task is assigned to another model, call it via CLI. No exception unless Simone explicitly says "do it yourself."
3. **Use ContextForge as the context routing map.** It selects which real files to read or pass to agents — it does not replace the source code.
4. **If you cannot or will not follow one of these rules, stop and ask Simone for confirmation before proceeding.** Do not work around it silently — state explicitly which rule you are about to violate and why, then wait for a response. Do not fall back to implementing directly.
```

(English here, not Italian like the `scelta_modello.md` original — `AGENTS.md`'s own existing content is already in English, and `scelta_modello.md`'s Section 6 rule 6 already mandates English for all project artifacts; the Italian phrasing in `scelta_modello.md`'s HARD CONSTRAINTS block was a pre-existing exception scoped to that one file, not something to replicate into `AGENTS.md`.)

---

## B. Model Role Table (`scelta_modello.md` Section 1)

Replace the existing table with:

```markdown
| Model | Role | Typical tasks | Fallback | Constraint |
|---|---|---|---|---|
| **Qwen (local via LM Studio)** | 🐴 Workhorse | Boilerplate, CRUD, standard components, light local refactoring | DeepSeek | None (local) |
| **Claude Pro** | 🧠 Architect | Architecture, complex reasoning, multi-file debugging, code review, test design | DeepSeek | Rate limit |
| **Codex / GPT-4o** | 🎨 Designer | CSS, Tailwind, layouts, UI, transitions, visual frontend | Qwen local | Rate limit |
| **DeepSeek API** | 💡 Coding specialist | Advanced algorithms, optimization — use when genuinely the best fit | Qwen local | API cost (low) |
| **Claude CLI / Codex CLI** | 🚜 Batch file editor | End-of-project batch cleanup, broad test expansion, docs, multi-file normalization | Simone decides manually | Request limit / sandbox risk |
| **Gemini (via `agy`)** | 🔍 Reviewer + shell/Git helper | Code review, shell command suggestions, Git workflow help | Claude CLI | Shares Google AI Pro quota — use sparingly, not as a free worker |
```

Changes from the current table:
- "Gemini Pro High" (Wide-context analyst) and "Gemini Flash" (Sprinter) rows are removed and replaced by a single "Gemini (via `agy`)" row — planning/roadmap/full-repo-analysis duties fully move to Pi, which now performs that decomposition itself.
- Claude Pro's fallback changes from "Gemini Pro High" to **DeepSeek** — Gemini's narrowed role (review + shell/Git) is not a sensible fallback for complex-reasoning/implementation tasks.
- Codex's fallback ("Gemini Flash" previously) becomes **Qwen local** — same reasoning.
- "Qwen (local)" is relabeled "Qwen (local via LM Studio)" to reflect the new local-model backend (was Ollama).

---

## C. CLI Execution & Strict Delegation (`scelta_modello.md` Section 3)

Replace the existing bash block and the two "run directly from Antigravity IDE" lines with:

```markdown
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

# Qwen local (LM Studio — requires \`lms server start\` running first)
jq -n --arg content "$(cat .contextforge/ai-brief.md)

---

TASK: [PROMPT]" '{"model": "[LM_STUDIO_MODEL_NAME]", "messages": [{"role": "user", "content": $content}]}' > /tmp/lm-studio-payload.json

curl -s http://localhost:1234/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d @/tmp/lm-studio-payload.json
\`\`\`
```

Building the JSON payload with `jq -n --arg` instead of nesting manual `\"` escapes inside a `$(...)` substitution avoids fragile nested-quoting bugs — `jq` handles all JSON-escaping internally from a plain bash variable, and `curl --data @file` keeps the HTTP call itself free of any shell-quoting interaction with the JSON body. `jq` is already installed on Simone's machine (`/usr/bin/jq`, verified during spec review); the template should still note it as a prerequisite (`apt install jq` on Debian/Ubuntu) for anyone running this on a fresh machine.

The two bullet lines that previously read "Qwen local: run directly from Antigravity IDE..." and "Gemini: run directly from Antigravity IDE" are deleted entirely — both are now invoked exactly like the other workers, no IDE dependency.

The Strict Model Delegation Rule's model list `(i.e., Qwen, Claude, DeepSeek, Codex)` becomes `(i.e., Qwen, Claude, DeepSeek, Codex, Gemini)`.

`[LM_STUDIO_MODEL_NAME]` is a placeholder Simone fills in per-machine (whatever model identifier is currently loaded in LM Studio, checkable via `lms ls`) — same convention as the existing `[PROMPT]` placeholder.

---

## D. Internal Consistency (Section 2 and Section 4)

Three small edits to keep the document internally consistent with the role changes in B:

1. Section 2's tool note: `"Use Claude CLI or Codex CLI for batch file editing, broad docs, test generation, multi-file refactoring, and shell/Git workflow suggestions — they can read and edit files directly."` → remove `, and shell/Git workflow suggestions` (becomes `...multi-file refactoring — they can read and edit files directly.`).
2. Section 4 Step 2 "Strict specialized routing" list: remove `and shell/Git workflow suggestions` from the Claude CLI/Codex CLI bullet, and add a new bullet: `Assign **Gemini (via agy)** for code review and shell/Git workflow help — use sparingly, it shares Google AI Pro quota.`
3. No other section references Gemini's old role table entries by name, so no further edits are needed in Sections 5-7.

---

## E. Propagation Scope

Same pattern already established this session for every prior template change:

1. **`init.ts`** — `DEFAULT_SCELTA_MODELLO_TEMPLATE` and `DEFAULT_AGENTS_TEMPLATE`, plus updated/added test assertions in `init.test.ts` covering the renamed actor, the new Gemini role table row, and the new `agy`/LM Studio invocation blocks.
2. **Global file** `/home/simone/Documenti/start2impact/.agent/rules/scelta_modello.md` — same edits applied directly (this repo has no root `AGENTS.md` counterpart at the global level; only `scelta_modello.md` lives there, consistent with prior propagation rounds).
3. **New: `~/.pi/agent/AGENTS.md`** — created (this file does not exist yet) containing the same Hard Constraints block from Section A, plus a short pointer to read `.agent/rules/scelta_modello.md` and `.contextforge/active-context.md`/`architecture.md` when present in the current project — i.e., a minimal version of `DEFAULT_AGENTS_TEMPLATE`'s startup protocol, scoped to be useful even in non-ContextForge projects.
4. **ContextForge's own dogfood files** — `/home/simone/Documenti/start2impact/Progetti-personali/ContextForge/.agent/rules/scelta_modello.md` was found to predate even this session's earlier HARD CONSTRAINTS work (confirmed via diff: it's missing all four HARD CONSTRAINTS and everything added since). It gets fully resynced to the new template as part of this change, the same way the global file is kept in sync — this is a pre-existing drift this change happens to fix, not new scope it introduces.

---

## Testing

`src/cli/commands/init.test.ts` already asserts specific substrings from both templates (e.g. `'Enterprise Checklist Gate'`, `'fermati e chiedi conferma a Simone prima di procedere'`). These assertions are updated or extended to verify:

- `DEFAULT_AGENTS_TEMPLATE` contains the new "Hard Constraints" heading and all four numbered constraints.
- `DEFAULT_SCELTA_MODELLO_TEMPLATE` no longer contains the string `"Gemini executes"` (replaced by `"Pi executes"`).
- The Model Role Table contains the consolidated `Gemini (via \`agy\`)` row and no longer contains `Gemini Pro High` or `Gemini Flash`.
- The CLI block contains `agy -p` and the LM Studio `curl` invocation.
- The Strict Model Delegation Rule's model list includes `Gemini`.

No new test file is needed — these are additions/changes to the existing three `it(...)` blocks that already assert template content (see `init.test.ts` lines ~45-77 for the two relevant tests covering `scelta_modello.md` and `AGENTS.md`).

---

## Out of Scope

- No support for keeping Gemini-in-Antigravity as an alternative orchestrator mode — Simone confirmed Pi fully replaces it.
- No automated way to verify the `AGENTS.md → read scelta_modello.md` chain actually executes inside a live Pi session — this is a real, currently-unverified assumption (see Verified Fact #2). Simone will validate this empirically by using Pi on a real task after this change ships; it is not blocking this spec, since the duplicated Hard Constraints in `AGENTS.md` (Section A) already provide a fallback if the chain fails.
- No retrofit of these changes onto already-initialized non-ContextForge projects beyond the global file and the two new global locations listed in Section E — consistent with the project's existing stance on not building a retrofit/upgrade command (see the earlier Copilot-deprecation and enterprise-checklist specs).

---

## Files Changed

| File | Change |
|---|---|
| `src/cli/commands/init.ts` | Rename actor Gemini→Pi throughout both templates; add Hard Constraints block to `DEFAULT_AGENTS_TEMPLATE`; rewrite Model Role Table; rewrite CLI Execution block; remove shell/Git from Claude CLI/Codex CLI scope in two places; add Gemini to Strict Model Delegation Rule's model list |
| `src/cli/commands/init.test.ts` | Update/extend assertions per Testing section above |
| `/home/simone/Documenti/start2impact/.agent/rules/scelta_modello.md` | Same edits as the template, applied directly |
| `~/.pi/agent/AGENTS.md` | New file |
| `/home/simone/Documenti/start2impact/Progetti-personali/ContextForge/.agent/rules/scelta_modello.md` | Full resync to current template (pre-existing drift, fixed as part of this change) |
| `/home/simone/Documenti/start2impact/Progetti-personali/ContextForge/AGENTS.md` | Already in sync with `DEFAULT_AGENTS_TEMPLATE` (verified during spec review) — receives the same Section A edits (Pi rename, Hard Constraints block) as the template, no drift fix needed |
