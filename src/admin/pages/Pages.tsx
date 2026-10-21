// Page composer: pages hold an ordered list of approved sections (§4). Admins add, edit,
// duplicate, reorder (keyboard-accessible buttons), hide and remove sections; only fields
// relevant to the section type are shown; product/collection selectors are dedicated pickers,
// never raw-id inputs. Save writes a draft revision; publishing is a separate action.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, describeFailure, editablePayload, ApiFailure, type ApiFieldError } from '../api';
import { useAuth } from '../AdminApp';
import { Badge, EmptyState, Field, Panel, errorsFor, fmtTime, visibilityTone } from '../ui';
import { publishEntity } from '../crud';

type SummaryRow = {
  id: string; slug: string | null; visibility: string; version: number;
  unpublishedChanges: boolean; updatedAt: string; title: string | null;
};
type Section = {
  id: string; type: string; hidden?: boolean; heading?: string; description?: string;
  imageAssetId?: string | null; collectionId?: string | null; productIds?: string[];
  buttonLabel?: string; buttonUrl?: string; layout?: string; category?: string;
  items?: { label: string; description?: string; url?: string; imageAssetId?: string }[];
};
type Detail = {
  entity: SummaryRow;
  working: { revisionId: number; payload: Record<string, unknown>; createdAt: string } | null;
  published: { revisionId: number; payload: Record<string, unknown> } | null;
  issues: string[];
  publishBlockers: ApiFieldError[];
};

const SECTION_TYPES: [string, string][] = [
  ['hero', 'Ảnh bìa (Hero)'],
  ['benefits', 'Cam kết / lợi ích'],
  ['category-cards', 'Thẻ danh mục / dịp'],
  ['featured-collection', 'Bộ sưu tập nổi bật'],
  ['featured-products', 'Sản phẩm nổi bật'],
  ['budget-cards', 'Mua theo ngân sách'],
  ['image-text', 'Ảnh và chữ'],
  ['testimonials', 'Đánh giá khách hàng'],
  ['delivery-info', 'Thông tin giao hàng'],
  ['custom-cta', 'Đặt hoa theo yêu cầu (CTA)'],
  ['brand-story', 'Câu chuyện thương hiệu'],
  ['faq-accordion', 'Câu hỏi thường gặp'],
  ['promo-banner', 'Banner khuyến mãi'],
];
const TYPE_LABEL = Object.fromEntries(SECTION_TYPES);
const needs = {
  image: (t: string) => ['hero', 'image-text', 'brand-story', 'category-cards'].includes(t),
  button: (t: string) => ['hero', 'image-text', 'custom-cta'].includes(t),
  items: (t: string) => ['benefits', 'category-cards', 'budget-cards', 'delivery-info'].includes(t),
};

