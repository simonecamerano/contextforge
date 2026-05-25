import { Command } from 'commander';
import { registerInitCommand } from './commands/init.js';
import { registerScanCommand } from './commands/scan.js';
import { registerDecisionsCommand } from './commands/decisions.js';
import { registerUpdateCommand } from './commands/update.js';
import { registerBriefCommand } from './commands/brief.js';
import { registerAskCommand } from './commands/ask.js';

const program = new Command();

program
  .name('contextforge')
  .description('Local-first project memory engine for developers and AI agents')
  .version('0.1.0');

registerInitCommand(program);
registerScanCommand(program);
registerDecisionsCommand(program);
registerUpdateCommand(program);
registerBriefCommand(program);
registerAskCommand(program);

program.parse(process.argv);
