import ytdl from "ytdl-core";
import { getVideoFromCache, saveVideoToCache } from "./video-cache";

/**
 * Buscar vídeo do YouTube e extrair URL de streaming
 */
export async function extractYouTubeVideo(songTitle: string, artistName: string) {
  try {
    // Verificar cache primeiro
    const cached = await getVideoFromCache(songTitle, artistName);
    if (cached) {
      console.log(`✅ Vídeo encontrado em cache: ${cached.videoId}`);
      return {
        videoId: cached.videoId,
        youtubeUrl: cached.youtubeUrl,
        thumbnail: cached.thumbnail,
        title: cached.title,
        duration: cached.duration,
        fromCache: true,
      };
    }

    // Buscar no YouTube
    const searchQuery = `${artistName} ${songTitle} official video`;
    console.log(`🔍 Buscando no YouTube: ${searchQuery}`);

    // Usar a YouTube API para buscar (se disponível)
    // Caso contrário, usar busca direta
    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      searchQuery
    )}`;

    // Tentar extrair informações usando ytdl-core
    // Nota: Isso requer que o vídeo seja encontrado primeiro
    // Uma abordagem melhor seria usar a YouTube API ou web scraping

    console.log(`📺 URL do YouTube: ${youtubeUrl}`);

    return {
      youtubeUrl,
      fromCache: false,
    };
  } catch (error) {
    console.error("❌ Erro ao buscar vídeo:", error);
    throw error;
  }
}

/**
 * Extrair URL de streaming de um vídeo específico do YouTube
 */
export async function extractStreamingUrl(videoId: string) {
  try {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`🎬 Extraindo URL de streaming: ${youtubeUrl}`);

    // Obter informações do vídeo
    const info = await ytdl.getInfo(youtubeUrl);

    // Encontrar o melhor formato com áudio e vídeo
    const format = ytdl.chooseFormat(info.formats, {
      quality: "highest",
      filter: "audioandvideo",
    });

    if (!format || !format.url) {
      throw new Error("Nenhum formato de streaming disponível");
    }

    console.log(`✅ URL de streaming extraída: ${format.url.substring(0, 50)}...`);

    return {
      streamingUrl: format.url,
      title: info.videoDetails.title,
      duration: parseInt(info.videoDetails.lengthSeconds),
      thumbnail: info.videoDetails.thumbnails[0]?.url,
    };
  } catch (error) {
    console.error("❌ Erro ao extrair URL de streaming:", error);
    throw error;
  }
}
