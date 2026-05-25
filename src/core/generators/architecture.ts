import { ProjectSummary } from '../scanner/summarizer.js';

export function generateArchitecture(summary: ProjectSummary): string {
  let markdown = `# Architecture\n\n`;
  markdown += `Questo documento fornisce una panoramica strutturata dei moduli sorgente del progetto.\n\n`;

  if (summary.tsModules.length > 0) {
    markdown += `## Moduli TypeScript / JavaScript\n\n`;
    for (const mod of summary.tsModules) {
      markdown += `### [${mod.path}](file:///${mod.path})\n`;
      markdown += `- **Exports:** ${mod.exports.length > 0 ? mod.exports.map(e => `\`${e}\``).join(', ') : '*nessuno*'}\n`;
      
      if (mod.classes.length > 0) {
        markdown += `- **Classi:**\n`;
        for (const cls of mod.classes) {
          markdown += `  - \`${cls.name}\`${cls.methods.length > 0 ? ` (Metodi: ${cls.methods.map((m: string) => `\`${m}\``).join(', ')})` : ''}\n`;
        }
      }

      if (mod.functions.length > 0) {
        markdown += `- **Funzioni:** ${mod.functions.map(f => `\`${f}\``).join(', ')}\n`;
      }
      
      if (mod.imports.length > 0) {
        markdown += `- **Imports da:** ${mod.imports.map(i => `\`${i.from || i.module || ''}\``).filter(Boolean).join(', ')}\n`;
      }
      markdown += `\n`;
    }
  }

  if (summary.pythonModules.length > 0) {
    markdown += `## Moduli Python\n\n`;
    for (const mod of summary.pythonModules) {
      markdown += `### [${mod.path}](file:///${mod.path})\n`;
      if (mod.classes.length > 0) {
        markdown += `- **Classi:** ${mod.classes.map(c => `\`${c.name}\``).join(', ')}\n`;
      }
      if (mod.functions.length > 0) {
        markdown += `- **Funzioni:** ${mod.functions.map(f => `\`${f}\``).join(', ')}\n`;
      }
      if (mod.imports.length > 0) {
        markdown += `- **Imports da:** ${mod.imports.map(i => `\`${i.module || i.from || ''}\``).filter(Boolean).join(', ')}\n`;
      }
      markdown += `\n`;
    }
  }

  return markdown;
}
