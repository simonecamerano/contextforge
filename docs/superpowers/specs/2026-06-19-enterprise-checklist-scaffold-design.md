# Optional Enterprise Readiness Checklist Scaffold — Design Spec

**Date:** 2026-06-19
**Status:** Approved
**Scope:** Add an opt-in `.agent/rules/enterprise-checklist.md` scaffold to `contextforge init`, ported from an existing Hermes Agents skill, so agents can gate production-readiness work on it when the project warrants it.

---

## Problem

The user maintains an "Enterprise Readiness Checklist" skill in Hermes Agents, used for occasional audits of external GitHub repos. ContextForge, by contrast, is initialized on every project the user works on — enterprise-grade or not (CLI tools, scripts, experiments included). A fixed, always-present checklist covering SEO/A11y/Legal/Infra items would be noise on most of those projects, so the feature must be opt-in rather than scaffolded unconditionally like `coding-rules.md` or `scelta_modello.md`.

---

## Solution

Approach: static scaffold + opt-in prompt, following the existing `init` pattern used for LLM provider selection (interactive prompt with a `-y`/flag escape hatch for non-interactive use). No dynamic, per-project filtering of checklist items is built — the target agent already does this contextual filtering at read time (combining `architecture.md` with the checklist), exactly as the original Hermes skill instructs it to.

Two alternatives were considered and rejected:
- **Dynamic filtering** (ContextForge inspects the stack and outputs only relevant items): rejected as unnecessary complexity — duplicates reasoning the agent already performs, and risks brittle heuristics for "is this a web project."
- **Standalone `contextforge checklist` command** decoupled from `init`: rejected for this iteration. `init` already aborts if `.contextforge/` exists, so there is no way to retrofit this (or `scelta_modello.md`) onto already-initialized projects without deleting state. This is an accepted, pre-existing limitation (already true for `scelta_modello.md` today) and out of scope here.

---

## CLI Changes

### New option on `init`

```ts
.option('--enterprise-checklist', 'Scaffold .agent/rules/enterprise-checklist.md')
```

### Decision logic (in order)

1. `options.enterpriseChecklist === true` → scaffold the file, no prompt (works combined with `-y` or alone).
2. Else if `options.yes` (non-interactive `-y` mode) → skip, no prompt. Default is **not included**.
3. Else → interactive prompt:
   ```
   Include enterprise readiness checklist (SEO/A11y/Security/Legal gate for production-bound projects)? [y/N]:
   ```
   Empty input (just Enter) → treated as `N` (not included).

