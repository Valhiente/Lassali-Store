import Link from "next/link";
import { PackageCheck, RotateCcw, TrendingUp } from "lucide-react";
import { requireForbodyUnit } from "@/lib/auth";
import { createSecretClient } from "@/lib/supabase/server";
import { calculateReplenishment } from "@/lib/replenishment";
import { UnitStockOrderForm } from "@/components/UnitStockOrderForm";
import { createUnitStockRequest } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portal das Unidades Forbody" };

type InventoryRow = {
  id: string;
  sku: string;
  color: string | null;
  size: string | null;
  stock: number;
  reserved_stock: number;
  retail_safety_stock: number;
  products: { name: string; unit_enabled: boolean; storefront: string } | { name: string; unit_enabled: boolean; storefront: string }[];
};

export default async function UnitPortalPage() {
  const account = await requireForbodyUnit();
  const secret = createSecretClient();
  const [confirmedResult, requestsResult, inventoryResult] = secret
    ? await Promise.all([
        secret.from("orders").select("id, created_at, status, order_items(category, quantity)").eq("organization_id", account.organizationId).in("status", ["paid","processing","shipped","delivered"]).order("created_at", { ascending: false }),
        secret.from("orders").select("id, created_at, status, order_items(product_name, sku, quantity)").eq("organization_id", account.organizationId).eq("channel", "forbody_unit").order("created_at", { ascending: false }).limit(20),
        secret.from("product_variants").select("id, sku, color, size, stock, reserved_stock, retail_safety_stock, products!inner(name, unit_enabled, storefront)").eq("active", true).eq("products.unit_enabled", true).eq("products.storefront", "forbody").order("sku"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const orders = confirmedResult.data || [];
  const requests = requestsResult.data || [];
  const inventory = (inventoryResult.data || []) as unknown as InventoryRow[];
  const options = inventory.map((variant) => {
    const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
    return {
      id: variant.id,
      label: `${product?.name || variant.sku} · ${variant.color || "Padrão"} · ${variant.size || "Único"}`,
      available: Math.max(variant.stock - variant.reserved_stock - variant.retail_safety_stock, 0),
    };
  });
  const recommendations = calculateReplenishment(orders as never[]);
  const totalItems = recommendations.reduce((sum, item) => sum + item.quantity, 0);
  const latest = orders[0]?.created_at;
  const totalAvailable = options.reduce((sum, option) => sum + option.available, 0);

  return <main className="portal-page">
    <section className="portal-welcome">
      <div><p className="kicker">Portal corporativo Forbody</p><h1>Olá, {account.organizationName}</h1><p>O estoque é central e compartilhado com o varejo. Seu pedido reserva o saldo imediatamente.</p></div>
      <Link className="button ghost" href="/forbody">Ver loja do consumidor</Link>
    </section>
    <section className="dashboard-preview">
      <div className="dashboard-title"><div><p>Dados da organização</p><h2>Visão de abastecimento</h2></div><span>Perfil: unidade aprovada</span></div>
      <div className="metric-grid">
        <article><span>Total comprado</span><strong>{totalItems}</strong><small>itens confirmados</small></article>
        <article><span>Pedidos realizados</span><strong>{requests.length}</strong><small>solicitações registradas</small></article>
        <article><span>Último pedido</span><strong>{latest ? new Date(latest).toLocaleDateString("pt-BR") : "—"}</strong><small>data confirmada</small></article>
        <article><span>Disponível à unidade</span><strong>{totalAvailable}</strong><small>estoque após reservas do varejo</small></article>
      </div>

      <h3>Solicitar reposição do estoque central</h3>
      <p className="privacy-note">A solicitação cria uma reserva por sete dias. Após aprovação, o saldo físico é baixado e o pedido segue para separação.</p>
      <UnitStockOrderForm action={createUnitStockRequest} options={options} />

      <h3>Pedidos recentes</h3>
      <div className="order-list">
        {requests.map((order) => {
          const items = order.order_items || [];
          const amount = items.reduce((sum, item) => sum + item.quantity, 0);
          return <article key={order.id}><div><strong>Pedido {order.id.slice(0, 8)}</strong><span>{amount} item(ns) · {new Date(order.created_at).toLocaleDateString("pt-BR")}</span></div><b>{order.status === "draft" ? "Aguardando aprovação" : order.status}</b></article>;
        })}
        {!requests.length ? <div className="status-banner">Nenhum pedido de reposição registrado.</div> : null}
      </div>

      <h3>Histórico por catálogo</h3>
      <div className="catalog-blocks">
        {recommendations.map((item) => <article key={item.category}>{item.urgency === "high" ? <TrendingUp /> : item.urgency === "medium" ? <RotateCcw /> : <PackageCheck />}<div><strong>{item.category}</strong><span>Você já comprou {item.quantity} itens · última compra {item.daysSinceLastOrder ?? "—"} dias</span></div><span>{item.suggestedQuantity ? `Sugestão: ${item.suggestedQuantity}` : "Estoque regular"}</span></article>)}
        {!recommendations.length && <div className="status-banner">O histórico aparecerá após o primeiro pedido confirmado da unidade.</div>}
      </div>
    </section>
  </main>;
}
