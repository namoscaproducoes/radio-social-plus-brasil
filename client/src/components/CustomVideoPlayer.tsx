import { useEffect, useRef, useState } from 'react';
import HLS from 'hls.js';
import { Loader2, AlertCircle } from 'lucide-react';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hlsRef = useRef<HLS | null>(null);

  useEffect(() => {
    if (!youtubeUrl || !videoRef.current) return;

    setIsLoading(true);
    setError(null);

    const initializePlayer = async () => {
      try {
        // Se for URL do YouTube, usar iframe
        if (youtubeUrl.includes('youtube.com') || youtubeUrl.includes('youtu.be')) {
          console.log('📺 Usando iframe do YouTube:', youtubeUrl);
          setIsLoading(false);
          return;
        }

        // Se for URL de streaming HLS
          if (youtubeUrl.includes('.m3u8')) {
            if (HLS.isSupported() && videoRef.current) {
              const hls = new HLS();
              hlsRef.current = hls;

              hls.loadSource(youtubeUrl);
              hls.attachMedia(videoRef.current as HTMLMediaElement);

            hls.on(HLS.Events.MANIFEST_PARSED, () => {
              console.log('✅ HLS manifest carregado');
              setIsLoading(false);
              if (isPlaying && videoRef.current) {
                videoRef.current.play();
              }
            });

            hls.on(HLS.Events.ERROR, (event, data) => {
              console.error('❌ Erro HLS:', data);
              setError('Erro ao carregar vídeo');
              setIsLoading(false);
            });
          } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari suporta HLS nativamente
            videoRef.current.src = youtubeUrl;
            setIsLoading(false);
            if (isPlaying) {
              videoRef.current.play();
            }
          }
          return;
        }

        // Se for URL MP4 ou outro formato
        if (videoRef.current) {
          videoRef.current.src = youtubeUrl;
          setIsLoading(false);
          if (isPlaying) {
            videoRef.current.play();
          }
        }
      } catch (err) {
        console.error('❌ Erro ao inicializar player:', err);
        setError('Erro ao inicializar player');
        setIsLoading(false);
      }
    };

    initializePlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [youtubeUrl, isPlaying]);

  // Sincronizar play/pause
  useEffect(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.play().catch(err => {
        console.warn('⚠️ Não foi possível iniciar reprodução:', err);
      });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Se for YouTube, mostrar iframe
  if (youtubeUrl?.includes('youtube.com') || youtubeUrl?.includes('youtu.be')) {
    const videoId = youtubeUrl.includes('v=')
      ? new URLSearchParams(new URL(youtubeUrl).search).get('v')
      : youtubeUrl.split('/').pop();

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
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=1&rel=0&modestbranding=1&controls=1`}
            title={title || 'YouTube Video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-64 flex flex-col">
      <style>{`
        .video-player-container {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 0.5rem;
          overflow: hidden;
          border: 2px solid rgb(234, 179, 8);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          background: #000;
        }
        
        .video-player-container video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      `}</style>

      {isLoading && (
        <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg border border-gray-700">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            <p className="text-sm text-gray-400">Carregando vídeo...</p>
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

      {!isLoading && !error && (
        <div className="video-player-container">
          <video
            ref={videoRef}
            controls
            controlsList="nodownload"
            title={title || 'Vídeo'}
          />
        </div>
      )}

      {!youtubeUrl && !isLoading && !error && (
        <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg border border-gray-700">
          <p className="text-gray-400">Aguardando música...</p>
        </div>
      )}
    </div>
  );
}