This decision runs in the same step where `.agent/rules/scelta_modello.md` is scaffolded (near the end of `init`'s file-creation block), not alongside the earlier LLM-provider prompt — it is independent of provider selection.

### File write

```ts
const enterpriseChecklistPath = path.join(rulesDir, 'enterprise-checklist.md');
if (shouldIncludeChecklist && !fs.existsSync(enterpriseChecklistPath)) {
  fs.writeFileSync(enterpriseChecklistPath, DEFAULT_ENTERPRISE_CHECKLIST_TEMPLATE, 'utf8');
  console.log('Created agent rules: .agent/rules/enterprise-checklist.md');
}
```

Guard mirrors the existing `scelta_modello.md` write: skip silently if the file already exists (no overwrite of user edits).

---

## File Content: `.agent/rules/enterprise-checklist.md`

Frontmatter matches `scelta_modello.md`:

```markdown
---
trigger: always_on
---
```

Body is the user's existing Hermes checklist, translated 1:1 into English (same 10 categories, same priority levels, same ~100 items, same opening "Instructions for the agent" block) to stay consistent with the existing `English Only` rule in `scelta_modello.md` Section 6 ("template content... must be written in English. No Italian in any project artifact"). Full translated content:

```markdown
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
- [RECOMMENDED] Prefetch/preconnect for critical third-party resources — `<link rel="preconnect">` for API, fonts, analytics
- [OPTIONAL] Service Worker for offline support and advanced caching — standard for enterprise PWAs

## 2. Accessibility (A11y)

- [CRITICAL] WCAG 2.2 Level AA compliance — legal standard in the EU (EN 301 549), mandatory for public bodies and EAA 2025
- [CRITICAL] All forms have explicit labels and descriptive error messages — never rely on placeholder as the only label
- [CRITICAL] Correct focus management: logical order, `:focus-visible` on all interactive elements
- [CRITICAL] Meaningful alt text on images (`alt=""` if decorative) — complex images use `aria-describedby`
- [CRITICAL] Color contrast: 4.5:1 for normal text, 3:1 for UI elements — Colour Contrast Analyser or DevTools
- [CRITICAL] Full keyboard navigation without a mouse — Tab, Shift+Tab, Enter, Escape, arrow keys for custom components
- [IMPORTANT] Correct ARIA roles/states/properties on custom components — always prefer semantic HTML
- [IMPORTANT] Skip navigation link at the start of the page
- [IMPORTANT] Logical heading hierarchy: H1→H2→H3, no level skipped
- [IMPORTANT] Modals and dialogs with focus trap, `aria-modal`, Escape closes and focus returns to trigger
- [IMPORTANT] Animations respect `prefers-reduced-motion`
- [IMPORTANT] Testing with real screen readers: NVDA/JAWS (Windows), VoiceOver (Mac/iOS) — automated tools catch only ~30% of issues
- [IMPORTANT] Automated a11y tests in CI (axe-core, Playwright a11y) — baseline against regressions
- [RECOMMENDED] Dynamic content announced to screen readers (`aria-live`) — toasts, real-time updates, loading states
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
- [IMPORTANT] CORS: origin whitelist, no wildcard in production — `credentials=true` requires an explicit origin
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
- [IMPORTANT] Canonical URLs (`rel=canonical`) on every page — prevents duplicate content penalty
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
- [OPTIONAL] Dark mode supported and persisted (`prefers-color-scheme`)
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
```

---

## Cross-Reference in `scelta_modello.md`

Add a new, permanent item to Section 6 (General Development Rules) — safe whether or not the checklist file was scaffolded, since it's conditioned on the file's existence:

```markdown
7. **Enterprise Checklist Gate**: If `.agent/rules/enterprise-checklist.md` exists in this repo, treat it as the production-readiness gate before declaring any deploy-bound task complete. Verify all [CRITICAL] items relevant to the current category; report unverified ones as pending risks rather than marking them done.
```

This line is added to `DEFAULT_SCELTA_MODELLO_TEMPLATE` in `init.ts` unconditionally (it does not depend on whether `--enterprise-checklist` was passed for *this* `init` run).

---

## Testing

### `src/cli/commands/init.test.ts` (additions)

- `init` with `--enterprise-checklist` (and `-y`) → `.agent/rules/enterprise-checklist.md` is created, contains the `trigger: always_on` frontmatter and the "Enterprise Readiness Checklist" heading.
- `init` with only `-y` (no `--enterprise-checklist`) → the file is **not** created.
- `init` run twice with `--enterprise-checklist`, second run after manually editing the file → second run does not overwrite the manual edit (guard mirrors the existing `scelta_modello.md` test).

### Manual verification

- `scelta_modello.md` generated by `init` contains the new Section 6 item 7 in all cases (with or without the checklist flag).

---

## Out of Scope

- No command to retrofit `enterprise-checklist.md` (or any other `init`-time scaffold) onto the user's existing 11 already-initialized projects. `init` aborts early if `.contextforge/` already exists; this is a pre-existing limitation shared with `scelta_modello.md` and not addressed here.
- No per-project dynamic filtering of checklist items based on detected stack/framework. The target agent performs this filtering itself at read time using `architecture.md` + the checklist, consistent with the original Hermes skill's own instructions.

---

## Files Changed

| File | Change |
|---|---|
| `src/cli/commands/init.ts` | Add `DEFAULT_ENTERPRISE_CHECKLIST_TEMPLATE` constant, `--enterprise-checklist` option, decision logic, conditional file write, Section 6 item 7 addition to `DEFAULT_SCELTA_MODELLO_TEMPLATE` |
| `src/cli/commands/init.test.ts` | Add the 3 tests described above |
