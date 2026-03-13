import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await loginMutation.mutateAsync({ email, password });
      // Invalidar cache e refazer query para refletir novo usuário logado
      await utils.auth.me.invalidate();
      // Aguardar a query ser refazer para garantir que o estado está atualizado
      await utils.auth.me.refetch();
      await utils.votes.getUserVotes.invalidate();
      await utils.votes.getVoteStats.invalidate();
      setSuccess('Login realizado com sucesso! Redirecionando...');
      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-900 to-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="/logo-radio.png" 
            alt="Rádio Social Plus Brasil" 
            className="w-16 h-16 mx-auto mb-4 rounded-lg"
          />
          <h1 className="text-3xl font-bold text-white mb-2">Rádio Social Plus Brasil</h1>
          <p className="text-gray-400">Faça login para acessar sua área personalizada</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-4 p-4 bg-green-900/20 border border-green-500/50 rounded-lg flex gap-3">
            <CheckCircle className="text-green-500 flex-shrink-0" size={20} />
            <p className="text-green-200 text-sm">{success}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              className="w-full bg-gray-800 border-gray-700 text-white placeholder-gray-500"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Senha
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="w-full bg-gray-800 border-gray-700 text-white placeholder-gray-500"
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition"
            disabled={isLoading}
          >
            {isLoading ? 'Entrando...' : 'ENTRAR'}
          </Button>
        </form>

        {/* Forgot Password Link */}
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/auth/forgot-password')}
            className="text-yellow-500 hover:text-yellow-400 text-sm font-medium transition"
          >
            Esqueci minha senha
          </button>
        </div>

        {/* Register Link */}
        <div className="text-center mt-6">
          <p className="text-gray-400">
            Não tem conta?{' '}
            <button
              onClick={() => navigate('/auth/register')}
              className="text-blue-500 hover:text-blue-400 font-medium transition"
            >
              Registre-se aqui
            </button>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-300 text-sm transition"
          >
            ← Voltar para a página inicial
          </button>
        </div>
      </div>
    </div>
  );
}
