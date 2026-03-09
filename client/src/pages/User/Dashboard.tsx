import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { useEffect, useState } from 'react';
import { Heart, LogOut, Home, Music, TrendingUp, ThumbsUp, ThumbsDown, Download } from 'lucide-react';

export default function UserDashboard() {
  const [, navigate] = useLocation();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [adminPeriodFilter, setAdminPeriodFilter] = useState<'day' | 'week' | 'month' | 'year'>('day');

  const meQuery = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation();
  const voteStatsQuery = trpc.votes.getVoteStats.useQuery(undefined, {
    refetchInterval: 5000, // Refetch a cada 5 segundos
  });
  const userVotesQuery = trpc.votes.getUserVotes.useQuery(undefined, {
    refetchInterval: 5000, // Refetch a cada 5 segundos
  });
  const exportUsersQuery = trpc.user.exportUsers.useQuery(undefined, {
    enabled: false, // Não executar automaticamente
  });
  const getAllUsersQuery = trpc.user.getAllUsers.useQuery(undefined, {
    enabled: userInfo?.role === 'admin',
    refetchInterval: 10000, // Refetch a cada 10 segundos
  });

  useEffect(() => {
    if (meQuery.data) {
      setUserInfo(meQuery.data);
      setIsLoading(false);
    }
  }, [meQuery.data]);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleExportUsers = async () => {
    try {
      const data = await exportUsersQuery.refetch();
      if (data.data && Array.isArray(data.data)) {
        // Criar CSV
        const headers = ['ID', 'Nome', 'Email', 'Data de Cadastro'];
        const rows = data.data.map((user: any) => [
          user.id,
          user.name || '',
          user.email || '',
          new Date(user.createdAt).toLocaleDateString('pt-BR'),
        ]);

        // Criar conteúdo do CSV
        let csvContent = headers.join(',') + '\n';
        rows.forEach((row: any) => {
          csvContent += row.map((cell: any) => `"${cell}"`).join(',') + '\n';
        });

        // Criar blob e download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Erro ao exportar usuarios:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-900 to-gray-950 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p>Carregando seu dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Você precisa estar logado para acessar esta página</p>
          <Button onClick={() => navigate('/auth/login')} className="bg-red-600 hover:bg-red-700">
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  const stats = voteStatsQuery.data || { total: 0, likes: 0, dislikes: 0 };
  const userVotes = userVotesQuery.data || [];
  const likes = userVotes.filter(v => v.voteType === 'like').length;
  const dislikes = userVotes.filter(v => v.voteType === 'dislike').length;

  // Ordenar votos do mais novo para o mais velho
  const sortedUserVotes = [...userVotes].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Contar votos por música
  const voteCountByMusic = userVotes.reduce((acc: any, vote: any) => {
    const key = `${vote.songTitle}-${vote.songArtist}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // Filtrar votos por período
  const getFilteredVotes = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

    return sortedUserVotes.filter((vote: any) => {
      const voteDate = new Date(vote.createdAt);
      switch (periodFilter) {
        case 'today':
          return voteDate >= today;
        case 'week':
          return voteDate >= weekAgo;
        case 'month':
          return voteDate >= monthAgo;
        default:
          return true;
      }
    });
  };

  const filteredVotes = getFilteredVotes();

  // Filtrar usuários por período (admin only)
  const getFilteredUsers = () => {
    const allUsers = getAllUsersQuery.data || [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

    return allUsers.filter((user: any) => {
      const userDate = new Date(user.createdAt);
      switch (adminPeriodFilter) {
        case 'day':
          return userDate >= today;
        case 'week':
          return userDate >= weekAgo;
        case 'month':
          return userDate >= monthAgo;
        case 'year':
          return userDate >= yearAgo;
        default:
          return true;
      }
    });
  };

  const filteredUsers = getFilteredUsers();
  const allUsers = getAllUsersQuery.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-900 to-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/logo-radio.png" 
              alt="Rádio Social Plus Brasil" 
              className="w-10 h-10 rounded-lg"
            />
            <div>
              <h1 className="text-white font-bold text-lg">Meu Dashboard</h1>
              <p className="text-gray-400 text-sm">Bem-vindo, {userInfo.name}!</p>
            </div>
          </div>
          <div className="flex gap-2">
            {userInfo?.role === 'admin' && (
              <Button 
                onClick={handleExportUsers}
                className="bg-blue-600 hover:bg-blue-700 text-white flex gap-2"
              >
                <Download size={18} />
                Exportar Usuarios
              </Button>
            )}
            <Button 
              onClick={() => navigate('/')}
              className="bg-gray-800 hover:bg-gray-700 text-white flex gap-2"
            >
              <Home size={18} />
              Voltar
            </Button>
            <Button 
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white flex gap-2"
            >
              <LogOut size={18} />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* User Info Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">{userInfo.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h2 className="text-white text-2xl font-bold">{userInfo.name}</h2>
              <p className="text-gray-400">{userInfo.email}</p>
              <p className="text-gray-500 text-sm">
                Membro desde {new Date(userInfo.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <ThumbsUp className="text-green-500" size={24} />
              <div>
                <p className="text-gray-400 text-sm">Curtidas</p>
                <p className="text-white text-2xl font-bold">{likes}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <ThumbsDown className="text-red-500" size={24} />
              <div>
                <p className="text-gray-400 text-sm">Não Curtidas</p>
                <p className="text-white text-2xl font-bold">{dislikes}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Music className="text-yellow-500" size={24} />
              <div>
                <p className="text-gray-400 text-sm">Total de Votos</p>
                <p className="text-white text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Voted Songs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-xl font-bold flex items-center gap-2">
              <Heart className="text-red-500" size={24} />
              Histórico de Votações
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setPeriodFilter('all')}
                className={`px-3 py-1 rounded text-sm font-semibold transition ${
                  periodFilter === 'all'
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setPeriodFilter('today')}
                className={`px-3 py-1 rounded text-sm font-semibold transition ${
                  periodFilter === 'today'
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setPeriodFilter('week')}
                className={`px-3 py-1 rounded text-sm font-semibold transition ${
                  periodFilter === 'week'
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setPeriodFilter('month')}
                className={`px-3 py-1 rounded text-sm font-semibold transition ${
                  periodFilter === 'month'
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Mês
              </button>
            </div>
          </div>
          
          {userVotes.length === 0 ? (
            <p className="text-gray-400">Você ainda não votou em nenhuma música. Volte para a página inicial e comece a votar!</p>
          ) : filteredVotes.length === 0 ? (
            <p className="text-gray-400">Nenhum voto neste período.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredVotes.map((vote, index) => {
                const musicKey = `${vote.songTitle}-${vote.songArtist}`;
                const voteCount = voteCountByMusic[musicKey];
                return (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                  {/* Capa do álbum */}
                  <div className="flex-shrink-0">
                    {vote.albumCover && typeof vote.albumCover === 'string' && vote.albumCover.trim() ? (
                      <img
                        src={vote.albumCover}
                        alt={vote.songTitle || 'Música'}
                        className="w-12 h-12 rounded object-cover border border-gray-600"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-900 rounded flex items-center justify-center border border-gray-600">
                        <Music size={20} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{vote.songTitle || 'Música desconhecida'}</p>
                    <p className="text-gray-400 text-xs truncate">{vote.songArtist || 'Artista desconhecido'}</p>
                    <p className="text-gray-500 text-xs">
                      {new Date(vote.createdAt).toLocaleDateString('pt-BR')} às {new Date(vote.createdAt).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-gray-400 text-xs">Votos</p>
                      <p className="text-yellow-500 font-bold text-sm">{voteCount}</p>
                    </div>
                    {vote.voteType === 'like' ? (
                      <>
                        <ThumbsUp className="text-green-500" size={18} />
                        <span className="text-green-500 font-semibold text-sm">Curtida</span>
                      </>
                    ) : (
                      <>
                        <ThumbsDown className="text-red-500" size={18} />
                        <span className="text-red-500 font-semibold text-sm">Não Curtida</span>
                      </>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Admin Users Management */}
        {userInfo?.role === 'admin' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h3 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="text-blue-500" size={24} />
              Gerenciamento de Usuários
            </h3>
            
            {/* Period Filter */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setAdminPeriodFilter('day')}
                className={`px-3 py-1 rounded text-sm font-semibold transition ${
                  adminPeriodFilter === 'day'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setAdminPeriodFilter('week')}
                className={`px-3 py-1 rounded text-sm font-semibold transition ${
                  adminPeriodFilter === 'week'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setAdminPeriodFilter('month')}
                className={`px-3 py-1 rounded text-sm font-semibold transition ${
                  adminPeriodFilter === 'month'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Mês
              </button>
              <button
                onClick={() => setAdminPeriodFilter('year')}
                className={`px-3 py-1 rounded text-sm font-semibold transition ${
                  adminPeriodFilter === 'year'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Ano
              </button>
              <div className="ml-auto text-white font-semibold">
                Total: <span className="text-blue-400">{filteredUsers.length}</span> usuários
              </div>
            </div>
            
            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">ID</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Nome</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">E-mail</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Data de Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-gray-400">
                        Nenhum usuário neste período
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user: any, index: number) => (
                      <tr key={index} className="border-b border-gray-800 hover:bg-gray-800 transition">
                        <td className="py-3 px-4 text-gray-300">{user.id}</td>
                        <td className="py-3 px-4 text-white font-medium">{user.name || 'N/A'}</td>
                        <td className="py-3 px-4 text-gray-400">{user.email || 'N/A'}</td>
                        <td className="py-3 px-4 text-gray-400">
                          {new Date(user.createdAt).toLocaleDateString('pt-BR')} às {new Date(user.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Coming Soon Features */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-white text-xl font-bold mb-4">Recursos em Breve</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800 rounded-lg opacity-50">
              <p className="text-gray-300 font-semibold">📊 Estatísticas Detalhadas</p>
              <p className="text-gray-500 text-sm">Análise completa de suas votações</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-lg opacity-50">
              <p className="text-gray-300 font-semibold">🎵 Playlist Personalizada</p>
              <p className="text-gray-500 text-sm">Crie suas próprias playlists</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-lg opacity-50">
              <p className="text-gray-300 font-semibold">👥 Comunidade</p>
              <p className="text-gray-500 text-sm">Conecte-se com outros ouvintes</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-lg opacity-50">
              <p className="text-gray-300 font-semibold">🎁 Recompensas</p>
              <p className="text-gray-500 text-sm">Ganhe pontos ao votar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
