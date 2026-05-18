import * as fs from 'fs';
import * as path from 'path';

interface EnvVar {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'url' | 'boolean';
  description: string;
  validator?: (value: string) => boolean;
}

const ENV_VARS: EnvVar[] = [
  {
    name: 'NODE_ENV',
    required: true,
    type: 'string',
    description: 'Node environment (development, production, test)',
    validator: (val) => ['development', 'production', 'test'].includes(val),
  },
  {
    name: 'PORT',
    required: true,
    type: 'number',
    description: 'Server port',
    validator: (val) => {
      const num = parseInt(val, 10);
      return num > 0 && num < 65535;
    },
  },
  {
    name: 'DATABASE_URL',
    required: true,
    type: 'url',
    description: 'Database connection string (MySQL)',
    validator: (val) => val.startsWith('mysql://') || val.startsWith('mysql2://'),
  },
  {
    name: 'JWT_SECRET',
    required: true,
    type: 'string',
    description: 'JWT secret for user tokens (minimum 32 characters)',
    validator: (val) => val.length >= 32,
  },
  {
    name: 'ADMIN_TOKEN_SECRET',
    required: true,
    type: 'string',
    description: 'JWT secret for admin tokens (minimum 32 characters)',
    validator: (val) => val.length >= 32,
  },
  {
    name: 'REFRESH_TOKEN_SECRET',
    required: true,
    type: 'string',
    description: 'JWT secret for refresh tokens (minimum 32 characters)',
    validator: (val) => val.length >= 32,
  },
  {
    name: 'ALLOWED_ORIGINS',
    required: false,
    type: 'string',
    description: 'CORS allowed origins (comma-separated)',
  },
  {
    name: 'LOG_LEVEL',
    required: false,
    type: 'string',
    description: 'Log level (debug, info, warn, error)',
    validator: (val) => ['debug', 'info', 'warn', 'error'].includes(val),
  },
];

interface ValidationResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
}

function loadEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: .env file not found at ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const env: Record<string, string> = {};

  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      env[key] = value.replace(/^["']|["']$/g, ''); // Remove quotes
    }
  });

  return env;
}

function validateEnvVar(envVar: EnvVar, env: Record<string, string>): ValidationResult {
  const value = env[envVar.name];

  if (!value) {
    if (envVar.required) {
      return {
        name: envVar.name,
        status: 'error',
        message: `Missing required variable: ${envVar.description}`,
      };
    }
    return {
      name: envVar.name,
      status: 'warning',
      message: `Optional variable not set`,
    };
  }

  // Type validation
  if (envVar.type === 'number') {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      return {
        name: envVar.name,
        status: 'error',
        message: `Expected number, got "${value}"`,
      };
    }
  }

  if (envVar.type === 'boolean') {
    if (!['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase())) {
      return {
        name: envVar.name,
        status: 'error',
        message: `Expected boolean (true/false), got "${value}"`,
      };
    }
  }

  if (envVar.type === 'url') {
    try {
      new URL(value);
    } catch {
      if (!value.startsWith('mysql://') && !value.startsWith('mysql2://')) {
        return {
          name: envVar.name,
          status: 'error',
          message: `Invalid URL format: ${value}`,
        };
      }
    }
  }

  // Custom validator
  if (envVar.validator && !envVar.validator(value)) {
    return {
      name: envVar.name,
      status: 'error',
      message: `Invalid value: ${envVar.description}`,
    };
  }

  return {
    name: envVar.name,
    status: 'success',
    message: `✓ Valid`,
  };
}

function printResult(result: ValidationResult) {
  const statusSymbol =
    result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️ ' : '❌';
  console.log(`${statusSymbol} ${result.name.padEnd(25)} ${result.message}`);
}

async function main() {
  const envPath = path.join(process.cwd(), '.env');

  console.log('\n🔍 BuildHub Environment Validation\n');
  console.log(`Checking .env file at: ${envPath}\n`);

  const env = loadEnvFile(envPath);
  const results: ValidationResult[] = [];

  let hasErrors = false;
  let hasWarnings = false;

  ENV_VARS.forEach((envVar) => {
    const result = validateEnvVar(envVar, env);
    results.push(result);

    if (result.status === 'error') hasErrors = true;
    if (result.status === 'warning') hasWarnings = true;

    printResult(result);
  });

  console.log('\n');

  // Summary
  const errorCount = results.filter((r) => r.status === 'error').length;
  const warningCount = results.filter((r) => r.status === 'warning').length;
  const successCount = results.filter((r) => r.status === 'success').length;

  console.log('─────────────────────────────────────────────────────────');
  console.log(`Results: ${successCount} valid, ${warningCount} warnings, ${errorCount} errors`);
  console.log('─────────────────────────────────────────────────────────\n');

  if (hasErrors) {
    console.log('❌ Environment validation FAILED');
    console.log('Please fix the errors above and try again.\n');
    process.exit(1);
  }

  if (hasWarnings) {
    console.log('⚠️  Environment validation completed with warnings');
    console.log('Some optional variables are not set.\n');
    process.exit(0);
  }

  console.log('✅ Environment validation successful!');
  console.log('All required variables are properly configured.\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('Validation error:', error.message);
  process.exit(1);
});
