import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/lib/catalog";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">Nova coleção · movimento 24/7</p>
          <h1>Vista sua força.<br />Viva seu ritmo.</h1>
          <p>Moda fitness versátil, confortável e feita para acompanhar todos os corpos.</p>
          <div className="actions">
            <Link className="button primary" href="#catalogo">Comprar agora</Link>
            <Link className="button ghost" href="/atacado">Comprar no atacado</Link>
          </div>
        </div>
        <div className="hero-art">
          <Image
            src="/images/lassali/lassali-02.jpg"
            alt="Moda fitness Lassali em frente à loja de Ribeirão Preto"
            fill
            priority
            sizes="(max-width: 950px) 88vw, 44vw"
            className="hero-photo"
          />
          <div className="hero-stamp"><span>LASSALI</span><b>MOVE</b></div>
        </div>
      </section>

      <section className="benefit-strip">
        <div><strong>10% OFF</strong><span>no pagamento via Pix</span></div>
        <div><strong>Primeira troca</strong><span>facilitada</span></div>
        <div><strong>Compra protegida</strong><span>do pagamento à entrega</span></div>
        <div><strong>Atendimento humano</strong><span>pelo WhatsApp</span></div>
      </section>

      <section className="section" id="novidades">
        <div className="section-heading"><div><p className="eyebrow">Escolhas Lassali</p><h2>Novidades para o seu ritmo</h2></div><Link href="#catalogo">Ver todos →</Link></div>
        <div className="product-grid">
          {products.filter((product) => product.storefront === "lassali").map((product) => <ProductCard key={product.slug} product={product} />)}
        </div>
      </section>

      <section className="portal-grid">
        <Link href="/atacado" className="portal-card wholesale"><p>Para lojistas</p><h2>Atacado Lassali</h2><span>Cadastre seu CNPJ e acesse condições exclusivas →</span></Link>
        <Link href="/forbody" className="portal-card forbody"><p>Collab oficial</p><h2>Produtos Forbody</h2><span>Camisetas, acessórios e linha de treino →</span></Link>
        <Link href="/unidades-forbody" className="portal-card units"><p>Acesso restrito</p><h2>Portal das Unidades</h2><span>Reposição, histórico e gestão de pedidos →</span></Link>
      </section>

      <section className="editorial">
        <div className="editorial-image">
          <Image
            src="/images/lassali/lassali-04.jpg"
            alt="Look fitness colorido da Lassali para treino e uso casual"
            fill
            sizes="(max-width: 620px) 100vw, 45vw"
            className="editorial-photo"
          />
        </div>
        <div className="editorial-copy">
          <p className="eyebrow">Do treino para a vida</p>
          <h2>Movimento, cor e liberdade.</h2>
          <p>Peças versáteis para musculação, caminhada e para os momentos em que conforto também faz parte do estilo.</p>
          <Link className="button ghost" href="#catalogo">Explorar coleção</Link>
        </div>
      </section>

      <section className="section" id="catalogo">
        <div className="section-heading"><div><p className="eyebrow">Catálogo</p><h2>Treine do seu jeito</h2></div></div>
        <div className="category-row">
          {["Conjuntos", "Leggings", "Tops", "Shorts", "Macaquinhos", "Jaquetas", "Outlet"].map((category) => <button key={category}>{category}</button>)}
        </div>
      </section>
    </main>
  );
}
