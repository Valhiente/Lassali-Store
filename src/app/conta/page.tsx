import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { logout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minha conta" };

const labels = {
  retail: "Cliente de varejo",
  wholesale: "Cliente atacadista",
  forbody_unit: "Unidade Forbody",
  admin: "Administrador",
};

export default async function AccountPage() {
  const account = await requireAccount();
  return (
    <main className="account-page">
      <header className="account-header">
        <div><p className="eyebrow">Minha conta</p><h1>Olá, {account.fullName.split(" ")[0]}</h1></div>
        <form action={logout}><button type="submit" className="button ghost">Sair</button></form>
      </header>
      <section className="account-grid">
        <article><span>Perfil</span><strong>{labels[account.kind]}</strong><small>Status: {account.status}</small></article>
        <article><span>Empresa ou unidade</span><strong>{account.organizationName || "Não vinculada"}</strong><small>{account.email}</small></article>
        <Link href="/conta/pedidos"><span>Pedidos</span><strong>Acompanhar compras</strong><small>Histórico e entregas →</small></Link>
        <Link href="/conta/preferencias"><span>Privacidade</span><strong>Preferências de contato</strong><small>E-mail e WhatsApp →</small></Link>
      </section>
      {account.kind === "wholesale" && account.status === "pending" && <div className="status-banner">Seu CNPJ está em análise. Você pode continuar comprando no varejo enquanto aguarda.</div>}
      {account.kind === "forbody_unit" && account.status === "active" && <Link className="button primary" href="/unidades-forbody">Acessar portal da unidade</Link>}
      {account.kind === "admin" && <Link className="button primary" href="/admin">Acessar administração</Link>}
    </main>
  );
}
