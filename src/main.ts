/**
 * Career-Ops v2 - Main CLI Entry Point
 * Unified local-first job search platform for India
 */

import { program } from 'commander';
import { scanCommand } from './commands/scan.js';
import { dashboardCommand } from './commands/dashboard.js';
import { pipelineCommand } from './commands/pipeline.js';
import { companiesCommand } from './commands/companies.js';
import { configCommand } from './commands/config.js';
import { getConfig, resetConfig } from './core/config.js';
import { getDatabase, JobDatabase } from './core/database.js';
import { JobDatabase } from './core/database.js';

// Ensure config is loaded early
getConfig();

program
  .name('career-ops')
  .description('Unified local-first job search platform for India - discovers real openings from recruiter-preferred ATS platforms')
  .version('2.0.0')
  .helpOption('-h, --help', 'Display help for command')
  .hook('preAction', (thisCommand, actionCommand) => {
    // Reload config if path changed
    if (actionCommand.opts().config) {
      resetConfig();
    }
  });

program
  .option('-c, --config <path>', 'Path to config file')
  .option('-d, --data-dir <path>', 'Data directory override')
  .option('-o, --output-dir <path>', 'Output directory override')
  .option('-v, --verbose', 'Verbose output');

// Register commands
program.addCommand(scanCommand);
program.addCommand(dashboardCommand);
program.addCommand(pipelineCommand);
program.addCommand(companiesCommand);
program.addCommand(configCommand);

// Global error handler
program.exitOverride((err) => {
  if (err.code === 'commander.helpDisplayed' || err.code === 'commander.versionDisplayed') {
    process.exit(0);
  }
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});

// Import chalk for error output
import chalk from 'chalk';

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}