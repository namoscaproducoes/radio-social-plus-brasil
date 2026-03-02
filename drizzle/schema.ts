import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: text("passwordHash"), // Hash da senha para autenticação local
  loginMethod: varchar("loginMethod", { length: 64 }), // 'oauth' ou 'email'
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Songs table - armazena informações das músicas tocadas na rádio
 */
export const songs = mysqlTable("songs", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }).notNull(),
  albumCover: text("albumCover"), // URL da capa do álbum
  duration: int("duration"), // duração em segundos
  externalId: varchar("externalId", { length: 255 }).unique(), // ID externo do stream
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Song = typeof songs.$inferSelect;
export type InsertSong = typeof songs.$inferInsert;

/**
 * Votes table - armazena votos (likes e dislikes) das músicas
 */
export const votes = mysqlTable("votes", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  songId: int("songId").notNull(),
  voteType: mysqlEnum("voteType", ["like", "dislike"]).notNull(),
  userId: varchar("userId", { length: 255 }), // ID anônimo ou do usuário
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 ou IPv6
  userAgent: text("userAgent"), // User agent do navegador
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Vote = typeof votes.$inferSelect;
export type InsertVote = typeof votes.$inferInsert;

/**
 * CurrentSong table - armazena a música atualmente tocando
 */
export const currentSong = mysqlTable("currentSong", {
  id: int("id").autoincrement().primaryKey(),
  songId: int("songId"),
  title: varchar("title", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }).notNull(),
  albumCover: text("albumCover"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CurrentSong = typeof currentSong.$inferSelect;
export type InsertCurrentSong = typeof currentSong.$inferInsert;

/**
 * SongHistory table - armazena o histórico das últimas músicas tocadas
 */
export const songHistory = mysqlTable("songHistory", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }).notNull(),
  albumCover: text("albumCover"), // URL da capa do álbum
  playedAt: timestamp("playedAt").defaultNow().notNull(),
});

export type SongHistory = typeof songHistory.$inferSelect;
export type InsertSongHistory = typeof songHistory.$inferInsert;

/**
 * PasswordResetToken table - armazena tokens para recuperação de senha
 */
export const passwordResetTokens = mysqlTable("passwordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * UserVotes table - armazena votos (likes e dislikes) de usuários autenticados
 */
export const userVotes = mysqlTable("userVotes", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  songId: int("songId").notNull(),
  voteType: mysqlEnum("voteType", ["like", "dislike"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserVote = typeof userVotes.$inferSelect;
export type InsertUserVote = typeof userVotes.$inferInsert;
