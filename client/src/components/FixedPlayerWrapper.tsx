import { ReactNode } from 'react';

interface FixedPlayerWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper que torna a seção do player fixa durante navegação
 * Mantém o player sempre visível na tela enquanto o usuário navega
 */
export function FixedPlayerWrapper({ children }: FixedPlayerWrapperProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950 border-t border-gray-800 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4">
        {children}
      </div>
    </div>
  );
}
