"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";

export function CartButton() {
  const { count } = useCart();
  return <Link className="cart-button" href="/carrinho" aria-label={`Sacola com ${count} itens`}><ShoppingBag size={20} />{count > 0 && <span>{count}</span>}</Link>;
}
