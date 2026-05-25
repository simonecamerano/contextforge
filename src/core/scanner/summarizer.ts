import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { parseTypeScript } from './parsers/typescript.js';
import { parsePython } from './parsers/python.js';
import { parseManifest } from './parsers/manifest.js';

export interface SummarizedModule {
  path: string;
  imports: Array<{ from?: string; module?: string; names: string[] }>;
  exports: string[];
  classes: Array<{ name: string; methods: string[] }>;
  functions: string[];
}

export interface TodoItem {
  file: string;
  line: number;
  type: 'TODO' | 'FIXME';
  text: string;
}

export interface ProjectSummary {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  tsModules: SummarizedModule[];
  pythonModules: SummarizedModule[];
  languages: string[];
  gitBranch: string;
  gitCommits: string[];
  todos: TodoItem[];
}

export async function summarizeProject(files: string[], projectRoot: string): Promise<ProjectSummary> {
  let gitBranch = '';
  let gitCommits: string[] = [];

  try {
    gitBranch = execSync('git branch --show-current', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    gitCommits = execSync('git log --oneline -n 10', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\n')
      .map((c) => c.trim())
      .filter(Boolean);
  } catch {
    // Non è un repository Git o Git non è installato
  }

  const summary: ProjectSummary = {
    name: path.basename(projectRoot),
    version: '0.1.0',
    dependencies: {},
    devDependencies: {},
    scripts: {},
    tsModules: [],
    pythonModules: [],
    languages: [],
    gitBranch,
    gitCommits,
    todos: [],
  };

  const extMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.py': 'Python',
    '.json': 'JSON',
    '.txt': 'Text',
    '.toml': 'TOML',
    '.md': 'Markdown',
  };

  for (const file of files) {
    const absolutePath = path.join(projectRoot, file);
    const ext = path.extname(file).toLowerCase();

    const lang = extMap[ext];
    if (lang && !summary.languages.includes(lang)) {
      summary.languages.push(lang);
    }

    try {
      const content = await fs.readFile(absolutePath, 'utf8');

      // Ricerca TODO/FIXME nei commenti
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const todoMatch = line.match(/(?:\/\/\/|\/\/|#)\s*(TODO|FIXME)\s*[:-]?\s*(.+)/i);
        if (todoMatch) {
          summary.todos.push({
            file,
            line: i + 1,
            type: todoMatch[1].toUpperCase() as 'TODO' | 'FIXME',
            text: todoMatch[2].trim(),
          });
        }
      }

      if (ext === '.ts' || ext === '.js' || ext === '.tsx' || ext === '.jsx') {
        const parsed = await parseTypeScript(file, content);
        summary.tsModules.push({
          path: file,
          ...parsed,
        });
      } else if (ext === '.py') {
        const parsed = await parsePython(file, content);
        summary.pythonModules.push({
          path: file,
          imports: parsed.imports,
          exports: parsed.functions.concat(parsed.classes),
          classes: parsed.classes.map((name) => ({ name, methods: [] })),
          functions: parsed.functions,
        });
      } else if (file === 'package.json' || file === 'requirements.txt' || file === 'pyproject.toml') {
        const parsed = await parseManifest(file, content);
        if (parsed.name) summary.name = parsed.name;
        if (parsed.version) summary.version = parsed.version;
        if (parsed.dependencies) {
          summary.dependencies = { ...summary.dependencies, ...parsed.dependencies };
        }
        if (parsed.devDependencies) {
          summary.devDependencies = { ...summary.devDependencies, ...parsed.devDependencies };
        }
        if (parsed.scripts) {
          summary.scripts = { ...summary.scripts, ...parsed.scripts };
        }
        if (parsed.packages) {
          for (const pkg of parsed.packages) {
            summary.dependencies[pkg] = 'latest';
          }
        }
      }
    } catch (err) {
      console.error(`Errore nel summarizer per il file ${file}:`, err);
    }
  }

  return summary;
}
