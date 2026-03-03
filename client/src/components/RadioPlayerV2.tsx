import { useRef, useState, useEffect } from 'react';
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
  const [metadata, setMetadata] = useState<SongMetadata>({
    title: 'Carregando...',
    artist: 'Artista Desconhecido',
    cover: '',
  });
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);
  const lastMetadataRef = useRef('');
  
  const { setAlbumCover, setSongTitle, setSongArtist } = useMetadata();

  // Buscar metadados via tRPC com polling automático
  const { data: metadataResponse } = trpc.songs.metadata.useQuery(
    undefined,
    {
      refetchInterval: 1000,
    }
  );

  // Verificar autenticação
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Mutation para votos de usuários autenticados
  const addUserVoteMutation = trpc.votes.addVote.useMutation({
    onSuccess: () => {
      toast.success('Voto registrado com sucesso!');
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
      }
    }
  }, [metadataResponse, setAlbumCover, setSongTitle, setSongArtist]);

  // Tocar/pausar - LÓGICA SIMPLES
  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        // STOP: parar reprodução
        console.log('🛑 Parando...');
        audioRef.current.pause();
        audioRef.current.src = '';
        setIsPlaying(false);
        setPlaybackIsPlaying(false);
      } else {
        // PLAY: conectar ao stream e tocar
        console.log('▶️ Iniciando reprodução...');
        const streamUrl = '/api/stream?' + Date.now();
        audioRef.current.src = streamUrl;
        audioRef.current.load();
        
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          setPlaybackIsPlaying(true);
          console.log('✅ Reproduzindo');
        } catch (playError) {
          console.error('❌ Erro ao reproduzir:', playError);
          toast.error('Erro ao conectar ao stream');
          setIsPlaying(false);
          setPlaybackIsPlaying(false);
        }
      }
    } catch (error) {
      console.error('❌ Erro:', error);
      toast.error('Erro ao controlar player');
      setIsPlaying(false);
      setPlaybackIsPlaying(false);
    }
  };

  // Controlar volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  // Registrar voto
  const handleVote = (voteType: 'like' | 'dislike') => {
    if (user) {
      // Usuário autenticado - usar mutation protegida
      addUserVoteMutation.mutate({
        songId: 1, // TODO: usar ID real da música
        voteType,
      });
    } else {
      // Usuário anônimo - usar mutation pública
      addAnonymousVoteMutation.mutate({
        songTitle: metadata.title,
        songArtist: metadata.artist,
        voteType,
      });
    }
    setUserVote(voteType);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6 bg-gradient-to-b from-orange-400 to-orange-500 rounded-3xl shadow-2xl max-w-sm mx-auto">
      {/* Capa do álbum */}
      <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-4 border-yellow-300 shadow-lg">
        {metadata.cover ? (
          <img
            src={metadata.cover}
            alt={metadata.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-gray-500">Sem capa</span>
          </div>
        )}
      </div>

      {/* Informações da música */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-white truncate w-48">{metadata.title}</h2>
        <p className="text-sm text-white/80 truncate w-48">{metadata.artist}</p>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-4 w-full">
        {/* Volume */}
        <Volume2 className="w-5 h-5 text-white" />
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolumeChange}
          className="flex-1 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-white text-sm w-10 text-right">{volume}%</span>
      </div>

      {/* Botão Play/Stop */}
      <Button
        onClick={togglePlay}
        className="w-20 h-20 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black shadow-lg"
      >
        {isPlaying ? (
          <Pause className="w-10 h-10" />
        ) : (
          <Play className="w-10 h-10 ml-1" />
        )}
      </Button>

      {/* Botões de voto */}
      <div className="flex gap-4">
        <Button
          onClick={() => handleVote('like')}
          variant={userVote === 'like' ? 'default' : 'outline'}
          className={`${
            userVote === 'like'
              ? 'bg-green-500 text-white'
              : 'border-green-500 text-green-500'
          }`}
        >
          <ThumbsUp className="w-4 h-4 mr-2" />
          Gostei
        </Button>
        <Button
          onClick={() => handleVote('dislike')}
          variant={userVote === 'dislike' ? 'default' : 'outline'}
          className={`${
            userVote === 'dislike'
              ? 'bg-red-500 text-white'
              : 'border-red-500 text-red-500'
          }`}
        >
          <ThumbsDown className="w-4 h-4 mr-2" />
          Não Gostei
        </Button>
      </div>
    </div>
  );
}
