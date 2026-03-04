import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { LogOut, BarChart3, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UserProfile() {
  const [, navigate] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  if (!isAuthenticated || !user) {
    return null;
  }

  // Gerar iniciais do nome para avatar
  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  // Gerar cor consistente baseada no nome
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-cyan-500',
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsDropdownOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleNavigateToDashboard = () => {
    window.open('/user/dashboard', '_blank');
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-800 transition"
        title={user.name || 'Usuário'}
      >
        {/* Avatar Circle */}
        <div
          className={`w-8 h-8 rounded-full ${getAvatarColor(
            user.name || 'User'
          )} flex items-center justify-center text-white text-xs font-bold border border-gray-600`}
        >
          {initials}
        </div>

        {/* User Name (visible on desktop) */}
        <span className="hidden sm:inline text-white text-sm font-medium truncate max-w-[150px]">
          {user.name?.split(' ')[0]}
        </span>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isDropdownOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-white font-semibold text-sm">{user.name}</p>
            <p className="text-gray-400 text-xs truncate">{user.email}</p>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Dashboard Button */}
            <button
              onClick={handleNavigateToDashboard}
              className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-white transition flex items-center gap-2 text-sm"
            >
              <BarChart3 size={16} />
              Meu Dashboard
            </button>

            {/* Profile Button */}
            <button
              onClick={() => {
                window.open('/user/profile', '_blank');
                setIsDropdownOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-white transition flex items-center gap-2 text-sm"
            >
              <User size={16} />
              Meu Perfil
            </button>
          </div>

          {/* Logout Button */}
          <div className="border-t border-gray-700 py-2">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-900/20 hover:text-red-300 transition flex items-center gap-2 text-sm font-medium"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
