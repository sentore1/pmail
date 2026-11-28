/**
 * Database Connection Test Script
 * Run: node test-db-connection.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  console.log('\n🔍 Testing Database Connection...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Test 1: Check database connection
    console.log('✅ Test 1: Database Connection');
    await prisma.$connect();
    console.log('   ✓ Successfully connected to database\n');

    // Test 2: Count users
    console.log('✅ Test 2: User Table');
    const userCount = await prisma.user.count();
    console.log(`   ✓ Total users in database: ${userCount}\n`);

    // Test 3: Count emails
    console.log('✅ Test 3: Email Table');
    const emailCount = await prisma.email.count();
    console.log(`   ✓ Total emails in database: ${emailCount}\n`);

    // Test 4: Count transactions
    console.log('✅ Test 4: Transaction Table');
    const transactionCount = await prisma.transaction.count();
    console.log(`   ✓ Total transactions: ${transactionCount}\n`);

    // Test 5: Platform settings
    console.log('✅ Test 5: Platform Settings');
    let settings = await prisma.platformSettings.findUnique({
      where: { id: 'global' }
    });
    
    if (!settings) {
      console.log('   ⚠ No platform settings found, creating default...');
      settings = await prisma.platformSettings.create({
        data: {
          id: 'global',
          activeGateway: 'MOMO'
        }
      });
      console.log('   ✓ Created default platform settings');
    }
    console.log(`   ✓ Active payment gateway: ${settings.activeGateway}\n`);

    // Test 6: Check for admin users
    console.log('✅ Test 6: Admin Users');
    const adminCount = await prisma.user.count({
      where: { isAdmin: true }
    });
    console.log(`   ✓ Admin users: ${adminCount}\n`);

    if (adminCount === 0) {
      console.log('   ⚠ WARNING: No admin users found!');
      console.log('   Run: node prisma/seed-admin.js to create an admin user\n');
    }

    // Test 7: Recent activity
    console.log('✅ Test 7: Recent Activity');
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        name: true,
        email: true,
        createdAt: true,
        walletBalance: true
      }
    });
    
    if (recentUsers.length > 0) {
      console.log('   Recent users:');
      recentUsers.forEach(u => {
        console.log(`   • ${u.name} (${u.email}) - $${u.walletBalance}`);
      });
    } else {
      console.log('   ℹ No users found in database');
    }
    console.log('');

    // Test 8: Database file location
    console.log('✅ Test 8: Database Configuration');
    console.log(`   Database URL: ${process.env.DATABASE_URL}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ All tests passed! Database is connected and working.\n');

  } catch (error) {
    console.error('\n❌ Database connection test FAILED!\n');
    console.error('Error details:', error.message);
    console.error('\nPossible fixes:');
    console.error('1. Run: npm run prisma:generate');
    console.error('2. Run: npm run prisma:migrate');
    console.error('3. Check your DATABASE_URL in .env file\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
