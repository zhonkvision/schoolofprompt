import { NextResponse } from 'next/server';
import { customAlphabet } from 'nanoid';
import { db } from '@/lib/kv';
import { executeQuery } from '@/lib/db';
import crypto from 'crypto';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const generateId = customAlphabet(alphabet, 7);

// Security headers injector
function withSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  return response;
}

export async function POST(request) {
  try {
    // 1. Cross-Origin (CORS/CSRF) Protection
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return withSecurityHeaders(new NextResponse(
            JSON.stringify({ error: 'Cross-origin paste creation forbidden' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          ));
        }
      } catch (e) {
        return withSecurityHeaders(new NextResponse(
          JSON.stringify({ error: 'Invalid Origin header' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        ));
      }
    }

    // 2. Rate Limiting (10 pastes per minute per IP)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1';
    const rateKey = `ratelimit:${ip}`;
    const currentCountStr = await db.get(rateKey);
    const count = currentCountStr ? parseInt(currentCountStr, 10) : 0;
    
    if (count >= 10) {
      return withSecurityHeaders(new NextResponse(
        JSON.stringify({ error: 'Rate limit exceeded. Max 10 pastes per minute.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
      ));
    }
    // Increment rate limit count and set/refresh TTL to 60 seconds
    await db.set(rateKey, (count + 1).toString(), { ex: 60 });

    const bodyText = await request.text();
    
    // 3. Payload size validation (max 2MB limit)
    if (bodyText.length > 2 * 1024 * 1024) {
      return withSecurityHeaders(new NextResponse(
        JSON.stringify({ error: 'Payload size exceeds 2MB limit' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch (e) {
      return withSecurityHeaders(new NextResponse(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { content, language } = payload;

    if (!content || typeof content !== 'string') {
      return withSecurityHeaders(new NextResponse(
        JSON.stringify({ error: 'Content is required and must be a string' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const id = generateId();
    const promptKey = `prompt:${id}`;
    const langKey = `prompt:${id}:lang`;

    // Pastes are stored with infinite lifetime persistence
    await db.set(promptKey, content);
    if (language) {
      await db.set(langKey, language);
    }

    // Analytics: Log the creation event
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const os = userAgent.toLowerCase().includes('win') ? 'windows' :
               userAgent.toLowerCase().includes('mac') ? 'macos' :
               userAgent.toLowerCase().includes('linux') ? 'linux' :
               userAgent.toLowerCase().includes('android') ? 'android' :
               (userAgent.toLowerCase().includes('ios') || userAgent.toLowerCase().includes('iphone')) ? 'ios' : 'unknown';
    
    const deviceType = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent.toLowerCase()) ? 'tablet' :
                       /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent) ? 'mobile' : 'desktop';

    await executeQuery(
      `INSERT INTO analytics_events (id, paste_id, session_id, ip_hash, user_agent, referrer, device_type, country, event_type, os)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        crypto.randomUUID(),
        id,
        'backend-creation',
        crypto.createHash('sha256').update(ip + (process.env.SESSION_SECRET || 'secret')).digest('hex'),
        userAgent,
        request.headers.get('referer') || 'direct',
        deviceType,
        request.headers.get('x-vercel-ip-country') || 'Unknown',
        'create',
        os
      ]
    );

    return withSecurityHeaders(NextResponse.json({ id }));
  } catch (error) {
    console.error('Error in POST /api/paste:', error);
    return withSecurityHeaders(new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || id.length !== 7) {
      return withSecurityHeaders(new NextResponse(
        JSON.stringify({ error: 'Invalid or missing ID parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const promptKey = `prompt:${id}`;
    const langKey = `prompt:${id}:lang`;

    const content = await db.get(promptKey);

    if (!content) {
      return withSecurityHeaders(new NextResponse(
        JSON.stringify({ error: 'Paste not found or expired' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const isRaw = searchParams.get('raw') === 'true' || request.headers.get('accept') === 'text/plain';

    if (isRaw) {
      const response = new Response(content, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, must-revalidate',
        },
      });
      return withSecurityHeaders(response);
    }

    const language = (await db.get(langKey)) || 'plaintext';

    const response = new NextResponse(
      JSON.stringify({ content, language }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400, must-revalidate',
        },
      }
    );
    return withSecurityHeaders(response);
  } catch (error) {
    console.error('Error in GET /api/paste:', error);
    return withSecurityHeaders(new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}
