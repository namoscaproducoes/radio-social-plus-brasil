import { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { getLoginUrl } from '@/const';

function useAuthLocal() {
  const { data: user } = trpc.auth.me.useQuery();
  return { user };
}

interface VoteData {
  id: number;
  userId: number;
  songId: number;
  voteType: 'like' | 'dislike';
  createdAt: string;
  userName: string | null;
  songTitle: string | null;
  songArtist: string | null;
  albumCover: string | null;
}

export function VoteNotification() {
  const [latestVote, setLatestVote] = useState<VoteData | null>(null);
  const [lastVoteId, setLastVoteId] = useState<number | null>(null);
  const { user } = useAuthLocal();

  // Query para obter o último voto com polling
  // Usar intervalo maior para reduzir carga em mobile
  const { data: voteData } = trpc.songs.getLatestVote.useQuery(undefined, {
    refetchInterval: 3000, // Atualizar a cada 3 segundos
    staleTime: 2500, // Cache por 2.5 segundos
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
    <div className="bg-gray-900 px-2 py-2 flex flex-col items-center">
      {/* Desktop layout - horizontal */}
      <div className="hidden md:flex items-center justify-center gap-3 text-xs w-full">
        {/* Album cover */}
        {latestVote.albumCover && (
          <img 
            src={latestVote.albumCover} 
            alt="Album cover"
            className="w-10 h-10 rounded flex-shrink-0 object-cover"
          />
        )}
        
        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p className="text-gray-300 truncate">
            <span className="font-semibold text-white">{displayName}</span> acabou de dar um voto:
          </p>
          <p className="text-gray-400 text-xs truncate">
            {songTitle} - {songArtist}
          </p>
        </div>

        {/* Vote icon */}
        <div className="flex-shrink-0">
          {isLike ? (
            <ThumbsUp className="w-6 h-6 text-green-500 fill-green-500" />
          ) : (
            <ThumbsDown className="w-6 h-6 text-red-500 fill-red-500" />
          )}
        </div>
      </div>

      {/* Mobile layout - vertical with line breaks */}
      <div className="md:hidden space-y-1 text-xs w-full">
        <div className="flex items-center justify-center gap-2">
          {/* Album cover */}
          {latestVote.albumCover && (
            <img 
              src={latestVote.albumCover} 
              alt="Album cover"
              className="w-12 h-12 rounded flex-shrink-0 object-cover"
            />
          )}
          
          {/* Text and icon */}
          <div className="flex-1 min-w-0">
            <p className="text-gray-300">
              <span className="font-semibold text-white">{displayName}</span> acabou de dar um voto:
            </p>
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-gray-400 text-xs flex-1 break-words">
                {songTitle} - {songArtist}
              </p>
              <div className="flex-shrink-0">
                {isLike ? (
                  <ThumbsUp className="w-5 h-5 text-green-500 fill-green-500" />
                ) : (
                  <ThumbsDown className="w-5 h-5 text-red-500 fill-red-500" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mensagem de login para usuários não autenticados */}
      {!user && (
        <div className="mt-3 pt-3">
          {/* Desktop layout */}
          <div className="hidden md:flex items-center justify-between gap-3 text-xs py-2">
            <p className="text-gray-300 flex-1">
              Faça login para o seu nome e voto aparecer aqui
            </p>
            <a
              href="https://radiosocial-cnru7ges.manus.space/auth/login"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold whitespace-nowrap transition-colors"
            >
              Login
            </a>
          </div>

          {/* Mobile layout */}
          <div className="md:hidden space-y-1 py-2">
            <p className="text-gray-300 text-xs">
              Faça login para o seu nome e voto aparecer aqui
            </p>
            <a
              href="https://radiosocial-cnru7ges.manus.space/auth/login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors"
            >
              Login
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
