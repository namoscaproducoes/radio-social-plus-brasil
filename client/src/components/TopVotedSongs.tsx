import { Card } from '@/components/ui/card';
import { Music, ThumbsUp, ThumbsDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function TopVotedSongs() {
  // Buscar músicas mais votadas com like
  const likeQuery = trpc.songs.topVotedThisMonth.useQuery({
    voteType: 'like',
    limit: 5,
  });

  // Buscar músicas mais votadas com dislike
  const dislikeQuery = trpc.songs.topVotedThisMonth.useQuery({
    voteType: 'dislike',
    limit: 5,
  });

  const isLoading = likeQuery.isLoading || dislikeQuery.isLoading;
  const likeData = (likeQuery.data) as any[] | undefined;
  const dislikeData = (dislikeQuery.data) as any[] | undefined;

  // Combinar dados de like e dislike em um mapa para fácil acesso
  const voteMap = new Map<string, { likes: number; dislikes: number }>();
  
  likeData?.forEach((song: any) => {
    const key = `${song.title}-${song.artist}`;
    voteMap.set(key, { likes: song.voteCount || 0, dislikes: 0 });
  });

  dislikeData?.forEach((song: any) => {
    const key = `${song.title}-${song.artist}`;
    const existing = voteMap.get(key) || { likes: 0, dislikes: 0 };
    voteMap.set(key, { likes: existing.likes, dislikes: song.voteCount || 0 });
  });

  // Combinar e ordenar músicas por total de votos
  const combinedData = Array.from(voteMap.entries())
    .map(([key, votes]) => {
      const [title, artist] = key.split('-');
      const songData = likeData?.find((s: any) => s.title === title && s.artist === artist) ||
                       dislikeData?.find((s: any) => s.title === title && s.artist === artist);
      return {
        ...songData,
        title,
        artist,
        likes: votes.likes,
        dislikes: votes.dislikes,
        total: votes.likes + votes.dislikes,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div className="w-full">
      {/* Lista de músicas compacta */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <p className="text-gray-400 text-sm">Carregando...</p>
          </div>
        ) : combinedData && combinedData.length > 0 ? (
          combinedData.map((song: any, index: number) => (
            <div
              key={`${song.title}-${song.artist}-${index}`}
              className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded transition-colors"
            >
              {/* Posição */}
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-yellow-500 text-gray-900 font-bold rounded-full text-xs">
                {index + 1}
              </div>

              {/* Capa do álbum */}
              {song.albumCover && (
                <img
                  src={song.albumCover}
                  alt={song.title}
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />
              )}

              {/* Informações da música */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{song.title}</p>
                <p className="text-xs text-gray-400 truncate">{song.artist}</p>
              </div>

              {/* Votos com ícones */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <ThumbsUp size={14} className="text-green-500" />
                  <span className="text-xs font-semibold text-green-500">{song.likes || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsDown size={14} className="text-red-500" />
                  <span className="text-xs font-semibold text-red-500">{song.dislikes || 0}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-gray-400">
            <Music className="w-8 h-8 mb-1 opacity-50" />
            <p className="text-xs">Nenhuma música votada</p>
          </div>
        )}
      </div>
    </div>
  );
}
