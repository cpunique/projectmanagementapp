// API route for generating AI prompts using Claude
// Version: 2 - Using direct fetch instead of SDK
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { aiPromptRatelimit } from '@/lib/ratelimit';
import { canAccessProFeaturesById, isProUserId } from '@/lib/features/featureGate';

// Instruction type definitions
type InstructionType = 'development' | 'general' | 'event-planning' | 'documentation' | 'research';

// System prompt for structured JSON task output (board-level AI task generation)
const STRUCTURED_SYSTEM_PROMPT = `You are a task planning assistant. Break down the given goal into actionable kanban cards.

Respond ONLY with valid JSON — no markdown, no code fences, no text outside the JSON object.

Return exactly this shape:
{
  "overview": "2-3 sentence plain-text summary of the plan",
  "tasks": [
    { "title": "Action-oriented task title", "priority": "high", "description": "1-2 sentence plain-text description" }
  ]
}

Guidelines:
- Generate 4-10 tasks (scale with complexity of the goal)
- Titles must be imperative: "Set up Firebase Auth" not "Firebase Auth Setup"
- priority values: "high" = blocking or must-do-first, "medium" = important, "low" = nice-to-have
- description is plain text only, no markdown formatting`;

// Sparse input fallback: if minimal context is provided, include clarifying questions
const SPARSE_INPUT_INSTRUCTION = `

SPARSE INPUT HANDLING:
If the input contains only a title with no description, notes, checklist, or context, first output a brief directive prompt, then append a "CLARIFYING QUESTIONS" section with 3-5 specific questions the user should answer to make the prompt stronger. Label this section clearly so the user knows they can remove it after answering.`;

// Formatting instruction for Word 365 style output (plain text, no markdown)
const FORMATTING_INSTRUCTION = `

CRITICAL FORMATTING RULES - THIS IS PLAIN TEXT OUTPUT, NOT MARKDOWN:
• NEVER use # or ## for headings - just write the heading text on its own line
• NEVER wrap words in ** or * for emphasis - just write the words normally
• NEVER use \`backticks\` for code or technical terms
• Use bullet points (•) or dashes (-) for lists
• Use numbered lists (1. 2. 3.) for sequential steps
• Add blank lines between sections
• Write section titles in ALL CAPS or on their own line, followed by a blank line

EXAMPLE OF CORRECT FORMAT:
PHASE 1: PREPARATION

1. First step to complete
2. Second step to complete

Key Considerations
• Important point one
• Important point two

EXAMPLE OF WRONG FORMAT (DO NOT DO THIS):
## **Phase 1: Preparation**
**First step** to complete`;

// Type-specific system prompts
const SYSTEM_PROMPTS: Record<InstructionType, string> = {
  development:
    'You are a prompt engineer specializing in AI task directives for software development. Your job is to take the card details and produce a concise, imperative prompt that a developer can paste directly into an AI coding assistant (Claude, ChatGPT, Copilot, etc.) to get the actual deliverable. Output a directive — not a tutorial or how-to guide. Lead with what to build. Specify required components, constraints, and expected output. Write as if commanding a highly capable AI: "Build X. It must include Y. Output Z."' + FORMATTING_INSTRUCTION + SPARSE_INPUT_INSTRUCTION,

  general:
    'You are a prompt engineer. Take the task details and produce a concise, directive prompt for an AI assistant. The output must tell the AI what to produce directly — not explain how to do it step by step. Lead with the deliverable. Specify required elements, constraints, and expected output format.' + FORMATTING_INSTRUCTION + SPARSE_INPUT_INSTRUCTION,

  'event-planning':
    'You are a prompt engineer specializing in planning tasks. Take the event details and produce a directive prompt for an AI assistant. Specify exactly what to produce (a timeline, a run-of-show, a checklist, etc.), its required contents, format, and any constraints — not a general guide on how to plan an event.' + FORMATTING_INSTRUCTION + SPARSE_INPUT_INSTRUCTION,

  documentation:
    'You are a prompt engineer. Take the documentation task and produce a directive prompt for an AI writing assistant. Specify what document to write, what sections to include, the intended audience, and the tone — not meta-instructions about how to write documentation.' + FORMATTING_INSTRUCTION + SPARSE_INPUT_INSTRUCTION,

  research:
    'You are a prompt engineer. Take the research task and produce a directive prompt for an AI research assistant. Specify what to research, what questions to answer, what format to present findings in, and any scope constraints — not a guide on how to conduct research.' + FORMATTING_INSTRUCTION + SPARSE_INPUT_INSTRUCTION,
};

