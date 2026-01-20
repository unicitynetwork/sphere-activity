import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

const DATABASE_URL = process.env.DATABASE_URL || './data/activities.db';

const sqlite = new Database(DATABASE_URL);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });
export { schema };
