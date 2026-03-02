import { useEffect, useState } from 'react';
import { Share2, Copy, Check, Music, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

interface Song {
  id: number;
  title: string;
  artist: string;
  albumCover?: string | null;
  playedAt: Date;
}

interface SongWithVotes extends Song {
  voteCount?: {
    likes: number;
    dislikes: number;
  };
}

export function SongHistory() {
  const [songs, setSongs] = useState<SongWithVotes[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [voteCounts, setVoteCounts] = useState<Record<number, { likes: number; dislikes: number }>>({});

  // Buscar histórico de músicas
  const { data: historyData, isLoading: isHistoryLoading, refetch } = trpc.songs.history.useQuery(
    { limit: 5 },
    {
      refetchInterval: 5000,
    }
  );

  // Atualizar estado local quando dados chegam
  useEffect(() => {
    if (historyData) {
      setSongs(historyData as SongWithVotes[]);
      setIsLoading(false);
    }
  }, [historyData]);

  // Buscar votos para cada musica
  useEffect(() => {
    const fetchVotes = async () => {
      const counts: Record<number, { likes: number; dislikes: number }> = {};
      for (const song of songs) {
        try {
          const result = await fetch(`/api/trpc/songs.voteCount?input=${encodeURIComponent(JSON.stringify({ songId: song.id }))}`).then(r => r.json());
          counts[song.id] = result as { likes: number; dislikes: number };
        } catch (error) {
          counts[song.id] = { likes: 0, dislikes: 0 };
        }
      }
      setVoteCounts(counts);
    };
    if (songs.length > 0) {
      fetchVotes();
    }
  }, [songs]);

  // Função para compartilhar música
  const shareSong = async (song: Song) => {
    const shareText = `🎵 Agora tocando na Rádio Social Plus Brasil:\n\n${song.title}\n${song.artist}\n\nOuça ao vivo: ${window.location.origin}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rádio Social Plus Brasil',
          text: shareText,
          url: window.location.origin,
        });
        toast.success('Compartilhado com sucesso!');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Erro ao compartilhar:', error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopiedId(song.id);
        toast.success('Copiado para a área de transferência!');
        setTimeout(() => setCopiedId(null), 2000);
      } catch (error) {
        console.error('Erro ao copiar:', error);
        toast.error('Erro ao copiar para a área de transferência');
      }
    }
  };

  // Função para compartilhar no WhatsApp
  const shareOnWhatsApp = (song: Song) => {
    const text = encodeURIComponent(
      `🎵 Agora tocando na Rádio Social Plus Brasil:\n\n${song.title}\n${song.artist}\n\nOuça ao vivo: ${window.location.origin}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Função para compartilhar no Twitter
  const shareOnTwitter = (song: Song) => {
    const text = encodeURIComponent(
      `🎵 Agora tocando na Rádio Social Plus Brasil: ${song.title} - ${song.artist}\n\nOuça ao vivo: ${window.location.origin}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  if (isLoading || isHistoryLoading) {
    return (
      <div className="w-full">
        <div className="space-y-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded p-1 animate-pulse">
              <div className="h-2 bg-gray-700 rounded w-3/4 mb-1"></div>
              <div className="h-2 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="w-full text-center">
        <Music size={20} className="mx-auto text-gray-500 mb-1" />
        <p className="text-xs text-gray-400">Sem histórico</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-1">
        {songs.map((song, index) => {
          const votes = voteCounts[song.id] || { likes: 0, dislikes: 0 };
          return (
            <div
              key={`${song.id}-${index}`}
              className="rounded p-1 hover:bg-white/5 transition-all duration-200 border border-white/10 flex items-center gap-1"
            >
              {song.albumCover ? (
                <img
                  src={song.albumCover}
                  alt={`${song.title} - ${song.artist}`}
                  className="w-8 h-8 rounded object-cover border border-gray-600 flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-900 rounded flex items-center justify-center border border-gray-600 flex-shrink-0">
                  <Music size={12} className="text-gray-400" />
                </div>
              )}

              <div className="flex-grow min-w-0">
                <p className="text-white text-xs font-semibold truncate">{song.title}</p>
                <p className="text-gray-400 text-xs truncate">{song.artist}</p>
              </div>

              <div className="flex-shrink-0 flex gap-1 items-center">
                {votes.likes > 0 && (
                  <div className="flex items-center gap-0.5 bg-green-900/30 px-1 py-0.5 rounded">
                    <ThumbsUp size={10} className="text-green-500" />
                    <span className="text-xs text-green-500 font-semibold">{votes.likes}</span>
                  </div>
                )}
                {votes.dislikes > 0 && (
                  <div className="flex items-center gap-0.5 bg-red-900/30 px-1 py-0.5 rounded">
                    <ThumbsDown size={10} className="text-red-500" />
                    <span className="text-xs text-red-500 font-semibold">{votes.dislikes}</span>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white p-0 h-6 w-6"
                  onClick={() => shareSong(song)}
                  title="Copiar para compartilhar"
                >
                  {copiedId === song.id ? (
                    <Check size={12} />
                  ) : (
                    <Copy size={12} />
                  )}
                </Button>

                <div className="relative group">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white p-0 h-6 w-6"
                    title="Compartilhar"
                  >
                    <Share2 size={12} />
                  </Button>

                  <div className="absolute right-0 mt-1 w-32 bg-gray-900 border border-gray-700 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <button
                      onClick={() => shareOnWhatsApp(song)}
                      className="w-full px-2 py-1 text-left text-xs text-gray-300 hover:bg-gray-800 hover:text-white first:rounded-t transition-colors"
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() => shareOnTwitter(song)}
                      className="w-full px-2 py-1 text-left text-xs text-gray-300 hover:bg-gray-800 hover:text-white last:rounded-b transition-colors"
                    >
                      Twitter
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
