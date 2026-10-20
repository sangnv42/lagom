import { useEffect, useRef, useState } from 'react';
import { SHOP } from '../data/business';
import { copyText, useUi } from './Ui';
import type { ZsPayload } from './Ui';
import { Img } from './Img';
import { IconClose } from './icons';
import { SIZES } from '../lib/img';

// Zalo handoff sheet — behavior transcribed from the reference `zSheet` (captures/app.js):
// content is copied, the customer opens Zalo and pastes; "Đã gửi xong" is user-confirmed, never an
// automatic order success.
export function ZsSheet({ payload }: { payload: ZsPayload }) {
  const { closeZs, toast } = useUi();
  const [sentStep, setSentStep] = useState(0); // 0 = show open-Zalo CTA, 1 = show confirm-back step
  const [copied, setCopied] = useState(true);
  const openRef = useRef<HTMLAnchorElement>(null);
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer:coarse)').matches;

  useEffect(() => {
    void copyText(payload.text).catch(() => setCopied(false));
    openRef.current?.focus();
  }, [payload.text]);

  return (
    <div
      className="zs on"
      style={{ position: 'fixed', inset: 0, zIndex: 130, overflow: 'auto' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeZs();
      }}
    >
      <div className="zs-box" role="dialog" aria-modal="true" aria-labelledby="zsH">
        <button className="ico zs-x" type="button" data-zs-close aria-label="Đóng" onClick={closeZs}>
          <IconClose />
        </button>
        <p className="zs-h" id="zsH">
          {payload.title}
        </p>
        {payload.summary && (
          <div className="zs-sum">
            <Img src={payload.summary.image} alt="" sizes={SIZES.thumb} width={120} height={150} />
            <div>
              <b>{payload.summary.name}</b>
              <small>
                {payload.summary.lines.map((l, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {l}
                  </span>
                ))}
              </small>
            </div>
          </div>
        )}
        <ol className="zs-steps">
          <li className={copied ? 'ok' : ''}>
            <b>{copied ? 'Đã chép sẵn nội dung' : 'Chưa chép được nội dung'}</b>
            <span>{copied ? 'Mẫu hoa, size, giờ giao và link ảnh mẫu.' : 'Dùng nút “Chép lại” bên dưới.'}</span>
          </li>
          <li>
            <b>Mở Zalo của shop</b>
            <span>
              Arch Flowers · {SHOP.phoneTxt}
            </span>
          </li>
          <li>
            <b>{touch ? 'Giữ ngón tay vào ô chat → Dán → Gửi' : 'Bấm vào ô chat → Ctrl+V (Mac: ⌘+V) → Gửi'}</b>
            <span>Shop xác nhận và gửi ảnh, video hoa trước khi giao.</span>
          </li>
        </ol>
        {sentStep === 0 ? (
          <div className="zs-go">
            <a
              className="btn cv-main block"
              href={SHOP.zalo}
              target="_blank"
              rel="noopener"
              ref={openRef}
              onClick={() => {
                void copyText(payload.text);
                setTimeout(() => setSentStep(1), 800);
              }}
            >
              Mở Zalo &amp; dán
            </a>
          </div>
        ) : (
          <div className="zs-back">
            <p>Bạn đã gửi tin nhắn cho shop trong Zalo chưa?</p>
            <div className="zs-pair">
              <button
                className="btn cv-main"
                type="button"
                onClick={() => {
                  closeZs();
                  payload.onDone?.();
                  toast('Cảm ơn bạn! Shop sẽ trả lời và xác nhận đơn qua Zalo.');
                }}
              >
                Đã gửi xong
              </button>
              <a className="btn ghost" href={SHOP.zalo} target="_blank" rel="noopener" onClick={() => void copyText(payload.text)}>
                Mở lại Zalo
              </a>
            </div>
          </div>
        )}
        <details className="zs-txt">
          <summary>Xem / chép lại nội dung</summary>
          <textarea className="inp" rows={7} readOnly aria-label="Nội dung gửi shop" defaultValue={payload.text} />
          <button
            className="btn ghost block"
            type="button"
            onClick={() => {
              void copyText(payload.text);
              setCopied(true);
              toast('Đã chép lại – dán vào ô chat Zalo');
            }}
          >
            Chép lại
          </button>
        </details>
        <p className="zs-alt">
          Không dùng Zalo? Gọi <a href={`tel:${SHOP.phone}`}>{SHOP.phoneTxt}</a> – shop nhận đơn qua điện thoại.
        </p>
      </div>
    </div>
  );
}
