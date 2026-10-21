import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PRODUCTS, inCollection } from "../data/catalog";
import { BANDS, CAMPAIGN, SHOP } from "../data/business";
import { collectionUrl } from "../lib/urls";
import { fmt, fromPriceVnd, pfmt } from "../lib/money";
import { campaignRemaining } from "../lib/campaign";
import { Img } from "../components/Img";
import { Seo } from "../components/Seo";
import { ProductCard } from "../components/ProductCard";
import {
    IconCard,
    IconPen,
    IconPin,
    IconStar,
    IconZalo,
} from "../components/icons";
import { absAsset, SIZES } from "../lib/img";
import { COLLECTION_PIN } from "../data/catalog";
import { getCmsPage } from "../lib/site";
import { PageSections } from "../components/sections/PageSections";

// Homepage sections and order transcribed from docs/reference/captures/home.html (fetched 2026-10-20).
// Marketing copy is the captured text; product grids are computed from the catalog exactly as the
// reference home() does (same selection rules), so prices never diverge from the catalog.

const priceOf = (p: (typeof PRODUCTS)[number]): number =>
    fromPriceVnd(p.variants.map((v) => v.priceVnd));
const byColl = (h: string, n: number) =>
    PRODUCTS.filter((p) => inCollection(p, h))
        .sort(
            (a, b) =>
                (!priceOf(a) ? 1 : 0) - (!priceOf(b) ? 1 : 0) ||
                a.order - b.order,
        )
        .slice(0, n);

const OCC_IMG: Record<string, string> = {
    "hoa-sinh-nhat": "/img/hoa/trang_03_anh_01.jpg",
    "hoa-bo": "/img/hoa/trang_02_anh_01.jpg",
    "hoa-cuoi":
        "/archflowers-export/images/1__1__e28fbc26f4d54afca6e43434d279756e.jpg",
};

function SectionHeading({
    eyebrow,
    title,
    link,
    lead,
}: {
    eyebrow: string;
    title: React.ReactNode;
    link?: { to: string; label: string };
    lead?: string;
}) {
    return (
        <div className="sec-hd rv in">
            <div>
                <span className="eyebrow">{eyebrow}</span>
                <h2 className="h2">{title}</h2>
                {lead && <p className="lead">{lead}</p>}
            </div>
            {link && (
                <Link className="link" to={link.to}>
                    {link.label}
                </Link>
            )}
        </div>
    );
}

