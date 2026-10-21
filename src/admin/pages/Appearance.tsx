// Appearance editor: constrained theme tokens over the same singleton-entity flow the business
// settings use. There is no free CSS/JS input by design (§9) — the reset action clears the
// published overrides, falling back to the shipped token baseline.

import { useEffect, useState } from 'react';
import { api, describeFailure, type ApiFieldError } from '../api';
import { useAuth } from '../AdminApp';
import { Field, Panel, errorsFor } from '../ui';
import { publishEntity } from '../crud';

const DEFAULTS = { accent: '#C9A96E', ink: '#1E1714', surface: '#F5EFE6', text: '#EFE7DA' };

export function AppearancePage() {
  const { can } = useAuth();
  const [entityId, setEntityId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [fields, setFields] = useState<ApiFieldError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);

  useEffect(() => {
    api.get<{ items: { id: string; version: number }[] }>('/api/admin/theme?limit=1')
      .then((res) => {
        const first = res.items[0];
        if (!first) return;
        setEntityId(first.id);
        setVersion(first.version);
        return api.get<{ working: { payload: Record<string, unknown> } | null }>(`/api/admin/theme/${first.id}`)
          .then((d) => setPayload(d.working?.payload ?? {}));
      })
      .catch((e) => setMessage(describeFailure(e).message));
  }, []);

  function edit(path: string, value: unknown) {
    setPayload((p) => {
      if (!path.includes('.')) return { ...p, [path]: value };
      const [group, key] = path.split('.');
      return { ...p, [group]: { ...((p[group] ?? {}) as Record<string, unknown>), [key]: value } };
    });
    setDirty(true);
    setFields([]);
  }

  async function save() {
    try {
      if (!entityId) {
        const made = await api.post<{ entityId: string; version: number }>('/api/admin/theme', { payload, slug: 'site' });
        setEntityId(made.entityId);
        setVersion(made.version);
      } else {
        const res = await api.patch<{ version: number }>(`/api/admin/theme/${entityId}`, { payload, expectedVersion: version });
        setVersion(res.version);
      }
      setDirty(false);
      setMessage('Đã lưu nháp giao diện.');
    } catch (e) {
      const f = describeFailure(e);
      setFields(f.fields);
      setMessage(f.message);
    }
  }

  async function publish() {
    if (!entityId) { setMessage('Lưu nháp trước đã.'); return; }
    try {
      await publishEntity('theme', entityId);
      setMessage('Đã xuất bản giao diện. Trang công khai dùng màu và cỡ mới.');
    } catch (e) {
      setMessage(describeFailure(e).message);
    }
  }

  const colors = (payload.colors ?? {}) as Record<string, string>;
  const accent = colors.accent ?? DEFAULTS.accent;
  const ink = colors.ink ?? DEFAULTS.ink;
  const surface = colors.surface ?? DEFAULTS.surface;
  const radius = (payload.radiusPx as number) ?? 0;

  const editable = can('theme', 'edit');

  return (
    <section>
      <h1 className="ad-title">Giao diện</h1>
      <p className="ad-sub">
        Màu sắc, bo góc, bề rộng nội dung và chữ — trong phạm vi Cho phép của thương hiệu. Không có ô nhập CSS tự do.
      </p>
      {message ? <div className="ad-note">{message}</div> : null}

      <div className="ad-two-col">
        <div>
          <Panel title="Màu thương hiệu">
            <div className="ad-row">
              {([['accent', 'Màu nhấn'], ['ink', 'Màu nền tối'], ['surface', 'Màu nền sáng'], ['text', 'Màu chữ']] as const).map(([key, label]) => (
                <Field key={key} label={label} error={errorsFor(fields, `colors.${key}`)}>
                  <input
                    type="color"
                    disabled={!editable}
                    value={colors[key] ?? DEFAULTS[key]}
                    onChange={(e) => edit(`colors.${key}`, e.target.value)}
                  />
                </Field>
              ))}
            </div>
          </Panel>
          <Panel title="Layout">
            <div className="ad-row">
              <Field label="Bo góc nút/thẻ (px, 0–24)" error={errorsFor(fields, 'radiusPx')}>
                <input type="number" min="0" max="24" disabled={!editable} value={(payload.radiusPx as number) ?? ''} onChange={(e) => edit('radiusPx', e.target.value === '' ? null : Number(e.target.value))} />
              </Field>
              <Field label="Bề rộng nội dung tối đa (px, 900–1600)" error={errorsFor(fields, 'contentMaxPx')}>
                <input type="number" min="900" max="1600" disabled={!editable} value={(payload.contentMaxPx as number) ?? ''} onChange={(e) => edit('contentMaxPx', e.target.value === '' ? null : Number(e.target.value))} />
              </Field>
            </div>
            <div className="ad-row">
              <Field label="Bộ chữ">
                <select value={(payload.font as string) ?? 'brand'} disabled={!editable} onChange={(e) => edit('font', e.target.value)}>
                  <option value="brand">Chữ thương hiệu (serif)</option>
                  <option value="system">Chữ hệ thống</option>
                </select>
              </Field>
              <Field label="Khoảng cách giữa các phần">
                <select value={(payload.spacing as string) ?? 'normal'} disabled={!editable} onChange={(e) => edit('spacing', e.target.value)}>
                  <option value="compact">Sắn</option>
                  <option value="normal">Vừa</option>
                  <option value="loose">Rộng</option>
                </select>
              </Field>
            </div>
          </Panel>
          <div className="ad-actions">
            {editable ? <button className="ad-btn" type="button" onClick={() => void save()}>{dirty ? 'Lưu nháp *' : 'Lưu nháp'}</button> : null}
            {can('release', 'publish') ? <button className="ad-btn ad-btn--ghost" type="button" onClick={() => void publish()}>Xuất bản</button> : null}
            {editable ? <button className="ad-btn ad-btn--ghost" type="button" onClick={() => { setPayload({}); setDirty(true); }}>Đặt lại về mặc định</button> : null}
          </div>
        </div>
        <div>
          <Panel title={`Xem trước (${mobilePreview ? 'di động' : 'máy tính'})`}>
            <div className="ad-row">
              <button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" onClick={() => setMobilePreview(false)}>Desktop</button>
              <button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" onClick={() => setMobilePreview(true)}>Mobile</button>
            </div>
            <div style={{ width: mobilePreview ? 360 : '100%', background: ink, color: '#EFE7DA', padding: 20, borderRadius: 8, fontFamily: payload.font === 'system' ? 'system-ui' : 'Georgia, serif' }}>
              <p style={{ color: accent, textTransform: 'uppercase', fontSize: 11, letterSpacing: 2 }}>LAGOM</p>
              <h3 style={{ margin: '6px 0 10px' }}>Hoa tươi cắm tay</h3>
              <button style={{ background: accent, color: ink, border: 0, padding: '10px 18px', borderRadius: radius }}>Đặt hoa ngay</button>
              <div style={{ marginTop: 14, height: 60, background: surface, borderRadius: radius }} />
            </div>
            <p className="ad-sub">Xem trước tại đây; bản công khai thật dùng đúng component của cửa hàng.</p>
          </Panel>
        </div>
      </div>
    </section>
  );
}
