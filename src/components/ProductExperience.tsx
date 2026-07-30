"use client";

import Link from "next/link";
import { CheckCircle, RotateCcw, Star } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { ProductGallery } from "./ProductGallery";
import { ProductPurchase } from "./ProductPurchase";

export function ProductExperience({ product, availableStock }: { product: Product; availableStock?: Record<string, number> }) {
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  return (
    <main className="commerce-product-page">
      <nav className="product-breadcrumb" aria-label="Navegação estrutural">
        <Link href="/">Início</Link><span>›</span><Link href={product.storefront === "forbody" ? "/forbody" : "/#novidades"}>{product.storefront === "forbody" ? "Forbody" : "Lassali"}</Link><span>›</span><span>{product.category}</span>
      </nav>
      <div className="commerce-product-layout">
        <ProductGallery key={selectedColor} product={product} selectedColor={selectedColor} />
        <ProductPurchase product={product} availableStock={availableStock} selectedColor={selectedColor} onColorChange={setSelectedColor} />
      </div>

      <section className="product-information">
        <article>
          <p className="eyebrow">Detalhes do produto</p>
          <h2>Feito para acompanhar o seu movimento</h2>
          <p>{product.description}</p>
          <p>{product.composition}</p>
          <ul>{product.benefits?.map((benefit) => <li key={benefit}><CheckCircle size={17} /> {benefit}</li>)}</ul>
        </article>
        <article>
          <p className="eyebrow">Cuidados</p>
          <h2>Conserve sua peça por mais tempo</h2>
          <p>Lave com cores semelhantes, não utilize alvejante e evite secadora. Consulte a etiqueta da peça para instruções específicas.</p>
          <div className="care-symbols"><span>30°</span><span>△</span><span>▢</span></div>
        </article>
      </section>

      <section className="reviews-section" id="avaliacoes">
        <div><p className="eyebrow">Avaliações</p><h2>Experiência de quem comprou</h2></div>
        {product.reviewCount ? (
          <div className="review-summary"><strong>{product.rating?.toFixed(1)}</strong><span>★★★★★</span><small>{product.reviewCount} avaliações verificadas</small></div>
        ) : (
          <div className="empty-reviews"><Star /><div><strong>Este produto ainda não possui avaliações</strong><p>Depois da entrega, clientes verificados poderão contar como foi a experiência.</p></div></div>
        )}
        <div className="return-note"><RotateCcw /><p><strong>Troca e devolução facilitadas</strong><span>Você poderá solicitar atendimento pela sua conta, respeitando os prazos e condições da política da loja.</span></p></div>
      </section>
    </main>
  );
}
