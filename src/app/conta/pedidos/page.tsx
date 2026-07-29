import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { createSecretClient } from "@/lib/supabase/server";
import { money } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meus pedidos" };

export default async function OrdersPage() {
  const account = await requireAccount();
  const secret = createSecretClient();
  const { data: orders } = secret ? await secret.from("orders").select("id, status, channel, total, created_at").eq("user_id", account.userId).order("created_at", { ascending: false }) : { data: [] };
  return <main className="account-page"><p className="eyebrow">Minha conta</p><h1>Pedidos</h1><div className="order-list">{(orders || []).map((order) => <article key={order.id}><div><strong>#{order.id.slice(0,8)}</strong><span>{new Date(order.created_at).toLocaleDateString("pt-BR")} · {order.channel}</span></div><div><strong>{money(Number(order.total))}</strong><span>{order.status}</span></div></article>)}{!orders?.length && <div className="status-banner">Você ainda não possui pedidos.</div>}</div><Link href="/conta">Voltar à conta</Link></main>;
}
