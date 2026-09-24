import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { Permission, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth/session';

export type CurrentUser = {
  id: string;
  name: string;
  phone: string;
  role: Role;
  permissions: Permission[];
};

/**
 * Resolved once per request. The cookie carries the permissions, but they are
 * re-read from the database so that revoking a right takes effect immediately
 * instead of waiting for the session to expire.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;

  const user = await prisma.user.findFirst({
    where: { id: session.uid, isActive: true },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      permissions: { select: { permission: true } },
    },
  });
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    permissions: user.permissions.map((p) => p.permission),
  };
});

export async function requireUser(next = '/'): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export function hasPermission(user: CurrentUser | null, permission: Permission): boolean {
  if (!user) return false;
  if (user.role === Role.ADMIN) return true; // the admin implicitly holds every right
  return user.permissions.includes(permission);
}

/** Guards a staff route. Checked on the server, never only in the UI. */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!hasPermission(user, permission)) redirect('/403');
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== Role.ADMIN) redirect('/403');
  return user;
}

/** True when the user may open the staff area at all. */
export function isStaff(user: CurrentUser | null): boolean {
  return user?.role === Role.ADMIN || user?.role === Role.EMPLOYEE;
}
