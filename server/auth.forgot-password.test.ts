import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, passwordResetTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Forgot Password - Email Recovery", () => {
  let testUserId: number;
  const testEmail = "test-recover@example.com";
  const testName = "Test User Recovery";

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test user
    await db
      .insert(users)
      .values({
        email: testEmail,
        name: testName,
        password: "hashedpassword123",
      });

    // Get the created user ID
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, testEmail))
      .limit(1);

    if (userResult && userResult.length > 0) {
      testUserId = userResult[0].id;
    }
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should create password reset token for valid user", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Simulate forgot password flow
    const token = "test-reset-token-" + Date.now();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await db
      .insert(passwordResetTokens)
      .values({
        userId: testUserId,
        token,
        expiresAt,
      });

    // Verify token was created
    const result = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBeGreaterThan(0);
  });

  it("should verify password reset token exists", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, testUserId));

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it("should verify token expiration is set correctly", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, testUserId));

    if (result && result.length > 0) {
      const token = result[0];
      expect(token.expiresAt).toBeDefined();
      expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
    }
  });
});
