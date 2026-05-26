# Technical Decisions

Historical record of architectural decisions (ADR).

## [2026-05-25] TypeScript and Node.js

- **Status:** Approved
- **Context:** Need for a fast, typed, and portable runtime for the CLI
- **Decision:** Use Node.js and TypeScript
- **Alternatives Considered:** Rust (too verbose for MVP), Python (lacks performant native static typing at runtime)
- **Consequences:** Fast compilation to ESM bundle and type-safety on AST parsing
