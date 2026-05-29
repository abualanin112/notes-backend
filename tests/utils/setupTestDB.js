/**
 * Per-File Test Lifecycle Hooks — Refactored for Global Container Architecture
 *
 * All container management and schema migration logic has been moved to
 * `globalSetup.js`. This module is now purely responsible for:
 *   1. Injecting the global DATABASE_URL into this worker's process.env
 *   2. Reconnecting the Prisma proxy to the shared container
 *   3. Truncating tables between tests for data isolation
 */
import { prisma } from '../../src/infrastructure/prisma.js';

const setupTestDB = () => {
  beforeAll(async () => {
    // Dynamically import vitest to avoid CJS/ESM incompatibility
    const { inject } = await import('vitest');

    // Retrieve the DATABASE_URL provided by globalSetup via Vitest's inject channel
    const databaseUrl = inject('DATABASE_URL');
    process.env.DATABASE_URL = databaseUrl;

    // Force the Prisma proxy to create a new client instance targeting the container
    prisma.$reconnect();
  });

  beforeEach(async () => {
    // Truncate all tables using actual PostgreSQL table names (@@map values)
    // to ensure complete data isolation between individual tests
    await prisma.$executeRaw`TRUNCATE TABLE "notes", "tokens", "users", "audit_logs" CASCADE;`;
  });

  afterAll(async () => {
    // Gracefully return connections to the pool; the container stays alive
    // until globalTeardown runs after ALL test files complete
    await prisma.$disconnect();
  });
};

export default setupTestDB;
