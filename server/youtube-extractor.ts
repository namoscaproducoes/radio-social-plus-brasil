import axios from "axios";
import * as cheerio from "cheerio";
import { getVideoFromCache, saveVideoToCache } from "./video-cache";

/**
 * Buscar vídeo real no YouTube e extrair URL pública
 */
export async function extractYouTubeVideo(songTitle: string, artistName: string) {
  try {
    // Verificar cache primeiro
    const cached = await getVideoFromCache(songTitle, artistName);
    if (cached && cached.videoUrl) {
      console.log(`✅ Vídeo encontrado em cache: ${cached.videoId}`);
      return {
        videoId: cached.videoId,
        youtubeUrl: cached.youtubeUrl,
        videoUrl: cached.videoUrl,
        thumbnail: cached.thumbnail,
        title: cached.title,
        duration: cached.duration,
        fromCache: true,
      };
    }

    // Buscar vídeo no YouTube
    const searchQuery = `${artistName} ${songTitle} official video`;
    console.log(`🔍 Buscando vídeo real no YouTube: ${searchQuery}`);

    const videoId = await searchYouTubeVideo(searchQuery);
    
    if (!videoId) {
      console.log(`⚠️ Nenhum vídeo encontrado para: ${searchQuery}`);
      return {
        error: "Vídeo não encontrado",
        youtubeUrl: null,
      };
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`🎬 Vídeo encontrado: ${videoUrl}`);

    // Extrair URL pública do vídeo
    const videoInfo = await extractPublicVideoUrl(videoId, videoUrl);

    if (!videoInfo) {
      console.log(`⚠️ Não foi possível extrair URL pública do vídeo`);
      return {
        error: "Não foi possível extrair URL pública",
        youtubeUrl: videoUrl,
        videoId: videoId,
      };
    }

    // Salvar em cache
    await saveVideoToCache({
      songTitle,
      artistName,
      youtubeUrl: videoUrl,
      videoId: videoId,
      videoUrl: videoInfo.publicUrl,
      thumbnail: videoInfo.thumbnail,
      title: videoInfo.title,
      duration: videoInfo.duration,
    });

    console.log(`💾 Vídeo salvo em cache: ${videoId}`);

    return {
      videoId: videoId,
      youtubeUrl: videoUrl,
      videoUrl: videoInfo.publicUrl,
      thumbnail: videoInfo.thumbnail,
      title: videoInfo.title,
      duration: videoInfo.duration,
      fromCache: false,
    };
  } catch (error) {
    console.error("❌ Erro ao buscar vídeo:", error);
    return {
      error: "Erro ao buscar vídeo",
      youtubeUrl: null,
    };
  }
}

/**
 * Buscar vídeo no YouTube usando web scraping
 */
async function searchYouTubeVideo(query: string): Promise<string | null> {
  try {
    console.log(`🔎 Buscando: ${query}`);

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    
    // Extrair primeiro videoId da resposta
    let videoId: string | null = null;
    
    $('a[href*="/watch?v="]').each((_, element) => {
      const href = $(element).attr("href");
      if (href && !videoId) {
        const match = href.match(/v=([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
          videoId = match[1];
          return false; // break
        }
      }
    });

    if (videoId) {
      console.log(`✅ VideoId encontrado: ${videoId}`);
      return videoId;
    }

    console.log(`⚠️ Nenhum vídeo encontrado`);
    return null;
  } catch (error) {
    console.error("❌ Erro ao buscar vídeo no YouTube:", error);
    return null;
  }
}

/**
 * Extrair URL pública do vídeo usando yt-dlp
 */
async function extractPublicVideoUrl(
  videoId: string,
  videoUrl: string
): Promise<{
  publicUrl: string;
  title: string;
  duration: number;
  thumbnail: string;
} | null> {
  try {
    console.log(`🎬 Extraindo URL pública para: ${videoId}`);

    // Usar yt-dlp para extrair URL pública
    const ytdlp = await import("yt-dlp-exec");
    
    const result = await ytdlp.default(videoUrl, {
      dumpSingleJson: true,
      format: "best",
      quiet: true,
      noWarnings: true,
    });

    if (result && result.url) {
      console.log(`✅ URL pública extraída com sucesso`);
      return {
        publicUrl: result.url,
        title: result.title || "",
        duration: result.duration || 0,
        thumbnail: result.thumbnail || "",
      };
    }

    console.error("❌ Nenhuma URL pública encontrada");
    return null;
  } catch (error) {
    console.error(`❌ Erro ao extrair URL pública:`, error);
    return null;
  }
}
