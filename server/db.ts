import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users, songs, InsertSong, votes, InsertVote, currentSong, InsertCurrentSong, songHistory, InsertSongHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: mysql.Pool | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = mysql.createPool(process.env.DATABASE_URL);
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value !== undefined && value !== null) {
        values[field] = value;
        updateSet[field] = value;
      }
    };

    assignNullable("name");
    assignNullable("email");
    assignNullable("loginMethod");

    if (user.avatarUrl !== undefined && user.avatarUrl !== null) {
      values.avatarUrl = user.avatarUrl;
      updateSet.avatarUrl = user.avatarUrl;
    }

    if (user.role !== undefined && user.role !== null) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (user.lastSignedIn !== undefined && user.lastSignedIn !== null) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }

    // Try upsert, fallback to insert if user doesn't exist
    try {
      await db
        .update(users)
        .set(updateSet)
        .where(eq(users.openId, user.openId));
    } catch {
      // If update fails, try insert
      await db.insert(users).values(values).catch(() => {
        // Silently ignore if user already exists
      });
    }
  } catch (error) {
    console.warn("[Database] Failed to upsert user:", error);
  }
}

export async function getCurrentSong() {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(currentSong)
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get current song:", error);
    return null;
  }
}

export async function getSongsWithVotes() {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.select().from(songs);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get songs:", error);
    return [];
  }
}

export async function getVotesForSong(songId: number) {
  const db = await getDb();
  if (!db) return { likes: 0, dislikes: 0 };

  try {
    const result = await db
      .select()
      .from(votes)
      .where(eq(votes.songId, songId));
    
    const likes = result.filter(v => v.voteType === 'like').length;
    const dislikes = result.filter(v => v.voteType === 'dislike').length;
    
    return { likes, dislikes };
  } catch (error) {
    console.error("[Database] Failed to get votes:", error);
    return { likes: 0, dislikes: 0 };
  }
}

export async function addVote(vote: InsertVote) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(votes).values(vote);
    return result;
  } catch (error) {
    console.error("[Database] Failed to add vote:", error);
    return null;
  }
}

export async function addToHistory(history: InsertSongHistory) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(songHistory).values(history);
    return result;
  } catch (error) {
    console.error("[Database] Failed to add to history:", error);
    return null;
  }
}

export async function getRecentSongHistory(limit: number = 5) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(songHistory)
      .orderBy(desc(songHistory.playedAt))
      .limit(limit);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get song history:", error);
    return [];
  }
}

export async function getTopVotedSongsThisMonth() {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(songs)
      .orderBy(desc(songs.likes))
      .limit(10);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get top voted songs:", error);
    return [];
  }
}

export async function getVoteCountsForSong(songId: number) {
  const db = await getDb();
  if (!db) return { likes: 0, dislikes: 0 };

  try {
    const result = await db
      .select()
      .from(votes)
      .where(eq(votes.songId, songId));
    
    const likes = result.filter(v => v.voteType === 'like').length;
    const dislikes = result.filter(v => v.voteType === 'dislike').length;
    
    return { likes, dislikes };
  } catch (error) {
    console.error("[Database] Failed to get vote counts:", error);
    return { likes: 0, dislikes: 0 };
  }
}

export async function addFavorite(userId: number, songId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Implementar lógica de favoritos aqui
    return null;
  } catch (error) {
    console.error("[Database] Failed to add favorite:", error);
    return null;
  }
}

export async function removeFavorite(userId: number, songId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Implementar lógica de remover favoritos aqui
    return null;
  } catch (error) {
    console.error("[Database] Failed to remove favorite:", error);
    return null;
  }
}

export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    // Implementar lógica de obter favoritos aqui
    return [];
  } catch (error) {
    console.error("[Database] Failed to get user favorites:", error);
    return [];
  }
}

export async function createNotification(userId: number, songId: number, type: string, title: string, content: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Implementar lógica de notificações aqui
    return null;
  } catch (error) {
    console.error("[Database] Failed to create notification:", error);
    return null;
  }
}

export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    // Implementar lógica de obter notificações aqui
    return [];
  } catch (error) {
    console.error("[Database] Failed to get user notifications:", error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Implementar lógica de marcar notificação como lida aqui
    return null;
  } catch (error) {
    console.error("[Database] Failed to mark notification as read:", error);
    return null;
  }
}

export async function updateUserProfile(userId: number, data: any) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to update user profile:", error);
    return null;
  }
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get user:", error);
    return null;
  }
}

export async function getUserLikeCountForSong(userId: number, songId: number) {
  const db = await getDb();
  if (!db) return 0;

  try {
    const result = await db
      .select()
      .from(votes)
      .where(and(eq(votes.songId, songId), eq(votes.voteType, 'like')))
      .limit(1);
    return result.length > 0 ? 1 : 0;
  } catch (error) {
    console.error("[Database] Failed to get user like count:", error);
    return 0;
  }
}

export async function checkNotificationExists(userId: number, songId: number, type: string) {
  const db = await getDb();
  if (!db) return false;

  try {
    // Implementar lógica de verificar notificação aqui
    return false;
  } catch (error) {
    console.error("[Database] Failed to check notification:", error);
    return false;
  }
}

export async function getUsersWhoLikedSong(songId: number, limit: number = 5) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(votes)
      .where(and(eq(votes.songId, songId), eq(votes.voteType, 'like')))
      .limit(limit);
    return result.map(v => v.userId || 0).filter(id => id > 0);
  } catch (error) {
    console.error("[Database] Failed to get users who liked song:", error);
    return [];
  }
}

export async function getLatestVote(songId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(votes)
      .where(eq(votes.songId, songId))
      .orderBy(desc(votes.createdAt))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get latest vote:", error);
    return null;
  }
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  try {
    // Implementar lógica de contar notificações não lidas aqui
    return 0;
  } catch (error) {
    console.error("[Database] Failed to get unread notification count:", error);
    return 0;
  }
}

// Importar funções necessárias do drizzle-orm
import { eq, desc, and } from "drizzle-orm";
