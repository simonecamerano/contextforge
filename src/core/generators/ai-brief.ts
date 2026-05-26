import { ProjectSummary } from '../scanner/summarizer.js';

export function generateAIBrief(summary: ProjectSummary, tokenBudget: number): string {
  const CHARS_PER_TOKEN = 4;
  let markdown = `# AI Brief\n\n`;
  markdown += `This document contains an optimized summary of the project context for LLMs.\n\n`;

  markdown += `## Project Overview\n`;
  markdown += `- **Project:** ${summary.name}\n`;
  markdown += `- **Languages:** ${summary.languages.join(', ')}\n`;
  markdown += `- **Branch:** ${summary.gitBranch || 'not detected'}\n\n`;

  const estimatedCurrentTokens = () => Math.ceil(markdown.length / CHARS_PER_TOKEN);

  const deps = Object.keys(summary.dependencies);
  if (deps.length > 0) {
    markdown += `### Key Dependencies\n`;
    const budgetRemaining = tokenBudget - estimatedCurrentTokens();
    if (budgetRemaining > 150 && deps.length > 10) {
      const mainDeps = deps.slice(0, 8);
      for (const dep of mainDeps) {
        markdown += `- \`${dep}\`: \`${summary.dependencies[dep]}\`\n`;
      }
      markdown += `- *and ${deps.length - 8} other packages.*\n`;
    } else {
      for (const dep of deps) {
        markdown += `- \`${dep}\`: \`${summary.dependencies[dep]}\`\n`;
      }
    }
    markdown += `\n`;
  }

  const allModulesCount = summary.tsModules.length + summary.pythonModules.length;
  if (allModulesCount > 0) {
    markdown += `### Module Structure\n`;
    
    if (summary.tsModules.length > 0) {
      markdown += `#### TypeScript/JavaScript Modules\n`;
      for (const mod of summary.tsModules) {
        if (tokenBudget - estimatedCurrentTokens() < 200) {
          markdown += `- \`${mod.path}\`: (${mod.exports.length} exports)\n`;
          continue;
        }

        markdown += `- \`${mod.path}\`:\n`;
        if (mod.exports.length > 0) {
          const exportList = mod.exports.length > 5 
            ? `${mod.exports.slice(0, 4).map(e => `\`${e}\``).join(', ')} (+ ${mod.exports.length - 4} others)`
            : mod.exports.map(e => `\`${e}\``).join(', ');
          markdown += `  - **Exports:** ${exportList}\n`;
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
        if (tokenBudget - estimatedCurrentTokens() < 200) {
          markdown += `- \`${mod.path}\`: (${mod.exports.length} exports)\n`;
          continue;
        }

        markdown += `- \`${mod.path}\`:\n`;
        if (mod.classes.length > 0) {
          markdown += `  - **Classes:** ${mod.classes.map(c => `\`${c.name}\``).join(', ')}\n`;
        }
        if (mod.functions.length > 0) {
          const funcList = mod.functions.length > 5 
            ? `${mod.functions.slice(0, 4).map(f => `\`${f}\``).join(', ')} (+ ${mod.functions.length - 4} others)`
            : mod.functions.map(f => `\`${f}\``).join(', ');
          markdown += `  - **Functions:** ${funcList}\n`;
        }
      }
      markdown += `\n`;
    }
  }

  if (summary.todos.length > 0) {
    markdown += `### Active Todos\n`;
    const budgetRemaining = tokenBudget - estimatedCurrentTokens();
    if (budgetRemaining > 150 && summary.todos.length > 5) {
      const mainTodos = summary.todos.slice(0, 5);
      for (const todo of mainTodos) {
        markdown += `- [${todo.file}:${todo.line}] **${todo.type}**: ${todo.text}\n`;
      }
      markdown += `- *and ${summary.todos.length - 5} other todos in the code.*\n`;
    } else {
      for (const todo of summary.todos) {
        markdown += `- [${todo.file}:${todo.line}] **${todo.type}**: ${todo.text}\n`;
      }
    }
    markdown += `\n`;
  }

  const currentTokens = estimatedCurrentTokens();
  if (currentTokens > tokenBudget) {
    const allowedChars = tokenBudget * CHARS_PER_TOKEN;
    markdown = markdown.substring(0, allowedChars - 100) + '\n\n... [TRUNCATED - BUDGET LIMIT EXCEEDED]';
  }

  return markdown;
}
