import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface AdminUserSeed {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'SUPERADMIN' | 'ADMIN_DASHBOARD';
}

const seedData: AdminUserSeed[] = [
  {
    email: 'superadmin@buildhub.casa',
    password: 'SuperAdmin123!',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'SUPERADMIN',
  },
  {
    email: 'admin@buildhub.casa',
    password: 'AdminUser123!',
    firstName: 'Admin',
    lastName: 'Dashboard',
    role: 'ADMIN_DASHBOARD',
  },
];

async function main() {
  console.log('🌱 Starting BuildHub Admin Database Seed\n');

  for (const adminData of seedData) {
    try {
      // Check if user already exists
      const existing = await prisma.buildHubAdminUser.findUnique({
        where: { email: adminData.email },
      });

      if (existing) {
        console.log(`⏭️  Skipping ${adminData.email} (already exists)`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(adminData.password, 10);

      // Create admin user
      const admin = await prisma.buildHubAdminUser.create({
        data: {
          email: adminData.email,
          password: hashedPassword,
          firstName: adminData.firstName,
          lastName: adminData.lastName,
          role: adminData.role,
          status: 'ACTIVE',
        },
      });

      console.log(`✅ Created ${adminData.role}: ${admin.email}`);
      console.log(`   Password: ${adminData.password}`);
      console.log(`   Name: ${admin.firstName} ${admin.lastName}\n`);
    } catch (error) {
      console.error(`❌ Error creating admin ${adminData.email}:`, error);
    }
  }

  console.log('✅ Seed completed!');
  console.log('\n📋 Test Credentials:');
  seedData.forEach((admin) => {
    console.log(`  ${admin.email} / ${admin.password}`);
  });
}

main()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
