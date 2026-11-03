"use client";

import { useActionState, type ReactNode } from "react";

export type ActionState = { error?: string };

export function ActionForm({
  action,
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} aria-busy={pending}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state.error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-warn-text">
          {state.error}
        </p>
      )}
    </form>
  );
}
