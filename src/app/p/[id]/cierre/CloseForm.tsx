"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import type { ActionState } from "@/components/ActionForm";
import { input, primaryButton, quietButton } from "@/components/styles";
import { DEFINE_NEXT_MISSION } from "@/server/next-step";

const fieldLabel = "font-display text-xs font-bold tracking-[0.12em] text-muted";

type Criterion = { id: string; text: string; done: boolean; doneInSession: boolean };

// A rejected form has to keep what was typed. Submitting through a transition
// skips React's form reset, which would otherwise uncheck the controlled
// checkboxes without touching their state.
export function CloseForm({
  action,
  criteria,
  headline,
  backHref,
  draft,
  isClaudeDraft,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  criteria: Criterion[];
  headline: string;
  backHref: string;
  draft: { outcome: string; nextCriterionId: string | null; nextStepDetail: string };
  isClaudeDraft: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [outcome, setOutcome] = useState(draft.outcome);
  const [blocker, setBlocker] = useState("");
  const [nextCriterionId, setNextCriterionId] = useState(draft.nextCriterionId);
  const [nextStepDetail, setNextStepDetail] = useState(draft.nextStepDetail);
  const [checked, setChecked] = useState(() =>
    criteria.filter(({ doneInSession }) => doneInSession).map(({ id }) => id),
  );

  // Criteria met before this session are history; the ones met during it start
  // checked and can be corrected, and the pending ones can be marked here.
  const listed = criteria.filter(({ done, doneInSession }) => !done || doneInSession);
  const earned = checked.length;
  const doneBefore = criteria.filter(({ done, doneInSession }) => done && !doneInSession).length;

  // Follows the checkboxes: marking the chosen objective moves the choice to the
  // first one still pending, so a valid option is always selected.
  const stillPending = listed.filter(({ id }) => !checked.includes(id));
  const selectedNextId = stillPending.some(({ id }) => id === nextCriterionId)
    ? nextCriterionId
    : stillPending[0]?.id;

  return (
    <>
      <header className="flex items-end justify-between gap-3 px-5 pt-[26px] pb-2.5">
        <div className="flex flex-col gap-1.5">
          <span className="font-display text-xs font-bold tracking-[0.18em] text-lime uppercase">
            {headline}
          </span>
          <h1 className="font-display text-[28px] leading-none font-bold uppercase">Resultado</h1>
        </div>
        {criteria.length > 0 && (
          <span className="clip-chip shrink-0 bg-lime px-2.5 py-1.5 font-display text-[15px] font-bold text-bg">
            +{earned} · {doneBefore + earned}/{criteria.length}
          </span>
        )}
      </header>

      <form
        action={formAction}
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(() => formAction(formData));
        }}
        aria-busy={pending}
        className="flex grow flex-col gap-3.5 px-4 pt-1.5 pb-6"
      >
        <label className="flex flex-col gap-1.5">
          <span className={`${fieldLabel} flex items-end justify-between gap-2`}>
            QUÉ QUEDÓ FUNCIONANDO
            {isClaudeDraft && (
              <span className="shrink-0 tracking-[0.04em] whitespace-nowrap text-lime">BORRADOR CLAUDE CODE</span>
            )}
          </span>
          <textarea
            name="outcome"
            rows={4}
            required
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
            className={`${input} resize-none leading-[1.45]`}
          />
        </label>

        {listed.length > 0 && (
          <fieldset className="flex flex-col gap-1.5">
            <legend className={`${fieldLabel} pb-1.5`}>OBJETIVOS CUMPLIDOS HOY</legend>
            {listed.map(({ id, text }) => {
              const isChecked = checked.includes(id);
              return (
                <label
                  key={id}
                  className={`flex min-h-[46px] items-center gap-2.5 border px-3 py-2 text-sm ${
                    isChecked ? "border-lime-line bg-lime-panel" : "border-panel-line bg-panel"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="criterion"
                    value={id}
                    checked={isChecked}
                    onChange={(event) =>
                      setChecked(
                        event.target.checked
                          ? [...checked, id]
                          : checked.filter((item) => item !== id),
                      )
                    }
                    className="size-5 shrink-0 accent-lime"
                  />
                  {text}
                </label>
              );
            })}
          </fieldset>
        )}

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>QUÉ BLOQUEA (OPCIONAL)</span>
          <input
            name="blocker"
            placeholder="Nada por ahora"
            value={blocker}
            onChange={(event) => setBlocker(event.target.value)}
            className={input}
          />
        </label>

        {stillPending.length > 0 ? (
          <>
            <fieldset className="flex flex-col gap-1.5">
              <legend className={`${fieldLabel} pb-1.5`}>SIGUIENTE MOVIMIENTO</legend>
              {stillPending.map(({ id, text }) => {
                const isSelected = id === selectedNextId;
                return (
                  <label
                    key={id}
                    className={`flex min-h-[46px] items-center gap-2.5 border px-3 py-2 text-sm ${
                      isSelected ? "border-lime-line bg-lime-panel" : "border-panel-line bg-panel"
                    }`}
                  >
                    <input
                      type="radio"
                      name="nextCriterionId"
                      value={id}
                      checked={isSelected}
                      onChange={() => setNextCriterionId(id)}
                      className="size-5 shrink-0 accent-lime"
                    />
                    {text}
                  </label>
                );
              })}
            </fieldset>
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>DETALLE (OPCIONAL)</span>
              <input
                name="nextStepDetail"
                value={nextStepDetail}
                onChange={(event) => setNextStepDetail(event.target.value)}
                className={input}
              />
            </label>
          </>
        ) : (
          <div className="flex flex-col gap-1 border border-lime-line bg-lime-panel px-3.5 py-3">
            {criteria.length > 0 && (
              <span className="font-display text-sm font-bold tracking-[0.06em] text-lime uppercase">
                Misión cumplida
              </span>
            )}
            <span className="text-sm">Siguiente movimiento: {DEFINE_NEXT_MISSION}</span>
          </div>
        )}

        <div className="grow" />

        {state.error && (
          <p role="alert" className="text-sm font-semibold text-warn-text">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className={primaryButton}>
          Guardar resultado
        </button>
        <Link href={backHref} className={quietButton}>
          Seguir jugando
        </Link>
      </form>
    </>
  );
}
