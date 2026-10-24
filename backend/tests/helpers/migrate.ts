import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import { assertConnectedToTestDatabase } from './dbSafety';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../prisma/migrations');

/**
 * Rebuilds the schema of the (verified) test database from the committed Prisma migration SQL files.
 * Applying the same SQL files that `prisma migrate deploy` applies keeps tests honest about the real schema,
 * and avoids needing the Prisma schema-engine binary inside the test runner.
 */
export async function rebuildTestSchema(testUrl: string): Promise<void> {
  const client = new Client({ connectionString: testUrl });
  await client.connect();
  try {
    const { rows } = await client.query<{ db: string }>('SELECT current_database() AS db');
    assertConnectedToTestDatabase(rows[0]?.db ?? '');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    for (const dir of dirs) {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, dir, 'migration.sql'), 'utf8');
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}
