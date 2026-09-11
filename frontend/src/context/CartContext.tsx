import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Variant = {
  name: string;
  sku: string;
  stock: number;
};

export type Product = {
  id: string;
  name: string;
  categories: string[];
  image: string;
  price: number;
  original_price?: number | null;
  description: string;
  currency: string;
  sizes: string[];
  sku?: string | null;
  stock?: number | null;
  variants: Variant[];
};

export type CartLine = {
  product: Product;
  quantity: number;
  variant?: string | null;
  size?: string | null;
};

type CartState = {
  items: Record<string, CartLine>;
  count: number;
  subtotal: number;
  addItem: (p: Product, opts?: { variant?: string | null; size?: string | null; qty?: number }) => void;
  increment: (key: string) => void;
  decrement: (key: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartState | null>(null);
const STORAGE_KEY = "@sorayaco/cart";

// Composite key so different variants/sizes of the same product live as separate lines.
export function lineKey(productId: string, variant?: string | null, size?: string | null) {
  return `${productId}::${variant ?? ""}::${size ?? ""}`;
}

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

  const addItem = useCallback<CartState["addItem"]>((p, opts) => {
    const variant = opts?.variant ?? null;
    const size = opts?.size ?? null;
    const qty = opts?.qty ?? 1;
    const key = lineKey(p.id, variant, size);
    setItems((prev) => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: {
          product: p,
          quantity: (existing?.quantity ?? 0) + qty,
          variant,
          size,
        },
      };
    });
  }, []);

  const increment = useCallback((key: string) => {
    setItems((prev) => {
      const line = prev[key];
      if (!line) return prev;
      return { ...prev, [key]: { ...line, quantity: line.quantity + 1 } };
    });
  }, []);

  const decrement = useCallback((key: string) => {
    setItems((prev) => {
      const line = prev[key];
      if (!line) return prev;
      if (line.quantity <= 1) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: { ...line, quantity: line.quantity - 1 } };
    });
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => {
      const { [key]: _, ...rest } = prev;
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

// Indonesian rupiah — thousands separated by dots, no decimals. e.g. Rp79.000
export function formatPrice(amount: number) {
  const whole = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp${whole}`;
}
