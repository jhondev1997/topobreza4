"use client";

import { Lightbulb } from "lucide-react";
import { useActionState, useState } from "react";
import type { ActionState } from "@/components/ActionForm";
import { input } from "@/components/styles";
import { parkIdeaAction } from "../../../ideas/actions";

const tangentButton =
  "focus-inset flex min-h-[52px] w-full items-center justify-center gap-2 border border-line-strong font-display text-[15px] font-bold tracking-[0.06em] text-text uppercase";

export function TangentForm({ projectId }: { projectId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const [state, formAction, pending] = useActionState(async (previous: ActionState, formData: FormData) => {
    const result = await parkIdeaAction(previous, formData);
    if (!result.error) {
      setIsOpen(false);
      setSaved(true);
    }
    return result;
  }, {});

  if (!isOpen) {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          className={tangentButton}
          onClick={() => {
            setIsOpen(true);
            setSaved(false);
          }}
        >
          <Lightbulb size={18} strokeWidth={2} aria-hidden />
          Mandar tangente a la banca
        </button>
        {saved && (
          <p role="status" className="text-center text-xs text-ok">
            Guardada en la banca. Sigue con la misión.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} aria-busy={pending} className="flex flex-col gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <label>
        <span className="sr-only">Tangente</span>
        <input name="text" required autoFocus placeholder="Anota la tangente en una línea" className={input} />
      </label>
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-warn-text">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="focus-inset min-h-11 border border-line-strong font-display text-sm font-bold tracking-[0.06em] text-text-2 uppercase"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="focus-inset-dark min-h-11 bg-lime font-display text-sm font-bold tracking-[0.06em] text-bg uppercase hover:bg-lime-hover"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}
