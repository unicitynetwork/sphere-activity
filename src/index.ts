import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import activities from './routes/activities.js';
import { getOrGenerateApiKey } from './middleware/auth.js';
import { db, schema } from './db/index.js';
import { sql } from 'drizzle-orm';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Routes
app.route('/activities', activities);

// Initialize database tables if they don't exist
async function initDb() {
  try {
    // Create table if it doesn't exist
    db.run(sql`
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        unicity_id TEXT,
        data TEXT,
        is_public INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
}

// Start server
const port = parseInt(process.env.PORT || '3001');

initDb().then(() => {
  // Ensure API key is generated/logged at startup
  getOrGenerateApiKey();

  serve({
    fetch: app.fetch,
    port,
  }, () => {
    console.log(`Activity service running on http://localhost:${port}`);
  });
});
