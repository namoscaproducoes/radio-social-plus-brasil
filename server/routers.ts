import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getCurrentSong, getSongsWithVotes, getVotesForSong, addVote, getDb } from "./db";
import { eq } from "drizzle-orm";
import { searchItunesAlbumCover } from "./metadata";
import { scrapePlayerMetadata } from "./player-scraper";
import { songs } from "../drizzle/schema";

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
