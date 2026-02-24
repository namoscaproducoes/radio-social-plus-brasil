import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getCurrentSong, getSongsWithVotes, getVotesForSong, addVote, getDb } from "./db";

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

    withVotes: publicProcedure.query(async () => {
      return await getSongsWithVotes();
    }),

    topByPeriod: publicProcedure
      .input(
        z.object({
          period: z.enum(["day", "week", "month", "year"]),
          limit: z.number().default(10),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        let dateFilter = "";

        switch (input.period) {
          case "day":
            dateFilter = `DATE(v.createdAt) = DATE(NOW())`;
            break;
          case "week":
            dateFilter = `v.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
            break;
          case "month":
            dateFilter = `v.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
            break;
          case "year":
            dateFilter = `v.createdAt >= DATE_SUB(NOW(), INTERVAL 365 DAY)`;
            break;
        }

        const result = await db.execute(`
          SELECT 
            s.id,
            s.title,
            s.artist,
            s.albumCover,
            COUNT(CASE WHEN v.voteType = 'like' THEN 1 END) as likes,
            COUNT(CASE WHEN v.voteType = 'dislike' THEN 1 END) as dislikes,
            COUNT(v.id) as totalVotes
          FROM songs s
          LEFT JOIN votes v ON s.id = v.songId AND ${dateFilter}
          GROUP BY s.id
          HAVING COUNT(v.id) > 0
          ORDER BY totalVotes DESC
          LIMIT ${input.limit}
        `);
        return result;
      }),
  }),

  votes: router({
    add: publicProcedure
      .input(
        z.object({
          songId: z.number(),
          voteType: z.enum(["like", "dislike"]),
          userId: z.string().optional(),
          ipAddress: z.string().optional(),
          userAgent: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const result = await addVote({
            songId: input.songId,
            voteType: input.voteType,
            userId: input.userId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
          });
          return { success: true, data: result };
        } catch (error) {
          console.error("Error adding vote:", error);
          return { success: false, error: "Failed to add vote" };
        }
      }),

    getForSong: publicProcedure
      .input(z.object({ songId: z.number() }))
      .query(async ({ input }) => {
        return await getVotesForSong(input.songId);
      }),
  }),

  dashboard: router({
    stats: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return null;

      const result = await db.execute(`
        SELECT 
          COUNT(DISTINCT s.id) as totalSongs,
          COUNT(v.id) as totalVotes,
          COUNT(CASE WHEN v.voteType = 'like' THEN 1 END) as totalLikes,
          COUNT(CASE WHEN v.voteType = 'dislike' THEN 1 END) as totalDislikes
        FROM songs s
        LEFT JOIN votes v ON s.id = v.songId
      `);
      return result[0] || null;
    }),

    topSongs: protectedProcedure
      .input(
        z.object({
          period: z.enum(["day", "week", "month", "year"]),
          limit: z.number().default(20),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        let dateFilter = "";

        switch (input.period) {
          case "day":
            dateFilter = `AND DATE(v.createdAt) = DATE(NOW())`;
            break;
          case "week":
            dateFilter = `AND v.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
            break;
          case "month":
            dateFilter = `AND v.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
            break;
          case "year":
            dateFilter = `AND v.createdAt >= DATE_SUB(NOW(), INTERVAL 365 DAY)`;
            break;
        }

        const result = await db.execute(`
          SELECT 
            s.id,
            s.title,
            s.artist,
            s.albumCover,
            COUNT(CASE WHEN v.voteType = 'like' THEN 1 END) as likes,
            COUNT(CASE WHEN v.voteType = 'dislike' THEN 1 END) as dislikes,
            COUNT(v.id) as totalVotes,
            ROUND(COUNT(CASE WHEN v.voteType = 'like' THEN 1 END) / COUNT(v.id) * 100, 2) as likePercentage
          FROM songs s
          LEFT JOIN votes v ON s.id = v.songId
          WHERE 1=1 ${dateFilter}
          GROUP BY s.id
          ORDER BY totalVotes DESC
          LIMIT ${input.limit}
        `);
        return result;
      }),
  }),
});

export type AppRouter = typeof appRouter;
