import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const forgotPasswordMutation = trpc.auth.forgotPassword.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const frontendUrl = window.location.origin;
      const result = await forgotPasswordMutation.mutateAsync({ email, frontendUrl });
      setMessage(result.message);
      setSubmitted(true);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email de recuperação');
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
          <h1 className="text-white text-3xl font-bold mb-2">Recuperar Senha</h1>
          <p className="text-gray-400">Insira seu email para receber um link de recuperação</p>
        </div>

        {/* Form Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 mb-6">
          {submitted ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="text-green-500" size={32} />
              </div>
              <h2 className="text-white text-xl font-bold mb-2">Email Enviado!</h2>
              <p className="text-gray-400 mb-6">
                Se o email existir em nossa base de dados, você receberá um link para redefinir sua senha. Verifique sua caixa de entrada e pasta de spam.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                O link expira em 1 hora por segurança.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 rounded-lg transition disabled:opacity-50"
              >
                {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </Button>
            </form>
          )}
        </div>

        {/* Navigation Links */}
        <div className="space-y-3 text-center">
          <Button
            onClick={() => navigate('/auth/login')}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white flex gap-2 justify-center"
          >
            <ArrowLeft size={18} />
            Voltar para Login
          </Button>
          <Button
            onClick={() => navigate('/')}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white"
          >
            ← Voltar para a página inicial
          </Button>
        </div>
      </div>
    </div>
  );
}
