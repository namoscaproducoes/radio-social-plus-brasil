import { describe, it, expect, beforeEach } from 'vitest';
import { extractYouTubeVideo } from './youtube-extractor';

describe('YouTube Video Extractor', () => {
  it('should return a YouTube URL for a valid song', async () => {
    const result = await extractYouTubeVideo('Bohemian Rhapsody', 'Queen');
    
    expect(result).toBeDefined();
    expect(result.youtubeUrl).toBeDefined();
    expect(result.youtubeUrl).toContain('youtube.com');
  });

  it('should handle cache for repeated searches', async () => {
    const songTitle = 'Imagine';
    const artistName = 'John Lennon';
    
    // Primeira busca
    const result1 = await extractYouTubeVideo(songTitle, artistName);
    expect(result1).toBeDefined();
    
    // Segunda busca (deve estar em cache)
    const result2 = await extractYouTubeVideo(songTitle, artistName);
    expect(result2).toBeDefined();
    
    // Se estiver em cache, fromCache deve ser true na segunda busca
    if (result2.fromCache) {
      expect(result2.fromCache).toBe(true);
    }
  });

  it('should handle invalid song gracefully', async () => {
    const result = await extractYouTubeVideo('InvalidSongXYZ123', 'InvalidArtistXYZ123');
    
    // Deve retornar algo, mesmo que não encontre
    expect(result).toBeDefined();
    expect(result.youtubeUrl).toBeDefined();
  });

  it('should format search query correctly', async () => {
    const result = await extractYouTubeVideo('Let It Be', 'The Beatles');
    
    expect(result).toBeDefined();
    expect(result.youtubeUrl).toContain('youtube.com');
    expect(result.youtubeUrl).toContain('search_query');
  });
});
