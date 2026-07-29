"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { money } from "@/lib/catalog";
import { useCart } from "./CartProvider";

export function CartView() {
  const { items, subtotal, setQuantity, removeItem, sessionToken } = useCart();
  const [message, setMessage] = useState("");
  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionToken) return;
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/cart/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken,
        email: data.get("email"),
        whatsapp: data.get("whatsapp"),
        emailConsent: data.get("emailConsent") === "on",
        whatsappConsent: data.get("whatsappConsent") === "on",
      }),
    });
    setMessage(response.ok ? "Preferências salvas." : "Não foi possível salvar.");
  }
  if (!items.length) return <section className="empty-cart"><h1>Sua sacola está vazia</h1><p>Encontre seu próximo look de treino.</p><Link className="button primary" href="/#catalogo">Continuar comprando</Link></section>;
  return (
    <div className="cart-layout">
      <section className="cart-items">
        <p className="eyebrow">Sua sacola</p><h1>{items.length} {items.length === 1 ? "produto" : "produtos"}</h1>
        {items.map((item) => <article key={item.sku}>
          <div className="cart-image">{item.image ? <Image src={item.image} alt={item.name} fill sizes="120px" /> : <span>LS</span>}</div>
          <div><strong>{item.name}</strong><span>{item.color} · {item.size}</span><button onClick={() => removeItem(item.sku)}>Remover</button></div>
          <div className="quantity"><button onClick={() => setQuantity(item.sku, item.quantity - 1)}>−</button><span>{item.quantity}</span><button onClick={() => setQuantity(item.sku, item.quantity + 1)}>+</button></div>
          <b>{money(item.price * item.quantity)}</b>
        </article>)}
      </section>
      <aside className="cart-summary">
        <h2>Resumo</h2><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><p>Frete calculado na próxima etapa.</p>
        <Link className="button primary full" href="/checkout">Continuar para entrega</Link>
        <form onSubmit={saveContact}>
          <h3>Salvar seu carrinho</h3>
          <label>E-mail<input name="email" type="email" required /></label>
          <label>WhatsApp opcional<input name="whatsapp" /></label>
          <label className="check"><input name="emailConsent" type="checkbox" /> Quero receber lembretes deste carrinho por e-mail.</label>
          <label className="check"><input name="whatsappConsent" type="checkbox" /> Quero receber lembretes pelo WhatsApp.</label>
          <button className="button ghost">Salvar preferências</button>
          {message && <small>{message}</small>}
        </form>
      </aside>
    </div>
  );
}
