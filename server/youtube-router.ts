import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { search } from "youtube-search-without-api-key";

// Cache em memória para vídeos já buscados
// TTL diferente para sucesso (24h) vs falha (1h) para permitir retry
const videoCache = new Map<string, { videoId: string | null; timestamp: number; isSuccess: boolean }>();
const CACHE_TTL_SUCCESS = 24 * 60 * 60 * 1000; // 24 horas para vídeos encontrados
const CACHE_TTL_FAILURE = 60 * 60 * 1000; // 1 hora para vídeos não encontrados (permite retry)

function getCachedVideo(query: string): string | null | undefined {
  const cached = videoCache.get(query);
  if (!cached) return undefined;

  const ttl = cached.isSuccess ? CACHE_TTL_SUCCESS : CACHE_TTL_FAILURE;
  if (Date.now() - cached.timestamp < ttl) {
    console.log(`📦 Cache hit for: ${query}`);
    return cached.videoId;
  }

  // Cache expirou, remover
  videoCache.delete(query);
  return undefined;
}

function setCachedVideo(query: string, videoId: string | null, isSuccess: boolean = true): void {
  videoCache.set(query, { videoId, timestamp: Date.now(), isSuccess });
}

export const youtubeRouter = router({
  search: publicProcedure
    .input(
      z.object({
        q: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const query = input.q.trim();

        if (!query) {
          console.log("⚠️ Empty search query");
          return { videoId: null };
        }

        // Verificar cache primeiro
        const cachedVideoId = getCachedVideo(query);
        if (cachedVideoId !== undefined) {
          if (cachedVideoId) {
            console.log(`✅ Returning cached video: ${cachedVideoId}`);
            return { videoId: cachedVideoId };
          } else {
            console.log(`⚠️ Returning cached null for: ${query}`);
            return { videoId: null };
          }
        }

        console.log(`🔍 Searching YouTube (no API key needed) for: ${query}`);

        // Usar youtube-search-without-api-key para buscar vídeo
        // Passa apenas a string de query (não um objeto)
        const results = await search(query);

        if (results && results.length > 0) {
          const video = results[0];
          const videoId = video.id.videoId;
          const title = video.title;
          const thumbnail = video.snippet?.thumbnails?.default?.url || video.url;

          console.log(`✅ Video found: ${videoId} - ${title}`);

          // Cache o resultado positivo com isSuccess=true (24 horas)
          setCachedVideo(query, videoId, true);

          return {
            videoId,
            title,
            thumbnail,
          };
        }

        console.log(`⚠️ No videos found for: ${query}`);
        // Cache o resultado negativo com isSuccess=false (1 hora para retry)
        setCachedVideo(query, null, false);
        return { videoId: null };
      } catch (error) {
        console.error("Error searching YouTube:", error);
        // Em caso de erro de rede, não cachear para permitir retry
        return { videoId: null };
      }
    }),
});
