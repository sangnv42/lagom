import { useCallback, useEffect, useState } from 'react';
import { api, describeFailure } from '../api';
import { useAuth } from '../AdminApp';
import { Badge, EmptyState, Field, Panel, fmtTime } from '../ui';

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: 'active' | 'disabled';
  mfaEnrolled: boolean;
  createdAt: string;
};

const ROLES = ['owner', 'admin', 'content-editor', 'catalog-manager', 'publisher', 'viewer'];

const ROLE_NOTES: Record<string, string> = {
  owner: 'Toàn quyền, bao gồm quản lý nhân sự và các thao tác không thể hoàn tác.',
  admin: 'Mọi quyền, trừ quản lý nhân sự.',
  'content-editor': 'Trang, bộ sưu tập, media và nội dung chữ. Không sửa được giá.',
  'catalog-manager': 'Sản phẩm và giá. Không xuất bản được.',
  publisher: 'Xuất bản nội dung đã chờ duyệt. Không tự tạo nội dung.',
  viewer: 'Chỉ đọc.',
};

export function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ email: '', name: '', role: 'content-editor', password: '' });
  const { can, session } = useAuth();

  const load = useCallback(() => {
    api.get<{ items: User[] }>('/api/admin/users')
      .then((r) => setUsers(r.items))
      .catch((e) => setMessage(describeFailure(e).message));
  }, []);
  useEffect(load, [load]);

  async function create() {
    try {
      await api.post('/api/admin/users', draft);
      setMessage(`Đã tạo ${draft.email}.`);
      setDraft({ email: '', name: '', role: 'content-editor', password: '' });
      setCreating(false);
      load();
    } catch (e) {
      setMessage(describeFailure(e).message);
    }
  }

  async function patch(id: string, body: Record<string, string>) {
    try {
      await api.patch(`/api/admin/users/${id}`, body);
      setMessage('Đã cập nhật.');
      load();
    } catch (e) {
      setMessage(describeFailure(e).message);
    }
  }

  const manages = can('user', 'edit');

  return (
    <section>
      <h1 className="ad-title">Nhân sự và vai trò</h1>
      <p className="ad-sub">
        Vai trò quyết định mỗi người tiếp cận được gì. Các trường giá bị chặn ngay ở API đối với
        vai trò nội dung, chứ không chỉ ẩn trên màn hình này.
      </p>
      {message ? <div className="ad-note">{message}</div> : null}

      {manages ? (
        <div className="ad-row" style={{ justifyContent: 'flex-end' }}>
          <button className="ad-btn" type="button" onClick={() => setCreating((v) => !v)}>
            {creating ? 'Hủy' : 'Thêm tài khoản nhân sự'}
          </button>
        </div>
      ) : (
        <div className="ad-note">Chỉ vai trò owner mới được tạo hoặc thay đổi tài khoản.</div>
      )}

      {creating ? (
        <Panel title="Tài khoản mới">
          <div className="ad-row">
            <Field label="Email"><input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
            <Field label="Họ tên"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="Vai trò">
              <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Mật khẩu ban đầu" hint="Ít nhất 12 ký tự.">
              <input type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
            </Field>
          </div>
          <div className="ad-actions">
            <button className="ad-btn" type="button" onClick={() => void create()}>Tạo tài khoản</button>
          </div>
        </Panel>
      ) : null}

      {users.length === 0 ? <EmptyState>Chưa có tài khoản nhân sự.</EmptyState> : (
        <table className="ad-table">
          <thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>MFA</th><th>Thêm lúc</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}{u.id === session?.user?.id ? ' (bạn)' : ''}</td>
                <td className="ad-mono">{u.email}</td>
                <td>
                  {manages ? (
                    <select value={u.role} onChange={(e) => void patch(u.id, { role: e.target.value })}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : u.role}
                  <div className="ad-sub" style={{ margin: 0 }}>{ROLE_NOTES[u.role]}</div>
                </td>
                <td>
                  {manages ? (
                    <select value={u.status} onChange={(e) => void patch(u.id, { status: e.target.value })}>
                      <option value="active">active</option>
                      <option value="disabled">disabled</option>
                    </select>
                  ) : <Badge tone={u.status === 'active' ? 'published' : 'error'}>{u.status}</Badge>}
                </td>
                <td>{u.mfaEnrolled ? 'đã kích hoạt' : <Badge tone="draft">chưa cấu hình</Badge>}</td>
                <td>{fmtTime(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="ad-sub">
        Đăng ký MFA chưa được triển khai trong bản build này — mọi tài khoản đều báo chưa cấu hình
        thay vì giả vờ là đã bật. Owner đang hoạt động cuối cùng không thể bị hạ quyền hoặc vô hiệu hóa.
      </p>
    </section>
  );
}
