import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Play, Pause, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useMetadata } from '@/contexts/MetadataContext';
import { usePlayback } from '@/contexts/PlaybackContext';
import { useAuth } from '@/_core/hooks/useAuth';

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
  const { audioRef, isPlaying: contextIsPlaying, setIsPlaying: setPlaybackIsPlaying, volume: contextVolume, setVolume: setContextVolume } = usePlayback();
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const isTransitioningRef = useRef(false);
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
  const isReconnectingRef = useRef(false);
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
    handleLoadStart?: () => void;
    handleCanPlay?: () => void;
  }>({});
  
  const { setAlbumCover, setSongTitle, setSongArtist, setIsPlaying: setMetadataIsPlaying } = useMetadata();

  // Buscar metadados via tRPC com polling automático
  const { data: metadataResponse, isLoading: isLoadingMetadataQuery } = trpc.songs.metadata.useQuery(
    undefined,
    {
      refetchInterval: 1000,
    }
  );

  // Verificar autenticação
  const { user } = useAuth();
  const { data: currentSong } = trpc.songs.current.useQuery();
  const utils = trpc.useUtils();

  // Mutation para votos de usuários autenticados
  const addUserVoteMutation = trpc.votes.addVote.useMutation({
    onSuccess: () => {
      toast.success('Voto registrado com sucesso!');
      // Invalidar cache de votos do usuário
      utils.votes.getUserVotes.invalidate();
      utils.votes.getVoteStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao registrar voto');
    },
  });

  // Mutation para votos anônimos
  const addAnonymousVoteMutation = trpc.songs.vote.useMutation({
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
        setAlbumCover(metadataResponse.albumCover || '');
        setSongTitle(metadataResponse.title);
        setSongArtist(metadataResponse.artist);
        setUserVote(null); // Resetar voto quando música muda
      }
    }
  }, [metadataResponse, setAlbumCover, setSongTitle, setSongArtist]);

  // Reconectar ao stream
  const reconnectToStream = useCallback((reason: string) => {
    if (!audioRef.current || userPausedRef.current) return;
    if (isReconnectingRef.current) return;

    isReconnectingRef.current = true;
    
    const attemptReconnect = () => {
      if (reconnectAttemptsRef.current >= maxReconnectAttemptsRef.current) {
        console.error('❌ Máximo de tentativas de reconexão atingido');
        isReconnectingRef.current = false;
        return;
      }

      reconnectAttemptsRef.current += 1;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000);
      
      console.log(`🔄 Tentativa ${reconnectAttemptsRef.current} de reconexão (${reason})...`);

      reconnectTimeoutRef.current = setTimeout(() => {
        if (!audioRef.current || userPausedRef.current) {
          isReconnectingRef.current = false;
          return;
        }

        const newSrc = '/api/stream?' + Date.now();
        audioRef.current.src = newSrc;
        audioRef.current.currentTime = 0;
        
        audioRef.current.play().then(() => {
          console.log('✅ Reconectado com sucesso');
          reconnectAttemptsRef.current = 0;
          isReconnectingRef.current = false;
        }).catch(() => {
          attemptReconnect();
        });
      }, delay);
    };

    attemptReconnect();
  }, []);

  // Heartbeat para monitorar fluxo contínuo
  useEffect(() => {
    if (!audioRef.current) return;

    const startHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      heartbeatIntervalRef.current = setInterval(() => {
        if (!audioRef.current || userPausedRef.current) return;
        
        // Não fazer heartbeat se o src está vazio (pausado)
        if (!audioRef.current.src) return;

        const currentTime = audioRef.current.currentTime;
        const timeSinceLastPlay = Date.now() - lastPlayTimeRef.current;
        const isAudioPaused = audioRef.current.paused;
        const hasError = audioRef.current.error !== null;

        // Sem progresso por 5 segundos
        if (!isAudioPaused && timeSinceLastPlay > 5000 && currentTime === 0) {
          console.warn('⚠️ Heartbeat: Sem progresso, reconectando...');
          reconnectToStream('heartbeat timeout');
        }

        // Player pausou inesperadamente
        if (isPlaying && isAudioPaused && !userPausedRef.current) {
          console.warn('⚠️ Heartbeat: Pausa inesperada, reconectando...');
          reconnectToStream('unexpected pause');
        }

        // Erro no stream
        if (hasError && !userPausedRef.current) {
          console.warn('⚠️ Heartbeat: Erro detectado, reconectando...');
          reconnectToStream('stream error');
        }
      }, 2000);
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

    // Não fazer nada aqui - o src já é definido no contexto
    // Não reconectar automaticamente ao montar o componente

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
    if (handlersRef.current.handleLoadStart) {
      audioRef.current.removeEventListener('loadstart', handlersRef.current.handleLoadStart);
    }
    if (handlersRef.current.handleCanPlay) {
      audioRef.current.removeEventListener('canplay', handlersRef.current.handleCanPlay);
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
      console.log('⏸️ Pausa detectada');
      // Não fazer nada aqui - deixar o heartbeat lidar
    };

    const handleEnded = () => {
      console.log('⏹️ Reprodução finalizada');
      setIsPlaying(false);
    };

    const handleError = (e: Event) => {
      const error = (e.target as HTMLAudioElement).error;
      if (error) {
        console.error('❌ Erro no stream:', error.code, error.message);
        if (!userPausedRef.current) {
          reconnectToStream(`error ${error.code}`);
        }
      }
    };

    const handleStalled = () => {
      console.warn('⚠️ Stream travado (stalled)');
      if (isPlaying && !userPausedRef.current) {
        // Tentar retomar após 2 segundos
        setTimeout(() => {
          if (audioRef.current && isPlaying && !userPausedRef.current) {
            audioRef.current.play().catch(() => {
              reconnectToStream('stalled recovery');
            });
          }
        }, 2000);
      }
    };

    const handleSuspend = () => {
      console.warn('⚠️ Stream suspenso (suspend)');
      if (isPlaying && !userPausedRef.current) {
        // Tentar retomar após 2 segundos
        setTimeout(() => {
          if (audioRef.current && isPlaying && !userPausedRef.current) {
            audioRef.current.play().catch(() => {
              reconnectToStream('suspend recovery');
            });
          }
        }, 2000);
      }
    };

    const handleTimeUpdate = () => {
      // Atualizar lastPlayTime quando há progresso
      if (!audioRef.current?.paused) {
        lastPlayTimeRef.current = Date.now();
      }
    };

    const handleLoadStart = () => {
      console.log('📥 Carregando stream...');
    };

    const handleCanPlay = () => {
      console.log('✅ Stream pronto para reproduzir');
      if (!audioRef.current?.src) return;
      if (userPausedRef.current) return;
    };

    handlersRef.current = {
      handlePlay,
      handlePause,
      handleEnded,
      handleError,
      handleStalled,
      handleSuspend,
      handleTimeUpdate,
      handleLoadStart,
      handleCanPlay,
    };

    // Adicionar listeners
    audioRef.current.addEventListener('play', handlePlay);
    audioRef.current.addEventListener('pause', handlePause);
    audioRef.current.addEventListener('ended', handleEnded);
    audioRef.current.addEventListener('error', handleError);
    audioRef.current.addEventListener('stalled', handleStalled);
    audioRef.current.addEventListener('suspend', handleSuspend);
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    audioRef.current.addEventListener('loadstart', handleLoadStart);
    audioRef.current.addEventListener('canplay', handleCanPlay);

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('play', handlePlay);
        audioRef.current.removeEventListener('pause', handlePause);
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('error', handleError);
        audioRef.current.removeEventListener('stalled', handleStalled);
        audioRef.current.removeEventListener('suspend', handleSuspend);
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('loadstart', handleLoadStart);
        audioRef.current.removeEventListener('canplay', handleCanPlay);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [reconnectToStream]);

  // Tocar/pausar com tratamento de conflito
  const togglePlay = async () => {
    if (!audioRef.current || isTransitioningRef.current) return;

    isTransitioningRef.current = true;

    try {
      if (isPlaying) {
        // Pause: pausar a reprodução
        console.log('🔗 Iniciando pause...');
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        userPausedRef.current = true;
        console.log('userPausedRef.current =', userPausedRef.current);
        setIsPlaying(false);
        setPlaybackIsPlaying(false);
        console.log('⏸️ Parado - currentTime resetado para 0');
      } else {
        // Play: recarregar stream com cache-busting
        const newSrc = '/api/stream?' + Date.now();
        audioRef.current.src = newSrc;
        audioRef.current.currentTime = 0;
        console.log('🔗 Recarregando stream:', newSrc);
        
        userPausedRef.current = false;
        reconnectAttemptsRef.current = 0;
        lastPlayTimeRef.current = Date.now();
        
        // Aguardar um pouco para o buffer carregar
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar se o usuário não pausou enquanto aguardava
        if (userPausedRef.current) {
          console.log('⏸️ Usuário pausou durante o carregamento');
          isTransitioningRef.current = false;
          return;
        }
        
        console.log('▶️ Tentando reproduzir...');
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise.catch((error: any) => {
            // Ignorar erro de play interrompido por pause
            if (error.name !== 'NotAllowedError') {
              throw error;
            }
          });
        }
        setIsPlaying(true);
        setPlaybackIsPlaying(true);
      }
    } catch (error) {
      console.error('❌ Erro ao reproduzir áudio:', error);
      setIsPlaying(false);
      setPlaybackIsPlaying(false);
      toast.error('Erro ao reproduzir áudio');
    } finally {
      isTransitioningRef.current = false;
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
  const handleVote = async (vote: 'like' | 'dislike') => {
    if (!metadata.title || metadata.title === 'Carregando...') {
      toast.error('Aguarde a música carregar');
      return;
    }

    setUserVote(vote);

    if (user) {
      // Voto de usuário autenticado
      // Se temos songId, usar ele; senão, usar a música atual
      let songId = currentSong?.songId;

      if (songId) {
        addUserVoteMutation.mutate({
          songId,
          voteType: vote,
        });
      }
    } else {
      // Voto anônimo
      addAnonymousVoteMutation.mutate({
        songTitle: metadata.title,
        songArtist: metadata.artist,
        voteType: vote,
      });
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Capa do álbum */}
      <div className="flex-1 flex items-center justify-center mb-3 min-h-0">
        <div className="w-full aspect-square max-w-[200px] rounded-lg overflow-hidden shadow-lg border-2 border-gray-800">
          {metadata.cover ? (
            <img 
              src={metadata.cover} 
              alt={metadata.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">🎵</div>
                <p className="text-xs text-gray-400">Sem capa</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Informações da música */}
      <div className="text-center mb-3 min-h-[60px] flex flex-col justify-center">
        <h3 className="text-sm font-bold text-white truncate">
          {metadata.title}
        </h3>
        <p className="text-xs text-gray-300 truncate">
          {metadata.artist}
        </p>
      </div>

      {/* Controles */}
      <div className="space-y-3">
        {/* Play/Pause */}
        <div className="flex justify-center">
          <Button
            onClick={togglePlay}
            className="rounded-full w-16 h-16 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 text-black"
          >
            {isPlaying ? (
              <Pause size={28} fill="currentColor" />
            ) : (
              <Play size={28} fill="currentColor" />
            )}
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Volume2 size={16} className="text-gray-400 flex-shrink-0" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-gray-400 w-8 text-right">{volume}%</span>
        </div>

        {/* Like/Dislike */}
        <div className="flex gap-2 justify-center">
          <Button
            onClick={() => handleVote('like')}
            variant="outline"
            size="sm"
            className={`flex items-center gap-1 ${
              userVote === 'like'
                ? 'bg-green-600 border-green-600 text-white'
                : 'border-green-600 text-green-600 hover:bg-green-600 hover:text-white'
            }`}
          >
            <ThumbsUp size={14} />
            <span className="text-xs">Gostei</span>
          </Button>
          <Button
            onClick={() => handleVote('dislike')}
            variant="outline"
            size="sm"
            className={`flex items-center gap-1 ${
              userVote === 'dislike'
                ? 'bg-red-600 border-red-600 text-white'
                : 'border-red-600 text-red-600 hover:bg-red-600 hover:text-white'
            }`}
          >
            <ThumbsDown size={14} />
            <span className="text-xs">Não gostei</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default RadioPlayerV2;
