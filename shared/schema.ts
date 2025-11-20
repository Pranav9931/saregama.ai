import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const profiles = pgTable("profiles", {
  walletAddress: varchar("wallet_address", { length: 42 }).primaryKey(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProfileSchema = createInsertSchema(profiles).pick({
  walletAddress: true,
  displayName: true,
  avatarUrl: true,
});

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

export const catalogItems = pgTable("catalog_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 10 }).notNull(), // 'audio' | 'video'
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  masterPlaylistId: text("master_playlist_id"), // Arkiv entity ID for master playlist
  masterPlaylistTxHash: text("master_playlist_tx_hash"), // Arkiv transaction hash for master playlist creation
  priceEth: decimal("price_eth", { precision: 18, scale: 10 }).default("0.0001").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  category: text("category"), // 'featured', 'trending', 'new-releases', etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: varchar("created_by", { length: 42 }).notNull(), // wallet address of uploader
});

export const insertCatalogItemSchema = createInsertSchema(catalogItems).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogItem = z.infer<typeof insertCatalogItemSchema>;
export type CatalogItem = typeof catalogItems.$inferSelect;

export const catalogChunks = pgTable("catalog_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  catalogItemId: varchar("catalog_item_id").notNull().references(() => catalogItems.id),
  sequence: integer("sequence").notNull(), // 0, 1, 2, etc.
  arkivEntityId: text("arkiv_entity_id").notNull(), // Arkiv entity ID for this chunk
  arkivTxHash: text("arkiv_tx_hash"), // Arkiv transaction hash for chunk creation
  nextChunkId: varchar("next_chunk_id"), // Points to next chunk in linked list
  sizeBytes: integer("size_bytes").notNull(),
  expiresAt: timestamp("expires_at"), // null for master chunks (very long expiration)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCatalogChunkSchema = createInsertSchema(catalogChunks).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogChunk = z.infer<typeof insertCatalogChunkSchema>;
export type CatalogChunk = typeof catalogChunks.$inferSelect;

export const userRentals = pgTable("user_rentals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().references(() => profiles.walletAddress),
  catalogItemId: varchar("catalog_item_id").notNull().references(() => catalogItems.id),
  rentalCopyPlaylistId: text("rental_copy_playlist_id"), // Arkiv entity ID for user's playlist copy
  rentalExpiresAt: timestamp("rental_expires_at").notNull(),
  txHash: text("tx_hash").notNull(), // Ethereum transaction hash for payment
  rentalDurationDays: integer("rental_duration_days").notNull(),
  paidEth: decimal("paid_eth", { precision: 18, scale: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const insertUserRentalSchema = createInsertSchema(userRentals).omit({
  id: true,
  createdAt: true,
  isActive: true,
});

export type InsertUserRental = z.infer<typeof insertUserRentalSchema>;
export type UserRental = typeof userRentals.$inferSelect;

export const uploadJobs = pgTable("upload_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  status: varchar("status", { length: 20 }).default("processing").notNull(), // 'processing', 'chunking', 'uploading', 'completed', 'failed'
  progress: integer("progress").default(0).notNull(), // 0-100
  errorMessage: text("error_message"),
  catalogItemId: varchar("catalog_item_id").references(() => catalogItems.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertUploadJobSchema = createInsertSchema(uploadJobs).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertUploadJob = z.infer<typeof insertUploadJobSchema>;
export type UploadJob = typeof uploadJobs.$inferSelect;

// Legacy user schema (can be removed if not needed)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
