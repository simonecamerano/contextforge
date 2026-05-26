import path from 'node:path';
import { ProjectSummary } from '../scanner/summarizer.js';

export function generateArchitecture(summary: ProjectSummary): string {
  let markdown = `# Architecture\n\n`;
  markdown += `This document provides a structured overview of the project's source modules.\n\n`;

  if (summary.tsModules.length > 0) {
    markdown += `## TypeScript / JavaScript Modules\n\n`;
    for (const mod of summary.tsModules) {
      const absPath = path.resolve(summary.projectRoot, mod.path).replace(/\\/g, '/');
      const fileUrl = `file://${absPath.startsWith('/') ? '' : '/'}${absPath}`;
      markdown += `### [${mod.path}](${fileUrl})\n`;
      markdown += `- **Exports:** ${mod.exports.length > 0 ? mod.exports.map(e => `\`${e}\``).join(', ') : '*none*'}\n`;
      
      if (mod.classes.length > 0) {
        markdown += `- **Classes:**\n`;
        for (const cls of mod.classes) {
          markdown += `  - \`${cls.name}\`${cls.methods.length > 0 ? ` (Methods: ${cls.methods.map((m: string) => `\`${m}\``).join(', ')})` : ''}\n`;
        }
      }

      if (mod.functions.length > 0) {
        markdown += `- **Functions:** ${mod.functions.map(f => `\`${f}\``).join(', ')}\n`;
      }
      
      if (mod.imports.length > 0) {
        markdown += `- **Imports from:** ${mod.imports.map(i => `\`${i.from || i.module || ''}\``).filter(Boolean).join(', ')}\n`;
      }
      markdown += `\n`;
    }
  }

  if (summary.pythonModules.length > 0) {
    markdown += `## Python Modules\n\n`;
    for (const mod of summary.pythonModules) {
      const absPath = path.resolve(summary.projectRoot, mod.path).replace(/\\/g, '/');
      const fileUrl = `file://${absPath.startsWith('/') ? '' : '/'}${absPath}`;
      markdown += `### [${mod.path}](${fileUrl})\n`;
      if (mod.classes.length > 0) {
        markdown += `- **Classes:** ${mod.classes.map(c => `\`${c.name}\``).join(', ')}\n`;
      }
      if (mod.functions.length > 0) {
        markdown += `- **Functions:** ${mod.functions.map(f => `\`${f}\``).join(', ')}\n`;
      }
      if (mod.imports.length > 0) {
        markdown += `- **Imports from:** ${mod.imports.map(i => `\`${i.module || i.from || ''}\``).filter(Boolean).join(', ')}\n`;
      }
      markdown += `\n`;
    }
  }

  return markdown;
}
