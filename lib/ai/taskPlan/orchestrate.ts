// Control flow for the board-level "Generate Tasks" request, with every outside
// dependency (Firestore, the model) injected so the free-generation rules can be
// unit-tested without a network.
//
// Free-generation rule: a free user's single lifetime generation is only ever
// spent on a reply that produced usable cards. Any other outcome (model error,
// reply cut off at the token limit, malformed or empty reply, or any exception)
// releases the claim so they can try again.

export type FreeGenClaim = 'claimed' | 'used' | 'in_progress';

export interface ModelReply {
  text: string;
  // Anthropic stop_reason: 'end_turn' on a complete reply, 'max_tokens' when cut off.
  stopReason: string | null;
  usage?: { inputTokens: number; outputTokens: number };
}

export type Interpretation =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; reason: 'malformed' | 'empty' };

export interface GenerationDeps {
  isPro: (userId: string) => Promise<boolean>;
  claim: (userId: string) => Promise<FreeGenClaim>;
  finalize: (userId: string) => Promise<void>;
  release: (userId: string) => Promise<void>;
  callModel: (request: { system?: string; user: string; maxTokens: number }) => Promise<ModelReply>;
}

export interface GenerationRequest {
  userId: string;
  system?: string;
  user: string;
  maxTokens: number;
  interpret: (text: string) => Interpretation;
}

export type GenerationOutcome =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: number; body: Record<string, unknown> };

export const TRUNCATED_MESSAGE =
  'The plan was too long to finish. Please shorten your description or try again.';
export const MALFORMED_MESSAGE = 'Failed to parse task list. Please try again.';
export const EMPTY_MESSAGE = 'No usable tasks were generated. Please try again.';

export async function runStructuredGeneration(
  deps: GenerationDeps,
  req: GenerationRequest
): Promise<GenerationOutcome> {
  const userIsPro = await deps.isPro(req.userId);
  let usingFreeGeneration = false;

  if (!userIsPro) {
    const claim = await deps.claim(req.userId);

    if (claim === 'used') {
      return {
        ok: false,
        status: 403,
        body: {
          error: 'upgrade_required',
          message: "You've used your free AI generation. Upgrade to Pro for unlimited task generation.",
        },
      };
    }
    if (claim === 'in_progress') {
      return {
        ok: false,
        status: 429,
        body: { error: 'A generation is already in progress for this account. Please wait a moment and try again.' },
      };
    }
    usingFreeGeneration = true;
  }

  const releaseIfFree = async () => {
    if (usingFreeGeneration) await deps.release(req.userId);
  };

  try {
    const reply = await deps.callModel({ system: req.system, user: req.user, maxTokens: req.maxTokens });

    if (reply.stopReason === 'max_tokens') {
      await releaseIfFree();
      return { ok: false, status: 500, body: { error: TRUNCATED_MESSAGE } };
    }

    const result = req.interpret(reply.text);
    if (!result.ok) {
      await releaseIfFree();
      return {
        ok: false,
        status: 500,
        body: { error: result.reason === 'empty' ? EMPTY_MESSAGE : MALFORMED_MESSAGE },
      };
    }

    // Usable cards in hand: this is the only point the freebie is spent.
    if (usingFreeGeneration) await deps.finalize(req.userId);

    return {
      ok: true,
      body: { ...result.body, remaining: userIsPro ? -1 : 0, ...(reply.usage ? { meta: reply.usage } : {}) },
    };
  } catch (err) {
    await releaseIfFree();
    throw err;
  }
}
