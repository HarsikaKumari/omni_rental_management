import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

/**
 * Idempotent seed. Creates the ONE admin user if it doesn't exist.
 * Safe to re-run — never resets the password of an existing admin.
 *
 * Usage: npm run seed:admin
 */
async function main(): Promise<void> {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;
  const name = env.ADMIN_NAME?.trim() || 'Admin';
  const phone = env.ADMIN_PHONE?.trim() || '+910000000000';

  if (!email || !password) {
    // eslint-disable-next-line no-console
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in server/.env');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`ℹ️  Admin already exists: ${existing.email} (id=${existing.id}). No changes made.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // eslint-disable-next-line no-console
  console.log(`✅ Admin created: ${admin.email} (id=${admin.id})`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to seed admin:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });