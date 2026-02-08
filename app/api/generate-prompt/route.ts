// API route for generating AI prompts using Claude
// Version: 2 - Using direct fetch instead of SDK
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { aiPromptRatelimit } from '@/lib/ratelimit';

// Instruction type definitions
type InstructionType = 'development' | 'general' | 'event-planning' | 'documentation';

// Formatting instruction for Word 365 style output
const FORMATTING_INSTRUCTION = `

FORMAT YOUR RESPONSE FOR EASY READING:
- Use clear section headings (bold text, no markdown symbols like # or ##)
- Use bullet points (•) for lists, not dashes or asterisks
- Use numbered lists (1. 2. 3.) for sequential steps
- Add blank lines between sections for readability
- Keep paragraphs short and scannable
- Do NOT use markdown formatting like **bold**, # headings, or \`code\` - write plain text that looks good in a document`;

// Type-specific system prompts
const SYSTEM_PROMPTS: Record<InstructionType, string> = {
  development:
    'You are a helpful assistant that converts feature requests into clear implementation instructions for developers. Focus on what needs to be built and why, breaking it down into logical, actionable coding steps. Include technical considerations where relevant.' + FORMATTING_INSTRUCTION,

  general:
    'You are a helpful assistant that converts tasks into clear, actionable steps anyone can follow. Keep language simple and non-technical. Focus on practical actions organized in logical order that lead to completing the task.' + FORMATTING_INSTRUCTION,

  'event-planning':
    'You are a helpful assistant that creates event plans and itineraries. Include timelines, logistics, preparation steps, and key deadlines. Organize information chronologically with clear action items. Consider venue, attendees, materials, and contingency planning.' + FORMATTING_INSTRUCTION,

  documentation:
    'You are a helpful assistant that creates clear documentation and guides. Explain concepts thoroughly, provide step-by-step instructions, include context and examples where helpful. Structure information for easy reference and understanding.' + FORMATTING_INSTRUCTION,
};

// Input validation schema
const GeneratePromptSchema = z.object({
  cardTitle: z.string().min(1, 'Card title is required').max(200, 'Card title too long'),
  instructionType: z.enum(['development', 'general', 'event-planning', 'documentation']).optional().default('development'),
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

    // 5. Build context prompt based on instruction type
    const instructionType = data.instructionType as InstructionType;
    const systemPrompt = SYSTEM_PROMPTS[instructionType];

    // Use appropriate header based on instruction type
    const contextHeaders: Record<InstructionType, string> = {
      development: 'Feature Request',
      general: 'Task',
      'event-planning': 'Event',
      documentation: 'Topic',
    };

    let contextPrompt = `${contextHeaders[instructionType]}: ${data.cardTitle}\n\n`;

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
      const checklistHeader = instructionType === 'event-planning' ? 'Event Checklist' : 'Requirements';
      contextPrompt += `${checklistHeader}:\n`;
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

    // 6. Call Claude API using direct fetch
    const model = process.env.NEXT_PUBLIC_CLAUDE_MODEL || 'claude-sonnet-4-20250514';

    // Instruction request based on type
    const instructionRequests: Record<InstructionType, string> = {
      development: 'Please provide implementation instructions for this feature.',
      general: 'Please provide clear, actionable steps to complete this task.',
      'event-planning': 'Please provide an event plan with timeline, logistics, and preparation steps.',
      documentation: 'Please provide clear documentation and a guide for this topic.',
    };

    // Token limits based on instruction type - event planning needs more for detailed itineraries
    const maxTokensByType: Record<InstructionType, number> = {
      development: 2048,
      general: 2048,
      'event-planning': 4096, // Itineraries need more detail
      documentation: 3072,   // Documentation can be lengthy
    };

    const userMessage = `${systemPrompt}

${contextPrompt}

${instructionRequests[instructionType]}`;

    try {

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokensByType[instructionType],
          messages: [
            {
              role: 'user',
              content: userMessage,
            },
          ],
        }),
      });

      const message = await response.json();

      if (!response.ok) {
        console.error('[AI Prompt] API error response:', {
          status: response.status,
          error: message,
        });
        throw new Error(`API returned ${response.status}: ${message.error?.message || 'Unknown error'}`);
      }

      // 7. Extract the response
      const generatedPrompt = message.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      if (!generatedPrompt) {
        console.error('[AI Prompt] No text content in API response');
        return NextResponse.json(
          { error: 'No instructions were generated. Please try again.' },
          { status: 500 }
        );
      }

      // 8. Return formatted response with rate limit info
      return NextResponse.json(
        { prompt: generatedPrompt, remaining },
        {
          headers: {
            'X-RateLimit-Remaining': remaining.toString()
          }
        }
      );
    } catch (apiError: any) {
      console.error('[AI Prompt] API call failed with error:', {
        name: apiError?.name,
        message: apiError?.message,
        status: apiError?.status,
        code: apiError?.code,
      });

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

    // Return error with debug headers
    return NextResponse.json(
      {
        error: 'Failed to generate instructions. Please try again.',
        debugMessage: errorMessage,
        debugType: error?.constructor?.name,
      },
      {
        status: 500,
        headers: {
          'X-Error-Message': errorMessage.substring(0, 100),
          'X-Error-Type': error?.constructor?.name || 'Unknown',
        }
      }
    );
  }
}
