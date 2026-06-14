import { ProjectSummary } from '../scanner/summarizer.js';

function relativeMarkdownLink(filePath: string): string {
  return `../${filePath.replace(/\\/g, '/')}`;
}

export function generateArchitecture(summary: ProjectSummary): string {
  let markdown = `# Architecture\n\n`;
  markdown += `This document provides a structured overview of the project's source modules.\n\n`;

  if (summary.tsModules.length > 0) {
    markdown += `## TypeScript / JavaScript Modules\n\n`;
    for (const mod of summary.tsModules) {
      markdown += `### [${mod.path}](${relativeMarkdownLink(mod.path)})\n`;
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
      markdown += `### [${mod.path}](${relativeMarkdownLink(mod.path)})\n`;
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
