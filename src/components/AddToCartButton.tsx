"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { useCart } from "./CartProvider";

function skuFor(product: Product, color: string, size: string) {
  return `${product.slug}-${color}-${size}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function AddToCartButton({ product, compact = false, availableSkus }: { product: Product; compact?: boolean; availableSkus?: string[] }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const firstAvailable = product.colors.flatMap((color) => product.sizes.map((size) => ({ color, size, sku: skuFor(product, color, size) }))).find((variant) => availableSkus === undefined || availableSkus.includes(variant.sku));
  function add() {
    if (!firstAvailable) return;
    addItem({
      sku: firstAvailable.sku,
      slug: product.slug,
      name: product.name,
      image: product.image,
      color: firstAvailable.color,
      size: firstAvailable.size,
      price: product.retailPrice,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }
  const label = !firstAvailable ? "Esgotado" : added ? "Adicionado ✓" : compact ? "Adicionar" : "Adicionar à sacola";
  return <button type="button" className={compact ? "quick-add" : "button primary full"} onClick={add} disabled={!firstAvailable}>{label}</button>;
}
