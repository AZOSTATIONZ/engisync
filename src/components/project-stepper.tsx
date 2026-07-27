"use client";

import { useState, useTransition } from "react";
import { Check, ChevronRight, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PHASES,
  PROJECT_STAGES,
  STAGE_META,
  stageIndex,
  stagesInPhase,
  type ProjectStage,
} from "@/lib/lifecycle";
import { setProjectStage } from "@/app/dashboard/projects/actions";

/**
 * Interactive lifecycle stepper.
 *
 * Responsive strategy: ten labelled steps do not fit on a 360px screen without
 * becoming unreadable, so mobile collapses to the four PHASES with the current
 * stage named underneath. Desktop shows all ten. Same data, two densities —
 * rather than a horizontally-scrolling strip, which hides state off-screen.
 *
 * Members see a read-only view; only the leader can move the project.
 */
export function ProjectStepper({
  workspaceId,
  stage,
  canEdit,
}: {
  workspaceId: string;
  stage: ProjectStage;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<ProjectStage | null>(null);

  const current = optimistic ?? stage;
  const currentIdx = stageIndex(current);

  function move(to: ProjectStage) {
    if (!canEdit || to === current) return;
    setError(null);
    setOptimistic(to);
    startTransition(async () => {
      const res = await setProjectStage(workspaceId, to);
      if (res?.error) {
        setError(res.error);
        setOptimistic(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      {/* ── Desktop: all ten stages ───────────────────────────────── */}
      <ol className="hidden items-start gap-1 md:flex">
        {PROJECT_STAGES.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <li key={s} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition-colors",
                    i === 0 ? "opacity-0" : done || active ? "bg-primary" : "bg-muted",
                  )}
                />
                <button
                  type="button"
                  disabled={!canEdit || pending}
                  onClick={() => move(s)}
                  title={canEdit ? `Move to ${STAGE_META[s].label}` : STAGE_META[s].hint}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[0.65rem] font-semibold transition-all",
                    done && "border-primary bg-primary text-primary-foreground",
                    active &&
                      "border-primary bg-background text-primary ring-4 ring-primary/15",
                    !done && !active && "border-muted bg-background text-muted-foreground",
                    canEdit && !pending && "hover:scale-110 hover:border-primary",
                    !canEdit && "cursor-default",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </button>
                <span
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition-colors",
                    i === PROJECT_STAGES.length - 1
                      ? "opacity-0"
                      : done
                        ? "bg-primary"
                        : "bg-muted",
                  )}
                />
              </div>
              <span
                className={cn(
                  "mt-1.5 w-full truncate px-0.5 text-center text-[0.65rem] leading-tight",
                  active ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {STAGE_META[s].label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* ── Mobile: four phases ───────────────────────────────────── */}
      <div className="md:hidden">
        <ol className="flex items-center gap-1.5">
          {PHASES.map((phase) => {
            const stages = stagesInPhase(phase);
            const lastIdx = stageIndex(stages[stages.length - 1]);
            const firstIdx = stageIndex(stages[0]);
            const done = currentIdx > lastIdx;
            const active = currentIdx >= firstIdx && currentIdx <= lastIdx;
            return (
              <li key={phase} className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-colors",
                    done ? "bg-primary" : active ? "bg-primary/50" : "bg-muted",
                  )}
                />
                <span
                  className={cn(
                    "mt-1 block truncate text-center text-[0.65rem]",
                    active ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {phase}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-3 rounded-lg border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">
            Stage {currentIdx + 1} of {PROJECT_STAGES.length}
          </p>
          <p className="text-sm font-semibold">{STAGE_META[current].label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {STAGE_META[current].hint}
          </p>
        </div>

        {canEdit && (
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Move project to
            </span>
            <select
              value={current}
              disabled={pending}
              onChange={(e) => move(e.target.value as ProjectStage)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {PROJECT_STAGES.map((s, i) => (
                <option key={s} value={s}>
                  {i + 1}. {STAGE_META[s].label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Current-stage hint (desktop) */}
      <p className="hidden text-xs text-muted-foreground md:block">
        <span className="font-medium text-foreground">
          {STAGE_META[current].label}:
        </span>{" "}
        {STAGE_META[current].hint}
      </p>

      <div className="flex items-center gap-2">
        {pending && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
          </span>
        )}
        {!canEdit && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Only the group leader can change the stage.
          </span>
        )}
        {error && (
          <span role="alert" className="text-xs font-medium text-destructive">
            {error}
          </span>
        )}
      </div>

      {/* Advance shortcut — the most common action gets a real button. */}
      {canEdit && currentIdx < PROJECT_STAGES.length - 1 && (
        <button
          type="button"
          disabled={pending}
          onClick={() => move(PROJECT_STAGES[currentIdx + 1])}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          Move to {STAGE_META[PROJECT_STAGES[currentIdx + 1]].label}
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
