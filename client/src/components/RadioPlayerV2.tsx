import { useRef, useState, useEffect } from 'react';
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
  const lastMetadataRef = useRef('');
  const reconnectTimeoutRef = useRef<any>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttemptsRef = useRef(5);
  const stalledTimeoutRef = useRef<any>(undefined);
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

  // Atualizar estado local quando metadados mudam
  useEffect(() => {
    if (metadataResponse && metadataResponse.title && metadataResponse.title !== 'Musica Desconhecida') {
      const metadataKey = `${metadataResponse.title}|${metadataResponse.artist}`;

      // Só atualizar se mudou
      if (metadataKey !== lastMetadataRef.current) {
        console.log('🎵 Música atualizada:', metadataResponse.title, '-', metadataResponse.artist);
        
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

        // Reconectar ao stream quando a música muda
        if (isPlaying && audioRef.current) {
          console.log('🔄 Música mudou, reconectando ao stream...');
          reconnectToStream('music changed');
        }
      }
    }
  }, [metadataResponse, isPlaying]);

  // Atualizar estado de carregamento
  useEffect(() => {
    setIsLoadingMetadata(isLoadingMetadataQuery);
  }, [isLoadingMetadataQuery]);

  // Função para reconectar ao stream
  const reconnectToStream = async (reason: string = 'unknown') => {
    if (!audioRef.current || !isPlaying) {
      console.log('❌ Não pode reconectar:', reason);
      return;
    }

    reconnectAttemptsRef.current += 1;
    console.warn(`⚠️ Reconectando (tentativa ${reconnectAttemptsRef.current}/${maxReconnectAttemptsRef.current}): ${reason}`);

    if (reconnectAttemptsRef.current > maxReconnectAttemptsRef.current) {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      toast.error('Não foi possível reconectar ao stream');
      setIsPlaying(false);
      return;
    }

    // Delay exponencial: 200ms, 400ms, 600ms, 800ms, 1s
    const delayMs = Math.min(200 * reconnectAttemptsRef.current, 1000);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('🔄 Iniciando reconexão...');
        
        // Pausar para limpar buffer
        audioRef.current!.pause();
        
        // Resetar src com timestamp para forçar nova requisição
        const newSrc = '/api/stream?' + Date.now();
        audioRef.current!.src = newSrc;
        console.log('📡 Novo src definido:', newSrc);
        
        // Aguardar um pouco para garantir que o src foi definido
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Tentar reproduzir
        const playPromise = audioRef.current?.play();
        if (playPromise) {
          await playPromise;
          console.log('✅ Reconectado ao stream com sucesso');
          reconnectAttemptsRef.current = 0; // Resetar contador
        }
      } catch (error) {
        console.error('❌ Erro ao reconectar:', error);
        // Tentar novamente
        reconnectToStream('retry after error');
      }
    }, delayMs);
  };

  // Monitoramento contínuo do estado do player
  useEffect(() => {
    if (!audioRef.current || !isPlaying) return;

    const monitorInterval = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || !isPlaying) return;

      // Verificar se o player está parado mas deveria estar tocando
      if (audio.paused && isPlaying) {
        console.warn('⚠️ Player parou inesperadamente, reconectando...');
        reconnectToStream('player paused unexpectedly');
      }

      // Verificar se há problema de buffer
      if (audio.buffered.length === 0 && audio.currentTime === 0) {
        console.warn('⚠️ Buffer vazio, reconectando...');
        reconnectToStream('empty buffer');
      }
    }, 1000);

    return () => clearInterval(monitorInterval);
  }, [isPlaying]);

  // Garantir que o player está sempre conectado
  useEffect(() => {
    if (!audioRef.current) return;

    // Se não tem src, conectar ao stream
    if (!audioRef.current.src) {
      audioRef.current.src = '/api/stream';
      console.log('🔗 Conectado ao stream de rádio');
    }

    // Handlers para eventos de áudio
    const handlePlay = () => {
      console.log('▶️ Reprodução iniciada');
      setIsPlaying(true);
      reconnectAttemptsRef.current = 0; // Resetar contador quando começar a reproduzir
    };

    const handlePause = () => {
      console.log('⏸️ Reprodução pausada');
      setIsPlaying(false);
    };

    const handleEnded = () => {
      console.warn('⚠️ Stream ended');
      if (isPlaying) {
        reconnectToStream('stream ended');
      }
    };

    const handleError = (e: Event) => {
      const audio = audioRef.current;
      if (audio) {
        console.error('❌ Erro no stream:', audio.error?.code, audio.error?.message);
      }
      if (isPlaying) {
        reconnectToStream('audio error');
      }
    };

    const handleStalled = () => {
      console.warn('⚠️ Stream stalled (sem dados)');
      if (isPlaying) {
        // Reconectar imediatamente ao detectar stalled
        if (stalledTimeoutRef.current) {
          clearTimeout(stalledTimeoutRef.current);
        }
        stalledTimeoutRef.current = setTimeout(() => {
          if (isPlaying && audioRef.current && audioRef.current.paused) {
            reconnectToStream('stalled');
          }
        }, 500); // Reduzido para 500ms
      }
    };

    const handleSuspend = () => {
      console.warn('⚠️ Stream suspended');
      if (isPlaying) {
        // Reconectar imediatamente ao detectar suspend
        if (stalledTimeoutRef.current) {
          clearTimeout(stalledTimeoutRef.current);
        }
        stalledTimeoutRef.current = setTimeout(() => {
          if (isPlaying && audioRef.current && audioRef.current.paused) {
            reconnectToStream('suspend');
          }
        }, 500); // Reduzido para 500ms
      }
    };

    const audio = audioRef.current;
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('suspend', handleSuspend);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('suspend', handleSuspend);
    };
  }, [isPlaying]);

  const handlePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise) {
          await playPromise;
        }
      }
    } catch (error) {
      console.error('Erro ao controlar reprodução:', error);
    }
  };

  const handleVote = (type: 'like' | 'dislike') => {
    if (userVote === type) {
      setUserVote(null);
    } else {
      setUserVote(type);
      addVoteMutation.mutate({ 
        songTitle: metadata.title,
        songArtist: metadata.artist,
        voteType: type 
      });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onLoadedMetadata={() => console.log('📻 Metadados carregados')}
        onCanPlay={() => console.log('▶️ Pode reproduzir')}
      />

      {/* Album Cover */}
      <div className="mb-6 relative">
        {metadata.cover ? (
          <img
            src={metadata.cover}
            alt={metadata.title}
            className="w-full aspect-square object-cover rounded-lg shadow-lg border-2 border-yellow-500"
          />
        ) : (
          <div className="w-full aspect-square bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg shadow-lg border-2 border-yellow-500 flex items-center justify-center">
            <Music className="w-16 h-16 text-gray-500" />
          </div>
        )}
      </div>

      {/* Song Info */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">{metadata.title}</h2>
        <p className="text-gray-300">{metadata.artist}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button
          onClick={() => handleVote('dislike')}
          variant={userVote === 'dislike' ? 'default' : 'outline'}
          size="icon"
          className={userVote === 'dislike' ? 'bg-red-600 hover:bg-red-700' : ''}
        >
          <ThumbsDown className="w-5 h-5" />
        </Button>

        <Button
          onClick={handlePlayPause}
          size="lg"
          className="w-16 h-16 rounded-full bg-yellow-500 hover:bg-yellow-600 text-black"
        >
          {isPlaying ? (
            <Pause className="w-8 h-8" />
          ) : (
            <Play className="w-8 h-8 ml-1" />
          )}
        </Button>

        <Button
          onClick={() => handleVote('like')}
          variant={userVote === 'like' ? 'default' : 'outline'}
          size="icon"
          className={userVote === 'like' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          <ThumbsUp className="w-5 h-5" />
        </Button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-4">
        <Volume2 className="w-5 h-5 text-gray-400" />
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolumeChange}
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-sm text-gray-400 w-8">{volume}%</span>
      </div>

      {/* Loading State */}
      {isLoadingMetadata && (
        <div className="mt-4 text-center text-sm text-gray-400">
          Carregando metadados...
        </div>
      )}
    </div>
  );
}

import { Music } from 'lucide-react';
