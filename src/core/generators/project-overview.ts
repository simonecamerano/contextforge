import { ProjectSummary } from '../scanner/summarizer.js';

export function generateProjectOverview(summary: ProjectSummary): string {
  let markdown = `# Project Overview\n\n`;
  markdown += `- **Project Name:** ${summary.name}\n`;
  markdown += `- **Version:** ${summary.version}\n`;
  markdown += `- **Languages:** ${summary.languages.join(', ')}\n\n`;

  markdown += `## Scripts\n\n`;
  if (Object.keys(summary.scripts).length > 0) {
    markdown += `| Script | Command |\n|---|---|\n`;
    for (const [name, cmd] of Object.entries(summary.scripts)) {
      markdown += `| \`${name}\` | \`${cmd}\` |\n`;
    }
    markdown += `\n`;
  } else {
    markdown += `Nessuno script configurato.\n\n`;
  }

  markdown += `## Dependencies\n\n`;
  if (Object.keys(summary.dependencies).length > 0) {
    markdown += `### Production Dependencies\n\n`;
    for (const [name, ver] of Object.entries(summary.dependencies)) {
      markdown += `- \`${name}\`: \`${ver}\`\n`;
    }
    markdown += `\n`;
  }

  if (Object.keys(summary.devDependencies).length > 0) {
    markdown += `### Dev Dependencies\n\n`;
    for (const [name, ver] of Object.entries(summary.devDependencies)) {
      markdown += `- \`${name}\`: \`${ver}\`\n`;
    }
    markdown += `\n`;
  }

  return markdown;
}
