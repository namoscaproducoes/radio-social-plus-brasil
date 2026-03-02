import { Card } from '@/components/ui/card';
import { Music } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useState } from 'react';

export function TopVotedSongs() {
  // Buscar músicas mais votadas com like
  const likeQuery = trpc.songs.topVotedThisMonth.useQuery({
    voteType: 'like',
    limit: 5,
  });

  const isLoading = likeQuery.isLoading;
  const data = (likeQuery.data) as any[] | undefined;

  return (
    <div className="w-full">
      {/* Lista de músicas compacta */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <p className="text-gray-400 text-sm">Carregando...</p>
          </div>
        ) : data && Array.isArray(data) && data.length > 0 ? (
          data.map((song: any, index: number) => (
            <div
              key={`${song.id}-${index}`}
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

              {/* Votos */}
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-bold text-yellow-500">{song.voteCount}</p>
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
