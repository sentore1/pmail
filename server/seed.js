/**
 * Seed script — creates two test users who can message each other.
 * Run with: node seed.js
 *
 * Users created:
 *   alice@pryro.com  / password: Password123
 *   bob@pryro.com    / password: Password123
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const users = [
  { name: 'Alice Smith', username: 'alice', password: 'Password123' },
  { name: 'Bob Johnson', username: 'bob',   password: 'Password123' },
];

async function main() {
  console.log('🌱 Seeding users…\n');

  const created = [];

  for (const u of users) {
    const email = `${u.username}@pryro.com`;
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      console.log(`⏭  ${email} already exists — skipping`);
      created.push(existing);
      continue;
    }

    const hashed = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email,
        password: hashed,
        knoccPrice: 1.0,
        verified: true,
        autoApprove: true,   // auto-approve so they can message freely
        requireReason: false,
      },
    });

    console.log(`✅ Created ${email}`);
    created.push(user);
  }

  // Add each other as contacts so they can email immediately
  if (created.length === 2) {
    const [alice, bob] = created;

    for (const [from, to] of [[alice, bob], [bob, alice]]) {
      const exists = await prisma.contact.findUnique({
        where: { userId_contactId: { userId: from.id, contactId: to.id } },
      });
      if (!exists) {
        await prisma.contact.create({
          data: { userId: from.id, contactId: to.id },
        });
        console.log(`🤝 Added ${to.email} as contact of ${from.email}`);
      }
    }
  }

  console.log('\n✨ Done!\n');
  console.log('Login credentials:');
  for (const u of users) {
    console.log(`  Email:    ${u.username}@pryro.com`);
    console.log(`  Password: ${u.password}`);
    console.log('');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
