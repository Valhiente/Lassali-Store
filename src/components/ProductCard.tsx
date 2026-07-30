import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/catalog";
import { money } from "@/lib/catalog";
import { AddToCartButton } from "./AddToCartButton";

export function ProductCard({ product, availableSkus }: { product: Product; availableSkus?: string[] }) {
  const outOfStock = availableSkus !== undefined && availableSkus.length === 0;
  return (
    <article className="product-card">
      <Link href={`/produto/${product.slug}`} className={`product-image ${product.tone}`}>
        {product.badge && <span className="badge">{product.badge}</span>}
        {outOfStock ? <span className="badge">Esgotado</span> : null}
        {product.image ? (
          <Image
            src={product.image}
            alt={product.imageAlt || product.name}
            fill
            sizes="(max-width: 620px) 100vw, (max-width: 950px) 50vw, 33vw"
            className="product-photo"
          />
        ) : (
          <span className="product-monogram">{product.storefront === "forbody" ? "FB" : "LS"}</span>
        )}
      </Link>
      <div className="product-info">
        <p className="eyebrow">{product.category}</p>
        <h3><Link href={`/produto/${product.slug}`}>{product.name}</Link></h3>
        <p className="price">{money(product.retailPrice)}</p>
        <p className="installments">{outOfStock ? "Avise-me quando voltar" : "ou até 3x sem juros"}</p>
        <div className="swatches">
          {product.colors.map((color) => <span key={color} role="img" aria-label={color} title={color} />)}
        </div>
        <AddToCartButton product={product} compact availableSkus={availableSkus} />
      </div>
    </article>
  );
}
