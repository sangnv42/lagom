import { Link } from "react-router-dom";
import { SHOP } from "../data/business";
import { COLLECTIONS } from "../data/catalog";
import { collectionUrl } from "../lib/urls";
import { IconPhone } from "./icons";
import { cmsNav, linkTo } from "../lib/site";

// Published footer link groups replace the bundled link columns when present (§8).
function footerColumns() {
    const groups = cmsNav()?.footerGroups;
    if (!groups?.length) {
        return [
            {
                title: "Mua sắm",
                items: COLLECTIONS.filter((c) => !c.virtual).map((c) => ({
                    label: c.title,
                    url: collectionUrl(c.slug),
                })),
            },
            {
                title: "Hỗ trợ",
                items: [
                    { label: "Khu vực giao hàng", url: "/#delivery" },
                    { label: "Đặt hoa theo yêu cầu", url: "/#concierge" },
                    { label: "Chính sách đổi trả", url: "/pages/chinh-sach-doi-tra/" },
                    { label: "Chính sách bảo mật", url: "/pages/chinh-sach-bao-mat/" },
                    { label: "Chat Zalo", url: SHOP.zalo },
                ],
            },
        ];
    }
    return groups.map((g) => ({
        title: g.title,
        items: (g.items ?? [])
            .filter((l) => (l as { visible?: boolean }).visible !== false)
            .map((l) => ({ label: l.label, url: linkTo(l) ?? "/" })),
    }));
}

// Footer + floating Zalo/call buttons, transcribed from chrome() in the captured app.js.
export function SiteFooter() {
    const columns = footerColumns();
    return (
        <>
            <footer className="ftr">
                <div className="wrap">
                    <div className="ftr-top">
                        <p className="ftr-say">
                            Hoa tươi cắm tay, <em>trao gửi trọn vẹn.</em>
                        </p>
                        <div className="ftr-cta">
                            <a
                                className="btn cv-zalo"
                                href={SHOP.zalo}
                                target="_blank"
                                rel="noopener"
                            >
                                Nhắn Zalo
                            </a>
                            <a
                                className="btn ghost cv-call"
                                href={`tel:${SHOP.phone}`}
                            >
                                Gọi {SHOP.phoneTxt}
                            </a>
                        </div>
                    </div>
                    <div className="ftr-grid">
                        <div>
                            <Link
                                className="logo logo-ftr"
                                to="/"
                                aria-label="Lagom Flower – Trang chủ"
                            >
                                Lagom Flower
                            </Link>
                            <p style={{ marginTop: 18, maxWidth: "36ch" }}>
                                Hoa tươi cao cấp &amp; quà tặng doanh nghiệp tại
                                TP. Hồ Chí Minh. Nhận đặt hoa theo mẫu —
                                freeship bán kính 1km.
                            </p>
                            <div className="store">
                                <p className="ft-h">Địa chỉ cửa hàng</p>
                                {SHOP.stores.map((s) => (
                                    <div key={s.name} className="store-item">
                                        <p>
                                            <a
                                                href={s.map}
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                {s.name}
                                            </a>
                                        </p>
                                        <p>{s.address}</p>
                                        <p>
                                            Hotline/Zalo:{" "}
                                            <a href={`tel:${s.phone}`}>
                                                {s.phoneTxt}
                                            </a>
                                        </p>
                                    </div>
                                ))}
                                <a
                                    className="btn ghost cv-call"
                                    href={SHOP.map}
                                    target="_blank"
                                    rel="noopener"
                                >
                                    Chỉ đường
                                </a>
                            </div>
                        </div>
                        {columns.map((col) => (
                            <div key={col.title}>
                                <p className="ft-h">{col.title}</p>
                                <ul>
                                    {col.items.map((it) => (
                                        <li key={it.url + it.label}>
                                            {it.url.startsWith("http") ? (
                                                <a href={it.url} target="_blank" rel="noopener">
                                                    {it.label}
                                                </a>
                                            ) : (
                                                <Link to={it.url}>{it.label}</Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                        <div>
                            <p className="ft-h">Thanh toán</p>
                            <div className="pay">
                                <span>COD</span>
                                <span>Chuyển khoản</span>
                            </div>
                        </div>
                    </div>
                    <div className="ftr-bot">
                        <span>
                            © 2026 Lagom Flower. Thiết kế bởi Lagom Flower.
                        </span>
                        <span>
                            {SHOP.reviewsScore}★ · {SHOP.reviewsCount} đánh giá
                            Google
                        </span>
                    </div>
                </div>
            </footer>
            <div className="fab">
                <a
                    className="z"
                    href={SHOP.zalo}
                    target="_blank"
                    rel="noopener"
                    aria-label="Chat Zalo"
                >
                    Zalo
                </a>
                <a
                    className="c"
                    href={`tel:${SHOP.phone}`}
                    aria-label="Gọi hotline"
                >
                    <IconPhone />
                </a>
            </div>
        </>
    );
}
