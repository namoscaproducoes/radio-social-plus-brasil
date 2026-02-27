import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const youtubeRouter = router({
  search: publicProcedure
    .input(
      z.object({
        q: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) {
          console.error('YouTube API Key not configured');
          return { videoId: null, error: 'API not configured' };
        }

        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(input.q)}&type=video&maxResults=1&key=${apiKey}`;
        
        const response = await fetch(searchUrl);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
          const videoId = data.items[0].id.videoId;
          console.log('🎬 Video found:', videoId);
          return { videoId };
        }

        console.log('⚠️ No video found for:', input.q);
        return { videoId: null };
      } catch (error) {
        console.error('Error searching YouTube:', error);
        return { videoId: null, error: String(error) };
      }
    }),
});
