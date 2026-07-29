"use client";

import { useActionState } from "react";
import type { UnitOrderState } from "@/app/unidades-forbody/actions";

type InventoryOption = {
  id: string;
  label: string;
  available: number;
};

export function UnitStockOrderForm({
  action,
  options,
}: {
  action: (state: UnitOrderState, formData: FormData) => Promise<UnitOrderState>;
  options: InventoryOption[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="admin-form-grid">
      {state.error ? <div className="form-message error">{state.error}</div> : null}
      {state.success ? <div className="form-message success">{state.success}</div> : null}
      <label>
        Produto, cor e tamanho
        <select name="variantId" required defaultValue="">
          <option value="" disabled>Selecione</option>
          {options.map((option) => (
            <option key={option.id} value={option.id} disabled={option.available <= 0}>
              {option.label} · {option.available} disponíveis
            </option>
          ))}
        </select>
      </label>
      <label>
        Quantidade
        <input name="quantity" type="number" min={1} max={1000} defaultValue={1} required />
      </label>
      <button className="button primary" type="submit" disabled={pending || !options.some((option) => option.available > 0)}>
        {pending ? "Reservando..." : "Solicitar reposição"}
      </button>
    </form>
  );
}
