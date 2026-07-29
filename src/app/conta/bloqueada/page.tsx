import Link from "next/link";

export default function BlockedPage() {
  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">Acesso suspenso</p><h1>Conta bloqueada</h1><p>Entre em contato com o atendimento Lassali para revisar o acesso.</p><Link className="button primary" href="/">Voltar à loja</Link></section></main>;
}
