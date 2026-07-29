"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { useCart } from "./CartProvider";

export function ProductPurchase({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [color, setColor] = useState(product.colors[0]);
  const [size, setSize] = useState(product.sizes[0]);
  const [added, setAdded] = useState(false);

  function add() {
    addItem({
      sku: `${product.slug}-${color}-${size}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
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
          {product.colors.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={color === option}
              className={color === option ? "selected" : ""}
              onClick={() => setColor(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Tamanho</legend>
        <div className="choice-row">
          {product.sizes.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={size === option}
              className={size === option ? "selected" : ""}
              onClick={() => setSize(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>
      <button className="button primary full" type="button" onClick={add}>
        {added ? "Adicionado ✓" : "Adicionar à sacola"}
      </button>
    </>
  );
}
