import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    version: '7866627',
    timestamp: new Date().toISOString(),
    message: 'This is the latest deployment with response.json() fix',
  });
}
