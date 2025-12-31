import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.NEXT_PUBLIC_CLAUDE_MODEL || 'claude-sonnet-4-20250514';

  return NextResponse.json({
    status: 'ok',
    apiKeyConfigured: !!apiKey,
    apiKeyPrefix: apiKey?.substring(0, 20) + '...',
    model,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
