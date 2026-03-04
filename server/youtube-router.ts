import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

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

        // Usar YouTube Data API v3
        const apiKey = process.env.YOUTUBE_API_KEY;

        if (!apiKey) {
          console.warn("⚠️ YouTube API Key not configured");
          // Cache o resultado negativo com isSuccess=false para permitir retry em 1 hora
          setCachedVideo(query, null, false);
          return { videoId: null };
        }

        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${apiKey}`;

        console.log(`🔍 Searching YouTube for: ${query}`);

        const response = await fetch(searchUrl);
        const data = await response.json();

        // Verificar se há erro na resposta
        if (data.error) {
          console.error(
            `YouTube API error: ${data.error.code} - ${data.error.message}`
          );

          // Se for erro de quota, cache por menos tempo (1 hora)
          if (data.error.code === 403) {
            console.error("⚠️ YouTube API quota exceeded or access denied");
            videoCache.set(query, {
              videoId: null,
              timestamp: Date.now() - (CACHE_TTL_SUCCESS - 60 * 60 * 1000), // Expira em 1 hora
              isSuccess: false,
            });
          } else {
            // Para outros erros, cache normalmente
            setCachedVideo(query, null, false);
          }

          return { videoId: null, error: data.error.message };
        }

        if (data.items && data.items.length > 0) {
          const video = data.items[0];
          const videoId = video.id.videoId;
          const title = video.snippet.title;
          const thumbnail = video.snippet.thumbnails.default?.url;

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
