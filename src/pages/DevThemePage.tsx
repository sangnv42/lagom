import theme from '../theme/larom.theme.json';
import { PRODUCTS } from '../data/catalog';
import { ProductCard } from '../components/ProductCard';
import { Seo } from '../components/Seo';
import { fmt, pfmt } from '../lib/money';

// Internal QA state gallery (excluded from the sitemap). Shows token values + shared component states
// so theme fidelity can be reviewed at any viewport.
export function DevThemePage() {
  const c = theme.color as Record<string, string | null>;
  const swatches = Object.entries(c).filter(([, v]) => v);
  const sample = PRODUCTS.slice(0, 4);
  return (
    <>
      <Seo title="/dev/theme | Larom Flower" description="Internal theme state gallery." noindex />
      <main id="main">
        <section className="c-hero">
          <div className="wrap">
            <h1>Theme state gallery</h1>
            <p className="lead">
              {theme.name} v{theme.version} — {theme.verificationStatus} · capturedAt {String(theme.capturedAt)}
            </p>
          </div>
        </section>
        <div className="ivory">
          <div className="wrap txt-page">
            <h2 className="h2">Colors</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {swatches.map(([k, v]) => (
                <div key={k} style={{ border: '1px solid rgba(0,0,0,.15)', padding: 10 }}>
                  <div style={{ height: 48, background: String(v) }} />
                  <b style={{ fontSize: 13 }}>{k}</b>
                  <small style={{ display: 'block' }}>{String(v)}</small>
                </div>
              ))}
            </div>
            <h2 className="h2">Typography</h2>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 32 }}>Playfair Display — Art hoa trao gửi</p>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 16 }}>Be Vietnam Pro — Trọn bộ dấu tiếng Việt: ă â ê ô ơ ư đ 1.510.000đ</p>
            <h2 className="h2">Prices</h2>
            <ul>
              <li>Fixed: <b>{fmt(380000)}</b></li>
              <li>Quote-only: {pfmt(0)}</li>
              <li>Compare: <b>{fmt(380000)}</b> <s style={{ marginLeft: 8 }}>{fmt(750000)}</s></li>
            </ul>
            <h2 className="h2">Buttons & inputs</h2>
            <p style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn">btn</button>
              <button className="btn ghost">ghost</button>
              <button className="btn" disabled>disabled</button>
              <input className="inp" placeholder="inp" />
              <span className="chip" aria-pressed>chip</span>
            </p>
            <h2 className="h2">Cards</h2>
            <div className="grid">
              {sample.map((p) => (
                <ProductCard key={p.slug} p={p} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
