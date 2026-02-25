import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Play, Pause, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

export interface RadioPlayerProps {
  onMetadataChange?: (metadata: { title: string; artist: string; cover: string }) => void;
}

export function RadioPlayer({ onMetadataChange }: RadioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [currentTitle, setCurrentTitle] = useState('Carregando...');
  const [currentArtist, setCurrentArtist] = useState('Artista Desconhecido');
  const [albumCover, setAlbumCover] = useState('');
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const lastMetadataRef = useRef('');

  const addVoteMutation = trpc.songs.vote.useMutation({
    onSuccess: () => {
      toast.success('Voto registrado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao registrar voto');
    },
  });

  // Buscar metadados da API
  const fetchMetadata = async () => {
    try {
      setIsLoadingMetadata(true);
      const response = await fetch('/api/songs/metadata');
      const data = await response.json();

      if (data.title && data.artist) {
        const metadataKey = `${data.title}-${data.artist}`;

        // Só atualizar se mudou
        if (metadataKey !== lastMetadataRef.current) {
          console.log('Metadados atualizados:', data);
          setCurrentTitle(data.title);
          setCurrentArtist(data.artist);
          setAlbumCover(data.albumCover || '');
          setUserVote(null); // Resetar voto quando música muda
          lastMetadataRef.current = metadataKey;

          // Callback para componente pai
          onMetadataChange?.(data);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar metadados:', error);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  // Atualizar metadados a cada 1 segundo
  useEffect(() => {
    fetchMetadata();
    const interval = setInterval(fetchMetadata, 1000);
    return () => clearInterval(interval);
  }, []);

  // Tocar/pausar
  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error);
      toast.error('Erro ao reproduzir áudio');
    }
  };

  // Registrar voto
  const handleVote = async (voteType: 'like' | 'dislike') => {
    if (!currentTitle || currentTitle === 'Carregando...') {
      toast.error('Aguarde o carregamento da música');
      return;
    }

    try {
      await addVoteMutation.mutateAsync({
        songTitle: currentTitle,
        songArtist: currentArtist,
        voteType,
      });
      setUserVote(voteType);
    } catch (error) {
      console.error('Erro ao registrar voto:', error);
    }
  };

  return (
    <div className="w-full">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src="/api/stream"
        onError={(e) => {
          console.error('Erro ao carregar stream:', e);
          toast.error('Erro ao conectar ao stream');
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Player Container */}
      <div className="flex flex-col items-center gap-8">
        
        {/* Album Cover */}
        <div className="relative">
          {albumCover ? (
            <img
              src={albumCover}
              alt="Album Cover"
              className="w-64 h-64 rounded-xl shadow-2xl object-cover border-4 border-yellow-500"
              onError={(e) => {
                console.warn('Erro ao carregar capa:', albumCover);
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-64 h-64 bg-gradient-to-br from-purple-600 to-purple-900 rounded-xl shadow-2xl flex items-center justify-center border-4 border-yellow-500">
              <div className="text-6xl">🎵</div>
            </div>
          )}
          
          {/* Live Badge */}
          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            AO VIVO
          </div>
        </div>

        {/* Song Info */}
        <div className="text-center w-full">
          <h2 className="text-3xl font-bold text-white mb-2 line-clamp-2">
            {currentTitle}
          </h2>
          <p className="text-xl text-gray-300 line-clamp-1">
            {currentArtist}
          </p>
          {isLoadingMetadata && (
            <p className="text-sm text-gray-400 mt-2">Atualizando...</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 w-full justify-center">
          {/* Play/Pause Button */}
          <Button
            onClick={togglePlay}
            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-full p-4 shadow-lg transform transition hover:scale-110"
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
            />
            <span className="text-sm text-gray-300 w-8">{volume}%</span>
          </div>
        </div>

        {/* Vote Buttons */}
        <div className="flex gap-6 w-full justify-center">
          <Button
            onClick={() => handleVote('like')}
            disabled={addVoteMutation.isPending}
            className={`flex items-center gap-3 px-8 py-3 rounded-full font-bold text-lg transition transform hover:scale-105 ${
              userVote === 'like'
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            <ThumbsUp size={24} />
            Gostei
          </Button>
          <Button
            onClick={() => handleVote('dislike')}
            disabled={addVoteMutation.isPending}
            className={`flex items-center gap-3 px-8 py-3 rounded-full font-bold text-lg transition transform hover:scale-105 ${
              userVote === 'dislike'
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            <ThumbsDown size={24} />
            Não Gostei
          </Button>
        </div>
      </div>
    </div>
  );
}
