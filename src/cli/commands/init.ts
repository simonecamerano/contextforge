import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';

export function registerInitCommand(program: Command) {
  program
    .command('init')
    .description('Inizializza ContextForge nel repository corrente')
    .action(() => {
      const cwd = process.cwd();
      const contextForgeDir = path.join(cwd, '.contextforge');
      const localDir = path.join(contextForgeDir, 'local');
      
      if (fs.existsSync(contextForgeDir)) {
        console.warn('Avviso: La cartella .contextforge esiste già in questo repository.');
        return;
      }

      try {
        fs.mkdirSync(contextForgeDir, { recursive: true });
        fs.mkdirSync(localDir, { recursive: true });
        console.log('Creata directory .contextforge/ e .contextforge/local/');

        const markdownFiles = {
          'project-overview.md': '# Project Overview\n\nPanoramica generale del progetto, descrizione e tecnologie.',
          'architecture.md': '# Architecture\n\nStruttura dei moduli e decisioni architetturali principali.',
          'active-context.md': '# Active Context\n\nStato corrente del lavoro, branch attivo e TODO estratti.',
          'coding-rules.md': '# Coding Rules\n\nLinee guida per la scrittura del codice e stili del progetto.',
          'technical-decisions.md': '# Technical Decisions\n\nRegistro storico delle decisioni architetturali (ADR).',
          'open-questions.md': '# Open Questions\n\nDomande aperte, bug tracciati e punti da chiarire.',
          'ai-brief.md': '# AI Brief\n\nBrief sintetizzato e ottimizzato per il contesto degli LLM.'
        };

        for (const [filename, content] of Object.entries(markdownFiles)) {
          const filePath = path.join(contextForgeDir, filename);
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`Creato file di memoria: .contextforge/${filename}`);
        }

        const gitignorePath = path.join(cwd, '.gitignore');
        const ignoreLine = '.contextforge/local/';

        if (fs.existsSync(gitignorePath)) {
          const content = fs.readFileSync(gitignorePath, 'utf8');
          if (!content.includes(ignoreLine)) {
            const separator = content.endsWith('\n') ? '' : '\n';
            fs.writeFileSync(gitignorePath, `${content}${separator}${ignoreLine}\n`, 'utf8');
            console.log('Aggiornato .gitignore con la directory locale di ContextForge.');
          }
        } else {
          fs.writeFileSync(gitignorePath, `${ignoreLine}\n`, 'utf8');
          console.log('Creato file .gitignore con la directory locale di ContextForge.');
        }

        console.log('\nInizializzazione completata! ContextForge è pronto.');
      } catch (error) {
        console.error('Errore durante l\'inizializzazione:', error);
        process.exit(1);
      }
    });
}
