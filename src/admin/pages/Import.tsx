import { useRef, useState } from 'react';
import { api, describeFailure } from '../api';
import { useAuth } from '../AdminApp';
import { Badge, Panel } from '../ui';

type PlannedRow = {
  externalKey: string;
  decision: 'new' | 'unchanged' | 'modified' | 'invalid';
  message: string | null;
  entityId: string | null;
  slug: string | null;
  title: string | null;
  priceVnd: number | null;
  warnings: string[];
};

type Plan = {
  jobId: string;
  filename: string;
  sha256: string;
  total: number;
  counts: Record<string, number>;
  rows: PlannedRow[];
};

const decisionLabel: Record<string, string> = {
  new: 'Mới',
  unchanged: 'Không đổi',
  modified: 'Đã sửa',
  invalid: 'Không hợp lệ',
};

export function ImportPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { can } = useAuth();

  async function validate(file: File) {
    setBusy(true);
    setMessage(null);
    setPlan(null);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const res = await api.putRaw<Plan>('/api/admin/imports/validate', buf, file.name);
      setPlan(res);
      setMessage(`Đã kiểm tra ${res.filename}: ${Object.entries(res.counts).map(([k, v]) => `${v} ${decisionLabel[k] ?? k}`).join(', ')}. Chưa có thay đổi nào được áp dụng.`);
    } catch (e) {
      setMessage(describeFailure(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!plan) return;
    const changed = (plan.counts.new ?? 0) + (plan.counts.modified ?? 0);
    if (!window.confirm(`Áp dụng ${changed} mục dưới dạng bản nháp? Nội dung đã xuất bản sẽ không bị ghi đè — hãy xem lại từng bản nháp, rồi xuất bản.`)) return;
    setBusy(true);
    try {
      const res = await api.postWithIdempotency<{ created: number; updated: number; skipped: number }>(
        '/api/admin/imports/apply',
        `apply-${plan.jobId}`,
        { jobId: plan.jobId },
      );
      setResult(res);
      setMessage(`Đã áp dụng: ${res.created} tạo mới, ${res.updated} cập nhật, ${res.skipped} bỏ qua. Chạy lại cùng một tệp sẽ không thay đổi gì.`);
    } catch (e) {
      setMessage(describeFailure(e).message);
    } finally {
      setBusy(false);
    }
  }

  const showRows = plan?.rows.filter((r) => r.decision !== 'unchanged') ?? [];

  return (
    <section>
      <h1 className="ad-title">Nhập danh mục</h1>
      <p className="ad-sub">
        Import chỉ tạo hoặc cập nhật bản nháp. Việc xuất bản vẫn là thao tác riêng do con người thực hiện, và chạy lại
        cùng một tệp sẽ không thay đổi gì vì nội dung được so sánh, không phải tên tệp.
      </p>
      {message ? <div className="ad-note">{message}</div> : null}

      <Panel title="Tệp nguồn">
        <div className="ad-row" style={{ alignItems: 'center' }}>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void validate(f); e.target.value = ''; }}
          />
          {can('import', 'create') ? (
            <>
              <button className="ad-btn" type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
                {busy ? 'Đang xử lý…' : 'Chọn tệp và kiểm tra'}
              </button>
              {plan ? (
                <button className="ad-btn ad-btn--ghost" type="button" disabled={busy || showRows.length === 0} onClick={() => void apply()}>
                  Áp dụng dưới dạng bản nháp
                </button>
              ) : null}
            </>
          ) : (
            <span className="ad-sub">Vai trò của bạn không có quyền chạy import.</span>
          )}
        </div>
        <p className="ad-sub">
          Yêu cầu: tệp <span className="ad-mono">flower_prices.json</span> đã xuất. Mỗi dòng cần có id ổn định,
          mã sản phẩm in trên bảng giá, giá tròn đồng và ảnh đính kèm.
        </p>
      </Panel>

      {plan ? (
        <Panel title={`Kế hoạch kiểm tra — ${plan.total} dòng`}>
          <div className="ad-row">
            {Object.entries(plan.counts).map(([k, v]) => (
              <div className="ad-card" key={k}><b>{v}</b><span>{decisionLabel[k] ?? k}</span></div>
            ))}
          </div>
          <p className="ad-sub">Hash nguồn <span className="ad-mono">{plan.sha256.slice(0, 16)}…</span> · job <span className="ad-mono">{plan.jobId}</span></p>
          {showRows.length === 0 ? (
            <div className="ad-note">Mọi dòng đều đã khớp với nội dung đã lưu. Không có gì để áp dụng.</div>
          ) : (
            <table className="ad-table">
              <thead><tr><th>Mã ngoài</th><th>Tên</th><th className="ad-num">Giá</th><th>Xử lý</th><th>Ghi chú</th></tr></thead>
              <tbody>
                {showRows.slice(0, 200).map((r) => (
                  <tr key={r.externalKey}>
                    <td className="ad-mono">{r.externalKey}</td>
                    <td>{r.title ?? '—'}</td>
                    <td className="ad-num">{r.priceVnd ?? '—'}</td>
                    <td><Badge tone={r.decision === 'invalid' ? 'error' : 'draft'}>{decisionLabel[r.decision]}</Badge></td>
                    <td>{[r.message, ...r.warnings].filter(Boolean).join(' · ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {showRows.length > 200 ? <p className="ad-sub">Hiển thị 200 dòng thay đổi đầu tiên trong số {showRows.length} dòng.</p> : null}
        </Panel>
      ) : null}

      {result && plan ? (
        <Panel title="Báo cáo">
          <p className="ad-sub">
            {result.created} tạo mới · {result.updated} cập nhật · {result.skipped} bỏ qua. Các sản phẩm được tạo
            dưới dạng bản nháp chưa xuất bản với tên tạm thời.
          </p>
          <div className="ad-actions">
            <a className="ad-btn ad-btn--ghost" href={`/api/admin/imports/${plan.jobId}/report`} target="_blank" rel="noreferrer">
              Tải báo cáo CSV
            </a>
          </div>
        </Panel>
      ) : null}
    </section>
  );
}
