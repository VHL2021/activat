"use client";

import type { ReactNode } from "react";

// Botón de envío que pide confirmación antes de una acción que no se puede deshacer.
export function ConfirmButton({
  message,
  children,
  className = "btn-danger",
}: {
  message: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
