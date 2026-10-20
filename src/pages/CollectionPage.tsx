import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { PRODUCTS, collectionName, getCollection } from '../data/catalog';
import { BANDS_F, SHOP, SORT_OPTIONS } from '../data/business';
import { collectionUrl, decodeCollectionQuery, encodeCollectionQuery } from '../lib/urls';
import { PAGE_SIZE, TYPE_LABEL, flowerTypes, queryCatalog } from '../features/catalog/query';
import { ProductCard } from '../components/ProductCard';
import { Seo } from '../components/Seo';
import { IconClose } from '../components/icons';
import { NotFoundPage } from './NotFoundPage';
import seoJson from '../data/collection-seo.json';
import type { CatalogFilters } from '../domain/types';

const COLL_SEO = seoJson as Record<string, { t: string; d: string; x: string[] }>;
const OCCASION_SLUGS = ['hoa-khai-truong', 'hoa-sinh-nhat', 'hoa-cuoi', 'bo-suu-tap-moi'];

type ChipItem = { v: string; label: string };

// Collection template — structure and states transcribed from the reference collection page
// (captures/coll_all.html + app.js collection()): hero/count, filter chips, toolbar+sort, grid,
// empty state, load-more (24), SEO intro. URL state t/p/s round-trips via the codec.
export function CollectionPage() {
  const { slug = 'all' } = useParams();
  const [params, setParams] = useSearchParams();
  const known = getCollection(slug);
  const [state, setState] = useState(() => decodeCollectionQuery(slug, params.toString()));
  const [shown, setShown] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Changing collection re-decodes state and resets the load-more page size (latest query wins).
  useEffect(() => {
    setState(decodeCollectionQuery(slug, params.toString()));
    setShown(PAGE_SIZE);
    setFiltersOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const result = useMemo(
    () =>
      queryCatalog(PRODUCTS, {
        collection: state.c,
        type: state.t || undefined,
        bandId: state.p || undefined,
        sort: state.s as CatalogFilters['sort'],
        shown,
      }),
    [state, shown]
  );
  const types = useMemo(() => flowerTypes(PRODUCTS), []);

  if (!known) return <NotFoundPage note="Bộ sưu tập này không tồn tại hoặc đã ngừng hiển thị." />;

  const activeOf = (group: 'p' | 'c' | 't') => (group === 'p' ? state.p : group === 'c' ? state.c : state.t);
  const pick = (group: 'p' | 'c' | 't', v: string) => {
    setState((s) => ({ ...s, [group]: v }));
    setShown(PAGE_SIZE);
  };

  const chipRow = (group: 'p' | 'c' | 't', items: ChipItem[]) => (
    <div className="chips">
      {items.map((it) => (
        <button
          key={group + it.v}
          className="chip"
          type="button"
          aria-pressed={activeOf(group) === it.v}
          onClick={() => pick(group, it.v)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );

  // Observed chip list: all + Quà 20/10 + occasion collections; the current collection is
  // inserted right after Quà 20/10 when it is not already in the list; form types live under "Loại hoa".
  const collChips: ChipItem[] = [
    { v: 'all', label: 'Tất cả' },
    { v: 'qua-20-10', label: 'Quà 20/10' },
    ...(state.c !== 'all' && !OCCASION_SLUGS.includes(state.c)
      ? [{ v: state.c, label: collectionName(state.c) }]
      : []),
    ...OCCASION_SLUGS.map((v) => ({ v, label: collectionName(v) })),
  ];
  const typeChips: ChipItem[] = [{ v: '', label: 'Mọi loại' }].concat(
    types.filter((t) => !collChips.some((c) => c.label === t)).map((t) => ({ v: t, label: TYPE_LABEL[t] ?? t }))
  );

  const patch = (next: Partial<typeof state>) => {
    const merged = { ...state, ...next };
    setState(merged);
    setShown(PAGE_SIZE);
    setParams(encodeCollectionQuery(merged), { replace: true });
  };

  const seo = COLL_SEO[state.c];
  const name = collectionName(state.c);
  const title = seo ? seo.t + ' | Larom Flower' : name + ' – Hoa tươi cao cấp TP.HCM | Larom Flower';
  const desc =
    seo?.d ?? `${name} tại Larom Flower: ${result.totalMatching} mẫu hoa tươi, nhận đặt hoa theo mẫu, giao tận nơi TP.HCM.`;
  const activeFilters = (state.t ? 1 : 0) + (state.p ? 1 : 0);
  const bandLabel = state.p ? (BANDS_F.find((b) => b.id === state.p)?.label ?? '') : '';

  return (
    <>
      <Seo title={title} description={desc} path={collectionUrl(state.c, encodeCollectionQuery(state))} />
      <main id="main">
        <section className="c-hero">
          <div className="wrap">
            <h1>{name}</h1>
            <p className="lead">
              {result.totalMatching} thiết kế{bandLabel ? ' · ' + bandLabel : ''}
              {state.t ? ' · ' + state.t : ''}
            </p>
          </div>
        </section>
        <div className="ivory">
          <div className="wrap c-body">
            <aside className={`filters${filtersOpen ? ' open' : ''}`} id="filters" aria-label="Bộ lọc">
              <div className="f-top">
                <b>Bộ lọc</b>
                <button className="ico" type="button" aria-label="Đóng bộ lọc" onClick={() => setFiltersOpen(false)}>
                  <IconClose />
                </button>
              </div>
              <div className="fgroup">
                <p className="fg-t">Mức giá</p>
                {chipRow('p', [{ v: '', label: 'Mọi mức giá' }, ...BANDS_F.map((b) => ({ v: b.id, label: b.label }))])}
              </div>
              <div className="fgroup">
                <p className="fg-t">Dịp &amp; bộ sưu tập</p>
                {chipRow('c', collChips)}
              </div>
              <div className="fgroup">
                <p className="fg-t">Loại hoa</p>
                {chipRow('t', typeChips)}
              </div>
              <button className="btn cv-main block f-done" type="button" onClick={() => setFiltersOpen(false)}>
                Xem {result.totalMatching} mẫu
              </button>
            </aside>
            <div>
              <div className="toolbar">
                <button className="filter-btn" aria-expanded={filtersOpen} aria-controls="filters" onClick={() => setFiltersOpen((o) => !o)}>
                  Bộ lọc{activeFilters ? ` (${activeFilters})` : ''}
                </button>
                <label>
                  <span className="sr">Sắp xếp</span>
                  <select className="sel" value={state.s} onChange={(e) => patch({ s: e.target.value })}>
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid" style={{ marginTop: 28 }}>
                {result.products.map((p, i) => (
                  <ProductCard key={p.slug} p={p} bandId={state.p || undefined} eager={i < 4} />
                ))}
              </div>
              {(
                <p className="empty" hidden={result.totalMatching > 0}>
                  Không có mẫu phù hợp. Hãy thử bỏ bớt bộ lọc, hoặc{' '}
                  <a href={SHOP.zalo} style={{ textDecoration: 'underline' }}>
                    nhắn Zalo
                  </a>{' '}
                  để florist thiết kế riêng.
                </p>
              )}
              <div className="more">
                {result.hasMore && (
                  <button
                    className="btn ghost"
                    // C02: appending only extends the same snapshot query; rapid clicks add one full batch each
                    onClick={() => setShown((n) => n + PAGE_SIZE)}
                  >
                    Xem thêm
                  </button>
                )}
              </div>
              {seo && (
                <div className="c-seo">
                  <h2>{name} tại Larom Flower</h2>
                  {seo.x.map((t, i) => (
                    <p key={i}>{t}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
