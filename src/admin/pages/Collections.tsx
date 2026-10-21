import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, describeFailure, editablePayload, type ApiFieldError } from '../api';
import { useAuth } from '../AdminApp';
import { Badge, EmptyState, Field, Panel, errorsFor, fmtTime, visibilityTone } from '../ui';

type Summary = {
  id: string;
  slug: string | null;
  visibility: string;
  version: number;
  unpublishedChanges: boolean;
  updatedAt: string;
  title: string | null;
};

type Detail = {
  entity: Summary;
  working: { payload: Record<string, unknown> } | null;
  issues: string[];
  publishBlockers: ApiFieldError[];
};

type RuleCondition = { field: string; op: string; value: string };
const RULE_FIELDS = ['occasion', 'flowerTypes', 'colors', 'priceVnd', 'availability'];
const RULE_OPS = ['in', 'not_in', 'eq', 'neq', 'lt', 'lte', 'gt', 'gte'];
const VISIBILITY_LABELS: Record<string, string> = { published: 'Đã xuất bản', unpublished: 'Nháp', archived: 'Lưu trữ' };

export function CollectionListPage() {
  const [items, setItems] = useState<Summary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { can } = useAuth();
  const navigate = useNavigate();

  const load = useCallback(() => {
    api.get<{ items: Summary[] }>('/api/admin/collection?limit=100').then((r) => setItems(r.items)).catch((e) => setError(describeFailure(e).message));
  }, []);
  useEffect(load, [load]);

  async function create() {
    try {
      const made = await api.post<{ entityId: string }>('/api/admin/collection', {
        payload: { title: 'New collection', membershipMode: 'manual', manualIds: [] },
      });
      navigate(`/admin/collections/${made.entityId}`);
    } catch (e) {
      setError(describeFailure(e).message);
    }
  }

  return (
    <section>
      <h1 className="ad-title">Bộ sưu tập</h1>
      <p className="ad-sub">Sản phẩm trong bộ sưu tập có thể là danh sách thủ công có thứ tự hoặc theo luật rõ ràng. Chế độ luật luôn là ALL hoặc ANY — không bao giờ ngầm định.</p>
      {error ? <div className="ad-note ad-note--error">{error}</div> : null}
      {can('collection', 'edit') ? (
        <div className="ad-row" style={{ justifyContent: 'flex-end' }}>
          <button className="ad-btn" type="button" onClick={create}>Bộ sưu tập mới</button>
        </div>
      ) : null}
      {items.length === 0 ? <EmptyState>Chưa có bộ sưu tập nào.</EmptyState> : (
        <table className="ad-table">
          <thead><tr><th>Tiêu đề</th><th>Slug</th><th>Trạng thái</th><th>Thay đổi</th><th>Cập nhật</th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td><Link to={`/admin/collections/${c.id}`}>{c.title ?? '(không tiêu đề)'}</Link></td>
                <td className="ad-mono">{c.slug ?? '—'}</td>
                <td><Badge tone={visibilityTone(c.visibility)}>{VISIBILITY_LABELS[c.visibility] ?? c.visibility}</Badge></td>
                <td>{c.unpublishedChanges ? <Badge tone="draft">có thay đổi chưa xuất bản</Badge> : '—'}</td>
                <td>{fmtTime(c.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function CollectionEditorPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [version, setVersion] = useState(0);
  const [fields, setFields] = useState<ApiFieldError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  useEffect(() => {
    api.get<Detail>(`/api/admin/collection/${id}`)
      .then((res) => {
        setDetail(res);
        setPayload(editablePayload(res.working?.payload ?? {}));
        setVersion(res.entity.version);
      })
      .catch((e) => setMessage(describeFailure(e).message));
  }, [id]);

  const mode = (payload.membershipMode as string) ?? 'manual';
  const rules = (payload.rules as { mode?: string; conditions?: RuleCondition[] }) ?? {};
  const conditions = Array.isArray(rules.conditions) ? rules.conditions : [];
  const manualIds = Array.isArray(payload.manualIds) ? (payload.manualIds as string[]) : [];

  function edit(patch: Record<string, unknown>) {
    setPayload((p) => ({ ...p, ...patch }));
    setSaveState('unsaved');
  }

  async function save() {
    setSaveState('saving');
    try {
      const res = await api.patch<{ version: number }>(`/api/admin/collection/${id}`, { payload, expectedVersion: version });
      setVersion(res.version);
      setSaveState('saved');
      setFields([]);
      setMessage('Đã lưu bản nháp.');
    } catch (e) {
      const f = describeFailure(e);
      setFields(f.fields);
      setMessage(f.message);
      setSaveState('unsaved');
    }
  }

  async function publish() {
    try {
      if (saveState !== 'saved') await save();
      const built = await api.post<{ releaseId: string; validation: { ok: boolean; entries: { errors: string[] }[] } }>('/api/admin/releases', {
        items: [{ entityType: 'collection', entityId: id }],
      });
      if (!built.validation.ok) {
        setMessage(`Kiểm tra hợp lệ thất bại: ${built.validation.entries.flatMap((x) => x.errors).join('; ')}`);
        return;
      }
      await api.postWithIdempotency(`/api/admin/releases/${built.releaseId}/activate`, `pub-${id}-${Date.now()}`);
      setMessage('Đã xuất bản.');
    } catch (e) {
      setMessage(describeFailure(e).message);
    }
  }

  if (!detail) return <p className="ad-sub">Đang tải bộ sưu tập…</p>;

  return (
    <section>
      <h1 className="ad-title">{(payload.title as string) || detail.entity.title || 'Bộ sưu tập'}</h1>
      <p className="ad-sub"><Link to="/admin/collections">Bộ sưu tập</Link> / {detail.entity.slug ?? detail.entity.id.slice(0, 8)}</p>
      {message ? <div className="ad-note">{message}</div> : null}

      <Panel title="Chi tiết">
        <div className="ad-row">
          <Field label="Tiêu đề" error={errorsFor(fields, 'title')}>
            <input value={(payload.title as string) ?? ''} onChange={(e) => edit({ title: e.target.value })} />
          </Field>
          <Field label="Slug" error={errorsFor(fields, 'slug')}>
            <input value={(payload.slug as string) ?? ''} onChange={(e) => edit({ slug: e.target.value })} />
          </Field>
        </div>
        <Field label="Mô tả ngắn">
          <textarea value={(payload.shortDescription as string) ?? ''} onChange={(e) => edit({ shortDescription: e.target.value })} />
        </Field>
        <Field label="Mô tả đầy đủ">
          <textarea value={(payload.fullDescription as string) ?? ''} onChange={(e) => edit({ fullDescription: e.target.value })} />
        </Field>
        <label className="ad-check">
          <input type="checkbox" checked={payload.navVisible !== false} onChange={(e) => edit({ navVisible: e.target.checked })} />
          Hiển thị trên thanh điều hướng
        </label>
      </Panel>

      <Panel title="Sản phẩm trong bộ sưu tập">
        <Field label="Chế độ">
          <select value={mode} onChange={(e) => edit({ membershipMode: e.target.value })}>
            <option value="manual">Danh sách thủ công</option>
            <option value="rules">Theo luật</option>
          </select>
        </Field>

        {mode === 'manual' ? (
          <Field label="ID sản phẩm (mỗi dòng một id, theo thứ tự hiển thị)" error={errorsFor(fields, 'manualIds')}>
            <textarea
              value={manualIds.join('\n')}
              onChange={(e) => edit({ manualIds: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
            />
          </Field>
        ) : (
          <>
            <Field label="Kết hợp điều kiện" hint="Bắt buộc. ALL nghĩa là mọi điều kiện đều phải khớp; ANY nghĩa là ít nhất một điều kiện khớp.">
              <select
                value={rules.mode ?? 'ALL'}
                onChange={(e) => edit({ rules: { ...rules, mode: e.target.value } })}
              >
                <option value="ALL">ALL — mọi điều kiện</option>
                <option value="ANY">ANY — ít nhất một điều kiện</option>
              </select>
            </Field>
            {conditions.map((c, i) => (
              <div className="ad-row" key={i}>
                <Field label="Trường">
                  <select value={c.field} onChange={(e) => edit({ rules: { ...rules, conditions: conditions.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)) } })}>
                    {RULE_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>
                <Field label="Toán tử">
                  <select value={c.op} onChange={(e) => edit({ rules: { ...rules, conditions: conditions.map((x, j) => (j === i ? { ...x, op: e.target.value } : x)) } })}>
                    {RULE_OPS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Giá trị">
                  <input value={c.value} onChange={(e) => edit({ rules: { ...rules, conditions: conditions.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) } })} />
                </Field>
                <button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" onClick={() => edit({ rules: { ...rules, conditions: conditions.filter((_, j) => j !== i) } })}>
                  Xóa
                </button>
              </div>
            ))}
            <button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" onClick={() => edit({ rules: { ...rules, mode: rules.mode ?? 'ALL', conditions: [...conditions, { field: 'occasion', op: 'in', value: '' }] } })}>
              Thêm điều kiện
            </button>
            <p className="ad-sub">Số lượng sản phẩm khớp thực tế cần truy vấn catalog đã xuất bản và sẽ có ở bản xem trước bộ sưu tập phase 4.</p>
          </>
        )}
      </Panel>

      <Panel title="Hành vi khi trống và mặc định">
        <div className="ad-row">
          <Field label="Khi trống" error={errorsFor(fields, 'emptyStateMode')}>
            <select value={(payload.emptyStateMode as string) ?? 'empty-state'} onChange={(e) => edit({ emptyStateMode: e.target.value })}>
              <option value="empty-state">Hiển thị nội dung trạng thái trống đã duyệt</option>
              <option value="recommend">Gợi ý sản phẩm thay thế</option>
              <option value="omit">Bỏ mục này khỏi trang chủ</option>
            </select>
          </Field>
          <Field label="Sắp xếp mặc định">
            <select value={(payload.defaultSort as string) ?? 'featured'} onChange={(e) => edit({ defaultSort: e.target.value })}>
              {['featured', 'new', 'asc', 'desc', 'off'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Số sản phẩm mỗi trang" error={errorsFor(fields, 'pageSize')}>
            <input type="number" value={(payload.pageSize as number) ?? 24} onChange={(e) => edit({ pageSize: Number(e.target.value) })} />
          </Field>
        </div>
      </Panel>

      <div className="ad-actions">
        <button className="ad-btn" type="button" onClick={() => void save()} disabled={saveState === 'saving'}>
          {saveState === 'saving' ? 'Đang lưu…' : 'Lưu nháp'}
        </button>
        {can('release', 'publish') ? <button className="ad-btn ad-btn--ghost" type="button" onClick={() => void publish()}>Xuất bản ngay</button> : null}
        <span className="ad-save-state">{saveState === 'unsaved' ? 'Có thay đổi chưa lưu' : 'Đã lưu'}</span>
      </div>
      {detail.publishBlockers.length ? (
        <div className="ad-note ad-note--error">
          <strong>Chặn xuất bản</strong>
          <ul className="ad-list">{detail.publishBlockers.map((b, i) => <li key={i}>{b.path}: {b.message}</li>)}</ul>
        </div>
      ) : null}
    </section>
  );
}
