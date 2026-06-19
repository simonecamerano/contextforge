import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { registerInitCommand } from './init.js';

const originalCwd = process.cwd();
let tempDir: string;

async function runInitInTempProject(args: string[] = ['-y']): Promise<string> {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contextforge-init-'));
  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    JSON.stringify({ name: 'demo-project', version: '1.0.0', scripts: { test: 'vitest run' } }, null, 2),
    'utf8'
  );
  fs.writeFileSync(path.join(tempDir, 'src.ts'), 'export function hello() { return "world"; }\n', 'utf8');

  process.chdir(tempDir);
  const program = new Command();
  program.exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerInitCommand(program);
  await program.parseAsync(['init', ...args], { from: 'user' });

  return tempDir;
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  process.chdir(originalCwd);
  vi.restoreAllMocks();
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('init command', () => {
  it('generates agent model-selection rules with ContextForge routing and task-specific verification guidance', async () => {
    const projectDir = await runInitInTempProject();
    const rulesPath = path.join(projectDir, '.agent', 'rules', 'scelta_modello.md');

    expect(fs.existsSync(rulesPath)).toBe(true);
    const content = fs.readFileSync(rulesPath, 'utf8');

    expect(content).toContain('ContextForge is a map, not the implementation source of truth.');
    expect(content).toContain('The target model/agent MUST read the actual source files before modifying them');
    expect(content).toContain('DO add or update minimal task-specific tests when needed to verify behavior');
    expect(content).toContain('Full coverage expansion, routine docstrings, and repository documentation are handled at project completion.');
    expect(content).toContain('Run `contextforge update` before implementation or delegation if:');
    expect(content).toContain('For pure discussion or early ideation, read existing `.contextforge` files without updating unless freshness is required.');
    expect(content).toContain('Start with the smallest reasonable file set.');
    expect(content).toContain('Every implementation task must end with real verification');
    expect(content).toContain('Enterprise Checklist Gate');
    expect(content).toContain('mark them N/A, not pending');
  });

  it('generates a root AGENTS.md bootstrap that points agents to ContextForge and model-selection rules', async () => {
    const projectDir = await runInitInTempProject();
    const agentsPath = path.join(projectDir, 'AGENTS.md');

    expect(fs.existsSync(agentsPath)).toBe(true);
    const content = fs.readFileSync(agentsPath, 'utf8');

    expect(content).toContain('This repository uses ContextForge for agentic development.');
    expect(content).toContain('Read `.agent/rules/scelta_modello.md`.');
    expect(content).toContain('Read `.contextforge/active-context.md`.');
    expect(content).toContain('Read `.contextforge/architecture.md`.');
    expect(content).toContain('ContextForge is a routing map, not the implementation source of truth.');
    expect(content).toContain('read the actual source files before making implementation claims or changes.');
    expect(content).toContain('Do not declare implementation tasks complete without real verification');
  });

  it('does not overwrite existing agent instruction files', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contextforge-init-'));
    const rulesDir = path.join(tempDir, '.agent', 'rules');
    const rulesPath = path.join(rulesDir, 'scelta_modello.md');
    const agentsPath = path.join(tempDir, 'AGENTS.md');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(rulesPath, 'custom rules', 'utf8');
    fs.writeFileSync(agentsPath, 'custom agents bootstrap', 'utf8');

    process.chdir(tempDir);
    const program = new Command();
    program.exitOverride();
    program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
    registerInitCommand(program);
    await program.parseAsync(['init', '-y'], { from: 'user' });

    expect(fs.readFileSync(rulesPath, 'utf8')).toBe('custom rules');
    expect(fs.readFileSync(agentsPath, 'utf8')).toBe('custom agents bootstrap');
  });

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
});
