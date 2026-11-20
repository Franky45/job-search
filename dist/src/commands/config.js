/**
 * Config command - view and manage configuration
 */
import { Command } from 'commander';
import { getConfig } from '../core/config.js';
import chalk from 'chalk';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
export const configCommand = new Command('config')
    .description('View and manage configuration')
    .addCommand(new Command('show')
    .description('Show effective configuration')
    .option('--json', 'Output as JSON')
    .action((options) => {
    const config = getConfig();
    const cfg = config.getConfig();
    if (options.json) {
        console.log(JSON.stringify(cfg, null, 2));
        return;
    }
    console.log(chalk.cyan('\n═══════════════════════════════════════'));
    console.log(chalk.cyan('  Configuration'));
    console.log(chalk.cyan('═══════════════════════════════════════\n'));
    console.log(`  ${chalk.bold('Data directory:')}     ${cfg.data_dir}`);
    console.log(`  ${chalk.bold('Output directory:')}   ${cfg.output_dir}`);
    console.log(`  ${chalk.bold('Companies configured:')} ${cfg.companies.length}`);
    console.log(chalk.bold('\n  Scan settings:'));
    console.log(`    ${chalk.gray('Concurrency:')}        ${cfg.scan.concurrency}`);
    console.log(`    ${chalk.gray('Max age (days):')}     ${cfg.scan.max_age_days}`);
    console.log(`    ${chalk.gray('Experience stretch:')}  ${cfg.scan.experience_stretch_years} years`);
    console.log(`    ${chalk.gray('Max experience:')}     ${cfg.scan.experience_max_years} years`);
    console.log(`    ${chalk.gray('Title filter +:')}      ${cfg.scan.title_filter.positive.join(', ') || '(none)'}`);
    console.log(`    ${chalk.gray('Title filter -:')}      ${cfg.scan.title_filter.negative.join(', ') || '(none)'}`);
    console.log(`    ${chalk.gray('Location allow:')}     ${cfg.scan.location_filter.allow.join(', ') || '(none)'}`);
    console.log(`    ${chalk.gray('Location block:')}     ${cfg.scan.location_filter.block.join(', ') || '(none)'}`);
}))
    .addCommand(new Command('init')
    .description('Create default configuration file')
    .option('-f, --force', 'Overwrite existing config')
    .action((options) => {
    const config = getConfig();
    const configPath = config['configPath'] || join(process.cwd(), 'config', 'user.yml');
    if (existsSync(configPath) && !options.force) {
        console.error(chalk.red(`Config file already exists: ${configPath}`));
        console.error(chalk.gray('Use --force to overwrite'));
        process.exit(1);
    }
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    const defaultConfig = `# Career-Ops v2 Configuration
# Copy this file to ~/.config/career-ops/user.yml and customize

data_dir: "~/.local/share/career-ops"
output_dir: "~/.local/share/career-ops/output"

scan:
  concurrency: 8
  max_age_days: 30
  experience_stretch_years: 2
  experience_max_years: 15
  title_filter:
    positive:
      - "Senior"
      - "Lead"
      - "Principal"
      - "Staff"
      - "Engineer"
      - "Developer"
      - "Architect"
      - "Manager"
    negative:
      - "Intern"
      - "Junior"
      - "Entry"
      - "Trainee"
      - "Graduate"
      - "Fresher"
  location_filter:
    allow:
      - "Bangalore"
      - "Bengaluru"
      - "Hyderabad"
      - "Pune"
      - "Chennai"
      - "Mumbai"
      - "Delhi"
      - "Gurgaon"
      - "Noida"
      - "Remote"
    block: []

companies:
  # Example companies - customize for your targets
  - name: "Tata Consultancy Services"
    provider: "darwinbox"
    provider_id: "tcs"
  - name: "Infosys"
    provider: "darwinbox"
    provider_id: "infosys"
  - name: "Wipro"
    provider: "peoplestrong"
    provider_id: "wipro"
`;
    writeFileSync(configPath, defaultConfig, 'utf-8');
    console.log(chalk.green(`✅ Created config file: ${configPath}`));
    console.log(chalk.gray('Edit this file to add your target companies and customize filters'));
}))
    .addCommand(new Command('path')
    .description('Show configuration file path')
    .action(() => {
    const config = getConfig();
    console.log(config['configPath'] || 'Using defaults (no config file found)');
}));
// Store config path for other commands
const originalGetConfig = getConfig;
getConfig = ((path) => {
    const instance = originalGetConfig(path);
    instance['configPath'] = path || join(process.cwd(), 'config', 'user.yml');
    return instance;
});
//# sourceMappingURL=config.js.map