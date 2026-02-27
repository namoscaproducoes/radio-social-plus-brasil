import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Play, Pause, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useMetadata } from '@/contexts/MetadataContext';

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
  const [bufferProgress, setBufferProgress] = useState(0);
  const lastMetadataRef = useRef('');
  const streamResetRef = useRef(false);
  const { setAlbumCover, setSongTitle, setSongArtist } = useMetadata();

  // Buscar metadados via tRPC com polling automático
  const { data: metadataResponse, isLoading: isLoadingMetadataQuery } = trpc.songs.metadata.useQuery(
    undefined,
    {
      refetchInterval: 1000, // Atualizar a cada 1 segundo
    }
  );

  const addVoteMutation = trpc.songs.vote.useMutation({
    onSuccess: () => {
      toast.success('Voto registrado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao registrar voto');
    },
  });

  // Resetar buffer quando música muda
  const resetStreamBuffer = async () => {
    try {
      console.log('🔄 Resetando buffer do stream...');
      await fetch('/api/stream/reset', { method: 'POST' });
      streamResetRef.current = true;
      console.log('✅ Buffer resetado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao resetar buffer:', error);
    }
  };

  // Monitorar progresso de buffer
  const handleProgress = () => {
    if (!audioRef.current) return;

    const buffered = audioRef.current.buffered;
    if (buffered.length > 0) {
      const bufferedEnd = buffered.end(buffered.length - 1);
      const duration = audioRef.current.duration;
      if (duration > 0) {
        const progress = (bufferedEnd / duration) * 100;
        setBufferProgress(Math.min(progress, 100));
      }
    }
  };

  // Atualizar estado local quando metadados mudam
  useEffect(() => {
    if (metadataResponse && metadataResponse.title && metadataResponse.title !== 'Musica Desconhecida') {
      const metadataKey = `${metadataResponse.title}|${metadataResponse.artist}`;

      // Só atualizar se mudou
      if (metadataKey !== lastMetadataRef.current) {
        console.log('🎵 Música atualizada:', metadataResponse.title, '-', metadataResponse.artist);
        
        // Resetar buffer quando música muda
        resetStreamBuffer();

        const newCover = metadataResponse.albumCover || '';
        setMetadata({
          title: metadataResponse.title,
          artist: metadataResponse.artist,
          cover: newCover,
        });
        
        // Atualizar contexto para background blur
        setAlbumCover(newCover);
        setSongTitle(metadataResponse.title);
        setSongArtist(metadataResponse.artist);

        setUserVote(null); // Resetar voto quando música muda
        lastMetadataRef.current = metadataKey;
      }
    }
  }, [metadataResponse]);

  // Atualizar estado de carregamento
  useEffect(() => {
    setIsLoadingMetadata(isLoadingMetadataQuery);
  }, [isLoadingMetadataQuery]);

  // Garantir que o player está sempre conectado
  useEffect(() => {
    if (!audioRef.current) return;

    // Se não tem src, conectar ao stream
    if (!audioRef.current.src) {
      audioRef.current.src = '/api/stream';
      console.log('🔗 Conectado ao stream de rádio');
    }

    // Monitorar eventos de buffer
    const audio = audioRef.current;
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('canplaythrough', () => {
      console.log('✅ Buffer suficiente para reprodução contínua');
    });

    return () => {
      audio.removeEventListener('progress', handleProgress);
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
        // Garantir que o player está conectado ao stream
        if (!audioRef.current.src) {
          audioRef.current.src = '/api/stream';
        }
        
        // Tentar reproduzir com tratamento de erro
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (playError: any) {
          // Ignorar erros de autoplay policy
          if (playError.name === 'NotAllowedError') {
            console.warn('Autoplay bloqueado pelo navegador');
            // Tentar novamente após interação do usuário
            setTimeout(() => {
              audioRef.current?.play().catch(() => {});
            }, 100);
          } else {
            throw playError;
          }
        }
      }
    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error);
      setIsPlaying(false);
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
      {/* Audio Element - Conecta ao stream via proxy com buffer gerenciado */}
      <audio
        ref={audioRef}
        src="/api/stream"
        crossOrigin="anonymous"
        preload="auto"
        onError={(e) => {
          console.error('Erro ao carregar stream:', e);
          toast.error('Erro ao conectar ao stream');
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          // Quando o stream termina, tentar reconectar
          if (audioRef.current && isPlaying) {
            audioRef.current.play().catch((error) => {
              console.warn('Erro ao reconectar ao stream:', error);
            });
          }
        }}
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

        {/* Buffer Progress Bar - Oculto */}

        {/* Controls */}
        <div className="flex items-center gap-6 w-full justify-center">
          {/* Play/Pause Button */}
          <Button
            onClick={togglePlay}
            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-full p-4 shadow-lg transform transition hover:scale-110 active:scale-95"
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isPlaying ? <Pause size={32} /> : <Play size={32} />}
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
              className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
            />
            <span className="text-sm text-gray-300 w-8 text-right">{volume}%</span>
          </div>
        </div>

        {/* Vote Buttons */}
        <div className="flex gap-4 w-full justify-center">
          <Button
            onClick={() => handleVote('like')}
            variant={userVote === 'like' ? 'default' : 'outline'}
            className={`rounded-full px-6 py-2 transition ${
              userVote === 'like'
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'border-green-500 text-green-500 hover:bg-green-500 hover:text-white'
            }`}
            disabled={addVoteMutation.isPending}
          >
            <ThumbsUp size={18} className="mr-2" />
            Gostei
          </Button>
          <Button
            onClick={() => handleVote('dislike')}
            variant={userVote === 'dislike' ? 'default' : 'outline'}
            className={`rounded-full px-6 py-2 transition ${
              userVote === 'dislike'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'border-red-500 text-red-500 hover:bg-red-500 hover:text-white'
            }`}
            disabled={addVoteMutation.isPending}
          >
            <ThumbsDown size={18} className="mr-2" />
            Não Gostei
          </Button>
        </div>

        {/* Debug Info */}
        <p className="text-xs text-gray-500 mt-4">
          Vote agora: {metadata.title}|{metadata.artist}
        </p>
        <p className="text-xs text-gray-500">
          Você faz a nossa programação
        </p>
      </div>
    </div>
  );
}
