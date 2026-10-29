import { boolean, integer, jsonb, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const voiceRoomsTable = pgTable("tech_ai_voice_rooms", {
  id: varchar("id", { length: 128 }).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }).notNull().default("English"),
  tags: jsonb("tags").$type<string[]>().default([]),
  hostId: text("host_id").notNull(),
  hostName: text("host_name").notNull(),
  hostAvatar: text("host_avatar"),
  hostFlag: varchar("host_flag", { length: 16 }).default("🇮🇳"),
  isPrivate: boolean("is_private").notNull().default(false),
  requireApproval: boolean("require_approval").notNull().default(false),
  maxParticipants: integer("max_participants").notNull().default(50),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  pinnedMessage: text("pinned_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const voiceRoomParticipantsTable = pgTable("tech_ai_voice_room_participants", {
  id: serial("id").primaryKey(),
  roomId: varchar("room_id", { length: 128 }).notNull().references(() => voiceRoomsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userAvatar: text("user_avatar"),
  userFlag: varchar("user_flag", { length: 16 }).default("🇮🇳"),
  role: varchar("role", { length: 32 }).notNull().default("listener"), // 'host' | 'speaker' | 'listener'
  seatIndex: integer("seat_index"), // null for audience, 0..7 for stage seats
  isMuted: boolean("is_muted").notNull().default(false),
  isHandRaised: boolean("is_hand_raised").notNull().default(false),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VoiceRoomRecord = typeof voiceRoomsTable.$inferSelect;
export type InsertVoiceRoomRecord = typeof voiceRoomsTable.$inferInsert;
export type VoiceRoomParticipantRecord = typeof voiceRoomParticipantsTable.$inferSelect;
export type InsertVoiceRoomParticipantRecord = typeof voiceRoomParticipantsTable.$inferInsert;

// ── Chat messages table ──────────────────────────────────────────────
export const voiceRoomChatMessagesTable = pgTable("tech_ai_voice_room_chat_messages", {
  id: serial("id").primaryKey(),
  roomId: varchar("room_id", { length: 128 }).notNull().references(() => voiceRoomsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VoiceRoomChatMessageRecord = typeof voiceRoomChatMessagesTable.$inferSelect;
export type InsertVoiceRoomChatMessageRecord = typeof voiceRoomChatMessagesTable.$inferInsert;
