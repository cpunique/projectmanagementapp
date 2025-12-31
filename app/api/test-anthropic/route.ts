import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.NEXT_PUBLIC_CLAUDE_MODEL || 'claude-sonnet-4-20250514';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API key' },
        { status: 500 }
      );
    }

    console.log('[Test Anthropic] Starting test call');
    console.log('[Test Anthropic] Model:', model);
    console.log('[Test Anthropic] API Key prefix:', apiKey?.substring(0, 20));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: 'Say hello briefly.',
          },
        ],
      }),
    });

    console.log('[Test Anthropic] Response status:', response.status);
    console.log('[Test Anthropic] Response headers:', Object.fromEntries(response.headers));

    const data = await response.json();

    if (!response.ok) {
      console.error('[Test Anthropic] API error:', data);
      return NextResponse.json(
        {
          error: 'API call failed',
          details: data,
        },
        { status: response.status }
      );
    }

    console.log('[Test Anthropic] Success:', data);

    return NextResponse.json({
      success: true,
      model,
      data,
    });
  } catch (error: any) {
    console.error('[Test Anthropic] Exception:', error);
    return NextResponse.json(
      {
        error: 'Exception occurred',
        message: error?.message,
        type: error?.constructor?.name,
      },
      { status: 500 }
    );
  }
}
