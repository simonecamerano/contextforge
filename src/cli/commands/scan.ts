import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Command } from 'commander';
import { IgnoreEngine } from '../../core/scanner/ignore-engine.js';
import { walkDirectory } from '../../core/scanner/file-walker.js';
import { summarizeProject } from '../../core/scanner/summarizer.js';
import { generateProjectOverview } from '../../core/generators/project-overview.js';
import { generateArchitecture } from '../../core/generators/architecture.js';
import { generateActiveContext } from '../../core/generators/active-context.js';
import { generateAIBrief } from '../../core/generators/ai-brief.js';
import { computeCompressionStats } from '../../core/stats/compression-stats.js';

interface Meta {
  version: string;
  lastScan: string;
  fileHashes: Record<string, string>;
  currentStats: { rawChars: number; forgedChars: number; compressionRatio: number };
  lifetimeStats: { totalRawCharsProcessed: number; totalForgedCharsOutput: number };
}

export async function runScan(cwd: string): Promise<void> {
  const contextForgeDir = path.join(cwd, '.contextforge');
  const localDir = path.join(contextForgeDir, 'local');

  if (!fs.existsSync(contextForgeDir)) {
    console.error('Error: ContextForge is not initialized in this directory. Run "contextforge init" first.');
    process.exit(1);
  }

  console.log('Starting repository scan...');
  try {
    fs.mkdirSync(localDir, { recursive: true });

    const ignoreEngine = new IgnoreEngine(cwd);
    const files = await walkDirectory(cwd, ignoreEngine);
    
    console.log(`Found ${files.length} files to analyze.`);
    const summary = await summarizeProject(files, cwd);

    // Generate overview
    const overviewContent = generateProjectOverview(summary);
    fs.writeFileSync(path.join(contextForgeDir, 'project-overview.md'), overviewContent, 'utf8');
    console.log('Updated: .contextforge/project-overview.md');

    // Generate architecture
    const architectureContent = generateArchitecture(summary);
    fs.writeFileSync(path.join(contextForgeDir, 'architecture.md'), architectureContent, 'utf8');
    console.log('Updated: .contextforge/architecture.md');

    // Generate active context
    const activeContextContent = generateActiveContext(summary);
    fs.writeFileSync(path.join(contextForgeDir, 'active-context.md'), activeContextContent, 'utf8');
    console.log('Updated: .contextforge/active-context.md');

    // Generate AI brief
    const briefContent = generateAIBrief(summary);
    fs.writeFileSync(path.join(contextForgeDir, 'ai-brief.md'), briefContent, 'utf8');
    console.log('Updated: .contextforge/ai-brief.md');

    // Compute and save hashes for meta.json
    const fileHashes: Record<string, string> = {};
    for (const file of files) {
      const absolutePath = path.join(cwd, file);
      if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
        const content = fs.readFileSync(absolutePath);
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        fileHashes[file] = hash;
      }
    }

    const currentStats = computeCompressionStats(files, contextForgeDir);
    const lifetimeStats = {
      totalRawCharsProcessed: currentStats.rawChars,
      totalForgedCharsOutput: currentStats.forgedChars,
    };

    const meta: Meta = {
      version: '0.1.0',
      lastScan: new Date().toISOString(),
      fileHashes,
      currentStats,
      lifetimeStats,
    };

    fs.writeFileSync(
      path.join(localDir, 'meta.json'),
      JSON.stringify(meta, null, 2),
      'utf8'
    );
    console.log('Updated: .contextforge/local/meta.json');
    console.log(`Compression ratio: ${currentStats.compressionRatio}% (${(currentStats.rawChars / 1024).toFixed(1)} KB raw → ${(currentStats.forgedChars / 1024).toFixed(1)} KB forged)`);
    
    console.log('\nScan completed successfully!');
  } catch (error) {
    console.error('Error during scan:', error);
    process.exit(1);
  }
}

export function registerScanCommand(program: Command) {
  program
    .command('scan')
    .description('Analyze the codebase and generate project memory')
    .action(async () => {
      const cwd = process.cwd();
      await runScan(cwd);
    });
}