// Input validation schema
const GeneratePromptSchema = z.object({
  cardTitle: z.string().min(1, 'Card title is required').max(200, 'Card title too long'),
  instructionType: z.enum(['development', 'general', 'event-planning', 'documentation', 'research']).optional().default('development'),
  description: z.string().max(1000, 'Description too long').optional(),
  notes: z.string().max(2000, 'Notes too long').optional(),
  checklist: z.array(z.object({
    text: z.string().max(200, 'Checklist item too long'),
    completed: z.boolean()
  })).max(50, 'Too many checklist items').optional(),
  tags: z.array(z.string().max(50, 'Tag too long')).max(20, 'Too many tags').optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  structured: z.boolean().optional().default(false),
  boardName: z.string().max(200, 'Board name too long').optional(),
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

    // Verify token signature and expiry using Firebase Admin SDK
    let userId: string;
    try {
      const { getAdminAuth } = await import('@/lib/firebase/admin');
      const decoded = await getAdminAuth().verifyIdToken(idToken);
      userId = decoded.uid;
    } catch (tokenError: any) {
      console.error('[AI Prompt] Token verification failed:', tokenError?.code, tokenError?.message);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // 2. Check Pro feature access
    if (!canAccessProFeaturesById(userId)) {
      return NextResponse.json(
        { error: 'AI Instructions is a Pro feature. Upgrade to Pro to unlock unlimited AI-generated instructions.' },
        { status: 403 }
      );
    }

    // 3. Rate limiting (skip for Pro users)
    const isProUser = isProUserId(userId);
    let remaining = -1; // -1 indicates unlimited for Pro users

    if (!isProUser) {
      const rateResult = await aiPromptRatelimit.limit(userId);
      remaining = rateResult.remaining;

      if (!rateResult.success) {
        return NextResponse.json(
          {
            error: `Rate limit exceeded. You can generate ${rateResult.limit} prompts per hour. Try again in ${Math.ceil((rateResult.reset - Date.now()) / 60000)} minutes.`,
            limit: rateResult.limit,
            remaining: 0,
            reset: new Date(rateResult.reset).toISOString()
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateResult.limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': rateResult.reset.toString()
            }
          }
        );
      }
    }

    // 4. Validate and sanitize input
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

    // 5. Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[AI Prompt] Missing ANTHROPIC_API_KEY');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // 6a. Structured mode — generate JSON task list for board-level card creation
    if (data.structured) {
      const model = process.env.NEXT_PUBLIC_CLAUDE_MODEL || 'claude-sonnet-4-20250514';
      let structuredUserMsg = `Goal: ${data.cardTitle}\n`;
      if (data.boardName) structuredUserMsg += `Board: ${data.boardName}\n`;
      if (data.description) structuredUserMsg += `Context: ${data.description}\n`;

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
            max_tokens: 2048,
            messages: [{ role: 'user', content: `${STRUCTURED_SYSTEM_PROMPT}\n\n${structuredUserMsg}` }],
          }),
        });

        const message = await response.json();
        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${message.error?.message || 'Unknown error'}`);
        }

        const rawText = message.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n');

        // Strip potential markdown code fences Claude may wrap around JSON
        const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

        let parsed: { overview: string; tasks: { title: string; priority: string; description: string }[] };
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          console.error('[AI Prompt] Failed to parse structured JSON:', cleaned.slice(0, 200));
          return NextResponse.json(
            { error: 'Failed to parse task list. Please try again.' },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { overview: parsed.overview, tasks: parsed.tasks, remaining },
          { headers: { 'X-RateLimit-Remaining': remaining.toString() } }
        );
      } catch (apiError: any) {
        console.error('[AI Prompt] Structured API call failed:', {
          name: apiError?.name,
          message: apiError?.message,
        });
        throw apiError;
      }
    }

    // 6b. Plain-text mode — existing flow unchanged
    const instructionType = data.instructionType as InstructionType;
    const systemPrompt = SYSTEM_PROMPTS[instructionType];

    // Use appropriate header based on instruction type
    const contextHeaders: Record<InstructionType, string> = {
      development: 'Task to build',
      general: 'Task to complete',
      'event-planning': 'Event to plan',
      documentation: 'Document to write',
      research: 'Topic to research',
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

    // 7. Call Claude API using direct fetch
    const model = process.env.NEXT_PUBLIC_CLAUDE_MODEL || 'claude-sonnet-4-20250514';

    // Instruction request based on type
    const instructionRequests: Record<InstructionType, string> = {
      development: 'Generate a directive AI prompt for this feature. Output the prompt only — no preamble, no explanation.',
      general: 'Generate a directive AI prompt for this task. Output the prompt only — no preamble, no explanation.',
      'event-planning': 'Generate a directive AI prompt for this event. Output the prompt only — no preamble, no explanation.',
      documentation: 'Generate a directive AI prompt for this documentation task. Output the prompt only — no preamble, no explanation.',
      research: 'Generate a directive AI prompt for this research task. Output the prompt only — no preamble, no explanation.',
    };

    // Token limits based on instruction type - event planning needs more for detailed itineraries
    const maxTokensByType: Record<InstructionType, number> = {
      development: 2048,
      general: 2048,
      'event-planning': 4096, // Itineraries need more detail
      documentation: 3072,   // Documentation can be lengthy
      research: 3072,         // Research plans benefit from thoroughness
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

      // 8. Extract the response
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
      },
      { status: 500 }
    );
  }
}
