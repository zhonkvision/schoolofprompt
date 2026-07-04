import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { executeQuery } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { Resend } from 'resend';

const AUTHORIZED_EMAIL = process.env.ADMIN_EMAIL;

export async function POST(request) {
  try {
    const { email } = await request.json();
    
    if (email !== AUTHORIZED_EMAIL) {
      // Simulate network delay to prevent email enumeration timing attacks
      await new Promise(r => setTimeout(r, 1000));
      return new NextResponse(JSON.stringify({ error: 'Unauthorized email' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database configuration missing' }, { status: 500 });
    }

    if (!AUTHORIZED_EMAIL) {
      console.error('CRITICAL: ADMIN_EMAIL is not set in environment variables.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    const id = crypto.randomUUID();

    await executeQuery(
      `INSERT INTO auth_tokens (id, token, email, expires_at) VALUES ($1, $2, $3, $4)`,
      [id, token, email, expiresAt.toISOString()]
    );

    const host = request.headers.get('host');
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const magicLink = `${protocol}://${host}/api/auth/verify?token=${token}`;
    
    // Console log fallback for local dev    // Removed console.log of magic link for security and cleanliness

    // Send email via Resend if API Key is configured
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      const { data, error } = await resend.emails.send({
        from: 'PromptShare Security <onboarding@resend.dev>',
        to: AUTHORIZED_EMAIL,
        subject: 'Your Admin Login Link [PromptShare]',
        html: `
          <div style="font-family: monospace; background: #000; color: #0ff; padding: 20px;">
            <h2>[ SYSTEM AUTHENTICATION ]</h2>
            <p>A login request was initiated for the Analytics Dashboard.</p>
            <p>Click the secure link below to verify your identity and establish uplink:</p>
            <br/>
            <a href="${magicLink}" style="background: #0ff; color: #000; padding: 10px 20px; text-decoration: none; font-weight: bold;">INITIATE UPLINK</a>
            <br/><br/>
            <p style="color: #666; font-size: 12px;">Link expires in 15 minutes. If you did not request this, ignore this transmission.</p>
          </div>
        `
      });
      
      if (error) {
        console.error('Resend API Error:', error);
        return new NextResponse(JSON.stringify({ error: 'Email delivery failed. Check server logs.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
            // Email sent successfully
    } else {
      console.warn('RESEND_API_KEY not set in environment. Skipping email delivery.');
    }

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Login error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
