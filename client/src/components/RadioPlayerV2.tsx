import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Play, Pause, Volume2, Music } from 'lucide-react';
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
  const [currentSongId, setCurrentSongId] = useState<number | null>(null);
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
      // Invalidar cache de TOP 5 e ranking
      utils.songs.topVotedThisMonth.invalidate();
      utils.songs.ranking.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao registrar voto');
    },
  });

  // Mutation para votos anônimos
  const addAnonymousVoteMutation = trpc.songs.vote.useMutation({
    onSuccess: () => {
      toast.success('Voto registrado com sucesso!');
      // Invalidar cache de TOP 5 e ranking para votos anônimos também
      utils.songs.topVotedThisMonth.invalidate();
      utils.songs.ranking.invalidate();
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
        setCurrentSongId(metadataResponse.songId || null);
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
      if (!currentSongId) {
        toast.error('ID da música não encontrado');
        return;
      }
      addUserVoteMutation.mutate({
        songId: currentSongId,
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
    <div className="w-full max-w-sm mx-auto">
      {/* Card do Player - Design Moderno */}
      <div className="relative group">
        {/* Fundo com gradiente e blur */}
        <div 
          className="absolute inset-0 rounded-2xl opacity-60 blur-xl transition-opacity duration-300 group-hover:opacity-80"
          style={{
            background: metadata.cover 
              ? `linear-gradient(135deg, rgba(255,165,0,0.4) 0%, rgba(0,0,0,0.6) 100%)`
              : 'linear-gradient(135deg, rgba(100,100,100,0.4) 0%, rgba(0,0,0,0.6) 100%)',
          }}
        />

        {/* Card Principal - Layout Vertical */}
        <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-black/95 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl flex flex-col items-center gap-6">
          
          {/* Capa do Álbum - Topo */}
          <div className="w-full">
            <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-2xl group/cover">
              {metadata.cover ? (
                <img
                  src={metadata.cover}
                  alt={metadata.title}
                  className="w-full h-full object-cover group-hover/cover:scale-110 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                  <Music className="w-16 h-16 text-slate-500" />
                </div>
              )}
              {/* Overlay ao hover */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/cover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>

          {/* Informações da Música */}
          <div className="w-full text-center space-y-2">
            <h2 className="text-2xl font-bold text-white truncate leading-tight">
              {metadata.title}
            </h2>
            <p className="text-sm text-slate-300 truncate">
              {metadata.artist}
            </p>
          </div>

          {/* Controle de Volume */}
          <div className="w-full flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-orange-500"
            />
            <span className="text-xs text-slate-400 w-8 text-right">{volume}%</span>
          </div>

          {/* Controles de Reprodução e Votos */}
          <div className="w-full flex items-center justify-center gap-4">
            {/* Botão Play/Stop */}
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-orange-500/50 transition-all duration-200 flex items-center justify-center group/play flex-shrink-0"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-0.5" />
              )}
            </button>

            {/* Botões de Voto */}
            <div className="flex gap-2">
              <button
                onClick={() => handleVote('like')}
                className={`p-3 rounded-full transition-all duration-200 ${
                  userVote === 'like'
                    ? 'bg-green-500/30 text-green-400'
                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                }`}
              >
                <ThumbsUp className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleVote('dislike')}
                className={`p-3 rounded-full transition-all duration-200 ${
                  userVote === 'dislike'
                    ? 'bg-red-500/30 text-red-400'
                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                }`}
              >
                <ThumbsDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
