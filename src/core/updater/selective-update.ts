import fs from 'node:fs/promises';
import path from 'node:path';
import { ChangeResult } from './change-detector.js';
import { ProjectSummary } from '../scanner/summarizer.js';
import { generateProjectOverview } from '../generators/project-overview.js';
import { generateArchitecture } from '../generators/architecture.js';
import { generateActiveContext } from '../generators/active-context.js';
import { generateAIBrief } from '../generators/ai-brief.js';

/**
 * Manifest files whose modification signals that project-level metadata
 * (name, version, dependencies) may have changed and `project-overview.md`
 * should be regenerated.
 */
const MANIFEST_FILES = new Set(['package.json', 'requirements.txt', 'pyproject.toml']);

/**
 * Source-code extensions that, when modified, indicate architectural changes
 * (new classes, functions, imports) requiring `architecture.md` to be
 * regenerated.
 */
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py']);

/**
 * Returns `true` when the given file path is a recognised project manifest.
 *
 * @param file - Absolute or relative file path.
 */
function isManifest(file: string): boolean {
  return MANIFEST_FILES.has(path.basename(file));
}

/**
 * Returns `true` when the given file path has a recognised source-code
 * extension.
 *
 * @param file - Absolute or relative file path.
 */
function isSource(file: string): boolean {
  return SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase());
}

/**
 * Regenerates only the context documents that are affected by a given set of
 * file changes, avoiding unnecessary work when most files are unchanged.
 *
 * ## Update strategy
 *
 * | Trigger                          | Document regenerated          |
 * |----------------------------------|-------------------------------|
 * | Any manifest file changed        | `project-overview.md`         |
 * | Any source file added/modified/  | `architecture.md`             |
 * | removed                          |                               |
 * | Always                           | `active-context.md`           |
 *
 * `active-context.md` is always written because it records the most-recently
 * changed files; its content is cheap to generate and is the first thing an
 * AI assistant reads.
 *
 * @param changed         - Sets of added, modified, and removed file paths as
 *   produced by the change detector.
 * @param summary         - Pre-computed project summary used by the generators.
 * @param contextForgeDir - Absolute path to the `.contextforge/` output
 *   directory where generated documents are written.
 */
export async function selectiveUpdate(
  changed: ChangeResult,
  summary: ProjectSummary,
  contextForgeDir: string
): Promise<void> {
  // Flatten all changed paths into a single array for predicate checks.
  const allChanged = [...changed.modified, ...changed.added, ...changed.removed];

  const needsOverview = allChanged.some(isManifest);
  const needsArchitecture = allChanged.some(isSource);

  if (needsOverview) {
    await fs.writeFile(
      path.join(contextForgeDir, 'project-overview.md'),
      generateProjectOverview(summary),
      'utf8'
    );
    console.log('Updated: .contextforge/project-overview.md');
  }

  if (needsArchitecture) {
    await fs.writeFile(
      path.join(contextForgeDir, 'architecture.md'),
      generateArchitecture(summary),
      'utf8'
    );
    console.log('Updated: .contextforge/architecture.md');
  }

  // Always regenerate active-context.md to keep the recent-changes list fresh.
  await fs.writeFile(
    path.join(contextForgeDir, 'active-context.md'),
    generateActiveContext(summary),
    'utf8'
  );
  console.log('Updated: .contextforge/active-context.md');

  // Always regenerate ai-brief.md to keep the compressed context in sync.
  await fs.writeFile(
    path.join(contextForgeDir, 'ai-brief.md'),
    generateAIBrief(summary),
    'utf8'
  );
  console.log('Updated: .contextforge/ai-brief.md');
}
