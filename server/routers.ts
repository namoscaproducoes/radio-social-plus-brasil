import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getCurrentSong, getSongsWithVotes, getVotesForSong, addVote, getDb, addToHistory, getRecentSongHistory } from "./db";
import { eq } from "drizzle-orm";
import { searchItunesAlbumCover } from "./metadata";
import { getIcecastMetadata } from "./icecast-metadata";
import { songs } from "../drizzle/schema";
import { youtubeRouter } from "./youtube-router";

export const appRouter = router({
  system: systemRouter,
  youtube: youtubeRouter,
  videos: router({
    search: publicProcedure
      .input(
        z.object({
          songTitle: z.string(),
          artistName: z.string(),
        })
      )
      .query(async ({ input }) => {
        try {
          const { extractYouTubeVideo } = await import("./youtube-extractor");
          const result = await extractYouTubeVideo(input.songTitle, input.artistName);
          return result;
        } catch (error) {
          console.error("Erro ao buscar vídeo:", error);
          return {
            error: "Erro ao buscar vídeo",
            youtubeUrl: null,
          };
        }
      }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  songs: router({
    current: publicProcedure.query(async () => {
      return await getCurrentSong();
    }),

    metadata: publicProcedure.query(async () => {
      try {
        const icecastData = await getIcecastMetadata();

        if (icecastData && icecastData.title !== "Musica Desconhecida") {
          console.log("Metadados do Icecast:", icecastData);
          
          const albumCover = await searchItunesAlbumCover(icecastData.artist, icecastData.title);
          
          return {
            title: icecastData.title,
            artist: icecastData.artist,
            albumCover,
            source: "icecast",
          };
        }

        return {
          title: "Musica Desconhecida",
          artist: "Artista Desconhecido",
          albumCover: null,
          source: "error",
        };
      } catch (error) {
        console.error("Erro ao buscar metadados:", error);
        return {
          title: "Musica Desconhecida",
          artist: "Artista Desconhecido",
          albumCover: null,
          source: "error",
        };
      }
    }),

    withVotes: publicProcedure.query(async () => {
      return await getSongsWithVotes();
    }),

    vote: protectedProcedure
      .input(
        z.object({
          songTitle: z.string(),
          songArtist: z.string(),
          voteType: z.enum(["like", "dislike"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Primeiro, criar ou atualizar a música
        const externalId = `${input.songTitle}-${input.songArtist}`.toLowerCase().replace(/[^a-z0-9]/g, "");
        
        // Upsert da música
        await db.insert(songs).values({
          title: input.songTitle,
          artist: input.songArtist,
          externalId: externalId,
        }).onDuplicateKeyUpdate({
          set: {
            title: input.songTitle,
            artist: input.songArtist,
          },
        });

        // Buscar o ID da música que foi inserida/atualizada
        const songResult = await db.select().from(songs).where(eq(songs.externalId, externalId)).limit(1);
        if (!songResult || songResult.length === 0) {
          throw new Error("Failed to create/find song");
        }

        const songId = songResult[0].id;

        // Registrar o voto
        return await addVote({
          songId: songId,
          voteType: input.voteType,
          userId: String(ctx.user.id),
        });
      }),

    ranking: publicProcedure
      .input(
        z.object({
          period: z.enum(["day", "week", "month", "year"]).optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        // Calcular data de início baseado no período
        const now = new Date();
        let startDate = new Date();
        
        switch (input.period) {
          case "day":
            startDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            startDate.setDate(now.getDate() - now.getDay());
            startDate.setHours(0, 0, 0, 0);
            break;
          case "month":
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            break;
          case "year":
            startDate.setMonth(0, 1);
            startDate.setHours(0, 0, 0, 0);
            break;
          default:
            // Sem filtro de data
            startDate = new Date(0);
        }

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
          LEFT JOIN votes v ON s.id = v.songId AND v.createdAt >= '${startDate.toISOString()}'
          GROUP BY s.id
          HAVING totalVotes > 0
          ORDER BY totalVotes DESC
        `)
        
        return Array.isArray(result) && result.length > 0 ? result[0] : [];
      }),

    history: publicProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(50).optional().default(20),
        })
      )
      .query(async ({ input }) => {
        return await getRecentSongHistory(input.limit);
      }),

    addToHistory: publicProcedure
      .input(
        z.object({
          title: z.string(),
          artist: z.string(),
          albumCover: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await addToHistory({
          title: input.title,
          artist: input.artist,
          albumCover: input.albumCover,
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;

// Helper function - make sure it's defined
function getSessionCookieOptions(req: any) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };
}

// Import getSessionCookieOptions from _core if available
if (typeof getSessionCookieOptions === 'undefined') {
  console.warn('getSessionCookieOptions not properly imported');
}
