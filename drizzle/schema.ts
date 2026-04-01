import { mysqlTable, varchar, text, int, timestamp, bigint } from "drizzle-orm/mysql-core";

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
  id: int("id").primaryKey().autoincrement(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: text("passwordHash"), // Hash da senha para autenticação local
  loginMethod: varchar("loginMethod", { length: 64 }), // 'oauth' ou 'email'
  avatarUrl: text("avatarUrl"), // URL da foto de perfil do usuário
  role: varchar("role", { length: 10 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Songs table - armazena informações das músicas tocadas na rádio
 */
export const songs = mysqlTable("songs", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }).notNull(),
  albumCover: text("albumCover"), // URL da capa do álbum
  duration: int("duration"), // duração em segundos
  externalId: varchar("externalId", { length: 255 }).unique(), // ID externo do stream
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Song = typeof songs.$inferSelect;
export type InsertSong = typeof songs.$inferInsert;

/**
 * Genres table - armazena os gêneros de música
 */
export const genres = mysqlTable("genres", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Genre = typeof genres.$inferSelect;
export type InsertGenre = typeof genres.$inferInsert;

/**
 * Votes table - armazena votos (likes e dislikes) das músicas
 */
export const votes = mysqlTable("votes", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  songId: int("songId").notNull(),
  voteType: varchar("voteType", { length: 10 }).notNull(),
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
  id: int("id").primaryKey().autoincrement(),
  songId: int("songId"),
  title: varchar("title", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }).notNull(),
  albumCover: text("albumCover"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CurrentSong = typeof currentSong.$inferSelect;
export type InsertCurrentSong = typeof currentSong.$inferInsert;

/**
 * SongHistory table - armazena o histórico das últimas músicas tocadas
 */
export const songHistory = mysqlTable("songHistory", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
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
  id: int("id").primaryKey().autoincrement(),
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
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  songId: int("songId").notNull(),
  voteType: varchar("voteType", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserVote = typeof userVotes.$inferSelect;
export type InsertUserVote = typeof userVotes.$inferInsert;


/**
 * Favorites table - armazena as músicas favoritas dos usuários
 */
export const favorites = mysqlTable("favorites", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  songId: int("songId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

/**
 * Notifications table - armazena notificações para usuários
 */
export const notifications = mysqlTable("notifications", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  songId: int("songId").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: varchar("isRead", { length: 5 }).default("false").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * RankingHistory table - armazena o histórico de ranking para calcular trending
 */
export const rankingHistory = mysqlTable("rankingHistory", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  songId: int("songId").notNull(),
  rank: int("rank").notNull(),
  likes: int("likes").notNull(),
  dislikes: int("dislikes").notNull(),
  period: varchar("period", { length: 20 }).notNull(), // 'day', 'week', 'month', 'year'
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type RankingHistory = typeof rankingHistory.$inferSelect;
export type InsertRankingHistory = typeof rankingHistory.$inferInsert;
