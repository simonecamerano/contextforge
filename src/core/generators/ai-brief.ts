import { ProjectSummary } from '../scanner/summarizer.js';

export function generateAIBrief(summary: ProjectSummary): string {
  let markdown = `# AI Brief\n\n`;
  markdown += `This document contains an optimized summary of the project context for LLMs.\n\n`;

  markdown += `## Project Overview\n`;
  markdown += `- **Project:** ${summary.name}\n`;
  markdown += `- **Languages:** ${summary.languages.join(', ')}\n`;
  markdown += `- **Branch:** ${summary.gitBranch || 'not detected'}\n\n`;

  const deps = Object.keys(summary.dependencies);
  if (deps.length > 0) {
    markdown += `### Key Dependencies\n`;
    for (const dep of deps) {
      markdown += `- \`${dep}\`: \`${summary.dependencies[dep]}\`\n`;
    }
    markdown += `\n`;
  }

  const allModulesCount = summary.tsModules.length + summary.pythonModules.length;
  if (allModulesCount > 0) {
    markdown += `### Module Structure\n`;
    
    if (summary.tsModules.length > 0) {
      markdown += `#### TypeScript/JavaScript Modules\n`;
      for (const mod of summary.tsModules) {
        markdown += `- \`${mod.path}\`:\n`;
        if (mod.exports.length > 0) {
          markdown += `  - **Exports:** ${mod.exports.map(e => `\`${e}\``).join(', ')}\n`;
        }
        if (mod.classes.length > 0) {
          markdown += `  - **Classes:** ${mod.classes.map(c => `\`${c.name}\``).join(', ')}\n`;
        }
      }
      markdown += `\n`;
    }

    if (summary.pythonModules.length > 0) {
      markdown += `#### Python Modules\n`;
      for (const mod of summary.pythonModules) {
        markdown += `- \`${mod.path}\`:\n`;
        if (mod.classes.length > 0) {
          markdown += `  - **Classes:** ${mod.classes.map(c => `\`${c.name}\``).join(', ')}\n`;
        }
        if (mod.functions.length > 0) {
          markdown += `  - **Functions:** ${mod.functions.map(f => `\`${f}\``).join(', ')}\n`;
        }
      }
      markdown += `\n`;
    }
  }

  if (summary.todos.length > 0) {
    markdown += `### Active Todos\n`;
    for (const todo of summary.todos) {
      markdown += `- [${todo.file}:${todo.line}] **${todo.type}**: ${todo.text}\n`;
    }
    markdown += `\n`;
  }

  return markdown;
}
