import { cookies } from 'next/headers';
import { db } from './db';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'resident';
  created_at: string;
}

// Password Hashing with scryptSync
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':');
    const targetHash = scryptSync(password, salt, 64).toString('hex');
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(targetHash, 'hex'));
  } catch (error) {
    return false;
  }
}

// Session Management
export function createSession(userId: number): string {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, userId, expiresAt);

  return token;
}

export function validateSession(token: string): User | null {
  const session = db.prepare("SELECT token, user_id, expires_at FROM sessions WHERE token = ?")
    .get(token) as { token: string; user_id: number; expires_at: string } | undefined;

  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }

  const user = db.prepare("SELECT id, email, name, role, created_at FROM users WHERE id = ?")
    .get(session.user_id) as User | undefined;

  return user || null;
}

export function deleteSession(token: string) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

// Next.js Route Authentication helper
export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return null;
    return validateSession(token);
  } catch (error) {
    return null;
  }
}
