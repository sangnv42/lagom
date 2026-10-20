import { useState } from 'react';
import { useCart } from '../features/cart/CartContext';
import { BULK_NOTE_MIN, validatePhone } from '../features/cart/cart';
import { cartOrderMessage, decorateLines, SHIPPING_NOTE } from '../features/order/messages';
import { fmt } from '../lib/money';
import { collectionUrl } from '../lib/urls';
import { Img } from './Img';
import { IconClose } from './icons';
import { SIZES } from '../lib/img';
import { useUi } from './Ui';
import { getProduct } from '../data/catalog';

// Cart drawer — structure transcribed from the reference (captures/app.js `renderCart`):
// lines keep delivery/message config in separate text rows; totals from current catalog prices;
// buyer fields are optional and persisted; unknown shipping stays "shop confirms".
export function CartDrawer() {
  const { lines, buyer, setBuyer, subtotal, itemCount, setQty, remove, clear } = useCart();
  const { closeCart, openZs, toast } = useUi();
  const [phoneErr, setPhoneErr] = useState<string | null>(null);
  const items = decorateLines(lines);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePhone(buyer.phone);
    setPhoneErr(err);
    if (err) {
      toast(err);
      return;
    }
    const { text, total } = cartOrderMessage(lines, buyer);
    const first = lines[0] ? getProduct(lines[0].productId) : null;
    openZs({
      title: 'Gửi đơn qua Zalo',
      text,
      summary: first
        ? { image: first.imagePaths[0] ?? '', name: first.title, lines: [`${itemCount} sản phẩm · Tạm tính ${fmt(total)}`] }
        : null,
      onDone: () => {
        clear();
        closeCart();
      },
    });
  };

  return (
    <>
      <div className="scrim on" onClick={closeCart} aria-hidden />
      <aside className="drawer on" role="dialog" aria-modal="true" aria-label="Giỏ hàng" aria-hidden={false}>
        <header>
          <p className="d-title">Giỏ hoa của bạn</p>
          <button className="ico" aria-label="Đóng giỏ hàng" onClick={closeCart}>
            <IconClose />
          </button>
        </header>
        {lines.length === 0 ? (
          <div className="d-items">
            <div className="d-empty">
              <p>Giỏ hoa đang trống.</p>
              <a className="btn ghost" href={collectionUrl('all')}>
                Khám phá bộ sưu tập
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="d-items">
              {items.map((i, k) => {
                const p = getProduct(i.productId);
                const c = i.configuration;
                const where = [c.address, c.district].filter(Boolean).join(', ');
                return (
                  <div className="d-item" key={k}>
                    <Img src={p?.imagePaths[0] ?? null} alt={i.name} sizes={SIZES.thumb} width={120} height={150} />
                    <div>
                      <h3>{i.name}</h3>
                      <small>
                        Size: {i.variantLabel}
                        {c.deliveryDate ? ' · Giao ' + c.deliveryDate.split('-').reverse().join('/') : ''}
                        {c.slot ? ' · ' + c.slot : ''}
                        {where && <br />}
                        {where ? 'Giao tới: ' + where : ''}
                        {c.recipient && <br />}
                        {c.recipient ? 'Người nhận: ' + c.recipient : ''}
                        {c.message && <br />}
                        {c.message ? 'Lời thiệp: “' + c.message + '”' : ''}
                      </small>
                      <div className="d-row">
                        <div className="qty">
                          <button aria-label="Giảm" onClick={() => setQty(k, i.quantity - 1)} disabled={i.quantity <= 1}>
                            −
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={999}
                            value={i.quantity}
                            aria-label="Số lượng"
                            onChange={(e) => setQty(k, parseInt(e.target.value, 10) || 1)}
                          />
                          <button aria-label="Tăng" onClick={() => setQty(k, i.quantity + 1)}>
                            +
                          </button>
                        </div>
                        <b>{fmt(i.price * i.quantity)}</b>
                      </div>
                      <button className="rm" onClick={() => remove(k)}>
                        Xóa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="d-foot">
              <div className="d-total">
                <span>Tạm tính</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <small>{SHIPPING_NOTE}</small>
              <form className="d-form" onSubmit={submit} noValidate>
                <label>
                  Họ tên người đặt (không bắt buộc)
                  <input className="inp" autoComplete="name" value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} />
                </label>
                <label>
                  Số điện thoại (không bắt buộc)
                  <input
                    className="inp"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    aria-invalid={phoneErr ? true : undefined}
                    placeholder="Shop thấy Zalo của bạn khi bạn gửi đơn"
                    value={buyer.phone}
                    onChange={(e) => {
                      setBuyer({ ...buyer, phone: e.target.value });
                      if (phoneErr) setPhoneErr(null);
                    }}
                  />
                  {phoneErr && <small className="ferr">{phoneErr}</small>}
                </label>
                <label>
                  Ghi chú cho shop
                  <textarea
                    className="inp"
                    rows={2}
                    placeholder="Ví dụ: giao bất ngờ, đừng gọi trước người nhận · xuất hóa đơn công ty · đặt số lượng nhiều"
                    value={buyer.note}
                    onChange={(e) => setBuyer({ ...buyer, note: e.target.value })}
                  />
                </label>
                {itemCount >= BULK_NOTE_MIN && <small className="bulk">Đặt từ 10 sản phẩm: nhắn Zalo để shop báo giá tốt hơn.</small>}
                <button className="btn cv-main block" type="submit">
                  Gửi đơn qua Zalo · {fmt(subtotal)}
                </button>
                <small>Đơn được chép sẵn, bạn chỉ cần mở Zalo của shop, dán và gửi. Shop xác nhận và gửi ảnh, video hoa trước khi giao.</small>
              </form>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
