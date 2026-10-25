// API route for generating AI prompts using Claude
// Version: 2 - Using direct fetch instead of SDK
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { runStructuredGeneration, type ModelReply } from '@/lib/ai/taskPlan/orchestrate';
import { interpretPlanReply } from '@/lib/ai/taskPlan/pipeline';
import { buildSystemPrompt, buildUserMessage } from '@/lib/ai/taskPlan/prompt';

// How long a claimed-but-not-finalized free generation blocks a second concurrent
// request before it's treated as abandoned (e.g. server crashed mid-request) and
// released. Must outlast a full generation (up to ~2 minutes) and the function's
// 5-minute maximum, or a second click could start a second free generation while
// the first is still running.
const FREE_GEN_CLAIM_STALE_MS = 330_000;

// Single source of truth for the model id, used whenever NEXT_PUBLIC_CLAUDE_MODEL
// isn't set. Keep this as a non-dated alias (e.g. "claude-sonnet-4-6"), not a dated
// snapshot (e.g. "claude-sonnet-4-20250514") — Anthropic retires dated snapshots,
// which surfaces as a 404 here. Aliases get redirected forward instead of 404ing.
const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-6';

// Anthropic returns 404 with error.type "not_found_error" both for bad model ids
// and (separately) bad URLs — checking the type narrows it to "this model id is
// wrong/retired" so the log points straight at the env var instead of needing
// another round of guessing.
function logIfModelNotFound(response: Response, message: any, model: string) {
  if (response.status === 404 && message?.error?.type === 'not_found_error') {
    console.error(
      `[AI Prompt] Anthropic model "${model}" was not found (likely retired). ` +
      `Update NEXT_PUBLIC_CLAUDE_MODEL in .env.local to a current model id.`
    );
  }
}

type FreeGenClaimResult = 'claimed' | 'used' | 'in_progress';

// Atomically checks freeGenerationUsed and claims the freebie before the Anthropic
// call is made, so two concurrent requests can't both proceed to generate. The actual
// Anthropic call happens outside this transaction (external HTTP calls inside a
// Firestore transaction risk duplicate calls on transaction retry under contention).
async function claimFreeGeneration(userId: string): Promise<FreeGenClaimResult> {
  const { adminDb } = await import('@/lib/firebase/admin');
  const userRef = adminDb.collection('users').doc(userId);

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const d = snap.data() ?? {};

    if (d.freeGenerationUsed === true) return 'used';

    const claimedAtMs = d.freeGenerationClaimedAt?.toMillis ? d.freeGenerationClaimedAt.toMillis() : null;
    const claimIsFresh = claimedAtMs !== null && Date.now() - claimedAtMs < FREE_GEN_CLAIM_STALE_MS;
    if (claimIsFresh) return 'in_progress';

    tx.set(userRef, { freeGenerationClaimedAt: Timestamp.now() }, { merge: true });
    return 'claimed';
  });
}

// Marks the free generation as permanently used. Only called after a successful
// generation that returned usable cards — never before the Anthropic call, and never
// for a failed/empty result.
async function finalizeFreeGeneration(userId: string): Promise<void> {
  const { adminDb } = await import('@/lib/firebase/admin');
  const userRef = adminDb.collection('users').doc(userId);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (snap.data()?.freeGenerationUsed === true) return;
    tx.set(userRef, { freeGenerationUsed: true, freeGenerationClaimedAt: FieldValue.delete() }, { merge: true });
  });
}

// Releases the claim without marking the freebie used, leaving the user eligible to
// retry. Called on any real failure: API/network error, or empty/malformed output.
async function releaseFreeGenerationClaim(userId: string): Promise<void> {
  const { adminDb } = await import('@/lib/firebase/admin');
  const userRef = adminDb.collection('users').doc(userId);
  await userRef.set({ freeGenerationClaimedAt: FieldValue.delete() }, { merge: true }).catch(() => {});
}

// Instruction type definitions
type InstructionType = 'development' | 'general' | 'event-planning' | 'documentation' | 'research';

// Grounding constraint: output must be traceable to provided card fields only
const GROUNDING_INSTRUCTION = `

GROUNDING RULE — STRICTLY ENFORCED:
Only output content that is directly traceable to the card fields or project context provided. Do not infer, assume, or fabricate details that are not present in the input. If a field is empty or absent, do not fill it with plausible-sounding content. When the same card is submitted multiple times, the output must remain consistent — variance between runs is a sign of hallucination.`;

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
    'You are a prompt engineer specializing in AI task directives for software development. Your job is to take the card details and produce a concise, imperative prompt that a developer can paste directly into an AI coding assistant (Claude, ChatGPT, Copilot, etc.) to get the actual deliverable. Output a directive — not a tutorial or how-to guide. Lead with what to build. Specify required components, constraints, and expected output. Write as if commanding a highly capable AI: "Build X. It must include Y. Output Z."' + GROUNDING_INSTRUCTION + FORMATTING_INSTRUCTION + SPARSE_INPUT_INSTRUCTION,

  general:
    'You are a prompt engineer. Take the task details and produce a concise, directive prompt for an AI assistant. The output must tell the AI what to produce directly — not explain how to do it step by step. Lead with the deliverable. Specify required elements, constraints, and expected output format.' + GROUNDING_INSTRUCTION + FORMATTING_INSTRUCTION + SPARSE_INPUT_INSTRUCTION,

  'event-planning':
    'You are a prompt engineer specializing in planning tasks. Take the event details and produce a directive prompt for an AI assistant. Specify exactly what to produce (a timeline, a run-of-show, a checklist, etc.), its required contents, format, and any constraints — not a general guide on how to plan an event.' + GROUNDING_INSTRUCTION + FORMATTING_INSTRUCTION + SPARSE_INPUT_INSTRUCTION,

  documentation:
    'You are a prompt engineer. Take the documentation task and produce a directive prompt for an AI writing assistant. Specify what document to write, what sections to include, the intended audience, and the tone — not meta-instructions about how to write documentation.' + GROUNDING_INSTRUCTION + FORMATTING_INSTRUCTION + SPARSE_INPUT_INSTRUCTION,

  research:
    'You are a prompt engineer. Take the research task and produce a directive prompt for an AI research assistant. Specify what to research, what questions to answer, what format to present findings in, and any scope constraints — not a guide on how to conduct research.' + GROUNDING_INSTRUCTION + FORMATTING_INSTRUCTION + SPARSE_INPUT_INSTRUCTION,
};

