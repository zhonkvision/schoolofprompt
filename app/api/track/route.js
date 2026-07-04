import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import crypto from 'crypto';

function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip + process.env.SESSION_SECRET || 'secret').digest('hex');
}

function getDeviceType(userAgent) {
  if (!userAgent) return 'desktop';
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

function getOS(userAgent) {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('linux')) return 'linux';
  if (ua.includes('android')) return 'android';
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'ios';
  return 'unknown';
}

export async function POST(request) {
  try {
    const bodyText = await request.text();
    if (!bodyText) return new NextResponse('Empty payload', { status: 400 });
    
    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch(e) {
      return new NextResponse('Invalid JSON', { status: 400 });
    }

    const { paste_id, session_id, event_type = 'view' } = payload;
    
    if (!paste_id || !session_id) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1';
    
    const ip_hash = hashIp(ip);
    const user_agent = request.headers.get('user-agent') || 'unknown';
    const referrer = request.headers.get('referer') || 'direct'; // Using 'referer' header
    const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
    const device_type = getDeviceType(user_agent);
    const os = getOS(user_agent);
    
    const event_id = crypto.randomUUID();
    
    // Asynchronously insert into database
    // We do not await this heavily to keep tracking endpoint fast, but we must await in serverless so it doesn't get killed
    await executeQuery(
      `INSERT INTO analytics_events (id, paste_id, session_id, ip_hash, user_agent, referrer, device_type, country, event_type, os)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [event_id, paste_id, session_id, ip_hash, user_agent, referrer, device_type, country, event_type, os]
    );

    return new NextResponse(JSON.stringify({ success: true, event_id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[Analytics Ingest Error]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
