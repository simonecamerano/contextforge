# Technical Decisions

Registro storico delle decisioni architetturali (ADR).
## [2026-05-25] Scelta di TypeScript e Node.js

- **Stato:** Approved
- **Contesto:** Necessità di un runtime veloce, tipizzato e portabile per la CLI
- **Decisione:** Uso di Node.js e TypeScript
- **Alternative Considerate:** Rust (troppo verboso per MVP), Python (manca di tipizzazione statica nativa performante a runtime)
- **Conseguenze:** Compilazione veloce in bundle ESM e type-safety su AST parsing
