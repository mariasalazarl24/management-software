import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface CreateAdminArgs {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

async function parseArgs(): Promise<CreateAdminArgs> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    throw new Error(
      'Usage: npx ts-node scripts/create-admin-user.ts <email> <password> [firstName] [lastName]',
    );
  }

  if (args.length < 2) {
    throw new Error(
      'Missing required arguments. Usage: npx ts-node scripts/create-admin-user.ts <email> <password> [firstName] [lastName]',
    );
  }

  const email = args[0];
  const password = args[1];
  const firstName = args[2] || 'Admin';
  const lastName = args[3] || 'User';

  if (!validateEmail(email)) {
    throw new Error(`Invalid email format: ${email}`);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new Error(`Password validation failed:\n${passwordValidation.errors.join('\n')}`);
  }

  return { email, password, firstName, lastName };
}

async function createAdminUser(args: CreateAdminArgs) {
  // Check if user already exists
  const existingUser = await prisma.buildHubAdminUser.findUnique({
    where: { email: args.email },
  });

  if (existingUser) {
    throw new Error(`Admin user with email ${args.email} already exists`);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(args.password, 10);

  // Create admin user
  const adminUser = await prisma.buildHubAdminUser.create({
    data: {
      email: args.email,
      password: hashedPassword,
      firstName: args.firstName || 'Admin',
      lastName: args.lastName || 'User',
      role: 'SUPERADMIN',
      status: 'ACTIVE',
    },
  });

  return adminUser;
}

async function main() {
  try {
    console.log('🔧 BuildHub Admin User Setup\n');

    const args = await parseArgs();
    console.log(`📧 Creating admin user: ${args.email}`);
    console.log(`👤 Name: ${args.firstName} ${args.lastName}\n`);

    const adminUser = await createAdminUser(args);

    console.log('✅ Admin user created successfully!\n');
    console.log('📋 User Details:');
    console.log(`  ID: ${adminUser.id}`);
    console.log(`  Email: ${adminUser.email}`);
    console.log(`  Role: ${adminUser.role}`);
    console.log(`  Status: ${adminUser.status}`);
    console.log(`  Created: ${adminUser.createdAt}\n`);

    console.log('🔐 API Credentials:');
    console.log(`  Email: ${adminUser.email}`);
    console.log(`  Password: ${args.password}`);
    console.log(`  Role: ${adminUser.role}\n`);

    console.log('🚀 Next Steps:');
    console.log(`  1. Start the server: npm run dev`);
    console.log(`  2. Login: curl -X POST http://localhost:3001/admin/users/login \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"email":"${adminUser.email}","password":"${args.password}"}'`);
    console.log(`  3. Use the returned accessToken for authenticated requests\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
