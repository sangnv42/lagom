import { useCallback, useEffect, useRef, useState } from 'react';
import { api, describeFailure } from '../api';
import { useAuth } from '../AdminApp';
import { Badge, EmptyState, Field, Panel, fmtTime } from '../ui';

type Asset = {
  id: string;
  kind: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  alt: string | null;
  decorative: boolean;
  containsPrintedPrice: boolean;
  focalPoint: { x: number; y: number } | null;
  usageCount: number;
  usedBy: string[];
  replacementCount: number;
  createdAt: string;
  updatedAt: string;
};

export function MediaPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [usage, setUsage] = useState('all');
  const [selected, setSelected] = useState<Asset | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { can } = useAuth();

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: '60' });
    if (q) params.set('q', q);
    if (usage !== 'all') params.set('usage', usage);
    api.get<{ items: Asset[]; total: number }>(`/api/admin/media?${params}`)
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .catch((e) => setMessage(describeFailure(e).message));
  }, [q, usage]);
  useEffect(load, [load]);

  async function upload(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const buf = await file.arrayBuffer();
      const res = await api.putRaw<{ id: string }>('/api/admin/media', buf, file.type || 'application/octet-stream');
      setMessage(`Đã lưu ${res.id}. Hãy điền văn bản alt trước khi sử dụng ảnh này.`);
      load();
    } catch (e) {
      setMessage(describeFailure(e).message);
    } finally {
      setUploading(false);
    }
  }

  async function saveMeta(patch: Record<string, unknown>) {
    if (!selected) return;
    try {
      await api.patch(`/api/admin/media/${selected.id}`, patch);
      setMessage('Đã lưu metadata.');
      setSelected({ ...selected, ...patch } as Asset);
      load();
    } catch (e) {
      setMessage(describeFailure(e).message);
    }
  }

  async function replaceVersion(file: File) {
    if (!selected) return;
    try {
      const buf = await file.arrayBuffer();
      await api.putRaw(`/api/admin/media/${selected.id}/replace`, buf, file.type || 'application/octet-stream');
      setMessage('Đã lưu phiên bản thay thế — mọi tham chiếu được cập nhật cùng lúc (không cần tải lại từng trang).');
      load();
    } catch (e) {
      setMessage(describeFailure(e).message);
    }
  }

  async function remove() {
    if (!selected) return;
    if (!window.confirm('Xóa tài nguyên này? Tài nguyên đang được tham chiếu không thể xóa được.')) return;
    try {
      await api.del(`/api/admin/media/${selected.id}`);
      setMessage('Đã xóa và dọn các byte không còn tham chiếu (MEDIA-03).');
      setSelected(null);
      load();
    } catch (e) {
      setMessage(describeFailure(e).message);
    }
  }

  return (
    <section>
      <h1 className="ad-title">Thư viện media</h1>
      <p className="ad-sub">Tổng cộng {total} tài nguyên. Bản gốc không bao giờ bị ghi đè; thao tác thay thế sẽ thêm một phiên bản và cập nhật mọi tham chiếu.</p>
      {message ? <div className="ad-note">{message}</div> : null}

      <div className="ad-row" style={{ alignItems: 'center' }}>
        <Field label="Tìm kiếm"><input value={q} onChange={(e) => setQ(e.target.value)} /></Field>
        <Field label="Tình trạng sử dụng">
          <select value={usage} onChange={(e) => setUsage(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="used">Đang dùng</option>
            <option value="unused">Chưa tham chiếu</option>
          </select>
        </Field>
        {can('media', 'edit') ? (
          <>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} />
            <button className="ad-btn" type="button" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? 'Đang tải lên…' : 'Tải ảnh lên'}
            </button>
          </>
        ) : null}
      </div>

      {items.length === 0 ? <EmptyState>Không có tài nguyên nào khớp. Hãy tải lên tệp JPEG, PNG, WebP, AVIF hoặc SVG.</EmptyState> : (
        <div className="ad-media-grid">
          {items.map((a) => (
            <button key={a.id} className="ad-media-tile" type="button" onClick={() => setSelected(a)}
              title={a.alt ?? a.filename} style={selected?.id === a.id ? { outline: '2px solid var(--ad-accent)' } : undefined}>
              <img src={`/img/hoa/trang_01_anh_01.jpg`} alt="" hidden />
              <span>{a.alt || a.filename}</span>
              <small>{a.width && a.height ? `${a.width}×${a.height}` : a.kind} · {a.usageCount} lần sử dụng</small>
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <Panel title={`Tài nguyên ${selected.id.slice(0, 8)} — ${selected.filename}`}>
          <div className="ad-row">
            <Field label="Văn bản alt" hint="Bắt buộc trừ khi ảnh chỉ mang tính trang trí.">
              <input value={selected.alt ?? ''} onChange={(e) => setSelected({ ...selected, alt: e.target.value })} />
            </Field>
            <Field label="Điểm lấy nét X (0–1)">
              <input type="number" step="0.05" min="0" max="1" value={selected.focalPoint?.x ?? 0.5}
                onChange={(e) => setSelected({ ...selected, focalPoint: { x: Number(e.target.value), y: selected.focalPoint?.y ?? 0.5 } })} />
            </Field>
            <Field label="Điểm lấy nét Y (0–1)">
              <input type="number" step="0.05" min="0" max="1" value={selected.focalPoint?.y ?? 0.5}
                onChange={(e) => setSelected({ ...selected, focalPoint: { x: selected.focalPoint?.x ?? 0.5, y: Number(e.target.value) } })} />
            </Field>
          </div>
          <label className="ad-check">
            <input type="checkbox" checked={selected.decorative} onChange={(e) => setSelected({ ...selected, decorative: e.target.checked })} />
            Ảnh trang trí (không cần văn bản alt)
          </label>
          <label className="ad-check">
            <input type="checkbox" checked={selected.containsPrintedPrice}
              onChange={(e) => setSelected({ ...selected, containsPrintedPrice: e.target.checked })} />
            Có chứa giá được in trong ảnh
          </label>
          {selected.containsPrintedPrice ? (
            <div className="ad-note ad-note--warn">Đã đánh dấu: nhân viên phải xác nhận ảnh hiển thị đúng giá hiện hành khi được sử dụng.</div>
          ) : null}

          <div className="ad-actions">
            {can('media', 'edit') ? <button className="ad-btn" type="button" onClick={() => void saveMeta({ alt: selected.alt, decorative: selected.decorative, containsPrintedPrice: selected.containsPrintedPrice, focalPoint: selected.focalPoint })}>Lưu metadata</button> : null}
            {can('media', 'edit') ? (
              <label className="ad-btn ad-btn--ghost" style={{ display: 'inline-block' }}>
                Thay phiên bản
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void replaceVersion(f); e.target.value = ''; }} />
              </label>
            ) : null}
            {can('media', 'archive') ? <button className="ad-btn ad-btn--danger" type="button" onClick={() => void remove()}>Xóa tài nguyên</button> : null}
          </div>

          <p className="ad-sub">
            {selected.kind} · {selected.mimeType} · {selected.bytes ? `${Math.round(selected.bytes / 1024)} KB` : '—'} · thêm ngày {fmtTime(selected.createdAt)} ·{' '}
            {selected.replacementCount} phiên bản thay thế
          </p>
          <p className="ad-sub" style={{ margin: 0 }}>Được dùng bởi:</p>
          {selected.usedBy.length ? <ul className="ad-list">{selected.usedBy.map((u) => <li key={u} className="ad-mono">{u}</li>)}</ul> : <EmptyState>Chưa được tham chiếu.</EmptyState>}
          {selected.usageCount > 0 ? <Badge tone="draft">{selected.usageCount} tham chiếu — không thể xóa</Badge> : <Badge tone="published">Chưa tham chiếu</Badge>}
        </Panel>
      ) : null}
    </section>
  );
}
