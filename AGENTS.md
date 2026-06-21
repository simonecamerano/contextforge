# Agent Instructions

This repository uses ContextForge for agentic development.

## Mandatory startup protocol

Before planning, editing, or delegating work in this repository:

1. Read `.agent/rules/scelta_modello.md`.
2. Read `.contextforge/active-context.md`.
3. Read `.contextforge/architecture.md`.
4. Use `.contextforge/project-overview.md` when dependencies, scripts, or configuration matter.
5. Use `.contextforge/ai-brief.md` when constructing compact prompts for external models.

## Hard Constraints

1. **Always respond to Simone in Italian.** English is reserved for code artifacts (variables, comments, technical documentation), never for chat.
2. **Never implement directly.** If a task is assigned to another model, call it via CLI. No exception unless Simone explicitly says "do it yourself."
3. **Use ContextForge as the context routing map.** It selects which real files to read or pass to agents — it does not replace the source code.
4. **If you cannot or will not follow one of these rules, stop and ask Simone for confirmation before proceeding.** Do not work around it silently — state explicitly which rule you are about to violate and why, then wait for a response. Do not fall back to implementing directly.

## ContextForge rule

ContextForge is a routing map, not the implementation source of truth.

Use it to identify relevant files, then read the actual source files before making implementation claims or changes.

## Verification rule

Do not declare implementation tasks complete without real verification:
- targeted tests when available,
- build/typecheck when relevant,
- smoke test for CLI/server/UI flows.