// Input validation schema
const GeneratePromptSchema = z.object({
  cardTitle: z.string().min(1, 'Card title is required').max(500, 'Card title too long'),
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
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Reply cap for the structured plan. 4096 was enough for ten short cards but not for
// the richer plan (plan facts, dependencies, assumptions); a cut-off reply is
// treated as a failure and releases a free user's generation.
const STRUCTURED_MAX_TOKENS = 16000;

async function callAnthropic(
  apiKey: string,
  model: string,
  request: { system?: string; user: string; maxTokens: number }
): Promise<ModelReply> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: request.maxTokens,
      ...(request.system ? { system: request.system } : {}),
      messages: [{ role: 'user', content: request.user }],
    }),
  });

  const message = await response.json();
  if (!response.ok) {
    logIfModelNotFound(response, message, model);
    throw new Error(`API returned ${response.status}: ${message.error?.message || 'Unknown error'}`);
  }

  const text = message.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n');

  return {
    text,
    stopReason: message.stop_reason ?? null,
    usage: message.usage
      ? { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens }
      : undefined,
  };
}

// Structured mode (board-level "Generate Tasks" flow). Pro is read from the real
// users/{uid}.isPro field; non-Pro users get exactly one lifetime free generation,
// enforced here, not on the client. The claim/finalize/release rules live in
// lib/ai/taskPlan/orchestrate.ts so they can be unit-tested.
async function handleStructuredGeneration(
  userId: string,
  data: {
    cardTitle: string;
    instructionType: InstructionType;
    boardName?: string;
    description?: string;
    localDate?: string;
  },
  apiKey: string
) {
  const { adminDb } = await import('@/lib/firebase/admin');
  const model = process.env.NEXT_PUBLIC_CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL;

  // The user's own calendar date (sent by the browser) so dates don't start "tomorrow"
  // for evening users; falls back to the server's UTC date for older clients.
  const localDate = data.localDate ?? new Date().toISOString().slice(0, 10);

  try {
    const outcome = await runStructuredGeneration(
      {
        isPro: async (uid) => (await adminDb.collection('users').doc(uid).get()).data()?.isPro === true,
        claim: claimFreeGeneration,
        finalize: finalizeFreeGeneration,
        release: releaseFreeGenerationClaim,
        callModel: (req) => callAnthropic(apiKey, model, req),
      },
      {
        userId,
        system: buildSystemPrompt(data.instructionType),
        user: buildUserMessage({
          goal: data.cardTitle,
          boardName: data.boardName,
          projectContext: data.description,
          today: localDate,
        }),
        maxTokens: STRUCTURED_MAX_TOKENS,
        interpret: (text) =>
          interpretPlanReply(text, {
            // Everything the person wrote counts as "from the input" when checking for unverified claims.
            inputText: [data.cardTitle, data.description].filter(Boolean).join('\n'),
            localDate,
          }),
      }
    );
    return NextResponse.json(outcome.body, outcome.ok ? undefined : { status: outcome.status });
  } catch (apiError: any) {
    console.error('[AI Prompt] Structured API call failed:', {
      name: apiError?.name,
      message: apiError?.message,
    });
    throw apiError;
  }
}

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

    // 2. Validate and sanitize input — done early so we know data.structured
    // before deciding which gating path applies.
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

    // 3. Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[AI Prompt] Missing ANTHROPIC_API_KEY');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // 4a. Structured mode — board-level "Generate Tasks" flow. Gated by the real
    // users/{uid}.isPro field plus one free lifetime generation.
    if (data.structured) {
      return await handleStructuredGeneration(userId, data, apiKey);
    }

    // 4b. Plain-text mode ("AI Instructions") — Pro-gated on the real
    // users/{uid}.isPro field (consolidated from the legacy env-var UID
    // allowlist, which is being retired ahead of Stripe live keys).
    const { adminDb } = await import('@/lib/firebase/admin');
    const userSnap = await adminDb.collection('users').doc(userId).get();
    const isProUser = userSnap.data()?.isPro === true;

    if (!isProUser) {
      return NextResponse.json(
        { error: 'AI Instructions is a Pro feature. Upgrade to Pro to unlock unlimited AI-generated instructions.' },
        { status: 403 }
      );
    }

    const remaining = -1; // Only Pro users reach this point — always unlimited

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
    const model = process.env.NEXT_PUBLIC_CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL;

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
        logIfModelNotFound(response, message, model);
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
      modelUsed: process.env.NEXT_PUBLIC_CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL,
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
