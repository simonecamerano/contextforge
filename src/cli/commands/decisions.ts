import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Command } from 'commander';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function registerDecisionsCommand(program: Command) {
  program
    .command('decisions')
    .description('Record a new technical decision (ADR) in the project memory')
    .option('-t, --title <title>', 'Decision title')
    .option('-c, --context <context>', 'Context and starting situation')
    .option('-d, --decision <decision>', 'The decision made')
    .option('-a, --alternatives <alternatives>', 'Alternatives considered')
    .option('-g, --consequences <consequences>', 'Consequences of the decision')
    .action(async (options) => {
      const cwd = process.cwd();
      const contextForgeDir = path.join(cwd, '.contextforge');
      const decisionsPath = path.join(contextForgeDir, 'technical-decisions.md');
      const activeContextPath = path.join(contextForgeDir, 'active-context.md');

      if (!fs.existsSync(contextForgeDir)) {
        console.error('Error: ContextForge is not initialized in this directory. Run "contextforge init" first.');
        process.exit(1);
      }

      let { title, context, decision, alternatives, consequences } = options;

      const rl = readline.createInterface({ input, output });

      try {
        if (!title) title = await rl.question('Decision title: ');
        if (!context) context = await rl.question('Context (What is the situation?): ');
        if (!decision) decision = await rl.question('Decision made: ');
        if (!alternatives) alternatives = await rl.question('Alternatives considered: ');
        if (!consequences) consequences = await rl.question('Consequences (Pros/Cons): ');
      } catch (err) {
        console.error('Error reading input:', err);
        rl.close();
        process.exit(1);
      } finally {
        rl.close();
      }

      title = title.trim();
      context = context.trim();
      decision = decision.trim();
      alternatives = alternatives.trim();
      consequences = consequences.trim();

      if (!title || !decision) {
        console.error('Error: Title and decision are required.');
        process.exit(1);
      }

      const todayStr = formatDate(new Date());
      const adrMarkdown = `
## [${todayStr}] ${title}

- **Stato:** Approved
- **Context:** ${context}
- **Decision:** ${decision}
- **Alternatives Considered:** ${alternatives}
- **Consequences:** ${consequences}
`;

      try {
        if (!fs.existsSync(decisionsPath)) {
          fs.writeFileSync(decisionsPath, `# Technical Decisions\n\nHistorical record of architectural decisions (ADR).\n`, 'utf8');
        }
        fs.appendFileSync(decisionsPath, adrMarkdown, 'utf8');
        console.log('Decision recorded successfully in .contextforge/technical-decisions.md');

        if (fs.existsSync(activeContextPath)) {
          let activeContext = fs.readFileSync(activeContextPath, 'utf8');
          const decisionLink = `- [${todayStr} - ${title}](file:///.contextforge/technical-decisions.md)`;
          
          if (activeContext.includes('## Recent Decisions')) {
            activeContext = activeContext.replace('## Recent Decisions\n', `## Recent Decisions\n\n${decisionLink}\n`);
          } else {
            const separator = activeContext.endsWith('\n') ? '' : '\n';
            activeContext += `${separator}\n## Recent Decisions\n\n${decisionLink}\n`;
          }
          
          fs.writeFileSync(activeContextPath, activeContext, 'utf8');
          console.log('Updated active-context.md with a link to the new decision.');
        }
      } catch (err) {
        console.error('Error writing to disk:', err);
        process.exit(1);
      }
    });
}
