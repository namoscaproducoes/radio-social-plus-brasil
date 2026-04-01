import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users, songs, InsertSong, votes, InsertVote, currentSong, InsertCurrentSong, songHistory, InsertSongHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL, {
        ssl: 'require',
        idle_timeout: 30,
        connect_timeout: 10,
        max: 10,
      });
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
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // PostgreSQL: delete then insert (upsert)
    if (values.openId) {
      await db.delete(users).where(eq(users.openId, values.openId));
    }
    await db.insert(users).values(values);
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get all songs with vote counts
 */
export async function getSongsWithVotes() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(`
    SELECT 
      s.id,
      s.title,
      s.artist,
      s."albumCover",
      s.duration,
      COUNT(CASE WHEN v."voteType" = 'like' THEN 1 END) as likes,
      COUNT(CASE WHEN v."voteType" = 'dislike' THEN 1 END) as dislikes,
      COUNT(v.id) as "totalVotes"
    FROM "songs" s
    LEFT JOIN "votes" v ON s.id = v."songId"
    GROUP BY s.id
    ORDER BY "totalVotes" DESC
  `);
  // db.execute retorna [rows, fields], então extrair apenas as linhas
  return Array.isArray(result) && result.length > 0 ? result[0] : [];
}

/**
 * Get votes for a specific song
 */
export async function getVotesForSong(songId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(votes).where(eq(votes.songId, songId));
}

/**
 * Create or update a song
 */
export async function upsertSong(song: InsertSong) {
  const db = await getDb();
  if (!db) return null;

  try {
    // PostgreSQL: delete then insert (upsert)
    if (song.externalId) {
      await db.delete(songs).where(eq(songs.externalId, song.externalId));
    }
    await db.insert(songs).values(song);
    return song;
  } catch (error) {
    console.error("[Database] Failed to upsert song:", error);
    throw error;
  }
}

/**
 * Add a vote for a song
 */
export async function addVote(vote: InsertVote) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(votes).values(vote);
    return result;
  } catch (error) {
    console.error("[Database] Failed to add vote:", error);
    throw error;
  }
}

/**
 * Get current song
 */
export async function getCurrentSong() {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(currentSong).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Update current song
 */
export async function updateCurrentSong(song: InsertCurrentSong) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Delete existing record and insert new one
    await db.execute(`DELETE FROM currentSong`);
    await db.insert(currentSong).values(song);
    return song;
  } catch (error) {
    console.error("[Database] Failed to update current song:", error);
    throw error;
  }
}

/**
 * Add song to history
 */
export async function addToHistory(song: InsertSongHistory) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(songHistory).values(song);
    return result;
  } catch (error) {
    console.error("[Database] Failed to add to history:", error);
    throw error;
  }
}

/**
 * Get last N songs from history (remove duplicates - keep most recent)
 */
export async function getRecentSongHistory(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { sql } = await import('drizzle-orm');
    const query = sql`
      SELECT 
        MAX(id) as id,
        title,
        artist,
        MAX("albumCover") as "albumCover",
        MAX("playedAt") as "playedAt"
      FROM "songHistory"
      GROUP BY title, artist
      ORDER BY MAX("playedAt") DESC
      LIMIT ${limit}
    `;
    const result = await db.execute(query) as any;

    // db.execute com sql template retorna os dados diretamente
    if (Array.isArray(result)) {
      return result;
    }
    return [];
  } catch (error) {
    console.error("[Database] Failed to get song history:", error);
    return [];
  }
}

// TODO: add feature queries here as your schema grows.


/**
 * Get top voted songs for the current month
 */
export async function getTopVotedSongsThisMonth(voteType: 'like' | 'dislike' = 'like', limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(`
    SELECT 
      s.title,
      s.artist,
      s."albumCover",
      COUNT(DISTINCT v.id) as "voteCount"
    FROM "songs" s
    INNER JOIN "votes" v ON s.id = v."songId" AND v."voteType" = '${voteType}'
    GROUP BY s.id, s.title, s.artist, s."albumCover"
    HAVING COUNT(DISTINCT v.id) > 0
    ORDER BY "voteCount" DESC
    LIMIT ${limit}
  `);

  return Array.isArray(result) && result.length > 0 ? result[0] : [];
}


/**
 * Get vote counts for a specific song
 */
export async function getVoteCountsForSong(songId: number) {
  const db = await getDb();
  if (!db) return { likes: 0, dislikes: 0 };

  const result = await db.execute(`
    SELECT 
      COUNT(CASE WHEN voteType = 'like' THEN 1 END) as likes,
      COUNT(CASE WHEN voteType = 'dislike' THEN 1 END) as dislikes
    FROM votes
    WHERE songId = ${songId}
  `) as any;

  if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) && result[0].length > 0) {
    return result[0][0];
  }
  return { likes: 0, dislikes: 0 };
}


/**
 * Add a favorite song for a user
 */
export async function addFavorite(userId: number, songId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.execute(`
      INSERT INTO favorites (userId, songId) 
      VALUES (${userId}, ${songId})
      ON DUPLICATE KEY UPDATE createdAt = NOW()
    `);
    return result;
  } catch (error) {
    console.error("[Database] Failed to add favorite:", error);
    throw error;
  }
}

/**
 * Remove a favorite song for a user
 */
