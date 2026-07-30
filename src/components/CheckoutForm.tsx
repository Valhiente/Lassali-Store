"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/catalog";
import { useCart } from "./CartProvider";

export function CheckoutForm() {
  const { items, subtotal, sessionToken } = useCart();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionToken || !items.length) return;
    setLoading(true);
    setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, sessionToken }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      window.location.href = `/conta/entrar?next=${encodeURIComponent("/checkout")}`;
      return;
    }
    if (!response.ok || !result.checkoutUrl) {
      setError(String(result.error || "Não foi possível iniciar o pagamento."));
      setLoading(false);
      return;
    }
    window.location.assign(result.checkoutUrl);
  }

  if (!items.length) {
    return (
      <section className="auth-card wide">
        <p className="eyebrow">Checkout</p>
        <h1>Sua sacola está vazia</h1>
        <Link className="button primary" href="/#catalogo">Escolher produtos</Link>
      </section>
    );
  }
  return (
    <section className="auth-card wide">
      <p className="eyebrow">Checkout seguro</p>
      <h1>Entrega e pagamento</h1>
      <div className="status-banner">
        {items.length} {items.length === 1 ? "produto" : "produtos"} · <strong>{money(subtotal)}</strong>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label>Nome de quem receberá<input name="fullName" autoComplete="name" required /></label>
        <label>CEP<input name="postalCode" inputMode="numeric" autoComplete="postal-code" minLength={8} maxLength={9} required /></label>
        <label>Endereço<input name="street" autoComplete="address-line1" required /></label>
        <label>Número<input name="number" required /></label>
        <label>Complemento<input name="complement" autoComplete="address-line2" /></label>
        <label>Bairro<input name="district" required /></label>
        <label>Cidade<input name="city" autoComplete="address-level2" required /></label>
        <label>UF<input name="state" autoComplete="address-level1" minLength={2} maxLength={2} required /></label>
        {error && <div className="status-banner">{error}</div>}
        <button className="button primary full" type="submit" disabled={loading || !sessionToken}>
          {loading ? "Preparando pagamento…" : "Pagar com Mercado Pago"}
        </button>
      </form>
      <div className="actions"><Link className="button ghost" href="/carrinho">Voltar à sacola</Link></div>
    </section>
  );
}
