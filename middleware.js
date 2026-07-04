import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || 'fallback_secret_must_change_in_prod');
const AUTHORIZED_EMAIL = process.env.ADMIN_EMAIL;

export async function middleware(request) {
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    return new NextResponse(
      JSON.stringify({ error: 'CRITICAL: SESSION_SECRET is not set in Vercel Environment Variables. Authentication is disabled.' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }

  const { pathname } = request.nextUrl;

  // Only protect /analytics routes
  if (pathname.startsWith('/analytics')) {
    const token = request.cookies.get('admin_session')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/zhonk?error=MiddlewareNoToken', request.url));
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      if (payload.email !== AUTHORIZED_EMAIL) {
        return NextResponse.redirect(new URL('/zhonk?error=MiddlewareUnauthorized', request.url));
      }

      return NextResponse.next();
    } catch (err) {
      return NextResponse.redirect(new URL('/zhonk?error=MiddlewareJWTFailed', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/analytics/:path*'],
};
