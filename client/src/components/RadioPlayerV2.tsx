import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Play, Pause, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

interface SongMetadata {
  title: string;
  artist: string;
  cover: string;
}

export function RadioPlayerV2() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [metadata, setMetadata] = useState<SongMetadata>({
    title: 'Carregando...',
    artist: 'Artista Desconhecido',
    cover: '',
  });
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const lastMetadataRef = useRef('');
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const addVoteMutation = trpc.songs.vote.useMutation({
    onSuccess: () => {
      toast.success('Voto registrado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao registrar voto');
    },
  });

  // Buscar metadados da API Brascast
  const fetchMetadata = async () => {
    try {
      setIsLoadingMetadata(true);
      
      // Tentar buscar via endpoint do backend que já faz scraping
      const response = await fetch('/api/songs/metadata');
      const data = await response.json();

      if (data.title && data.artist) {
        const metadataKey = `${data.title}|${data.artist}`;

        // Só atualizar se mudou
        if (metadataKey !== lastMetadataRef.current) {
          console.log('🎵 Música atualizada:', data.title, '-', data.artist);
          
          setMetadata({
            title: data.title || 'Música Desconhecida',
            artist: data.artist || 'Artista Desconhecido',
            cover: data.albumCover || '',
          });

          setUserVote(null); // Resetar voto quando música muda
          lastMetadataRef.current = metadataKey;
        }
      }
    } catch (error) {
      console.error('Erro ao buscar metadados:', error);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  // Iniciar polling de metadados
  useEffect(() => {
    // Buscar imediatamente
    fetchMetadata();

    // Configurar polling a cada 500ms para detecção rápida de mudanças
    pollingIntervalRef.current = setInterval(() => {
      fetchMetadata();
    }, 500);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Tocar/pausar
  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error);
      toast.error('Erro ao reproduzir áudio');
    }
  };

  // Registrar voto
  const handleVote = async (voteType: 'like' | 'dislike') => {
    if (!metadata.title || metadata.title === 'Carregando...') {
      toast.error('Aguarde o carregamento da música');
      return;
    }

    try {
      await addVoteMutation.mutateAsync({
        songTitle: metadata.title,
        songArtist: metadata.artist,
        voteType,
      });
      setUserVote(voteType);
    } catch (error) {
      console.error('Erro ao registrar voto:', error);
    }
  };

  return (
    <div className="w-full">
      {/* Audio Element - Conecta ao stream via proxy */}
      <audio
        ref={audioRef}
        src="/api/stream"
        crossOrigin="anonymous"
        onError={(e) => {
          console.error('Erro ao carregar stream:', e);
          toast.error('Erro ao conectar ao stream');
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Player Container */}
      <div className="flex flex-col items-center gap-8">
        
        {/* Album Cover - Grande e em Destaque */}
        <div className="relative">
          {metadata.cover && metadata.cover.trim() ? (
            <img
              src={metadata.cover}
              alt={`${metadata.title} - ${metadata.artist}`}
              className="w-64 h-64 rounded-xl shadow-2xl object-cover border-4 border-yellow-500 transition-all duration-300"
              onError={(e) => {
                console.warn('Erro ao carregar capa:', metadata.cover);
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-64 h-64 bg-gradient-to-br from-purple-600 to-purple-900 rounded-xl shadow-2xl flex items-center justify-center border-4 border-yellow-500">
              <div className="text-6xl">🎵</div>
            </div>
          )}
          
          {/* Live Badge - Pulsante */}
          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            AO VIVO
          </div>
        </div>

        {/* Song Info */}
        <div className="text-center w-full">
          <h2 className="text-3xl font-bold text-white mb-2 line-clamp-2 min-h-[3.5rem] flex items-center justify-center">
            {metadata.title}
          </h2>
          <p className="text-xl text-gray-300 line-clamp-1 min-h-[1.75rem] flex items-center justify-center">
            {metadata.artist}
          </p>
          {isLoadingMetadata && (
            <p className="text-sm text-yellow-400 mt-2 animate-pulse">Atualizando metadados...</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 w-full justify-center">
          {/* Play/Pause Button */}
          <Button
            onClick={togglePlay}
            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-full p-4 shadow-lg transform transition hover:scale-110 active:scale-95"
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isPlaying ? (
              <Pause size={32} />
            ) : (
              <Play size={32} className="ml-1" />
            )}
          </Button>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Volume2 size={20} className="text-gray-300" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => {
                const vol = parseInt(e.target.value);
                setVolume(vol);
                if (audioRef.current) {
                  audioRef.current.volume = vol / 100;
                }
              }}
              className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #eab308 0%, #eab308 ${volume}%, #4b5563 ${volume}%, #4b5563 100%)`,
              }}
              title={`Volume: ${volume}%`}
            />
            <span className="text-sm text-gray-300 w-8">{volume}%</span>
          </div>
        </div>

        {/* Vote Buttons */}
        <div className="flex gap-6 w-full justify-center">
          <Button
            onClick={() => handleVote('like')}
            disabled={addVoteMutation.isPending}
            className={`flex items-center gap-3 px-8 py-3 rounded-full font-bold text-lg transition transform hover:scale-105 active:scale-95 ${
              userVote === 'like'
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
            title="Gostei desta música"
          >
            <ThumbsUp size={24} />
            Gostei
          </Button>
          <Button
            onClick={() => handleVote('dislike')}
            disabled={addVoteMutation.isPending}
            className={`flex items-center gap-3 px-8 py-3 rounded-full font-bold text-lg transition transform hover:scale-105 active:scale-95 ${
              userVote === 'dislike'
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
            title="Não gostei desta música"
          >
            <ThumbsDown size={24} />
            Não Gostei
          </Button>
        </div>

        {/* Debug Info - Apenas em desenvolvimento */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 mt-4 text-center">
            <p>Polling: 500ms | Metadados: {lastMetadataRef.current || 'Aguardando...'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
