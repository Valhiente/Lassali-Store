import Link from "next/link";

export const metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return <main className="auth-page"><section className="auth-card wide"><p className="eyebrow">Checkout seguro</p><h1>Entrega e pagamento</h1><div className="status-banner">A estrutura do carrinho está pronta. O pagamento será habilitado quando as credenciais do Mercado Pago e Melhor Envio forem configuradas.</div><div className="actions"><Link className="button ghost" href="/carrinho">Voltar à sacola</Link><Link className="button primary" href="/conta/entrar">Entrar para continuar</Link></div></section></main>;
}
