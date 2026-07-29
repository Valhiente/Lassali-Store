import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { money } from "@/lib/catalog";

export function ProductCard({ product, priceMode = "retail" }: {
  product: Product;
  priceMode?: "retail" | "wholesale" | "unit";
}) {
  const price =
    priceMode === "wholesale" ? product.wholesalePrice :
    priceMode === "unit" ? product.unitPrice :
    product.retailPrice;

  return (
    <article className="product-card">
      <Link href={`/produto/${product.slug}`} className={`product-image ${product.tone}`}>
        {product.badge && <span className="badge">{product.badge}</span>}
        <span className="product-monogram">{product.storefront === "forbody" ? "FB" : "LS"}</span>
      </Link>
      <div className="product-info">
        <p className="eyebrow">{product.category}</p>
        <h3><Link href={`/produto/${product.slug}`}>{product.name}</Link></h3>
        <p className="price">{price ? money(price) : "Preço sob consulta"}</p>
        <p className="installments">ou até 3x sem juros</p>
        <div className="swatches" aria-label="Cores disponíveis">
          {product.colors.map((color) => <span key={color} title={color} />)}
        </div>
      </div>
    </article>
  );
}