export function HomePage() {
    const [cd, setCd] = useState(() => campaignRemaining());
    useEffect(() => {
        const id = window.setInterval(() => setCd(campaignRemaining()), 30_000);
        return () => window.clearInterval(id);
    }, []);

    // A published composed page at slug "home" fully replaces the bundled homepage (§14).
    const cmsHome = getCmsPage("home");
    if (cmsHome) {
        return (
            <main id="main">
                <Seo title={cmsHome.seo?.title ?? cmsHome.title} description={cmsHome.seo?.description ?? ""} />
                <PageSections sections={cmsHome.sections} />
            </main>
        );
    }

    const hero =
        PRODUCTS.find(
            (p) =>
                /hồng/i.test(p.title) &&
                p.collectionSlugs.includes("hoa-bo") &&
                priceOf(p) >= 1_000_000,
        ) ?? PRODUCTS[0];
    const heroImg = hero?.imagePaths[0] ?? "/img/hoa/trang_01_anh_01.jpg";
    const sig = PRODUCTS.filter((p) => priceOf(p) >= 1_500_000).sort(
        (a, b) => priceOf(b) - priceOf(a),
    );
    const sigFeature = sig[0] ?? PRODUCTS[0];
    const best = [
        ...byColl("hoa-bo", 3),
        ...byColl("hoa-hop", 2),
        ...byColl("hoa-gio", 2),
        ...byColl("hoa-sinh-nhat", 1),
    ];
    const occ = [
        ["hoa-sinh-nhat", "Sinh nhật"],
        ["hoa-khai-truong", "Khai trương"],
        ["hoa-hop", "Hộp hoa"],
        ["hoa-bo", "Hoa bó"],
        ["hoa-cuoi", "Hoa cưới"],
        ["hoa-gio", "Giỏ hoa"],
    ] as const;
    const story =
        PRODUCTS.find((p) => p.collectionSlugs.includes("hoa-cuoi")) ??
        PRODUCTS[3];
    const conciergeBg =
        PRODUCTS.find(
            (p) => /khai trương/i.test(p.title) && p.imagePaths.length > 1,
        ) ?? PRODUCTS[2];

    return (
        <>
            <Seo
                title="Lagom Flower – Hoa Tươi Cao Cấp, Cắm Tay Tại TP.HCM"
                description="Bó hoa, giỏ hoa, hộp hoa và lẵng khai trương được florist cắm tay từ hoa tươi trong ngày – tinh tế, sang trọng. Giao tận nơi khắp TP.HCM."
                path="/"
                image={absAsset(heroImg)}
            />
            <main id="main">
                <section
                    className="hero"
                    aria-labelledby="h1"
                    style={{ ["--hero-img" as string]: `url("${heroImg}")` }}
                >
                    <div className="hero-bg">
                        <Img
                            src={heroImg}
                            alt={hero?.title ?? "Hoa tươi Lagom Flower"}
                            eager
                            sizes="(max-width:899px) 100vw, 64vw"
                            fetchPriority="high"
                        />
                    </div>
                    <div className="hero-in">
                        <div>
                            <h1 id="h1">
                                Hoa tươi cao cấp cho <em>Ngày Phụ nữ</em> Việt
                                Nam
                            </h1>
                            <p>
                                Những thiết kế hoa thủ công, sang trọng, cắm từ
                                hoa tươi trong ngày. Đặt trước để được giao đúng
                                khung giờ ngày 20/10 tại TP.HCM.
                            </p>
                            {!cd.expired &&
                                CAMPAIGN.id === "qua-20-10-2026" && (
                                    <div
                                        className="countdown"
                                        aria-label="Thời gian còn lại đến 20/10"
                                    >
                                        <span className="cd-l">Còn</span>
                                        <div>
                                            <b>{cd.days}</b>
                                            <span>ngày</span>
                                        </div>
                                        <div>
                                            <b>{cd.hours}</b>
                                            <span>giờ</span>
                                        </div>
                                        <div>
                                            <b>{cd.minutes}</b>
                                            <span>phút</span>
                                        </div>
                                    </div>
                                )}
                            <div className="hero-cta">
                                <Link
                                    className="btn cta-main cv-main"
                                    to={collectionUrl("qua-20-10")}
                                >
                                    Chọn quà 20/10
                                    <span className="arr" aria-hidden>
                                        →
                                    </span>
                                </Link>
                                <a
                                    className="btn ghost cta-zalo cv-zalo"
                                    href={SHOP.zalo}
                                    target="_blank"
                                    rel="noopener"
                                >
                                    <IconZalo />
                                    <span>
                                        Đặt <span className="hs">riêng </span>
                                        qua Zalo
                                    </span>
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="promises" aria-label="Cam kết">
                    <ul className="wrap" style={{ padding: 0 }}>
                        <li>
                            <IconPen />
                            <div>
                                <b>Nhận đặt hoa theo mẫu</b>
                                <small>
                                    Cắm theo mẫu bạn gửi · gửi ảnh &amp; video
                                    hoa trước khi giao
                                </small>
                            </div>
                        </li>
                        <li>
                            <IconPin />
                            <div>
                                <b>Freeship bán kính 1km</b>
                                <small>
                                    Miễn phí giao hàng trong 1km quanh cửa hàng
                                </small>
                            </div>
                        </li>
                        <li>
                            <IconCard />
                            <div>
                                <b>COD · Chuyển khoản</b>
                                <small>Thanh toán linh hoạt</small>
                            </div>
                        </li>
                        <li>
                            <IconStar />
                            <div>
                                <b>
                                    {SHOP.reviewsScore}★ · {SHOP.reviewsCount}{" "}
                                    đánh giá
                                </b>
                                <small>Được khách hàng Google tin chọn</small>
                            </div>
                        </li>
                    </ul>
                </section>

                <section className="sec" aria-labelledby="occH">
                    <div className="wrap">
                        <SectionHeading
                            eyebrow="Khoảnh khắc trao gửi"
                            title={
                                <>
                                    Mỗi khoảnh khắc, <em>một tuyệt tác</em>
                                </>
                            }
                            link={{
                                to: collectionUrl("all"),
                                label: "Toàn bộ bộ sưu tập",
                            }}
                        />
                        <div className="occ">
                            {occ.map(([h, n]) => {
                                const pin =
                                    PRODUCTS.find(
                                        (x) =>
                                            x.slug === COLLECTION_PIN[h] &&
                                            inCollection(x, h),
                                    ) ??
                                    byColl(h, 1)[0] ??
                                    PRODUCTS[0];
                                const count = PRODUCTS.filter((p) =>
                                    inCollection(p, h),
                                ).length;
                                return (
                                    <Link
                                        key={h}
                                        className="tile rv in"
                                        to={collectionUrl(h)}
                                    >
                                        <div className="tile-i">
                                            <Img
                                                src={
                                                    OCC_IMG[h] ??
                                                    pin.imagePaths[0]
                                                }
                                                alt={n}
                                                sizes={SIZES.card}
                                            />
                                        </div>
                                        <div className="tile-t">
                                            <h3>{n}</h3>
                                            <span>{count} mẫu</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="sec ivory" aria-labelledby="sigH">
                    <div className="wrap">
                        <SectionHeading
                            eyebrow="The Signature"
                            title={
                                <>
                                    Bộ sưu tập <em>Signature</em>
                                </>
                            }
                            lead="Những thiết kế đắt giá nhất của Lagom — hoa nhập khẩu, bình gốm thủ công, dành cho món quà không thể quên."
                        />
                        <div className="sig">
                            <div className="sig-feature rv in">
                                <span className="num">01</span>
                                <Link to={`/products/${sigFeature.slug}/`}>
                                    <figure>
                                        <Img
                                            src={sigFeature.imagePaths[0]}
                                            alt={sigFeature.title}
                                            sizes={SIZES.card}
                                        />
                                    </figure>
                                </Link>
                                <div className="sig-copy">
                                    <span
                                        className="code"
                                        style={{
                                            letterSpacing: ".2em",
                                            fontSize: 11,
                                            color: "#6b5d58",
                                        }}
                                    >
                                        MÃ {sigFeature.sku}
                                    </span>
                                    <h3>{sigFeature.title}</h3>
                                    <p className="lead">
                                        Thiết kế đặt riêng cho những dịp trọng
                                        đại — chọn hoa nhập khẩu, cắm tay bởi
                                        florist trưởng.
                                    </p>
                                    <div className="price">
                                        <b>{pfmt(priceOf(sigFeature))}</b>
                                        {sigFeature.variants[0]?.compareAtVnd &&
                                            sigFeature.variants[0]
                                                .compareAtVnd >
                                                priceOf(sigFeature) && (
                                                <s>
                                                    {fmt(
                                                        sigFeature.variants[0]
                                                            .compareAtVnd,
                                                    )}
                                                </s>
                                            )}
                                    </div>
                                    <p style={{ marginTop: 18 }}>
                                        <Link
                                            className="btn ghost"
                                            to={`/products/${sigFeature.slug}/`}
                                        >
                                            Xem chi tiết
                                        </Link>
                                    </p>
                                </div>
                            </div>
                            <div className="sig-grid">
                                {sig.slice(1, 5).map((p) => (
                                    <ProductCard key={p.slug} p={p} />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="sec" aria-labelledby="bestH">
                    <div className="wrap">
                        <SectionHeading
                            eyebrow="Được yêu thích"
                            title={
                                <>
                                    Bán chạy <em>tuần này</em>
                                </>
                            }
                            link={{
                                to: collectionUrl("all", "s=off"),
                                label: "Xem tất cả",
                            }}
                        />
                        <div className="rail">
                            {best.map((p) => (
                                <ProductCard key={p.slug} p={p} />
                            ))}
                        </div>
                    </div>
                </section>

                <section
                    className="sec"
                    style={{ paddingTop: 0 }}
                    aria-labelledby="priceH"
                >
                    <div className="wrap">
                        <SectionHeading
                            eyebrow="Theo ngân sách"
                            title={
                                <>
                                    Chọn theo <em>mức giá</em>
                                </>
                            }
                        />
                        <div className="bands">
                            {BANDS.map((b) => (
                                <Link
                                    key={b.id}
                                    className="rv in"
                                    to={collectionUrl("all", `p=${b.id}`)}
                                >
                                    <small>
                                        {
                                            PRODUCTS.filter((p) =>
                                                p.variants.some(
                                                    (x) =>
                                                        x.priceVnd >= b.min &&
                                                        x.priceVnd <= b.max,
                                                ),
                                            ).length
                                        }{" "}
                                        mẫu
                                    </small>
                                    <b>{b.label}</b>
                                    <span>Khám phá</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="sec wine" aria-labelledby="revH">
                    <div className="wrap">
                        <div className="sec-hd rv in">
                            <div>
                                <span className="eyebrow">Khách hàng nói</span>
                                <h2 className="h2" id="revH">
                                    Niềm tin <em>trọn vẹn</em>
                                </h2>
                            </div>
                            <div className="rv-score">
                                <b>{SHOP.reviewsScore}</b>
                                <div>
                                    <div className="stars" aria-hidden>
                                        ★★★★★
                                    </div>
                                    <a
                                        href={SHOP.map}
                                        target="_blank"
                                        rel="noopener"
                                        className="rv-link"
                                    >
                                        {SHOP.reviewsCount} đánh giá trên Google
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="quotes">
                            <blockquote className="quote rv in">
                                <p>
                                    “Hoa rất tươi và tay nghề chị chủ cắm hoa
                                    rất khéo. Hỗ trợ nhiệt tình.”
                                </p>
                                <footer>
                                    Quang Tùng Đoàn · Đánh giá Google
                                </footer>
                            </blockquote>
                            <blockquote className="quote rv in">
                                <p>
                                    “Hoa đẹp lắm ạ, đã mua 2 lần bên shop lúc
                                    nào cũng ưng bụng, đã khéo tay gói hoa đẹp
                                    còn giá cả phải chăng nữa ^^ Chị chủ shop
                                    thân thiện, dễ thương.”
                                </p>
                                <footer>Vy Le · Local Guide Google</footer>
                            </blockquote>
                            <blockquote className="quote rv in">
                                <p>
                                    “Chị chủ nhiệt tình lắm, gói hoa cũng rất
                                    xinh nữa, giá cả phải chăng.”
                                </p>
                                <footer>
                                    Kiều Anh Huy Huỳnh · Đánh giá Google
                                </footer>
                            </blockquote>
                        </div>
                        <p className="note">
                            <a
                                href={SHOP.map}
                                target="_blank"
                                rel="noopener"
                                className="rv-link"
                            >
                                Xem tất cả {SHOP.reviewsCount} đánh giá 5★ trên
                                Google Maps →
                            </a>
                        </p>
                    </div>
                </section>

                <section
                    className="sec ivory"
                    id="delivery"
                    aria-labelledby="delH"
                >
                    <div className="wrap area">
                        <div className="rv in">
                            <span className="eyebrow">Khu vực giao hàng</span>
                            <h2
                                className="h2"
                                id="delH"
                                style={{ marginTop: 14 }}
                            >
                                Giao hoa <em>tận tay</em> khắp TP.HCM
                            </h2>
                            <p className="lead" style={{ marginTop: 18 }}>
                                Đội giao hàng riêng của Lagom đảm bảo hoa đến
                                tay nguyên vẹn, đúng khung giờ. Đơn giao trong
                                ngày: đặt trước ít nhất 2 tiếng (trước 13:00 cho
                                khung 15:00 – 18:00; ngày lễ trước 16:00 cho
                                khung tối).
                            </p>
                            <ul className="districts">
                                {[
                                    "Quận 1",
                                    "Quận 3",
                                    "Quận 4",
                                    "Quận 5",
                                    "Quận 7",
                                    "Quận 10",
                                    "Bình Thạnh",
                                    "Phú Nhuận",
                                    "Tân Bình",
                                    "Gò Vấp",
                                    "TP. Thủ Đức",
                                    "Tân Phú",
                                    "+ ngoại thành",
                                ].map((d) => (
                                    <li key={d}>{d}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="area-card rv in">
                            <span className="eyebrow">Cam kết giao hàng</span>
                            <dl>
                                <dt>1km</dt>
                                <dd>
                                    Freeship trong bán kính 1km quanh cửa hàng
                                </dd>
                                <dt>7/7</dt>
                                <dd>
                                    Giao từ 08:00 đến 18:00 mỗi ngày. Ngày lễ:
                                    có thêm khung 18:00 – 20:00
                                </dd>
                                <dt>Mẫu</dt>
                                <dd>
                                    Nhận đặt hoa theo mẫu khách gửi. Shop gửi
                                    ảnh và video hoa để bạn xem trước khi giao
                                </dd>
                                <dt>0đ</dt>
                                <dd>Thiệp viết tay kèm lời nhắn</dd>
                            </dl>
                        </div>
                    </div>
                </section>

                <section
                    className="sec concierge"
                    id="concierge"
                    aria-labelledby="conH"
                >
                    <div className="bg" aria-hidden>
                        <Img
                            src={conciergeBg.imagePaths[0]}
                            alt=""
                            sizes={SIZES.full}
                        />
                    </div>
                    <div className="wrap concierge-in">
                        <div className="rv in">
                            <span className="eyebrow">Đặt theo yêu cầu</span>
                            <h2
                                className="h2"
                                id="conH"
                                style={{ marginTop: 14 }}
                            >
                                Đặt hoa riêng <em>theo yêu cầu</em>
                            </h2>
                            <p className="lead" style={{ marginTop: 18 }}>
                                Gửi ảnh mẫu bạn thích qua Zalo, florist tư vấn
                                1:1 — từ hoa khai trương, hoa sự kiện đến quà
                                tặng doanh nghiệp số lượng lớn.
                            </p>
                            <ul>
                                <li>Hoa khai trương</li>
                                <li>Hoa sự kiện, hội nghị</li>
                                <li>Quà tặng doanh nghiệp</li>
                                <li>Hợp đồng hoa định kỳ</li>
                            </ul>
                        </div>
                        <div className="ctas rv in">
                            <a
                                className="btn cv-zalo"
                                href={SHOP.zalo}
                                target="_blank"
                                rel="noopener"
                            >
                                Gửi ảnh mẫu qua Zalo
                            </a>
                            <a
                                className="btn ghost cv-call"
                                href={`tel:${SHOP.phone}`}
                            >
                                Gọi {SHOP.phoneTxt}
                            </a>
                        </div>
                    </div>
                </section>

                <section className="sec" aria-labelledby="storyH">
                    <div className="wrap story">
                        <figure className="rv in">
                            <Img
                                src={story.imagePaths[0]}
                                alt="Florist Lagom Flower cắm hoa"
                                sizes={SIZES.card}
                            />
                            <div className="small-img">
                                <Img
                                    src={(PRODUCTS[10] ?? story).imagePaths[0]}
                                    alt="Chi tiết bó hoa"
                                    sizes={SIZES.card}
                                />
                            </div>
                        </figure>
                        <div className="copy rv in">
                            <span className="eyebrow">Câu chuyện Lagom</span>
                            <h2
                                className="h2"
                                id="storyH"
                                style={{ marginTop: 14 }}
                            >
                                Nghệ thuật <em>trao gửi</em>
                            </h2>
                            <blockquote>
                                “Mỗi bó hoa là một lời chưa nói thành lời.”
                            </blockquote>
                            <p className="lead">
                                Lagom Flower ra đời giữa lòng Sài Gòn với niềm
                                tin rằng hoa không chỉ để ngắm — hoa là cách gửi
                                gắm sự trân trọng. Mỗi thiết kế được tuyển chọn
                                hoa tươi trong ngày và cắm tay tỉ mỉ, để món quà
                                của bạn luôn đẹp như khoảnh khắc nó được trao.
                            </p>
                            <Link
                                className="link"
                                to={collectionUrl("bo-suu-tap-moi")}
                            >
                                Khám phá bộ sưu tập mới
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}
