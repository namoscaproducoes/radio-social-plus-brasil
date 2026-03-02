import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { useEffect, useState } from 'react';
import { Lock, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const verifyTokenQuery = trpc.auth.verifyResetToken.useQuery(
    { token },
    { enabled: !!token }
  );

  const resetPasswordMutation = trpc.auth.resetPassword.useMutation();

  useEffect(() => {
    // Extrair token da URL
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, []);

  useEffect(() => {
    if (verifyTokenQuery.data) {
      setTokenValid(verifyTokenQuery.data.valid);
    }
  }, [verifyTokenQuery.data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPasswordMutation.mutateAsync({
        token,
        newPassword,
      });
      setMessage(result.message);
      setResetSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-900 to-gray-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="/logo-radio.png" 
            alt="Rádio Social Plus Brasil" 
            className="w-16 h-16 rounded-lg mx-auto mb-4"
          />
          <h1 className="text-white text-3xl font-bold mb-2">Redefinir Senha</h1>
          <p className="text-gray-400">Crie uma nova senha para sua conta</p>
        </div>

        {/* Form Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 mb-6">
          {!token ? (
            <div className="text-center">
              <AlertCircle className="text-yellow-500 mx-auto mb-4" size={48} />
              <h2 className="text-white text-lg font-bold mb-2">Token não encontrado</h2>
              <p className="text-gray-400 mb-6">
                Não conseguimos encontrar um token de recuperação na URL. Verifique o link que você recebeu por email.
              </p>
            </div>
          ) : tokenValid === false ? (
            <div className="text-center">
              <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
              <h2 className="text-white text-lg font-bold mb-2">Token Inválido ou Expirado</h2>
              <p className="text-gray-400 mb-6">
                O link de recuperação expirou ou é inválido. Por favor, solicite um novo link.
              </p>
            </div>
          ) : resetSuccess ? (
            <div className="text-center">
              <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
              <h2 className="text-white text-lg font-bold mb-2">Senha Redefinida!</h2>
              <p className="text-gray-400 mb-6">
                Sua senha foi redefinida com sucesso. Você pode fazer login com sua nova senha.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">
                  Nova Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-500" size={20} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">Mínimo 6 caracteres</p>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-500" size={20} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {message && (
                <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                  <p className="text-green-400 text-sm">{message}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 rounded-lg transition disabled:opacity-50"
              >
                {isLoading ? 'Redefinindo...' : 'Redefinir Senha'}
              </Button>
            </form>
          )}
        </div>

        {/* Navigation Links */}
        {resetSuccess && (
          <Button
            onClick={() => navigate('/auth/login')}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 rounded-lg transition"
          >
            Ir para Login
          </Button>
        )}

        {!resetSuccess && (
          <Button
            onClick={() => navigate('/')}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white flex gap-2 justify-center"
          >
            <ArrowLeft size={18} />
            Voltar para a página inicial
          </Button>
        )}
      </div>
    </div>
  );
}
