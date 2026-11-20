#!/usr/bin/env tsx
/**
 * Career-Ops v2 Setup Script
 * One-shot install for fresh machines
 */

import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(homedir(), '.local', 'share', 'career-ops');
const CONFIG_DIR = join(homedir(), '.config', 'career-ops');
const CONFIG_PATH = join(CONFIG_DIR, 'user.yml');

async function main(): Promise<void> {
  console.log(chalk.cyan('\n═══════════════════════════════════════'));
  console.log(chalk.cyan('  Career-Ops v2 Setup'));
  console.log(chalk.cyan('═══════════════════════════════════════\n'));

  // 1. Check Node.js
  const spinner = ora('Checking Node.js...').start();
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
    const major = parseInt(nodeVersion.slice(1).split('.')[0], 10);
    if (major < 20) {
      spinner.fail(`Node.js ${nodeVersion} found, but v20+ required`);
      process.exit(1);
    }
    spinner.succeed(`Node.js ${nodeVersion} found`);
  } catch {
    spinner.fail('Node.js not found. Please install Node.js 20+');
    process.exit(1);
  }

  // 2. Install dependencies
  const depSpinner = ora('Installing dependencies...').start();
  try {
    execSync('npm ci', { cwd: __dirname, stdio: 'pipe' });
    depSpinner.succeed('Dependencies installed');
  } catch {
    depSpinner.warn('npm ci failed, trying npm install...');
    try {
      execSync('npm install', { cwd: __dirname, stdio: 'pipe' });
      depSpinner.succeed('Dependencies installed');
    } catch {
      depSpinner.fail('Failed to install dependencies');
      process.exit(1);
    }
  }

  // 3. Build TypeScript
  const buildSpinner = ora('Building TypeScript...').start();
  try {
    execSync('npm run build', { cwd: __dirname, stdio: 'pipe' });
    buildSpinner.succeed('TypeScript compiled');
  } catch {
    buildSpinner.fail('Build failed');
    process.exit(1);
  }

  // 4. Create data directory
  const dataSpinner = ora('Creating data directory...').start();
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(join(DATA_DIR, 'output'), { recursive: true });
  dataSpinner.succeed(`Data directory: ${DATA_DIR}`);

  // 5. Create config directory and default config
  const configSpinner = ora('Creating configuration...').start();
  mkdirSync(CONFIG_DIR, { recursive: true });

  if (!existsSync(CONFIG_PATH)) {
    const defaultConfig = `# Career-Ops v2 Configuration
# Edit this file to add your target companies and customize filters

data_dir: "${DATA_DIR}"
output_dir: "${join(DATA_DIR, 'output')}"

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
  # Example Indian companies using Darwinbox/Keka/Zoho
  - name: "Tata Consultancy Services"
    provider: "darwinbox"
    provider_id: "tcs"
  - name: "Infosys"
    provider: "darwinbox"
    provider_id: "infosys"
  - name: "Wipro"
    provider: "peoplestrong"
    provider_id: "wipro"
  - name: "HCL Technologies"
    provider: "workday"
    provider_id: "hcl"
  - name: "Tech Mahindra"
    provider: "darwinbox"
    provider_id: "techm"
`;

    writeFileSync(CONFIG_PATH, defaultConfig, 'utf-8');
    configSpinner.succeed(`Config created: ${CONFIG_PATH}`);
  } else {
    configSpinner.info(`Config exists: ${CONFIG_PATH}`);
  }

  // 6. Initialize database (first run)
  const dbSpinner = ora('Initializing database...').start();
  try {
    execSync('node dist/main.js scan --dry-run', {
      cwd: __dirname,
      stdio: 'pipe',
      env: { ...process.env, CAREER_OPS_CONFIG: CONFIG_PATH }
    });
    dbSpinner.succeed('Database initialized');
  } catch {
    dbSpinner.warn('Initial scan had issues (expected on first run)');
  }

  // 7. Add to PATH suggestion
  const binPath = join(__dirname, 'dist', 'main.js');
  console.log(chalk.green('\n✅ Setup complete!\n'));
  console.log(chalk.bold('Next steps:'));
  console.log(`  1. Edit your companies and filters:`);
  console.log(chalk.gray(`     ${CONFIG_PATH}`));
  console.log(`  2. Run your first scan:`);
  console.log(chalk.cyan(`     career-ops scan`));
  console.log(`  3. Generate dashboard:`);
  console.log(chalk.cyan(`     career-ops dashboard`));
  console.log(`  4. Open the HTML file in your browser`);

  console.log(chalk.bold('\nTo run from anywhere, add to your shell config:'));
  const shell = process.env.SHELL || '';
  if (shell.includes('zsh')) {
    console.log(chalk.gray(`  echo 'export PATH="$PATH:${__dirname}"' >> ~/.zshrc`));
    console.log(chalk.gray(`  echo 'alias career-ops="node ${binPath}"' >> ~/.zshrc`));
  } else if (shell.includes('bash')) {
    console.log(chalk.gray(`  echo 'export PATH="$PATH:${__dirname}"' >> ~/.bashrc`));
    console.log(chalk.gray(`  echo 'alias career-ops="node ${binPath}"' >> ~/.bashrc`));
  } else {
    console.log(chalk.gray(`  Add ${__dirname} to your PATH`));
  }
}

main().catch(error => {
  console.error(chalk.red('\n❌ Setup failed:'), error.message);
  process.exit(1);
});