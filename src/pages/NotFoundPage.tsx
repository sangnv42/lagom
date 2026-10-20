import { Link } from 'react-router-dom';
import { SHOP } from '../data/business';
import { Seo } from '../components/Seo';

// 404 page — transcribed from the observed live 404 (e.g. GET /qua-20-10/ returns this template):
// c-hero + ivory/txt-page block with two .link actions. Not indexed.
export function NotFoundPage({ note }: { note?: string }) {
  return (
    <>
      <Seo title="Không tìm thấy trang | Larom Flower" description="Trang bạn tìm không tồn tại hoặc đã được chuyển." noindex />
      <main id="main">
        <section className="c-hero">
          <div className="wrap">
            <h1>Không tìm thấy trang</h1>
            <p className="lead">{note ?? 'Mẫu hoa hoặc trang này có thể đã đổi địa chỉ.'}</p>
          </div>
        </section>
        <div className="ivory">
          <div className="wrap txt-page">
            <p>
              <Link className="link" to="/collections/all/">
                Xem tất cả mẫu hoa
              </Link>
            </p>
            <p>
              <a className="link" href={SHOP.zalo}>
                Nhắn Zalo cho shop
              </a>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
