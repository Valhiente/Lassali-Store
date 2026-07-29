"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { useCart } from "./CartProvider";

function skuFor(product: Product, color: string, size: string) {
  return `${product.slug}-${color}-${size}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function ProductPurchase({ product, availableSkus }: { product: Product; availableSkus?: string[] }) {
  const { addItem } = useCart();
  const firstAvailable = product.colors.flatMap((color) => product.sizes.map((size) => ({ color, size, sku: skuFor(product, color, size) }))).find((variant) => availableSkus === undefined || availableSkus.includes(variant.sku));
  const [color, setColor] = useState(firstAvailable?.color || product.colors[0]);
  const [size, setSize] = useState(firstAvailable?.size || product.sizes[0]);
  const [added, setAdded] = useState(false);
  const selectedSku = skuFor(product, color, size);
  const selectedAvailable = availableSkus === undefined || availableSkus.includes(selectedSku);

  function add() {
    if (!selectedAvailable) return;
    addItem({
      sku: selectedSku,
      slug: product.slug,
      name: product.name,
      image: product.image,
      color,
      size,
      price: product.retailPrice,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <>
      <fieldset>
        <legend>Cor</legend>
        <div className="choice-row">
          {product.colors.map((option) => {
            const colorAvailable = product.sizes.some((candidateSize) => availableSkus === undefined || availableSkus.includes(skuFor(product, option, candidateSize)));
            return <button
              key={option}
              type="button"
              aria-pressed={color === option}
              className={color === option ? "selected" : ""}
              disabled={!colorAvailable}
              onClick={() => {
                setColor(option);
                if (!(availableSkus === undefined || availableSkus.includes(skuFor(product, option, size)))) {
                  const nextSize = product.sizes.find((candidateSize) => availableSkus?.includes(skuFor(product, option, candidateSize)));
                  if (nextSize) setSize(nextSize);
                }
              }}
            >
              {option}
            </button>;
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend>Tamanho</legend>
        <div className="choice-row">
          {product.sizes.map((option) => {
            const sizeAvailable = availableSkus === undefined || availableSkus.includes(skuFor(product, color, option));
            return <button
              key={option}
              type="button"
              aria-pressed={size === option}
              className={size === option ? "selected" : ""}
              disabled={!sizeAvailable}
              onClick={() => setSize(option)}
            >
              {option}
            </button>;
          })}
        </div>
      </fieldset>
      <button className="button primary full" type="button" onClick={add} disabled={!selectedAvailable}>
        {!selectedAvailable ? "Variação esgotada" : added ? "Adicionado ✓" : "Adicionar à sacola"}
      </button>
    </>
  );
}
