import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, describeFailure, editablePayload, ApiFailure, type ApiFieldError } from '../api';
import { useAuth } from '../AdminApp';
import { Badge, EmptyState, Field, Panel, errorsFor, fmtTime, fmtVnd, visibilityTone } from '../ui';

type Variant = {
  id: string;
  sku?: string;
  label: string;
  priceVnd: number | null;
  compareAtVnd?: number | null;
  salePriceVnd?: number | null;
  saleStart?: string | null;
  saleEnd?: string | null;
  availability?: string;
  leadHours?: number | null;
  imageIds?: string[];
};

type Summary = {
  id: string;
  slug: string | null;
  visibility: string;
  version: number;
  unpublishedChanges: boolean;
  updatedAt: string;
  title: string | null;
  sku: string | null;
  printedNumber: number | null;
  provisionalName: boolean;
  startingPriceVnd: number | null;
  importProvenance: Record<string, unknown> | null;
};

type Detail = {
  entity: Summary;
  working: { revisionId: number; payload: Record<string, unknown>; createdAt: string } | null;
  published: { revisionId: number; payload: Record<string, unknown> } | null;
  issues: string[];
  publishBlockers: ApiFieldError[];
};

const AVAILABILITY = ['available', 'unavailable', 'preorder'];
const AVAILABILITY_LABELS: Record<string, string> = { available: 'Còn hàng', unavailable: 'Hết hàng', preorder: 'Đặt trước' };
const VISIBILITY_LABELS: Record<string, string> = { published: 'Đã xuất bản', unpublished: 'Nháp', archived: 'Lưu trữ' };

