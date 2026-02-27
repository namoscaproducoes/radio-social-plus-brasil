import { describe, it, expect } from 'vitest';
import axios from 'axios';

describe('YouTube API Key Validation', () => {
  it('should validate YouTube API key by searching for a video', async () => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    expect(apiKey).toBeDefined();
    expect(apiKey?.length).toBeGreaterThan(0);

    // Fazer uma requisição simples à API do YouTube
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        q: 'test',
        part: 'snippet',
        type: 'video',
        maxResults: 1,
        key: apiKey,
      },
      timeout: 10000,
    });

    // Verificar se a resposta é válida
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.items).toBeDefined();
    expect(Array.isArray(response.data.items)).toBe(true);
    
    console.log('✅ YouTube API Key válida!');
  }, 15000);
});
