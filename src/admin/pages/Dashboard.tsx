import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, describeFailure } from '../api';
import { EmptyState, NotConfiguredNote, Panel, fmtTime } from '../ui';

type Dashboard = {
  counts: Record<string, number | string | null>;
  tasks: { id: string; label: string; href: string; severity: string }[];
  recentEdits: { id: number; actor: string | null; action: string; resourceType: string; resourceId: string | null; at: string }[];
  quickActions: { label: string; href: string }[];
  emptyDatabase: boolean;
  modules: Record<string, string>;
  notConfigured: string[];
};

const CARD_LABELS: Record<string, string> = {
  publishedProducts: 'Sản phẩm đã xuất bản',
  products: 'Sản phẩm (mọi trạng thái)',
  publishedPages: 'Trang đã xuất bản',
  pages: 'Trang (mọi trạng thái)',
  collections: 'Bộ sưu tập',
  activePromotions: 'Khuyến mãi đang chạy',
  draftsUnpublished: 'Bản nháp chưa xuất bản',
  unpublishedChanges: 'Mục có thay đổi chưa xuất bản',
  contentIssues: 'Vấn đề nội dung cần xem',
  mediaAssets: 'Ảnh đã lưu',
};

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Dashboard>('/api/admin/dashboard').then(setData).catch((err) => setError(describeFailure(err).message));
  }, []);

  if (error) return <div className="ad-note ad-note--error">{error} <button className="ad-btn ad-btn--sm" onClick={() => location.reload()}>Thử lại</button></div>;
  if (!data) return <p className="ad-sub">Đang tải bảng điều khiển…</p>;

  return (
    <section>
      <h1 className="ad-title">Bảng điều khiển</h1>
      <p className="ad-sub">Mọi số liệu bên dưới là truy vấn thật. Không có doanh thu/lượt truy cập vì chưa nguồn phân tích nào được kết nối.</p>

      <NotConfiguredNote items={data.notConfigured} />

      {data.emptyDatabase ? (
        <div className="ad-note">
          <strong>Chưa có dữ liệu.</strong> Hãy nhập bảng giá của cửa hàng trước, rồi xác nhận tên tạm tính và xuất bản.
          <div className="ad-actions">
            <Link className="ad-btn" to="/admin/import">Nhập bảng giá</Link>
          </div>
        </div>
      ) : null}

      <div className="ad-cards">
        {Object.entries(CARD_LABELS).map(([key, label]) => (
          <div className="ad-card" key={key}>
            <b>{data.counts[key] ?? 0}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {data.quickActions.length ? (
        <Panel title="Tác vụ nhanh">
          <div className="ad-row" style={{ alignItems: 'center' }}>
            {data.quickActions.map((a) => (
              <Link key={a.href} className="ad-btn ad-btn--ghost" to={a.href}>{a.label}</Link>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel title="Cần xử lý">
        {data.tasks.length ? (
          <ul className="ad-list">
            {data.tasks.map((t) => (
              <li key={t.id}>
                <Link to={t.href}>{t.label}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>Hiện không có việc tồn đọng.</EmptyState>
        )}
      </Panel>

      <Panel title="Thay đổi gần đây">
        {data.recentEdits.length ? (
          <table className="ad-table">
            <thead>
              <tr><th>Thời gian</th><th>Hành động</th><th>Mục</th></tr>
            </thead>
            <tbody>
              {data.recentEdits.map((e) => (
                <tr key={String(e.id)}>
                  <td>{fmtTime(e.at)}</td>
                  <td>{e.action}</td>
                  <td className="ad-mono">{e.resourceType}{e.resourceId ? ` · ${String(e.resourceId).slice(0, 8)}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState>Chưa có thay đổi nào được ghi nhận.</EmptyState>
        )}
      </Panel>
    </section>
  );
}
