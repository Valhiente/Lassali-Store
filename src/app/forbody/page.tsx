import { ProductCard } from "@/components/ProductCard";
import { products } from "@/lib/catalog";

export const metadata = { title: "Produtos Forbody" };

export default function ForbodyPage() {
  const forbody = products.filter((product) => product.storefront === "forbody");
  return (
    <main>
      <section className="subhero forbody-hero">
        <p className="kicker">Forbody × Lassali</p>
        <h1>Leve a atitude Forbody com você</h1>
        <p>Produtos oficiais para alunos, professores e apaixonados por treino.</p>
      </section>
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">Coleção oficial</p><h2>Performance dentro e fora da academia</h2></div></div>
        <div className="product-grid">{forbody.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
      </section>
    </main>
  );
}
