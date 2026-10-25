import { insertCapabilityVerifySteps } from './capabilities';
import { checkPlan, labelUnverifiedSpecifics, type PlanFlag } from './checks';
import { composeCards } from './compose';
import type { Interpretation } from './orchestrate';
import { parsePlanReply } from './parse';
import { scheduleTasks } from './schedule';

export interface PipelineContext {
  // What the user typed (used to tell their own facts from the model's).
  inputText: string;
  // The USER'S local calendar date, YYYY-MM-DD. Never derived from the server clock
  // unless the client did not send one.
  localDate: string;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

// Turns the model's raw reply into the response body the modal shows:
// parse and normalize -> label unverified specifics -> checks -> schedule -> cards.
export function interpretPlanReply(rawText: string, ctx: PipelineContext): Interpretation {
  const parsed = parsePlanReply(rawText);
  if (!parsed.ok) return parsed;

  const { plan: labeled, findings } = labelUnverifiedSpecifics(parsed.plan, ctx.inputText);
  const { plan, findings: capabilityFindings } = insertCapabilityVerifySteps(labeled, ctx.inputText);
  const flags: PlanFlag[] = [
    ...capabilityFindings.map((f) => ({
      type: 'unverified-capability' as const,
      taskKey: f.taskKey,
      message: `"${f.title}" relies on ${f.party}'s ${f.capability} that nobody has verified; a Verify first step was added.`,
    })),
    ...checkPlan(plan, ctx.inputText),
  ];

  const localDate = YMD.test(ctx.localDate) ? ctx.localDate : new Date().toISOString().slice(0, 10);
  const stated = plan.facts.schedule.startDate;
  const startDate = stated && stated > localDate ? stated : localDate;

  const schedule = scheduleTasks(plan.tasks, {
    startDate,
    hoursPerWeek: plan.facts.schedule.hoursPerWeek,
    deadline: plan.facts.schedule.deadline,
  });

  const cards = composeCards({ plan, schedule, findings, capabilityFindings, flags, warnings: parsed.warnings });

  return {
    ok: true,
    body: {
      overview: plan.overview,
      tasks: cards,
      summary: {
        firstWorkingDay: schedule.firstWorkingDay,
        endDate: schedule.endDate,
        hoursPerWeek: schedule.hoursPerWeek,
        hoursPerWeekAssumed: schedule.hoursPerWeekAssumed,
        deadline: schedule.deadline,
        deadlineMet: schedule.deadlineMet,
        overrunBusinessDays: schedule.overrunBusinessDays ?? null,
        wouldHaveToGive: schedule.wouldHaveToGive ?? [],
        fitsAfterDeferring: schedule.fitsAfterDeferring ?? null,
        specificsLabeled: findings.filter((f) => f.autoLabeled).length,
        capabilityVerifyStepsAdded: capabilityFindings.length,
        flags,
        warnings: parsed.warnings,
      },
      // Machine-readable structure of the plan (what depends on what), for tests and diagnostics.
      structure: plan.tasks.map((t) => ({
        key: t.key,
        title: t.title,
        kind: t.kind,
        priority: t.priority,
        dependsOn: t.dependsOn,
        effortHours: t.effort.hours,
        waitDays: t.waitDays,
        dueDate: schedule.dueDates[t.key],
      })),
    },
  };
}
