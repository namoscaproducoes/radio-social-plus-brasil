import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useMetadata } from '@/contexts/MetadataContext';
import { useState, useEffect } from 'react';

export function VoteButtons() {
  const { songTitle, songArtist } = useMetadata();
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentSongId, setCurrentSongId] = useState<number | null>(null);

  // Verificar se usuário está logado
  const { data: user } = trpc.auth.me.useQuery();

  // Buscar música atual para obter o ID
  const { data: currentSong } = trpc.songs.current.useQuery();

  // Buscar votos do usuário se logado
  const { data: userVotes } = trpc.votes.getUserVotes.useQuery(undefined, {
    enabled: !!user,
  });

  // Atualizar ID da música atual
  useEffect(() => {
    if (currentSong?.songId) {
      setCurrentSongId(currentSong.songId);
    }
  }, [currentSong]);

  // Atualizar voto local quando votos são carregados
  useEffect(() => {
    if (userVotes && currentSongId) {
      const vote = userVotes.find(v => v.songId === currentSongId);
      if (vote) {
        setUserVote(vote.voteType as 'like' | 'dislike');
      } else {
        setUserVote(null);
      }
    }
  }, [userVotes, currentSongId]);

  useEffect(() => {
    setIsLoggedIn(!!user);
  }, [user]);

  // Mutation para votos de usuários logados
  const addUserVoteMutation = trpc.votes.addVote.useMutation({
    onSuccess: () => {
      toast.success('Voto registrado com sucesso!');
      // Invalidar cache de votos do usuário
      trpc.useUtils().votes.getUserVotes.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao registrar voto');
    },
  });

  // Mutation para votos anônimos
  const addAnonymousVoteMutation = trpc.songs.vote.useMutation({
    onSuccess: () => {
      toast.success('Voto registrado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao registrar voto');
    },
  });

  const handleVote = async (voteType: 'like' | 'dislike') => {
    if (!songTitle || songTitle === 'Carregando...') {
      toast.error('Aguarde o carregamento da música');
      return;
    }

    if (!isLoggedIn) {
      // Voto anônimo
      try {
        await addAnonymousVoteMutation.mutateAsync({
          songTitle: songTitle,
          songArtist: songArtist,
          voteType,
        });
        setUserVote(voteType);
      } catch (error) {
        console.error('Erro ao registrar voto anônimo:', error);
      }
    } else {
      // Voto de usuário logado
      if (!currentSongId) {
        toast.error('ID da música não encontrado');
        return;
      }

      try {
        await addUserVoteMutation.mutateAsync({
          songId: currentSongId,
          voteType,
        });
        setUserVote(voteType);
      } catch (error) {
        console.error('Erro ao registrar voto:', error);
      }
    }
  };

  const isLoading = addUserVoteMutation.isPending || addAnonymousVoteMutation.isPending;

  return (
    <div className="flex gap-4 w-full justify-center">
      <Button
        onClick={() => handleVote('like')}
        variant={userVote === 'like' ? 'default' : 'outline'}
        className={`rounded-full px-6 py-2 transition ${
          userVote === 'like'
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'border-green-500 text-green-500 hover:bg-green-500 hover:text-white'
        }`}
        disabled={isLoading}
      >
        <ThumbsUp size={18} className="mr-2" />
        Gostei
      </Button>
      <Button
        onClick={() => handleVote('dislike')}
        variant={userVote === 'dislike' ? 'default' : 'outline'}
        className={`rounded-full px-6 py-2 transition ${
          userVote === 'dislike'
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'border-red-500 text-red-500 hover:bg-red-500 hover:text-white'
        }`}
        disabled={isLoading}
      >
        <ThumbsDown size={18} className="mr-2" />
        Não Gostei
      </Button>
    </div>
  );
}
