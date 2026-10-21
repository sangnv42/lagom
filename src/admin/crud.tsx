// Generic admin screen for simple CMS entities (promotions, testimonials, FAQs). One list-and-edit
// surface with the same draft-save / publish / archive flow the catalog screens already use, so
// every content area behaves identically (§2: consistent sidebar, statuses, primary actions).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, describeFailure, editablePayload, ApiFailure, type ApiFieldError } from './api';
import { useAuth } from './AdminApp';
import { Badge, EmptyState, Field, Panel, errorsFor, fmtTime, visibilityTone } from './ui';

export type SummaryRow = {
  id: string;
  slug: string | null;
  visibility: string;
  version: number;
  unpublishedChanges: boolean;
  updatedAt: string;
  title: string | null;
};

type Detail = {
  entity: SummaryRow;
  working: { revisionId: number; payload: Record<string, unknown>; createdAt: string } | null;
  published: { revisionId: number; payload: Record<string, unknown> } | null;
  issues: string[];
  publishBlockers: ApiFieldError[];
};

export type FieldSpec = {
  path: string;
  label: string;
  kind: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'datetime' | 'media';
  hint?: string;
  options?: [string, string][];
};

/** Field values an admin form can hold — parsed at the payload boundary, never raw unknown. */
export type FieldValue = string | number | boolean | null | undefined;

function asFieldValue(value: unknown): FieldValue {
  return value === undefined || value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? value
    : undefined;
}

function getValue(payload: Record<string, unknown>, path: string): FieldValue {
  return asFieldValue(path.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], payload));
}

function setValue(payload: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const [head, ...rest] = path.split('.');
  if (!rest.length) return { ...payload, [head]: value };
  return { ...payload, [head]: setValue((payload[head] ?? {}) as Record<string, unknown>, rest.join('.'), value) };
}

/** Shared publish flow: build a release, validate, then activate with an idempotency key. */
export async function publishEntity(type: string, entityId: string): Promise<void> {
  const built = await api.post<{ releaseId: string; validation: { ok: boolean; entries: { errors: string[] }[] } }>(
    '/api/admin/releases',
    { items: [{ entityType: type, entityId }] },
  );
  if (!built.validation.ok) {
    throw new ApiFailure('validation', built.validation.entries.flatMap((e) => e.errors).join('; '), 422);
  }
  await api.postWithIdempotency(`/api/admin/releases/${built.releaseId}/activate`, `publish-${entityId}-${Date.now()}`);
}

