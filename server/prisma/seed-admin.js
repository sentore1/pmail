/**
 * Creates (or promotes) an admin user.
 * Run: node prisma/seed-admin.js
 *
 * Set ADMIN_EMAIL and ADMIN_PASSWORD env vars, or edit the defaults below.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@pryro.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@1234!';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Admin';

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    // Promote existing user to admin
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { isAdmin: true },
    });
    console.log(`✅ Promoted existing user ${ADMIN_EMAIL} to admin.`);
    return;
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.create({
    data: {
      name:     ADMIN_NAME,
      email:    ADMIN_EMAIL,
      password: hashed,
      isAdmin:  true,
      verified: true,
    },
  });
  console.log(`✅ Admin user created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log('⚠️  Change the password after first login!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
