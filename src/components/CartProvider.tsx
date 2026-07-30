"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type CartItem = {
  sku: string;
  slug: string;
  name: string;
  image?: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (sku: string, quantity: number) => void;
  removeItem: (sku: string) => void;
  clear: () => void;
  sessionToken: string | null;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "lassali-cart-v2";
const TOKEN_KEY = "lassali-cart-token";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const token = localStorage.getItem(TOKEN_KEY) || crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSessionToken(token);
      if (stored) {
        try { setItems(JSON.parse(stored)); } catch { localStorage.removeItem(STORAGE_KEY); }
      }
      hydrated.current = true;
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated.current || !sessionToken) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    const timeout = window.setTimeout(() => {
      fetch("/api/cart/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, items }),
        keepalive: true,
      }).catch(() => undefined);
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [items, sessionToken]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    const safeQuantity = Math.max(1, Math.min(Math.floor(quantity), 99));
    setItems((current) => {
      const found = current.find((entry) => entry.sku === item.sku);
      if (found) return current.map((entry) => entry.sku === item.sku ? { ...entry, quantity: Math.min(entry.quantity + safeQuantity, 99) } : entry);
      return [...current, { ...item, quantity: safeQuantity }];
    });
  }, []);
  const setQuantity = useCallback((sku: string, quantity: number) => {
    if (quantity <= 0) setItems((current) => current.filter((item) => item.sku !== sku));
    else setItems((current) => current.map((item) => item.sku === sku ? { ...item, quantity: Math.min(quantity, 99) } : item));
  }, []);
  const removeItem = useCallback((sku: string) => setItems((current) => current.filter((item) => item.sku !== sku)), []);
  const clear = useCallback(() => setItems([]), []);
  const value = useMemo(() => ({
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.price * item.quantity, 0),
    addItem,
    setQuantity,
    removeItem,
    clear,
    sessionToken,
  }), [items, addItem, setQuantity, removeItem, clear, sessionToken]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
