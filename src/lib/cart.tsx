import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { products } from "@/data/catalog";
import { STORE } from "@/lib/api";

export interface CartLine {
  productId: string;
  variantId: string;
  qty: number;
}

interface CartCtx {
  lines: CartLine[];
  detailed: { line: CartLine; product: (typeof products)[number]; variant: (typeof products)[number]["variants"][number] }[];
  count: number;
  subtotal: number;
  delivery: number;
  total: number;
  open: boolean;
  setOpen: (o: boolean) => void;
  add: (productId: string, variantId: string, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
}

// Keep one context instance across hot reloads so provider and consumers always match.
const g = globalThis as { __pistaraCartCtx?: React.Context<CartCtx | null> };
const Ctx = (g.__pistaraCartCtx ??= createContext<CartCtx | null>(null));
const KEY = "pistara-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* ignore corrupt cart */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, loaded]);

  const value = useMemo<CartCtx>(() => {
    const detailed = lines.flatMap((line) => {
      const product = products.find((p) => p.id === line.productId);
      const variant = product?.variants.find((v) => v.id === line.variantId);
      return product && variant ? [{ line, product, variant }] : [];
    });
    const subtotal = detailed.reduce((s, d) => s + d.variant.price * d.line.qty, 0);
    const delivery = detailed.length ? STORE.deliveryCharge : 0;
    return {
      lines, detailed, open, setOpen, subtotal, delivery, total: subtotal + delivery,
      count: lines.reduce((s, l) => s + l.qty, 0),
      add: (productId, variantId, qty = 1) =>
        setLines((ls) => {
          const ex = ls.find((l) => l.variantId === variantId);
          return ex
            ? ls.map((l) => (l.variantId === variantId ? { ...l, qty: l.qty + qty } : l))
            : [...ls, { productId, variantId, qty }];
        }),
      setQty: (variantId, qty) =>
        setLines((ls) => (qty <= 0 ? ls.filter((l) => l.variantId !== variantId) : ls.map((l) => (l.variantId === variantId ? { ...l, qty } : l)))),
      remove: (variantId) => setLines((ls) => ls.filter((l) => l.variantId !== variantId)),
    };
  }, [lines, open]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
