import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from root
config({ path: resolve(__dirname, '..', '.env') });

export const DATABASE_URL = process.env.DATABASE_URL;

// Helper to conditionally run tests that require a database
export const describeWithDb = DATABASE_URL ? describe : describe.skip;

// Helper to check if we should skip database tests
export function skipIfNoDb() {
  if (!DATABASE_URL) {
    console.log('Skipping database tests - DATABASE_URL not set');
    return true;
  }
  return false;
}
