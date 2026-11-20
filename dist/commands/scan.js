/**
 * Scan command - scan configured companies for job openings
 */
import { Command } from 'commander';
import { runScan } from '../core/scanner.js';
import chalk from 'chalk';
import ora from 'ora';
export const scanCommand = new Command('scan')
    .description('Scan configured companies for job openings')
    .option('--dry-run', 'Preview scan without saving to database')
    .option('--company <name>', 'Scan only a specific company')
    .option('--limit <number>', 'Limit number of companies to scan')
    .option('--json', 'Output results as JSON')
    .action(async (options) => {
    const spinner = ora('Starting scan...').start();
    try {
        const result = await runScan({
            dryRun: options.dryRun,
            singleCompany: options.company,
            limit: options.limit ? parseInt(options.limit, 10) : undefined
        });
        spinner.stop();
        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        // Pretty output
        console.log(chalk.cyan('\n═══════════════════════════════════════'));
        console.log(chalk.cyan('  Scan Complete'));
        console.log(chalk.cyan('═══════════════════════════════════════\n'));
        console.log(`  ${chalk.bold('Companies scanned:')} ${result.companiesScanned}`);
        console.log(`  ${chalk.bold('Jobs found:')}      ${result.jobsFound}`);
        console.log(`  ${chalk.green('New jobs:')}        ${result.jobsNew}`);
        console.log(`  ${chalk.yellow('Filtered:')}        ${result.jobsFiltered}`);
        console.log(`  ${chalk.gray('Duplicates:')}      ${result.jobsDuplicate}`);
        console.log(`  ${chalk.bold('Duration:')}        ${(result.durationMs / 1000).toFixed(1)}s`);
        if (result.errors.length > 0) {
            console.log(chalk.red(`\n  Errors (${result.errors.length}):`));
            for (const err of result.errors) {
                console.log(chalk.red(`    • ${err}`));
            }
        }
        if (result.jobsNew > 0 && !options.dryRun) {
            console.log(chalk.green(`\n  ✅ ${result.jobsNew} new jobs saved to database`));
            console.log(chalk.gray('  Run "career-ops dashboard" to view them'));
        }
        else if (options.dryRun) {
            console.log(chalk.yellow('\n  Dry run - no data saved'));
        }
    }
    catch (error) {
        spinner.fail('Scan failed');
        throw error;
    }
});
//# sourceMappingURL=scan.js.map