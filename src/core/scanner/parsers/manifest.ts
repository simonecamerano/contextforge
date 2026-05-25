import path from 'node:path';

export interface ManifestResult {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  packages?: string[];
}

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
    const packageName = trimmed.split(/[>=<!~\[;]/)[0].trim();
    if (packageName) {
      packages.push(packageName);
    }
  }

  return { packages };
}

function parsePyprojectToml(content: string): ManifestResult {
  const result: ManifestResult = {};

  const nameMatch = content.match(/^\s*name\s*=\s*["']([^"']+)["']/m);
  if (nameMatch) result.name = nameMatch[1];

  const versionMatch = content.match(/^\s*version\s*=\s*["']([^"']+)["']/m);
  if (versionMatch) result.version = versionMatch[1];

  const dependencies: Record<string, string> = {};

  const poetryDepSection = content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(?=\[|$)/);
  if (poetryDepSection) {
    for (const match of poetryDepSection[1].matchAll(/^\s*(\w[\w-]*)\s*=\s*(.+)/gm)) {
      if (match[1] !== 'python') {
        dependencies[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  }

  const projectDepSection = content.match(/\[project\.dependencies\]([\s\S]*?)(?=\[|$)/);
  if (!poetryDepSection && projectDepSection) {
    for (const match of projectDepSection[1].matchAll(/^\s*(\w[\w-]*)\s*=\s*(.+)/gm)) {
      dependencies[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }

  const projectSection = content.match(/^\[project\]([\s\S]*?)(?=^\[|$)/m);
  if (projectSection) {
    const depsArrayMatch = projectSection[1].match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
    if (depsArrayMatch) {
      for (const match of depsArrayMatch[1].matchAll(/["']([^"']+)["']/g)) {
        const pkgName = match[1].split(/[>=<!~\[;]/)[0].trim();
        if (pkgName) dependencies[pkgName] = match[1];
      }
    }
  }

  if (Object.keys(dependencies).length > 0) {
    result.dependencies = dependencies;
  }

  return result;
}
