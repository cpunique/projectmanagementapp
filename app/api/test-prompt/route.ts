import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('[Test Prompt] Starting test');

    const model = process.env.NEXT_PUBLIC_CLAUDE_MODEL || 'claude-sonnet-4-20250514';
    const apiKey = process.env.ANTHROPIC_API_KEY;

    console.log('[Test Prompt] Model:', model);
    console.log('[Test Prompt] API Key exists:', !!apiKey);

    if (!apiKey) {
      return NextResponse.json({ error: 'No API key' }, { status: 500 });
    }

    const testMessage = 'Say hello briefly';

    console.log('[Test Prompt] Calling Anthropic API...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: testMessage,
          },
        ],
      }),
    });

    console.log('[Test Prompt] Response status:', response.status);

    const message = await response.json();

    console.log('[Test Prompt] Parsed response');

    if (!response.ok) {
      console.error('[Test Prompt] API error:', message);
      return NextResponse.json(
        { error: 'API error', details: message },
        { status: response.status }
      );
    }

    console.log('[Test Prompt] Success!');

    return NextResponse.json({
      success: true,
      model,
      response: message.content[0].text,
    });
  } catch (error: any) {
    console.error('[Test Prompt] Exception:', error);
    return NextResponse.json(
      {
        error: 'Exception occurred',
        message: error?.message,
        stack: error?.stack,
      },
      { status: 500 }
    );
  }
}
