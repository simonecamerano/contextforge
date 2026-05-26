import path from 'node:path';
import { ProjectSummary } from '../scanner/summarizer.js';

export function generateActiveContext(summary: ProjectSummary): string {
  let markdown = `# Active Context\n\n`;
  
  markdown += `## Git Status\n\n`;
  markdown += `- **Current Branch:** \`${summary.gitBranch || 'not detected'}\`\n\n`;
  
  markdown += `## Recent 10 Commits\n\n`;
  if (summary.gitCommits.length > 0) {
    for (const commit of summary.gitCommits) {
      markdown += `- \`${commit}\`\n`;
    }
    markdown += `\n`;
  } else {
    markdown += `No recent commits found or Git repository not configured.\n\n`;
  }

  markdown += `## Active Tasks in Code (TODO / FIXME)\n\n`;
  if (summary.todos.length > 0) {
    markdown += `| File | Line | Type | Message |\n|---|---|---|---|\n`;
    for (const todo of summary.todos) {
      const absPath = path.resolve(summary.projectRoot, todo.file).replace(/\\/g, '/');
      const fileUrl = `file://${absPath.startsWith('/') ? '' : '/'}${absPath}`;
      markdown += `| [${todo.file}](${fileUrl}) | ${todo.line} | **${todo.type}** | ${todo.text} |\n`;
    }
  } else {
    markdown += `No TODO or FIXME comments found in the code.\n`;
  }

  return markdown;
}
