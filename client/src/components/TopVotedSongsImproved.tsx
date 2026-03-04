import { Music, ThumbsUp, ThumbsDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function TopVotedSongsImproved() {
  // Buscar ranking da semana
  const { data: rankingData, isLoading } = trpc.songs.ranking.useQuery(
    {
      period: 'week',
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
    const icon = type === 'likes' ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />;
    const color = type === 'likes' ? 'text-green-500' : 'text-red-500';

    return (
      <div className="flex-1">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {isEmpty ? (
            <div className="flex items-center justify-center w-full py-4 text-gray-400">
              <p className="text-xs">Sem votos</p>
            </div>
          ) : (
            songs.map((song: any, index: number) => (
              <div
                key={`top-${type}-${song.id}-${index}`}
                className="flex-shrink-0 relative group"
              >
                {/* Container com posição e capa */}
                <div className="flex items-start gap-2">
                  {/* Número da posição */}
                  <div className="flex items-center justify-center min-w-fit pt-1">
                    <span className="text-sm font-bold text-gray-300">#{index + 1}</span>
                  </div>

                  {/* Capa do álbum - maior */}
                  <div className="relative">
                    {song.albumCover ? (
                      <img
                        src={song.albumCover}
                        alt={song.title}
                        className="w-20 h-20 rounded object-cover border border-gray-600 hover:border-yellow-500 transition-colors"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-900 rounded flex items-center justify-center border border-gray-600 hover:border-yellow-500 transition-colors">
                        <Music size={20} className="text-gray-400" />
                      </div>
                    )}

                    {/* Tooltip ao passar mouse */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-95 rounded-b p-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs z-20 pointer-events-none whitespace-nowrap">
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
        <div className="flex items-center justify-center py-4">
          <p className="text-gray-400 text-xs">Carregando...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Título unificado */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white mb-1">Top 5 Gostei e Não Gostei da Semana</h3>
            <p className="text-xs text-gray-400">Confira todos os Top 5 que estão acontecendo por aqui.</p>
          </div>

          {/* TOP 5 Gostei */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ThumbsUp size={16} className="text-green-500" />
              <span className="text-sm font-semibold text-green-500">Gostei</span>
            </div>
            {renderTopList(topLikes, 'likes')}
          </div>

          {/* TOP 5 Não Gostei */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ThumbsDown size={16} className="text-red-500" />
              <span className="text-sm font-semibold text-red-500">Não Gostei</span>
            </div>
            {renderTopList(topDislikes, 'dislikes')}
          </div>
        </div>
      )}
    </div>
  );
}
