import { useEffect, useState } from 'react';
import { Share2, Copy, Check, Music } from 'lucide-react';
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

export function SongHistory() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Buscar histórico de músicas
  const { data: historyData, isLoading: isHistoryLoading, refetch } = trpc.songs.history.useQuery(
    { limit: 5 },
    {
      refetchInterval: 5000, // Atualizar a cada 5 segundos
    }
  );

  // Atualizar estado local quando dados chegam
  useEffect(() => {
    if (historyData) {
      setSongs(historyData as Song[]);
      setIsLoading(false);
    }
  }, [historyData]);

  // Função para compartilhar música
  const shareSong = async (song: Song) => {
    const shareText = `🎵 Agora tocando na Rádio Social Plus Brasil:\n\n${song.title}\n${song.artist}\n\nOuça ao vivo: ${window.location.origin}`;

    // Tentar usar Web Share API
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
      // Fallback: copiar para clipboard
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
        <h3 className="text-2xl font-bold text-white mb-6">Histórico de Músicas</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="w-full">
        <h3 className="text-2xl font-bold text-white mb-6">Histórico de Músicas</h3>
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <Music size={48} className="mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400">Nenhuma música no histórico ainda</p>
          <p className="text-sm text-gray-500 mt-2">As músicas aparecerão aqui conforme forem tocadas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-2xl font-bold text-white mb-6">Histórico de Músicas</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {songs.map((song, index) => (
          <div
            key={`${song.id}-${index}`}
            className="rounded-lg p-4 hover:bg-white/5 transition-all duration-200 border border-white/10"
          >
            <div className="flex items-start gap-4">
              {/* Album Cover */}
              <div className="flex-shrink-0">
                {song.albumCover ? (
                  <img
                    src={song.albumCover}
                    alt={`${song.title} - ${song.artist}`}
                    className="w-16 h-16 rounded-md object-cover border border-gray-600"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-900 rounded-md flex items-center justify-center border border-gray-600">
                    <Music size={24} className="text-gray-400" />
                  </div>
                )}
              </div>

              {/* Song Info */}
              <div className="flex-grow min-w-0">
                <h4 className="text-white font-semibold truncate">{song.title}</h4>
                <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {new Date(song.playedAt).toLocaleTimeString('pt-BR')}
                </p>
              </div>

              {/* Share Buttons */}
              <div className="flex-shrink-0 flex gap-2">
                {/* Copy Button */}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                  onClick={() => shareSong(song)}
                  title="Copiar para compartilhar"
                >
                  {copiedId === song.id ? (
                    <Check size={16} />
                  ) : (
                    <Copy size={16} />
                  )}
                </Button>

                {/* Share Menu */}
                <div className="relative group">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                    title="Compartilhar"
                  >
                    <Share2 size={16} />
                  </Button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <button
                      onClick={() => shareOnWhatsApp(song)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white first:rounded-t-lg transition-colors"
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() => shareOnTwitter(song)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white last:rounded-b-lg transition-colors"
                    >
                      Twitter
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
