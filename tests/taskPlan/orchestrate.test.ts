import { describe, it, expect, vi } from 'vitest';
import {
  runStructuredGeneration,
  TRUNCATED_MESSAGE,
  MALFORMED_MESSAGE,
  EMPTY_MESSAGE,
  type GenerationDeps,
  type Interpretation,
} from '../../lib/ai/taskPlan/orchestrate';

function makeDeps(overrides: Partial<GenerationDeps> = {}) {
  const deps = {
    isPro: vi.fn(async () => false),
    claim: vi.fn(async () => 'claimed' as const),
    finalize: vi.fn(async () => {}),
    release: vi.fn(async () => {}),
    callModel: vi.fn(async () => ({ text: '{"tasks":[1]}', stopReason: 'end_turn' })),
    ...overrides,
  };
  return deps as GenerationDeps & typeof deps;
}

const goodInterpret = (): Interpretation => ({ ok: true, body: { tasks: [{ title: 'x' }] } });
const request = (interpret = goodInterpret) => ({ userId: 'u1', user: 'goal', maxTokens: 100, interpret });

describe('free user: the lifetime generation is only spent on usable cards', () => {
  it('finalizes (spends it) when usable cards come back', async () => {
    const deps = makeDeps();
    const out = await runStructuredGeneration(deps, request());
    expect(out.ok).toBe(true);
    expect(deps.finalize).toHaveBeenCalledTimes(1);
    expect(deps.release).not.toHaveBeenCalled();
  });

  it('releases when the reply was cut off at the token limit', async () => {
    const deps = makeDeps({ callModel: vi.fn(async () => ({ text: '{"tasks":[{"title":"Cut o', stopReason: 'max_tokens' })) });
    const out = await runStructuredGeneration(deps, request());
    expect(out).toEqual({ ok: false, status: 500, body: { error: TRUNCATED_MESSAGE } });
    expect(deps.release).toHaveBeenCalledTimes(1);
    expect(deps.finalize).not.toHaveBeenCalled();
  });

  it('releases when the reply is malformed', async () => {
    const deps = makeDeps();
    const out = await runStructuredGeneration(deps, request(() => ({ ok: false, reason: 'malformed' })));
    expect(out).toEqual({ ok: false, status: 500, body: { error: MALFORMED_MESSAGE } });
    expect(deps.release).toHaveBeenCalledTimes(1);
    expect(deps.finalize).not.toHaveBeenCalled();
  });

  it('releases when the reply has no usable cards', async () => {
    const deps = makeDeps();
    const out = await runStructuredGeneration(deps, request(() => ({ ok: false, reason: 'empty' })));
    expect(out).toEqual({ ok: false, status: 500, body: { error: EMPTY_MESSAGE } });
    expect(deps.release).toHaveBeenCalledTimes(1);
    expect(deps.finalize).not.toHaveBeenCalled();
  });

  it('releases and rethrows when the model call fails', async () => {
    const deps = makeDeps({ callModel: vi.fn(async () => { throw new Error('API returned 500'); }) });
    await expect(runStructuredGeneration(deps, request())).rejects.toThrow('API returned 500');
    expect(deps.release).toHaveBeenCalledTimes(1);
    expect(deps.finalize).not.toHaveBeenCalled();
  });

  it('releases and rethrows when interpreting the reply throws', async () => {
    const deps = makeDeps();
    const boom = () => { throw new Error('unexpected shape'); };
    await expect(runStructuredGeneration(deps, request(boom))).rejects.toThrow('unexpected shape');
    expect(deps.release).toHaveBeenCalledTimes(1);
    expect(deps.finalize).not.toHaveBeenCalled();
  });

  it('refuses without calling the model once the freebie is used', async () => {
    const deps = makeDeps({ claim: vi.fn(async () => 'used' as const) });
    const out = await runStructuredGeneration(deps, request());
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.status).toBe(403);
      expect(out.body.error).toBe('upgrade_required');
    }
    expect(deps.callModel).not.toHaveBeenCalled();
    expect(deps.release).not.toHaveBeenCalled();
  });

  it('answers 429 without calling the model while another generation is in progress', async () => {
    const deps = makeDeps({ claim: vi.fn(async () => 'in_progress' as const) });
    const out = await runStructuredGeneration(deps, request());
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.status).toBe(429);
    expect(deps.callModel).not.toHaveBeenCalled();
    expect(deps.release).not.toHaveBeenCalled();
  });
});

describe('Pro user', () => {
  it('never claims, finalizes or releases, and gets remaining = -1', async () => {
    const deps = makeDeps({ isPro: vi.fn(async () => true) });
    const out = await runStructuredGeneration(deps, request());
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.body.remaining).toBe(-1);
    expect(deps.claim).not.toHaveBeenCalled();
    expect(deps.finalize).not.toHaveBeenCalled();
    expect(deps.release).not.toHaveBeenCalled();
  });

  it('a truncated reply fails cleanly and touches no free-generation state', async () => {
    const deps = makeDeps({
      isPro: vi.fn(async () => true),
      callModel: vi.fn(async () => ({ text: '{', stopReason: 'max_tokens' })),
    });
    const out = await runStructuredGeneration(deps, request());
    expect(out.ok).toBe(false);
    expect(deps.release).not.toHaveBeenCalled();
  });
});
