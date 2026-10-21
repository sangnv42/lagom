import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SHOP } from "../data/business";
import { useUi } from "./Ui";
import { useCart } from "../features/cart/CartContext";
import { IconBag, IconClose, IconMenu, IconPhone } from "./icons";
import { activePromotion, cmsNav, linkTo } from "../lib/site";

const NAV = [
    { to: "/collections/qua-20-10/", label: "Quà 20/10" },
    { to: "/collections/all/", label: "Bộ sưu tập" },
    { to: "/collections/hoa-khai-truong/", label: "Khai trương" },
    { to: "/collections/hoa-sinh-nhat/", label: "Sinh nhật" },
    { to: "/#concierge", label: "Đặt theo yêu cầu" },
];

// Published navigation wins over the bundled menu; hidden items are filtered server-side.
function resolvedNav() {
    const cms = cmsNav();
    if (!cms?.header?.length) return NAV;
    return cms.header
        .filter((l) => (l as { visible?: boolean }).visible !== false)
        .map((l) => ({ to: linkTo(l) ?? "/", label: l.label }));
}

// Header + mobile menu, transcribed from the captured home.html header and chrome() in app.js.
export function SiteHeader() {
    const { openCart } = useUi();
    const { itemCount } = useCart();
    const [menuOpen, setMenuOpen] = useState(false);
    const [solid, setSolid] = useState(false);
    const nav = resolvedNav();
    const promo = activePromotion("header-strip");

    useEffect(() => {
        const onScroll = () => setSolid(window.scrollY > 40);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        document.body.style.overflow = menuOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [menuOpen]);

    return (
        <>
            <a className="sr" href="/#main">
                Bỏ qua đến nội dung
            </a>
            {promo ? (
                <div className="announce" role="note">
                    <Link to={promo.link || "/collections/all/"}>
                        <b>{promo.title}</b>
                        {promo.message ? ` — ${promo.message}` : ""}
                    </Link>
                </div>
            ) : null}
            <header className={`hdr${solid ? " solid" : ""}`}>
                <div className="wrap">
                    <button
                        className="ico menu-btn"
                        aria-label="Mở menu"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen(true)}
                    >
                        <IconMenu />
                    </button>
                    <Link
                        className="logo"
                        to="/"
                        aria-label="Lagom Flower – Trang chủ"
                    >
                        Lagom Flower
                    </Link>
                    <nav className="nav" aria-label="Chính">
                        {nav.map((n) => (
                            <Link key={n.to} to={n.to}>
                                {n.label}
                            </Link>
                        ))}
                    </nav>
                    <div className="hdr-act">
                        <Link className="nav-r" to="/#concierge">
                            Đặt theo yêu cầu
                        </Link>
                        <a
                            className="ico tel"
                            href={`tel:${SHOP.phone}`}
                            aria-label={`Gọi ${SHOP.phoneTxt}`}
                        >
                            <IconPhone />
                            <span className="tel-t" aria-hidden>
                                {SHOP.phoneTxt}
                            </span>
                        </a>
                        <button
                            className="ico"
                            aria-label="Giỏ hàng"
                            onClick={openCart}
                        >
                            <IconBag />
                            <span className="badge" data-n={itemCount}>
                                {itemCount || ""}
                            </span>
                        </button>
                    </div>
                </div>
            </header>
            <nav
                className={`mnav${menuOpen ? " open" : ""}`}
                aria-label="Menu di động"
                id="mnav"
            >
                <button
                    className="ico"
                    aria-label="Đóng menu"
                    onClick={() => setMenuOpen(false)}
                >
                    <IconClose />
                </button>
                {nav.map((n) => (
                    <Link
                        key={n.to}
                        to={n.to}
                        onClick={() => setMenuOpen(false)}
                    >
                        {n.label}
                    </Link>
                ))}
                <a
                    href={SHOP.zalo}
                    target="_blank"
                    rel="noopener"
                    onClick={() => setMenuOpen(false)}
                >
                    Nhắn Zalo cho shop
                </a>
                <a
                    href={`tel:${SHOP.phone}`}
                    onClick={() => setMenuOpen(false)}
                >
                    Gọi {SHOP.phoneTxt}
                </a>
                <Link to="/#delivery" onClick={() => setMenuOpen(false)}>
                    Khu vực &amp; phí giao hàng
                </Link>
                <Link
                    to="/pages/chinh-sach-doi-tra/"
                    onClick={() => setMenuOpen(false)}
                >
                    Chính sách đổi trả
                </Link>
                {SHOP.stores.map((s) => (
                    <a
                        key={s.name}
                        href={s.map}
                        target="_blank"
                        rel="noopener"
                        onClick={() => setMenuOpen(false)}
                    >
                        {s.name}
                        <small>
                            {s.address} · {s.phoneTxt}
                        </small>
                    </a>
                ))}
            </nav>
        </>
    );
}
