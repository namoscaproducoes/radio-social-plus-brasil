import { useRef, useState, useEffect, useCallback } from 'react';
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

export interface RadioPlayerV2Ref {
  handleVote: (vote: 'like' | 'dislike') => void;
  userVote: 'like' | 'dislike' | null;
  addVoteMutation: any;
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
  
  // Refs para controle de reconexão
  const reconnectTimeoutRef = useRef<any>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttemptsRef = useRef(10);
  const heartbeatIntervalRef = useRef<any>(undefined);
  const lastPlayTimeRef = useRef(0);
  const userPausedRef = useRef(false);
  const handlersRef = useRef<{
    handlePlay?: () => void;
    handlePause?: () => void;
    handleEnded?: () => void;
    handleError?: (e: Event) => void;
    handleStalled?: () => void;
    handleSuspend?: () => void;
    handleTimeUpdate?: () => void;
  }>({});
  
  const { setAlbumCover, setSongTitle, setSongArtist, setIsPlaying: setContextIsPlaying } = useMetadata();

  // Buscar metadados via tRPC com polling automático
  const { data: metadataResponse, isLoading: isLoadingMetadataQuery } = trpc.songs.metadata.useQuery(
    undefined,
    {
      refetchInterval: 1000,
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

  // Atualizar metadados quando dados chegam
  useEffect(() => {
    if (metadataResponse) {
      const newMetadata = `${metadataResponse.title}-${metadataResponse.artist}`;
      
      if (newMetadata !== lastMetadataRef.current) {
        lastMetadataRef.current = newMetadata;
        setMetadata({
          title: metadataResponse.title,
          artist: metadataResponse.artist,
          cover: metadataResponse.albumCover || '',
        });
        setSongTitle(metadataResponse.title);
        setSongArtist(metadataResponse.artist);
        setAlbumCover(metadataResponse.albumCover || '');
        setUserVote(null);
      }
    }
  }, [metadataResponse, setAlbumCover, setSongTitle, setSongArtist]);

  // Função para reconectar ao stream com retry exponencial
  const reconnectToStream = useCallback((reason: string) => {
    if (userPausedRef.current) {
      console.log('⏸️ Usuário pausou manualmente, não reconectando');
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttemptsRef.current) {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      setIsPlaying(false);
      setContextIsPlaying(false);
      toast.error('Falha ao conectar ao stream. Tente novamente.');
      return;
    }

    reconnectAttemptsRef.current++;
    console.log(`🔄 Reconectando ao stream (${reconnectAttemptsRef.current}/${maxReconnectAttemptsRef.current}) - Motivo: ${reason}`);

    const delayMs = Math.min(500 * reconnectAttemptsRef.current, 5000);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        if (!audioRef.current || userPausedRef.current) return;

        console.log('🔄 Iniciando reconexão...');
        
        // Apenas pausar se não está pausado
        if (!audioRef.current.paused) {
          audioRef.current.pause();
        }
        
        const newSrc = '/api/stream?' + Date.now();
        audioRef.current.src = newSrc;
        console.log('📡 Novo src definido:', newSrc);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Apenas tentar reproduzir se o usuário não pausou
        if (!userPausedRef.current) {
          const playPromise = audioRef.current.play();
          if (playPromise) {
            await playPromise;
            console.log('✅ Reconectado ao stream com sucesso');
            reconnectAttemptsRef.current = 0;
            lastPlayTimeRef.current = Date.now();
          }
        }
      } catch (error) {
        console.error('❌ Erro ao reconectar:', error);
        // Não reconectar se o usuário pausou
        if (!userPausedRef.current) {
          reconnectToStream('retry after error');
        }
      }
    }, delayMs);
  }, [setContextIsPlaying]);

  // Heartbeat para monitorar se o player está tocando
  useEffect(() => {
    if (!audioRef.current) return;

    const startHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      heartbeatIntervalRef.current = setInterval(() => {
        if (!audioRef.current || userPausedRef.current) return;

        const currentTime = audioRef.current.currentTime;
        const timeSinceLastPlay = Date.now() - lastPlayTimeRef.current;

        if (timeSinceLastPlay > 5000 && currentTime === 0) {
          console.warn('⚠️ Heartbeat: Sem progresso por 5 segundos, reconectando...');
          reconnectToStream('heartbeat timeout');
        }
      }, 3000);
    };

    const stopHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };

    if (isPlaying) {
      startHeartbeat();
    } else {
      stopHeartbeat();
    }

    return () => stopHeartbeat();
  }, [isPlaying, reconnectToStream]);

  // Setup event listeners - executado apenas uma vez
  useEffect(() => {
    if (!audioRef.current) return;

    // Se não tem src, conectar ao stream
    if (!audioRef.current.src) {
      audioRef.current.src = '/api/stream';
      console.log('🔗 Conectado ao stream de rádio');
    }

    // Remover listeners antigos se existirem
    if (handlersRef.current.handlePlay) {
      audioRef.current.removeEventListener('play', handlersRef.current.handlePlay);
    }
    if (handlersRef.current.handlePause) {
      audioRef.current.removeEventListener('pause', handlersRef.current.handlePause);
    }
    if (handlersRef.current.handleEnded) {
      audioRef.current.removeEventListener('ended', handlersRef.current.handleEnded);
    }
    if (handlersRef.current.handleError) {
      audioRef.current.removeEventListener('error', handlersRef.current.handleError);
    }
    if (handlersRef.current.handleStalled) {
      audioRef.current.removeEventListener('stalled', handlersRef.current.handleStalled);
    }
    if (handlersRef.current.handleSuspend) {
      audioRef.current.removeEventListener('suspend', handlersRef.current.handleSuspend);
    }
    if (handlersRef.current.handleTimeUpdate) {
      audioRef.current.removeEventListener('timeupdate', handlersRef.current.handleTimeUpdate);
    }

    // Definir novos handlers
    const handlePlay = () => {
      console.log('▶️ Reprodução iniciada');
      setIsPlaying(true);
      userPausedRef.current = false;
      reconnectAttemptsRef.current = 0;
      lastPlayTimeRef.current = Date.now();
    };

    const handlePause = () => {
      console.log('⏸️ Reprodução pausada');
      setIsPlaying(false);
    };

    const handleEnded = () => {
      console.warn('⚠️ Stream ended');
      if (!userPausedRef.current) {
        reconnectToStream('stream ended');
      }
    };

    const handleError = (e: Event) => {
      const audio = audioRef.current;
      if (audio) {
        console.error('❌ Erro no stream:', audio.error?.code, audio.error?.message);
      }
      if (!userPausedRef.current) {
        reconnectToStream('audio error');
      }
    };

    const handleStalled = () => {
      console.warn('⚠️ Stream stalled (sem dados)');
      if (!userPausedRef.current) {
        setTimeout(() => {
          if (!userPausedRef.current && audioRef.current && audioRef.current.paused) {
            reconnectToStream('stalled');
          }
        }, 2000);
      }
    };

    const handleSuspend = () => {
      console.warn('⚠️ Stream suspended');
      if (!userPausedRef.current) {
        setTimeout(() => {
          if (!userPausedRef.current && audioRef.current && audioRef.current.paused) {
            reconnectToStream('suspend');
          }
        }, 2000);
      }
    };

    const handleTimeUpdate = () => {
      lastPlayTimeRef.current = Date.now();
    };

    // Armazenar handlers para limpeza posterior
    handlersRef.current = {
      handlePlay,
      handlePause,
      handleEnded,
      handleError,
      handleStalled,
      handleSuspend,
      handleTimeUpdate,
    };

    // Adicionar listeners
    audioRef.current.addEventListener('play', handlePlay);
    audioRef.current.addEventListener('pause', handlePause);
    audioRef.current.addEventListener('ended', handleEnded);
    audioRef.current.addEventListener('error', handleError);
    audioRef.current.addEventListener('stalled', handleStalled);
    audioRef.current.addEventListener('suspend', handleSuspend);
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('play', handlePlay);
        audioRef.current.removeEventListener('pause', handlePause);
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('error', handleError);
        audioRef.current.removeEventListener('stalled', handleStalled);
        audioRef.current.removeEventListener('suspend', handleSuspend);
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [reconnectToStream]);

  // Tocar/pausar
  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        userPausedRef.current = true;
        setIsPlaying(false);
        setContextIsPlaying(false);
      } else {
        if (!audioRef.current.src || audioRef.current.src === '') {
          audioRef.current.src = '/api/stream';
          console.log('🔗 Conectado ao stream de rádio');
        }
        
        userPausedRef.current = false;
        reconnectAttemptsRef.current = 0;
        lastPlayTimeRef.current = Date.now();
        
        console.log('▶️ Tentando reproduzir...');
        await audioRef.current.play();
        setIsPlaying(true);
        setContextIsPlaying(true);
      }
    } catch (error) {
      console.error('❌ Erro ao reproduzir áudio:', error);
      setIsPlaying(false);
      setContextIsPlaying(false);
      toast.error('Erro ao reproduzir áudio');
    }
  };

  // Mudar volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  // Registrar voto
  const handleVote = (vote: 'like' | 'dislike') => {
    if (!metadata.title || metadata.title === 'Carregando...') {
      toast.error('Aguarde a música carregar');
      return;
    }

    setUserVote(vote);
    addVoteMutation.mutate({
      songTitle: metadata.title,
      songArtist: metadata.artist,
      voteType: vote,
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Audio element */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onLoadedMetadata={() => console.log('✅ Metadados do áudio carregados')}
        onCanPlay={() => console.log('✅ Áudio pronto para reproduzir')}
      />

      {/* Player Container */}
      <div className="relative rounded-lg sm:rounded-2xl overflow-hidden border-4 border-yellow-400 bg-gradient-to-b from-gray-900 to-black p-4 sm:p-6 md:p-8 shadow-2xl">
        {/* Background Image */}
        {metadata.cover && (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url(${metadata.cover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10">
          {/* Album Cover */}
          <div className="flex justify-center mb-2">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border-3 border-yellow-400 shadow-lg">
              {metadata.cover ? (
                <img
                  src={metadata.cover}
                  alt={`${metadata.title} - ${metadata.artist}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl md:text-4xl mb-2">🎵</div>
                    <p className="text-gray-400 text-xs sm:text-sm">Sem capa</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Song Info */}
          <div className="text-center mb-2">
            <h2 className="text-xs font-bold text-white mb-0 line-clamp-2 break-words">{metadata.title}</h2>
            <p className="text-xs text-gray-300 truncate">{metadata.artist}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-1 mb-2 flex-wrap">
            {/* Play/Pause Button */}
            <Button
              onClick={togglePlay}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black flex items-center justify-center shadow-lg"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </Button>

            {/* Volume Control */}
            <div className="flex items-center gap-1">
              <Volume2 size={14} className="text-gray-400" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-400 w-8">{volume}%</span>
            </div>
          </div>

          {/* Vote Buttons */}
          <div className="flex items-center justify-center gap-2">
            <Button
              onClick={() => handleVote('like')}
              variant={userVote === 'like' ? 'default' : 'outline'}
              className={`flex items-center gap-1 text-xs h-8 px-2 ${
                userVote === 'like'
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                  : 'border-green-600 text-green-600 hover:bg-green-600/10'
              }`}
            >
              <ThumbsUp size={12} />
              Gostei
            </Button>

            <Button
              onClick={() => handleVote('dislike')}
              variant={userVote === 'dislike' ? 'default' : 'outline'}
              className={`flex items-center gap-1 text-xs h-8 px-2 ${
                userVote === 'dislike'
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                  : 'border-red-600 text-red-600 hover:bg-red-600/10'
              }`}
            >
              <ThumbsDown size={12} />
              Não Gostei
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
