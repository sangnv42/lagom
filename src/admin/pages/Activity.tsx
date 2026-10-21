import { useCallback, useEffect, useState } from 'react';
import { api, describeFailure } from '../api';
import { Badge, EmptyState, Field, Panel, fmtTime } from '../ui';

type AuditRow = {
  id: number;
  at: string;
  actor_user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  outcome: string;
  ip: string | null;
};

export function ActivityPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [action, setAction] = useState('');
  const [type, setType] = useState('');
  const [outcome, setOutcome] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: '200' });
    if (action) params.set('action', action);
    if (type) params.set('resourceType', type);
    if (outcome) params.set('outcome', outcome);
    api.get<{ items: AuditRow[] }>(`/api/admin/audit?${params}`)
      .then((r) => setItems(r.items))
      .catch((e) => setError(describeFailure(e).message));
  }, [action, type, outcome]);

  useEffect(load, [load]);

  return (
    <section>
      <h1 className="ad-title">Lịch sử kiểm toán</h1>
      <p className="ad-sub">
        Bản ghi chỉ thêm mới về các thao tác của nhân sự. Không thể sửa hay xóa bản ghi từ màn hình
        này — nhật ký hoàn toàn không có đường cập nhật (AUDIT-02).
      </p>
      {error ? <div className="ad-note ad-note--error">{error}</div> : null}

      <div className="ad-row">
        <Field label="Hành động"><input value={action} onChange={(e) => setAction(e.target.value)} placeholder="product.update" /></Field>
        <Field label="Loại tài nguyên"><input value={type} onChange={(e) => setType(e.target.value)} placeholder="product" /></Field>
        <Field label="Kết quả">
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="ok">ok</option>
            <option value="failed">failed</option>
          </select>
        </Field>
      </div>

      <Panel title={`${items.length} sự kiện`}>
        {items.length === 0 ? (
          <EmptyState>Không có sự kiện nào khớp.</EmptyState>
        ) : (
          <table className="ad-table">
            <thead><tr><th>Thời điểm</th><th>Người thực hiện</th><th>Hành động</th><th>Tài nguyên</th><th>Kết quả</th></tr></thead>
            <tbody>
              {items.map((r) => (
                <tr key={String(r.id)}>
                  <td>{fmtTime(r.at)}</td>
                  <td className="ad-mono">{r.actor_user_id ? String(r.actor_user_id).slice(0, 8) : 'hệ thống'}</td>
                  <td>{r.action}</td>
                  <td className="ad-mono">{r.resource_type ?? '—'}{r.resource_id ? ` · ${String(r.resource_id).slice(0, 8)}` : ''}</td>
                  <td><Badge tone={r.outcome === 'failed' ? 'error' : 'published'}>{r.outcome}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <p className="ad-sub">
        Mật khẩu, token phiên và dữ liệu bảng giá được che trước khi lưu trữ, nên không có thông tin
        nhạy cảm nào có thể rò rỉ từ màn hình này.
      </p>
    </section>
  );
}
