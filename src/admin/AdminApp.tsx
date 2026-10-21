// Admin application shell: session handling, persistent sidebar (navigation groups per the
// product spec), breadcrumbs, global search, and screens. Routes live under /admin/* inside the
// existing SPA so one build serves storefront and staff.
// User-facing labels are Vietnamese (product spec §2); code identifiers stay English.

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api, describeFailure } from './api';
import { Icon } from './icons';
import './admin.css';

import { DashboardPage } from './pages/Dashboard';
import { ProductEditorPage, ProductListPage } from './pages/Products';
import { CollectionEditorPage, CollectionListPage } from './pages/Collections';
import { MediaPage } from './pages/Media';
import { ImportPage } from './pages/Import';
import { ActivityPage } from './pages/Activity';
import { ReleasesPage } from './pages/Releases';
import { TeamPage } from './pages/Team';
import { BusinessSettingsPage } from './pages/BusinessSettings';
import { PageEditorPage, PageListPage } from './pages/Pages';
import { AppearancePage } from './pages/Appearance';
import { NavigationPage } from './pages/Navigation';
import { FaqsPage, PromotionsPage, TestimonialsPage } from './pages/MicroContent';

export type Capability = { read: boolean; edit: boolean; create: boolean; archive: boolean; price: boolean; publish: boolean };

export type SessionInfo = {
  user: { id: string; email: string; name: string; role: string; status: string; mfaEnrolled: boolean } | null;
  capabilities: Record<string, Capability>;
  notConfigured: string[];
};

type AuthValue = {
  session: SessionInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  can: (surface: string, action: keyof Capability) => boolean;
};

const AuthContext = createContext<AuthValue | null>(null);
import { createContext, useContext } from 'react';

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AdminApp');
  return value;
}

type NavItem = { to: string; label: string; icon: string; end?: boolean; surface: string | null };

/** Navigation groups from the product spec. Roles without read on a surface never see the item. */
const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Tổng quan', items: [{ to: '/admin', label: 'Bảng điều khiển', icon: 'dashboard', end: true, surface: null }] },
  { group: 'Trang', items: [{ to: '/admin/pages', label: 'Trang nội dung', icon: 'page', surface: 'page' }] },
  { group: 'Sản phẩm', items: [{ to: '/admin/products', label: 'Danh sách sản phẩm', icon: 'product', surface: 'product' }] },
  { group: 'Danh mục & Bộ sưu tập', items: [{ to: '/admin/collections', label: 'Bộ sưu tập', icon: 'collection', surface: 'collection' }] },
  { group: 'Thư viện ảnh', items: [{ to: '/admin/media', label: 'Ảnh và tài nguyên', icon: 'image', surface: 'media' }] },
  { group: 'Điều hướng & Footer', items: [{ to: '/admin/navigation', label: 'Menu và chân trang', icon: 'navigation', surface: 'navigation' }] },
  { group: 'Khuyến mãi', items: [{ to: '/admin/promotions', label: 'Chiến dịch', icon: 'promo', surface: 'global' }] },
  {
    group: 'Đánh giá & FAQ',
    items: [
      { to: '/admin/testimonials', label: 'Đánh giá khách hàng', icon: 'star', surface: 'global' },
      { to: '/admin/faqs', label: 'Câu hỏi thường gặp', icon: 'faq', surface: 'global' },
    ],
  },
  { group: 'Giao diện', items: [{ to: '/admin/appearance', label: 'Màu sắc và hiển thị', icon: 'appearance', surface: 'theme' }] },
  { group: 'Cài đặt doanh nghiệp', items: [{ to: '/admin/business', label: 'Cửa hàng và giao hàng', icon: 'business', surface: 'settings' }] },
  { group: 'Người dùng & Quyền', items: [{ to: '/admin/team', label: 'Nhân sự và vai trò', icon: 'team', surface: 'user' }] },
  {
    group: 'Lịch sử hoạt động',
    items: [
      { to: '/admin/activity', label: 'Nhật ký thay đổi', icon: 'history', surface: 'audit' },
      { to: '/admin/releases', label: 'Bản xuất bản', icon: 'release', surface: 'release' },
      { to: '/admin/import', label: 'Nhập bảng giá', icon: 'import', surface: 'import' },
    ],
  },
];

export default function AdminApp() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await api.get<SessionInfo>('/api/session');
      setSession(next);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.del('/api/session').catch(() => undefined);
    setSession(null);
  }, []);

  const can = useCallback(
    (surface: string, action: keyof Capability) => {
      const caps = session?.capabilities?.[surface];
      return !!caps && caps[action] === true;
    },
    [session],
  );

  const value = useMemo<AuthValue>(() => ({ session, loading, refresh, logout, can }), [session, loading, refresh, logout, can]);

  if (loading) {
    return (
      <div className="ad-root" data-ad-root="">
        <p className="ad-empty">Đang tải trang quản trị…</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      <div className="ad-root" data-ad-root="">
        {!session?.user ? <LoginPage onSignedIn={refresh} /> : <Shell />}
      </div>
    </AuthContext.Provider>
  );
}

