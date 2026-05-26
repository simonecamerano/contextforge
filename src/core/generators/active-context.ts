import path from 'node:path';
import { ProjectSummary } from '../scanner/summarizer.js';
import type { RoadmapItem } from '../scanner/summarizer.js';

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


  if (summary.roadmap.length > 0) {
    const done = summary.roadmap.filter((item) => item.done).length;
    const total = summary.roadmap.length;
    const pct = Math.round((done / total) * 100);

    markdown += `\n## Roadmap\n\n`;
    markdown += `**Progress:** ${done}/${total} tasks completed (${pct}%)\n\n`;

    const sections = new Map<string | undefined, RoadmapItem[]>();
    for (const item of summary.roadmap) {
      if (!sections.has(item.section)) sections.set(item.section, []);
      sections.get(item.section)!.push(item);
    }

    for (const [section, items] of sections) {
      if (section) {
        markdown += `### ${section}\n`;
      }
      for (const item of items) {
        markdown += `- [${item.done ? 'x' : ' '}] ${item.text}\n`;
      }
      markdown += '\n';
    }
  }

  return markdown;
}
