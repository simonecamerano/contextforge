import path from 'node:path';

/**
 * Normalised representation of a project manifest file.
 *
 * Fields are optional because not every manifest format exposes all of them
 * (e.g. `requirements.txt` only provides a flat list of package names).
 */
export interface ManifestResult {
  /** Project name as declared in the manifest. */
  name?: string;
  /** Project version string. */
  version?: string;
  /** Runtime dependency map (`name → version specifier`). */
  dependencies?: Record<string, string>;
  /** Development-only dependency map. */
  devDependencies?: Record<string, string>;
  /** NPM-style script map. */
  scripts?: Record<string, string>;
  /**
   * Flat list of package names.  Used for formats (e.g. `requirements.txt`)
   * that do not distinguish runtime vs. dev dependencies.
   */
  packages?: string[];
}

/**
 * Dispatches to the correct sub-parser based on the manifest file name and
 * returns a normalised {@link ManifestResult}.
 *
 * Supported formats:
 * - `package.json` — Node.js / npm / yarn / pnpm
 * - `requirements.txt` — Python pip
 * - `pyproject.toml` — Python PEP 517/518 (both Poetry and the standard
 *   `[project]` table are handled)
 *
 * Any parsing failure returns an empty object rather than throwing so the
 * caller can proceed with partial information.
 *
 * @param filePath - Full or relative path to the manifest; only the basename
 *   is used for format detection.
 * @param content  - Raw text content of the manifest file.
 * @returns Resolved {@link ManifestResult}, potentially empty on failure.
 */
export async function parseManifest(filePath: string, content: string): Promise<ManifestResult> {
  const fileName = path.basename(filePath);

  try {
    if (fileName === 'package.json') {
      return parsePackageJson(content);
    } else if (fileName === 'requirements.txt') {
      return parseRequirementsTxt(content);
    } else if (fileName === 'pyproject.toml') {
      return parsePyprojectToml(content);
    }
  } catch {
    // fall through
  }

  return {};
}

/**
 * Parses a `package.json` file and extracts the fields ContextForge cares
 * about.
 *
 * @param content - Raw JSON string.
 * @returns Partial {@link ManifestResult}, or `{}` if the JSON is malformed.
 */
function parsePackageJson(content: string): ManifestResult {
  try {
    const json = JSON.parse(content);
    return {
      name: json.name,
      version: json.version,
      dependencies: json.dependencies,
      devDependencies: json.devDependencies,
      scripts: json.scripts,
    };
  } catch {
    return {};
  }
}

/**
 * Parses a `requirements.txt` file and returns a flat list of package names
 * with version specifiers stripped.
 *
 * Lines are excluded when they:
 * - Are blank.
 * - Start with `#` (comments).
 * - Start with `http://` or `https://` (URL-based installs).
 * - Start with `-` (pip flags such as `-r`, `-c`, `-e`, `--index-url`, …).
 *
 * Version specifiers (`==`, `>=`, `<=`, `!=`, `~=`, `[extras]`, environment
 * markers after `;`) are stripped by splitting on the first occurrence of any
 * of the characters `>`, `<`, `=`, `!`, `~`, `[`, or `;`.
 *
 * @param content - Raw text of `requirements.txt`.
 * @returns `{ packages }` with the list of bare package names.
 */
function parseRequirementsTxt(content: string): ManifestResult {
  const packages: string[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('-')
    ) {
      continue;
    }
    // Strip version specifiers: take everything before the first operator
    // character or extras bracket.
    const packageName = trimmed.split(/[>=<!~[;]/)[0].trim();
    if (packageName) {
      packages.push(packageName);
    }
  }

  return { packages };
}

/**
 * Parses a `pyproject.toml` file using targeted regex matching rather than a
 * full TOML parser to avoid an extra dependency.
 *
 * ## Supported sections
 * The parser recognises three common layouts for dependency declarations:
 *
 * 1. **Poetry** (`[tool.poetry.dependencies]`): key-value pairs where the key
 *    is the package name and the value is a version string or a TOML inline
 *    table.  The mandatory `python` key is filtered out.
 * 2. **PEP 621 table-style** (`[project.dependencies]`): same key-value
 *    format as Poetry but under `[project.dependencies]`.  Only used as a
 *    fallback when the Poetry section is absent to avoid double-counting.
 * 3. **PEP 621 array-style** (`dependencies = […]` inside `[project]`): a
 *    TOML array of PEP 508 requirement strings.  Each string is parsed for
 *    its package name by splitting on the first version specifier character.
 *
 * @param content - Raw text of `pyproject.toml`.
 * @returns Partial {@link ManifestResult} with `name`, `version`, and/or
 *   `dependencies` populated where found.
 */
function parsePyprojectToml(content: string): ManifestResult {
  const result: ManifestResult = {};

  // `name` and `version` are top-level keys that appear in both
  // `[tool.poetry]` and `[project]` sections, so we match the first
  // occurrence without being section-aware.
  const nameMatch = content.match(/^\s*name\s*=\s*["']([^"']+)["']/m);
  if (nameMatch) result.name = nameMatch[1];

  const versionMatch = content.match(/^\s*version\s*=\s*["']([^"']+)["']/m);
  if (versionMatch) result.version = versionMatch[1];

  const dependencies: Record<string, string> = {};

  // ── Poetry-style: [tool.poetry.dependencies] ─────────────────────────────
  // Section content is everything up to the next `[` header or end-of-file.
  const poetryDepSection = content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(?=\[|$)/);
  if (poetryDepSection) {
    for (const match of poetryDepSection[1].matchAll(/^\s*(\w[\w-]*)\s*=\s*(.+)/gm)) {
      if (match[1] !== 'python') {
        // Strip surrounding quotes from plain version strings like `"^1.2"`.
        dependencies[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  }

  // ── PEP 621 table-style: [project.dependencies] ──────────────────────────
  // Only used when the Poetry section is absent to avoid double-counting
  // packages that appear in both.
  const projectDepSection = content.match(/\[project\.dependencies\]([\s\S]*?)(?=\[|$)/);
  if (!poetryDepSection && projectDepSection) {
    for (const match of projectDepSection[1].matchAll(/^\s*(\w[\w-]*)\s*=\s*(.+)/gm)) {
      dependencies[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }

  // ── PEP 621 array-style: dependencies = […] inside [project] ─────────────
  // The `[project]` block ends at the next section header (`\n[`) or
  // end-of-file.  Within it we look for an inline or multi-line array.
  // Each quoted string is a PEP 508 requirement; we extract only the package
  // name by discarding the version specifier.
  const projectSection = content.match(/\[project\]([\s\S]*?)(?=\n\[|$)/);
  if (projectSection) {
    const depsArrayMatch = projectSection[1].match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
    if (depsArrayMatch) {
      for (const match of depsArrayMatch[1].matchAll(/["']([^"']+)["']/g)) {
        const pkgName = match[1].split(/[>=<!~[;]/)[0].trim();
        if (pkgName) dependencies[pkgName] = match[1];
      }
    }
  }

  if (Object.keys(dependencies).length > 0) {
    result.dependencies = dependencies;
  }

  return result;
}
