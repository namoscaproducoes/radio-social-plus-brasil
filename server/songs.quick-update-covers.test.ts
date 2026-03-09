import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

describe('Songs - Quick Update Album Covers', () => {
  it('should update missing album covers (limit 20)', async () => {
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
    const result = await caller.songs.updateMissingAlbumCovers({ limit: 20 });
    
    expect(result.success).toBe(true);
    console.log(`✓ ${result.updated} de ${result.total} músicas atualizadas`);
  }, 45000);
});
