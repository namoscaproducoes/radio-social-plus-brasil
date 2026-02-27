import axios from "axios";
import { getVideoFromCache, saveVideoToCache } from "./video-cache";
import { ENV } from "./_core/env";

/**
 * Buscar vídeo no YouTube usando YouTube Data API v3
 * Retorna videoId para usar no embed do YouTube
 */
export async function extractYouTubeVideo(songTitle: string, artistName: string) {
  try {
    // Verificar cache primeiro
    const cached = await getVideoFromCache(songTitle, artistName);
    if (cached && cached.videoId && cached.videoId !== "search") {
      console.log(`✅ Vídeo encontrado em cache: ${cached.videoId}`);
      return {
        videoId: cached.videoId,
        youtubeUrl: `https://www.youtube.com/watch?v=${cached.videoId}`,
        videoUrl: `https://www.youtube.com/embed/${cached.videoId}?enablejsapi=1&mute=1&rel=0&modestbranding=1&controls=1`,
        thumbnail: cached.thumbnail,
        title: cached.title,
        duration: cached.duration,
        fromCache: true,
      };
    }

    // Buscar vídeo usando YouTube API
    const searchQuery = `${artistName} ${songTitle} official video`;
    console.log(`🔍 Buscando vídeo no YouTube: ${searchQuery}`);

    const videoId = await searchYouTubeAPI(searchQuery);
    
    if (!videoId) {
      console.log(`⚠️ Nenhum vídeo encontrado para: ${searchQuery}`);
      return {
        error: "Vídeo não encontrado",
        youtubeUrl: null,
      };
    }

    console.log(`🎬 Vídeo encontrado: ${videoId}`);

    // Obter detalhes do vídeo
    const videoInfo = await getVideoDetails(videoId);

    // Salvar em cache
    await saveVideoToCache({
      songTitle,
      artistName,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      videoId: videoId,
      videoUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=1&rel=0&modestbranding=1&controls=1`,
      thumbnail: videoInfo?.thumbnail,
      title: videoInfo?.title || `${artistName} - ${songTitle}`,
      duration: videoInfo?.duration || 0,
    });

    console.log(`💾 Vídeo salvo em cache: ${videoId}`);

    return {
      videoId: videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      videoUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=1&rel=0&modestbranding=1&controls=1`,
      thumbnail: videoInfo?.thumbnail,
      title: videoInfo?.title || `${artistName} - ${songTitle}`,
      duration: videoInfo?.duration || 0,
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
 * Buscar vídeo usando YouTube Data API v3
 */
async function searchYouTubeAPI(query: string): Promise<string | null> {
  try {
    const apiKey = ENV.youtubeApiKey;
    
    if (!apiKey) {
      console.error("❌ YOUTUBE_API_KEY não configurada");
      return null;
    }

    console.log(`🔎 Buscando no YouTube API: ${query}`);

    const response = await axios.get("https://www.googleapis.com/youtube/v3/search", {
      params: {
        q: query,
        part: "snippet",
        type: "video",
        maxResults: 1,
        key: apiKey,
      },
      timeout: 10000,
    });

    if (response.data.items && response.data.items.length > 0) {
      const videoId = response.data.items[0].id.videoId;
      console.log(`✅ VideoId encontrado: ${videoId}`);
      return videoId;
    }

    console.log(`⚠️ Nenhum vídeo encontrado`);
    return null;
  } catch (error: any) {
    console.error("❌ Erro ao buscar no YouTube API:", error.message);
    return null;
  }
}

/**
 * Obter detalhes do vídeo (título, duração, thumbnail)
 */
async function getVideoDetails(videoId: string): Promise<{
  title: string;
  duration: number;
  thumbnail: string;
} | null> {
  try {
    const apiKey = ENV.youtubeApiKey;
    
    if (!apiKey) {
      return null;
    }

    const response = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: {
        id: videoId,
        part: "snippet,contentDetails",
        key: apiKey,
      },
      timeout: 10000,
    });

    if (response.data.items && response.data.items.length > 0) {
      const item = response.data.items[0];
      return {
        title: item.snippet.title,
        duration: parseDuration(item.contentDetails.duration),
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || "",
      };
    }

    return null;
  } catch (error: any) {
    console.error("❌ Erro ao obter detalhes do vídeo:", error.message);
    return null;
  }
}

/**
 * Converter duração ISO 8601 para segundos
 * Exemplo: PT3M45S -> 225
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  return hours * 3600 + minutes * 60 + seconds;
}
