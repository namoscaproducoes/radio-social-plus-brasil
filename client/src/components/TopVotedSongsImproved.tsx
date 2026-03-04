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
    const icon = type === 'likes' ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />;
    const iconColor = type === 'likes' ? 'text-green-500' : 'text-red-500';

    return (
      <div className="flex gap-1 items-center">
        {/* Lista de capas */}
        <div className="flex gap-1 overflow-x-auto flex-1 pb-1">
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
                <div className="flex items-center gap-2">
                  {/* Número da posição - centralizado com a capa */}
                  <div className="flex items-center justify-center min-w-fit">
                    <span className="text-xs font-bold text-gray-300">#{index + 1}</span>
                  </div>

                  {/* Capa do álbum */}
                  <div className="relative">
                    {song.albumCover ? (
                      <img
                        src={song.albumCover}
                        alt={song.title}
                        className="w-14 h-14 rounded object-cover border border-gray-600 hover:border-yellow-500 transition-colors"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-900 rounded flex items-center justify-center border border-gray-600 hover:border-yellow-500 transition-colors">
                        <Music size={16} className="text-gray-400" />
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

        {/* Ícone no final da linha */}
        <div className={`flex-shrink-0 flex items-center justify-center ${iconColor}`}>
          {icon}
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
        <div className="space-y-3">
          {/* Título em destaque */}
          <h3 className="text-base font-bold text-white">Top 5 Gostei e Não Gostei da Semana</h3>

          {/* TOP 5 Gostei */}
          <div>
            {renderTopList(topLikes, 'likes')}
          </div>

          {/* TOP 5 Não Gostei */}
          <div>
            {renderTopList(topDislikes, 'dislikes')}
          </div>
        </div>
      )}
    </div>
  );
}
