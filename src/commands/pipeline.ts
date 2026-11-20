/**
 * Pipeline command - manage manual job entries
 */

import { Command } from 'commander';
import { getDatabase } from '../core/database.js';
import { getConfig } from '../core/config.js';
import chalk from 'chalk';

export const pipelineCommand = new Command('pipeline')
  .description('Manage manual job entries (pipeline)')
  .addCommand(
    new Command('list')
      .description('List all pipeline entries')
      .action(() => {
        const config = getConfig();
        const db = await getDatabase(config.getDataDir());
        const entries = db.getPipelineEntries();

        if (entries.length === 0) {
          console.log(chalk.yellow('No pipeline entries. Add with "career-ops pipeline add"'));
          return;
        }

        console.log(chalk.cyan('\n═══════════════════════════════════════'));
        console.log(chalk.cyan('  Pipeline Entries'));
        console.log(chalk.cyan('═══════════════════════════════════════\n'));

        for (const entry of entries) {
          const status = entry.checked ? chalk.green('✓') : chalk.gray('○');
          console.log(`  ${status} ${chalk.bold(entry.company || 'Unknown')} — ${entry.title || 'Untitled'}`);
          console.log(`     ${chalk.gray(entry.url)}`);
          if (entry.notes) console.log(`     ${chalk.gray(entry.notes)}`);
          console.log();
        }
      })
  )
  .addCommand(
    new Command('add')
      .description('Add a new pipeline entry')
      .argument('<url>', 'Job URL or local reference')
      .option('-c, --company <name>', 'Company name')
      .option('-t, --title <title>', 'Job title')
      .option('-l, --location <location>', 'Location')
      .option('-n, --notes <notes>', 'Additional notes')
      .action((url, options) => {
        const config = getConfig();
        const db = await getDatabase(config.getDataDir());

        const id = db.addPipelineEntry({
          url,
          company: options.company,
          title: options.title,
          location: options.location,
          notes: options.notes
        });

        console.log(chalk.green(`✅ Added pipeline entry #${id}`));
        console.log(chalk.gray(`   ${url}`));
      })
  )
  .addCommand(
    new Command('remove')
      .description('Remove a pipeline entry')
      .argument('<id>', 'Entry ID')
      .action((id) => {
        const config = getConfig();
        const db = await getDatabase(config.getDataDir());

        db.removePipelineEntry(parseInt(id, 10));
        console.log(chalk.green(`✅ Removed pipeline entry #${id}`));
      })
  )
  .addCommand(
    new Command('check')
      .description('Mark a pipeline entry as processed')
      .argument('<id>', 'Entry ID')
      .action((id) => {
        const config = getConfig();
        const db = await getDatabase(config.getDataDir());

        db.updatePipelineEntryChecked(parseInt(id, 10), true);
        console.log(chalk.green(`✅ Marked entry #${id} as processed`));
      })
  );