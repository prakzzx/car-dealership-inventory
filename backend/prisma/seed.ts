import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createPrismaClient } from '../src/db/prisma';
import { passwordSchema } from '../src/modules/auth/auth.schemas';
import { SEED_VEHICLES } from './seedData';

/**
 * Idempotent seed:
 *  - the admin account comes ONLY from ADMIN_EMAIL / ADMIN_PASSWORD (hashed before saving; nothing hard-coded);
 *  - sample vehicles are inserted only when the Vehicle table is empty, so re-running never duplicates them.
 */
async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set (copy backend/.env.example to backend/.env).');
  if (!adminEmail || !adminPassword) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to create the admin account.');
  const policy = passwordSchema.safeParse(adminPassword);
  if (!policy.success) throw new Error(`ADMIN_PASSWORD violates the password policy: ${policy.error.issues.map((i) => i.message).join('; ')}`);

  const prisma = createPrismaClient(databaseUrl);
  try {
    const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
    const passwordHash = await bcrypt.hash(adminPassword, rounds);
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: 'ADMIN', passwordHash },
      create: { name: 'AutoHub Admin', email: adminEmail, passwordHash, role: 'ADMIN' },
    });
    console.log(`Admin ready: ${admin.email}`);

    if ((await prisma.vehicle.count()) === 0) {
      await prisma.vehicle.createMany({ data: SEED_VEHICLES });
      console.log(`Inserted ${SEED_VEHICLES.length} sample vehicles.`);
    } else {
      console.log('Vehicles already present - skipping sample data.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
