/**
 * Companies command - manage configured companies
 */
import { Command } from 'commander';
import { getDatabase } from '../core/database.js';
import { getConfig } from '../core/config.js';
import chalk from 'chalk';
import { join } from 'path';
export const companiesCommand = new Command('companies')
    .description('Manage companies to scan')
    .addCommand(new Command('list')
    .description('List all configured companies')
    .option('--enabled-only', 'Show only enabled companies')
    .action((options) => {
    const config = getConfig();
    const db = await getDatabase(config.getDataDir());
    const companies = db.getCompanies(!options.enabledOnly);
    if (companies.length === 0) {
        console.log(chalk.yellow('No companies configured. Add with "career-ops companies add"'));
        return;
    }
    console.log(chalk.cyan('\n═══════════════════════════════════════'));
    console.log(chalk.cyan('  Configured Companies'));
    console.log(chalk.cyan('═══════════════════════════════════════\n'));
    for (const company of companies) {
        const status = company.enabled ? chalk.green('●') : chalk.gray('○');
        const provider = company.provider ? chalk.blue(` [${company.provider}]`) : '';
        console.log(`  ${status} ${chalk.bold(company.name)}${provider}`);
        if (company.provider_id)
            console.log(`     ID: ${chalk.gray(company.provider_id)}`);
        if (company.careers_url)
            console.log(`     URL: ${chalk.gray(company.careers_url)}`);
        console.log();
    }
}))
    .addCommand(new Command('add')
    .description('Add a new company to scan')
    .argument('<name>', 'Company name')
    .option('-p, --provider <provider>', 'Provider (darwinbox, keka, zoho-recruit, freshteam, peoplestrong, sumhr, greenhouse, lever, workday, icims, bamboohr, jobvite, successfactors, oraclecloud, adp)')
    .option('-i, --provider-id <id>', 'Provider-specific ID (tenant, board token, digest, etc.)')
    .option('-u, --url <url>', 'Careers page URL')
    .option('--disabled', 'Add as disabled')
    .action((name, options) => {
    if (!options.provider) {
        console.error(chalk.red('Error: --provider is required'));
        process.exit(1);
    }
    const config = getConfig();
    const db = await getDatabase(config.getDataDir());
    const id = db.insertCompany({
        name,
        provider: options.provider,
        provider_id: options.providerId,
        careers_url: options.url,
        enabled: !options.disabled
    });
    console.log(chalk.green(`✅ Added company #${id}: ${name}`));
    console.log(chalk.gray(`   Provider: ${options.provider}`));
    if (options.providerId)
        console.log(chalk.gray(`   Provider ID: ${options.providerId}`));
    if (options.url)
        console.log(chalk.gray(`   URL: ${options.url}`));
    // Update config file
    updateConfigFile(config, name, options);
}))
    .addCommand(new Command('remove')
    .description('Remove a company')
    .argument('<name>', 'Company name')
    .action((name) => {
    const config = getConfig();
    const db = await getDatabase(config.getDataDir());
    const company = db.getCompanyByName(name);
    if (!company) {
        console.error(chalk.red(`Company not found: ${name}`));
        process.exit(1);
    }
    db.deleteCompany(company.id);
    console.log(chalk.green(`✅ Removed company: ${name}`));
    // Update config file
    removeFromConfigFile(config, name);
}))
    .addCommand(new Command('enable')
    .description('Enable a company')
    .argument('<name>', 'Company name')
    .action((name) => {
    const config = getConfig();
    const db = await getDatabase(config.getDataDir());
    const company = db.getCompanyByName(name);
    if (!company) {
        console.error(chalk.red(`Company not found: ${name}`));
        process.exit(1);
    }
    db.updateCompany(company.id, { enabled: true });
    console.log(chalk.green(`✅ Enabled: ${name}`));
}))
    .addCommand(new Command('disable')
    .description('Disable a company')
    .argument('<name>', 'Company name')
    .action((name) => {
    const config = getConfig();
    const db = await getDatabase(config.getDataDir());
    const company = db.getCompanyByName(name);
    if (!company) {
        console.error(chalk.red(`Company not found: ${name}`));
        process.exit(1);
    }
    db.updateCompany(company.id, { enabled: false });
    console.log(chalk.yellow(`⏸️ Disabled: ${name}`));
}));
function updateConfigFile(config, name, options) {
    try {
        const configPath = config['configPath'] || join(process.cwd(), 'config', 'user.yml');
        // This would need proper config file handling - simplified for now
    }
    catch { }
}
function removeFromConfigFile(config, name) {
    try {
        const configPath = config['configPath'] || join(process.cwd(), 'config', 'user.yml');
        // This would need proper config file handling - simplified for now
    }
    catch { }
}
//# sourceMappingURL=companies.js.map