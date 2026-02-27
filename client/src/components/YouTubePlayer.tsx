import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface YouTubePlayerProps {
  songTitle: string;
  artistName: string;
}

export function YouTubePlayer({ songTitle, artistName }: YouTubePlayerProps) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState('');

  useEffect(() => {
    if (!songTitle || !artistName) {
      setVideoId(null);
      return;
    }

    const searchQuery = `${artistName} ${songTitle} official video`;

    // Evitar buscar a mesma música novamente
    if (searchQuery === lastSearchQuery && videoId) {
      return;
    }

    const searchYouTube = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/youtube/search?q=${encodeURIComponent(searchQuery)}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.videoId) {
          setVideoId(data.videoId);
          setLastSearchQuery(searchQuery);
          console.log('🎬 Vídeo encontrado:', data.videoId);
        } else if (data.error) {
          console.warn('YouTube API error:', data.error);
          setError('YouTube API não configurada');
          setVideoId(null);
        } else {
          setError('Vídeo não encontrado');
          setVideoId(null);
        }
      } catch (err) {
        console.error('Erro ao buscar vídeo:', err);
        setError('Erro ao buscar vídeo');
        setVideoId(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Aguardar 500ms antes de buscar para evitar requisições em cascata
    const timer = setTimeout(searchYouTube, 500);

    return () => clearTimeout(timer);
  }, [songTitle, artistName, lastSearchQuery, videoId]);

  return (
    <div className="w-full">
      {isLoading && (
        <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg border border-gray-700">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            <p className="text-sm text-gray-400">Buscando clipe...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg border border-gray-700">
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        </div>
      )}

      {videoId && !isLoading && !error && (
        <div className="w-full aspect-video rounded-lg overflow-hidden border-2 border-yellow-500 shadow-lg">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`}
            title={`${artistName} - ${songTitle}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      )}

      {!videoId && !isLoading && !error && (
        <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg border border-gray-700">
          <p className="text-gray-400">Aguardando música...</p>
        </div>
      )}
    </div>
  );
}
