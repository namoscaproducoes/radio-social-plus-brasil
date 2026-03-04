import { useEffect, useState, useRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useMetadata } from '@/contexts/MetadataContext';
import { trpc } from '@/lib/trpc';

interface YouTubePlayerProps {
  songTitle: string;
  artistName: string;
}

export function YouTubePlayer({ songTitle, artistName }: YouTubePlayerProps) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const { isPlaying } = useMetadata();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Usar tRPC para buscar vídeo
  const youtubeQuery = trpc.youtube.search.useQuery(
    { q: `${artistName} ${songTitle} official video` },
    {
      enabled: !!songTitle && !!artistName && `${artistName} ${songTitle}` !== lastSearchQuery,
      retry: 1,
      retryDelay: 1000,
    }
  );

  useEffect(() => {
    if (!songTitle || !artistName) {
      setVideoId(null);
      setError(null);
      return;
    }

    const searchQuery = `${artistName} ${songTitle}`;

    // Evitar buscar a mesma música novamente
    if (searchQuery === lastSearchQuery && videoId) {
      return;
    }

    if (youtubeQuery.isLoading) {
      setError(null);
    }

    if (youtubeQuery.isError) {
      console.error('Erro ao buscar vídeo:', youtubeQuery.error);
      setError('Erro ao buscar vídeo');
      setVideoId(null);
    }

    if (youtubeQuery.data) {
      if (youtubeQuery.data.videoId) {
        setVideoId(youtubeQuery.data.videoId);
        setLastSearchQuery(searchQuery);
        setError(null);
        console.log('🎬 Vídeo encontrado:', youtubeQuery.data.videoId);
      } else {
        setError('Vídeo não encontrado');
        setVideoId(null);
      }
    }
  }, [youtubeQuery.data, youtubeQuery.isLoading, youtubeQuery.isError, youtubeQuery.error, songTitle, artistName, lastSearchQuery, videoId]);

  // Sincronizar reprodução do vídeo com o player de música
  useEffect(() => {
    if (!iframeRef.current || !videoId) return;

    const timer = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        const command = isPlaying ? 'playVideo' : 'pauseVideo';
        iframeRef.current.contentWindow.postMessage(
          { event: 'command', func: command },
          '*'
        );
        console.log(isPlaying ? '▶️ Iniciando vídeo YouTube' : '⏸️ Pausando vídeo YouTube');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isPlaying, videoId]);

  const isLoading = youtubeQuery.isLoading;

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
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=1&rel=0&modestbranding=1&controls=0&autoplay=1`}
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
