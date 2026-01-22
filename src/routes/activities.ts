import { Hono } from 'hono';
import { desc, lt, eq, and } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { bearerAuth } from '../middleware/auth.js';
import { broadcaster } from '../sse/broadcaster.js';
import type { ActivityResponse, CreateActivityRequest, GetActivitiesResponse } from '../types/activity.js';

const activities = new Hono();

function toActivityResponse(activity: typeof schema.activities.$inferSelect): ActivityResponse {
  return {
    id: activity.id,
    kind: activity.kind as ActivityResponse['kind'],
    unicityId: activity.unicityId,
    data: activity.data,
    isPublic: activity.isPublic,
    createdAt: activity.createdAt.toISOString(),
  };
}

// GET /activities - Public endpoint for fetching activities
activities.get('/', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const cursor = c.req.query('cursor');
  const kind = c.req.query('kind');

  const conditions = [];

  if (cursor) {
    const cursorId = parseInt(cursor);
    if (!isNaN(cursorId)) {
      conditions.push(lt(schema.activities.id, cursorId));
    }
  }

  if (kind) {
    conditions.push(eq(schema.activities.kind, kind));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const results = await db
    .select()
    .from(schema.activities)
    .where(where)
    .orderBy(desc(schema.activities.id))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore && items.length > 0 ? String(items[items.length - 1].id) : null;

  const response: GetActivitiesResponse = {
    activities: items.map(toActivityResponse),
    nextCursor,
  };

  return c.json(response);
});

// GET /activities/stream - SSE endpoint for real-time updates
activities.get('/stream', (c) => {
  const lastId = c.req.query('lastId');

  const stream = new ReadableStream<string>({
    start(controller) {
      broadcaster.addClient(controller);

      // Send initial connection message
      controller.enqueue(': connected\n\n');

      // If lastId provided, send any activities since then
      if (lastId) {
        const lastIdNum = parseInt(lastId);
        if (!isNaN(lastIdNum)) {
          db.select()
            .from(schema.activities)
            .where(lt(schema.activities.id, lastIdNum))
            .orderBy(desc(schema.activities.id))
            .limit(50)
            .then((results) => {
              for (const activity of results.reverse()) {
                controller.enqueue(`data: ${JSON.stringify(toActivityResponse(activity))}\n\n`);
              }
            })
            .catch((err) => {
              console.error('Error fetching missed activities:', err);
            });
        }
      }
    },
    cancel() {
      // Find and remove this controller
      // Note: In practice, we rely on the try/catch in broadcaster
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

// POST /activities - Protected endpoint for creating activities
activities.post('/', bearerAuth, async (c) => {
  const body = await c.req.json<CreateActivityRequest>();

  if (!body.kind) {
    return c.json({ error: 'kind is required' }, 400);
  }

  const validKinds = [
    'marketplace_post',
    'token_transfer',
    'wallet_created',
    'game_started',
    'bet_placed',
    'otc_purchase',
    'merch_order',
    'pokemon_purchase',
  ];
  if (!validKinds.includes(body.kind)) {
    return c.json({ error: `Invalid kind. Must be one of: ${validKinds.join(', ')}` }, 400);
  }

  const now = new Date();

  const [inserted] = await db
    .insert(schema.activities)
    .values({
      kind: body.kind,
      unicityId: body.unicityId || null,
      data: body.data || null,
      isPublic: body.isPublic ?? false,
      createdAt: now,
    })
    .returning();

  const response = toActivityResponse(inserted);

  // Broadcast to all SSE subscribers
  broadcaster.broadcast(response);

  return c.json({ id: response.id, createdAt: response.createdAt }, 201);
});

export default activities;
