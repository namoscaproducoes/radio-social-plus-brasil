import { getDb } from "./db";
import { videoCache } from "../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";

/**
 * Buscar vídeo em cache
 */
export async function getVideoFromCache(songTitle: string, artistName: string) {
  const db = await getDb();
  if (!db) return null;

  const cached = await db
    .select()
    .from(videoCache)
    .where(
      and(
        eq(videoCache.songTitle, songTitle),
        eq(videoCache.artistName, artistName),
        gt(videoCache.expiresAt, new Date()) // Apenas se não expirou
      )
    )
    .limit(1);

  return cached[0] || null;
}

/**
 * Salvar vídeo em cache
 */
export async function saveVideoToCache(data: {
  songTitle: string;
  artistName: string;
  youtubeUrl: string;
  videoId: string;
  videoUrl?: string;
  thumbnail?: string;
  title?: string;
  duration?: number;
}) {
  const db = await getDb();
  if (!db) return;

  // Cache expira em 30 dias
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await db.insert(videoCache).values({
    ...data,
    expiresAt,
  });
}

/**
 * Atualizar vídeo em cache
 */
export async function updateVideoInCache(
  songTitle: string,
  artistName: string,
  data: {
    videoUrl?: string;
    thumbnail?: string;
    title?: string;
    duration?: number;
  }
) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(videoCache)
    .set(data)
    .where(
      and(
        eq(videoCache.songTitle, songTitle),
        eq(videoCache.artistName, artistName)
      )
    );
}
