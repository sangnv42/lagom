import { Link } from 'react-router-dom';
import { SHOP } from '../data/business';
import { COLLECTIONS } from '../data/catalog';
import { collectionUrl } from '../lib/urls';
import { IconPhone } from './icons';

// Footer + floating Zalo/call buttons, transcribed from chrome() in the captured app.js.
export function SiteFooter() {
  return (
    <>
      <footer className="ftr">
        <div className="wrap">
          <div className="ftr-top">
            <p className="ftr-say">
              Hoa tươi cắm tay, <em>trao gửi trọn vẹn.</em>
            </p>
            <div className="ftr-cta">
              <a className="btn cv-zalo" href={SHOP.zalo} target="_blank" rel="noopener">
                Nhắn Zalo
              </a>
              <a className="btn ghost cv-call" href={`tel:${SHOP.phone}`}>
                Gọi {SHOP.phoneTxt}
              </a>
            </div>
          </div>
          <div className="ftr-grid">
            <div>
              <Link className="logo logo-ftr" to="/" aria-label="Arch Flowers – Trang chủ">
                <img src="/img/logo-gold.webp" alt="Arch Flowers" width={290} height={240} loading="lazy" />
              </Link>
              <p style={{ marginTop: 18, maxWidth: '36ch' }}>
                Hoa tươi cao cấp &amp; quà tặng doanh nghiệp tại TP. Hồ Chí Minh. Nhận đặt hoa theo mẫu — freeship bán kính 1km.
              </p>
              <div className="store">
                <p className="ft-h">Địa chỉ cửa hàng</p>
                <p>{SHOP.address}</p>
                <p>
                  Hotline/Zalo: <a href={`tel:${SHOP.phone}`}>{SHOP.phoneTxt}</a>
                </p>
                <a className="btn ghost cv-call" href={SHOP.map} target="_blank" rel="noopener">
                  Chỉ đường
                </a>
              </div>
            </div>
            <div>
              <p className="ft-h">Mua sắm</p>
              <ul>
                {COLLECTIONS.filter((c) => !c.virtual).map((c) => (
                  <li key={c.slug}>
                    <Link to={collectionUrl(c.slug)}>{c.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="ft-h">Hỗ trợ</p>
              <ul>
                <li>
                  <Link to="/#delivery">Khu vực giao hàng</Link>
                </li>
                <li>
                  <Link to="/#concierge">Đặt hoa theo yêu cầu</Link>
                </li>
                <li>
                  <Link to="/pages/chinh-sach-doi-tra/">Chính sách đổi trả</Link>
                </li>
                <li>
                  <Link to="/pages/chinh-sach-bao-mat/">Chính sách bảo mật</Link>
                </li>
                <li>
                  <a href={SHOP.zalo} target="_blank" rel="noopener">
                    Chat Zalo
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="ft-h">Thanh toán</p>
              <div className="pay">
                <span>COD</span>
                <span>Chuyển khoản</span>
              </div>
            </div>
          </div>
          <div className="ftr-bot">
            <span>© 2026 Arch Flowers. Thiết kế bởi Arch Flowers.</span>
            <span>
              {SHOP.reviewsScore}★ · {SHOP.reviewsCount} đánh giá Google
            </span>
          </div>
        </div>
      </footer>
      <div className="fab">
        <a className="z" href={SHOP.zalo} target="_blank" rel="noopener" aria-label="Chat Zalo">
          Zalo
        </a>
        <a className="c" href={`tel:${SHOP.phone}`} aria-label="Gọi hotline">
          <IconPhone />
        </a>
      </div>
    </>
  );
}
