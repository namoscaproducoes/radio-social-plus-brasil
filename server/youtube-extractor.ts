import { getVideoFromCache, saveVideoToCache } from "./video-cache";

/**
 * Gerar URL de busca do YouTube para a música
 * Retorna um embed URL que pode ser usado diretamente
 */
export async function extractYouTubeVideo(songTitle: string, artistName: string) {
  try {
    // Verificar cache primeiro
    const cached = await getVideoFromCache(songTitle, artistName);
    if (cached && cached.youtubeUrl) {
      console.log(`✅ Vídeo encontrado em cache: ${cached.videoId}`);
      return {
        videoId: cached.videoId,
        youtubeUrl: cached.youtubeUrl,
        videoUrl: cached.youtubeUrl,
        thumbnail: cached.thumbnail,
        title: cached.title,
        duration: cached.duration,
        fromCache: true,
      };
    }

    // Gerar URL de busca do YouTube
    const searchQuery = `${artistName} ${songTitle} official video`;
    console.log(`🔍 Gerando URL de busca: ${searchQuery}`);

    // URL de embed do YouTube com busca
    const youtubeSearchUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(searchQuery)}`;
    const youtubeResultsUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

    console.log(`📺 URL de embed gerada`);

    // Salvar em cache
    await saveVideoToCache({
      songTitle,
      artistName,
      youtubeUrl: youtubeResultsUrl,
      videoId: "search",
      videoUrl: youtubeSearchUrl,
      thumbnail: undefined,
      title: `${artistName} - ${songTitle}`,
      duration: 0,
    });

    console.log(`💾 Vídeo salvo em cache`);

    return {
      videoId: "search",
      youtubeUrl: youtubeResultsUrl,
      videoUrl: youtubeSearchUrl,
      thumbnail: undefined,
      title: `${artistName} - ${songTitle}`,
      duration: 0,
      fromCache: false,
    };
  } catch (error) {
    console.error("❌ Erro ao gerar URL de vídeo:", error);
    return {
      error: "Erro ao gerar URL de vídeo",
      youtubeUrl: null,
    };
  }
}
