import type { ReactNode } from "react";

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-6 text-xl font-semibold">{title}</h1>
        {children}
      </div>
    </main>
  );
}
