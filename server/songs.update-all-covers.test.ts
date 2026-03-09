import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

describe('Songs - Update All Album Covers', () => {
  it('should update all missing album covers for admin user', async () => {
    // Criar um contexto mock de admin
    const adminCtx = {
      user: {
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
      },
      req: {
        ip: '127.0.0.1',
        get: (header: string) => 'test-user-agent',
      },
    };

    const caller = appRouter.createCaller(adminCtx as any);
    
    try {
      // Executar com limite de 50 para preencher todas as capas
      const result = await caller.songs.updateMissingAlbumCovers({ limit: 50 });
      
      console.log('Update result:', result);
      expect(result.success).toBe(true);
      
      console.log(`✓ ${result.updated} de ${result.total} músicas foram atualizadas com capas`);
    } catch (error) {
      console.error('Erro ao atualizar capas:', error);
      throw error;
    }
  }, 60000); // 60 segundos de timeout
});
