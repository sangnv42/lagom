// Shared storefront section renderer for CMS-composed pages.
// Renders the approved section component system (see SECTION_TYPES in server/schemas.ts) with the
// storefront's existing markup and classes, so preview in the admin and the public page use the
// same components (§12). Hidden sections are already removed from the public payload.

import { Link } from "react-router-dom";
import type { Section } from "../../lib/site";
import {
    activePromotion,
    cmsFaqs,
    cmsTestimonials,
    mediaUrl,
} from "../../lib/site";
import { PRODUCTS, inCollection } from "../../data/catalog";
import { Img } from "../Img";
import { ProductCard } from "../ProductCard";

const bySlug = (slugs: string[]) =>
    slugs
        .map((s) => PRODUCTS.find((p) => p.slug === s))
        .filter((p): p is (typeof PRODUCTS)[number] => !!p);

function Heading({ s }: { s: Section }) {
    return (
        <div className="sec-hd rv in">
            <div>
                {s.description && s.heading ? <span className="eyebrow">{s.heading}</span> : null}
                <h2 className="h2">{s.heading}</h2>
                {s.description && !s.heading ? <p className="lead">{s.description}</p> : null}
            </div>
        </div>
    );
}

function ProductGrid({ products }: { products: readonly (typeof PRODUCTS)[number][] }) {
    if (!products.length)
        return <p className="lead">Danh sách sản phẩm sẽ có sớm.</p>;
    return (
        <div className="grid">
            {products.map((p) => (
                <ProductCard key={p.id} p={p} />
            ))}
        </div>
    );
}

function SectionOne({ s }: { s: Section }) {
    const img = mediaUrl(s.imageAssetId);
    switch (s.type) {
        case "hero":
            return (
                <section className="hero">
                    <div className="hero-bg">
                        <Img src={img} alt="" sizes="100vw" eager />
                    </div>
                    <div className="hero-in">
                        <div>
                            <span className="eyebrow">{s.description}</span>
                            <h1>{s.heading}</h1>
                            {s.buttonLabel && s.buttonUrl ? (
                                <div className="hero-cta">
                                    <Link className="btn cta-main cv-main" to={s.buttonUrl}>
                                        {s.buttonLabel}
                                    </Link>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>
            );
        case "benefits":
            return (
                <section className="sec">
                    <div className="wrap">
                        <Heading s={s} />
                        <div className="bands">
                            {(s.items ?? []).map((it) => (
                                <div key={it.label} style={{ background: "var(--ink)", padding: 24 }}>
                                    <small>{it.label}</small>
                                    <span>{it.description}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            );
        case "category-cards":
            return (
                <section className="sec ivory">
                    <div className="wrap">
                        <Heading s={s} />
                        <div className="bands">
                            {(s.items ?? []).map((it) => (
                                <Link key={it.label} to={it.url ?? "/"}>
                                    <small>{it.label}</small>
                                    <b>{it.description}</b>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            );
        case "featured-collection": {
            const products = s.collectionId
                ? PRODUCTS.filter((p) => inCollection(p, s.collectionId ?? undefined))
                : [];
            return (
                <section className="sec">
                    <div className="wrap">
                        <Heading s={s} />
                        <ProductGrid products={products.slice(0, 8)} />
                    </div>
                </section>
            );
        }
        case "featured-products":
            return (
                <section className="sec">
                    <div className="wrap">
                        <Heading s={s} />
                        <ProductGrid products={bySlug(s.productIds ?? [])} />
                    </div>
                </section>
            );
        case "budget-cards":
            return (
                <section className="sec">
                    <div className="wrap">
                        <Heading s={s} />
                        <div className="bands">
                            {(s.items ?? []).map((it) => (
                                <Link key={it.label} to={it.url ?? "/collections/all/"}>
                                    <small>{it.label}</small>
                                    <b>{it.description}</b>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            );
        case "image-text":
        case "brand-story":
            return (
                <section className="sec ivory">
                    <div className="wrap" style={{ display: "grid", gap: 32, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", direction: s.layout === "right" ? "rtl" : undefined }}>
                        <Img src={img} alt={s.heading ?? ""} sizes="(max-width:768px) 100vw, 50vw" />
                        <div>
                            <h2 className="h2">{s.heading}</h2>
                            <p className="lead">{s.description}</p>
                            {s.buttonLabel && s.buttonUrl ? (
                                <Link className="btn ghost" to={s.buttonUrl}>
                                    {s.buttonLabel}
                                </Link>
                            ) : null}
                        </div>
                    </div>
                </section>
            );
        case "testimonials": {
            const list = cmsTestimonials();
            return (
                <section className="sec">
                    <div className="wrap">
                        <Heading s={s} />
                        {list.length ? (
                            <div className="grid">
                                {list.map((t, i) => (
                                    <blockquote key={i} style={{ margin: 0 }}>
                                        <p className="lead">“{t.quote}”</p>
                                        <footer className="muted">
                                            {t.name}
                                            {t.rating ? ` · ${"★".repeat(t.rating)}` : ""}
                                            {t.sourceLabel ? ` · ${t.sourceLabel}` : ""}
                                        </footer>
                                    </blockquote>
                                ))}
                            </div>
                        ) : (
                            <p className="lead">Chưa có đánh giá nào.</p>
                        )}
                    </div>
                </section>
            );
        }
        case "faq-accordion": {
            const list = cmsFaqs(s.category);
            return (
                <section className="sec ivory">
                    <div className="wrap acc">
                        <Heading s={s} />
                        {list.length ? (
                            list.map((f) => (
                                <details key={f.question}>
                                    <summary>{f.question}</summary>
                                    <p className="lead">{f.answer}</p>
                                </details>
                            ))
                        ) : (
                            <p className="lead">Chưa có câu hỏi nào.</p>
                        )}
                    </div>
                </section>
            );
        }
        case "delivery-info":
            return (
                <section className="sec ivory">
                    <div className="wrap">
                        <Heading s={s} />
                        <p className="lead">{s.description}</p>
                        <ul className="lead">
                            {(s.items ?? []).map((it) => (
                                <li key={it.label}>
                                    <b>{it.label}</b>
                                    {it.description ? ` — ${it.description}` : ""}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            );
        case "custom-cta":
            return (
                <section className="sec">
                    <div className="wrap" style={{ textAlign: "center" }}>
                        <h2 className="h2">{s.heading}</h2>
                        <p className="lead">{s.description}</p>
                        {s.buttonLabel && s.buttonUrl ? (
                            <Link className="btn cta-main cv-main" to={s.buttonUrl}>
                                {s.buttonLabel}
                            </Link>
                        ) : null}
                    </div>
                </section>
            );
        case "promo-banner": {
            const promo = activePromotion("home-banner");
            if (!promo) return null;
            return (
                <section className="sec">
                    <div className="wrap">
                        <Link to={promo.link || "/collections/all/"} style={{ display: "block" }}>
                            <h2 className="h2">{promo.title}</h2>
                            <p className="lead">{promo.message}</p>
                        </Link>
                    </div>
                </section>
            );
        }
        default:
            return null;
    }
}

export function PageSections({ sections }: { sections: Section[] }) {
    return (
        <>
            {sections.map((s) => (
                <SectionOne key={s.id} s={s} />
            ))}
        </>
    );
}
