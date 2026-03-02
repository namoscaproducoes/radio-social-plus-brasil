import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function Register() {
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const registerMutation = trpc.auth.register.useMutation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não conferem');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Email inválido');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await registerMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      setSuccess('Registro realizado com sucesso! Redirecionando para login...');
      setTimeout(() => {
        navigate('/auth/login');
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao registrar. Tente novamente.';
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
          <p className="text-gray-400">Crie sua conta para acompanhar suas votações</p>
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

        {/* Register Form */}
        <form onSubmit={handleRegister} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome Completo
            </label>
            <Input
              type="text"
              name="name"
              placeholder="Seu nome"
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-gray-800 border-gray-700 text-white placeholder-gray-500"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <Input
              type="email"
              name="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={handleChange}
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
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-gray-800 border-gray-700 text-white placeholder-gray-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirmar Senha
            </label>
            <Input
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full bg-gray-800 border-gray-700 text-white placeholder-gray-500"
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition"
            disabled={isLoading}
          >
            {isLoading ? 'Registrando...' : 'REGISTRAR'}
          </Button>
        </form>

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-gray-400">
            Já tem conta?{' '}
            <button
              onClick={() => navigate('/auth/login')}
              className="text-red-500 hover:text-red-400 font-medium transition"
            >
              Faça login aqui
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
