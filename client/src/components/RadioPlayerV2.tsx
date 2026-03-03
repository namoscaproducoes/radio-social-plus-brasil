import { useRef, useState, useEffect, useCallback } from 'react';
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
        setSongTitle(metadataResponse.title);
        setSongArtist(metadataResponse.artist);
        setAlbumCover(metadataResponse.albumCover || '');
        setUserVote(null);
        
        // SINCRONIZACAO: Se player esta tocando, resetar stream para sincronizar com metadados
        if (isPlaying && audioRef.current) {
          console.log('🔄 Musica mudou, resetando stream para sincronizar...');
          // Pausar e limpar
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.src = '';
          
          // Aguardar um pouco e recarregar
          setTimeout(() => {
            if (!audioRef.current || userPausedRef.current) return;
            const newSrc = '/api/stream?' + Date.now();
            audioRef.current.src = newSrc;
            audioRef.current.load();
            audioRef.current.play().catch(() => {
              console.log('⚠️ Autoplay bloqueado ao sincronizar musica');
            });
          }, 300);
        }
      }
    }
  }, [metadataResponse, setAlbumCover, setSongTitle, setSongArtist, isPlaying]);

  // Função para reconectar ao stream com retry exponencial
  const reconnectToStream = useCallback((reason: string) => {
    if (userPausedRef.current) {
      console.log('⏸️ Usuário pausou manualmente, não reconectando');
      return;
    }

    // Evitar múltiplas reconexões simultâneas
    if (isReconnectingRef.current) {
      console.log('⏳ Já está reconectando, aguardando...');
      return;
    }

    // Sem limite de tentativas - continuar tentando reconectar indefinidamente
    if (reconnectAttemptsRef.current > 20) {
      console.log('🔄 Muitas tentativas de reconexão, aumentando delay...');
      // Continuar tentando mas com delay maior
    }

    isReconnectingRef.current = true;
    reconnectAttemptsRef.current++;
    console.log(`🔄 Reconectando ao stream (${reconnectAttemptsRef.current}/${maxReconnectAttemptsRef.current}) - Motivo: ${reason}`);

    // Delay exponencial: começa em 300ms e vai até 10 segundos
    const delayMs = Math.min(300 * reconnectAttemptsRef.current, 10000);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        if (!audioRef.current || userPausedRef.current) return;

        console.log('🔄 Preparando reconexão...');
        
        // Apenas pausar se não está pausado
        if (!audioRef.current.paused) {
          audioRef.current.pause();
        }
        
        const newSrc = '/api/stream?' + Date.now();
        audioRef.current.src = newSrc;
        audioRef.current.load();
        console.log('📡 Novo src definido:', newSrc);
        
        // Aguardar um pouco para o buffer carregar
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Tentar reproduzir automaticamente apenas se estava tocando antes
        if (isPlaying) {
          try {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  console.log('▶️ Reprodução retomada após reconexão');
                  setIsPlaying(true);
                  setPlaybackIsPlaying(true);
                  reconnectAttemptsRef.current = 0;
                  isReconnectingRef.current = false;
                })
                .catch((error) => {
                  console.warn('⚠️ Autoplay bloqueado:', error);
                  isReconnectingRef.current = false;
                });
            }
          } catch (playError) {
            console.warn('⚠️ Erro ao tentar reproduzir:', playError);
            isReconnectingRef.current = false;
            if (!userPausedRef.current) {
              reconnectToStream('autoplay failed');
            }
            return;
          }
        } else {
          console.log('✅ Stream reconectado (aguardando clique do usuário)');
          reconnectAttemptsRef.current = 0;
          isReconnectingRef.current = false;
        }
      } catch (error) {
        console.error('❌ Erro ao reconectar:', error);
        isReconnectingRef.current = false;
        // Não reconectar se o usuário pausou
        if (!userPausedRef.current) {
          reconnectToStream('retry after error');
        }
      }
    }, delayMs);
    }, [setPlaybackIsPlaying]);

  // Heartbeat para monitorar se o player está tocando
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
      // Não resetar userPausedRef aqui - deixar que o togglePlay controle isso
      if (!userPausedRef.current) {
        setIsPlaying(true);
        reconnectAttemptsRef.current = 0;
        lastPlayTimeRef.current = Date.now();
      }
    };

    const handlePause = () => {
      console.log('⏸️ Reprodução pausada');
      userPausedRef.current = true; // Marcar que o usuário pausou
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
      if (audio && audio.error) {
        const errorCode = audio.error.code;
        const errorMessage = audio.error.message;
        
        // Ignorar erro de src vazio quando usuário pausou
        if (userPausedRef.current && !audioRef.current?.src) {
          console.log('✅ Erro de src vazio ignorado (usuário pausou)');
          return;
        }
        
        console.error('❌ Erro no stream:', errorCode, errorMessage);
        
        let errorDescription = '';
        switch (errorCode) {
          case 1:
            errorDescription = 'MEDIA_ERR_ABORTED';
            break;
          case 2:
            errorDescription = 'MEDIA_ERR_NETWORK';
            break;
          case 3:
            errorDescription = 'MEDIA_ERR_DECODE (formato nao suportado)';
            break;
          case 4:
            errorDescription = 'MEDIA_ERR_SRC_NOT_SUPPORTED';
            break;
          default:
            errorDescription = 'Erro desconhecido';
        }
        console.error('Detalhes:', errorDescription);
      }
      // Não reconectar se o usuário pausou ou se o src está vazio (pausado)
      if (!userPausedRef.current && audioRef.current?.src) {
        reconnectToStream('audio error');
      }
    };

    const handleStalled = () => {
      console.warn('⚠️ Stream stalled (sem dados)');
      if (!userPausedRef.current && !isReconnectingRef.current) {
        setTimeout(() => {
          if (!userPausedRef.current && !isReconnectingRef.current && audioRef.current && audioRef.current.paused) {
            console.log('⏳ Tentando retomar após stall...');
            audioRef.current.play().catch(() => {
              console.log('🔄 Retomada falhou, reconectando...');
              reconnectToStream('stalled');
            });
          }
        }, 2000);
      }
    };

    const handleSuspend = () => {
      console.warn('⚠️ Stream suspended');
      if (!userPausedRef.current && !isReconnectingRef.current) {
        setTimeout(() => {
          if (!userPausedRef.current && !isReconnectingRef.current && audioRef.current && audioRef.current.paused) {
            console.log('⏳ Tentando retomar após suspend...');
            audioRef.current.play().catch(() => {
              console.log('🔄 Retomada falhou, reconectando...');
              reconnectToStream('suspend');
            });
          }
        }, 2000);
      }
    };

    const handleTimeUpdate = () => {
      lastPlayTimeRef.current = Date.now();
    };

    const handleLoadStart = () => {
      console.log('📥 Carregando novo stream...');
    };

    const handleCanPlay = () => {
      console.log('✅ Stream pode ser reproduzido');
      // Se estava tentando reconectar e agora pode reproduzir, tentar play
      // Verificar se tem src antes de tentar reproduzir
      if (!userPausedRef.current && audioRef.current?.paused && isPlaying && audioRef.current?.src) {
        audioRef.current.play().catch((e) => {
          console.warn('⚠️ Erro ao reproduzir após canplay:', e);
        });
      }
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

  // Tocar/pausar
  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        // STOP: parar a reprodução e limpar buffer
        console.log('🛑 Parando fluxo e limpando buffer...');
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = ''; // Limpar src para descarregar buffer
        
        // Marcar como pausado pelo usuário - IMPEDE reconexão automática
        userPausedRef.current = true;
        
        // Parar heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        // Cancelar qualquer reconexão pendente
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = undefined;
        }
        
        setIsPlaying(false);
        setPlaybackIsPlaying(false);
        console.log('🛑 Parado - buffer limpo, reconexão desativada');
      } else {
        // PLAY: recarregar stream com buffer zerado
        const newSrc = '/api/stream?' + Date.now();
        // Limpar src anterior sem chamar load() com src vazio
        audioRef.current.src = '';
        audioRef.current.currentTime = 0;
        
        // Agora setar novo src e carregar
        audioRef.current.src = newSrc;
        audioRef.current.currentTime = 0; // Começar do zero
        audioRef.current.load(); // Carregar novo stream
        console.log('🔗 Recarregando stream com buffer zerado:', newSrc);
        
        // Permitir reconexão automática - ATIVA reconexão
        userPausedRef.current = false;
        reconnectAttemptsRef.current = 0;
        lastPlayTimeRef.current = Date.now();
        
        // Aguardar um pouco para o buffer carregar
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('▶️ Tentando reproduzir em tempo real...');
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        setIsPlaying(true);
        setPlaybackIsPlaying(true);
      }
    } catch (error) {
      console.error('❌ Erro ao reproduzir áudio:', error);
      setIsPlaying(false);
      setPlaybackIsPlaying(false);
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
  const handleVote = async (vote: 'like' | 'dislike') => {
    if (!metadata.title || metadata.title === 'Carregando...') {
      toast.error('Aguarde a música carregar');
      return;
    }

    setUserVote(vote);

    if (user) {
      // Voto de usuário autenticado
      // Se temos songId, usar ele; senão, buscar pela música atual
      let songId = currentSong?.songId;
      
      if (!songId) {
        try {
          const songData = await utils.songs.getSongIdByMetadata.fetch({
            title: metadata.title,
            artist: metadata.artist,
          });
          songId = songData?.id;
        } catch (error) {
          console.error('Erro ao buscar songId:', error);
        }
      }
      if (songId) {
        try {
          await addUserVoteMutation.mutateAsync({
            songId,
            voteType: vote,
          });
        } catch (error) {
          console.error('Erro ao registrar voto autenticado:', error);
          toast.error('Erro ao registrar voto');
        }
      } else {
        // Se não conseguir encontrar o songId, fazer voto anônimo como fallback
        try {
          await addAnonymousVoteMutation.mutateAsync({
            songTitle: metadata.title,
            songArtist: metadata.artist,
            voteType: vote,
          });
        } catch (error) {
          console.error('Erro ao registrar voto anônimo:', error);
          toast.error('Erro ao registrar voto');
        }
      }
    } else {
      // Voto anônimo
      try {
        await addAnonymousVoteMutation.mutateAsync({
          songTitle: metadata.title,
          songArtist: metadata.artist,
          voteType: vote,
        });
      } catch (error) {
        console.error('Erro ao registrar voto anônimo:', error);
      }
    }
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
            {/* Play/Stop Button */}
            <Button
              onClick={togglePlay}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black flex items-center justify-center shadow-lg"
              title={isPlaying ? 'STOP' : 'PLAY'}
            >
              {isPlaying ? (
                <div className="w-3 h-3 bg-black rounded-sm"></div>
              ) : (
                <Play size={14} fill="currentColor" />
              )}
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
              disabled={addUserVoteMutation.isPending || addAnonymousVoteMutation.isPending}
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
              disabled={addUserVoteMutation.isPending || addAnonymousVoteMutation.isPending}
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
