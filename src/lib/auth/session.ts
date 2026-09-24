import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { Permission, Role } from '@prisma/client';

/*
  Sessions are a signed JWT in an httpOnly cookie.

  We deliberately do not use Auth.js here: the two ways in are a phone number
  with a password and the Telegram login widget, neither of which is an OAuth
  flow, so the library would add a beta dependency without carrying any weight.
*/

const COOKIE = 'lb_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = {
  uid: string;
  role: Role;
  perms: Permission[];
};

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error('AUTH_SECRET is not set - see .env.example');
  return new TextEncoder().encode(value);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const { uid, role, perms } = payload as unknown as SessionPayload;
    if (typeof uid !== 'string' || !role) return null;
    return { uid, role, perms: Array.isArray(perms) ? perms : [] };
  } catch {
    // expired or tampered: treat as signed out rather than throwing at render time
    return null;
  }
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
