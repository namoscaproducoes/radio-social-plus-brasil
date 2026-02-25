import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getCurrentSong, getSongsWithVotes, getVotesForSong, addVote, getDb } from "./db";
import { searchItunesAlbumCover } from "./metadata";
import { scrapePlayerMetadata } from "./player-scraper";

export const appRouter = router({
  system: systemRouter,
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
        const playerData = await scrapePlayerMetadata();

        if (playerData && playerData.title !== "Artista Desconhecido") {
          console.log("Metadados do player scraper:", playerData);
          return playerData;
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
        // Primeiro, encontrar ou criar a musica
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Para simplificar, usar um hash do titulo+artista como songId
        const songHash = `${input.songTitle}-${input.songArtist}`.toLowerCase().replace(/[^a-z0-9]/g, "");
        const songId = Math.abs(songHash.split("").reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)) % 1000000;

        return await addVote({
          songId: songId,
          voteType: input.voteType,
          userId: String(ctx.user.id),
        });
      }),

    getVotes: publicProcedure
      .input(
        z.object({
          songId: z.number(),
        })
      )
      .query(async ({ input }) => {
        return await getVotesForSong(input.songId);
      }),

    dashboard: publicProcedure
      .input(
        z.object({
          period: z.enum(["day", "week", "month", "year"]).optional(),
        })
      )
      .query(async () => {
        const topSongs = await getSongsWithVotes();

        const stats = {
          totalVotes: 0,
          totalLikes: 0,
          totalDislikes: 0,
          period: "day",
        };

        if (Array.isArray(topSongs) && topSongs.length > 0) {
          topSongs.forEach((song: any) => {
            stats.totalVotes += (song.totalVotes || 0);
            stats.totalLikes += (song.likes || 0);
            stats.totalDislikes += (song.dislikes || 0);
          });
        }

        return { topSongs, stats };
      }),
  }),
});

export type AppRouter = typeof appRouter;
