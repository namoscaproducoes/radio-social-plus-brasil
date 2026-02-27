import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb, addToHistory, getRecentSongHistory } from "./db";

describe("Song History", () => {
  beforeAll(async () => {
    // Limpar histórico antes dos testes
    const db = await getDb();
    if (db) {
      await db.execute("DELETE FROM songHistory");
    }
  });

  afterAll(async () => {
    // Limpar histórico após os testes
    const db = await getDb();
    if (db) {
      await db.execute("DELETE FROM songHistory");
    }
  });

  it("should add a song to history", async () => {
    const result = await addToHistory({
      title: "Test Song",
      artist: "Test Artist",
      albumCover: "https://example.com/cover.jpg",
    });

    expect(result).toBeDefined();
  });

  it("should retrieve recent song history", async () => {
    // Adicionar algumas músicas
    await addToHistory({
      title: "Song 1",
      artist: "Artist 1",
      albumCover: "https://example.com/cover1.jpg",
    });

    await addToHistory({
      title: "Song 2",
      artist: "Artist 2",
      albumCover: "https://example.com/cover2.jpg",
    });

    await addToHistory({
      title: "Song 3",
      artist: "Artist 3",
      albumCover: "https://example.com/cover3.jpg",
    });

    // Buscar histórico
    const history = await getRecentSongHistory(10);

    expect(history).toBeDefined();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].title).toBeDefined();
    expect(history[0].artist).toBeDefined();
  });

  it("should return songs in reverse chronological order", async () => {
    // Limpar e adicionar músicas com delays
    const db = await getDb();
    if (db) {
      await db.execute("DELETE FROM songHistory");
    }

    await addToHistory({
      title: "First Song",
      artist: "First Artist",
    });

    // Pequeno delay para garantir timestamps diferentes
    await new Promise(resolve => setTimeout(resolve, 100));

    await addToHistory({
      title: "Second Song",
      artist: "Second Artist",
    });

    const history = await getRecentSongHistory(10);

    expect(history.length).toBeGreaterThanOrEqual(2);
    // A música mais recente deve estar primeiro
    expect(history[0].title).toBe("Second Song");
    expect(history[1].title).toBe("First Song");
  });

  it("should respect the limit parameter", async () => {
    // Limpar e adicionar 25 músicas
    const db = await getDb();
    if (db) {
      await db.execute("DELETE FROM songHistory");
    }

    for (let i = 0; i < 25; i++) {
      await addToHistory({
        title: `Song ${i}`,
        artist: `Artist ${i}`,
      });
    }

    // Buscar apenas 10
    const history = await getRecentSongHistory(10);

    expect(history.length).toBeLessThanOrEqual(10);
  });

  it("should handle missing albumCover gracefully", async () => {
    const result = await addToHistory({
      title: "Song Without Cover",
      artist: "Artist",
      // albumCover não definido
    });

    expect(result).toBeDefined();

    const history = await getRecentSongHistory(1);
    expect(history[0].albumCover).toBeNull();
  });
});
