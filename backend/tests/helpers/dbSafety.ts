/**
 * Destructive test helpers (schema drop / truncate) must NEVER touch a development or production database.
 * These guards are intentionally strict and are checked both on the URL and on the live connection.
 */
export function assertSafeTestDatabaseUrl(testUrl: string | undefined, developmentUrl?: string): asserts testUrl is string {
  if (!testUrl) {
    throw new Error('TEST_DATABASE_URL is not set. Copy backend/.env.example to backend/.env first.');
  }
  let databaseName: string;
  try {
    databaseName = decodeURIComponent(new URL(testUrl).pathname.replace(/^\//, ''));
  } catch {
    throw new Error('TEST_DATABASE_URL is not a valid URL.');
  }
  if (!/_test$/.test(databaseName)) {
    throw new Error(
      `Refusing to run: TEST_DATABASE_URL database name "${databaseName}" must end with "_test" (destructive reset protection).`,
    );
  }
  if (developmentUrl && developmentUrl === testUrl) {
    throw new Error('Refusing to run: TEST_DATABASE_URL must differ from DATABASE_URL.');
  }
}

/** Second line of defence: verify the *connected* database, not just the URL string. */
export function assertConnectedToTestDatabase(currentDatabase: string): void {
  if (!/_test$/.test(currentDatabase)) {
    throw new Error(`Refusing to reset: connected database "${currentDatabase}" is not a *_test database.`);
  }
}