export function ProductListPage() {
  const [items, setItems] = useState<Summary[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { can } = useAuth();
  const navigate = useNavigate();

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: '25', offset: String(offset) });
    if (status !== 'all') params.set('visibility', status);
    if (q) params.set('q', q);
    api
      .get<{ items: Summary[]; total: number }>(`/api/admin/product?${params}`)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(describeFailure(err).message));
  }, [status, q, offset]);

  useEffect(load, [load]);

  async function createBlank() {
    try {
      const made = await api.post<{ entityId: string }>('/api/admin/product', {
        payload: { title: 'Untitled product', variants: [{ id: 'v1', label: 'Tiêu chuẩn', priceVnd: null, availability: 'available' }] },
      });
      navigate(`/admin/products/${made.entityId}`);
    } catch (err) {
      setError(describeFailure(err).message);
    }
  }

  return (
    <section>
      <h1 className="ad-title">Sản phẩm</h1>
      <p className="ad-sub">{total} sản phẩm. Tiêu đề nhập từ bảng giá là tạm tính cho đến khi chủ shop xác nhận.</p>
      {error ? <div className="ad-note ad-note--error">{error}</div> : null}

      <div className="ad-row" style={{ marginBottom: 12 }}>
        <Field label="Tìm kiếm">
          <input value={q} onChange={(e) => { setQ(e.target.value); setOffset(0); }} placeholder="Tiêu đề, slug hoặc nội dung" />
        </Field>
        <Field label="Trạng thái">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }}>
            <option value="all">Tất cả trạng thái</option>
            <option value="published">Đã xuất bản</option>
            <option value="unpublished">Nháp</option>
            <option value="archived">Lưu trữ</option>
          </select>
        </Field>
        {can('product', 'create' as never) || can('product', 'edit') ? (
          <button className="ad-btn" type="button" onClick={createBlank}>Sản phẩm mới</button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState>
          Không có sản phẩm nào khớp. <Link to="/admin/import">Nhập bảng giá của chủ shop</Link> để tạo 60 bản nháp chờ duyệt.
        </EmptyState>
      ) : (
        <table className="ad-table">
          <thead>
            <tr>
              <th>Tiêu đề</th><th>Slug</th><th>SKU</th><th className="ad-num">Giá</th><th>Trạng thái</th><th>Thay đổi</th><th>Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link to={`/admin/products/${p.id}`}>{p.title ?? '(không tiêu đề)'}</Link>
                  {p.provisionalName ? <span className="ad-badge ad-badge--draft" style={{ marginLeft: 6 }}>tạm tính</span> : null}
                </td>
                <td className="ad-mono">{p.slug ?? '—'}</td>
                <td className="ad-mono">{p.sku ?? '—'}</td>
                <td className="ad-num">{fmtVnd(p.startingPriceVnd)}</td>
                <td><Badge tone={visibilityTone(p.visibility)}>{VISIBILITY_LABELS[p.visibility] ?? p.visibility}</Badge></td>
                <td>{p.unpublishedChanges ? <Badge tone="draft">có thay đổi chưa xuất bản</Badge> : <span className="ad-sub" style={{ margin: 0 }}>—</span>}</td>
                <td>{fmtTime(p.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="ad-row" style={{ marginTop: 12, alignItems: 'center' }}>
        <button className="ad-btn ad-btn--ghost ad-btn--sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 25))}>Trước</button>
        <span className="ad-sub" style={{ margin: 0 }}>Đang hiển thị {offset + 1}–{Math.min(total, offset + 25)} / {total}</span>
        <button className="ad-btn ad-btn--ghost ad-btn--sm" disabled={offset + 25 >= total} onClick={() => setOffset(offset + 25)}>Sau</button>
      </div>
    </section>
  );
}

export function ProductEditorPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [version, setVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved' | 'failed'>('saved');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [fields, setFields] = useState<ApiFieldError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Record<string, unknown> | null>(null);
  const [revisions, setRevisions] = useState<{ id: number; label: string; createdAt: string }[]>([]);
  const versionRef = useRef(0);
  const priceAllowed = can('product', 'price');

  const load = useCallback(async () => {
    const res = await api.get<Detail>(`/api/admin/product/${id}`);
    setDetail(res);
    setPayload(editablePayload(res.working?.payload ?? {}));
    setVersion(res.entity.version);
    versionRef.current = res.entity.version;
    setSaveState('saved');
    setSavedAt(res.working?.createdAt ?? null);
  }, [id]);

  useEffect(() => {
    load().catch((err) => setMessage(describeFailure(err).message));
    api.get<{ items: { id: number; label: string; createdAt: string }[] }>(`/api/admin/product/${id}/revisions`)
      .then((r) => setRevisions(r.items))
      .catch(() => setRevisions([]));
  }, [id, load]);

  const variants = useMemo(() => (Array.isArray(payload.variants) ? (payload.variants as Variant[]) : []), [payload]);

  const persist = useCallback(async () => {
    setSaveState('saving');
    try {
      const res = await api.patch<{ version: number; revisionId: number }>(`/api/admin/product/${id}`, {
        payload,
        expectedVersion: versionRef.current,
      });
      versionRef.current = res.version;
      setVersion(res.version);
      setSaveState('saved');
      setSavedAt(new Date().toISOString());
      setFields([]);
      setDirty(false);
    } catch (err) {
      const failure = describeFailure(err);
      setFields(failure.fields);
      setSaveState('failed');
      if (err instanceof ApiFailure && err.kind === 'conflict') {
        setConflict(err.details ?? {});
      } else {
        setMessage(failure.message);
      }
    }
  }, [id, payload]);

  // EDIT-04: autosave roughly two seconds after editing stops. Saving never publishes.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => void persist(), 2000);
    return () => clearTimeout(timer);
  }, [dirty, payload, persist]);

  function edit(patch: Record<string, unknown>) {
    setPayload((prev) => ({ ...prev, ...patch }));
    setDirty(true);
    setSaveState('unsaved');
  }

  function editVariant(index: number, patch: Partial<Variant>) {
    const next = variants.map((v, i) => (i === index ? { ...v, ...patch } : v));
    edit({ variants: next });
  }

  function moveVariant(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= variants.length) return;
    const next = [...variants];
    [next[index], next[target]] = [next[target], next[index]];
    edit({ variants: next });
  }

  async function publish() {
    setMessage('Đang xuất bản…');
    try {
      if (dirty) await persist();
      const built = await api.post<{ releaseId: string; validation: { ok: boolean; entries: { errors: string[] }[] } }>('/api/admin/releases', {
        items: [{ entityType: 'product', entityId: id }],
      });
      if (!built.validation.ok) {
        const problems = built.validation.entries.flatMap((e) => e.errors);
        setFields(problems.map((path) => ({ path: String(path).split(':')[0], message: String(path) })));
        setMessage('Kiểm tra hợp lệ khi xuất bản thất bại. Sửa các trường được liệt kê, rồi xuất bản lại.');
        return;
      }
      const activated = await api.postWithIdempotency<{ activated: boolean }>(`/api/admin/releases/${built.releaseId}/activate`, `publish-${id}-${Date.now()}`);
      setMessage(activated.activated ? 'Đã xuất bản. Trang công khai đang phục vụ phiên bản này.' : 'Đã được xuất bản rồi.');
      await load();
    } catch (err) {
      const failure = describeFailure(err);
      setFields(failure.fields);
      setMessage(failure.message);
    }
  }

  async function restoreRevision(revisionId: number) {
    try {
      const res = await api.post<{ version: number }>(`/api/admin/product/${id}/revisions/${revisionId}/restore`, { expectedVersion: versionRef.current });
      versionRef.current = res.version;
      await load();
      setMessage('Đã khôi phục thành bản nháp mới. Lịch sử không thay đổi.');
    } catch (err) {
      setMessage(describeFailure(err).message);
    }
  }

  async function archive() {
    if (!window.confirm('Lưu trữ sản phẩm này? Các lưới đã xuất bản sẽ dùng phương án dự phòng đã cấu hình.')) return;
    try {
      await api.post(`/api/admin/product/${id}/archive`, { expectedVersion: versionRef.current });
      setMessage('Đã lưu trữ.');
      await load();
    } catch (err) {
      setMessage(describeFailure(err).message);
    }
  }

  if (!detail) return <p className="ad-sub">Đang tải sản phẩm…</p>;

  const canPublish = can('release', 'publish');

  return (
    <section>
      <div className="ad-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="ad-title" style={{ flex: '2 1 320px' }}>{(payload.title as string) || detail.entity.title || 'Sản phẩm'}</h1>
        <span className="ad-save-state">
          {saveState === 'saving' ? 'Đang lưu…' : saveState === 'unsaved' ? 'Có thay đổi chưa lưu' : saveState === 'failed' ? 'Lần lưu cuối thất bại — thay đổi của bạn vẫn được giữ' : `Đã lưu ${fmtTime(savedAt)}`}
        </span>
      </div>
      <p className="ad-sub">
        <Link to="/admin/products">Sản phẩm</Link> / {detail.entity.slug ?? detail.entity.id.slice(0, 8)} ·{' '}
        <Badge tone={visibilityTone(detail.entity.visibility)}>{VISIBILITY_LABELS[detail.entity.visibility] ?? detail.entity.visibility}</Badge>{' '}
        {detail.entity.unpublishedChanges ? <Badge tone="draft">có thay đổi chưa xuất bản</Badge> : null}
      </p>

      {message ? <div className="ad-note">{message}</div> : null}
      {detail.issues.length ? (
        <div className="ad-note ad-note--warn">
          <strong>Vấn đề nội dung</strong>
          <ul className="ad-list">{detail.issues.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      ) : null}
      {conflict ? (
        <div className="ad-note ad-note--error">
          <strong>Một người chỉnh sửa khác đã lưu trước.</strong> Phần bạn làm vẫn còn trong biểu mẫu này.
          <div className="ad-actions">
            <button className="ad-btn" type="button" onClick={() => { setConflict(null); void load(); }}>Bỏ của tôi và tải lại của họ</button>
            <button className="ad-btn ad-btn--ghost" type="button" onClick={() => setConflict(null)}>Tiếp tục sửa của tôi</button>
          </div>
        </div>
      ) : null}

      <div className="ad-two-col">
        <div>
          <Panel title="Nhận dạng">
            <Field label="Tiêu đề" error={errorsFor(fields, 'title')}>
              <input value={(payload.title as string) ?? ''} onChange={(e) => edit({ title: e.target.value })} />
            </Field>
            {payload.nameProvisional === true ? (
              <div className="ad-note ad-note--warn">Tên này còn tạm tính (được nhập). Chủ shop phải xác nhận — cần bỏ chọn cờ này trước khi xuất bản.</div>
            ) : null}
            <div className="ad-row">
              <Field label="Slug" error={errorsFor(fields, 'slug')}>
                <input value={(payload.slug as string) ?? detail.entity.slug ?? ''} onChange={(e) => edit({ slug: e.target.value })} />
              </Field>
              <Field label="SKU" error={errorsFor(fields, 'sku')}>
                <input value={(payload.sku as string) ?? ''} onChange={(e) => edit({ sku: e.target.value })} />
              </Field>
              <Field label="Số catalog in trên sản phẩm" hint="Chỉ hiển thị — không bao giờ là khóa định danh">
                <input
                  type="number"
                  value={(payload.printedNumber as number) ?? ''}
                  onChange={(e) => edit({ printedNumber: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </Field>
            </div>
            <label className="ad-check">
              <input
                type="checkbox"
                checked={payload.nameProvisional === true}
                onChange={(e) => edit({ nameProvisional: e.target.checked })}
              />
              Tên vẫn còn tạm tính
            </label>
          </Panel>

          <Panel title="Nội dung">
            <Field label="Mô tả" error={errorsFor(fields, 'description')}>
              <textarea value={(payload.description as string) ?? ''} onChange={(e) => edit({ description: e.target.value })} />
            </Field>
            <Field label="Hướng dẫn bảo quản">
              <textarea value={(payload.careNotes as string) ?? ''} onChange={(e) => edit({ careNotes: e.target.value })} />
            </Field>
            <Field label="Ghi chú thay thế">
              <textarea value={(payload.substitutionNote as string) ?? ''} onChange={(e) => edit({ substitutionNote: e.target.value })} />
            </Field>
          </Panel>

          <Panel title={`Biến thể (${variants.length})`}>
            {!priceAllowed ? <div className="ad-note">Giá chỉ đọc với phân quyền của bạn. Hãy nhờ Admin hoặc Catalog Manager thay đổi (PERM-05).</div> : null}
            {variants.map((v, i) => (
              <div key={String(v.id) || i} style={{ border: '1px solid var(--ad-border)', borderRadius: 4, padding: 10, marginBottom: 10 }}>
                <div className="ad-row">
                  <Field label="Nhãn" error={errorsFor(fields, `variants[${i}].label`)}>
                    <input value={v.label} onChange={(e) => editVariant(i, { label: e.target.value })} />
                  </Field>
                  <Field label="SKU biến thể">
                    <input value={v.sku ?? ''} onChange={(e) => editVariant(i, { sku: e.target.value })} />
                  </Field>
                  <Field label="Giá (VND)" error={errorsFor(fields, `variants[${i}].priceVnd`)}>
                    <input
                      type="number"
                      disabled={!priceAllowed}
                      value={v.priceVnd ?? ''}
                      onChange={(e) => editVariant(i, { priceVnd: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Giá so sánh (VND)" error={errorsFor(fields, `variants[${i}].compareAtVnd`)}>
                    <input
                      type="number"
                      disabled={!priceAllowed}
                      value={v.compareAtVnd ?? ''}
                      onChange={(e) => editVariant(i, { compareAtVnd: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </Field>
                </div>
                <div className="ad-row">
                  <Field label="Giá khuyến mãi (VND)" error={errorsFor(fields, `variants[${i}].salePriceVnd`)}>
                    <input
                      type="number"
                      disabled={!priceAllowed}
                      value={v.salePriceVnd ?? ''}
                      onChange={(e) => editVariant(i, { salePriceVnd: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Bắt đầu khuyến mãi (không bắt buộc)">
                    <input type="datetime-local" disabled={!priceAllowed} value={(v.saleStart ?? '').slice(0, 16)} onChange={(e) => editVariant(i, { saleStart: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                  </Field>
                  <Field label="Kết thúc khuyến mãi (không bao gồm)">
                    <input type="datetime-local" disabled={!priceAllowed} value={(v.saleEnd ?? '').slice(0, 16)} onChange={(e) => editVariant(i, { saleEnd: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                  </Field>
                  <Field label="Tình trạng">
                    <select value={v.availability ?? 'available'} onChange={(e) => editVariant(i, { availability: e.target.value })}>
                      {AVAILABILITY.map((a) => <option key={a} value={a}>{AVAILABILITY_LABELS[a]}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="ad-row" style={{ alignItems: 'center' }}>
                  <button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" onClick={() => moveVariant(i, -1)} disabled={i === 0}>Lên trên</button>
                  <button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" onClick={() => moveVariant(i, 1)} disabled={i === variants.length - 1}>Xuống dưới</button>
                  <span className="ad-sub" style={{ margin: 0 }}>Giá hiện tại: {fmtVnd(v.priceVnd)}</span>
                </div>
              </div>
            ))}
            <button
              className="ad-btn ad-btn--ghost ad-btn--sm"
              type="button"
              onClick={() => edit({ variants: [...variants, { id: `v${variants.length + 1}`, label: 'New option', priceVnd: null, availability: 'available' }] })}
            >
              Thêm biến thể
            </button>
          </Panel>

          <Panel title="Hình ảnh">
            <Field label="ID tài nguyên ảnh bìa" error={errorsFor(fields, 'coverAssetId')} hint="Dán ID tài nguyên từ thư viện media.">
              <input value={(payload.coverAssetId as string) ?? ''} onChange={(e) => edit({ coverAssetId: e.target.value || null })} />
            </Field>
            <p className="ad-sub">Ảnh có in giá trong bức ảnh phải được đánh dấu trong thư viện media, nếu không khách hàng sẽ không thấy thay đổi giá (IMPORT-05).</p>
          </Panel>

          <Panel title="Siêu dữ liệu tìm kiếm">
            <Field label="Tiêu đề SEO">
              <input value={((payload.seo as Record<string, unknown>)?.title as string) ?? ''} onChange={(e) => edit({ seo: { ...(payload.seo as object), title: e.target.value } })} />
            </Field>
            <Field label="Mô tả SEO">
              <textarea value={((payload.seo as Record<string, unknown>)?.description as string) ?? ''} onChange={(e) => edit({ seo: { ...(payload.seo as object), description: e.target.value } })} />
            </Field>
          </Panel>
        </div>

        <div>
          <Panel title="Xuất bản">
            <p className="ad-sub">Lưu sẽ ghi bản nháp. Xuất bản là hành động riêng và không bao giờ tự động xảy ra.</p>
            <div className="ad-actions" style={{ borderTop: 0, paddingTop: 0 }}>
              <button className="ad-btn" type="button" onClick={() => void persist()} disabled={saveState === 'saving'}>Lưu nháp</button>
              {canPublish ? <button className="ad-btn ad-btn--ghost" type="button" onClick={() => void publish()}>Xuất bản ngay</button> : null}
              <button className="ad-btn ad-btn--danger" type="button" onClick={() => void archive()}>Lưu trữ</button>
            </div>
            {detail.publishBlockers.length ? (
              <div className="ad-note ad-note--error" style={{ marginTop: 12 }}>
                <strong>Chặn xuất bản</strong>
                <ul className="ad-list">{detail.publishBlockers.map((b, i) => <li key={`${b.path}-${i}`}>{b.path}: {b.message}</li>)}</ul>
              </div>
            ) : null}
            {detail.entity.importProvenance ? (
              <p className="ad-sub">
                Nhập từ <span className="ad-mono">{String(detail.entity.importProvenance.externalKey ?? '')}</span>
              </p>
            ) : null}
          </Panel>

          <Panel title="Lịch sử">
            {revisions.length ? (
              <table className="ad-table">
                <thead><tr><th>Mã</th><th>Nhãn</th><th>Thời gian</th><th></th></tr></thead>
                <tbody>
                  {revisions.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.label}</td>
                      <td>{fmtTime(r.createdAt)}</td>
                      <td><button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" onClick={() => void restoreRevision(r.id)}>Khôi phục thành nháp</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState>Chưa có phiên bản nào.</EmptyState>}
          </Panel>
        </div>
      </div>
      <p className="ad-sub">Phiên bản {version} của bản ghi này. Các lần lưu đồng thời bị từ chối bằng xung đột thay vì ghi đè.</p>
    </section>
  );
}
