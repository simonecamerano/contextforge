# Optional Enterprise Checklist Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in `--enterprise-checklist` flag to `contextforge init` that scaffolds `.agent/rules/enterprise-checklist.md` (an English port of the user's Hermes "Enterprise Readiness Checklist" skill), plus a permanent, conditional cross-reference to it in the generated `scelta_modello.md`.

**Architecture:** Single-file change in `src/cli/commands/init.ts` (commander.js CLI command module). Add a new template-literal constant holding the checklist content, a new boolean CLI option, and a small decision block (flag → no-prompt-include; `-y` → no-prompt-skip; otherwise → interactive y/N prompt defaulting to N) that conditionally writes the file using the same skip-if-exists guard already used for `scelta_modello.md`. Separately, append one permanent item to the existing `DEFAULT_SCELTA_MODELLO_TEMPLATE` string referencing the new file conditionally ("if it exists").

**Tech Stack:** TypeScript, Commander.js, Node `fs`/`readline`, Vitest (run with `--pool=forks` — the default worker-thread pool does not support `process.chdir()`, which the existing `init.test.ts` helper relies on).

## Global Constraints

- Scaffolded file content must be written in English — no Italian in any project artifact (existing rule, restated in `DEFAULT_SCELTA_MODELLO_TEMPLATE` Section 6 item 6).
- New file frontmatter must be exactly `trigger: always_on`, matching `scelta_modello.md`'s pattern.
- Never overwrite an existing `.agent/rules/enterprise-checklist.md` (skip-if-exists guard, same pattern as `scelta_modello.md`).
- Default behavior (no flag, with or without `-y`) is **not included** — most of the user's ContextForge projects are not enterprise-grade.
- `--enterprise-checklist` forces inclusion in both interactive and non-interactive (`-y`) runs, bypassing the prompt.
- The Section 6 cross-reference item in `scelta_modello.md` is added unconditionally on every `init` run, regardless of whether `--enterprise-checklist` was passed for that run (it's a conditional "if this file exists" instruction, harmless either way).
- Run tests with `npx vitest run --pool=forks` (pre-existing project requirement, not introduced by this feature).

---

### Task 1: Scaffold `.agent/rules/enterprise-checklist.md` behind `--enterprise-checklist`

**Files:**
- Modify: `src/cli/commands/init.ts` (add constant after `DEFAULT_AGENTS_TEMPLATE`, which currently ends at line 286; add `enterpriseChecklist?: boolean` to the `InitOptions` interface at lines 288-294; add `.option(...)` after the existing `-y, --yes` option at line 341; add decision + write logic after the `scelta_modello.md` write block, which currently ends at line 453)
- Test: `src/cli/commands/init.test.ts`

**Interfaces:**
- Produces: `DEFAULT_ENTERPRISE_CHECKLIST_TEMPLATE: string` (module-local `const`, not exported — same visibility as `DEFAULT_SCELTA_MODELLO_TEMPLATE` and `DEFAULT_AGENTS_TEMPLATE`)
- Produces: `InitOptions.enterpriseChecklist?: boolean`
- Consumes: existing module-local `ask(question: string): Promise<string>` helper (already defined at the top of `init.ts`) for the interactive prompt
- Consumes: existing `rulesDir` local variable (already in scope at the insertion point — defined a few lines above as `path.join(agentDir, 'rules')`)

- [ ] **Step 1: Write the failing test**

Add to `src/cli/commands/init.test.ts`, inside the existing `describe('init command', ...)` block (after the third `it(...)`, before the closing `});` at line 97):

```ts
  it('creates .agent/rules/enterprise-checklist.md when --enterprise-checklist is passed', async () => {
    const projectDir = await runInitInTempProject(['-y', '--enterprise-checklist']);
    const checklistPath = path.join(projectDir, '.agent', 'rules', 'enterprise-checklist.md');

    expect(fs.existsSync(checklistPath)).toBe(true);
    const content = fs.readFileSync(checklistPath, 'utf8');

    expect(content).toContain('trigger: always_on');
    expect(content).toContain('# Enterprise Readiness Checklist');
    expect(content).toContain('## 1. Performance');
    expect(content).toContain('## 10. API Design & Quality');
  });

  it('does not create enterprise-checklist.md by default', async () => {
    const projectDir = await runInitInTempProject(['-y']);
    const checklistPath = path.join(projectDir, '.agent', 'rules', 'enterprise-checklist.md');

    expect(fs.existsSync(checklistPath)).toBe(false);
  });

  it('does not overwrite an existing enterprise-checklist.md', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contextforge-init-'));
    const rulesDir = path.join(tempDir, '.agent', 'rules');
    const checklistPath = path.join(rulesDir, 'enterprise-checklist.md');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(checklistPath, 'custom checklist', 'utf8');

    process.chdir(tempDir);
    const program = new Command();
    program.exitOverride();
    program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
    registerInitCommand(program);
    await program.parseAsync(['init', '-y', '--enterprise-checklist'], { from: 'user' });

    expect(fs.readFileSync(checklistPath, 'utf8')).toBe('custom checklist');
  });
```

- [ ] **Step 2: Run tests to verify the first one fails**

Run: `npx vitest run --pool=forks src/cli/commands/init.test.ts`

Expected: the new `'creates .agent/rules/enterprise-checklist.md when --enterprise-checklist is passed'` test FAILS — either because commander rejects the unrecognized `--enterprise-checklist` option (uncaught `CommanderError` from `exitOverride()`) or because the file was never written. The other two new tests are expected to PASS trivially at this point (no code path writes the file yet), which is fine — they lock in default/no-overwrite behavior and will be re-verified after Step 3.

- [ ] **Step 3: Add the `InitOptions` field and CLI option**

In `src/cli/commands/init.ts`, modify the `InitOptions` interface:

```ts
interface InitOptions {
  provider?: string;
  model?: string;
  ollamaHost?: string;
  deepseekApiKey?: string;
  yes?: boolean;
  enterpriseChecklist?: boolean;
}
```

Then add the new option to the `init` command registration, right after `.option('-y, --yes', ...)`:

```ts
    .option('-y, --yes', 'Use Offline provider without prompting when no provider is specified')
    .option('--enterprise-checklist', 'Scaffold .agent/rules/enterprise-checklist.md')
```

- [ ] **Step 4: Add the `DEFAULT_ENTERPRISE_CHECKLIST_TEMPLATE` constant**

Insert this new constant in `src/cli/commands/init.ts` right after the `DEFAULT_AGENTS_TEMPLATE` constant closes (after its closing `` `; `` line, before `interface InitOptions`):

```ts
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
```

- [ ] **Step 5: Add the decision logic and conditional write**

In `src/cli/commands/init.ts`, immediately after the existing block that writes `scelta_modello.md`:

```ts
        if (!fs.existsSync(sceltaModelloPath)) {
          fs.mkdirSync(rulesDir, { recursive: true });
          fs.writeFileSync(sceltaModelloPath, DEFAULT_SCELTA_MODELLO_TEMPLATE, 'utf8');
          console.log('Created agent rules: .agent/rules/scelta_modello.md');
        }
```

add:

```ts
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
```

- [ ] **Step 6: Run tests to verify all three pass**

Run: `npx vitest run --pool=forks src/cli/commands/init.test.ts`

Expected: PASS — all 6 tests in the file (3 existing + 3 new) green.

- [ ] **Step 7: Commit**

```bash
git add src/cli/commands/init.ts src/cli/commands/init.test.ts
git commit -m "feat: add opt-in enterprise readiness checklist scaffold to init"
```

---

### Task 2: Add the Section 6 cross-reference to `scelta_modello.md`

**Files:**
- Modify: `src/cli/commands/init.ts` (edit `DEFAULT_SCELTA_MODELLO_TEMPLATE`, Section 6 — currently item 6 is the last item, immediately followed by a `---` separator and `## 7. Context-Aware Agent Workflow`)
- Test: `src/cli/commands/init.test.ts` (extend the existing first test)

**Interfaces:**
- Consumes: `DEFAULT_SCELTA_MODELLO_TEMPLATE: string` (existing module-local constant, edited in place — no signature change)
- No new exports; this task does not depend on Task 1's new constant or option.

- [ ] **Step 1: Write the failing test assertions**

In `src/cli/commands/init.test.ts`, add two lines to the existing first test (`'generates agent model-selection rules with ContextForge routing and task-specific verification guidance'`), after the last existing `expect(content).toContain(...)` line (`expect(content).toContain('Every implementation task must end with real verification');`):

```ts
    expect(content).toContain('Enterprise Checklist Gate');
    expect(content).toContain('mark them N/A, not pending');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --pool=forks src/cli/commands/init.test.ts`

Expected: the first test FAILS on the new `expect(content).toContain('Enterprise Checklist Gate')` assertion — the string is not yet present in `DEFAULT_SCELTA_MODELLO_TEMPLATE`.

- [ ] **Step 3: Add the Section 6 item**

In `src/cli/commands/init.ts`, inside `DEFAULT_SCELTA_MODELLO_TEMPLATE`, find:

```
6. **English Only**: All code, comments, JSDoc, CLI output strings, error messages, template content, and documentation must be written in **English**. This applies to every model and to final cleanup. No Italian in any project artifact.

---

## 7. Context-Aware Agent Workflow (ContextForge Integration)
```

Replace with:

```
6. **English Only**: All code, comments, JSDoc, CLI output strings, error messages, template content, and documentation must be written in **English**. This applies to every model and to final cleanup. No Italian in any project artifact.
7. **Enterprise Checklist Gate**: If \`.agent/rules/enterprise-checklist.md\` exists in this repo, treat it as the production-readiness gate before declaring any deploy-bound task complete. Skip categories/items that do not apply to this project's actual architecture (mark them N/A, not pending). For everything else, verify all [CRITICAL] items relevant to the current category; report unverified ones as pending risks rather than marking them done.

---

## 7. Context-Aware Agent Workflow (ContextForge Integration)
```

(Note: item 7 here and the unrelated `## 7. Context-Aware Agent Workflow` heading right after it are two different, pre-existing numbering schemes in the template — Section numbers vs. list-item numbers inside Section 6 — this duplication already exists in the source text and is not something this task needs to fix.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --pool=forks src/cli/commands/init.test.ts`

Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/cli/commands/init.ts src/cli/commands/init.test.ts
git commit -m "feat: reference enterprise checklist as a conditional gate in scelta_modello.md"
```

---

### Task 3: Full verification and global package sync

**Files:** none (build/test/install only)

**Interfaces:** none — this task only runs commands.

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run --pool=forks`

Expected: all test files pass, total test count is 446 (440 existing + 6 in `init.test.ts`, up from 3).

- [ ] **Step 2: Build**

Run: `npm run build`

Expected: ESM and DTS build succeed with no errors (same output shape as prior builds: `dist/index.js`, `dist/index.d.ts`).

- [ ] **Step 3: Reinstall the global package**

Run: `npm install -g .`

Expected: completes without error. This makes the new `--enterprise-checklist` flag available to any `contextforge init` run from this point on, in any directory.

- [ ] **Step 4: Manual smoke test**

Run, in a scratch directory (e.g. `mktemp -d` then `cd` into it):

```bash
contextforge init -y --enterprise-checklist
cat .agent/rules/enterprise-checklist.md | head -5
grep -n "Enterprise Checklist Gate" .agent/rules/scelta_modello.md
```

Expected: the checklist file's first 5 lines show the `trigger: always_on` frontmatter and the `# Enterprise Readiness Checklist` heading; the `grep` finds the new Section 6 item 7 in `scelta_modello.md`.

- [ ] **Step 5: Commit (only if Step 1-4 required any fixes)**

If no fixes were needed, this step is skipped — Task 1 and Task 2 commits already cover all source changes.
