import path from 'node:path';
import dotenv from 'dotenv';
import { assertSafeTestDatabaseUrl } from '../helpers/dbSafety';
import { rebuildTestSchema } from '../helpers/migrate';

/** Runs once before the whole suite: verify we are on a *_test database, then build a clean schema. */
export default async function globalSetup(): Promise<void> {
  dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
  const testUrl = process.env.TEST_DATABASE_URL;
  assertSafeTestDatabaseUrl(testUrl, process.env.DATABASE_URL);
  await rebuildTestSchema(testUrl);
}
