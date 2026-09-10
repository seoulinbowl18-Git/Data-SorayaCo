import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Product = {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number;
  original_price?: number | null;
  description: string;
  currency: string;
};

export type CartLine = {
  product: Product;
  quantity: number;
};

type CartState = {
  items: Record<string, CartLine>;
  count: number;
  subtotal: number;
  addItem: (p: Product, qty?: number) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  removeItem: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartState | null>(null);
const STORAGE_KEY = "@brodo/cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Record<string, CartLine>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setItems(JSON.parse(raw));
      } catch {}
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {});
  }, [items, hydrated]);

  const addItem = useCallback((p: Product, qty = 1) => {
    setItems((prev) => {
      const existing = prev[p.id];
      return {
        ...prev,
        [p.id]: { product: p, quantity: (existing?.quantity ?? 0) + qty },
      };
    });
  }, []);

  const increment = useCallback((id: string) => {
    setItems((prev) => {
      const line = prev[id];
      if (!line) return prev;
      return { ...prev, [id]: { ...line, quantity: line.quantity + 1 } };
    });
  }, []);

  const decrement = useCallback((id: string) => {
    setItems((prev) => {
      const line = prev[id];
      if (!line) return prev;
      if (line.quantity <= 1) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...line, quantity: line.quantity - 1 } };
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clear = useCallback(() => setItems({}), []);

  const { count, subtotal } = useMemo(() => {
    let c = 0;
    let s = 0;
    for (const line of Object.values(items)) {
      c += line.quantity;
      s += line.quantity * line.product.price;
    }
    return { count: c, subtotal: s };
  }, [items]);

  const value: CartState = {
    items,
    count,
    subtotal,
    addItem,
    increment,
    decrement,
    removeItem,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function formatPrice(cents: number, currency = "USD") {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}
