/**
 * Sistema de autenticação independente (sem Manus)
 * Usa JWT para sessões e bcrypt para senhas
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { users } from '../drizzle/schema';
import { getDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '365d'; // 1 ano

export interface JWTPayload {
  userId: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

/**
 * Gerar JWT token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verificar JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Hash de senha
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Comparar senha
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Registrar novo usuário
 */
export async function registerUser(email: string, password: string, name: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Verificar se usuário já existe
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser && existingUser.length > 0) {
    throw new Error('Email já cadastrado');
  }

  // Hash da senha
  const passwordHash = await hashPassword(password);

  // Criar usuário
  const result = await db.insert(users).values({
    email,
    name,
    passwordHash,
    loginMethod: 'email',
    role: 'user',
  });

  // Buscar usuário criado
  const newUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!newUser || newUser.length === 0) {
    throw new Error('Erro ao criar usuário');
  }

  const user = newUser[0];

  // Gerar token
  const token = generateToken({
    userId: user.id,
    email: user.email || '',
    name: user.name || '',
    role: (user.role as 'user' | 'admin') || 'user',
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user.role as 'user' | 'admin') || 'user',
    },
    token,
  };
}

/**
 * Login de usuário
 */
export async function loginUser(email: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Buscar usuário
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!userResult || userResult.length === 0) {
    throw new Error('Email ou senha incorretos');
  }

  const user = userResult[0];

  // Verificar senha
  if (!user.passwordHash) {
    throw new Error('Usuário não configurado para login por email');
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Email ou senha incorretos');
  }

  // Atualizar lastSignedIn
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));

  // Gerar token
  const token = generateToken({
    userId: user.id,
    email: user.email || '',
    name: user.name || '',
    role: (user.role as 'user' | 'admin') || 'user',
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user.role as 'user' | 'admin') || 'user',
    },
    token,
  };
}

/**
 * Obter usuário pelo token
 */
export async function getUserByToken(token: string) {
  const payload = verifyToken(token);
  if (!payload) return null;

  const db = await getDb();
  if (!db) return null;

  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!userResult || userResult.length === 0) return null;

  const user = userResult[0];
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: (user.role as 'user' | 'admin') || 'user',
  };
}
