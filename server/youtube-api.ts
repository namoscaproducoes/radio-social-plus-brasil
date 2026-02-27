import { Router, Request, Response } from "express";

const router = Router();

/**
 * Endpoint para buscar vídeos no YouTube
 * GET /api/youtube/search?q=artist+song
 */
router.get("/youtube/search", async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      console.error("YouTube API Key not configured");
      return res.status(500).json({ error: "YouTube API Key not configured" });
    }

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${apiKey}`;

    console.log(`🔍 Searching YouTube for: ${query}`);

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.error) {
      console.error("YouTube API error:", data.error);
      return res.status(500).json({ error: data.error.message });
    }

    if (data.items && data.items.length > 0) {
      const videoId = data.items[0].id.videoId;
      const title = data.items[0].snippet.title;
      const thumbnail = data.items[0].snippet.thumbnails.default?.url;

      console.log(`✅ Found video: ${videoId} - ${title}`);

      return res.json({
        videoId,
        title,
        thumbnail,
      });
    }

    console.log(`⚠️ No videos found for: ${query}`);
    return res.json({ videoId: null });
  } catch (error) {
    console.error("Error searching YouTube:", error);
    return res.status(500).json({
      error: "Error searching YouTube",
      details: String(error),
    });
  }
});

export default router;
