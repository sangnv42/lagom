import { useEffect, useState } from 'react';
import { api, describeFailure, type ApiFieldError } from '../api';
import { useAuth } from '../AdminApp';
import { Field, Panel, errorsFor } from '../ui';

type SettingsResponse = { entity: { id: string; version: number; visibility: string } | null; payload: Record<string, unknown> | null };

const SLOT_HINT = 'Mỗi dòng một khung giờ, ví dụ 08:00 – 11:00';

export function BusinessSettingsPage() {
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [entityId, setEntityId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [fields, setFields] = useState<ApiFieldError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const { can } = useAuth();

  useEffect(() => {
    api.get<SettingsResponse>('/api/admin/settings')
      .then((res) => {
        setPayload((res.payload as Record<string, unknown>) ?? {});
        setEntityId(res.entity?.id ?? null);
        setVersion(res.entity?.version ?? 0);
      })
      .catch((e) => setMessage(describeFailure(e).message));
  }, []);

  const business = (payload.business ?? {}) as Record<string, unknown>;
  const delivery = (payload.delivery ?? {}) as Record<string, unknown>;
  const slotsText = (Array.isArray(delivery.slots) ? (delivery.slots as string[]) : []).join('\n');

  function edit(path: string, value: unknown) {
    if (path.includes('.')) {
      const [group, key] = path.split('.');
      const parent = { ...((payload[group] ?? {}) as Record<string, unknown>) };
      parent[key] = value;
      setPayload((p) => ({ ...p, [group]: parent }));
    } else {
      setPayload((p) => ({ ...p, [path]: value }));
    }
    setDirty(true);
    setFields([]);
  }

  async function save() {
    try {
      if (!entityId) {
        const made = await api.post<{ entityId: string; version: number }>('/api/admin/settings', { payload });
        setEntityId(made.entityId);
        setVersion(made.version);
      } else {
        const res = await api.patch<{ version: number }>(`/api/admin/settings/${entityId}`, { payload, expectedVersion: version });
        setVersion(res.version);
      }
      setDirty(false);
      setMessage('Đã lưu bản nháp. Xuất bản là thao tác riêng.');
    } catch (e) {
      const f = describeFailure(e);
      setFields(f.fields);
      setMessage(f.message);
    }
  }

  async function publish() {
    if (!entityId) {
      setMessage('Lưu nháp trước đã.');
      return;
    }
    try {
      const built = await api.post<{ releaseId: string; validation: { ok: boolean; entries: { errors: string[] }[] } }>('/api/admin/releases', {
        items: [{ entityType: 'settings', entityId }],
      });
      if (!built.validation.ok) {
        setMessage(`Kiểm tra thất bại: ${built.validation.entries.flatMap((x) => x.errors).join('; ')}`);
        return;
      }
      await api.postWithIdempotency(`/api/admin/releases/${built.releaseId}/activate`, `settings-${entityId}-${Date.now()}`);
      setMessage('Đã xuất bản — trang cửa hàng đang dùng các giá trị này.');
    } catch (e) {
      setMessage(describeFailure(e).message);
    }
  }

  const editable = can('settings', 'edit');

  return (
    <section>
      <h1 className="ad-title">Cài đặt cửa hàng và giao hàng</h1>
      <p className="ad-sub">
        Thông tin cửa hàng, khung giờ giao hàng và trạng thái nhận đơn. Các giá trị này dẫn tới khối liên hệ và biểu mẫu đặt hàng của trang cửa hàng, nên cũng xuất bản như mọi nội dung khác.
      </p>
      {message ? <div className="ad-note">{message}</div> : null}

      <Panel title="Thông tin chung">
        <div className="ad-row">
          <Field label="Tên cửa hàng" error={errorsFor(fields, 'business.name')}>
            <input value={(business.name as string) ?? ''} disabled={!editable} onChange={(e) => edit('business.name', e.target.value)} />
          </Field>
          <Field label="Điện thoại" error={errorsFor(fields, 'business.phone')} hint="Số Việt Nam 10 chữ số, ví dụ 0384790349.">
            <input value={(business.phone as string) ?? ''} disabled={!editable} onChange={(e) => edit('business.phone', e.target.value)} />
          </Field>
          <Field label="Liên kết Zalo">
            <input value={(business.zalo as string) ?? ''} disabled={!editable} onChange={(e) => edit('business.zalo', e.target.value)} />
          </Field>
        </div>
        <Field label="Địa chỉ">
          <textarea value={(business.address as string) ?? ''} disabled={!editable} onChange={(e) => edit('business.address', e.target.value)} />
        </Field>
      </Panel>

      <Panel title="Giao hàng">
        <Field label="Khung giờ giao" error={errorsFor(fields, 'delivery.slots')} hint={SLOT_HINT}>
          <textarea
            disabled={!editable}
            value={slotsText}
            onChange={(e) => edit('delivery.slots', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
          />
        </Field>
        <div className="ad-row">
          <Field label="Thời gian hẹn tối thiểu (giờ)" error={errorsFor(fields, 'delivery.leadHours')}>
            <input
              type="number"
              min="0"
              disabled={!editable}
              value={(delivery.leadHours as number) ?? 2}
              onChange={(e) => edit('delivery.leadHours', Number(e.target.value))}
            />
          </Field>
          <Field label="Múi giờ" error={errorsFor(fields, 'timezone')}>
            <input value={(payload.timezone as string) ?? 'Asia/Ho_Chi_Minh'} disabled={!editable} onChange={(e) => edit('timezone', e.target.value)} />
          </Field>
        </div>
      </Panel>

      <Panel title="Đơn hàng">
        <div className="ad-row">
          <Field label="Trạng thái nhận đơn" error={errorsFor(fields, 'orderingMode')}>
            <select value={(payload.orderingMode as string) ?? 'open'} disabled={!editable} onChange={(e) => edit('orderingMode', e.target.value)}>
              <option value="open">đang mở — khách có thể đặt</option>
              <option value="paused">tạm dừng — biểu mẫu sẽ giải thích lý do</option>
            </select>
          </Field>
          <Field label="Canonical origin" error={errorsFor(fields, 'canonicalOrigin')} hint="Dùng cho URL canonical trong SEO được sinh ra.">
            <input value={(payload.canonicalOrigin as string) ?? ''} disabled={!editable} onChange={(e) => edit('canonicalOrigin', e.target.value)} />
          </Field>
        </div>
        {payload.orderingMode === 'paused' ? (
          <Field label="Thông điệp hiển thị khi tạm dừng" error={errorsFor(fields, 'orderingPausedMessage')}>
            <textarea value={(payload.orderingPausedMessage as string) ?? ''} disabled={!editable} onChange={(e) => edit('orderingPausedMessage', e.target.value)} />
          </Field>
        ) : null}
      </Panel>

      <div className="ad-actions">
        {editable ? <button className="ad-btn" type="button" onClick={() => void save()}>{dirty ? 'Lưu nháp *' : 'Lưu nháp'}</button> : null}
        {can('release', 'publish') ? <button className="ad-btn ad-btn--ghost" type="button" onClick={() => void publish()}>Xuất bản ngay</button> : null}
        <span className="ad-save-state">{dirty ? 'Có thay đổi chưa lưu' : 'Đã lưu'}</span>
      </div>
    </section>
  );
}
