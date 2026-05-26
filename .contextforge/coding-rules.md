# Coding Rules

## Language

**All code, comments, JSDoc, CLI output messages, error messages, template content, and documentation must be written in English.**

No Italian anywhere in the source code or generated files.

## Style

- TypeScript strict mode
- ESM modules (`import`/`export`)
- No `any` types in production code (`*.test.ts` files excluded)
- `const` over `let` wherever possible

## Formatting

- Prettier with default config (see `.prettierrc`)
- ESLint enforced (see `eslint.config.js`)