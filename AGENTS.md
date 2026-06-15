# Agent Instructions

This repository uses ContextForge for agentic development.

## Mandatory startup protocol

Before planning, editing, or delegating work in this repository:

1. Read `.agent/rules/scelta_modello.md`.
2. Read `.contextforge/active-context.md`.
3. Read `.contextforge/architecture.md`.
4. Use `.contextforge/project-overview.md` when dependencies, scripts, or configuration matter.
5. Use `.contextforge/ai-brief.md` when constructing compact prompts for external models.

## ContextForge rule

ContextForge is a routing map, not the implementation source of truth.

Use it to identify relevant files, then read the actual source files before making implementation claims or changes.

## Verification rule

Do not declare implementation tasks complete without real verification:
- targeted tests when available,
- build/typecheck when relevant,
- smoke test for CLI/server/UI flows.
