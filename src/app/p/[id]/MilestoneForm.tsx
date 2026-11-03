"use client";

import { Check, Plus, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { ActionState } from "@/components/ActionForm";
import { input, primaryButton, quietButton, sectionHeading, sectionLabel } from "@/components/styles";

type EditedMission = {
  title: string;
  doneDefinition: string;
  pending: { id: string; text: string }[];
  met: string[];
};

// Creates a mission, or edits the open one when `mission` comes with `cancelHref`.
// Fields are controlled because React resets a form after its action runs, and
// a rejected form has to keep what was typed.
export function MilestoneForm({
  action,
  minCriteria,
  maxCriteria,
  mission,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  minCriteria: number;
  maxCriteria: number;
  mission?: EditedMission;
  cancelHref?: string;
}) {
  const met = mission?.met ?? [];
  const minRows = Math.max(0, minCriteria - met.length);
  const maxRows = maxCriteria - met.length;

  const [state, formAction, pending] = useActionState(action, {});
  const [title, setTitle] = useState(mission?.title ?? "");
  const [doneDefinition, setDoneDefinition] = useState(mission?.doneDefinition ?? "");
  const [criteria, setCriteria] = useState<{ id: string; text: string }[]>(() => {
    const rows = mission?.pending ?? [];
    return [...rows, ...Array.from({ length: Math.max(0, minRows - rows.length) }, () => ({ id: "", text: "" }))];
  });

  return (
    <form
      action={formAction}
      aria-busy={pending}
      className="clip-card flex flex-col gap-3.5 border border-panel-line bg-panel p-4"
    >
      <div className="flex flex-col gap-1">
        <span className={sectionLabel}>{mission ? "MISIÓN ACTUAL" : "SIN MISIÓN"}</span>
        <h2 className="text-lg font-bold">{mission ? "Editar misión" : "Define la misión"}</h2>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={sectionHeading}>MISIÓN</span>
        <input
          name="title"
          required
          placeholder="Ej.: Exportar formularios a PDF"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={input}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={sectionHeading}>HECHO CUANDO</span>
        <textarea
          name="doneDefinition"
          required
          rows={3}
          placeholder="Ej.: Abro un formulario lleno, pulso Exportar y se descarga un PDF legible"
          value={doneDefinition}
          onChange={(event) => setDoneDefinition(event.target.value)}
          className={input}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className={sectionHeading}>
          OBJETIVOS ({minCriteria} A {maxCriteria})
        </legend>
        <p className="text-xs text-text-2">Cada objetivo debe poder comprobarse en menos de un minuto.</p>

        {met.map((text) => (
          <p key={text} className="flex min-h-11 items-center gap-2.5 text-sm text-muted">
            <span className="flex size-5 shrink-0 items-center justify-center bg-lime text-bg">
              <Check size={14} strokeWidth={3.2} aria-hidden />
            </span>
            <span className="line-through">{text}</span>
          </p>
        ))}

        {criteria.map(({ id, text }, index) => (
          <div key={id || `new-${index}`} className="flex items-center gap-2">
            <input type="hidden" name="criterionId" value={id} />
            <input
              name="criterion"
              aria-label={`Objetivo ${met.length + index + 1}`}
              placeholder="Ej.: El botón Exportar genera un PDF con los campos"
              value={text}
              onChange={(event) =>
                setCriteria(
                  criteria.map((item, i) => (i === index ? { ...item, text: event.target.value } : item)),
                )
              }
              className={input}
            />
            {criteria.length > minRows && (
              <button
                type="button"
                aria-label={`Quitar objetivo ${met.length + index + 1}`}
                onClick={() => setCriteria(criteria.filter((_, i) => i !== index))}
                className="focus-inset flex size-11 shrink-0 items-center justify-center text-muted hover:text-text"
              >
                <X size={18} strokeWidth={2} aria-hidden />
              </button>
            )}
          </div>
        ))}
        {criteria.length < maxRows && (
          <button
            type="button"
            onClick={() => setCriteria([...criteria, { id: "", text: "" }])}
            className="focus-inset flex min-h-11 items-center gap-2 self-start font-display text-sm font-bold tracking-[0.06em] text-lime uppercase hover:text-lime-hover"
          >
            <Plus size={16} strokeWidth={2.4} aria-hidden />
            Agregar objetivo
          </button>
        )}
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm font-semibold text-warn-text">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={primaryButton}>
        {mission ? "Guardar misión" : "Definir misión"}
      </button>
      {cancelHref && (
        <Link href={cancelHref} className={quietButton}>
          Cancelar
        </Link>
      )}
    </form>
  );
}
