import { useEffect } from 'react';
import { useUi } from './Ui';
import { CartDrawer } from './CartDrawer';
import { ZsSheet } from './ZsSheet';
import { absAsset } from '../lib/img';

// Renders global overlays and wires Escape/arrow keys and scroll locking (observed behaviors).
export function OverlayHost() {
  const { cartOpen, closeCart, zs, closeZs, lightbox, openLightbox, closeLightbox, toastMsg } = useUi();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightbox) return closeLightbox();
        if (zs) return closeZs();
        if (cartOpen) return closeCart();
      }
      if (lightbox && /Arrow(Left|Right)/.test(e.key)) {
        const n = lightbox.images.length;
        const next = (lightbox.index + (e.key === 'ArrowLeft' ? -1 : 1) + n) % n;
        openLightbox(lightbox.images, next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, zs, cartOpen, closeCart, closeZs, closeLightbox, openLightbox]);

  useEffect(() => {
    if (cartOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [cartOpen]);

  return (
    <>
      {cartOpen && <CartDrawer />}
      {zs && <ZsSheet payload={zs} />}
      {lightbox && (
        <div className="lb" style={{ position: 'fixed' }} onClick={(e) => e.target instanceof HTMLImageElement || closeLightbox()}>
          <button className="ico" aria-label="Đóng ảnh" onClick={closeLightbox}>
            ✕
          </button>
          <img src={absAsset(lightbox.images[lightbox.index] ?? '')} alt="" />
          {lightbox.images.length > 1 && (
            <>
              <button className="lb-nav p" aria-label="Ảnh trước" onClick={() => openLightbox(lightbox.images, (lightbox.index - 1 + lightbox.images.length) % lightbox.images.length)}>
                ‹
              </button>
              <button className="lb-nav n" aria-label="Ảnh sau" onClick={() => openLightbox(lightbox.images, (lightbox.index + 1) % lightbox.images.length)}>
                ›
              </button>
            </>
          )}
        </div>
      )}
      <div className={`toast${toastMsg ? ' on' : ''}`} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </>
  );
}
