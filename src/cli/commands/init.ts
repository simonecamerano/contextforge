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
| **Gemini (via \`agy\`)** | 🔍 Reviewer + shell/Git helper | Code review, shell command suggestions, Git workflow help | Claude CLI | Shares Google AI Pro quota — use sparingly, not as a free worker |

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

> **Tool note:** Use Claude CLI or Codex CLI for batch file editing, broad docs, test generation, and multi-file refactoring — they can read and edit files directly. Use Gemini (via \`agy\`) for shell command and Git workflow suggestions.

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
7. **Enterprise Checklist Gate**: If \`.agent/rules/enterprise-checklist.md\` exists in this repo, treat it as the production-readiness gate before declaring any deploy-bound task complete. Skip categories/items that do not apply to this project's actual architecture (mark them N/A, not pending). For everything else, verify all [CRITICAL] items relevant to the current category and output the verification table the checklist file requires — a verbal "checklist passed" without that table is not a valid completion declaration.

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

const DEFAULT_ENTERPRISE_CHECKLIST_TEMPLATE = `---
trigger: always_on
---

# Enterprise Readiness Checklist

Complete checklist for bringing a website or app up to enterprise standards (Apple/Google level).
Each item has a priority: [CRITICAL] [IMPORTANT] [RECOMMENDED] [OPTIONAL]

Use this file as a reference during development, code review, or pre-launch audit.

## Instructions for the agent

Before declaring a task complete or a feature production-ready, verify every [CRITICAL] item in the relevant category. Report unfinished items as pending actions.

If the task involves:

- implementation, refactor, bugfix, deploy, or technical review: apply the checklist as the minimum technical quality gate.
- product strategy, roadmap, standards, audit, or client proposal: apply the checklist to distinguish between MVP, professional product, and enterprise level.
- production release: no relevant [CRITICAL] item should remain unverified without being explicitly flagged as a risk/blocker.

When you cannot verify an item directly, do not mark it as done: flag it as unverified and propose the next concrete step to verify it.

Not every item applies to every project. Before evaluating a category, check \`.contextforge/architecture.md\` and \`.contextforge/project-overview.md\` to determine whether it applies to this project's actual architecture (e.g., skip backend/API/database items for a frontend-only or static project; skip SEO/Metadata items for a project with no public-facing pages; skip Legal & Compliance items for an internal tool with no end users). Mark items that do not apply as **N/A** with a one-line reason — do not list them as pending or unverified, and do not treat them as blocking risks.

**Mandatory output format:** When declaring a task complete or production-ready, output a literal verification table — one row per checklist item in scope for the relevant categories — before the completion statement. Columns: item, status (✅ Verified / ❌ Not met / N/A — reason / ⚠️ Unverified — next step), evidence (the command, file, or check that supports the status). A verbal claim of compliance without this table (e.g. "checklist passed", "all good") is not a valid completion declaration. If you cannot produce the table because verification work is incomplete, stop and ask Simone per HARD CONSTRAINT #4 in \`scelta_modello.md\` instead of declaring completion.

## 1. Performance

- [CRITICAL] Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1 — PageSpeed Insights + Chrome UX Report for real field data
- [CRITICAL] Time to First Byte (TTFB) < 600ms — server response time, caching, CDN
- [IMPORTANT] Optimized JS bundle: tree-shaking, code splitting per route, dynamic imports
- [IMPORTANT] Images: WebP/AVIF format, lazy loading, responsive srcset — Next/Image, sharp, or equivalent
- [IMPORTANT] Fonts: font-display:swap, correct subsetting, preload — avoid FOUT/FOIT, only used weights
- [IMPORTANT] Brotli/Gzip compression on all static assets — configure at server/CDN level
- [IMPORTANT] CDN for static assets — Cloudflare, Fastly, CloudFront
- [IMPORTANT] Correct HTTP cache headers: Cache-Control, ETag, Vary — differentiate public vs private cache
- [RECOMMENDED] Critical CSS inlined above-the-fold, rest loaded async
- [RECOMMENDED] HTTP/2 or HTTP/3 enabled — multiplexing, header compression
- [RECOMMENDED] Prefetch/preconnect for critical third-party resources — \`<link rel="preconnect">\` for API, fonts, analytics
- [OPTIONAL] Service Worker for offline support and advanced caching — standard for enterprise PWAs

## 2. Accessibility (A11y)

- [CRITICAL] WCAG 2.2 Level AA compliance — legal standard in the EU (EN 301 549), mandatory for public bodies and EAA 2025
- [CRITICAL] All forms have explicit labels and descriptive error messages — never rely on placeholder as the only label
- [CRITICAL] Correct focus management: logical order, \`:focus-visible\` on all interactive elements
- [CRITICAL] Meaningful alt text on images (\`alt=""\` if decorative) — complex images use \`aria-describedby\`
- [CRITICAL] Color contrast: 4.5:1 for normal text, 3:1 for UI elements — Colour Contrast Analyser or DevTools
- [CRITICAL] Full keyboard navigation without a mouse — Tab, Shift+Tab, Enter, Escape, arrow keys for custom components
- [IMPORTANT] Correct ARIA roles/states/properties on custom components — always prefer semantic HTML
- [IMPORTANT] Skip navigation link at the start of the page
- [IMPORTANT] Logical heading hierarchy: H1→H2→H3, no level skipped
- [IMPORTANT] Modals and dialogs with focus trap, \`aria-modal\`, Escape closes and focus returns to trigger
- [IMPORTANT] Animations respect \`prefers-reduced-motion\`
- [IMPORTANT] Testing with real screen readers: NVDA/JAWS (Windows), VoiceOver (Mac/iOS) — automated tools catch only ~30% of issues
- [IMPORTANT] Automated a11y tests in CI (axe-core, Playwright a11y) — baseline against regressions
- [RECOMMENDED] Dynamic content announced to screen readers (\`aria-live\`) — toasts, real-time updates, loading states
- [RECOMMENDED] Videos with captions and audio description — WCAG 2.2 AA requires captions for pre-recorded video

## 3. Security

- [CRITICAL] HTTPS mandatory with TLS 1.2+ (prefer TLS 1.3) — HSTS with includeSubDomains and preload
- [CRITICAL] Content Security Policy (CSP) configured and tested — blocks XSS, clickjacking, data injection
- [CRITICAL] Server-side input validation and sanitization (never client-only) — whitelist approach
- [CRITICAL] SQL injection: always use an ORM or prepared statements — no string concatenation for queries
- [CRITICAL] Authentication: bcrypt/argon2 password hashing, login rate limiting — min 12 chars, HaveIBeenPwned API
- [CRITICAL] Secure cookies: httpOnly, Secure, SameSite=Strict — short-lived JWT with refresh token rotation
- [CRITICAL] CSRF protection on all mutating POST/PUT/DELETE requests — Double Submit Cookie or Synchronizer Token
- [CRITICAL] Rate limiting and throttling on all public APIs — per IP and per user, exponential backoff
- [CRITICAL] Secrets management: no credentials in the codebase or public env files — Vault, AWS Secrets Manager, or equivalent
- [CRITICAL] SSL certificate auto-renewal (Let's Encrypt + cert-manager) — alert if expiry < 30 days
- [IMPORTANT] Automated dependency scanning in CI (Snyk, Dependabot) — alert on CVEs in dependencies
- [IMPORTANT] Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy — test on securityheaders.com
- [IMPORTANT] CORS: origin whitelist, no wildcard in production — \`credentials=true\` requires an explicit origin
- [IMPORTANT] File upload: type validation (magic bytes), size limit, antivirus scan, isolated storage — never serve uploaded files from the same domain as the app
- [IMPORTANT] Security event logging: logins, 4xx/5xx errors, admin access — with IP, user agent, timestamp, user ID
- [IMPORTANT] Regular dependency updates (monthly schedule) — patch critical CVEs within 24-48h
- [IMPORTANT] Periodic penetration testing (at least annually) — OWASP Top 10 as minimum baseline

## 4. SEO & Metadata

- [CRITICAL] Positive Core Web Vitals — direct impact on Google ranking, see Performance section
- [IMPORTANT] Unique meta title per page (<60 chars) — main keyword, brand at the end
- [IMPORTANT] Meta description per page (<160 chars) — doesn't affect ranking, affects CTR
- [IMPORTANT] Open Graph and Twitter Card on every shareable page — og:title, og:description, og:image 1200x630px, og:url
- [IMPORTANT] Correct robots.txt and up-to-date sitemap.xml — submitted to Google Search Console and Bing Webmaster
- [IMPORTANT] Canonical URLs (\`rel=canonical\`) on every page — prevents duplicate content penalty
- [IMPORTANT] Relevant Schema.org structured data (JSON-LD) — Organization, BreadcrumbList, FAQ, Product, Article
- [IMPORTANT] Single H1 per page, logical heading hierarchy
- [RECOMMENDED] Images with alt text and descriptive file names — ranking opportunity in Google Images
- [RECOMMENDED] No broken internal links — regular crawl with Screaming Frog or Ahrefs
- [RECOMMENDED] Breadcrumb navigation implemented with schema.org
- [RECOMMENDED] Hreflang for multilingual/multi-region sites — avoids cannibalization between language versions

## 5. Monitoring & Observability

- [CRITICAL] Real-time error tracking (Sentry, Bugsnag) — with sourcemaps, user context, event breadcrumbs
- [CRITICAL] Uptime monitoring with alerts (Pingdom, UptimeRobot, Better Uptime) — check every minute, alert within 1 min
- [CRITICAL] Automated database backups with periodic restore testing — defined RPO and RTO, restore tested at least monthly
- [IMPORTANT] Application Performance Monitoring / APM (Datadog, New Relic, Grafana) — latency, throughput, error rate per endpoint
- [IMPORTANT] Centralized log aggregation (ELK, Grafana Loki, Datadog Logs) — structured JSON, correlation ID for request tracing
- [IMPORTANT] Health check endpoints: /health, /ready, /live — standard Kubernetes liveness/readiness probes
- [IMPORTANT] Operational dashboard with key KPIs — error rate, p95 latency, active users, DB connections
- [IMPORTANT] Alerting on critical thresholds: error rate >1%, latency >500ms, disk >80% — PagerDuty, OpsGenie for on-call
- [IMPORTANT] Configured log retention — GDPR: don't keep logs with PII longer than necessary
- [RECOMMENDED] Distributed tracing for distributed systems (OpenTelemetry) — trace a request across all services
- [RECOMMENDED] Real User Monitoring (RUM) for real Web Vitals — Datadog RUM, Google CrUX, Sentry Performance
- [RECOMMENDED] Synthetic monitoring on critical flows (checkout, login, signup) — Playwright tests in production every N minutes

## 6. CI/CD & Testing

- [CRITICAL] CI pipeline that blocks merge if tests fail — GitHub Actions, GitLab CI, CircleCI
- [CRITICAL] Database migrations tested before deploy — schema compatible with the previous code version, zero downtime
- [IMPORTANT] Unit tests with at least 70% coverage on critical business logic
- [IMPORTANT] Integration tests for all critical API flows — tested against a real DB in an isolated environment
- [IMPORTANT] E2E tests on main user flows (Playwright, Cypress) — login, signup, checkout, core actions
- [IMPORTANT] Automated a11y tests in CI (axe-core) — blocks merge if WCAG violations are introduced
- [IMPORTANT] Strict type checking in CI (TypeScript strict mode) — noImplicitAny, strictNullChecks
- [IMPORTANT] Automatic deploy on merge to main with automatic rollback if health check fails
- [IMPORTANT] Automated post-deploy smoke test — verifies the app responds and main flows work
- [RECOMMENDED] Linting and formatting enforced in CI (ESLint, Prettier, Ruff) — automated, not left to code review
- [RECOMMENDED] Automatic preview environments per PR — Vercel, Railway, Coolify branch deploys
- [RECOMMENDED] Semantic versioning and automatic changelog — conventional commits + semantic-release

## 7. Legal & Compliance (EU)

- [CRITICAL] Privacy Policy up to date and accessible from every page — drafted by a lawyer, specific to the technologies used
- [CRITICAL] GDPR-compliant cookie banner with granular consent (Cookiebot, Iubenda) — no cookies before explicit consent
- [CRITICAL] Technical vs profiling cookies clearly distinguished, granular refusal possible — CJEU ruling: consent required even for analytics
- [CRITICAL] User rights management: access, rectification, deletion of data (GDPR Art. 15-17) — response within 30 days
- [CRITICAL] Data Processing Agreement (DPA) with all vendors — mandatory for every processor handling EU data
- [CRITICAL] Clear Terms of Service with explicit acceptance (checkbox) at signup
- [CRITICAL] Digital accessibility: EU Directive 2016/2102 + European Accessibility Act 2019/882 — in force since June 2025
- [IMPORTANT] Data retention policy: automatic deletion of expired data — define a retention period for each data type
- [IMPORTANT] Logging and audit trail for access to sensitive data — who accessed what and when
- [IMPORTANT] DPIA (Data Protection Impact Assessment) if handling sensitive data — required under GDPR Art. 35 for high-risk processing
- [IMPORTANT] EU AI Act compliance if using AI in production — in force since August 2024, full application 2026-2027

## 8. UX & Design System

- [CRITICAL] Responsive design tested on mobile, tablet, desktop (320px → 1920px) — mobile-first approach
- [IMPORTANT] Design system with documented component library (Storybook) — single source of truth for designers and developers
- [IMPORTANT] Loading states on every async action (skeleton, spinner, progress) — the user must always know what's happening
- [IMPORTANT] Error states with user-friendly messages and recovery actions — avoid stack traces, suggest solutions
- [IMPORTANT] Immediate feedback on every interaction (toast, inline validation) — confirm actions, surface errors immediately
- [IMPORTANT] Form UX: autofocus, autocomplete, semantic input types (email, tel, number) — optimized for mobile
- [RECOMMENDED] Meaningful empty states on empty lists/dashboards — explain what to do, don't show a blank page
- [RECOMMENDED] Internationalization (i18n) ready: messages kept in files separate from code
- [RECOMMENDED] Favicon and PWA icons (192x192, 512x512, apple-touch-icon) — correct manifest.json for installability
- [OPTIONAL] Dark mode supported and persisted (\`prefers-color-scheme\`)
- [OPTIONAL] Print stylesheet for pages that need it (reports, invoices, documents)

## 9. Infrastructure & DevOps

- [CRITICAL] Separate environments: development, staging, production — staging mirrors production faithfully
- [CRITICAL] Automated database backups with periodic restore testing — defined RPO and RTO
- [CRITICAL] Configuration external to the codebase (env vars, secret manager) — 12-factor app: no hardcoded config
- [IMPORTANT] Infrastructure as Code (Terraform, Pulumi, CDK) — no manual config: everything versioned
- [IMPORTANT] Docker containerization with lightweight, non-root images — multi-stage build, no secrets in the image
- [IMPORTANT] Configured auto-scaling — Kubernetes HPA, auto-scaling group, sensible min/max instances
- [IMPORTANT] Database connection pooling (PgBouncer, RDS Proxy) — avoids connection exhaustion under load
- [IMPORTANT] Database indexes on columns frequently used in WHERE/JOIN/ORDER BY — EXPLAIN ANALYZE for slow queries
- [IMPORTANT] Rate limiting at the infrastructure level (WAF, nginx, API gateway) — before it reaches the application
- [IMPORTANT] Documented and tested disaster recovery plan — failover procedure, escalation contacts, runbook
- [RECOMMENDED] Operational runbook: deploy, rollback, scale, troubleshoot — executable by a new team member without help

## 10. API Design & Quality

- [CRITICAL] Idempotency key on critical endpoints (payments, orders) — safe retries without double charges or duplicates
- [IMPORTANT] API versioning (v1, v2) with a deprecation policy — published changelog
- [IMPORTANT] Interactive, up-to-date API documentation (OpenAPI/Swagger) — generated from code
- [IMPORTANT] API errors in a standard format (RFC 7807 Problem Details) — code, message, details, traceId in every error response
- [IMPORTANT] Pagination on every endpoint that returns lists — cursor-based for large, mutating datasets
- [IMPORTANT] Configured timeouts on all external calls — never wait indefinitely for a response
- [IMPORTANT] Circuit breaker on critical external dependencies — Resilience4j or a custom implementation
- [IMPORTANT] Monitored API response time per endpoint (p50, p95, p99) — defined and measured SLOs
- [RECOMMENDED] Webhooks with retry, signature validation (HMAC), and idempotency — verifiable payload, guaranteed delivery

## Priority summary

| Priority | Description |
|---|---|
| [CRITICAL] | Blocks production launch. Legal sanctions, downtime, data or user loss. |
| [IMPORTANT] | Separates a professional product from an MVP. Expected standard in B2B/enterprise contexts. |
| [RECOMMENDED] | Operational excellence. Implement as soon as possible after launch. |
| [OPTIONAL] | Nice to have. Adds value but is not universally expected. |
`;

interface InitOptions {
  provider?: string;
  model?: string;
  ollamaHost?: string;
  deepseekApiKey?: string;
  yes?: boolean;
  enterpriseChecklist?: boolean;
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
    .option('--enterprise-checklist', 'Scaffold .agent/rules/enterprise-checklist.md')
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
        const defaultIgnoreLines = [
          '.contextforge/local/',
          '.env',
          '.env.*',
          'node_modules/',
          '__pycache__/',
          '*.pyc',
          'venv/',
          '.venv/',
          'dist/',
          'build/',
          '*.log',
          '.DS_Store',
          '.vscode/',
          '.idea/',
        ];

        const existingGitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
        const missingIgnoreLines = defaultIgnoreLines.filter(line => !existingGitignore.includes(line));

        if (missingIgnoreLines.length > 0) {
          const separator = existingGitignore.length > 0 && !existingGitignore.endsWith('\n') ? '\n' : '';
          fs.writeFileSync(gitignorePath, `${existingGitignore}${separator}${missingIgnoreLines.join('\n')}\n`, 'utf8');
          console.log(existingGitignore ? 'Updated .gitignore with default exclusions.' : 'Created .gitignore with default exclusions.');
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

        const enterpriseChecklistPath = path.join(rulesDir, 'enterprise-checklist.md');
        let includeEnterpriseChecklist = options.enterpriseChecklist === true;
        if (!includeEnterpriseChecklist && !options.yes) {
          const checklistChoice = await ask(
            '\nInclude enterprise readiness checklist (SEO/A11y/Security/Legal gate for production-bound projects)? [y/N]: '
          );
          includeEnterpriseChecklist = checklistChoice.trim().toLowerCase() === 'y';
        }

        if (includeEnterpriseChecklist && !fs.existsSync(enterpriseChecklistPath)) {
          fs.mkdirSync(rulesDir, { recursive: true });
          fs.writeFileSync(enterpriseChecklistPath, DEFAULT_ENTERPRISE_CHECKLIST_TEMPLATE, 'utf8');
          console.log('Created agent rules: .agent/rules/enterprise-checklist.md');
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
