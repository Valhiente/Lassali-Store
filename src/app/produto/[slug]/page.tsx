import { notFound } from "next/navigation";
import Image from "next/image";
import { money, products } from "@/lib/catalog";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  return (
    <main className="product-page">
      <div className={`product-gallery product-image ${product.tone}`}>
        {product.image ? (
          <Image
            src={product.image}
            alt={product.imageAlt || product.name}
            fill
            priority
            sizes="(max-width: 950px) 86vw, 50vw"
            className="product-photo"
          />
        ) : (
          <span className="product-monogram">{product.storefront === "forbody" ? "FB" : "LS"}</span>
        )}
      </div>
      <div className="product-detail">
        <p className="eyebrow">{product.category}</p><h1>{product.name}</h1><p className="detail-price">{money(product.retailPrice)}</p><p>{product.description}</p>
        <fieldset><legend>Cor</legend><div className="choice-row">{product.colors.map((color) => <button key={color}>{color}</button>)}</div></fieldset>
        <fieldset><legend>Tamanho</legend><div className="choice-row">{product.sizes.map((size) => <button key={size}>{size}</button>)}</div></fieldset>
        <button className="button primary full">Adicionar à sacola</button>
        <div className="detail-notes"><p>✓ 10% de desconto no Pix</p><p>✓ Troca facilitada</p><p>✓ Envio para todo o Brasil</p></div>
      </div>
    </main>
  );
}
