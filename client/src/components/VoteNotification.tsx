import { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface VoteData {
  id: number;
  userId: number;
  songId: number;
  voteType: 'like' | 'dislike';
  createdAt: string;
  userName: string | null;
  songTitle: string | null;
  songArtist: string | null;
}

export function VoteNotification() {
  const [latestVote, setLatestVote] = useState<VoteData | null>(null);
  const [lastVoteId, setLastVoteId] = useState<number | null>(null);

  // Query para obter o último voto com polling
  const { data: voteData } = trpc.songs.getLatestVote.useQuery(undefined, {
    refetchInterval: 2000, // Atualizar a cada 2 segundos
  });

  useEffect(() => {
    if (voteData && voteData.id !== lastVoteId) {
      setLatestVote(voteData as VoteData);
      setLastVoteId(voteData.id);
    }
  }, [voteData, lastVoteId]);

  if (!latestVote) {
    return null;
  }

  const displayName = latestVote.userName || 'Usuário';
  const songTitle = latestVote.songTitle || 'Música desconhecida';
  const songArtist = latestVote.songArtist || 'Artista desconhecido';
  const isLike = latestVote.voteType === 'like';

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <p className="text-gray-300">
            <span className="font-semibold text-white">{displayName}</span> acabou de dar um voto:
          </p>
          <p className="text-gray-400 mt-1">
            {songTitle} - {songArtist}
          </p>
        </div>
        <div className="flex-shrink-0">
          {isLike ? (
            <ThumbsUp className="w-5 h-5 text-green-500 fill-green-500" />
          ) : (
            <ThumbsDown className="w-5 h-5 text-red-500 fill-red-500" />
          )}
        </div>
      </div>
    </div>
  );
}