export function PageListPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<SummaryRow[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: '100' });
    if (q) params.set('q', q);
    api.get<{ items: SummaryRow[] }>(`/api/admin/page?${params}`)
      .then((res) => setItems(res.items))
      .catch((e) => setError(describeFailure(e).message));
  }, [q]);
  useEffect(load, [load]);

  async function create() {
    try {
      const made = await api.post<{ entityId: string }>('/api/admin/page', {
        payload: { title: 'Trang mới', sections: [] },
      });
      navigate(`/admin/pages/${made.entityId}`);
    } catch (e) {
      setError(describeFailure(e).message);
    }
  }

  return (
    <section>
      <h1 className="ad-title">Trang</h1>
      <p className="ad-sub">Trang chủ và các trang nội dung được ghép từ các phần (section) có sẵn.</p>
      {error ? <div className="ad-note ad-note--error">{error}</div> : null}
      <div className="ad-row" style={{ marginBottom: 12 }}>
        <Field label="Tìm kiếm"><input value={q} onChange={(e) => setQ(e.target.value)} /></Field>
        {can('page', 'create') ? <button className="ad-btn" type="button" onClick={() => void create()}>Tạo trang mới</button> : null}
      </div>
      {items.length === 0 ? (
        <EmptyState>Chưa có trang nào trong CMS. Trang chủ hiện dùng nội dung dựng sẵn cho tới khi bạn tạo trang “home”.</EmptyState>
      ) : (
        <table className="ad-table">
          <thead><tr><th>Tiêu đề</th><th>Slug</th><th>Trạng thái</th><th>Cập nhật</th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/admin/pages/${p.id}`}>{p.title ?? '(chưa đặt)'}</Link></td>
                <td className="ad-mono">{p.slug ?? '—'}</td>
                <td>
                  <Badge tone={visibilityTone(p.visibility)}>{p.visibility === 'published' ? 'Đã xuất bản' : p.visibility === 'archived' ? 'Lưu trữ' : 'Nháp'}</Badge>
                  {p.unpublishedChanges ? <Badge tone="draft">có thay đổi chưa xuất bản</Badge> : null}
                </td>
                <td>{fmtTime(p.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function PageEditorPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const versionRef = useRef(0);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fields, setFields] = useState<ApiFieldError[]>([]);
  const [conflict, setConflict] = useState(false);
  const [newType, setNewType] = useState<string>('benefits');
  const [products, setProducts] = useState<{ id: string; title: string | null; slug: string | null }[]>([]);
  const [collections, setCollections] = useState<{ id: string; title: string | null; slug: string | null }[]>([]);

  const load = useCallback(async () => {
    const res = await api.get<Detail>(`/api/admin/page/${id}`);
    setDetail(res);
    setPayload(editablePayload(res.working?.payload ?? { sections: [] }));
    versionRef.current = res.entity.version;
    setDirty(false);
  }, [id]);

  useEffect(() => {
    load().catch((e) => setMessage(describeFailure(e).message));
    Promise.all([
      api.get<{ items: { id: string; title: string | null; slug: string | null }[] }>('/api/admin/product?limit=200'),
      api.get<{ items: { id: string; title: string | null; slug: string | null }[] }>('/api/admin/collection?limit=100'),
    ])
      .then(([p, c]) => { setProducts(p.items); setCollections(c.items); })
      .catch(() => undefined);
  }, [id, load]);

  const sections = useMemo(() => (Array.isArray(payload.sections) ? (payload.sections as Section[]) : []), [payload]);

  function edit(patch: Record<string, unknown>) {
    setPayload((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }

  function editSection(i: number, patch: Partial<Section>) {
    edit({ sections: sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  }

  function moveSection(i: number, d: -1 | 1) {
    const t = i + d;
    if (t < 0 || t >= sections.length) return;
    const next = [...sections];
    [next[i], next[t]] = [next[t], next[i]];
    edit({ sections: next });
  }

  function duplicateSection(i: number) {
    const copy = { ...sections[i], id: `${sections[i].id}-copy-${Date.now() % 100000}` };
    const next = [...sections];
    next.splice(i + 1, 0, copy);
    edit({ sections: next });
  }

  function addSection() {
    edit({ sections: [...sections, { id: `s${Date.now() % 1000000}`, type: newType, heading: TYPE_LABEL[newType] }] });
  }

  async function save(): Promise<boolean> {
    try {
      const res = await api.patch<{ version: number }>(`/api/admin/page/${id}`, { payload, expectedVersion: versionRef.current });
      versionRef.current = res.version;
      setDirty(false);
      setFields([]);
      setMessage('Đã lưu nháp trang.');
      return true;
    } catch (err) {
      if (err instanceof ApiFailure && err.kind === 'conflict') setConflict(true);
      const f = describeFailure(err);
      setFields(f.fields);
      setMessage(f.message);
      return false;
    }
  }

  async function publish() {
    if (dirty && !(await save())) return;
    try {
      await publishEntity('page', id);
      setMessage('Đã xuất bản trang. Trang công khai dùng đúng nội dung vừa lưu.');
      await load();
    } catch (err) {
      setMessage(describeFailure(err).message);
    }
  }

  if (!detail) return <p className="ad-sub">Đang tải trang…</p>;
  const editable = can('page', 'edit');

  return (
    <section>
      <div className="ad-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="ad-title">{(payload.title as string) || detail.entity.title || 'Trang'}</h1>
        <span className="ad-save-state">{dirty ? 'Có thay đổi chưa lưu' : 'Đã lưu'}</span>
      </div>
      <p className="ad-sub">
        <Link to="/admin/pages">Trang</Link> / {detail.entity.slug ?? detail.entity.id.slice(0, 8)} ·{' '}
        <Badge tone={visibilityTone(detail.entity.visibility)}>{detail.entity.visibility === 'published' ? 'Đã xuất bản' : 'Nháp'}</Badge>
      </p>
      {message ? <div className="ad-note">{message}</div> : null}
      {conflict ? (
        <div className="ad-note ad-note--error">
          <strong>Một biên tập viên khác đã lưu trước bạn.</strong>
          <div className="ad-actions">
            <button className="ad-btn" type="button" onClick={() => { setConflict(false); void load(); }}>Tải lại bản mới nhất</button>
            <button className="ad-btn ad-btn--ghost" type="button" onClick={() => setConflict(false)}>Giữ bản của tôi</button>
          </div>
        </div>
      ) : null}

      <div className="ad-two-col">
        <div>
          <Panel title="Thông tin trang">
            <Field label="Tiêu đề" error={errorsFor(fields, 'title')}>
              <input disabled={!editable} value={(payload.title as string) ?? ''} onChange={(e) => edit({ title: e.target.value })} />
            </Field>
            <div className="ad-row">
              <Field label="Slug" error={errorsFor(fields, 'slug')} hint='Trang chủ dùng slug "home".'>
                <input disabled={!editable} value={(payload.slug as string) ?? ''} onChange={(e) => edit({ slug: e.target.value })} />
              </Field>
              <label className="ad-check">
                <input type="checkbox" disabled={!editable} checked={payload.navVisible === true} onChange={(e) => edit({ navVisible: e.target.checked })} />
                Hiện trong menu (khi menu do CMS quản lý)
              </label>
            </div>
            <Field label="SEO title"><input disabled={!editable} value={((payload.seo as Record<string, unknown>)?.title as string) ?? ''} onChange={(e) => edit({ seo: { ...(payload.seo as object), title: e.target.value } })} /></Field>
            <Field label="SEO description"><textarea disabled={!editable} value={((payload.seo as Record<string, unknown>)?.description as string) ?? ''} onChange={(e) => edit({ seo: { ...(payload.seo as object), description: e.target.value } })} /></Field>
          </Panel>

          <Panel title={`Các phần của trang (${sections.length})`}>
            {sections.map((s, i) => (
              <div key={s.id} className={`ad-item${s.hidden ? ' ad-item--muted' : ''}`}>
                <div className="ad-row" style={{ alignItems: 'center' }}>
                  <b>{TYPE_LABEL[s.type] ?? s.type}</b>
                  <label className="ad-check">
                    <input type="checkbox" disabled={!editable} checked={s.hidden === true} onChange={(e) => editSection(i, { hidden: e.target.checked })} />
                    Ẩn
                  </label>
                  <span style={{ marginLeft: 'auto' }} className="ad-row">
                    <button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" disabled={!editable || i === 0} onClick={() => moveSection(i, -1)} aria-label="Lên trên">↑ Lên</button>
                    <button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" disabled={!editable || i === sections.length - 1} onClick={() => moveSection(i, 1)} aria-label="Xuống dưới">↓ Xuống</button>
                    <button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" disabled={!editable} onClick={() => duplicateSection(i)}>Nhân bản</button>
                    <button className="ad-btn ad-btn--danger ad-btn--sm" type="button" disabled={!editable} onClick={() => edit({ sections: sections.filter((_, j) => j !== i) })}>Xóa</button>
                  </span>
                </div>

                <Field label="Đầu đề" error={errorsFor(fields, `sections[${i}].heading`)}>
                  <input disabled={!editable} value={s.heading ?? ''} onChange={(e) => editSection(i, { heading: e.target.value })} />
                </Field>
                {s.type !== 'featured-products' && s.type !== 'testimonials' && s.type !== 'promo-banner' ? (
                  <Field label="Mô tả"><textarea disabled={!editable} value={s.description ?? ''} onChange={(e) => editSection(i, { description: e.target.value })} /></Field>
                ) : null}
                {needs.image(s.type) ? (
                  <Field label="Ảnh (mã tài nguyên trong Thư viện ảnh)" error={errorsFor(fields, `sections[${i}].imageAssetId`)}>
                    <input disabled={!editable} value={s.imageAssetId ?? ''} onChange={(e) => editSection(i, { imageAssetId: e.target.value || null })} />
                  </Field>
                ) : null}
                {s.type === 'image-text' || s.type === 'brand-story' ? (
                  <Field label="Bố cục">
                    <select disabled={!editable} value={s.layout ?? 'left'} onChange={(e) => editSection(i, { layout: e.target.value })}>
                      <option value="left">Ảnh bên trái</option>
                      <option value="right">Ảnh bên phải</option>
                    </select>
                  </Field>
                ) : null}
                {needs.button(s.type) ? (
                  <div className="ad-row">
                    <Field label="Nhãn nút"><input disabled={!editable} value={s.buttonLabel ?? ''} onChange={(e) => editSection(i, { buttonLabel: e.target.value })} /></Field>
                    <Field label="Nút dẫn tới"><input disabled={!editable} value={s.buttonUrl ?? ''} onChange={(e) => editSection(i, { buttonUrl: e.target.value })} /></Field>
                  </div>
                ) : null}
                {s.type === 'featured-collection' ? (
                  <Field label="Bộ sưu tập">
                    <select disabled={!editable} value={s.collectionId ?? ''} onChange={(e) => editSection(i, { collectionId: e.target.value || null })}>
                      <option value="">— chọn bộ sưu tập —</option>
                      {collections.map((c) => <option key={c.id} value={c.id}>{c.title ?? c.slug}</option>)}
                    </select>
                  </Field>
                ) : null}
                {s.type === 'featured-products' ? (
                  <Field label="Sản phẩm (giữ Ctrl để chọn nhiều)" error={errorsFor(fields, `sections[${i}].productIds`)}>
                    <select
                      disabled={!editable}
                      multiple
                      size={8}
                      value={s.productIds ?? []}
                      onChange={(e) => editSection(i, { productIds: [...e.target.selectedOptions].map((o) => o.value) })}
                    >
                      {products.map((p) => <option key={p.id} value={p.id}>{p.title ?? p.slug}</option>)}
                    </select>
                  </Field>
                ) : null}
                {s.type === 'faq-accordion' ? (
                  <Field label="Lọc theo nhóm FAQ (để trống = tất cả)"><input disabled={!editable} value={s.category ?? ''} onChange={(e) => editSection(i, { category: e.target.value })} /></Field>
                ) : null}
                {needs.items(s.type) ? (
                  <Field label="Danh sách mục">
                    {(s.items ?? []).map((it, k) => (
                      <div key={k} className="ad-row">
                        <input disabled={!editable} placeholder="Nhãn" value={it.label} onChange={(e) => editSection(i, { items: (s.items ?? []).map((x, j) => (j === k ? { ...x, label: e.target.value } : x)) })} />
                        <input disabled={!editable} placeholder="Mô tả (tùy chọn)" value={it.description ?? ''} onChange={(e) => editSection(i, { items: (s.items ?? []).map((x, j) => (j === k ? { ...x, description: e.target.value } : x)) })} />
                        <input disabled={!editable} placeholder="Đường dẫn (tùy chọn)" value={it.url ?? ''} onChange={(e) => editSection(i, { items: (s.items ?? []).map((x, j) => (j === k ? { ...x, url: e.target.value } : x)) })} />
                        <button className="ad-btn ad-btn--danger ad-btn--sm" type="button" disabled={!editable} onClick={() => editSection(i, { items: (s.items ?? []).filter((_, j) => j !== k) })}>Xóa</button>
                      </div>
                    ))}
                    <button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" disabled={!editable} onClick={() => editSection(i, { items: [...(s.items ?? []), { label: '' }] })}>+ Thêm mục</button>
                  </Field>
                ) : null}
              </div>
            ))}
            <div className="ad-row">
              <Field label="Thêm phần mới">
                <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                  {SECTION_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <button className="ad-btn" type="button" disabled={!editable} onClick={addSection}>Thêm phần</button>
            </div>
          </Panel>
        </div>

        <div>
          <Panel title="Xuất bản">
            <p className="ad-sub">Lưu chỉ tạo nháp. Xem trước dùng đúng component của cửa hàng, nhưng nội dung nháp chưa hiển thị ra ngoài.</p>
            {detail.publishBlockers.length ? (
              <div className="ad-note ad-note--error">
                <strong>Chặn xuất bản</strong>
                <ul className="ad-list">{detail.publishBlockers.map((b, i) => <li key={i}>{b.path}: {b.message}</li>)}</ul>
              </div>
            ) : null}
            <div className="ad-actions" style={{ borderTop: 0, paddingTop: 0 }}>
              {editable ? <button className="ad-btn" type="button" onClick={() => void save()}>{dirty ? 'Lưu nháp *' : 'Lưu nháp'}</button> : null}
              {can('release', 'publish') ? <button className="ad-btn ad-btn--ghost" type="button" onClick={() => void publish()}>Xuất bản</button> : null}
              <a className="ad-btn ad-btn--ghost" href={`/${detail.entity.slug === 'home' || !detail.entity.slug ? '' : `pages/${detail.entity.slug}/`}`} target="_blank" rel="noopener">Xem trang công khai</a>
            </div>
          </Panel>
          <Panel title="Lịch sử phiên bản">
            <RevisionList type="page" id={id} onRestored={() => void load()} />
          </Panel>
        </div>
      </div>
    </section>
  );
}

function RevisionList({ type, id, onRestored }: { type: string; id: string; onRestored: () => void }) {
  const [items, setItems] = useState<{ id: number; label: string; createdAt: string }[]>([]);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    api.get<{ items: { id: number; label: string; createdAt: string }[] }>(`/api/admin/${type}/${id}/revisions`)
      .then((r) => setItems(r.items))
      .catch(() => undefined);
  }, [type, id]);
  async function restore(revisionId: number) {
    try {
      await api.post(`/api/admin/${type}/${id}/revisions/${revisionId}/restore`, {});
      setNote('Đã khôi phục thành nháp mới.');
      onRestored();
    } catch (e) {
      setNote(describeFailure(e).message);
    }
  }
  if (!items.length) return <EmptyState>Chưa có lịch sử phiên bản.</EmptyState>;
  return (
    <>
      {note ? <div className="ad-note">{note}</div> : null}
      <table className="ad-table">
        <thead><tr><th>#</th><th>Nhãn</th><th>Thời gian</th><th></th></tr></thead>
        <tbody>
          {items.slice(0, 10).map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td><td>{r.label}</td><td>{fmtTime(r.createdAt)}</td>
              <td><button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" onClick={() => void restore(r.id)}>Khôi phục</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
