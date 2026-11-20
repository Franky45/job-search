/**
 * Dashboard command - generate HTML dashboard from database
 */

import { Command } from 'commander';
import { getDatabase } from '../core/database.js';
import { getConfig } from '../core/config.js';
import { renderDashboard } from '../output/html.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

export const dashboardCommand = new Command('dashboard')
  .description('Generate HTML dashboard from scanned jobs')
  .option('-o, --output <path>', 'Output file path')
  .option('--status <status>', 'Filter by status (new, evaluated, applied, etc.)')
  .option('--company <name>', 'Filter by company name')
  .option('--limit <number>', 'Limit number of jobs')
  .option('--open', 'Open in browser after generation')
  .action(async (options) => {
    const spinner = ora('Generating dashboard...').start();

    try {
      const config = getConfig();
      const db = await getDatabase(config.getDataDir());

      // Build filters
      const filters: any = {};
      if (options.status) filters.status = options.status;
      if (options.company) filters.company = options.company;
      if (options.limit) filters.limit = parseInt(options.limit, 10);

      const jobs = db.getJobs(filters);
      const scanRuns = db.getScanRuns(10);

      // Determine output path
      let outputPath = options.output;
      if (!outputPath) {
        const today = new Date().toISOString().split('T')[0];
        const outputDir = config.getOutputDir();
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }
        outputPath = join(outputDir, `jobs-${today}.html`);
      }

      // Render and save
      const html = renderDashboard(jobs, scanRuns, {
        generatedAt: new Date().toISOString(),
        totalJobs: jobs.length,
        filters: options
      });

      writeFileSync(outputPath, html, 'utf-8');
      spinner.succeed('Dashboard generated');

      console.log(chalk.cyan('\n═══════════════════════════════════════'));
      console.log(chalk.cyan('  Dashboard Ready'));
      console.log(chalk.cyan('═══════════════════════════════════════\n'));
      console.log(`  ${chalk.bold('Jobs displayed:')} ${jobs.length}`);
      console.log(`  ${chalk.bold('Output:')}         ${chalk.underline(outputPath)}`);

      // Open in browser if requested
      if (options.open) {
        const open = (await import('open')).default;
        await open(outputPath);
        console.log(chalk.green('  🌐 Opened in browser'));
      } else {
        console.log(chalk.gray('\n  Open the file in your browser to view the dashboard'));
      }
    } catch (error) {
      spinner.fail('Dashboard generation failed');
      throw error;
    }
  });