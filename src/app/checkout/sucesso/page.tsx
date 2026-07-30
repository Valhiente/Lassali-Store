import Link from "next/link";

export const metadata = { title: "Pedido recebido" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; status?: string }>;
}) {
  const { order, status } = await searchParams;
  const shortOrder = /^[0-9a-f-]{36}$/i.test(order || "") ? order?.slice(0, 8) : null;
  return (
    <main className="auth-page">
      <section className="auth-card wide">
        <p className="eyebrow">Lassali Store</p>
        <h1>{status === "pending" ? "Pagamento em análise" : "Pedido recebido"}</h1>
        <div className="status-banner">
          {shortOrder ? `Pedido ${shortOrder}. ` : ""}
          A confirmação definitiva aparecerá em “Meus pedidos” após o retorno seguro do Mercado Pago.
        </div>
        <div className="actions">
          <Link className="button primary" href="/conta/pedidos">Acompanhar pedido</Link>
          <Link className="button ghost" href="/">Voltar à loja</Link>
        </div>
      </section>
    </main>
  );
}
