import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Buyer, CartLine } from '../../domain/types';
import {
  addLine,
  BUYER_STORAGE_KEY,
  CART_STORAGE_KEY,
  cartItemCount,
  cartSubtotal,
  hydrateBuyer,
  hydrateCart,
  removeLine,
  serializeCart,
  setQuantity,
} from './cart';
import { getProduct } from '../../data/catalog';

export function priceLookup(productId: string, variantLabel: string): number {
  const p = getProduct(productId);
  if (!p) return 0;
  const v = p.variants.find((x) => x.label === variantLabel) ?? p.variants[0];
  return v?.priceVnd ?? 0;
}

type CartCtx = {
  lines: CartLine[];
  buyer: Buyer;
  itemCount: number;
  subtotal: number;
  add: (line: CartLine) => void;
  setQty: (index: number, qty: number) => void;
  remove: (index: number) => void;
  clear: () => void;
  setBuyer: (b: Buyer) => void;
};

const Ctx = createContext<CartCtx | null>(null);

function safeStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  try {
    const k = '__af_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    return null; // blocked/full storage → in-memory operation continues (docs/04)
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => hydrateCart(safeStorage()?.getItem(CART_STORAGE_KEY) ?? null));
  const [buyer, setBuyerState] = useState<Buyer>(() => hydrateBuyer(safeStorage()?.getItem(BUYER_STORAGE_KEY) ?? null));

  useEffect(() => {
    safeStorage()?.setItem(CART_STORAGE_KEY, serializeCart(lines));
  }, [lines]);

  const setBuyer = useCallback((b: Buyer) => {
    setBuyerState(b);
    safeStorage()?.setItem(BUYER_STORAGE_KEY, JSON.stringify(b));
  }, []);

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      buyer,
      itemCount: cartItemCount(lines),
      subtotal: cartSubtotal(lines, priceLookup),
      add: (line) => setLines((c) => addLine(c, line)),
      setQty: (i, q) => setLines((c) => setQuantity(c, i, q)),
      remove: (i) => setLines((c) => removeLine(c, i)),
      clear: () => setLines([]),
      setBuyer,
    }),
    [lines, buyer, setBuyer]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCart outside CartProvider');
  return v;
}
