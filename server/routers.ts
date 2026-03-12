
import { calculateTrending } from './trending-helper';
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getCurrentSong, getSongsWithVotes, getVotesForSong, addVote, getDb, addToHistory, getRecentSongHistory, getTopVotedSongsThisMonth, getVoteCountsForSong, addFavorite, removeFavorite, getUserFavorites, createNotification, getUserNotifications, markNotificationAsRead, getUnreadNotificationCount, updateUserProfile, getUserById, getUserLikeCountForSong, checkNotificationExists, getUsersWhoLikedSong } from "./db";
import { eq, and, gt, desc } from "drizzle-orm";
import { searchItunesAlbumCover } from "./metadata";
import { getIcecastMetadata } from "./icecast-metadata";
import { songs, users, passwordResetTokens, userVotes } from "../drizzle/schema";
import crypto from "crypto";
import { youtubeRouter } from "./youtube-router";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail } from "./email";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

import { sdk } from "./_core/sdk";

// Cache em memória para metadados
let metadataCache: any = null;
let lastMetadataTime = 0;
const METADATA_CACHE_TTL = 30000; // 30 segundos

export const appRouter = router({
  system: systemRouter,
  votes: router({
    addVote: protectedProcedure
      .input(
        z.object({
          songId: z.number(),
          voteType: z.enum(["like", "dislike"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!ctx.user) throw new Error("User not authenticated");

        // Verificar se o usuário já votou nesta música
        const existingVote = await db
          .select()
          .from(userVotes)
          .where(
            and(
              eq(userVotes.userId, ctx.user.id),
              eq(userVotes.songId, input.songId)
            )
          )
          .limit(1);

        if (existingVote && existingVote.length > 0) {
          // Atualizar voto existente
          await db
            .update(userVotes)
            .set({ voteType: input.voteType })
            .where(
              and(
                eq(userVotes.userId, ctx.user.id),
                eq(userVotes.songId, input.songId)
              )
            );
        } else {
          // Criar novo voto
          await db.insert(userVotes).values({
            userId: ctx.user.id,
            songId: input.songId,
            voteType: input.voteType,
          });
        }

        // Se o voto eh um like, notificar usuarios que ja curtiram essa musica 2+ vezes
        if (input.voteType === 'like') {
          try {
            // Buscar usuarios que ja curtiram essa musica 2+ vezes
            const usersToNotify = await getUsersWhoLikedSong(input.songId, 2);
            
            // Buscar informacoes da musica
            const song = await db.select().from(songs).where(eq(songs.id, input.songId)).limit(1);
            
            if (song && song.length > 0) {
              const songInfo = song[0];
              
              // Notificar cada usuario (exceto o que acabou de votar)
              for (const userId of usersToNotify) {
                if (userId !== ctx.user.id) {
                  // Verificar se ja existe notificacao nao lida
                  const exists = await checkNotificationExists(userId, input.songId, 'new_votes');
                  
                  if (!exists) {
                    await createNotification(
                      userId,
                      input.songId,
                      'new_votes',
                      `Alguem curtiu "${songInfo.title}"`,
                      `Um usuario tambem gostou de "${songInfo.title}" de ${songInfo.artist}`
                    );
                  }
                }
              }
            }
          } catch (error) {
            console.error('Erro ao notificar usuarios:', error);
          }
        }

        return { success: true };
      }),

    getUserVotes: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!ctx.user) throw new Error("User not authenticated");

      const votes = await db
        .select({
          id: userVotes.id,
          userId: userVotes.userId,
          songId: userVotes.songId,
          voteType: userVotes.voteType,
          createdAt: userVotes.createdAt,
          songTitle: songs.title,
          songArtist: songs.artist,
          albumCover: songs.albumCover,
        })
        .from(userVotes)
        .leftJoin(songs, eq(userVotes.songId, songs.id))
        .where(eq(userVotes.userId, ctx.user.id))
        .orderBy(userVotes.createdAt);

      return votes;
    }),

    getVoteStats: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!ctx.user) throw new Error("User not authenticated");

      const votes = await db
        .select()
        .from(userVotes)
        .where(eq(userVotes.userId, ctx.user.id));

      const likes = votes.filter(v => v.voteType === "like").length;
      const dislikes = votes.filter(v => v.voteType === "dislike").length;

      return { total: votes.length, likes, dislikes };
    }),
  }),

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
        // Gerar openId único para usuários de email/senha
        const openId = `email_${crypto.randomBytes(16).toString('hex')}`;

        const result = await db.insert(users).values({
          name: input.name,
          email: input.email,
          passwordHash,
          loginMethod: "email",
          openId,
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
      .mutation(async ({ input, ctx }) => {
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

        // Criar sessão JWT e cookie usando openId
        const sessionToken = await sdk.createSessionToken(user.openId || user.id.toString(), {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

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

    getSongIdByMetadata: publicProcedure
      .input(
        z.object({
          title: z.string(),
          artist: z.string(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const result = await db
          .select()
          .from(songs)
          .where(
            and(
              eq(songs.title, input.title),
              eq(songs.artist, input.artist)
            )
          )
          .limit(1);

        if (result.length > 0) {
          return result[0];
        }

        // Se a música não existir, criar automaticamente
        try {
          await db.insert(songs).values({
            title: input.title,
            artist: input.artist,
            albumCover: '',
          });

          // Buscar a música criada
          const newResult = await db
            .select()
            .from(songs)
            .where(
              and(
                eq(songs.title, input.title),
                eq(songs.artist, input.artist)
              )
            )
            .limit(1);

          return newResult.length > 0 ? newResult[0] : null;
        } catch (error) {
          console.error('Erro ao criar música:', error);
          return null;
        }
      }),

    updateMissingAlbumCovers: protectedProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).optional().default(10),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Apenas admin pode atualizar capas
        if (ctx.user?.role !== 'admin') {
          throw new Error('Acesso negado: apenas administradores podem atualizar capas');
        }

        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Buscar músicas sem capa
        const result = await db.execute(`
          SELECT id, title, artist FROM songs 
          WHERE albumCover IS NULL OR albumCover = '' 
          LIMIT ${input.limit}
        `);

        const rows = Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) ? result[0] : [];
        
        console.log(`Encontradas ${rows.length} músicas sem capa`);
        
        let updated = 0;
        for (const song of rows as any[]) {
          try {
            const cover = await searchItunesAlbumCover(song.artist, song.title);
            if (cover) {
              const escapedCover = cover.replace(/'/g, "\\'");
              await db.execute(`
                UPDATE songs SET albumCover = '${escapedCover}' WHERE id = ${song.id}
              `);
              updated++;
              console.log(`✓ Atualizado: ${song.title}`);
            }
          } catch (error) {
            console.error(`Erro ao processar ${song.title}:`, error);
          }
          // Aguardar 500ms entre requisições
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        return { success: true, updated, total: rows.length };
      }),

    metadata: publicProcedure.query(async () => {
      try {
        // Verificar cache
        const now = Date.now();
        if (metadataCache && (now - lastMetadataTime) < METADATA_CACHE_TTL) {
          console.log("Retornando metadados do cache");
          return metadataCache;
        }

        const db = await getDb();
        const icecastData = await getIcecastMetadata();

        if (icecastData && icecastData.title !== "Musica Desconhecida") {
          console.log("Metadados do Icecast:", icecastData);
          
          const albumCover = await searchItunesAlbumCover(icecastData.artist, icecastData.title);
          
          // Buscar ou criar a música para obter o ID
          let songId = null;
          if (db) {
            const result = await db
              .select()
              .from(songs)
              .where(
                and(
                  eq(songs.title, icecastData.title),
                  eq(songs.artist, icecastData.artist)
                )
              )
              .limit(1);

            if (result.length > 0) {
              songId = result[0].id;
            } else {
              // Criar a música se não existir
              await db.insert(songs).values({
                title: icecastData.title,
                artist: icecastData.artist,
                albumCover: albumCover || '',
              });

              // Buscar o ID da música criada
              const newResult = await db
                .select()
                .from(songs)
                .where(
                  and(
                    eq(songs.title, icecastData.title),
                    eq(songs.artist, icecastData.artist)
                  )
                )
                .limit(1);

              if (newResult.length > 0) {
                songId = newResult[0].id;
              }
            }
          }
          
          const response = {
            title: icecastData.title,
            artist: icecastData.artist,
            albumCover,
            source: "icecast",
            songId,
          };
          
          // Atualizar cache
          metadataCache = response;
          lastMetadataTime = now;
          
          return response;
        }

        return {
          title: "Musica Desconhecida",
          artist: "Artista Desconhecido",
          albumCover: null,
          source: "error",
          songId: null,
        };
      } catch (error) {
        console.error("Erro ao buscar metadados:", error);
        return {
          title: "Musica Desconhecida",
          artist: "Artista Desconhecido",
          albumCover: null,
          source: "error",
          songId: null,
        };
      }
    }),

    withVotes: publicProcedure.query(async () => {
      return await getSongsWithVotes();
    }),

    vote: publicProcedure
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

        // Registrar o voto com ipAddress e userAgent
        return await addVote({
          songId: songId,
          voteType: input.voteType,
          userId: ctx.user ? String(ctx.user.id) : null,
          ipAddress: ctx.req.ip || null,
          userAgent: ctx.req.get('user-agent') || null,
        });
      }),

    ranking: publicProcedure
      .input(
        z.object({
          period: z.enum(["day", "week", "month", "year"]).optional(),
          genreId: z.number().optional(),
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

        // Converter para string ISO para usar na query
        const startDateStr = startDate.toISOString();

        const result = await db.execute(`
          SELECT 
            s.id,
            s.title,
            s.artist,
            s.albumCover,
            s.duration,
            CAST((COALESCE(SUM(CASE WHEN v.voteType = 'like' AND v.createdAt >= '${startDateStr}' THEN 1 ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN uv.voteType = 'like' AND uv.createdAt >= '${startDateStr}' THEN 1 ELSE 0 END), 0)) AS UNSIGNED) as likes,
            CAST((COALESCE(SUM(CASE WHEN v.voteType = 'dislike' AND v.createdAt >= '${startDateStr}' THEN 1 ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN uv.voteType = 'dislike' AND uv.createdAt >= '${startDateStr}' THEN 1 ELSE 0 END), 0)) AS UNSIGNED) as dislikes,
            CAST((COALESCE(COUNT(DISTINCT CASE WHEN v.createdAt >= '${startDateStr}' THEN v.id END), 0) + COALESCE(COUNT(DISTINCT CASE WHEN uv.createdAt >= '${startDateStr}' THEN uv.id END), 0)) AS UNSIGNED) as totalVotes
          FROM songs s
          LEFT JOIN votes v ON s.id = v.songId
          LEFT JOIN userVotes uv ON s.id = uv.songId
          GROUP BY s.id
          HAVING totalVotes > 0
          ORDER BY totalVotes DESC
        `)
        
        // db.execute retorna [rows, fields], entao extrair apenas as linhas
        const rows = Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) ? result[0] : [];
        
        // Converter valores para numero inteiro (evitar Buffer binario)
        const convertedRows = rows.map((row: any, index: number) => {
          const likes = parseInt(String(row.likes), 10) || 0;
          const dislikes = parseInt(String(row.dislikes), 10) || 0;
          const totalVotes = parseInt(String(row.totalVotes), 10) || 0;
          
          return {
            ...row,
            likes,
            dislikes,
            totalVotes,
            rank: index + 1,
            trending: 0, // Trending será calculado no frontend comparando com dados anteriores
          };
        });
        
        // Calcular totais explicitamente no backend
        const totalLikes = convertedRows.reduce((sum: number, row: any) => sum + (row.likes || 0), 0);
        const totalDislikes = convertedRows.reduce((sum: number, row: any) => sum + (row.dislikes || 0), 0);
        const totalVotesSum = convertedRows.reduce((sum: number, row: any) => sum + (row.totalVotes || 0), 0);
        
        // Retornar com metadados de totais - como strings para evitar problemas de serialização
        return {
          songs: convertedRows,
          stats: {
            totalLikes: String(totalLikes),
            totalDislikes: String(totalDislikes),
            totalVotes: String(totalVotesSum),
            totalSongs: convertedRows.length,
          },
        };
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

    checkAndNotifyFavoritePlayed: protectedProcedure
      .input(
        z.object({
          songId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error('User not authenticated');

        try {
          // Contar quantos likes o usuario deu para essa musica
          const likeCount = await getUserLikeCountForSong(ctx.user.id, input.songId);

          // Se o usuario deu 2+ likes, criar notificacao
          if (likeCount >= 2) {
            // Verificar se ja existe notificacao nao lida
            const exists = await checkNotificationExists(ctx.user.id, input.songId, 'favorite_played');

            if (!exists) {
              // Buscar informacoes da musica
              const db = await getDb();
              if (db) {
                const song = await db.select().from(songs).where(eq(songs.id, input.songId)).limit(1);

                if (song && song.length > 0) {
                  const songInfo = song[0];
                  await createNotification(
                    ctx.user.id,
                    input.songId,
                    'favorite_played',
                    `Sua musica favorita esta tocando!`,
                    `"${songInfo.title}" de ${songInfo.artist} esta tocando agora na radio`
                  );
                }
              }
            }
          }

          return { success: true, likeCount };
        } catch (error) {
          console.error('Erro ao verificar musica favorita:', error);
          throw error;
        }
      }),
  }),

  notifications: router({
    addFavorite: protectedProcedure
      .input(
        z.object({
          songId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("User not authenticated");
        await addFavorite(ctx.user.id, input.songId);
        return { success: true };
      }),

    removeFavorite: protectedProcedure
      .input(
        z.object({
          songId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("User not authenticated");
        await removeFavorite(ctx.user.id, input.songId);
        return { success: true };
      }),

    getFavorites: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("User not authenticated");
      return await getUserFavorites(ctx.user.id);
    }),

    getNotifications: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(20),
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("User not authenticated");
        return await getUserNotifications(ctx.user.id, input.limit);
      }),

    markAsRead: protectedProcedure
      .input(
        z.object({
          notificationId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("User not authenticated");
        await markNotificationAsRead(input.notificationId);
        return { success: true };
      }),

    getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("User not authenticated");
      return await getUnreadNotificationCount(ctx.user.id);
    }),
  }),
  user: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("User not authenticated");
      return await getUserById(ctx.user.id);
    }),
    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().optional(),
          email: z.string().email().optional(),
          avatarUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("User not authenticated");
        await updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
    uploadAvatar: protectedProcedure
      .input(
        z.object({
          imageUrl: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("User not authenticated");
        
        try {
          // Converter base64 para buffer
          const base64Data = input.imageUrl.replace(/^data:image\/[a-z]+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Importar storagePut dinamicamente
          const { storagePut } = await import('./storage');
          
          // Upload para S3
          const { url } = await storagePut(
            `avatars/${ctx.user.id}-${Date.now()}.jpg`,
            buffer,
            'image/jpeg'
          );
          
          // Salvar URL S3 no banco de dados
          await updateUserProfile(ctx.user.id, { avatarUrl: url });
          
          return { success: true, avatarUrl: url };
        } catch (error) {
          console.error('Avatar upload error:', error);
          throw new Error(`Falha ao fazer upload da foto: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
        }
      }),

    exportUsers: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("User not authenticated");
      if (ctx.user.role !== 'admin') throw new Error("Acesso negado: apenas administradores podem exportar usuarios");
      
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Buscar todos os usuarios com nome e email
      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt));
      
      return allUsers;
    }),

    getAllUsers: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("User not authenticated");
      if (ctx.user.role !== 'admin') throw new Error("Acesso negado: apenas administradores podem ver lista de usuarios");
      
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Buscar todos os usuarios com dados completos
      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          createdAt: users.createdAt,
          role: users.role,
        })
        .from(users)
        .orderBy(desc(users.createdAt));
      
      return allUsers;
    }),

    deleteUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("User not authenticated");
        if (ctx.user.role !== 'admin') throw new Error("Acesso negado: apenas administradores podem deletar usuarios");
        
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Deletar usuário
        const result = await db
          .delete(users)
          .where(eq(users.id, input.userId));
        
        return { success: true, message: "Usuário deletado com sucesso" };
      }),

    promoteUserToAdmin: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("User not authenticated");
        if (ctx.user.role !== 'admin') throw new Error("Acesso negado: apenas administradores podem promover usuarios");
        
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Promover usuário para admin
        const result = await db
          .update(users)
          .set({ role: 'admin' })
          .where(eq(users.id, input.userId));
        
        return { success: true, message: "Usuário promovido a administrador com sucesso" };
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

