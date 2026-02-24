import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Test suite para procedures de votação
 */
describe("votes router", () => {
  const createPublicContext = (): TrpcContext => {
    return {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };
  };

  it("should add a like vote for a song", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.votes.add({
      songId: 1,
      voteType: "like",
      userId: "test-user-1",
      ipAddress: "127.0.0.1",
      userAgent: "test-agent",
    });

    expect(result.success).toBe(true);
  });

  it("should add a dislike vote for a song", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.votes.add({
      songId: 1,
      voteType: "dislike",
      userId: "test-user-2",
      ipAddress: "127.0.0.1",
      userAgent: "test-agent",
    });

    expect(result.success).toBe(true);
  });

  it("should get votes for a specific song", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Add some votes first
    await caller.votes.add({
      songId: 2,
      voteType: "like",
      userId: "test-user-3",
    });

    // Get votes
    const votes = await caller.votes.getForSong({ songId: 2 });
    expect(Array.isArray(votes)).toBe(true);
  });
});

/**
 * Test suite para procedures de songs
 */
describe("songs router", () => {
  const createPublicContext = (): TrpcContext => {
    return {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };
  };

  it("should get current song", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const currentSong = await caller.songs.current();
    // Pode ser null se não houver música tocando
    expect(currentSong === null || typeof currentSong === "object").toBe(true);
  });

  it("should get songs with votes", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const songs = await caller.songs.withVotes();
    expect(Array.isArray(songs)).toBe(true);
  });

  it("should get top songs by period", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const topSongs = await caller.songs.topByPeriod({
      period: "week",
      limit: 10,
    });

    expect(Array.isArray(topSongs)).toBe(true);
  });

  it("should filter top songs by different periods", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const periods = ["day", "week", "month", "year"] as const;

    for (const period of periods) {
      const songs = await caller.songs.topByPeriod({
        period,
        limit: 5,
      });
      expect(Array.isArray(songs)).toBe(true);
    }
  });
});

/**
 * Test suite para dashboard
 */
describe("dashboard router", () => {
  const createAdminContext = (): TrpcContext => {
    return {
      user: {
        id: 1,
        openId: "admin-user",
        email: "admin@example.com",
        name: "Admin User",
        loginMethod: "manus",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };
  };

  it("should get dashboard stats for authenticated user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.dashboard.stats();
    expect(stats === null || typeof stats === "object").toBe(true);
  });

  it("should get top songs for dashboard", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const topSongs = await caller.dashboard.topSongs({
      period: "week",
      limit: 20,
    });

    expect(Array.isArray(topSongs)).toBe(true);
  });

  it("should filter dashboard songs by different periods", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const periods = ["day", "week", "month", "year"] as const;

    for (const period of periods) {
      const songs = await caller.dashboard.topSongs({
        period,
        limit: 10,
      });
      expect(Array.isArray(songs)).toBe(true);
    }
  });
});
