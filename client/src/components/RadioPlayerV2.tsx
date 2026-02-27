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
  const maxReconnectAttemptsRef = useRef(10); // Aumentado para 10 tentativas
  const heartbeatIntervalRef = useRef<any>(undefined);
  const lastPlayTimeRef = useRef(0);
  const userPausedRef = useRef(false); // Rastrear se o usuário pausou manualmente
  
  const { setAlbumCover, setSongTitle, setSongArtist, setIsPlaying: setContextIsPlaying } = useMetadata();

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
        setUserVote(null); // Resetar voto quando música muda
      }
    }
  }, [metadataResponse, setAlbumCover, setSongTitle, setSongArtist]);

  // Função para reconectar ao stream com retry exponencial
  const reconnectToStream = (reason: string) => {
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

    // Delay exponencial: 500ms, 1s, 1.5s, 2s, 2.5s, 3s, 3.5s, 4s, 4.5s, 5s
    const delayMs = Math.min(500 * reconnectAttemptsRef.current, 5000);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        if (!audioRef.current) return;

        console.log('🔄 Iniciando reconexão...');
        
        // Pausar para limpar buffer
        audioRef.current.pause();
        
        // Resetar src com timestamp para forçar nova requisição
        const newSrc = '/api/stream?' + Date.now();
        audioRef.current.src = newSrc;
        console.log('📡 Novo src definido:', newSrc);
        
        // Aguardar um pouco para garantir que o src foi definido
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Tentar reproduzir
        const playPromise = audioRef.current.play();
        if (playPromise) {
          await playPromise;
          console.log('✅ Reconectado ao stream com sucesso');
          reconnectAttemptsRef.current = 0; // Resetar contador
          lastPlayTimeRef.current = Date.now();
        }
      } catch (error) {
        console.error('❌ Erro ao reconectar:', error);
        // Tentar novamente
        reconnectToStream('retry after error');
      }
    }, delayMs);
  };

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

        // Se passou mais de 5 segundos sem progresso, reconectar
        if (timeSinceLastPlay > 5000 && currentTime === 0) {
          console.warn('⚠️ Heartbeat: Sem progresso por 5 segundos, reconectando...');
          reconnectToStream('heartbeat timeout');
        }
      }, 3000); // Verificar a cada 3 segundos
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
      userPausedRef.current = false;
      reconnectAttemptsRef.current = 0; // Resetar contador quando começar a reproduzir
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
        // Dar um tempo antes de reconectar
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

    const audio = audioRef.current;
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('suspend', handleSuspend);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('suspend', handleSuspend);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Tocar/pausar
  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        userPausedRef.current = true; // Marcar que o usuário pausou
        setIsPlaying(false);
        setContextIsPlaying(false);
      } else {
        // Garantir que o player está conectado ao stream
        if (!audioRef.current.src || audioRef.current.src === '') {
          audioRef.current.src = '/api/stream';
          console.log('🔗 Conectado ao stream de rádio');
        }
        
        // Resetar flags e contadores
        userPausedRef.current = false;
        reconnectAttemptsRef.current = 0;
        lastPlayTimeRef.current = Date.now();
        
        // Tentar reproduzir
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
      <div className="relative rounded-2xl overflow-hidden border-4 border-yellow-400 bg-gradient-to-b from-gray-900 to-black p-8 shadow-2xl">
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
          <div className="flex justify-center mb-8">
            <div className="w-48 h-48 rounded-lg overflow-hidden border-4 border-yellow-400 shadow-lg">
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
                    <div className="text-4xl mb-2">🎵</div>
                    <p className="text-gray-400 text-sm">Sem capa</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Song Info */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 truncate">{metadata.title}</h2>
            <p className="text-xl text-gray-300 truncate">{metadata.artist}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {/* Play/Pause Button */}
            <Button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black flex items-center justify-center shadow-lg"
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
                onChange={handleVolumeChange}
                className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-gray-300 text-sm w-8">{volume}%</span>
            </div>
          </div>

          {/* Vote Buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => handleVote('like')}
              variant={userVote === 'like' ? 'default' : 'outline'}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                userVote === 'like'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-green-600 text-green-600 hover:bg-green-600 hover:text-white'
              }`}
            >
              <ThumbsUp size={20} />
              Gostei
            </Button>
            <Button
              onClick={() => handleVote('dislike')}
              variant={userVote === 'dislike' ? 'default' : 'outline'}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                userVote === 'dislike'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'border-red-600 text-red-600 hover:bg-red-600 hover:text-white'
              }`}
            >
              <ThumbsDown size={20} />
              Não Gostei
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
