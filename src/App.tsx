import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { REDIRECTS } from './data/business';
import { needsTrailingSlash } from './lib/urls';
import { SiteHeader } from './components/SiteHeader';
import { SiteFooter } from './components/SiteFooter';
import { OverlayHost } from './components/OverlayHost';
import { HomePage } from './pages/HomePage';
import { CollectionPage } from './pages/CollectionPage';
import { ProductPage } from './pages/ProductPage';
import { PolicyPage } from './pages/PolicyPage';
import { DevThemePage } from './pages/DevThemePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { CartProvider } from './features/cart/CartContext';
import { UiProvider } from './components/Ui';

// Redirect old query-param prototypes: product.html?h= and collection.html?c= (observed in app.js).
function LegacyQueryPages() {
  const location = useLocation();
  const [params] = useSearchParams();
  const file = location.pathname.split('/').pop();
  if (file === 'product.html' && params.get('h')) {
    return <Navigate to={`/products/${encodeURIComponent(params.get('h')!)}/`} replace />;
  }
  if (file === 'collection.html') {
    const c = params.get('c') || 'all';
    const q = new URLSearchParams(params);
    q.delete('c');
    const qs = q.toString();
    return <Navigate to={`/collections/${encodeURIComponent(c)}/${qs ? '?' + qs : ''}`} replace />;
  }
  return null;
}

function RedirectRegistry() {
  const location = useLocation();
  const target = REDIRECTS[location.pathname];
  if (target) {
    // query/fragment preservation is unverified for legacy routes; path-only per the audit registry
    return <Navigate to={target} replace />;
  }
  return null;
}

// Canonicalize trailing slashes for site routes (audit D-rule: slash normalization tested separately).
function SlashCanonicalizer() {
  const location = useLocation();
  if (needsTrailingSlash(location.pathname)) {
    return <Navigate to={location.pathname + '/' + (location.search || '')} replace />;
  }
  return null;
}

// Scroll to top on route change; re-apply #hash anchors after render (observed fixHash behavior).
function ScrollManager() {
  const location = useLocation();
  useEffect(() => {
    const hash = location.hash && document.getElementById(location.hash.slice(1));
    if (hash) {
      const go = () => hash.scrollIntoView({ block: 'start' });
      go();
      const raf = requestAnimationFrame(go);
      const t = window.setTimeout(go, 600);
      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(t);
      };
    }
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname, location.search, location.hash]);
  return null;
}

export default function App() {
  return (
    <UiProvider>
      <CartProvider>
        <ScrollManager />
        <SiteHeader />
        <SlashCanonicalizer />
        <RedirectRegistry />
        <LegacyQueryPages />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/collections/:slug/" element={<CollectionPage />} />
          <Route path="/collections/:slug" element={<CollectionPage />} />
          <Route path="/products/:slug/" element={<ProductPage />} />
          <Route path="/products/:slug" element={<ProductPage />} />
          <Route path="/pages/:slug/" element={<PolicyPage />} />
          <Route path="/pages/:slug" element={<PolicyPage />} />
          <Route path="/dev/theme/" element={<DevThemePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <SiteFooter />
        <OverlayHost />
      </CartProvider>
    </UiProvider>
  );
}
