// One-time extraction of embedded Vietnamese content from the captured reference JS/HTML into typed JSON.
// Source of truth: docs/reference/captures/app.js, policy_*.html (fetched 2026-10-20).
// Deterministic regex extraction only — the captured literals are plain quoted strings.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

// Rebrand: captured text references the old store name; rewrite it on extraction.
const brand = (s) =>
    s.replace(/Arch Flowers/g, "Lagom Flower").replace(/\bArch\b/g, "Lagom");

const app = readFileSync("docs/reference/captures/app.js", "utf8");
const unescapeStr = (s) => s.replace(/\\'/g, "'").replace(/\\\\/g, "\\");

function stringArray(name) {
    const i = app.indexOf("const " + name + " = [");
    if (i < 0) throw new Error("not found: " + name);
    const end = app.indexOf("];", i);
    const body = app.slice(i + ("const " + name + " = ").length, end + 1);
    return [...body.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) =>
        unescapeStr(m[1]),
    );
}

function collSeo() {
    const cs = app.indexOf("const COLL_SEO = {");
    const ce = app.indexOf("const collTitle", cs);
    const body = app.slice(cs, ce);
    const re =
        /'?([a-z0-9-]+)'?:\s*\{\s*t:\s*'((?:[^'\\]|\\.)*)',\s*d:\s*'((?:[^'\\]|\\.)*)',\s*x:\s*\[([\s\S]*?)\]\s*\}/g;
    const out = {};
    for (const m of body.matchAll(re)) {
        out[m[1]] = {
            t: unescapeStr(m[2]),
            d: unescapeStr(m[3]),
            x: [...m[4].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((s) =>
                unescapeStr(s[1]),
            ),
        };
    }
    return out;
}

mkdirSync("src/data", { recursive: true });
const wards = stringArray("WARDS");
const communes = stringArray("COMMUNES");
const holidays = stringArray("HOLIDAYS");
const seo = collSeo();
if (
    !wards.length ||
    !communes.length ||
    !holidays.length ||
    !Object.keys(seo).length
) {
    throw new Error("extraction produced empty output — check capture format");
}

// Reference hardcodes a third optgroup: <optgroup label="Đặc khu"><option>Đặc khu Côn Đảo</option></optgroup>
const special = ["Côn Đảo"];
writeFileSync(
    "src/data/wards.json",
    JSON.stringify({ wards, communes, special }, null, 1) + "\n",
);
writeFileSync("src/data/holidays.json", JSON.stringify(holidays) + "\n");
writeFileSync(
    "src/data/collection-seo.json",
    brand(JSON.stringify(seo, null, 1)) + "\n",
);

function policy(file) {
    const h = readFileSync("docs/reference/captures/" + file, "utf8");
    const body = h.match(/<div class="wrap txt-page">([\s\S]*?)<\/div>/)[1];
    const blocks = [...body.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => ({
        type: "paragraph",
        html: m[1].replace(
            /<a class="link" href="([^"]+)">([^<]+)<\/a>/g,
            "@@LINK|$1|$2@@",
        ),
    }));
    const title = h.match(/<h1>([^<]+)<\/h1>/)[1];
    return { title, blocks };
}

const pol = {
    "chinh-sach-doi-tra": policy("policy_returns.html"),
    "chinh-sach-bao-mat": policy("policy_privacy.html"),
};
writeFileSync(
    "src/data/policies.json",
    brand(JSON.stringify(pol, null, 1)) + "\n",
);

console.log("wards:", wards.length, "communes:", communes.length);
console.log("holidays:", holidays.join(" "));
console.log("collSeo:", Object.keys(seo).join(" "));
console.log(
    "policies:",
    Object.entries(pol)
        .map(([k, v]) => `${k}(${v.blocks.length})`)
        .join(" "),
);
