import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, songs, InsertSong, votes, InsertVote, currentSong, InsertCurrentSong } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
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

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
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
      s.albumCover,
      s.duration,
      COUNT(CASE WHEN v.voteType = 'like' THEN 1 END) as likes,
      COUNT(CASE WHEN v.voteType = 'dislike' THEN 1 END) as dislikes,
      COUNT(v.id) as totalVotes
    FROM songs s
    LEFT JOIN votes v ON s.id = v.songId
    GROUP BY s.id
    ORDER BY totalVotes DESC
  `);
  return result;
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
    await db.insert(songs).values(song).onDuplicateKeyUpdate({
      set: {
        title: song.title,
        artist: song.artist,
        albumCover: song.albumCover,
        duration: song.duration,
      },
    });
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

// TODO: add feature queries here as your schema grows.
