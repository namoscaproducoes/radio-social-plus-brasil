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
      {isLoading ? (
        <div className="flex items-center justify-center py-2">
          <p className="text-gray-400 text-xs">Carregando...</p>
        </div>
      ) : combinedData && combinedData.length > 0 ? (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {combinedData.map((song: any, index: number) => (
            <div
              key={`${song.title}-${song.artist}-${index}`}
              className="flex-shrink-0 relative group"
            >
              {/* Número da posição */}
              <div className="absolute -top-2 -left-2 w-6 h-6 flex items-center justify-center bg-yellow-500 text-gray-900 font-bold rounded-full text-xs z-10">
                #{index + 1}
              </div>

              {/* Capa do álbum */}
              <div className="relative">
                {song.albumCover ? (
                  <img
                    src={song.albumCover}
                    alt={song.title}
                    className="w-20 h-20 rounded object-cover border border-gray-600 hover:border-yellow-500 transition-colors"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-900 rounded flex items-center justify-center border border-gray-600 hover:border-yellow-500 transition-colors">
                    <Music size={24} className="text-gray-400" />
                  </div>
                )}

                {/* Tooltip ao passar mouse */}
                <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-95 rounded-b p-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs z-20 pointer-events-none">
                  <p className="font-semibold text-white truncate">{song.title}</p>
                  <p className="text-gray-400 truncate">{song.artist}</p>
                  <div className="flex gap-1 mt-0.5">
                    <div className="flex items-center gap-0.5">
                      <ThumbsUp size={10} className="text-green-500" />
                      <span className="text-green-500">{song.likes || 0}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <ThumbsDown size={10} className="text-red-500" />
                      <span className="text-red-500">{song.dislikes || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-2 text-gray-400">
          <Music className="w-6 h-6 mb-1 opacity-50" />
          <p className="text-xs">Nenhuma música votada</p>
        </div>
      )}
    </div>
  );
}
