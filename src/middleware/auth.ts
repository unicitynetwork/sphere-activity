import { createMiddleware } from 'hono/factory';
import crypto from 'crypto';

let apiKey = process.env.ACTIVITY_API_KEY;

// Origins that are allowed to make requests without API key authentication
// These are trusted frontend deployments that can't securely store API keys
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export function getOrGenerateApiKey(): string {
  if (!apiKey) {
    apiKey = crypto.randomBytes(32).toString('hex');
    console.log('Generated API key:', apiKey);
    console.log('Set ACTIVITY_API_KEY env variable to persist this key');
  }
  return apiKey;
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin || allowedOrigins.length === 0) {
    return false;
  }
  return allowedOrigins.some((allowed) => origin.startsWith(allowed));
}

export const bearerAuth = createMiddleware(async (c, next) => {
  const origin = c.req.header('Origin');

  // Allow requests from trusted origins without API key
  if (isAllowedOrigin(origin)) {
    await next();
    return;
  }

  // For all other requests, require Bearer token authentication
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  const expectedKey = getOrGenerateApiKey();

  if (token !== expectedKey) {
    return c.json({ error: 'Unauthorized: Invalid API key' }, 401);
  }

  await next();
});
