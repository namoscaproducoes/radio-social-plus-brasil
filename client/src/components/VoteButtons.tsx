import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useMetadata } from '@/contexts/MetadataContext';
import { useState } from 'react';

export function VoteButtons() {
  const { songTitle, songArtist } = useMetadata();
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);

  const addVoteMutation = trpc.songs.vote.useMutation({
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

    try {
      await addVoteMutation.mutateAsync({
        songTitle: songTitle,
        songArtist: songArtist,
        voteType,
      });
      setUserVote(voteType);
    } catch (error) {
      console.error('Erro ao registrar voto:', error);
    }
  };

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
        disabled={addVoteMutation.isPending}
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
        disabled={addVoteMutation.isPending}
      >
        <ThumbsDown size={18} className="mr-2" />
        Não Gostei
      </Button>
    </div>
  );
}
