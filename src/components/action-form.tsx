"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";

export type ActionState = { error?: string; ok?: string } | null;

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
};

// Formulario que llama a una acción del servidor y muestra el mensaje de error o de éxito.
// Se envía con onSubmit para que React no vacíe los campos cuando hay un error.
export function ActionForm({ action, children, className, resetOnSuccess }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.ok) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state?.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-sm text-emerald-700">{state.ok}</p>}
    </form>
  );
}
