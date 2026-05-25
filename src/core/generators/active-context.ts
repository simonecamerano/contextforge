import { ProjectSummary } from '../scanner/summarizer.js';

export function generateActiveContext(summary: ProjectSummary): string {
  let markdown = `# Active Context\n\n`;
  
  markdown += `## Git Status\n\n`;
  markdown += `- **Branch Corrente:** \`${summary.gitBranch || 'non rilevato'}\`\n\n`;
  
  markdown += `## Ultimi 10 Commit\n\n`;
  if (summary.gitCommits.length > 0) {
    for (const commit of summary.gitCommits) {
      markdown += `- \`${commit}\`\n`;
    }
    markdown += `\n`;
  } else {
    markdown += `Nessun commit recente trovato o repository Git non configurato.\n\n`;
  }

  markdown += `## Attività e Task nel Codice (TODO / FIXME)\n\n`;
  if (summary.todos.length > 0) {
    markdown += `| File | Linea | Tipo | Messaggio |\n|---|---|---|---|\n`;
    for (const todo of summary.todos) {
      markdown += `| [${todo.file}](file:///${todo.file}) | ${todo.line} | **${todo.type}** | ${todo.text} |\n`;
    }
  } else {
    markdown += `Nessun commento TODO o FIXME trovato nel codice.\n`;
  }

  return markdown;
}
