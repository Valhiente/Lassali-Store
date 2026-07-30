"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/conta/actions";

export function AuthForm({
  action,
  children,
  submitLabel,
}: {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  children: React.ReactNode;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      {state.error && <div className="form-message error">{state.error}</div>}
      {state.success && <div className="form-message success">{state.success}</div>}
      {children}
      <button className="button primary" disabled={pending} type="submit">
        {pending ? "Processando..." : submitLabel}
      </button>
    </form>
  );
}
