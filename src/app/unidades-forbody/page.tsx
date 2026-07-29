import Link from "next/link";
import { PackageCheck, RotateCcw, Shirt, TrendingUp } from "lucide-react";

export const metadata = { title: "Portal das Unidades Forbody" };

const categories = [
  ["Camisetas", "128 itens", Shirt],
  ["Bonés", "42 itens", PackageCheck],
  ["Galões", "36 itens", RotateCcw],
  ["Shorts e leggings", "74 itens", TrendingUp],
];

export default function UnitPortalPage() {
  return (
    <main className="portal-page">
      <section className="portal-welcome">
        <div><p className="kicker">Portal corporativo Forbody</p><h1>Reposição simples para todas as unidades.</h1><p>Catálogo interno, preços corporativos, acompanhamento e histórico por categoria.</p></div>
        <Link className="button primary" href="/conta/entrar?perfil=unidade">Entrar como unidade</Link>
      </section>
      <section className="dashboard-preview">
        <div className="dashboard-title"><div><p>Visão demonstrativa</p><h2>Olá, Unidade Campo Belo</h2></div><span>Perfil: unidade aprovada</span></div>
        <div className="metric-grid">
          <article><span>Total comprado</span><strong>280</strong><small>itens no período</small></article>
          <article><span>Pedidos realizados</span><strong>12</strong><small>últimos 12 meses</small></article>
          <article><span>Último pedido</span><strong>18/07</strong><small>entregue</small></article>
          <article><span>Reposição sugerida</span><strong>24</strong><small>itens abaixo do ideal</small></article>
        </div>
        <h3>Seu histórico por catálogo</h3>
        <div className="catalog-blocks">
          {categories.map(([name, amount, Icon]) => {
            const CategoryIcon = Icon as typeof Shirt;
            return <article key={String(name)}><CategoryIcon /><div><strong>{String(name)}</strong><span>Você já comprou {String(amount)}</span></div><button>Repor →</button></article>;
          })}
        </div>
      </section>
    </main>
  );
}
