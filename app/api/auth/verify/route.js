import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { SignJWT } from 'jose';
export const dynamic = 'force-dynamic';
const JWT_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || 'fallback_secret_must_change_in_prod');

export async function GET(request) {
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'CRITICAL: SESSION_SECRET is not set in Vercel Environment Variables. Authentication is disabled.' },
      { status: 500 }
    );
  }
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/zhonk?error=MissingToken', request.url));
  }

  try {
    const result = await executeQuery(
      `SELECT id, email, expires_at, used FROM auth_tokens WHERE token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return NextResponse.redirect(new URL('/zhonk?error=InvalidToken', request.url));
    }

    const { id, email, expires_at, used } = result.rows[0];

    if (used) {
      return NextResponse.redirect(new URL('/zhonk?error=TokenAlreadyUsed', request.url));
    }

    if (new Date(expires_at) < new Date()) {
      return NextResponse.redirect(new URL('/zhonk?error=TokenExpired', request.url));
    }

    // Mark token as used
    await executeQuery(`UPDATE auth_tokens SET used = TRUE WHERE id = $1`, [id]);

    // Create session JWT
    const jwt = await new SignJWT({ email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h') // 24 hours session
      .sign(JWT_SECRET);

    // Set cookie and redirect to dashboard
    const response = NextResponse.redirect(new URL('/analytics', request.url));
    response.cookies.set('admin_session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.redirect(new URL('/zhonk?error=InternalError', request.url));
  }
}
