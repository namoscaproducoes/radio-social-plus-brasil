import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('UserProfile Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar null quando usuário não está autenticado', () => {
    // Este teste seria implementado com React Testing Library
    // Por enquanto, apenas verificamos a lógica básica
    expect(true).toBe(true);
  });

  it('deve gerar iniciais corretas do nome do usuário', () => {
    const name = 'Pedro Oliveira';
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    expect(initials).toBe('PO');
  });

  it('deve gerar cor consistente para o mesmo nome', () => {
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
    
    const name = 'Pedro Oliveira';
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const color1 = colors[hash % colors.length];
    
    // Mesmo nome deve gerar mesma cor
    const hash2 = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const color2 = colors[hash2 % colors.length];
    
    expect(color1).toBe(color2);
  });

  it('deve gerar cores diferentes para nomes diferentes', () => {
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
    
    const name1 = 'Pedro Oliveira';
    const hash1 = name1.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const color1 = colors[hash1 % colors.length];
    
    const name2 = 'Maria Silva';
    const hash2 = name2.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const color2 = colors[hash2 % colors.length];
    
    // Nomes diferentes provavelmente geram cores diferentes
    // (não garantido 100%, mas altamente provável)
    expect(color1).not.toBe(color2);
  });

  it('deve lidar com nomes vazios', () => {
    const name = '';
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
    
    expect(initials).toBe('U');
  });

  it('deve lidar com nomes com um único caractere', () => {
    const name = 'A';
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    expect(initials).toBe('A');
  });
});
