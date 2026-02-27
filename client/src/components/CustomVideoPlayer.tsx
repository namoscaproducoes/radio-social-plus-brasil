import { useRef, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface CustomVideoPlayerProps {
  youtubeUrl: string;
  videoId?: string;
  title?: string;
  isPlaying?: boolean;
}

export function CustomVideoPlayer({
  youtubeUrl,
  videoId,
  title,
  isPlaying = false,
}: CustomVideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<any>(null);

  // Extrair videoId da URL se não fornecido
  const extractedVideoId = videoId || extractVideoIdFromUrl(youtubeUrl);

  useEffect(() => {
    // Carregar YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    // Esperar a API estar pronta
    window.onYouTubeIframeAPIReady = initializePlayer;
  }, []);

  const initializePlayer = () => {
    if (!iframeRef.current || !extractedVideoId) return;

    try {
      playerRef.current = new window.YT.Player(iframeRef.current, {
        videoId: extractedVideoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: isPlaying ? 1 : 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          mute: 1,
        },
        events: {
          onReady: onPlayerReady,
          onError: onPlayerError,
        },
      });
    } catch (err) {
      console.error('❌ Erro ao inicializar player:', err);
      setError('Erro ao inicializar player');
    }
  };

  const onPlayerReady = () => {
    console.log('✅ Player do YouTube pronto');
    if (isPlaying && playerRef.current) {
      playerRef.current.playVideo();
    }
  };

  const onPlayerError = (event: any) => {
    console.error('❌ Erro do YouTube:', event.data);
    const errorMessages: { [key: number]: string } = {
      2: 'Parâmetro inválido',
      5: 'Erro de HTML5 player',
      100: 'Vídeo não encontrado',
      101: 'Vídeo não pode ser reproduzido',
      150: 'Vídeo não pode ser reproduzido (mesmo que 101)',
    };
    setError(errorMessages[event.data] || 'Erro ao carregar vídeo');
  };

  // Sincronizar play/pause
  useEffect(() => {
    if (!playerRef.current) return;

    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (err) {
      console.warn('⚠️ Erro ao sincronizar player:', err);
    }
  }, [isPlaying]);

  if (error) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-slate-900 rounded-lg border-2 border-yellow-500">
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-sm text-slate-300">Ocorreu um erro. Tente novamente mais tarde.</p>
          <p className="text-xs text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!extractedVideoId) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-slate-900 rounded-lg border-2 border-yellow-500">
        <p className="text-slate-400">Aguardando música...</p>
      </div>
    );
  }

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

      <div className="youtube-player-container">
        <div
          ref={iframeRef}
          id={`youtube-player-${extractedVideoId}`}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}

/**
 * Extrair videoId de URL do YouTube
 */
function extractVideoIdFromUrl(url: string): string | null {
  if (!url) return null;

  // Formato: https://www.youtube.com/watch?v=VIDEO_ID
  const match = url.match(/v=([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) {
    return match[1];
  }

  // Formato: https://youtu.be/VIDEO_ID
  const match2 = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (match2 && match2[1]) {
    return match2[1];
  }

  // Se for apenas o videoId
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  return null;
}

// Declarar tipos globais
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