export function CrudScreen(props: {
  type: string;
  title: string;
  description: string;
  blank: () => Record<string, unknown>;
  fields: FieldSpec[];
}) {
  const { type, title, description, blank, fields } = props;
  const { can } = useAuth();
  const [items, setItems] = useState<SummaryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const versionRef = useRef(0);
  const [dirty, setDirty] = useState(false);
  const [fields2, setFields2] = useState<ApiFieldError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: '50' });
    if (q) params.set('q', q);
    api.get<{ items: SummaryRow[]; total: number }>(`/api/admin/${type}?${params}`)
      .then((res) => { setItems(res.items); setTotal(res.total); })
      .catch((err) => setMessage(describeFailure(err).message));
  }, [type, q]);

  useEffect(load, [load]);

  const select = useCallback((id: string | null) => {
    setSelected(id);
    setDetail(null);
    setConflict(false);
    setMessage(null);
    if (!id) return;
    api.get<Detail>(`/api/admin/${type}/${id}`)
      .then((res) => {
        setDetail(res);
        setPayload(editablePayload(res.working?.payload ?? blank()));
        versionRef.current = res.entity.version;
        setDirty(false);
        setFields2([]);
      })
      .catch((err) => setMessage(describeFailure(err).message));
  }, [type, blank]);

  const edit = (path: string, value: unknown) => {
    setPayload((p) => setValue(p, path, value));
    setDirty(true);
  };

  async function save(): Promise<boolean> {
    if (!selected) return false;
    try {
      const res = await api.patch<{ version: number }>(`/api/admin/${type}/${selected}`, {
        payload,
        expectedVersion: versionRef.current,
      });
      versionRef.current = res.version;
      setDirty(false);
      setFields2([]);
      setMessage('Đã lưu nháp. Xuất bản là thao tác riêng.');
      return true;
    } catch (err) {
      const f = describeFailure(err);
      if (err instanceof ApiFailure && err.kind === 'conflict') setConflict(true);
      else setMessage(f.message);
      setFields2(f.fields);
      return false;
    }
  }

  async function create() {
    try {
      const made = await api.post<{ entityId: string }>(`/api/admin/${type}`, { payload: blank() });
      load();
      select(made.entityId);
    } catch (err) {
      setMessage(describeFailure(err).message);
    }
  }

  async function publish() {
    if (!selected) return;
    if (dirty && !(await save())) return;
    try {
      await publishEntity(type, selected);
      setMessage('Đã xuất bản. Trang công khai dùng nội dung mới.');
      select(selected);
      load();
    } catch (err) {
      setMessage(describeFailure(err).message);
    }
  }

  async function archive() {
    if (!selected || !window.confirm('Lưu trữ mục này? Nó sẽ biến mất khỏi trang công khai.')) return;
    try {
      await api.post(`/api/admin/${type}/${selected}/archive`, { expectedVersion: versionRef.current });
      setMessage('Đã lưu trữ.');
      setSelected(null);
      setDetail(null);
      load();
    } catch (err) {
      setMessage(describeFailure(err).message);
    }
  }

  const editable = can(type === 'promotion' || type === 'testimonial' || type === 'faq' ? 'global' : type, 'edit');
  const publishable = can('release', 'publish');
  const listLabel = useMemo(() => title, [title]);

  return (
    <section>
      <h1 className="ad-title">{title}</h1>
      <p className="ad-sub">{description}</p>
      {message ? <div className="ad-note">{message}</div> : null}
      {conflict ? (
        <div className="ad-note ad-note--error">
          <strong>Một biên tập viên khác đã lưu trước bạn.</strong> Bản sửa của bạn vẫn nằm trong biểu mẫu này.
          <div className="ad-actions">
            <button className="ad-btn" type="button" onClick={() => { setConflict(false); select(selected); }}>Tải lại bản mới nhất</button>
            <button className="ad-btn ad-btn--ghost" type="button" onClick={() => setConflict(false)}>Tiếp tục sửa bản của tôi</button>
          </div>
        </div>
      ) : null}

      <div className="ad-two-col">
        <div>
          <Panel title={`${listLabel} (${total})`}>
            <div className="ad-row" style={{ marginBottom: 10 }}>
              <Field label="Tìm kiếm">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm trong nội dung" />
              </Field>
              {editable ? <button className="ad-btn" type="button" onClick={() => void create()}>Tạo mới</button> : null}
            </div>
            {items.length === 0 ? (
              <EmptyState>Chưa có mục nào. Bấm “Tạo mới” để thêm mục đầu tiên.</EmptyState>
            ) : (
              <table className="ad-table">
                <thead><tr><th>Tiêu đề</th><th>Trạng thái</th><th>Cập nhật</th></tr></thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className={row.id === selected ? 'is-selected' : undefined}>
                      <td>
                        <button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" onClick={() => select(row.id)}>
                          {row.title ?? '(chưa đặt tiêu đề)'}
                        </button>
                      </td>
                      <td>
                        <Badge tone={visibilityTone(row.visibility)}>{row.visibility === 'published' ? 'Đã xuất bản' : row.visibility === 'archived' ? 'Lưu trữ' : 'Nháp'}</Badge>
                        {row.unpublishedChanges ? <Badge tone="draft">có thay đổi chưa xuất bản</Badge> : null}
                      </td>
                      <td>{fmtTime(row.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>

        <div>
          {!selected ? (
            <EmptyState>Chọn một mục bên trái để sửa, hoặc tạo mới.</EmptyState>
          ) : !detail ? (
            <p className="ad-sub">Đang tải…</p>
          ) : (
            <>
              <Panel title="Nội dung">
                {fields.map((f) => (
                  <Field key={f.path} label={f.label} hint={f.hint} error={errorsFor(fields2, f.path)}>
                    {f.kind === 'textarea' ? (
                      <textarea value={(getValue(payload, f.path) as string) ?? ''} disabled={!editable} onChange={(e) => edit(f.path, e.target.value)} />
                    ) : f.kind === 'select' ? (
                      <select value={(getValue(payload, f.path) as string) ?? f.options?.[0]?.[0] ?? ''} disabled={!editable} onChange={(e) => edit(f.path, e.target.value)}>
                        {(f.options ?? []).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                      </select>
                    ) : f.kind === 'checkbox' ? (
                      <label className="ad-check">
                        <input type="checkbox" checked={getValue(payload, f.path) !== false} disabled={!editable} onChange={(e) => edit(f.path, e.target.checked)} />
                        {f.label}
                      </label>
                    ) : f.kind === 'datetime' ? (
                      <input
                        type="datetime-local"
                        disabled={!editable}
                        value={String(getValue(payload, f.path) ?? '').slice(0, 16)}
                        onChange={(e) => edit(f.path, e.target.value ? new Date(e.target.value).toISOString() : null)}
                      />
                    ) : f.kind === 'number' ? (
                      <input type="number" disabled={!editable} value={(getValue(payload, f.path) as number) ?? ''} onChange={(e) => edit(f.path, e.target.value === '' ? null : Number(e.target.value))} />
                    ) : (
                      <input value={(getValue(payload, f.path) as string) ?? ''} disabled={!editable} onChange={(e) => edit(f.path, e.target.value)} />
                    )}
                  </Field>
                ))}
              </Panel>

              <Panel title="Xuất bản">
                <p className="ad-sub">Lưu chỉ tạo bản nháp; trang công khai không đổi cho tới khi xuất bản.</p>
                {detail.publishBlockers.length ? (
                  <div className="ad-note ad-note--error">
                    <strong>Chặn xuất bản</strong>
                    <ul className="ad-list">{detail.publishBlockers.map((b, i) => <li key={i}>{b.path}: {b.message}</li>)}</ul>
                  </div>
                ) : null}
                <div className="ad-actions" style={{ borderTop: 0, paddingTop: 0 }}>
                  {editable ? <button className="ad-btn" type="button" onClick={() => void save()}>{dirty ? 'Lưu nháp *' : 'Lưu nháp'}</button> : null}
                  {publishable ? <button className="ad-btn ad-btn--ghost" type="button" onClick={() => void publish()}>Xuất bản</button> : null}
                  {can(type === 'promotion' || type === 'testimonial' || type === 'faq' ? 'global' : type, 'archive') ? (
                    <button className="ad-btn ad-btn--danger" type="button" onClick={() => void archive()}>Lưu trữ</button>
                  ) : null}
                </div>
              </Panel>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
