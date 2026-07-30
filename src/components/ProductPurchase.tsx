"use client";

import { CreditCard, Heart, MapPin, Ruler, ShieldCheck, Truck } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { money } from "@/lib/catalog";
import { useCart } from "./CartProvider";

function skuFor(product: Product, color: string, size: string) {
  return `${product.slug}-${color}-${size}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function ProductPurchase({
  product,
  availableStock,
  selectedColor,
  onColorChange,
}: {
  product: Product;
  availableStock?: Record<string, number>;
  selectedColor: string;
  onColorChange: (color: string) => void;
}) {
  const { addItem } = useCart();
  const availableSkus = availableStock ? Object.keys(availableStock).filter((sku) => availableStock[sku] > 0) : undefined;
  const firstAvailableSize = product.sizes.find((candidate) => availableSkus === undefined || availableSkus.includes(skuFor(product, selectedColor, candidate)));
  const [size, setSize] = useState(firstAvailableSize || product.sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [cep, setCep] = useState("");
  const [shippingMessage, setShippingMessage] = useState("");
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const selectedSku = skuFor(product, selectedColor, size);
  const selectedStock = availableStock?.[selectedSku];
  const selectedAvailable = availableStock === undefined || Number(selectedStock) > 0;
  const maxQuantity = availableStock === undefined ? 10 : Math.min(Number(selectedStock) || 0, 10);
  const pixPrice = product.retailPrice * 0.9;

  function add(goToCheckout = false) {
    if (!selectedAvailable) return;
    addItem({
      sku: selectedSku,
      slug: product.slug,
      name: product.name,
      image: product.image,
      color: selectedColor,
      size,
      price: product.retailPrice,
    }, quantity);
    if (goToCheckout) {
      window.location.assign("/checkout");
      return;
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  function selectColor(color: string) {
    onColorChange(color);
    const nextSize = product.sizes.find((candidate) => availableSkus === undefined || availableSkus.includes(skuFor(product, color, candidate)));
    if (nextSize) setSize(nextSize);
    setQuantity(1);
  }

  function calculateShipping() {
    const digits = cep.replace(/\D/g, "");
    setShippingMessage(digits.length === 8
      ? "CEP confirmado. Prazo e valor serão calculados no checkout."
      : "Informe um CEP válido com 8 números.");
  }

  return (
    <aside className="purchase-panel">
      <div className="purchase-topline">
        <span>Novo {product.soldCount ? `· +${product.soldCount} vendidos` : "· coleção oficial"}</span>
        <button type="button" className={favorite ? "favorite active" : "favorite"} onClick={() => setFavorite((current) => !current)} aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}><Heart fill={favorite ? "currentColor" : "none"} /></button>
      </div>
      {product.badge ? <span className="commerce-badge">{product.badge}</span> : null}
      <h1>{product.name}</h1>
      <div className="rating-row" aria-label={product.reviewCount ? `${product.rating} de 5` : "Produto ainda sem avaliações"}>
        <span>{product.reviewCount ? product.rating?.toFixed(1) : "Novo"}</span>
        <span className="stars">★★★★★</span>
        <a href="#avaliacoes">{product.reviewCount ? `(${product.reviewCount})` : "Seja a primeira pessoa a avaliar"}</a>
      </div>
      <p className="product-summary">{product.description}</p>

      <div className="commerce-price">
        <strong>{money(product.retailPrice)}</strong>
        <span>ou 3x de {money(product.retailPrice / 3)} sem juros</span>
        <b>{money(pixPrice)} no Pix <em>10% OFF</em></b>
      </div>
      <details className="payment-details">
        <summary><CreditCard size={17} /> Ver meios de pagamento</summary>
        <p>Pix com desconto ou cartão em até 3 parcelas sem juros. A confirmação acontece no checkout seguro.</p>
      </details>

      <div className="delivery-box">
        <div><Truck size={21} /><p><strong>Entrega para todo o Brasil</strong><span>Consulte prazo e valor com seu CEP.</span></p></div>
        <div className="cep-form"><input value={cep} onChange={(event) => setCep(event.target.value.slice(0, 9))} inputMode="numeric" placeholder="00000-000" aria-label="CEP" /><button type="button" onClick={calculateShipping}>Calcular</button></div>
        {shippingMessage ? <small className={shippingMessage.startsWith("Informe") ? "error-text" : "success-text"}><MapPin size={13} /> {shippingMessage}</small> : null}
      </div>

      <fieldset className="variant-fieldset">
        <legend>Cor: <strong>{selectedColor}</strong></legend>
        <div className="color-options">
          {product.colors.map((color) => {
            const colorAvailable = product.sizes.some((candidate) => availableSkus === undefined || availableSkus.includes(skuFor(product, color, candidate)));
            return <button key={color} type="button" className={selectedColor === color ? "selected" : ""} aria-pressed={selectedColor === color} disabled={!colorAvailable} onClick={() => selectColor(color)}><span className={`color-dot color-${color.toLowerCase().replace(/[^a-z]+/g, "-")}`} />{color}</button>;
          })}
        </div>
      </fieldset>

      <fieldset className="variant-fieldset">
        <div className="variant-heading"><legend>Tamanho: <strong>{size}</strong></legend><button type="button" onClick={() => setShowSizeGuide((current) => !current)}><Ruler size={15} /> Guia de tamanhos</button></div>
        <div className="size-options">
          {product.sizes.map((option) => {
            const sizeAvailable = availableSkus === undefined || availableSkus.includes(skuFor(product, selectedColor, option));
            return <button key={option} type="button" aria-pressed={size === option} className={size === option ? "selected" : ""} disabled={!sizeAvailable} onClick={() => { setSize(option); setQuantity(1); }}>{option}</button>;
          })}
        </div>
        {showSizeGuide ? <div className="size-guide"><strong>Referência de medidas</strong><p>P: 34–36 · M: 38–40 · G: 42–44 · GG: 46–48 · XG: 50</p><small>As medidas podem variar de acordo com a modelagem do produto.</small></div> : null}
      </fieldset>

      <div className="quantity-stock">
        <label>Quantidade<select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} disabled={!selectedAvailable}>{Array.from({ length: Math.max(maxQuantity, 1) }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <span>{selectedAvailable ? selectedStock !== undefined && selectedStock <= 5 ? `Últimas ${selectedStock} unidades` : "Disponível em estoque" : "Variação esgotada"}</span>
      </div>

      <div className="purchase-actions">
        <button className="button primary full" type="button" onClick={() => add(true)} disabled={!selectedAvailable}>Comprar agora</button>
        <button className="button secondary full" type="button" onClick={() => add(false)} disabled={!selectedAvailable}>{added ? "Adicionado à sacola ✓" : "Adicionar à sacola"}</button>
      </div>
      <div className="purchase-protection"><p><ShieldCheck size={18} /><span><strong>Compra protegida</strong>Pagamento e dados processados com segurança.</span></p><p><Truck size={18} /><span><strong>Troca facilitada</strong>Solicite troca ou devolução conforme nossa política.</span></p></div>
    </aside>
  );
}
