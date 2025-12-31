// API route for generating AI prompts using Claude
import { Anthropic } from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { aiPromptRatelimit } from '@/lib/ratelimit';

// Input validation schema
const GeneratePromptSchema = z.object({
  cardTitle: z.string().min(1, 'Card title is required').max(200, 'Card title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  notes: z.string().max(2000, 'Notes too long').optional(),
  checklist: z.array(z.object({
    text: z.string().max(200, 'Checklist item too long'),
    completed: z.boolean()
  })).max(50, 'Too many checklist items').optional(),
  tags: z.array(z.string().max(50, 'Tag too long')).max(20, 'Too many tags').optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

export async function POST(request: Request) {
  try {
    // 1. Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to use AI features.' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify token exists and is valid length
    if (!idToken || idToken.length < 20) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Extract user ID from token (simplified - in production use firebase-admin)
    const userId = idToken.substring(0, 28);

    // 2. Rate limiting
    const { success, limit, remaining, reset } = await aiPromptRatelimit.limit(userId);

    if (!success) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. You can generate ${limit} prompts per hour. Try again in ${Math.ceil((reset - Date.now()) / 60000)} minutes.`,
          limit,
          remaining: 0,
          reset: new Date(reset).toISOString()
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString()
          }
        }
      );
    }

    // 3. Validate and sanitize input
    const body = await request.json();

    console.log('[AI Prompt] Request body:', {
      cardTitle: body.cardTitle?.substring(0, 50),
      hasDescription: !!body.description,
      hasNotes: !!body.notes,
      checklistCount: body.checklist?.length || 0,
      tagsCount: body.tags?.length || 0,
      priority: body.priority,
    });

    const validationResult = GeneratePromptSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('[AI Prompt] Validation failed:', validationResult.error.issues);
      return NextResponse.json(
        {
          error: 'Invalid input data',
          details: validationResult.error.issues.map(e => ({
            field: e.path.join('.') || 'root',
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 4. Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[AI Prompt] Missing ANTHROPIC_API_KEY');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // 5. Log request for monitoring
    console.log('[AI Prompt] Request from user:', {
      userId: userId.substring(0, 8) + '...',
      timestamp: new Date().toISOString(),
      cardTitle: data.cardTitle.substring(0, 50),
      remaining
    });

    // 6. Build context prompt
    let contextPrompt = `Feature Request: ${data.cardTitle}\n\n`;

    if (data.description) {
      contextPrompt += `Description: ${data.description}\n\n`;
    }

    if (data.notes) {
      // Strip HTML tags from rich text notes
      const plainNotes = data.notes.replace(/<[^>]*>/g, '').trim();
      if (plainNotes) {
        contextPrompt += `Additional Notes: ${plainNotes}\n\n`;
      }
    }

    if (data.checklist && data.checklist.length > 0) {
      contextPrompt += `Requirements Checklist:\n`;
      data.checklist.forEach(item => {
        const status = item.completed ? '✓' : '○';
        contextPrompt += `${status} ${item.text}\n`;
      });
      contextPrompt += `\n`;
    }

    if (data.tags && data.tags.length > 0) {
      contextPrompt += `Related Tags: ${data.tags.join(', ')}\n\n`;
    }

    if (data.priority) {
      contextPrompt += `Priority Level: ${data.priority}\n\n`;
    }

    // 7. Call Claude API
    const client = new Anthropic({ apiKey });

    // Use environment variable for model name with fallback to Sonnet (cheaper, higher rate limits)
    const model = process.env.NEXT_PUBLIC_CLAUDE_MODEL || 'claude-sonnet-4-20250514';

    const userMessage = `You are a helpful assistant that converts feature requests into clear, simple implementation instructions for developers. Keep the language friendly and straightforward, not overly technical. Focus on what needs to be built and why, breaking it down into logical, actionable steps. Be concise but thorough.

${contextPrompt}

Please provide implementation instructions for this feature.`;

    console.log('[AI Prompt] Calling Anthropic API:', {
      model,
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey?.substring(0, 20),
      messageLength: userMessage.length,
      timestamp: new Date().toISOString()
    });

    try {
      const message = await client.messages.create({
        model,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      });

      console.log('[AI Prompt] API response received:', {
        contentCount: message.content.length,
        stopReason: message.stop_reason,
        tokensUsed: message.usage?.input_tokens || 0,
      });

      // 8. Extract the response
      const generatedPrompt = message.content
        .filter(block => block.type === 'text')
        .map(block => (block as { type: 'text'; text: string }).text)
        .join('\n');

      if (!generatedPrompt) {
        return NextResponse.json(
          { error: 'No prompt was generated. Please try again.' },
          { status: 500 }
        );
      }

      // 9. Return formatted response with rate limit info
      return NextResponse.json(
        { prompt: generatedPrompt, remaining },
        {
          headers: {
            'X-RateLimit-Remaining': remaining.toString()
          }
        }
      );
    } catch (apiError: any) {
      // Handle timeout/abort
      if (apiError?.name === 'AbortError') {
        console.error('[AI Prompt] Request timeout');
        return NextResponse.json(
          { error: 'Request timeout. Please try again.' },
          { status: 504 }
        );
      }
      throw apiError;
    }

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('[AI Prompt] Error Details:', {
      message: errorMessage,
      stack: errorStack,
      type: error?.constructor?.name,
      status: error?.status,
      code: error?.code,
      headers: error?.headers,
      apiKeyExists: !!process.env.ANTHROPIC_API_KEY,
      modelUsed: process.env.NEXT_PUBLIC_CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    // Handle specific Anthropic errors
    if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
      return NextResponse.json(
        { error: 'Invalid Anthropic API key. Please check your configuration.' },
        { status: 401 }
      );
    }

    if (errorMessage.includes('429') || errorMessage.includes('rate')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate prompt. Please try again.' },
      { status: 500 }
    );
  }
}
