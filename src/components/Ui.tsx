// Global UI overlays (cart drawer, Zalo handoff sheet, lightbox, toast) — state holder only.
// Components render them in OverlayHost; keeping this context overlay-free avoids import cycles.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type ZsPayload = {
  title: string;
  text: string;
  summary?: { image: string; name: string; lines: string[] } | null;
  onDone?: () => void;
};

type UiCtx = {
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  zs: ZsPayload | null;
  openZs: (p: ZsPayload) => void;
  closeZs: () => void;
  lightbox: { images: string[]; index: number } | null;
  openLightbox: (images: string[], index: number) => void;
  closeLightbox: () => void;
  toast: (msg: string) => void;
  toastMsg: string;
};

const Ctx = createContext<UiCtx | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [zs, setZs] = useState<ZsPayload | null>(null);
  const [lightbox, setLightbox] = useState<UiCtx['lightbox']>(null);
  const [toastMsg, setToastMsg] = useState('');

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(''), msg.length > 40 ? 6000 : 3000);
  }, []);

  const value = useMemo<UiCtx>(
    () => ({
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      zs,
      openZs: (p) => setZs(p),
      closeZs: () => setZs(null),
      lightbox,
      openLightbox: (images, index) => setLightbox({ images, index }),
      closeLightbox: () => setLightbox(null),
      toast,
      toastMsg,
    }),
    [cartOpen, zs, lightbox, toast, toastMsg]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUi(): UiCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUi outside UiProvider');
  return v;
}

// Observed clipboard behavior: async API with document.execCommand fallback.
export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const a = document.createElement('textarea');
    a.value = text;
    a.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(a);
    a.select();
    try {
      document.execCommand('copy');
    } catch {
      /* clipboard unavailable — sheet still shows the full text */
    }
    a.remove();
  }
}
