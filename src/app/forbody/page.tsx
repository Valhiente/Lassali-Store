import { ProductCard } from "@/components/ProductCard";
import { products } from "@/lib/catalog";
import { getForbodyRetailAvailability } from "@/lib/inventory";

export const dynamic = "force-dynamic";
export const metadata = { title: "Produtos Forbody" };

export default async function ForbodyPage() {
  const forbody = products.filter((product) => product.storefront === "forbody");
  const availability = await getForbodyRetailAvailability();
  return (
    <main>
      <section className="subhero forbody-hero">
        <p className="kicker">Forbody × Lassali</p>
        <h1>Leve a atitude Forbody com você</h1>
        <p>Produtos oficiais para alunos, professores e apaixonados por treino.</p>
      </section>
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">Coleção oficial</p><h2>Performance dentro e fora da academia</h2></div></div>
        <div className="product-grid">{forbody.map((product) => <ProductCard key={product.slug} product={product} availableSkus={availability[product.slug] || []} />)}</div>
      </section>
    </main>
  );
}
