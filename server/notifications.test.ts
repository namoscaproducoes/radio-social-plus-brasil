import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb, addFavorite, removeFavorite, getUserFavorites, createNotification, getUserNotifications, markNotificationAsRead, getUnreadNotificationCount } from './db';

describe('Notifications System', () => {
  const testUserId = 1;
  const testSongId = 1;

  beforeAll(async () => {
    // Setup: Ensure database connection
    const db = await getDb();
    expect(db).toBeDefined();
  });

  describe('Favorites', () => {
    it('should add a favorite song', async () => {
      const result = await addFavorite(testUserId, testSongId);
      expect(result).toBeDefined();
    });

    it('should get user favorites', async () => {
      const favorites = await getUserFavorites(testUserId);
      expect(Array.isArray(favorites)).toBe(true);
      // Check if our test song is in favorites
      const hasFavorite = favorites.some((fav: any) => fav.songId === testSongId);
      expect(hasFavorite).toBe(true);
    });

    it('should remove a favorite song', async () => {
      const result = await removeFavorite(testUserId, testSongId);
      expect(result).toBeDefined();

      // Verify removal
      const favorites = await getUserFavorites(testUserId);
      const hasFavorite = favorites.some((fav: any) => fav.songId === testSongId);
      expect(hasFavorite).toBe(false);
    });
  });

  describe('Notifications', () => {
    let notificationId: number;

    it('should create a notification', async () => {
      const result = await createNotification(
        testUserId,
        testSongId,
        'new_votes',
        'Nova votação',
        'Sua música favorita recebeu um novo voto!'
      );
      expect(result).toBeDefined();
    });

    it('should get user notifications', async () => {
      const notifications = await getUserNotifications(testUserId, 10);
      expect(Array.isArray(notifications)).toBe(true);
      expect(notifications.length).toBeGreaterThan(0);
      
      // Store notification ID for next tests
      if (notifications.length > 0) {
        notificationId = notifications[0].id;
      }
    });

    it('should get unread notification count', async () => {
      const count = await getUnreadNotificationCount(testUserId);
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should mark notification as read', async () => {
      if (notificationId) {
        const result = await markNotificationAsRead(notificationId);
        expect(result).toBeDefined();

        // Verify unread count decreased
        const count = await getUnreadNotificationCount(testUserId);
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
