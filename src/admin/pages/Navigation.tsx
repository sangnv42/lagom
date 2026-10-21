// Navigation editor: one singleton entity (slug "site") holding the header menu and the footer
// link groups. Links reference internal entities by slug so they keep working when editors
// rename titles (§8). Reordering is button-driven, so it works with a keyboard.

import { useEffect, useState } from 'react';
import { api, describeFailure } from '../api';
import { useAuth } from '../AdminApp';
import { EmptyState, Field, Panel } from '../ui';
import { publishEntity } from '../crud';

type NavItem = { label: string; kind: string; value: string; visible?: boolean };
type NavPayload = { header: NavItem[]; footerGroups: { title: string; items: NavItem[] }[] };

const KINDS: [string, string][] = [
  ['collection', 'Bộ sưu tập (slug)'],
  ['page', 'Trang tĩnh (slug)'],
  ['product', 'Sản phẩm (slug)'],
  ['anchor', 'Neo trong trang (#…)'],
  ['url', 'Liên kết ngoài (https://…)'],
];

function readNav(payload: Record<string, unknown>): NavPayload {
  return {
    header: Array.isArray(payload.header) ? (payload.header as NavItem[]) : [],
    footerGroups: Array.isArray(payload.footerGroups) ? (payload.footerGroups as NavPayload['footerGroups']) : [],
  };
}

function ItemRows({
  items,
  onChange,
  disabled,
}: {
  items: NavItem[];
  onChange: (next: NavItem[]) => void;
  disabled: boolean;
}) {
  const patch = (i: number, p: Partial<NavItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...p } : it)));
  const move = (i: number, d: -1 | 1) => {
    const t = i + d;
    if (t < 0 || t >= items.length) return;
    const next = [...items];
    [next[i], next[t]] = [next[t], next[i]];
    onChange(next);
  };
  return (
    <>
      {items.map((it, i) => (
        <div key={i} className="ad-item">
          <div className="ad-row">
            <Field label="Nhãn">
              <input disabled={disabled} value={it.label} onChange={(e) => patch(i, { label: e.target.value })} />
            </Field>
            <Field label="Loại liên kết">
              <select disabled={disabled} value={it.kind} onChange={(e) => patch(i, { kind: e.target.value })}>
                {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Mã đích (slug / #neo / URL)">
              <input disabled={disabled} value={it.value} onChange={(e) => patch(i, { value: e.target.value })} />
            </Field>
            <label className="ad-check">
              <input type="checkbox" disabled={disabled} checked={it.visible !== false} onChange={(e) => patch(i, { visible: e.target.checked })} />
              Hiện
            </label>
          </div>
          <div className="ad-row">
            <button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" disabled={disabled || i === 0} onClick={() => move(i, -1)}>Lên</button>
            <button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" disabled={disabled || i === items.length - 1} onClick={() => move(i, 1)}>Xuống</button>
            <button className="ad-btn ad-btn--danger ad-btn--sm" type="button" disabled={disabled} onClick={() => onChange(items.filter((_, j) => j !== i))}>Xóa</button>
          </div>
        </div>
      ))}
      <button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" disabled={disabled} onClick={() => onChange([...items, { label: '', kind: 'collection', value: '' }])}>
        + Thêm liên kết
      </button>
    </>
  );
}

export function NavigationPage() {
  const { can } = useAuth();
  const [entityId, setEntityId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [nav, setNav] = useState<NavPayload>({ header: [], footerGroups: [] });
  const [message, setMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api.get<{ items: { id: string; version: number }[] }>('/api/admin/navigation?limit=1')
      .then((res) => {
        const first = res.items[0];
        if (!first) return;
        setEntityId(first.id);
        setVersion(first.version);
        return api.get<{ working: { payload: Record<string, unknown> } | null }>(`/api/admin/navigation/${first.id}`)
          .then((d) => setNav(readNav(d.working?.payload ?? {})));
      })
      .catch((e) => setMessage(describeFailure(e).message));
  }, []);

  function update(patch: Partial<NavPayload>) {
    setNav((n) => ({ ...n, ...patch }));
    setDirty(true);
  }

  async function save() {
    try {
      // SAFETY: NavPayload is a plain JSON object by construction here — the API payload type is
      // Record<string, unknown>, and these two fields are the only keys the server schema accepts.
      const payload = nav as unknown as Record<string, unknown>;
      if (!entityId) {
        const made = await api.post<{ entityId: string; version: number }>('/api/admin/navigation', { payload, slug: 'site' });
        setEntityId(made.entityId);
        setVersion(made.version);
      } else {
        const res = await api.patch<{ version: number }>(`/api/admin/navigation/${entityId}`, { payload, expectedVersion: version });
        setVersion(res.version);
      }
      setDirty(false);
      setMessage('Đã lưu nháp menu.');
    } catch (e) {
      setMessage(describeFailure(e).message);
    }
  }

  async function publish() {
    if (!entityId) { setMessage('Lưu nháp trước đã.'); return; }
    try {
      await publishEntity('navigation', entityId);
      setMessage('Đã xuất bản menu.');
    } catch (e) {
      setMessage(describeFailure(e).message);
    }
  }

  const editable = can('navigation', 'edit');

  return (
    <section>
      <h1 className="ad-title">Điều hướng &amp; Footer</h1>
      <p className="ad-sub">
        Menu đầu trang và các nhóm liên kết chân trang. Liên kết nội bộ tham chiếu theo slug để không hỏng khi đổi tiêu đề.
      </p>
      {message ? <div className="ad-note">{message}</div> : null}

      <Panel title="Menu đầu trang">
        {nav.header.length === 0 && !editable ? <EmptyState>Menu mặc định của giao diện đang được dùng.</EmptyState> : null}
        <ItemRows items={nav.header} disabled={!editable} onChange={(header) => update({ header })} />
      </Panel>

      <Panel title="Nhóm liên kết chân trang">
        {nav.footerGroups.map((g, gi) => (
          <div key={gi} style={{ marginBottom: 16 }}>
            <Field label={`Tên nhóm ${gi + 1}`}>
              <input disabled={!editable} value={g.title} onChange={(e) => update({ footerGroups: nav.footerGroups.map((x, j) => (j === gi ? { ...x, title: e.target.value } : x)) })} />
            </Field>
            <ItemRows
              items={g.items}
              disabled={!editable}
              onChange={(items) => update({ footerGroups: nav.footerGroups.map((x, j) => (j === gi ? { ...x, items } : x)) })}
            />
          </div>
        ))}
        <button
          className="ad-btn ad-btn--ghost ad-btn--sm"
          type="button"
          disabled={!editable}
          onClick={() => update({ footerGroups: [...nav.footerGroups, { title: 'Nhóm mới', items: [] }] })}
        >
          + Thêm nhóm
        </button>
      </Panel>

      <div className="ad-actions">
        {editable ? <button className="ad-btn" type="button" onClick={() => void save()}>{dirty ? 'Lưu nháp *' : 'Lưu nháp'}</button> : null}
        {can('release', 'publish') ? <button className="ad-btn ad-btn--ghost" type="button" onClick={() => void publish()}>Xuất bản</button> : null}
      </div>
    </section>
  );
}
