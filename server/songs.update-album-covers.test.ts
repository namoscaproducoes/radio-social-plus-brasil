import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';

describe('Songs - Update Album Covers', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  it('should update missing album covers for admin user', async () => {
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

    // Chamar a procedure updateMissingAlbumCovers
    const caller = appRouter.createCaller(adminCtx as any);
    
    try {
      const result = await caller.songs.updateMissingAlbumCovers({ limit: 5 });
      
      console.log('Update result:', result);
      expect(result.success).toBe(true);
      expect(result.updated).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeGreaterThanOrEqual(0);
      
      // Verificar se algumas músicas foram atualizadas
      if (result.updated > 0) {
        console.log(`✓ ${result.updated} músicas foram atualizadas com capas`);
      } else {
        console.log('ℹ Nenhuma música precisava de atualização de capa');
      }
    } catch (error) {
      console.error('Erro ao atualizar capas:', error);
      throw error;
    }
  });

  it('should deny access for non-admin users', async () => {
    // Criar um contexto mock de usuário normal
    const userCtx = {
      user: {
        id: 2,
        email: 'user@test.com',
        role: 'user',
      },
      req: {
        ip: '127.0.0.1',
        get: (header: string) => 'test-user-agent',
      },
    };

    const caller = appRouter.createCaller(userCtx as any);
    
    try {
      await caller.songs.updateMissingAlbumCovers({ limit: 5 });
      throw new Error('Should have thrown an error for non-admin user');
    } catch (error: any) {
      expect(error.message).toContain('Acesso negado');
    }
  });
});