export async function removeFavorite(userId: number, songId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.execute(`
      DELETE FROM favorites 
      WHERE userId = ${userId} AND songId = ${songId}
    `);
    return result;
  } catch (error) {
    console.error("[Database] Failed to remove favorite:", error);
    throw error;
  }
}

/**
 * Get user's favorite songs
 */
export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.execute(`
      SELECT f.id, f.userId, f.songId, s.title, s.artist, s.albumCover, f.createdAt
      FROM favorites f
      JOIN songs s ON f.songId = s.id
      WHERE f.userId = ${userId}
      ORDER BY f.createdAt DESC
    `) as any;

    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
      return result[0];
    }
    return [];
  } catch (error) {
    console.error("[Database] Failed to get user favorites:", error);
    return [];
  }
}

/**
 * Create a notification for a user
 */
export async function createNotification(userId: number, songId: number, type: string, title: string, message: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.execute(`
      INSERT INTO notifications (userId, songId, type, title, message, isRead, createdAt)
      VALUES (${userId}, ${songId}, '${type}', '${title}', '${message}', 'false', NOW())
    `);
    return result;
  } catch (error) {
    console.error("[Database] Failed to create notification:", error);
    throw error;
  }
}

/**
 * Get user's notifications
 */
export async function getUserNotifications(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.execute(`
      SELECT n.id, n.userId, n.songId, n.type, n.title, n.message, n.isRead, n.createdAt, n.readAt,
             s.title as songTitle, s.artist as songArtist, s.albumCover
      FROM notifications n
      JOIN songs s ON n.songId = s.id
      WHERE n.userId = ${userId}
      ORDER BY n.createdAt DESC
      LIMIT ${limit}
    `) as any;

    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
      return result[0];
    }
    return [];
  } catch (error) {
    console.error("[Database] Failed to get user notifications:", error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.execute(`
      UPDATE notifications 
      SET isRead = 'true', readAt = NOW()
      WHERE id = ${notificationId}
    `);
    return result;
  } catch (error) {
    console.error("[Database] Failed to mark notification as read:", error);
    throw error;
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  try {
    const result = await db.execute(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE userId = ${userId} AND isRead = 'false'
    `) as any;

    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) && result[0].length > 0) {
      return result[0][0].count || 0;
    }
    return 0;
  } catch (error) {
    console.error("[Database] Failed to get unread notification count:", error);
    return 0;
  }
}


/**
 * Update user profile (name, email, avatarUrl)
 */
export async function updateUserProfile(userId: number, updates: { name?: string; email?: string; avatarUrl?: string }) {
  const db = await getDb();
  if (!db) return null;

  try {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.avatarUrl !== undefined) updateData.avatarUrl = updates.avatarUrl;

    if (Object.keys(updateData).length === 0) return null;

    const result = await db.update(users).set(updateData).where(eq(users.id, userId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to update user profile:", error);
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select().from(users).where(eq(users.id, userId));
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get user:", error);
    return null;
  }
}


/**
 * Get count of likes a user has given to a specific song
 */
export async function getUserLikeCountForSong(userId: number, songId: number) {
  const db = await getDb();
  if (!db) return 0;

  try {
    const result = await db.execute(`
      SELECT COUNT(*) as count
      FROM userVotes
      WHERE userId = ${userId} AND songId = ${songId} AND voteType = 'like'
    `) as any;

    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) && result[0].length > 0) {
      return result[0][0].count || 0;
    }
    return 0;
  } catch (error) {
    console.error("[Database] Failed to get user like count:", error);
    return 0;
  }
}

/**
 * Check if a notification already exists for a user and song
 */
export async function checkNotificationExists(userId: number, songId: number, type: string) {
  const db = await getDb();
  if (!db) return false;

  try {
    const result = await db.execute(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE userId = ${userId} AND songId = ${songId} AND type = '${type}' AND isRead = 'false'
      LIMIT 1
    `) as any;

    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) && result[0].length > 0) {
      return result[0][0].count > 0;
    }
    return false;
  } catch (error) {
    console.error("[Database] Failed to check notification:", error);
    return false;
  }
}

/**
 * Get all users who have liked a specific song (2+ times)
 */
export async function getUsersWhoLikedSong(songId: number, minLikes: number = 2) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.execute(`
      SELECT DISTINCT userId
      FROM userVotes
      WHERE songId = ${songId} AND voteType = 'like'
      GROUP BY userId
      HAVING COUNT(*) >= ${minLikes}
    `) as any;

    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
      return result[0].map((row: any) => row.userId);
    }
    return [];
  } catch (error) {
    console.error("[Database] Failed to get users who liked song:", error);
    return [];
  }
}


/**
 * Get the latest vote with user and song information
 */
export async function getLatestVote() {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.execute(`
      SELECT 
        v.id,
        v.userId,
        v.songId,
        v.voteType,
        v.createdAt,
        u.name as userName,
        s.title as songTitle,
        s.artist as songArtist,
        s.albumCover as albumCover
      FROM (
        SELECT id, userId, songId, voteType, createdAt FROM userVotes
        UNION ALL
        SELECT id, NULL as userId, songId, voteType, createdAt FROM votes
      ) v
      LEFT JOIN users u ON v.userId = u.id
      LEFT JOIN songs s ON v.songId = s.id
      ORDER BY v.createdAt DESC
      LIMIT 1
    `) as any;

    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) && result[0].length > 0) {
      return result[0][0];
    }
    return null;
  } catch (error) {
    console.error("[Database] Failed to get latest vote:", error);
    return null;
  }
}
