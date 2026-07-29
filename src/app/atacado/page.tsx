import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/lib/catalog";

export const metadata = { title: "Atacado" };

export default function WholesalePage() {
  return (
    <main>
      <section className="subhero wholesale-hero">
        <p className="kicker">Lassali para lojistas</p>
        <h1>Atacado com fabricação própria</h1>
        <p>Cadastre seu CNPJ para acessar preços, grades, kits e condições comerciais.</p>
        <Link className="button primary" href="/conta/cadastro-atacado">Solicitar cadastro</Link>
      </section>
      <section className="section">
        <div className="steps">
          <div><b>01</b><h3>Cadastre a empresa</h3><p>Dados do responsável, CNPJ e endereço comercial.</p></div>
          <div><b>02</b><h3>Aguarde a aprovação</h3><p>Nossa equipe valida o cadastro e libera o perfil.</p></div>
          <div><b>03</b><h3>Compre no atacado</h3><p>Preços exclusivos, pedido mínimo e histórico completo.</p></div>
        </div>
        <div className="section-heading"><div><p className="eyebrow">Prévia do catálogo</p><h2>Produtos disponíveis</h2></div></div>
        <div className="product-grid">
          {products.filter((p) => p.storefront === "lassali").map((product) => <ProductCard key={product.slug} product={product} priceMode="wholesale" />)}
        </div>
        <p className="privacy-note">Na operação final, preços de atacado serão exibidos somente a CNPJs aprovados.</p>
      </section>
    </main>
  );
}
