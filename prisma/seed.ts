import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Helper function to hash password
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clear existing data (optional - comment out to keep data)
  // await prisma.auditLog.deleteMany({});
  // await prisma.maintenanceRequest.deleteMany({});
  // await prisma.announcement.deleteMany({});
  // await prisma.payment.deleteMany({});
  // await prisma.fee.deleteMany({});
  // await prisma.financialSummary.deleteMany({});
  // await prisma.apartmentOwner.deleteMany({});
  // await prisma.buildingMember.deleteMany({});
  // await prisma.apartment.deleteMany({});
  // await prisma.report.deleteMany({});
  // await prisma.building.deleteMany({});
  // await prisma.user.deleteMany({});

  // ============================================
  // 1. Create Users
  // ============================================
  console.log('📝 Creating users...');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: await hashPassword('Admin123!'),
      firstName: 'Carlos',
      lastName: 'Administrador',
      phone: '+573001234567',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const owner1 = await prisma.user.upsert({
    where: { email: 'maria@example.com' },
    update: {},
    create: {
      email: 'maria@example.com',
      password: await hashPassword('Maria123!'),
      firstName: 'María',
      lastName: 'López',
      phone: '+573009876543',
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: 'juan@example.com' },
    update: {},
    create: {
      email: 'juan@example.com',
      password: await hashPassword('Juan123!'),
      firstName: 'Juan',
      lastName: 'Pérez',
      phone: '+573005555555',
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  const boardMember = await prisma.user.upsert({
    where: { email: 'board@example.com' },
    update: {},
    create: {
      email: 'board@example.com',
      password: await hashPassword('Board123!'),
      firstName: 'Roberto',
      lastName: 'Junta',
      phone: '+573008888888',
      role: 'BOARD_MEMBER',
      status: 'ACTIVE',
    },
  });

  console.log(`✓ Created ${4} users\n`);

  // ============================================
  // 2. Create Buildings
  // ============================================
  console.log('🏢 Creating buildings...');

  const building1 = await prisma.building.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Torre Central',
      address: 'Carrera 7 #45-67',
      city: 'Bogotá',
      postalCode: '110221',
      country: 'Colombia',
      totalApartments: 24,
      yearBuilt: 2015,
      description: 'Modern apartment building in downtown Bogotá',
      status: 'ACTIVE',
    },
  });

  const building2 = await prisma.building.upsert({
    where: { id: '22222222-2222-2222-2222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Residencias Palmira',
      address: 'Calle 123 #78-90',
      city: 'Medellín',
      postalCode: '050021',
      country: 'Colombia',
      totalApartments: 36,
      yearBuilt: 2018,
      description: 'Contemporary residential complex',
      status: 'ACTIVE',
    },
  });

  console.log(`✓ Created ${2} buildings\n`);

  // ============================================
  // 3. Create Building Members
  // ============================================
  console.log('👥 Creating building members...');

  await prisma.buildingMember.upsert({
    where: {
      buildingId_userId: {
        buildingId: building1.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      buildingId: building1.id,
      userId: admin.id,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  await prisma.buildingMember.upsert({
    where: {
      buildingId_userId: {
        buildingId: building1.id,
        userId: owner1.id,
      },
    },
    update: {},
    create: {
      buildingId: building1.id,
      userId: owner1.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  await prisma.buildingMember.upsert({
    where: {
      buildingId_userId: {
        buildingId: building1.id,
        userId: boardMember.id,
      },
    },
    update: {},
    create: {
      buildingId: building1.id,
      userId: boardMember.id,
      role: 'BOARD_MEMBER',
      status: 'ACTIVE',
    },
  });

  console.log(`✓ Created building members\n`);

  // ============================================
  // 4. Create Apartments
  // ============================================
  console.log('🏠 Creating apartments...');

  const apt1 = await prisma.apartment.upsert({
    where: {
      buildingId_unitNumber: {
        buildingId: building1.id,
        unitNumber: '201',
      },
    },
    update: {},
    create: {
      buildingId: building1.id,
      unitNumber: '201',
      floor: 2,
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 120.5,
      status: 'OCCUPIED',
    },
  });

  const apt2 = await prisma.apartment.upsert({
    where: {
      buildingId_unitNumber: {
        buildingId: building1.id,
        unitNumber: '301',
      },
    },
    update: {},
    create: {
      buildingId: building1.id,
      unitNumber: '301',
      floor: 3,
      bedrooms: 2,
      bathrooms: 1.5,
      areaSqm: 95.0,
      status: 'OCCUPIED',
    },
  });

  await prisma.apartment.upsert({
    where: {
      buildingId_unitNumber: {
        buildingId: building2.id,
        unitNumber: '101',
      },
    },
    update: {},
    create: {
      buildingId: building2.id,
      unitNumber: '101',
      floor: 1,
      bedrooms: 2,
      bathrooms: 2,
      areaSqm: 105.75,
      status: 'VACANT',
    },
  });

  console.log(`✓ Created ${3} apartments\n`);

  // ============================================
  // 5. Create Apartment Owners
  // ============================================
  console.log('👤 Creating apartment owners...');

  await prisma.apartmentOwner.upsert({
    where: {
      apartmentId_ownerId: {
        apartmentId: apt1.id,
        ownerId: owner1.id,
      },
    },
    update: {},
    create: {
      apartmentId: apt1.id,
      ownerId: owner1.id,
      ownershipPercentage: 100,
      ownershipType: 'FULL_OWNER',
      status: 'ACTIVE',
    },
  });

  await prisma.apartmentOwner.upsert({
    where: {
      apartmentId_ownerId: {
        apartmentId: apt2.id,
        ownerId: owner2.id,
      },
    },
    update: {},
    create: {
      apartmentId: apt2.id,
      ownerId: owner2.id,
      ownershipPercentage: 100,
      ownershipType: 'FULL_OWNER',
      status: 'ACTIVE',
    },
  });

  // Note: apt3 is created but owner is not assigned (vacant apartment)
  console.log(`✓ Created apartment owners\n`);

  // ============================================
  // 6. Create Fees
  // ============================================
  console.log('💰 Creating fees...');

  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  await prisma.fee.upsert({
    where: { id: '33333333-3333-3333-3333-333333333333' },
    update: {},
    create: {
      id: '33333333-3333-3333-3333-333333333333',
      buildingId: building1.id,
      apartmentId: apt1.id,
      type: 'MAINTENANCE',
      amount: 250000,
      dueDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 5),
      status: 'PENDING',
      description: 'Monthly maintenance fee - April',
    },
  });

  await prisma.fee.upsert({
    where: { id: '44444444-4444-4444-4444-444444444444' },
    update: {},
    create: {
      id: '44444444-4444-4444-4444-444444444444',
      buildingId: building1.id,
      apartmentId: apt2.id,
      type: 'MAINTENANCE',
      amount: 200000,
      dueDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 5),
      status: 'PAID',
      paidDate: new Date(),
      description: 'Monthly maintenance fee - April',
    },
  });

  console.log(`✓ Created fees\n`);

  // ============================================
  // 7. Create Announcements
  // ============================================
  console.log('📢 Creating announcements...');

  await prisma.announcement.upsert({
    where: { id: '55555555-5555-5555-5555-555555555555' },
    update: {},
    create: {
      id: '55555555-5555-5555-5555-555555555555',
      buildingId: building1.id,
      createdById: admin.id,
      title: 'Building Maintenance Notice',
      content: 'The elevator will be under maintenance next Monday from 9 AM to 5 PM. We apologize for any inconvenience.',
      visibility: 'ALL_RESIDENTS',
      priority: 'NORMAL',
    },
  });

  await prisma.announcement.upsert({
    where: { id: '66666666-6666-6666-6666-666666666666' },
    update: {},
    create: {
      id: '66666666-6666-6666-6666-666666666666',
      buildingId: building1.id,
      createdById: boardMember.id,
      title: 'Important: Board Meeting This Friday',
      content: 'All board members are required to attend the meeting at 7 PM in the community room.',
      visibility: 'BOARD_ONLY',
      priority: 'URGENT',
    },
  });

  console.log(`✓ Created announcements\n`);

  // ============================================
  // 8. Create Maintenance Requests
  // ============================================
  console.log('🔧 Creating maintenance requests...');

  await prisma.maintenanceRequest.upsert({
    where: { id: '77777777-7777-7777-7777-777777777777' },
    update: {},
    create: {
      id: '77777777-7777-7777-7777-777777777777',
      apartmentId: apt1.id,
      createdById: owner1.id,
      assignedToId: admin.id,
      title: 'Leaking faucet in kitchen',
      description: 'The kitchen faucet is dripping water constantly',
      category: 'PLUMBING',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
    },
  });

  console.log(`✓ Created maintenance requests\n`);

  // ============================================
  // 9. Create Financial Summary
  // ============================================
  console.log('📊 Creating financial summary...');

  const monthPeriod = now.toISOString().slice(0, 7); // "YYYY-MM"

  await prisma.financialSummary.upsert({
    where: { id: '88888888-8888-8888-8888-888888888888' },
    update: {},
    create: {
      id: '88888888-8888-8888-8888-888888888888',
      buildingId: building1.id,
      totalFees: 450000,
      totalPaid: 200000,
      outstanding: 250000,
      period: monthPeriod,
    },
  });

  console.log(`✓ Created financial summary\n`);

  // ============================================
  // Summary
  // ============================================
  console.log('\n✅ Database seeding completed successfully!\n');
  console.log('📊 Seeded Data:');
  console.log(`   - ${4} Users`);
  console.log(`   - ${2} Buildings`);
  console.log(`   - ${3} Apartments`);
  console.log(`   - ${2} Apartment Owners`);
  console.log(`   - ${2} Fees`);
  console.log(`   - ${2} Announcements`);
  console.log(`   - ${1} Maintenance Request`);
  console.log(`   - ${1} Financial Summary`);
  console.log('\n🚀 Ready to test!\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
