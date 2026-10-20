import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../domain/types';
import { fmt, pfmt, SALE_BADGE_MIN_PCT, discountPct, fromPriceVnd } from '../lib/money';
import { bandOf } from '../data/business';
import { productUrl } from '../lib/urls';
import { Img } from './Img';
import { SIZES } from '../lib/img';
import { IconBag } from './icons';
import { useUi } from './Ui';
import { askMessage } from '../features/order/messages';

// Product card — transcribed from the reference `cardHTML`: primary + hover-alt photo, sale badge at
// >=10%, quick action = open PDP (priced) or Zalo price question (quote-only), "Từ " prefix for
// multi-priced variants, band-matched size shown when a price filter is active.
export function ProductCard({ p, bandId, eager = false }: { p: Product; bandId?: string; eager?: boolean }) {
  const { openZs } = useUi();
  const [altLoaded, setAltLoaded] = useState(false);
  const band = bandOf(bandId);
  const priced = p.variants.filter((v) => v.priceVnd > 0);
  const price = fromPriceVnd(p.variants.map((v) => v.priceVnd));
  const off = p.variants[0] ? discountPct(p.variants[0].compareAtVnd, p.variants[0].priceVnd) : 0;
  const bandVariant = band ? p.variants.find((x) => x.priceVnd >= band.min && x.priceVnd <= band.max) : undefined;
  const showBand = bandVariant && bandVariant !== p.variants[0] ? bandVariant : null;
  const compare = p.variants[0]?.compareAtVnd ?? null;
  const hasAlt = p.imagePaths.length > 1 && p.imagePaths[1] !== p.imagePaths[0];

  return (
    <article
      className="card"
      onPointerOver={(e) => {
        if (e.pointerType === 'mouse' && !altLoaded) setAltLoaded(true);
      }}
    >
      <div className="ph-wrap">
        <Link to={productUrl(p.slug)} tabIndex={-1} aria-hidden="true">
          <Img src={p.imagePaths[0] ?? null} alt={p.title} eager={eager} sizes={SIZES.card} />
          {hasAlt && altLoaded && <Img src={p.imagePaths[1]} alt="" cls="alt" sizes={SIZES.card} />}
        </Link>
        {off >= SALE_BADGE_MIN_PCT && <span className="off">−{off}%</span>}
        {price > 0 ? (
          <Link className="quick" to={productUrl(p.slug)} aria-label={`Chọn size và đặt ${p.title}`}>
            <IconBag />
            <span>Chọn &amp; đặt</span>
          </Link>
        ) : (
          <button
            className="quick qz"
            type="button"
            aria-label={`Hỏi giá ${p.title} qua Zalo`}
            onClick={() => openZs({ title: 'Hỏi giá qua Zalo', text: askMessage(p.slug) })}
          >
            Zalo<span>Hỏi giá qua Zalo</span>
          </button>
        )}
      </div>
      <Link className="card-t" to={productUrl(p.slug)}>
        <h3>{p.title}</h3>
      </Link>
      <div className="card-m">
        <div className="price">
          {showBand ? (
            <>
              <b>{fmt(showBand.priceVnd)}</b>
              <small>Size {showBand.label}</small>
            </>
          ) : (
            <>
              <b>
                {priced.length > 1 && <i>Từ </i>}
                {pfmt(price)}
              </b>
              {compare && compare > price && <s>{fmt(compare)}</s>}
            </>
          )}
        </div>
        {p.sku && <span className="code">{p.sku}</span>}
      </div>
    </article>
  );
}
