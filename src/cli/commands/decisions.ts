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
    .description('Registra una nuova decisione tecnica (ADR) nella memoria di progetto')
    .option('-t, --title <title>', 'Titolo della decisione')
    .option('-c, --context <context>', 'Contesto e situazione di partenza')
    .option('-d, --decision <decision>', 'La decisione presa')
    .option('-a, --alternatives <alternatives>', 'Alternative considerate')
    .option('-g, --consequences <consequences>', 'Conseguenze della decisione')
    .action(async (options) => {
      const cwd = process.cwd();
      const contextForgeDir = path.join(cwd, '.contextforge');
      const decisionsPath = path.join(contextForgeDir, 'technical-decisions.md');
      const activeContextPath = path.join(contextForgeDir, 'active-context.md');

      if (!fs.existsSync(contextForgeDir)) {
        console.error('Errore: ContextForge non è inizializzato in questa directory. Esegui prima "contextforge init".');
        process.exit(1);
      }

      let { title, context, decision, alternatives, consequences } = options;

      const rl = readline.createInterface({ input, output });

      try {
        if (!title) title = await rl.question('Titolo della decisione: ');
        if (!context) context = await rl.question('Contesto (Qual è la situazione?): ');
        if (!decision) decision = await rl.question('Decisione presa: ');
        if (!alternatives) alternatives = await rl.question('Alternative considerate: ');
        if (!consequences) consequences = await rl.question('Conseguenze (Vantaggi/Svantaggi): ');
      } catch (err) {
        console.error('Errore durante la lettura dell\'input:', err);
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
        console.error('Errore: Il titolo e la decisione sono obbligatori.');
        process.exit(1);
      }

      const todayStr = formatDate(new Date());
      const adrMarkdown = `
## [${todayStr}] ${title}

- **Stato:** Approved
- **Contesto:** ${context}
- **Decisione:** ${decision}
- **Alternative Considerate:** ${alternatives}
- **Conseguenze:** ${consequences}
`;

      try {
        if (!fs.existsSync(decisionsPath)) {
          fs.writeFileSync(decisionsPath, `# Technical Decisions\n\nRegistro storico delle decisioni architetturali (ADR).\n`, 'utf8');
        }
        fs.appendFileSync(decisionsPath, adrMarkdown, 'utf8');
        console.log('Decisione registrata con successo in .contextforge/technical-decisions.md');

        if (fs.existsSync(activeContextPath)) {
          let activeContext = fs.readFileSync(activeContextPath, 'utf8');
          const decisionLink = `- [${todayStr} - ${title}](file:///.contextforge/technical-decisions.md)`;
          
          if (activeContext.includes('## Ultime Decisioni')) {
            activeContext = activeContext.replace('## Ultime Decisioni\n', `## Ultime Decisioni\n\n${decisionLink}\n`);
          } else {
            const separator = activeContext.endsWith('\n') ? '' : '\n';
            activeContext += `${separator}\n## Ultime Decisioni\n\n${decisionLink}\n`;
          }
          
          fs.writeFileSync(activeContextPath, activeContext, 'utf8');
          console.log('Aggiornato active-context.md con un link alla nuova decisione.');
        }
      } catch (err) {
        console.error('Errore durante la scrittura su disco:', err);
        process.exit(1);
      }
    });
}
