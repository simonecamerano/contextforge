import fs from 'node:fs/promises';
import path from 'node:path';
import { ChangeResult } from './change-detector.js';
import { ProjectSummary } from '../scanner/summarizer.js';
import { generateProjectOverview } from '../generators/project-overview.js';
import { generateArchitecture } from '../generators/architecture.js';
import { generateActiveContext } from '../generators/active-context.js';

const MANIFEST_FILES = new Set(['package.json', 'requirements.txt', 'pyproject.toml']);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py']);

function isManifest(file: string): boolean {
  return MANIFEST_FILES.has(path.basename(file));
}

function isSource(file: string): boolean {
  return SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase());
}

export async function selectiveUpdate(
  changed: ChangeResult,
  summary: ProjectSummary,
  contextForgeDir: string
): Promise<void> {
  const allChanged = [...changed.modified, ...changed.added, ...changed.removed];

  const needsOverview = allChanged.some(isManifest);
  const needsArchitecture = allChanged.some(isSource);

  if (needsOverview) {
    await fs.writeFile(
      path.join(contextForgeDir, 'project-overview.md'),
      generateProjectOverview(summary),
      'utf8'
    );
    console.log('Aggiornato: .contextforge/project-overview.md');
  }

  if (needsArchitecture) {
    await fs.writeFile(
      path.join(contextForgeDir, 'architecture.md'),
      generateArchitecture(summary),
      'utf8'
    );
    console.log('Aggiornato: .contextforge/architecture.md');
  }

  await fs.writeFile(
    path.join(contextForgeDir, 'active-context.md'),
    generateActiveContext(summary),
    'utf8'
  );
  console.log('Aggiornato: .contextforge/active-context.md');
}
