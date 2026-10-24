import { useRef, useState, type FormEvent, type ReactNode } from "react";

type Props = {
  action: (data: FormData) => Promise<string | void>;
  onDone?: () => unknown;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
};

// Formulario que ejecuta una acción y muestra el mensaje de error o de éxito.
export function ActionForm({ action, onDone, children, className, resetOnSuccess }: Props) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok?: string; error?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const ok = await action(new FormData(event.currentTarget));
      setMessage(ok ? { ok } : null);
      if (resetOnSuccess) formRef.current?.reset();
      await onDone?.();
    } catch (error) {
      setMessage({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className={className}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {message?.error && <p className="mt-2 text-sm text-red-700" role="alert">{message.error}</p>}
      {message?.ok && <p className="mt-2 text-sm text-emerald-700">{message.ok}</p>}
    </form>
  );
}

// Un botón que ejecuta una acción, con confirmación opcional.
export function ActionButton({
  action,
  onDone,
  confirm: question,
  className = "btn-secondary",
  children,
}: {
  action: () => Promise<string | void>;
  onDone?: () => unknown;
  confirm?: string;
  className?: string;
  children: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={async () => {
          if (question && !confirm(question)) return;
          setPending(true);
          setError(null);
          try {
            await action();
            await onDone?.();
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          } finally {
            setPending(false);
          }
        }}
      >
        {children}
      </button>
      {error && <span className="mt-1 max-w-xs text-right text-xs text-red-700" role="alert">{error}</span>}
    </span>
  );
}

export function ErrorBox({ error }: { error: string | null }) {
  return error ? <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p> : null;
}

export function Loading() {
  return <p className="text-sm text-slate-500">Cargando…</p>;
}
