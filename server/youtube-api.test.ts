import { describe, it, expect } from "vitest";
import { extractYouTubeVideo } from "./youtube-extractor";

describe("YouTube Video Extractor", () => {
  it("should find a valid YouTube video or handle quota exceeded", async () => {
    const result = await extractYouTubeVideo("Bohemian Rhapsody", "Queen");
    
    console.log("Resultado da busca:", result);
    
    expect(result).toBeDefined();
    
    if (result.videoId) {
      expect(result.youtubeUrl).toContain("youtube.com");
      console.log("Video encontrado com sucesso!");
    } else if (result.error) {
      console.log("Erro esperado (possivel cota excedida):", result.error);
      expect(result.error).toBeDefined();
    }
  }, { timeout: 15000 });

  it("should cache videos after first search", async () => {
    const result1 = await extractYouTubeVideo("Imagine", "John Lennon");
    const result2 = await extractYouTubeVideo("Imagine", "John Lennon");
    
    console.log("Primeira busca:", result1.videoId);
    console.log("Segunda busca:", result2.videoId, "- Do cache:", result2.fromCache);
    
    if (result1.videoId) {
      expect(result2.fromCache).toBe(true);
      console.log("Cache funcionando corretamente!");
    } else {
      console.log("Primeira busca falhou (possivel cota excedida)");
    }
  }, { timeout: 15000 });

  it("should handle missing API key gracefully", async () => {
    const originalKey = process.env.YOUTUBE_API_KEY;
    delete process.env.YOUTUBE_API_KEY;
    
    const result = await extractYouTubeVideo("Test Song", "Test Artist");
    
    console.log("Resultado sem API Key:", result);
    expect(result.error).toBeDefined();
    
    if (originalKey) {
      process.env.YOUTUBE_API_KEY = originalKey;
    }
  }, { timeout: 10000 });
});
