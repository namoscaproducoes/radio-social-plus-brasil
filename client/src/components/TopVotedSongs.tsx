import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Music } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function TopVotedSongs() {
  const [activeTab, setActiveTab] = useState<'like' | 'dislike'>('like');

  // Buscar músicas mais votadas com like
  const likeQuery = trpc.songs.topVotedThisMonth.useQuery({
    voteType: 'like',
    limit: 10,
  });

  // Buscar músicas mais votadas com dislike
  const dislikeQuery = trpc.songs.topVotedThisMonth.useQuery({
    voteType: 'dislike',
    limit: 10,
  });

  const isLoading = activeTab === 'like' ? likeQuery.isLoading : dislikeQuery.isLoading;
  const data = (activeTab === 'like' ? likeQuery.data : dislikeQuery.data) as any[] | undefined;

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-white mb-6">Top Músicas do Mês</h2>

      {/* Abas */}
      <div className="flex gap-4 mb-6">
        <Button
          onClick={() => setActiveTab('like')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'like'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <ThumbsUp className="w-5 h-5" />
          Gostei ({Array.isArray(likeQuery.data) ? likeQuery.data.length : 0})
        </Button>
        <Button
          onClick={() => setActiveTab('dislike')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'dislike'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <ThumbsDown className="w-5 h-5" />
          Não Gostei ({Array.isArray(dislikeQuery.data) ? dislikeQuery.data.length : 0})
        </Button>
      </div>

      {/* Lista de músicas */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-400">Carregando...</p>
          </div>
        ) : data && Array.isArray(data) && data.length > 0 ? (
          data.map((song: any, index: number) => (
            <Card
              key={`${song.id}-${index}`}
              className="bg-gray-800 border-gray-700 p-4 hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Posição */}
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-yellow-500 text-gray-900 font-bold rounded-full">
                  {index + 1}
                </div>

                {/* Capa do álbum */}
                {song.albumCover && (
                  <img
                    src={song.albumCover}
                    alt={song.title}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                )}

                {/* Informações da música */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{song.title}</p>
                  <p className="text-sm text-gray-400 truncate">{song.artist}</p>
                </div>

                {/* Votos */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-lg font-bold text-yellow-500">{song.voteCount}</p>
                  <p className="text-xs text-gray-500">
                    {activeTab === 'like' ? 'Gostei' : 'Não Gostei'}
                  </p>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <Music className="w-12 h-12 mb-2 opacity-50" />
            <p>Nenhuma música votada nesta categoria</p>
          </div>
        )}
      </div>
    </div>
  );
}
