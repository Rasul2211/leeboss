import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Deployment health check.
 *
 * When the site returns 500 on a hosting platform, the error is in that
 * platform's logs and nowhere else. This endpoint reports what actually went
 * wrong, so a broken deploy can be diagnosed from outside.
 *
 * It reports only whether each secret is present and how long it is - never a
 * value, never a host, never a password.
 */
export const dynamic = 'force-dynamic';

function describe(name: string) {
  const value = process.env[name];
  return { set: Boolean(value), length: value?.length ?? 0 };
}

export async function GET() {
  const env = {
    DATABASE_URL: describe('DATABASE_URL'),
    DIRECT_URL: describe('DIRECT_URL'),
    AUTH_SECRET: describe('AUTH_SECRET'),
    NODE_ENV: process.env.NODE_ENV,
  };

  // a flag the pooled connection needs; its absence is a common cause of
  // prepared-statement errors at runtime
  const pooled = process.env.DATABASE_URL ?? '';
  const hints = {
    usesPooler: pooled.includes('-pooler.'),
    hasPgBouncerFlag: pooled.includes('pgbouncer=true'),
    looksLikePostgres: pooled.startsWith('postgres'),
  };

  try {
    const started = Date.now();
    const categories = await prisma.category.count();
    const products = await prisma.product.count();
    return NextResponse.json({
      ok: true,
      env,
      hints,
      db: { categories, products, ms: Date.now() - started },
    });
  } catch (error) {
    const e = error as { name?: string; message?: string; code?: string };
    return NextResponse.json(
      {
        ok: false,
        env,
        hints,
        error: { name: e.name, code: e.code, message: e.message?.slice(0, 900) },
      },
      { status: 500 },
    );
  }
}
