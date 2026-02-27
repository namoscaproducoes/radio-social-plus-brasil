import { useEffect, useState, useRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useMetadata } from '@/contexts/MetadataContext';

interface YouTubePlayerProps {
  songTitle: string;
  artistName: string;
}

export function YouTubePlayer({ songTitle, artistName }: YouTubePlayerProps) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const { isPlaying } = useMetadata();
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  // Sincronizar reprodução do vídeo com o player de música
  useEffect(() => {
    if (!iframeRef.current) return;

    if (isPlaying) {
      // Enviar comando de play para o iframe do YouTube
      iframeRef.current.contentWindow?.postMessage(
        { event: 'command', func: 'playVideo' },
        '*'
      );
      console.log('▶️ Iniciando vídeo YouTube');
    } else {
      // Enviar comando de pause para o iframe do YouTube
      iframeRef.current.contentWindow?.postMessage(
        { event: 'command', func: 'pauseVideo' },
        '*'
      );
      console.log('⏸️ Pausando vídeo YouTube');
    }
  }, [isPlaying]);

  return (
    <div className="w-full h-64 flex flex-col">
      <style>{`
        .youtube-player-container {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 0.5rem;
          overflow: hidden;
          border: 2px solid rgb(234, 179, 8);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        
        .youtube-player-container iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
      `}</style>

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
        <div className="youtube-player-container">
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=1&rel=0&modestbranding=1&controls=0`}
            title={`${artistName} - ${songTitle}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
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
