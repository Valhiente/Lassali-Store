import { notFound } from "next/navigation";
import Image from "next/image";
import { money, products } from "@/lib/catalog";
import { ProductPurchase } from "@/components/ProductPurchase";
import { getForbodyRetailAvailability } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  const availability = product.storefront === "forbody" ? await getForbodyRetailAvailability() : null;
  const availableSkus = availability ? availability[product.slug] || [] : undefined;
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
        <ProductPurchase product={product} availableSkus={availableSkus} />
        <div className="detail-notes"><p>✓ Estoque central compartilhado e atualizado</p><p>✓ Troca facilitada</p><p>✓ Envio para todo o Brasil</p></div>
      </div>
    </main>
  );
}
