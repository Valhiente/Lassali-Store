"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { useCart } from "./CartProvider";

export function AddToCartButton({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const color = product.colors[0];
  const size = product.sizes[0];
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
  return <button className={compact ? "quick-add" : "button primary full"} onClick={add}>{added ? "Adicionado ✓" : compact ? "Adicionar" : "Adicionar à sacola"}</button>;
}
