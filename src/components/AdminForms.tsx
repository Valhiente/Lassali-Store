"use client";

import { useActionState } from "react";
import type { AdminState } from "@/app/admin/actions";

export function AdminActionForm({
  action,
  children,
  label,
  className = "",
}: {
  action: (state: AdminState, data: FormData) => Promise<AdminState>;
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {state.error && <p className="admin-feedback error">{state.error}</p>}
      {state.success && <p className="admin-feedback success">{state.success}</p>}
      {children}
      <button type="submit" className="button primary" disabled={pending}>{pending ? "Salvando..." : label}</button>
    </form>
  );
}