function LoginPage({ onSignedIn }: { onSignedIn: () => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/session', { email, password });
      setPassword('');
      await onSignedIn();
    } catch (err) {
      setError(describeFailure(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ad-login">
      <form onSubmit={submit}>
        <h1>Lagom — Trang quản trị</h1>
        <p className="ad-sub">Đăng nhập bằng tài khoản nhân sự. Xác thực hai lớp chưa bật cho bản build này.</p>
        {error ? <div className="ad-note ad-note--error" role="alert">{error}</div> : null}
        <label className="ad-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>
        <label className="ad-field">
          <span>Mật khẩu</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button className="ad-btn" type="submit" disabled={busy}>
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}

const SEARCH_LINKS: Record<string, (id: string) => string> = {
  product: (id) => `/admin/products/${id}`,
  collection: (id) => `/admin/collections/${id}`,
  page: (id) => `/admin/pages/${id}`,
  media: () => `/admin/media`,
};

function GlobalSearch() {
  const [q, setQ] = useState('');
  const [groups, setGroups] = useState<{ type: string; label: string; items: { id: string }[] }[]>([]);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setGroups([]);
      return;
    }
    timer.current = window.setTimeout(() => {
      api.get<{ groups: { type: string; label: string; items: { id: string }[] }[] }>(`/api/admin/search?q=${encodeURIComponent(q)}`)
        .then((res) => setGroups(res.groups))
        .catch(() => setGroups([]));
    }, 300);
    return () => window.clearTimeout(timer.current);
  }, [q]);

  return (
    <div className="ad-search" style={{ position: 'relative' }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm sản phẩm, bộ sưu tập, trang…"
              aria-label="Tìm kiếm toàn hệ thống"
            />
      {groups.length > 0 && (
        <div className="ad-panel" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, maxHeight: 320, overflow: 'auto' }}>
          {groups.map((g) => (
            <div key={g.type}>
              <div className="ad-nav-group">{g.label}</div>
              {g.items.map((it) => (
                <Link key={it.id} to={(SEARCH_LINKS[g.type] ?? (() => '/admin'))(it.id)} onClick={() => setQ('')} style={{ display: 'block', padding: '4px 8px' }}>
                  <span className="ad-mono">{it.id.slice(0, 8)}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Shell() {
  const { session, logout, can } = useAuth();
  const location = useLocation();

  const visibleGroups = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.surface || can(item.surface, 'read')),
  })).filter((group) => group.items.length > 0);

  const current = NAV.flatMap((g) => g.items.map((item) => ({ ...item, group: g.group }))).find(
    (item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)),
  );

  return (
    <div className="ad-shell">
      <nav className="ad-side" aria-label="Các mục quản trị">
        <div className="ad-brand">
          <Icon name="flower" size={20} />
          Lagom
          <span>Quản trị</span>
        </div>
        {visibleGroups.map((group) => (
          <div key={group.group}>
            <div className="ad-nav-group">{group.group}</div>
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="ad-nav-link" title={item.label}>
                <Icon name={item.icon} />
                <span className="ad-nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="ad-main">
        <header className="ad-topbar">
          <div className="ad-crumbs" aria-label="Breadcrumb">
            Quản trị {current ? <>/ {current.group} / <b>{current.label}</b></> : null}
          </div>
          <GlobalSearch />
          <div className="ad-user">
            <span>{session?.user?.email}</span>
            <span className="ad-badge">{session?.user?.role}</span>
            <button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" onClick={() => void logout()}>
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="ad-body">
          {/* Absolute paths: this <Routes> is not nested under a /admin/* parent route, so relative
              paths would be matched against the full pathname and never match. */}
          <Routes>
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/admin/pages" element={<PageListPage />} />
            <Route path="/admin/pages/:id" element={<PageEditorPage />} />
            <Route path="/admin/products" element={<ProductListPage />} />
            <Route path="/admin/products/:id" element={<ProductEditorPage />} />
            <Route path="/admin/collections" element={<CollectionListPage />} />
            <Route path="/admin/collections/:id" element={<CollectionEditorPage />} />
            <Route path="/admin/media" element={<MediaPage />} />
            <Route path="/admin/navigation" element={<NavigationPage />} />
            <Route path="/admin/promotions" element={<PromotionsPage />} />
            <Route path="/admin/testimonials" element={<TestimonialsPage />} />
            <Route path="/admin/faqs" element={<FaqsPage />} />
            <Route path="/admin/appearance" element={<AppearancePage />} />
            <Route path="/admin/releases" element={<ReleasesPage />} />
            <Route path="/admin/import" element={<ImportPage />} />
            <Route path="/admin/business" element={<BusinessSettingsPage />} />
            <Route path="/admin/team" element={<TeamPage />} />
            <Route path="/admin/activity" element={<ActivityPage />} />
            <Route path="/admin/settings" element={<Navigate to="/admin/business" replace />} />
            <Route path="/admin/website" element={<Navigate to="/admin/pages" replace />} />
            <Route path="/admin/seo" element={<NotBuiltYet label="Quản lý redirect và SEO sẽ có ở giai đoạn sau; xem docs/admin/plan.md." />} />
            <Route path="/admin/*" element={<NotFoundInAdmin />} />
          </Routes>
        </main>
      </div>
      <Link to="/" className="ad-skip" style={{ position: 'absolute', left: '-9999px' }}>
        Xem trang cửa hàng
      </Link>
    </div>
  );
}

function NotBuiltYet({ label }: { label: string }) {
  return (
    <section>
      <h1 className="ad-title">Chưa có trong bản phát hành này</h1>
      <div className="ad-note">{label}</div>
      <p className="ad-sub">
        Xem <code>docs/admin/plan.md</code> để biết những gì bị hoãn và lý do. Mục ẩn ở đây thay vì
        hiển thị một màn hình trống, để nhân sự không bấm vào chức năng chết.
      </p>
    </section>
  );
}

function NotFoundInAdmin() {
  return (
    <section>
      <h1 className="ad-title">Không tìm thấy màn hình</h1>
      <p className="ad-sub">
        Đường dẫn quản trị này không tồn tại. <Link to="/admin">Về bảng điều khiển</Link>.
      </p>
    </section>
  );
}
