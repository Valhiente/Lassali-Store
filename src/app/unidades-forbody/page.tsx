import Link from "next/link";
import { PackageCheck, RotateCcw, TrendingUp } from "lucide-react";
import { requireForbodyUnit } from "@/lib/auth";
import { createSecretClient } from "@/lib/supabase/server";
import { calculateReplenishment } from "@/lib/replenishment";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portal das Unidades Forbody" };

export default async function UnitPortalPage() {
  const account = await requireForbodyUnit();
  const secret = createSecretClient();
  const { data: orders } = secret
    ? await secret.from("orders").select("id, created_at, status, order_items(category, quantity)").eq("organization_id", account.organizationId).in("status", ["paid","processing","shipped","delivered"]).order("created_at", { ascending: false })
    : { data: [] };
  const recommendations = calculateReplenishment((orders || []) as never[]);
  const totalItems = recommendations.reduce((sum, item) => sum + item.quantity, 0);
  const latest = orders?.[0]?.created_at;
  return <main className="portal-page">
    <section className="portal-welcome"><div><p className="kicker">Portal corporativo Forbody</p><h1>Olá, {account.organizationName}</h1><p>Reposição, histórico real e sugestões baseadas nos pedidos da sua unidade.</p></div><Link className="button primary" href="/forbody">Abrir catálogo interno</Link></section>
    <section className="dashboard-preview">
      <div className="dashboard-title"><div><p>Dados da organização</p><h2>Visão de abastecimento</h2></div><span>Perfil: unidade aprovada</span></div>
      <div className="metric-grid">
        <article><span>Total comprado</span><strong>{totalItems}</strong><small>itens registrados</small></article>
        <article><span>Pedidos realizados</span><strong>{orders?.length || 0}</strong><small>pedidos válidos</small></article>
        <article><span>Último pedido</span><strong>{latest ? new Date(latest).toLocaleDateString("pt-BR") : "—"}</strong><small>data registrada</small></article>
        <article><span>Reposição sugerida</span><strong>{recommendations.reduce((sum, item) => sum + item.suggestedQuantity, 0)}</strong><small>itens calculados</small></article>
      </div>
      <h3>Histórico por catálogo</h3>
      <div className="catalog-blocks">
        {recommendations.map((item) => <article key={item.category}>{item.urgency === "high" ? <TrendingUp /> : item.urgency === "medium" ? <RotateCcw /> : <PackageCheck />}<div><strong>{item.category}</strong><span>Você já comprou {item.quantity} itens · última compra {item.daysSinceLastOrder ?? "—"} dias</span></div><Link href="/forbody">{item.suggestedQuantity ? `Repor ${item.suggestedQuantity} →` : "Ver catálogo →"}</Link></article>)}
        {!recommendations.length && <div className="status-banner">O histórico aparecerá após o primeiro pedido confirmado da unidade.</div>}
      </div>
    </section>
  </main>;
}
