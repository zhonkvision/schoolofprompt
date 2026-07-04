import { NextResponse } from 'next/server';
import { initDbSchema } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await initDbSchema();
    return new NextResponse(JSON.stringify({ success: true, message: 'Database initialized successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to init DB:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to initialize database' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
