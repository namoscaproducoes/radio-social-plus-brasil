import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getCurrentSong, getSongsWithVotes, getVotesForSong, addVote, getDb, addToHistory, getRecentSongHistory, getTopVotedSongsThisMonth, getVoteCountsForSong } from "./db";
import { eq } from "drizzle-orm";
import { searchItunesAlbumCover } from "./metadata";
import { getIcecastMetadata } from "./icecast-metadata";
import { songs, users, passwordResetTokens } from "../drizzle/schema";
import crypto from "crypto";
import { youtubeRouter } from "./youtube-router";
import bcrypt from "bcryptjs";
import { and, gt } from "drizzle-orm";
import { sendPasswordResetEmail } from "./email";

export const appRouter = router({
  system: systemRouter,
  youtube: youtubeRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    register: publicProcedure
      .input(
        z.object({
          name: z.string().min(2),
          email: z.string().email(),
          password: z.string().min(6),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const existingUser = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
        if (existingUser && existingUser.length > 0) {
          throw new Error("Email já cadastrado");
        }

        const passwordHash = await bcrypt.hash(input.password, 10);

        const result = await db.insert(users).values({
          name: input.name,
          email: input.email,
          passwordHash,
          loginMethod: "email",
          openId: null,
        });

        return { success: true, userId: (result as any).insertId || 0 };
      }),
    
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const userResult = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
        if (!userResult || userResult.length === 0) {
          throw new Error("Email ou senha incorretos");
        }

        const user = userResult[0];

        if (!user.passwordHash) {
          throw new Error("Usuário não configurado para login por email");
        }

        const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
        if (!isPasswordValid) {
          throw new Error("Email ou senha incorretos");
        }

        await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

        return { success: true, user: { id: user.id, email: user.email, name: user.name } };
      }),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    forgotPassword: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          frontendUrl: z.string().url().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const userResult = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
        if (!userResult || userResult.length === 0) {
          return { success: true, message: "Se o email existir, um link de recuperação será enviado" };
        }

        const user = userResult[0];

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

        await db.insert(passwordResetTokens).values({
          userId: user.id,
          token,
          expiresAt,
        });

        // Enviar email de recuperação
        const frontendUrl = input.frontendUrl || `${ctx.req.protocol}://${ctx.req.get('host')}`;
        const emailSent = await sendPasswordResetEmail(
          user.email || "",
          user.name || "Usuário",
          token,
          frontendUrl
        );

        if (!emailSent) {
          console.warn(`[Auth] Failed to send password reset email to ${user.email}`);
        }

        return { success: true, message: "Se o email existir, um link de recuperação será enviado" };
      }),

    resetPassword: publicProcedure
      .input(
        z.object({
          token: z.string(),
          newPassword: z.string().min(6),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const tokenResult = await db
          .select()
          .from(passwordResetTokens)
          .where(
            and(
              eq(passwordResetTokens.token, input.token),
              gt(passwordResetTokens.expiresAt, new Date())
            )
          )
          .limit(1);

        if (!tokenResult || tokenResult.length === 0) {
          throw new Error("Token inválido ou expirado");
        }

        const resetToken = tokenResult[0];

        const passwordHash = await bcrypt.hash(input.newPassword, 10);

        await db
          .update(users)
          .set({ passwordHash })
          .where(eq(users.id, resetToken.userId));

        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, resetToken.id));

        return { success: true, message: "Senha redefinida com sucesso" };
      }),

    verifyResetToken: publicProcedure
      .input(
        z.object({
          token: z.string(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const tokenResult = await db
          .select()
          .from(passwordResetTokens)
          .where(
            and(
              eq(passwordResetTokens.token, input.token),
              gt(passwordResetTokens.expiresAt, new Date())
            )
          )
          .limit(1);

        return { valid: tokenResult && tokenResult.length > 0 };
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

    topVotedThisMonth: publicProcedure
      .input(
        z.object({
          voteType: z.enum(["like", "dislike"]).optional().default("like"),
          limit: z.number().min(1).max(20).optional().default(10),
        })
      )
      .query(async ({ input }) => {
        return await getTopVotedSongsThisMonth(input.voteType, input.limit);
      }),

    voteCount: publicProcedure
      .input(
        z.object({
          songId: z.number(),
        })
      )
      .query(async ({ input }) => {
        return await getVoteCountsForSong(input.songId);
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
