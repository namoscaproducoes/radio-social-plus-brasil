import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { Upload, Save, X } from 'lucide-react';

export function UserProfile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
      });
      setAvatarPreview(user.avatarUrl || null);
    }
  }, [user]);

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
    },
  });

  const uploadAvatarMutation = trpc.user.uploadAvatar.useMutation({
    onSuccess: (data) => {
      toast.success('Foto de perfil atualizada!');
      setAvatarPreview(data.avatarUrl);
    },
    onError: (error) => {
      toast.error(`Erro ao fazer upload: ${error.message}`);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem');
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máximo 5MB)');
      return;
    }

    setIsLoading(true);
    try {
      // Ler arquivo como data URL para preview
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        setAvatarPreview(dataUrl);

        // Atualizar avatar no banco de dados com data URL
        await uploadAvatarMutation.mutateAsync({
          imageUrl: dataUrl,
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Erro ao processar imagem');
      setAvatarPreview(user?.avatarUrl || null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }

    await updateProfileMutation.mutateAsync({
      name: formData.name,
      email: formData.email,
    });
  };

  const handleCancel = () => {
    setLocation('/');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Você precisa estar logado para acessar esta página</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">Meu Perfil</h1>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-white transition"
            >
              <X size={24} />
            </button>
          </div>

          {/* Avatar Section */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-4">
              Foto de Perfil
            </label>
            <div className="flex items-center gap-6">
              {/* Avatar Preview */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-white text-2xl font-bold">
                      {(user.name || '')
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isLoading}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  <Upload size={18} />
                  {isLoading ? 'Enviando...' : 'Escolher Foto'}
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  JPG, PNG ou GIF (máx. 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Nome
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Seu nome completo"
                className="w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="seu.email@exemplo.com"
                className="w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Save size={18} />
                {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button
                type="button"
                onClick={handleCancel}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </form>

          {/* Info Message */}
          <div className="mt-8 p-4 bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg">
            <p className="text-sm text-blue-200">
              💡 Suas alterações serão salvas imediatamente. Você pode atualizar seu perfil a qualquer momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
