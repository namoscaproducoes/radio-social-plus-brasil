import { describe, it, expect } from 'vitest';
import https from 'https';

describe('YouTube API', () => {
  it('should validate YouTube API key', async () => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).toBeTruthy();

    // Testar uma busca simples para validar a chave
    const searchQuery = encodeURIComponent('test music video');
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${searchQuery}&type=video&maxResults=1&key=${apiKey}`;

    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              if (response.error) {
                reject(new Error(`YouTube API error: ${response.error.message}`));
              } else {
                expect(response.items).toBeDefined();
                resolve(true);
              }
            } catch (e) {
              reject(e);
            }
          });
        })
        .on('error', reject);
    });
  });
});
