import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const activities = sqliteTable('activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kind: text('kind').notNull(), // 'marketplace_post' | 'token_transfer' | 'wallet_created'
  unicityId: text('unicity_id'), // Optional, for public activities
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>(), // Activity-specific JSON payload
  isPublic: integer('is_public', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
