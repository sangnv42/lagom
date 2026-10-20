import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PRODUCTS, collectionName, getProduct } from '../data/catalog';
import { SHOP, SITE_URL } from '../data/business';
import { collectionUrl, productUrl } from '../lib/urls';
import { fmt, pfmt, discountPct } from '../lib/money';
import { absAsset, originalUrl, SIZES, optUrl } from '../lib/img';
import { Img } from '../components/Img';
import { IconBag, IconPhone } from '../components/icons';
import { Seo } from '../components/Seo';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../features/cart/CartContext';
import { useUi } from '../components/Ui';
import { askMessage, productOrderMessage } from '../features/order/messages';
import { cutoffNote, firstOpenDate, qDates, slotsForDate, validateSelection } from '../features/order/delivery';
import { vnDateISO } from '../lib/vntime';
import wardsJson from '../data/wards.json';
import { NotFoundPage } from './NotFoundPage';

const WARDS: string[] = wardsJson.wards;
const COMMUNES: string[] = wardsJson.communes;
const SPECIAL: string[] = wardsJson.special;
const viSort = (a: string[]) => [...a].sort((x, y) => x.localeCompare(y, 'vi'));

// PDP — structure and behavior transcribed from the reference product() (captures/app.js):
// gallery with thumbs/dots/lightbox, variant radiogroup updating price/CTA, delivery date+slot with
// holiday window and same-day cutoff, optional address/recipient/card-message fields, Zalo handoff
// or quote-only "Hỏi giá", add-to-cart, sticky buy bar, accordions, related products.
export function ProductPage() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const p = getProduct(slug);

  const [variantIdx, setVariantIdx] = useState(0);
  const [date, setDate] = useState(() => firstOpenDate(new Date()));
  const [slot, setSlot] = useState('');
  const [district, setDistrict] = useState('');
  const [addr, setAddr] = useState('');
  const [to, setTo] = useState('');
  const [msg, setMsg] = useState('');
  const [tick, setTick] = useState(0); // revalidates slot availability as the clock advances
  const trackRef = useRef<HTMLDivElement>(null);
  const [galIndex, setGalIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const slots = useMemo(() => (p ? slotsForDate(date, new Date()) : []), [p, date, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const firstOpenSlot = slots.find((s) => !s.disabled)?.label ?? '';
  useEffect(() => {
    setSlot((cur) => (slots.some((s) => s.label === cur && !s.disabled) ? cur : firstOpenSlot));
  }, [slots, firstOpenSlot]);

  const { add } = useCart();
  const { openCart, openZs, openLightbox, toast } = useUi();

  useEffect(() => {
    setVariantIdx(0);
    setDate(firstOpenDate(new Date()));
    setDistrict('');
    setAddr('');
    setTo('');
    setMsg('');
    setGalIndex(0);
  }, [slug]);

  if (!p) {
    return (
      <NotFoundPage
        note="Mẫu hoa này có thể đã ngừng bán."
      />
    );
  }

  const v = p.variants[Math.min(variantIdx, p.variants.length - 1)];
  const ask = p.variants.every((x) => !(x.priceVnd > 0));
  const isKT = p.collectionSlugs.includes('hoa-khai-truong');
  const qc = params.get('c');
  let fromCtx = qc;
  try {
    fromCtx = fromCtx || sessionStorage.getItem('archFrom');
  } catch {
    /* storage blocked */
  }
  const coll =
    fromCtx &&
    fromCtx !== 'all' &&
    (fromCtx === 'qua-20-10' || p.collectionSlugs.includes(fromCtx) || fromCtx === 'hoa-khai-truong') &&
    (fromCtx === 'qua-20-10' ? p.collectionSlugs.some((c) => ['hoa-bo', 'hoa-hop', 'hoa-gio', 'bo-suu-tap-moi'].includes(c)) : true)
      ? fromCtx
      : p.collectionSlugs[0] || 'all';

  const cmpOf = (idx: number): number | null => {
    const vv = p.variants[idx];
    return vv.compareAtVnd;
  };
  const cmp = cmpOf(variantIdx);
  const off = discountPct(cmp, v.priceVnd);

  // gallery
  const go = (i: number) => {
    const n = Math.max(1, p.imagePaths.length);
    const idx = (i + n) % n;
    setGalIndex(idx);
    const el = trackRef.current;
    if (el) el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  };

  const slotError = () => validateSelection(date, slot || firstOpenSlot, new Date());

  const buildDraft = () =>
    productOrderMessage({
      slug: p.slug,
      variantLabel: v.label,
      price: v.priceVnd,
      date,
      slot: slot || firstOpenSlot,
      address: addr.trim() || undefined,
      district: district || undefined,
      recipient: to.trim() || undefined,
      message: msg.trim() || undefined,
    });

  const doOrder = () => {
    if (ask) {
      openZs({
        title: 'Hỏi giá qua Zalo',
        text: askMessage(p.slug),
        summary: { image: p.imagePaths[0] ?? '', name: p.title, lines: p.sku ? ['Mã ' + p.sku] : [] },
      });
      return;
    }
    const err = slotError();
    if (err) {
      toast(err);
      return;
    }
    openZs({
      title: 'Đặt qua Zalo',
      text: buildDraft(),
      summary: {
        image: p.imagePaths[0] ?? '',
        name: p.title,
        lines: [`${v.label} · ${pfmt(v.priceVnd)}`, `Giao ${date.split('-').reverse().join('/')}, ${slot || firstOpenSlot}`],
      },
    });
  };

  const doAdd = () => {
    if (ask) return;
    const err = slotError();
    if (err) {
      toast(err);
      return;
    }
    add({
      productId: p.slug,
      variantLabel: v.label,
      quantity: 1,
      configuration: {
        deliveryDate: date,
        slot: slot || firstOpenSlot,
        district: district || undefined,
        address: addr.trim() || undefined,
        recipient: to.trim() || undefined,
        message: msg.trim() || undefined,
      },
    });
    openCart();
  };

  const related = PRODUCTS.filter((x) => x.slug !== p.slug && x.variants.some((vv) => vv.priceVnd > 0) && x.collectionSlugs.some((c) => p.collectionSlugs.includes(c))).slice(0, 8);
  const imgs = p.imagePaths.length ? p.imagePaths : [''];
  const fullImgs = imgs.map((u) => (u ? originalUrl(u) : ''));

  // SEO (observed pMeta/pLD rules)
  const priced = p.variants.filter((x) => x.priceVnd > 0);
  const lo = priced.length ? Math.min(...priced.map((x) => x.priceVnd)) : 0;
  const metaTitle = (() => {
    const base = `${p.title}${p.sku ? ' ' + p.sku : ''}`;
    const full = `${base} – ${lo ? (priced.length > 1 ? 'từ ' : '') + fmt(lo) : 'Liên hệ'} | Arch Flowers`;
    return full.length > 65 ? `${base} | Arch Flowers` : full;
  })();
  const metaDesc = `${lo ? `${p.title} giá ${priced.length > 1 ? 'từ ' : ''}${fmt(lo)}. ` : ''}${(p.description || `${p.title} cắm tay bởi florist Arch Flowers với hoa tươi trong ngày.`).replace(/\s+/g, ' ').slice(0, 120)} Giao hoa TP.HCM, nhận đặt theo mẫu.`;
  const jsonLd = useMemo(() => {
    const url = SITE_URL + productUrl(p.slug);
    const offer = (x: { priceVnd: number }) => ({
      '@type': 'Offer',
      price: x.priceVnd,
      priceCurrency: 'VND',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      url,
    });
    const prod: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.title,
      sku: p.sku || p.slug,
      url,
      image: p.imagePaths.map((u) => absAsset(optUrl(u, 1200) || u)),
      description: p.description || p.title,
      brand: { '@type': 'Brand', name: 'Arch Flowers' },
      category: p.flowerType,
    };
    // Quote-only designs: no offers at all — never publish a 0đ price (observed pLD rule)
    if (priced.length === 1) prod.offers = offer(priced[0]);
    else if (priced.length > 1)
      prod.offers = {
        '@type': 'AggregateOffer',
        priceCurrency: 'VND',
        lowPrice: lo,
        highPrice: Math.max(...priced.map((x) => x.priceVnd)),
        offerCount: priced.length,
        availability: 'https://schema.org/InStock',
        url,
      };
    const crumbs = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: collectionName(coll), item: SITE_URL + collectionUrl(coll) },
        { '@type': 'ListItem', position: 3, name: p.title, item: url },
      ],
    };
    return [prod, crumbs];
  }, [p, coll, lo, priced]);

  const cut = cutoffNote(date, new Date());

  return (
    <>
      <Seo
        title={metaTitle}
        description={metaDesc}
        path={productUrl(p.slug)}
        image={p.imagePaths[0] ? absAsset(p.imagePaths[0]) : undefined}
        jsonLd={jsonLd}
      />
      <main id="main">
        <div className="wrap">
          <nav className="crumbs" aria-label="Breadcrumb" style={{ paddingTop: 18 }}>
            <Link to="/">Trang chủ</Link>/<Link to={collectionUrl(coll)}>{collectionName(coll)}</Link>/<span>{p.title}</span>
          </nav>
        </div>
        <div className="wrap pdp-main">
          <section className="gal" aria-label="Hình ảnh sản phẩm">
            <div
              className="gal-track"
              id="track"
              ref={trackRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                setGalIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
              }}
            >
              {imgs.map((s, i) => (
                <figure key={i}>
                  <div style={{ cursor: 'zoom-in' }} onClick={() => openLightbox(fullImgs, i)}>
                    <Img src={s || null} alt={p.title + (i ? ' – ảnh ' + (i + 1) : '')} eager={i === 0} sizes={SIZES.full} />
                  </div>
                </figure>
              ))}
            </div>
            <div className="thumbs">
              {imgs.map((s, i) => (
                <button key={i} aria-label={`Ảnh ${i + 1}`} aria-current={i === galIndex} onClick={() => go(i)}>
                  <Img src={s || null} alt="" sizes={SIZES.thumb} width={120} height={150} />
                </button>
              ))}
            </div>
            {imgs.length > 1 && (
              <>
                <div className="dots">
                  {imgs.map((_, i) => (
                    <button key={i} aria-label={`Ảnh ${i + 1}`} aria-current={i === galIndex} onClick={() => go(i)} />
                  ))}
                </div>
                <div className="gal-nav">
                  <button aria-label="Ảnh trước" onClick={() => go(galIndex - 1)}>
                    ←
                  </button>
                  <button aria-label="Ảnh sau" onClick={() => go(galIndex + 1)}>
                    →
                  </button>
                </div>
              </>
            )}
          </section>
          <section className="p-info">
            <span className="eyebrow">{collectionName(coll)}</span>
            <h1>{p.title}</h1>
            <a className="p-stars" href={SHOP.map} target="_blank" rel="noopener">
              <span aria-hidden>★★★★★</span> {SHOP.reviewsScore} · {SHOP.reviewsCount} đánh giá Google
            </a>
            {p.sku && <span className="p-code">Mã sản phẩm: {p.sku}</span>}
            <div className="p-price">
              <b>{pfmt(v.priceVnd)}</b>
              <span>
                {cmp && cmp > v.priceVnd && v.priceVnd > 0 && (
                  <>
                    <s>{fmt(cmp)}</s>
                    <span className="tag">Tiết kiệm {off}%</span>
                  </>
                )}
              </span>
            </div>
            <div className="p-trust">
              <span>Nhận đặt hoa theo mẫu</span>
              <span>Ảnh &amp; video hoa trước khi giao</span>
              <span>Freeship bán kính 1km</span>
            </div>
            <form
              id="buyForm"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                doOrder();
              }}
            >
              <fieldset className="fld">
                <legend>Kích thước</legend>
                <div className="sizes" role="radiogroup" aria-label="Kích thước">
                  {p.variants.map((x, i) => (
                    <button
                      key={x.id}
                      type="button"
                      className="size"
                      role="radio"
                      aria-checked={i === variantIdx}
                      onClick={() => setVariantIdx(i)}
                    >
                      <span>{x.label}</span>
                      <small>{pfmt(x.priceVnd)}</small>
                    </button>
                  ))}
                </div>
              </fieldset>
              {!ask && (
                <fieldset className="fld">
                  <legend>Thời gian giao</legend>
                  <div className="row2">
                    <label>
                      <span className="sr">Ngày giao</span>
                      <input type="date" className="inp" value={date} min={vnDateISO(new Date())} onChange={(e) => setDate(e.target.value)} required />
                    </label>
                    <label>
                      <span className="sr">Khung giờ</span>
                      <select className="inp" value={slot || firstOpenSlot} onChange={(e) => setSlot(e.target.value)}>
                        {slots.map((s) => (
                          <option key={s.label} value={s.label} disabled={s.disabled}>
                            {s.label}
                            {s.reason === 'past' ? ' (đã qua)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="qdates">
                      {qDates(new Date()).map((qd) => (
                        <button key={qd.iso} type="button" className="qd" aria-pressed={date === qd.iso}
                          onClick={() => setDate(qd.iso)}>{qd.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="hint">
                    <span>
                      Giao từ 08:00 đến 18:00 mỗi ngày. Đơn trong ngày: đặt trước ít nhất 2 tiếng.
                      <br />
                      Ngày lễ: có thêm khung 18:00 – 20:00.
                      <b className="cut">{cut}</b>
                    </span>
                  </div>
                </fieldset>
              )}
              <details className="more-fld" {...(ask ? { hidden: true } : {})}>
                <summary>
                  <b>Địa chỉ, người nhận &amp; lời thiệp</b>
                  <span>Không bắt buộc – có thể nhắn shop sau trong Zalo</span>
                </summary>
                <div className="fld">
                  <label htmlFor="district">Phường / xã giao (TP.HCM)</label>
                  <select id="district" className="inp" value={district} onChange={(e) => setDistrict(e.target.value)}>
                    <option value="">Chọn phường / xã</option>
                    <option>Không rõ phường mới – shop gọi xác nhận</option>
                    <optgroup label="Phường">
                      {viSort(WARDS).map((w) => (
                        <option key={w}>Phường {w}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Xã">
                      {viSort(COMMUNES).map((w) => (
                        <option key={w}>Xã {w}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Đặc khu">
                      {SPECIAL.map((w) => (
                        <option key={w}>Đặc khu {w}</option>
                      ))}
                    </optgroup>
                  </select>
                  <div className="hint">
                    <span>Chưa quen tên phường mới? Chọn “Không rõ” và ghi địa chỉ cũ bên dưới.</span>
                  </div>
                </div>
                <div className="fld">
                  <label htmlFor="addr">Số nhà, tên đường nhận hoa</label>
                  <input id="addr" className="inp" autoComplete="street-address" placeholder="Ví dụ: 12 Bàu Cát 2, tầng 3" value={addr} onChange={(e) => setAddr(e.target.value)} />
                </div>
                <div className="fld">
                  <label htmlFor="to">Tên &amp; SĐT người nhận (nếu tặng người khác)</label>
                  <input id="to" className="inp" placeholder="Ví dụ: Chị Lan – 0912 345 678" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
                <div className="fld">
                  <label htmlFor="msg">{isKT ? 'Nội dung băng rôn / thiệp chúc mừng' : 'Lời nhắn trên thiệp (miễn phí)'}</label>
                  <textarea
                    id="msg"
                    className="inp"
                    maxLength={200}
                    placeholder={isKT ? 'Ví dụ: Chúc mừng khai trương – Hồng phát – Công ty ABC kính tặng' : 'Ví dụ: Chúc mừng Ngày Phụ nữ Việt Nam 20/10 — luôn rạng rỡ nhé!'}
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                  />
                  <div className="hint">
                    <span>{isKT ? 'Ghi tên người/công ty tặng và lời chúc. Shop xác nhận lại trước khi giao.' : 'Viết tay trên thiệp cao cấp.'}</span>
                    <span>{msg.length}/200</span>
                  </div>
                </div>
              </details>
              <div className="buy">
                {ask ? (
                  <button className="btn cv-main block" type="button" onClick={doOrder}>
                    Hỏi giá qua Zalo
                  </button>
                ) : (
                  <button className="btn cv-main block" type="submit">
                    Đặt qua Zalo · <span>{pfmt(v.priceVnd)}</span>
                  </button>
                )}
                <p className="z-note">
                  {ask
                    ? 'Tên và mã mẫu được chép sẵn – mở Zalo, dán và gửi, shop báo giá ngay.'
                    : 'Không cần tài khoản: đơn được chép sẵn, bạn mở Zalo của shop, dán và gửi. Shop xác nhận, gửi ảnh và video hoa trước khi giao.'}
                </p>
                <div className="pair">
                  {!ask && (
                    <button className="btn ghost" type="button" onClick={doAdd}>
                      <IconBag />
                      Thêm vào giỏ
                    </button>
                  )}
                  <a className="btn ghost cv-call" href={`tel:${SHOP.phone}`}>
                    Gọi {SHOP.phoneTxt}
                  </a>
                </div>
              </div>
            </form>
          </section>
          <section className="p-more" aria-label="Thông tin thêm">
            <blockquote className="p-quote">
              “Hoa đẹp lắm ạ, đã mua 2 lần bên shop lúc nào cũng ưng bụng, đã khéo tay gói hoa đẹp còn giá cả phải chăng nữa.”
              <footer>Vy Le · Đánh giá Google</footer>
            </blockquote>
            <div className="acc">
              <details open>
                <summary>Chi tiết sản phẩm</summary>
                <div className="acc-b">
                  <p>{p.description || 'Thiết kế được cắm tay bởi florist Arch Flowers với hoa tươi tuyển chọn trong ngày.'}</p>
                  <p>
                    Loại: {p.flowerType}. Kích thước: {p.variants.map((x) => x.label).join(' / ')}.
                  </p>
                </div>
              </details>
              <details>
                <summary>Giao hàng</summary>
                <div className="acc-b">
                  <ul>
                    <li>Freeship trong bán kính 1km quanh cửa hàng.</li>
                    <li>Giao đúng khung giờ đã chọn.</li>
                    <li>Phí giao theo khu vực, shop báo khi chốt đơn.</li>
                    <li>
                      Cửa hàng: <a href={SHOP.map} target="_blank" rel="noopener" style={{ textDecoration: 'underline' }}>{SHOP.address}</a>
                    </li>
                  </ul>
                </div>
              </details>
              <details>
                <summary>Chăm sóc hoa</summary>
                <div className="acc-b">
                  <ul>
                    <li>Cắt chéo gốc 2–3cm, thay nước mỗi ngày.</li>
                    <li>Đặt nơi thoáng mát, tránh nắng trực tiếp và máy lạnh thổi thẳng.</li>
                    <li>Với hộp/giỏ hoa: tưới nhẹ vào mút xốp mỗi ngày.</li>
                  </ul>
                </div>
              </details>
              <details>
                <summary>Đổi trả &amp; cam kết</summary>
                <div className="acc-b">
                  <ul>
                    <li>Nhận đặt hoa theo mẫu khách gửi.</li>
                    <li>Shop gửi ảnh và video hoa qua Zalo để bạn xem trước khi giao.</li>
                    <li>Đổi mới miễn phí nếu hoa dập, héo khi nhận.</li>
                    <li>Thanh toán: COD, chuyển khoản.</li>
                  </ul>
                </div>
              </details>
            </div>
          </section>
        </div>
        <section className="sec ivory">
          <div className="wrap">
            <div className="sec-hd">
              <div>
                <span className="eyebrow">Có thể bạn thích</span>
                <h2 className="h2">
                  Gợi ý <em>cùng phong cách</em>
                </h2>
              </div>
              <Link className="link" to={collectionUrl(coll)}>
                Xem tất cả
              </Link>
            </div>
            <div className="grid">
              {related.map((x) => (
                <ProductCard key={x.slug} p={x} />
              ))}
            </div>
          </div>
        </section>
        <div className="sticky-buy">
          <a className="ico cv-call" href={`tel:${SHOP.phone}`} aria-label="Gọi shop">
            <IconPhone />
          </a>
          {ask ? (
            <button className="btn cv-main" type="button" onClick={doOrder}>
              Hỏi giá qua Zalo
            </button>
          ) : (
            <>
              <button className="ico st-cart" type="button" aria-label="Thêm vào giỏ" onClick={doAdd}>
                <IconBag />
              </button>
              <button className="btn cv-main" type="button" onClick={doOrder}>
                Đặt qua Zalo · <span>{pfmt(v.priceVnd)}</span>
              </button>
            </>
          )}
        </div>
      </main>
    </>
  );
}
