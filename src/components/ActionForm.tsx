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
      {message?.error && <p className="col-span-full mt-3 text-sm font-medium text-danger" role="alert">{message.error}</p>}
      {message?.ok && <p className="notice col-span-full mt-3" role="status">{message.ok}</p>}
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
    <span className="inline-flex flex-col items-start sm:items-end">
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
      {error && <span className="mt-1 max-w-xs text-xs text-danger sm:text-right" role="alert">{error}</span>}
    </span>
  );
}

export function ErrorBox({ error }: { error: string | null }) {
  return error ? <p className="rounded-xl border-l-4 border-danger bg-danger-tint px-4 py-3 text-sm text-danger" role="alert">{error}</p> : null;
}

export function Loading() {
  return <p className="animate-pulse text-sm text-muted">Cargando…</p>;
}
