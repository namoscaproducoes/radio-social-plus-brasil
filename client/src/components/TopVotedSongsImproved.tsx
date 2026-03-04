import { Music, ThumbsUp, ThumbsDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function TopVotedSongsImproved() {
  // Buscar ranking completo de todas as músicas
  const { data: rankingData, isLoading } = trpc.songs.ranking.useQuery(
    {
      period: 'month',
    },
    {
      refetchInterval: 5000, // Atualizar a cada 5 segundos
    }
  );

  // Filtrar TOP 5 com mais likes
  const topLikes = (rankingData || [])
    .filter((song: any) => song.likes > 0)
    .sort((a: any, b: any) => b.likes - a.likes)
    .slice(0, 5);

  // Filtrar TOP 5 com mais dislikes
  const topDislikes = (rankingData || [])
    .filter((song: any) => song.dislikes > 0)
    .sort((a: any, b: any) => b.dislikes - a.dislikes)
    .slice(0, 5);

  const renderTopList = (songs: any[], type: 'likes' | 'dislikes') => {
    const isEmpty = songs.length === 0;
    const icon = type === 'likes' ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />;
    const color = type === 'likes' ? 'text-green-500' : 'text-red-500';
    const bgColor = type === 'likes' ? 'bg-green-500/10' : 'bg-red-500/10';

    return (
      <div className="flex-1">
        <div className={`flex items-center gap-1 mb-1 ${color}`}>
          {icon}
          <span className="text-xs font-semibold">
            {type === 'likes' ? 'Gostei' : 'Não Gostei'}
          </span>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {isEmpty ? (
            <div className="flex items-center justify-center w-full py-2 text-gray-400">
              <p className="text-xs">Sem votos</p>
            </div>
          ) : (
            songs.map((song: any, index: number) => (
              <div
                key={`top-${type}-${song.id}-${index}`}
                className="flex-shrink-0 relative group"
              >
                {/* Número da posição */}
                <div className={`absolute -top-2 -left-2 w-5 h-5 flex items-center justify-center ${bgColor} ${color} font-bold rounded-full text-xs z-10`}>
                  #{index + 1}
                </div>

                {/* Capa do álbum */}
                <div className="relative">
                  {song.albumCover ? (
                    <img
                      src={song.albumCover}
                      alt={song.title}
                      className="w-12 h-12 rounded object-cover border border-gray-600 hover:border-yellow-500 transition-colors"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-900 rounded flex items-center justify-center border border-gray-600 hover:border-yellow-500 transition-colors">
                      <Music size={14} className="text-gray-400" />
                    </div>
                  )}

                  {/* Tooltip ao passar mouse */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-95 rounded-b p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-xs z-20 pointer-events-none whitespace-nowrap">
                    <p className="font-semibold text-white truncate text-xs">{song.title}</p>
                    <p className="text-gray-400 truncate text-xs">{song.artist}</p>
                    <div className="flex gap-1 mt-0.5">
                      <div className="flex items-center gap-0.5">
                        <ThumbsUp size={8} className="text-green-500" />
                        <span className="text-green-500 text-xs">{song.likes || 0}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <ThumbsDown size={8} className="text-red-500" />
                        <span className="text-red-500 text-xs">{song.dislikes || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="flex items-center justify-center py-2">
          <p className="text-gray-400 text-xs">Carregando...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {renderTopList(topLikes, 'likes')}
          {renderTopList(topDislikes, 'dislikes')}
        </div>
      )}
    </div>
  );
}
