import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { useEffect, useState } from 'react';
import { Heart, LogOut, Home, Music, TrendingUp } from 'lucide-react';

export default function UserDashboard() {
  const [, navigate] = useLocation();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const meQuery = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation();

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
              <Heart className="text-red-500" size={24} />
              <div>
                <p className="text-gray-400 text-sm">Músicas Curtidas</p>
                <p className="text-white text-2xl font-bold">0</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Music className="text-yellow-500" size={24} />
              <div>
                <p className="text-gray-400 text-sm">Total de Votos</p>
                <p className="text-white text-2xl font-bold">0</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-green-500" size={24} />
              <div>
                <p className="text-gray-400 text-sm">Engajamento</p>
                <p className="text-white text-2xl font-bold">0%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Voted Songs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h3 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
            <Heart className="text-red-500" size={24} />
            Minhas Músicas Curtidas
          </h3>
          <p className="text-gray-400">Você ainda não curtiu nenhuma música. Volte para a página inicial e comece a votar!</p>
        </div>

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
