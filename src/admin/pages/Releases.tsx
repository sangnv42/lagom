import { useCallback, useEffect, useState } from 'react';
import { api, describeFailure } from '../api';
import { useAuth } from '../AdminApp';
import { Badge, EmptyState, Panel, fmtTime } from '../ui';

type Release = {
  id: string;
  status: string;
  note: string | null;
  entities: number;
  createdBy: string | null;
  createdAt: string;
  activatedAt: string | null;
};

export function ReleasesPage() {
  const [items, setItems] = useState<Release[]>([]);
  const [active, setActive] = useState<Release | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { can } = useAuth();

  const load = useCallback(() => {
    api.get<{ items: Release[]; active: Release | null }>('/api/admin/releases?limit=50')
      .then((r) => { setItems(r.items); setActive(r.active); })
      .catch((e) => setMessage(describeFailure(e).message));
  }, []);
  useEffect(load, [load]);

  async function activate(id: string) {
    if (!window.confirm('Kích hoạt bản phát hành này? Trang công khai sẽ chuyển sang ngay lập tức.')) return;
    try {
      await api.postWithIdempotency(`/api/admin/releases/${id}/activate`, `activate-${id}`);
      setMessage('Đã kích hoạt. Catalog công khai đang phục vụ bản phát hành này.');
      load();
    } catch (e) {
      setMessage(describeFailure(e).message);
    }
  }

  return (
    <section>
      <h1 className="ad-title">Bản phát hành và lịch sử</h1>
      <p className="ad-sub">
        Trang công khai phục vụ đúng một bản phát hành. Kích hoạt chỉ đổi con trỏ, nên toàn bộ
        site thay đổi cùng một lúc thay vì cập nhật nửa vời.
      </p>
      {message ? <div className="ad-note">{message}</div> : null}

      <Panel title="Đang phát hành">
        {active ? (
          <p className="ad-sub" style={{ margin: 0 }}>
            <span className="ad-mono">{active.id}</span> · {active.entities} mục · kích hoạt {fmtTime(active.activatedAt)}
          </p>
        ) : (
          <EmptyState>Chưa có bản phát hành nào đang chạy. Hãy xuất bản một sản phẩm để tạo bản phát hành đầu tiên.</EmptyState>
        )}
      </Panel>

      <Panel title="Lịch sử phát hành">
        {items.length === 0 ? (
          <EmptyState>Chưa có bản phát hành nào được tạo.</EmptyState>
        ) : (
          <table className="ad-table">
            <thead><tr><th>Bản phát hành</th><th>Trạng thái</th><th>Số mục</th><th>Tạo lúc</th><th>Kích hoạt lúc</th><th></th></tr></thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td className="ad-mono">{r.id.slice(0, 12)}</td>
                  <td><Badge tone={r.status === 'active' ? 'published' : r.status === 'invalid' ? 'error' : 'draft'}>{r.status}</Badge></td>
                  <td>{r.entities}</td>
                  <td>{fmtTime(r.createdAt)}</td>
                  <td>{fmtTime(r.activatedAt)}</td>
                  <td>
                    {can('release', 'publish') && r.status !== 'active' ? (
                      <button className="ad-btn ad-btn--ghost ad-btn--sm" type="button" onClick={() => void activate(r.id)}>Kích hoạt</button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <p className="ad-sub">
        Bản phát hành được tạo từ trình sửa sản phẩm và bộ sưu tập. Rollback nghĩa là kích hoạt
        một bản phát hành cũ hơn — không có dữ liệu nào bị ghi lại.
      </p>
    </section>
  );
}
