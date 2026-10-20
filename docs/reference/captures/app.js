/* Proposal C – Luxury Editorial · shared app (vanilla JS) */
document.documentElement.classList.add('js');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const PHONE = '0384790349', PHONE_TXT = '0384 790 349', ZALO = 'https://zalo.me/0384790349';
const MAP = 'https://maps.app.goo.gl/Tivz4PbrRau9YX97A', ADDR = 'Lô B Chung cư Bàu Cát 2, Phường Bảy Hiền (Tân Bình cũ), TP. Hồ Chí Minh';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pfmt = n => n > 0 ? fmt(n) : 'Liên hệ';
const fmt = n => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
const PH = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="#C9A96E" stroke-width="1.2"><circle cx="50" cy="42" r="8"/><path d="M50 34c-6-14 6-20 0-20s6 6 0 20M58 42c14-6 20 6 20 0s-6 6-20 0M50 50c6 14-6 20 0 20s-6-6 0-20M42 42c-14 6-20-6-20 0s6-6 20 0M50 70v18M50 80c-8-6-14-4-16-2M50 84c8-6 14-4 16-2"/></svg>');
const BASE = '/';
// old prototype links (product.html?h= / collection.html?c=) move to the clean URLs
{ const q = new URLSearchParams(location.search), f = location.pathname.split('/').pop();
  if (q.get('c')) try { sessionStorage.setItem('archFrom', q.get('c')); } catch (e) { }
  if (f === 'product.html' && q.get('h')) location.replace(BASE + 'products/' + encodeURIComponent(q.get('h')) + '/');
  else if (f === 'collection.html') { const c = q.get('c') || 'all'; q.delete('c'); location.replace(BASE + 'collections/' + encodeURIComponent(c) + '/' + (q.toString() ? '?' + q : '')); } }
// WebP copies live in opt/{400,800,1200}/ beside each photo folder; fall back to the original JPEG
const opt = (src, w) => {
  const m = /^(.*\/)?(img|images)\/([^/]+)\.(jpe?g|png)$/i.exec(src || '');
  return m ? `${m[1] || ''}${m[2] === 'images' ? 'opt' : 'img/opt'}/${w}/${m[3]}.webp` : '';
};
const srcset = src => opt(src, 400) ? `${opt(src, 400)} 400w, ${opt(src, 800)} 800w, ${opt(src, 1200)} 1200w` : '';
const SIZES = { card: '(max-width:767px) 50vw, (max-width:1365px) 33vw, 25vw', full: '(max-width:767px) 100vw, 55vw', thumb: '120px' };
window.imgErr = img => { if (img.dataset.o) { img.removeAttribute('srcset'); img.src = img.dataset.o; img.removeAttribute('data-o'); return; } img.onerror = null; img.src = PH; img.classList.add('ph'); };
const img = (src, alt, cls = '', eager = false, sizes = SIZES.card) => {
  const ss = srcset(src);
  return `<img src="${esc(ss ? opt(src, 800) : src || PH)}"${ss ? ` srcset="${ss}" sizes="${sizes}" data-o="${esc(src)}"` : ''} alt="${esc(alt)}" width="800" height="1000" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" class="${cls}" onerror="imgErr(this)">`;
};
const ICON = {
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7h18M3 12h18M3 17h12"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 6h12v10H2zM14 9h4l4 4v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="5" width="20" height="14" rx="1"/><path d="M2 10h20M6 15h4"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/></svg>'
};

/* ---------- data ---------- */
let DATA = null;
const VIRTUAL = { 'qua-20-10': { name: 'Quà 20/10', from: ['hoa-bo', 'hoa-hop', 'hoa-gio', 'bo-suu-tap-moi'] }, all: { name: 'Tất cả hoa' } };
const BANDS = [
  { id: 'u500', label: 'Dưới 500k', min: 1, max: 499999 },
  { id: '500-1tr', label: '500k – 1 triệu', min: 500000, max: 999999 },
  { id: '1-2tr', label: '1 – 2 triệu', min: 1000000, max: 1999999 },
  { id: 'o2tr', label: 'Trên 2 triệu', min: 2000000, max: Infinity }
];
// finer price chips for the collection filter (home tiles keep the 4 bands above)
const BANDS_F = [{ id: 'u300', label: 'Dưới 300k', min: 1, max: 299999 }, { id: '300-500', label: '300k – 500k', min: 300000, max: 499999 }, ...BANDS.slice(1)];
const bandOf = id => BANDS_F.find(b => b.id === id) || BANDS.find(b => b.id === id);
function cleanTitle(t) {
  t = (t || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  let code = '';
  const m = t.match(/\s+-?\s*([A-Za-z]{1,3}\d{2,5})$/);
  if (m) { code = m[1].toUpperCase(); t = t.slice(0, m.index); }
  const name = t.split(' ').map((w, i) => /\d/.test(w) || (w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w))
    ? w : w.charAt(0).toLocaleUpperCase('vi') + w.slice(1).toLocaleLowerCase('vi')).join(' ');
  return { name, code };
}
const cleanDesc = d => (d || '').normalize('NFC').replace(/^\s*Mô tả\s*:\s*/i, '').replace(/\s*Xem thêm[\s\S]*$/, '').trim();
async function loadData() {
  if (DATA) return DATA;
  // proofread names/descriptions (spelling, punctuation) override the Haravan export text
  // low priority: the pages are pre-rendered, so the hero/product photo should win the bandwidth on slow 4G
  const lo = { priority: 'low' };
  const [r, fx] = await Promise.all([fetch('/data.json', lo), fetch(BASE + 'text-fixes.json', lo).then(x => x.ok ? x.json() : {}).catch(() => ({}))]);
  DATA = await r.json();
  DATA.collections = DATA.collections.filter(c => c.handle !== 'hoa-ke-1'); // Kệ hoa category removed at owner's request
  // hide every flower-stand (kệ hoa) product too, and keep collection counts in step
  const isKe = p => p.collections.includes('hoa-ke-1') || /kệ/i.test(p.title.normalize('NFC'));
  DATA.products.filter(isKe).forEach(p => p.collections.forEach(h => { const c = DATA.collections.find(x => x.handle === h); if (c) c.count--; }));
  DATA.products = DATA.products.filter(p => !isKe(p));
  // A0151 is a vase, not a stand: keep it in Khai trương with the right type
  DATA.products.forEach(p => { if (/A0151/.test(p.title)) { p.type = 'Hoa thả bình'; if (!p.collections.includes('hoa-khai-truong')) p.collections.push('hoa-khai-truong'); } });
  // new product supplied by the owner (photo + price), not yet in the Haravan export
  DATA.products.unshift({ handle: 'gio-hoa-tulip-hong-trang', title: 'Giỏ Hoa Tulip Hồng Trắng A0409', price: 1450000, compare: 1900000, type: 'Hoa giỏ', tags: [],
    images: ['/img/goc-gio-tulip.jpg', '/img/gio-tulip-2.jpg', '/img/gio-tulip-3.jpg'], collections: ['hoa-sinh-nhat'],
    desc: 'Giỏ hoa tulip hồng và trắng, điểm cúc họa mi, hoa ren trắng và lá xanh, cắm trong giỏ mây thắt nơ hồng. Size vừa 10 bông tulip, size to 20 bông tulip.',
    variants: [{ title: 'Vừa (10 bông tulip)', price: 1450000, compare: 1900000 }, { title: 'To (20 bông tulip)', price: 2150000, compare: 2400000 }] });
  DATA.products.unshift({ handle: 'bo-hoa-tulip-do-trang', title: 'Bó Hoa Tulip Đỏ Trắng A0410', price: 1250000, compare: 1400000, type: 'Hoa bó', tags: [],
    images: ['/img/goc-bo-tulip-do-2.jpg', '/img/bo-tulip-do-2.jpg', '/img/bo-tulip-do-3.jpg'], collections: ['hoa-bo'],
    desc: 'Bó hoa tulip đỏ và trắng, điểm cỏ lăn tăn, gói giấy dó trắng viền đỏ, thắt ruy băng đỏ. Size vừa 10 bông tulip, size to 20 bông tulip.',
    variants: [{ title: 'Vừa (10 bông tulip)', price: 1250000, compare: 1400000 }, { title: 'To (20 bông tulip)', price: 1600000, compare: 1700000 }] });
  const sn = DATA.collections.find(c => c.handle === 'hoa-sinh-nhat'); if (sn) sn.count += 1;
  DATA.products.unshift({ handle: 'bo-hoa-bibi-giay-hong', title: 'Bó Hoa Bibi Giấy Hồng A0411', price: 250000, compare: 300000, type: 'Hoa bó', tags: [],
    images: ['/img/goc-bibi-1.jpg', '/img/goc-bibi-3.jpg', '/img/bo-bibi-hong-3.jpg'], collections: ['hoa-bo'],
    desc: 'Bó hoa baby trắng điểm cúc họa mi, gói giấy nhăn hồng phấn, thắt nơ caro hồng và chuỗi ngọc trai.',
    variants: [{ title: 'Vừa', price: 250000, compare: 300000 }, { title: 'To', price: 650000, compare: 750000 }] });
  const hb = DATA.collections.find(c => c.handle === 'hoa-bo'); if (hb) hb.count += 4;
  // owner-supplied, price not given yet: price 0 shows as 'Liên hệ'
  DATA.products.unshift({ handle: 'gio-hoa-hong-vang-kem', title: 'Giỏ Hoa Hồng Vàng Kem A0412', price: 0, compare: 0, type: 'Hoa giỏ', tags: [],
    images: ['/img/a0412-1.jpg', '/img/a0412-2.jpg', '/img/a0412-3.jpg'], collections: ['hoa-gio'],
    desc: 'Giỏ cói cắm hồng vàng và hồng kem, điểm hoa thạch thảo trắng, lá bạch đàn, thắt nơ lụa vàng và ngọc trai.',
    variants: [{ title: 'Tiêu chuẩn', price: 0 }] });
  DATA.products.unshift({ handle: 'bo-hoa-hong-phan', title: 'Bó Hoa Hồng Phấn A0413', price: 0, compare: 0, type: 'Hoa bó', tags: [],
    images: ['/img/a0413-1.jpg', '/img/a0413-2.jpg', '/img/a0413-3.jpg'], collections: ['hoa-bo'],
    desc: 'Bó hồng phấn dáng tròn, gói giấy nhăn hồng, thắt nơ lụa kem lớn và ruy băng hồng đào.',
    variants: [{ title: 'Tiêu chuẩn', price: 0 }] });
  DATA.products.unshift({ handle: 'gio-hoa-hong-vang-no-lua', title: 'Giỏ Hoa Hồng Vàng Nơ Lụa A0414', price: 0, compare: 0, type: 'Hoa giỏ', tags: [],
    images: ['/img/a0414-1.jpg', '/img/a0414-2.jpg', '/img/a0414-1.jpg'], collections: ['hoa-gio'],
    desc: 'Giỏ mây cắm hồng vàng, điểm cúc họa mi, hoa ren trắng và lá xanh, thắt nơ lụa kem.',
    variants: [{ title: 'Tiêu chuẩn', price: 0 }] });
  DATA.products.unshift({ handle: 'bo-hoa-cuc-tana-a0415', title: 'Bó Hoa Cúc Tana A0415', price: 0, compare: 0, type: 'Hoa bó', tags: [],
    images: ['/img/a0415-1.jpg', '/img/a0415-2.jpg', '/img/a0415-1.jpg'], collections: ['hoa-bo'],
    desc: 'Bó cúc tana trắng nhuỵ vàng, gói giấy kraft và vải bố kem, ruy băng hồng nhạt.',
    variants: [{ title: 'Tiêu chuẩn', price: 0 }] });
  DATA.products.unshift({ handle: 'gio-hoa-lan-vu-nu-ho-diep', title: 'Giỏ Hoa Lan Vũ Nữ Hồ Điệp Trắng A0416', price: 0, compare: 0, type: 'Hoa giỏ', tags: [],
    images: ['/img/a0416-1.jpg', '/img/a0416-1.jpg', '/img/a0416-1.jpg'], collections: ['hoa-gio'],
    desc: 'Giỏ cói cắm lan vũ nữ vàng và lan hồ điệp trắng, điểm lá bạch đàn và cỏ xanh.',
    variants: [{ title: 'Tiêu chuẩn', price: 0 }] });
  DATA.products.unshift({ handle: 'gio-hoa-cuc-tana', title: 'Giỏ Hoa Cúc Tana A0417', price: 0, compare: 0, type: 'Hoa giỏ', tags: [],
    images: ['/img/a0417-1.jpg', '/img/a0417-1.jpg', '/img/a0417-1.jpg'], collections: ['hoa-gio'],
    desc: 'Giỏ cói cắm cúc tana trắng nhuỵ vàng dáng tròn bồng, thắt ruy băng lụa trắng.',
    variants: [{ title: 'Tiêu chuẩn', price: 0 }] });
  const hg = DATA.collections.find(c => c.handle === 'hoa-gio'); if (hg) hg.count += 4;
  DATA.products.unshift({ handle: 'bo-hoa-tulip-hong-giay-trong', title: 'Bó Hoa Tulip Hồng Giấy Trong A0418', price: 0, compare: 0, type: 'Hoa bó', tags: [],
    images: ['/img/a0418-1.jpg', '/img/a0418-1.jpg', '/img/a0418-1.jpg'], collections: ['hoa-bo'],
    desc: 'Bó tulip hồng gói giấy trong suốt ánh hồng, lót giấy nhăn và thắt nơ voan hồng.',
    variants: [{ title: 'Tiêu chuẩn', price: 0 }] });
  DATA.products.unshift({ handle: 'bo-hoa-hong-do-hong-phan', title: 'Bó Hoa Hồng Đỏ Hồng Phấn A0419', price: 0, compare: 0, type: 'Hoa bó', tags: [],
    images: ['/img/a0419-1.jpg', '/img/a0419-2.jpg', '/img/a0419-1.jpg'], collections: ['hoa-bo'],
    desc: 'Bó hồng đỏ xen hồng phấn, gói giấy trắng mờ, thắt dây da đỏ.',
    variants: [{ title: 'Tiêu chuẩn', price: 0 }] });
  DATA.products.unshift({ handle: 'bo-hoa-hong-do-giay-den-luoi-vang', title: 'Bó Hoa Hồng Đỏ Giấy Đen Lưới Vàng A0420', price: 0, compare: 0, type: 'Hoa bó', tags: [],
    images: ['/img/a0420-1.jpg', '/img/a0420-1.jpg', '/img/a0420-1.jpg'], collections: ['hoa-bo'],
    desc: 'Bó hồng đỏ gói giấy đen và lưới sợi vàng, ruy băng đỏ.',
    variants: [{ title: 'Tiêu chuẩn', price: 0 }] });
  DATA.products.unshift({ handle: 'bo-hoa-hong-do-giay-den', title: 'Bó Hoa Hồng Đỏ Giấy Đen A0421', price: 0, compare: 0, type: 'Hoa bó', tags: [],
    images: ['/img/a0421-1.jpg', '/img/a0421-1.jpg', '/img/a0421-1.jpg'], collections: ['hoa-bo'],
    desc: 'Bó hồng đỏ gói giấy đen, thắt dây da đỏ và nơ lụa đỏ.',
    variants: [{ title: 'Tiêu chuẩn', price: 0 }] });
  DATA.products.unshift({ handle: 'bo-hoa-cam-tu-cau-cat-tuong-trang', title: 'Bó Hoa Cẩm Tú Cầu Cát Tường Trắng A0422', price: 0, compare: 0, type: 'Hoa bó', tags: [],
    images: ['/img/a0422-1.jpg', '/img/a0422-2.jpg', '/img/a0422-1.jpg'], collections: ['hoa-bo'],
    desc: 'Bó cẩm tú cầu xanh ngọc, cát tường trắng và cỏ xanh, gói giấy xanh mint, nơ lụa xanh dương.',
    variants: [{ title: 'Tiêu chuẩn', price: 0 }] });
  DATA.products.unshift({ handle: 'bo-hoa-hong-kem-phan', title: 'Bó Hoa Hồng Kem Phấn A0423', price: 0, compare: 0, type: 'Hoa bó', tags: [],
    images: ['/img/a0423-1.jpg', '/img/a0423-2.jpg', '/img/a0423-3.jpg'], collections: ['hoa-bo'],
    desc: 'Bó hồng kem và hồng phấn dáng tròn, điểm cỏ xanh, gói giấy hồng đào, nơ lụa kem.',
    variants: [{ title: 'Tiêu chuẩn', price: 0 }] });
  DATA.products.unshift({ handle: 'bo-hoa-tulip-hong-nhat', title: 'Bó Hoa Tulip Hồng Nhạt A0424', price: 0, compare: 0, type: 'Hoa bó', tags: [],
    images: ['/img/a0424-1.jpg', '/img/a0424-2.jpg', '/img/a0424-1.jpg'], collections: ['hoa-bo'],
    desc: 'Bó tulip hồng nhạt, điểm cỏ mây và chuỗi ngọc trai, gói giấy hồng phấn, ruy băng "Just for you".',
    variants: [{ title: 'Tiêu chuẩn', price: 0 }] });
  if (hb) hb.count += 7;
  DATA.products.forEach((p, i) => {
    Object.assign(p, cleanTitle(p.title));
    p.i = i;
    p.type = (p.type || 'Khác').normalize('NFC');
    p.desc = cleanDesc(p.desc);
    p.variants = (p.variants && p.variants.length ? p.variants : [{ title: 'Tiêu chuẩn', price: p.price }])
      .map(v => ({ title: v.title.replace(/^Default Title\s*\/\s*/, '').replace(/^Default Title$/, 'Tiêu chuẩn'), price: v.price, compare: v.compare }));
    p.off = p.compare > p.price ? Math.round((1 - p.price / p.compare) * 100) : 0;
    // sizes run small → large, and a larger size never costs less than a smaller one (fixes swapped prices)
    const rk = t => /^(nhỏ|mini)/i.test(t) ? 0 : /^vừa/i.test(t) ? 1 : /^(to|lớn)/i.test(t) ? 2 : -1;
    if (p.variants.length > 1 && p.variants.every(x => rk(x.title) >= 0 && x.price > 0)) {
      const pr = p.variants.map(x => ({ price: x.price, compare: x.compare })).sort((a, b) => a.price - b.price);
      p.variants.sort((a, b) => rk(a.title) - rk(b.title)).forEach((x, i) => Object.assign(x, pr[i]));
    }
    const f = fx[p.handle]; if (f) { if (f.name) p.name = f.name; if (f.desc) p.desc = f.desc; if (f.type) p.type = f.type; if (f.images) p.images = f.images; }
  });
  return DATA;
}
// search titles + a short intro for each collection page (also baked into the static pages)
const COLL_SEO = {
  all: { t: 'Tất cả mẫu hoa tươi – Shop hoa Tân Bình, TP.HCM', d: 'Gần 300 mẫu bó hoa, giỏ hoa, hộp hoa và hoa khai trương cắm tay tại Arch Flowers. Nhận đặt hoa theo mẫu, giao tận nơi TP.HCM.',
    x: ['Arch Flowers là tiệm hoa tươi tại Lô B Chung cư Bàu Cát 2, Phường Bảy Hiền (Tân Bình cũ). Tất cả mẫu hoa ở đây đều do florist của shop cắm tay trong ngày: bó hoa sinh nhật, kỷ niệm, giỏ hoa chúc mừng, hộp hoa sang trọng và hoa khai trương cho doanh nghiệp.', 'Bạn có thể lọc theo mức giá, theo dịp hoặc loại hoa, hoặc gửi ảnh mẫu qua Zalo để shop cắm theo yêu cầu. Giao hoa từ 08:00 đến 18:00 mỗi ngày khắp TP.HCM, ngày lễ có thêm khung 18:00 – 20:00, freeship bán kính 1km quanh cửa hàng.'] },
  'qua-20-10': { t: 'Hoa 20/10 đẹp, cắm tay – Giao tận nơi TP.HCM', d: 'Hoa 20/10 cắm tay tại Arch Flowers Tân Bình: bó hoa, giỏ hoa, hộp hoa cho Ngày Phụ nữ Việt Nam. Chọn ngày và khung giờ giao, thiệp viết tay miễn phí.',
    x: ['Ngày Phụ nữ Việt Nam 20/10 là dịp gửi lời cảm ơn và yêu thương bằng hoa. Arch Flowers chuẩn bị các mẫu hoa 20/10 từ bó hoa nhỏ xinh đến giỏ hoa, hộp hoa sang trọng, cắm tay bằng hoa tươi trong ngày.', 'Bạn chọn ngày và khung giờ giao ngay trên trang sản phẩm; ngày 20/10 có thêm khung 18:00 – 20:00. Mỗi đơn kèm thiệp viết tay miễn phí. Đặt hoa cho công ty số lượng nhiều, nhắn Zalo 0384 790 349 để shop báo giá.'] },
  'hoa-sinh-nhat': { t: 'Hoa sinh nhật đẹp – Giao hoa sinh nhật Tân Bình, TP.HCM', d: 'Bó hoa, giỏ hoa, hộp hoa sinh nhật cắm tay tại Arch Flowers. Giao đúng khung giờ, thiệp viết tay miễn phí, nhận đặt hoa theo mẫu.',
    x: ['Hoa sinh nhật tại Arch Flowers được cắm tay theo tông màu bạn chọn: hồng pastel dịu dàng, đỏ nồng nhiệt hay trắng tinh khôi.', 'Shop giao hoa sinh nhật khắp TP.HCM, đặc biệt nhanh với khu vực Tân Bình, Phú Nhuận, Bàu Cát. Ghi lời chúc để florist viết tay lên thiệp, hoặc gửi ảnh mẫu qua Zalo để shop cắm theo ý bạn.'] },
  'hoa-khai-truong': { t: 'Hoa khai trương, giỏ hoa chúc mừng – Giao tận nơi TP.HCM', d: 'Giỏ hoa, bình hoa khai trương và chúc mừng doanh nghiệp tại Arch Flowers Tân Bình. Ghi băng rôn/thiệp theo yêu cầu, giao đúng giờ khai trương.',
    x: ['Hoa khai trương mang lời chúc hồng phát, thuận lợi cho cửa hàng, văn phòng hay công ty mới. Arch Flowers thiết kế giỏ hoa và bình hoa chúc mừng với tông màu tươi sáng, sang trọng, phù hợp đặt ở sảnh hoặc quầy lễ tân.', 'Bạn ghi nội dung băng rôn hoặc thiệp (tên người/công ty tặng và lời chúc) ngay khi đặt, shop xác nhận lại trước khi giao. Cần thiết kế riêng theo ngân sách hoặc đặt nhiều giỏ, nhắn Zalo 0384 790 349.'] },
  'hoa-bo': { t: 'Bó hoa tươi đẹp – Hoa hồng, tulip, baby | Shop hoa Tân Bình', d: 'Bó hoa hồng, tulip, hoa baby và hoa mix cắm tay tại Arch Flowers. Giao tận nơi TP.HCM, nhận gói theo mẫu.',
    x: ['Bó hoa là món quà dễ tặng nhất cho mọi dịp: sinh nhật, kỷ niệm, tỏ tình hay cảm ơn. Arch Flowers có bó hoa hồng, tulip, hoa baby, cúc tana và hoa mix theo mùa, gói giấy tinh tế, thắt nơ thủ công.', 'Hầu hết mẫu có size vừa và size to; giá hiển thị theo từng size. Muốn đổi màu giấy gói hoặc thêm bớt hoa, gửi ảnh mẫu qua Zalo để florist tư vấn.'] },
  'hoa-gio': { t: 'Giỏ hoa tươi sang trọng – Giỏ hoa chúc mừng TP.HCM', d: 'Giỏ hoa tươi cắm tay tại Arch Flowers Tân Bình: giỏ hoa sinh nhật, chúc mừng, kỷ niệm. Giao tận nơi TP.HCM.',
    x: ['Giỏ hoa đứng dáng, bền và đầy đặn, hợp để chúc mừng sinh nhật, kỷ niệm, lễ tết hoặc sự kiện. Mỗi giỏ được florist Arch Flowers cắm tay với hoa tươi trong ngày, có mút giữ nước để hoa tươi lâu.', 'Chọn size, ngày và khung giờ giao trên trang sản phẩm. Shop giao khắp TP.HCM và freeship bán kính 1km quanh cửa hàng ở Bàu Cát, Tân Bình.'] },
  'hoa-hop': { t: 'Hộp hoa tươi cao cấp – Hộp hoa hồng, tulip TP.HCM', d: 'Hộp hoa tươi sang trọng tại Arch Flowers Tân Bình: hộp hoa hồng, tulip, hoa mix tặng sinh nhật, kỷ niệm, 20/10. Giao tận nơi TP.HCM.',
    x: ['Hộp hoa gọn gàng, sang trọng, đặt được trên bàn làm việc hay kệ trang trí mà không cần bình. Arch Flowers có hộp hoa hồng, tulip và hoa mix nhiều tông màu.', 'Hoa được cắm trên mút giữ nước, chỉ cần tưới nhẹ mỗi ngày. Kèm thiệp viết tay miễn phí, giao đúng khung giờ bạn chọn.'] },
  'hoa-cuoi': { t: 'Hoa cưới cầm tay cô dâu – Arch Flowers TP.HCM', d: 'Hoa cưới cầm tay cho cô dâu, hoa cài áo và hoa trang trí tiệc cưới tại Arch Flowers Tân Bình. Thiết kế theo concept riêng.',
    x: ['Hoa cưới cầm tay được thiết kế theo váy cưới và concept của cô dâu: tinh khôi với hoa trắng, lãng mạn với tông hồng, hay hiện đại với hoa nhập khẩu.', 'Nên đặt hoa cưới trước vài ngày để shop chuẩn bị hoa. Gửi ảnh váy cưới hoặc mẫu bạn thích qua Zalo 0384 790 349 để florist tư vấn.'] },
  'bo-suu-tap-moi': { t: 'Mẫu hoa mới – Bộ sưu tập mới tại Arch Flowers', d: 'Những mẫu hoa mới nhất do florist Arch Flowers thiết kế: bó hoa, giỏ hoa, hộp hoa theo mùa.',
    x: ['Bộ sưu tập mới cập nhật những thiết kế gần đây nhất của Arch Flowers, theo mùa hoa và xu hướng gói hoa hiện tại.', 'Mẫu chưa có giá sẵn được ghi “Liên hệ”: bấm Hỏi giá qua Zalo, shop báo giá và tư vấn size phù hợp.'] }
};
const collTitle = h => `${COLL_SEO[h]?.t || collName(h) + ' – Hoa tươi cao cấp TP.HCM'} | Arch Flowers`;
const collName = h => VIRTUAL[h]?.name || DATA.collections.find(c => c.handle === h)?.name || 'Tất cả hoa';
function inColl(p, h) {
  if (!h || h === 'all') return true;
  if (VIRTUAL[h]) return p.collections.some(c => VIRTUAL[h].from.includes(c));
  return p.collections.includes(h);
}
// design shown on each collection's home tile: it is also listed first inside that collection
const PIN = { 'hoa-sinh-nhat': 'gio-hoa-tulip-hong-trang', 'hoa-bo': 'bo-hoa-tulip-do-trang', 'hoa-cuoi': 'hoa-cuoi-hc001', 'hoa-khai-truong': 'bo-hoa-chu-c-mu-ng-nga-y-nha-gia-o-20-11-hong-cam-juliet-bh039', 'hoa-hop': 'gio-hoa-tulip-trang-sang-trong-gh018', 'hoa-gio': 'gio-hoa-chu-c-mu-ng-khai-truong-sinh-nha-t-gh021' };
const pinFirst = h => (a, b) => (b.handle === PIN[h]) - (a.handle === PIN[h]);
const byColl = (h, n) => DATA.products.filter(p => inColl(p, h)).sort((a, b) => (!a.price - !b.price) || a.i - b.i).slice(0, n);
let FROM = ''; // collection being browsed, remembered for the product page breadcrumb (not put in the URL)
const pUrl = p => `products/${encodeURIComponent(p.handle)}/`;
const cUrl = (h, q = '') => `collections/${encodeURIComponent(h)}/${q ? '?' + q : ''}`;
const SITE = 'https://archflowers.com/';
const pAbs = p => new URL(BASE + pUrl(p), location.href).href;
const zAsk = p => `Chào shop, mình muốn hỏi mẫu ${p.name}${p.code ? ' (' + p.code + ')' : ''}: ${pAbs(p)}`;

function cardHTML(p, { quick = true, eager = false, band = null } = {}) {
  const bv = band && p.variants.find(x => x.price >= band.min && x.price <= band.max);
  const bp = bv && bv !== p.variants[0] ? bv : null; // a bigger size is what matched the filter
  return `<article class="card">
    <div class="ph-wrap"><a href="${pUrl(p)}" tabindex="-1" aria-hidden="true">${img(p.images[0], p.name, '', eager)}${p.images[1] && p.images[1] !== p.images[0] ? `<img class="alt" alt="" width="800" height="1000" data-src="${esc(opt(p.images[1], 800) || p.images[1])}" data-o="${esc(p.images[1])}">` : ''}</a>
      ${p.off >= 10 ? `<span class="off">−${p.off}%</span>` : ''}
      ${quick && p.price > 0 ? `<button class="quick" data-add="${esc(p.handle)}" aria-label="Chọn size và đặt ${esc(p.name)}">${ICON.bag}<span>Chọn & đặt</span></button>` : quick ? `<a class="quick qz" href="${ZALO}" target="_blank" rel="noopener" data-zmsg="${esc(zAsk(p))}" aria-label="Hỏi giá ${esc(p.name)} qua Zalo">Zalo<span>Hỏi giá qua Zalo</span></a>` : ''}</div>
    <a class="card-t" href="${pUrl(p)}"><h3>${esc(p.name)}</h3></a>
    <div class="card-m"><div class="price">${bp ? `<b>${fmt(bp.price)}</b><small>Size ${esc(bp.title)}</small>` : `<b>${p.variants.filter(x => x.price > 0).length > 1 ? '<i>Từ </i>' : ''}${pfmt(p.price)}</b>${p.compare > p.price ? `<s>${fmt(p.compare)}</s>` : ''}`}</div>${p.code ? `<span class="code">${esc(p.code)}</span>` : ''}</div>
  </article>`;
}

/* ---------- layout chrome ---------- */
function chrome() {
  const nav = [['collections/qua-20-10/', 'Quà 20/10'], ['collections/all/', 'Bộ sưu tập'], ['collections/hoa-khai-truong/', 'Khai trương'], ['collections/hoa-sinh-nhat/', 'Sinh nhật'], ['index.html#concierge', 'Đặt theo yêu cầu']];
  const navA = nav.map(([h, t]) => `<a href="${h}">${t}</a>`).join('');
  // the header is already in the HTML of every page (no layout jump); insert it only if a page lacks it
  if (!$('.hdr')) document.body.insertAdjacentHTML('afterbegin', `
  <a class="sr" href="#main">Bỏ qua đến nội dung</a>
  <header class="hdr"><div class="wrap">
    <button class="ico menu-btn" aria-label="Mở menu" aria-expanded="false" data-menu>${ICON.menu}</button>
    <a class="logo" href="index.html" aria-label="Arch Flowers – Trang chủ"><img src="/img/logo-gold.webp" alt="Arch Flowers" width="290" height="240"></a>
    <nav class="nav" aria-label="Chính">${navA}</nav>
    <div class="hdr-act">
      <a class="nav-r" href="index.html#concierge">Đặt theo yêu cầu</a>
      <a class="ico tel" href="tel:${PHONE}" aria-label="Gọi ${PHONE_TXT}">${ICON.phone}<span class="tel-t" aria-hidden="true">${PHONE_TXT}</span></a>
      <button class="ico" aria-label="Giỏ hàng" data-cart>${ICON.bag}<span class="badge" data-count></span></button>
    </div></div></header>`);
  document.body.insertAdjacentHTML('afterbegin', `
  <nav class="mnav" aria-label="Menu di động" id="mnav"><button class="ico" aria-label="Đóng menu" data-menu-close>${ICON.close}</button>${navA}
    <a href="${ZALO}" target="_blank" rel="noopener">Nhắn Zalo cho shop</a><a href="tel:${PHONE}">Gọi ${PHONE_TXT}</a><a href="index.html#delivery">Khu vực & phí giao hàng</a><a href="pages/chinh-sach-doi-tra/">Chính sách đổi trả</a><a href="${MAP}" target="_blank" rel="noopener">Địa chỉ cửa hàng<small>${ADDR}</small></a></nav>`);
  $$('a[href="#main"]').forEach(a => a.href = location.pathname + location.search + '#main'); // <base> would send in-page anchors to the home page
  document.body.insertAdjacentHTML('beforeend', `
  <footer class="ftr"><div class="wrap">
    <div class="ftr-top"><p class="ftr-say">Hoa tươi cắm tay, <em>trao gửi trọn vẹn.</em></p>
      <div class="ftr-cta"><a class="btn cv-zalo" href="${ZALO}" target="_blank" rel="noopener">Nhắn Zalo</a><a class="btn ghost cv-call" href="tel:${PHONE}">Gọi ${PHONE_TXT}</a></div></div>
    <div class="ftr-grid">
      <div><a class="logo logo-ftr" href="index.html"><img src="/img/logo-gold.webp" alt="Arch Flowers" width="290" height="240" loading="lazy"></a>
        <p style="margin-top:18px;max-width:36ch">Hoa tươi cao cấp & quà tặng doanh nghiệp tại TP. Hồ Chí Minh. Nhận đặt hoa theo mẫu — freeship bán kính 1km.</p>
        <div class="store"><p class="ft-h">Địa chỉ cửa hàng</p><p>${ADDR}</p><p>Hotline/Zalo: <a href="tel:${PHONE}">${PHONE_TXT}</a></p><a class="btn ghost cv-call" href="${MAP}" target="_blank" rel="noopener">Chỉ đường</a></div></div>
      <div><p class="ft-h">Mua sắm</p><ul>${DATA ? DATA.collections.map(c => `<li><a href="${cUrl(c.handle)}">${esc(c.name)}</a></li>`).join('') : ''}</ul></div>
      <div><p class="ft-h">Hỗ trợ</p><ul><li><a href="index.html#delivery">Khu vực giao hàng</a></li><li><a href="index.html#concierge">Đặt hoa theo yêu cầu</a></li><li><a href="pages/chinh-sach-doi-tra/">Chính sách đổi trả</a></li><li><a href="pages/chinh-sach-bao-mat/">Chính sách bảo mật</a></li><li><a href="${ZALO}" target="_blank" rel="noopener">Chat Zalo</a></li></ul></div>
      <div><p class="ft-h">Thanh toán</p><div class="pay"><span>COD</span><span>Chuyển khoản</span></div></div>
    </div>
    <div class="ftr-bot"><span>© 2026 Arch Flowers. Thiết kế bởi Arch Flowers.</span><span>5.0★ · 84 đánh giá Google</span></div>
  </div></footer>
  <div class="fab"><a class="z" href="${ZALO}" target="_blank" rel="noopener" aria-label="Chat Zalo">Zalo</a><a class="c" href="tel:${PHONE}" aria-label="Gọi hotline">${ICON.phone}</a></div>
  <div class="scrim" data-close></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-label="Giỏ hàng" aria-hidden="true" id="drawer">
    <header><p class="d-title">Giỏ hoa của bạn</p><button class="ico" aria-label="Đóng giỏ hàng" data-close>${ICON.close}</button></header>
    <div class="d-items" id="dItems"></div>
    <div class="d-foot" id="dFoot"></div>
  </aside><div class="zs" id="zs" hidden></div><div class="lb" id="lb" hidden><button class="ico" aria-label="Đóng ảnh" data-lb-close>${ICON.close}</button><img alt=""><button class="lb-nav p" data-lb="-1" aria-label="Ảnh trước">‹</button><button class="lb-nav n" data-lb="1" aria-label="Ảnh sau">›</button></div><div class="toast" role="status" aria-live="polite" id="toast"></div>`);

  const mnav = $('#mnav');
  const setMenu = o => { mnav.classList.toggle('open', o); $('[data-menu]').setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; };
  $('[data-menu]').onclick = () => setMenu(true);
  $('[data-menu-close]').onclick = () => setMenu(false);
  $$('a', mnav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  $('[data-cart]').onclick = openCart;
  $$('[data-close]').forEach(b => b.onclick = closeCart);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#zs').hidden) return closeZs(); closeCart(); setMenu(false); } });
  // Zalo cannot prefill a message: copy the product/order details and walk the shopper through pasting them
  document.addEventListener('click', e => {
    const z = e.target.closest('[data-zmsg]');
    if (z) { e.preventDefault(); zSheet({ k: 'ask:' + (z.dataset.zt || ''), text: z.dataset.zmsg, title: z.dataset.zt || 'Nhắn shop qua Zalo' }); }
  });
  $('#lb').onclick = e => { const b = e.target.closest('[data-lb]'); if (b) return stepLb(+b.dataset.lb); if (e.target.tagName !== 'IMG') closeLb(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLb(); if (!$('#lb').hidden && /Arrow(Left|Right)/.test(e.key)) stepLb(e.key === 'ArrowLeft' ? -1 : 1); });
  let lx = 0; $('#lb').addEventListener('touchstart', e => lx = e.touches[0].clientX, { passive: true }); $('#lb').addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - lx; if (Math.abs(dx) > 50) stepLb(dx < 0 ? 1 : -1); });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    const p = DATA.products.find(x => x.handle === b.dataset.add);
    if (p) location.href = pUrl(p); // size, date, slot and address are chosen on the product page
  });
  // second (hover) photo on cards is fetched only when a mouse actually hovers the card
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const a = e.target.closest('.card')?.querySelector('img.alt[data-src]'); if (!a) return;
    a.onerror = () => imgErr(a); a.src = a.dataset.src; a.removeAttribute('data-src');
  });
  const hdr = $('.hdr');
  const onScroll = () => hdr.classList.toggle('solid', window.scrollY > 40);
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="tel:"], a[href^="https://zalo.me"]');
    if (a && !a.closest('#zs')) track(a.href.startsWith('tel:') ? 'call' : 'zalo_chat');
  });
  renderCart();
}

/* ---------- cart (localStorage, guarded) ---------- */
const CK = 'archC_cart', BK = 'archC_buyer';
function getBuyer() { try { return { name: '', phone: '', addr: '', to: '', note: '', ...JSON.parse(localStorage.getItem(BK)) }; } catch (e) { return { name: '', phone: '', addr: '', to: '', note: '', ...(window.__buyer || {}) }; } }
function setBuyer(b) { window.__buyer = b; try { localStorage.setItem(BK, JSON.stringify(b)); } catch (e) { } }
function getCart() { try { return JSON.parse(localStorage.getItem(CK)) || []; } catch (e) { return window.__cart || []; } }
function setCart(c) { window.__cart = c; try { localStorage.setItem(CK, JSON.stringify(c)); } catch (e) { } renderCart(); }
function addToCart(item) {
  if (!(item.price > 0)) return;
  track('cart_add', item.h);
  const c = getCart();
  const k = i => [i.h, i.v, i.date, i.slot, i.district, i.addr, i.to, i.msg].join('|');
  const ex = c.find(i => k(i) === k(item));
  if (ex) { ex.qty += item.qty || 1; Object.assign(ex, item, { qty: ex.qty }); } else c.push({ qty: 1, ...item });
  setCart(c);
}
function renderCart() {
  const c = getCart(), n = c.reduce((s, i) => s + i.qty, 0);
  $$('[data-count]').forEach(b => { b.textContent = n || ''; b.dataset.n = n; });
  const box = $('#dItems'); if (!box || !DATA) return;
  if (!c.length) { box.innerHTML = `<div class="d-empty"><p>Giỏ hoa đang trống.</p><a class="btn ghost" href="collections/all/">Khám phá bộ sưu tập</a></div>`; $('#dFoot').innerHTML = ''; return; }
  box.innerHTML = c.map((i, k) => {
    const p = DATA.products.find(x => x.handle === i.h) || { name: i.h, images: [] };
    return `<div class="d-item">${img(p.images[0], p.name)}<div>
      <h3>${esc(p.name)}</h3><small>Size: ${esc(i.v)}${i.date ? ' · Giao ' + esc(i.date.split('-').reverse().join('/')) : ''}${i.slot ? ' · ' + esc(i.slot) : ''}${i.addr || i.district ? '<br>Giao tới: ' + esc([i.addr, i.district].filter(Boolean).join(', ')) : ''}${i.to ? '<br>Người nhận: ' + esc(i.to) : ''}${i.msg ? '<br>Lời thiệp: “' + esc(i.msg) + '”' : ''}</small>
      <div class="d-row"><div class="qty"><button data-q="${k}" data-d="-1" aria-label="Giảm">−</button><input type="number" inputmode="numeric" min="1" max="999" value="${i.qty}" data-qi="${k}" aria-label="Số lượng"><button data-q="${k}" data-d="1" aria-label="Tăng">+</button></div>
      <b>${fmt(i.price * i.qty)}</b></div><button class="rm" data-rm="${k}">Xóa</button></div></div>`;
  }).join('');
  const total = c.reduce((s, i) => s + i.price * i.qty, 0);
  const C = getBuyer();
  $('#dFoot').innerHTML = `<div class="d-total"><span>Tạm tính</span><span>${fmt(total)}</span></div>
    <small>Phí giao theo khu vực, shop báo lại khi xác nhận. Thanh toán COD / chuyển khoản.</small>
    <form class="d-form" id="dForm" novalidate>
      <label>Họ tên người đặt (không bắt buộc)<input class="inp" id="bName" autocomplete="name" value="${esc(C.name)}"></label>
      <label>Số điện thoại (không bắt buộc)<input class="inp" id="bPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="Shop thấy Zalo của bạn khi bạn gửi đơn" value="${esc(C.phone)}"></label>
      <label>Ghi chú cho shop<textarea class="inp" id="bNote" rows="2" placeholder="Ví dụ: giao bất ngờ, đừng gọi trước người nhận · xuất hóa đơn công ty · đặt số lượng nhiều">${esc(C.note)}</textarea></label>
      ${getCart().reduce((s, i) => s + i.qty, 0) >= 10 ? '<small class="bulk">Đặt từ 10 sản phẩm: nhắn Zalo để shop báo giá tốt hơn.</small>' : ''}
      <button class="btn cv-main block" type="submit">Gửi đơn qua Zalo · ${fmt(total)}</button>
      <small>Đơn được chép sẵn, bạn chỉ cần mở Zalo của shop, dán và gửi. Shop xác nhận và gửi ảnh, video hoa trước khi giao.</small>
    </form>`;
  const keep = () => setBuyer({ name: $('#bName').value.trim(), phone: $('#bPhone').value.trim(), note: $('#bNote').value.trim() });
  $$('#dForm input, #dForm textarea').forEach(i => i.oninput = keep);
  $('#dForm').onsubmit = e => {
    e.preventDefault();
    const b = { name: $('#bName').value.trim(), phone: $('#bPhone').value.trim(), note: $('#bNote').value.trim() };
    setBuyer(b);
    const digits = b.phone.replace(/[^\d+]/g, '').replace(/^\+?84/, '0');
    if (digits && !/^0\d{9}$/.test(digits)) { fieldErr($('#bPhone'), 'Số điện thoại cần 10 số (ví dụ 0901 234 567), hoặc để trống'); return; }
    const lines = getCart().map((i, k) => { const p = DATA.products.find(x => x.handle === i.h) || { name: i.h, images: [] };
      return `${k + 1}. ${p.name}${p.code ? ' (' + p.code + ')' : ''}\n   Size: ${i.v} × ${i.qty} = ${fmt(i.price * i.qty)}` +
        (i.date ? `\n   Giao: ${i.date.split('-').reverse().join('/')}${i.slot ? ', ' + i.slot : ''}` : '') + (i.addr || i.district ? `\n   Giao tới: ${[i.addr, i.district].filter(Boolean).join(', ')}` : '') + (i.to ? `\n   Người nhận: ${i.to}` : '') +
        (i.msg ? `\n   Lời thiệp: ${i.msg}` : '') + (p.handle ? `\n   ${pAbs(p)}` : ''); });
    const who = [b.name, digits].filter(Boolean).join(' – ');
    const text = `Chào Arch Flowers, mình muốn đặt:\n${lines.join('\n')}\nTạm tính: ${fmt(total)}${who ? '\nNgười đặt: ' + who : ''}${b.note ? '\nGhi chú: ' + b.note : ''}`;
    const n = getCart().reduce((s, i) => s + i.qty, 0), f = DATA.products.find(x => x.handle === getCart()[0].h);
    zSheet({ k: 'cart:' + n + ' sản phẩm', text, title: 'Gửi đơn qua Zalo', sum: zSum(f, `${n} sản phẩm · Tạm tính ${fmt(total)}`), onDone: () => { setCart([]); closeCart(); } });
  };
  $$('[data-q]', box).forEach(b => b.onclick = () => { const c = getCart(), it = c[b.dataset.q]; it.qty += +b.dataset.d; if (it.qty < 1) c.splice(b.dataset.q, 1); setCart(c); });
  $$('[data-qi]', box).forEach(n => n.onchange = () => { const c = getCart(), q = Math.max(1, Math.min(999, parseInt(n.value, 10) || 1)); c[n.dataset.qi].qty = q; setCart(c); });
  $$('[data-rm]', box).forEach(b => b.onclick = () => { const c = getCart(); c.splice(b.dataset.rm, 1); setCart(c); });
}
/* ---------- anonymous visit counter on the shop's own server (no cookies) ---------- */
function track(e, d = '') {
  if (/^\/proposals\//.test(location.pathname) || location.protocol !== 'https:' && location.hostname !== '127.0.0.1') return; // previews are not counted
  try { navigator.sendBeacon('/api/hit', JSON.stringify({ e, d, p: location.pathname, r: document.referrer, w: innerWidth })); } catch (x) { }
}
/* ---------- Zalo order sheet: copy → open Zalo → paste & send ---------- */
const zSum = (p, line) => p ? `<div class="zs-sum">${img(p.images[0], '', '', false, SIZES.thumb)}<div><b>${esc(p.name)}</b><small>${line}</small></div></div>` : '';
let zsBack = null;
function zSheet(o) {
  const z = $('#zs'), touch = matchMedia('(pointer:coarse)').matches;
  copyText(o.text);
  track('zalo_sheet', o.k || '');
  zsBack = document.activeElement;
  z.innerHTML = `<div class="zs-box" role="dialog" aria-modal="true" aria-labelledby="zsH">
    <button class="ico zs-x" type="button" data-zs-close aria-label="Đóng">${ICON.close}</button>
    <p class="zs-h" id="zsH">${esc(o.title || 'Gửi đơn qua Zalo')}</p>
    ${o.sum || ''}
    <ol class="zs-steps">
      <li class="ok"><b>Đã chép sẵn nội dung</b><span>Mẫu hoa, size, giờ giao và link ảnh mẫu.</span></li>
      <li><b>Mở Zalo của shop</b><span>Arch Flowers · ${PHONE_TXT}</span></li>
      <li><b>${touch ? 'Giữ ngón tay vào ô chat → Dán → Gửi' : 'Bấm vào ô chat → Ctrl+V (Mac: ⌘+V) → Gửi'}</b><span>Shop xác nhận và gửi ảnh, video hoa trước khi giao.</span></li>
    </ol>
    <div class="zs-go"><a class="btn cv-main block" href="${ZALO}" target="_blank" rel="noopener" data-zs-open>Mở Zalo & dán</a></div>
    <div class="zs-back" hidden><p>Bạn đã gửi tin nhắn cho shop trong Zalo chưa?</p>
      <div class="zs-pair"><button class="btn cv-main" type="button" data-zs-done>Đã gửi xong</button><a class="btn ghost" href="${ZALO}" target="_blank" rel="noopener" data-zs-open>Mở lại Zalo</a></div></div>
    <details class="zs-txt"><summary>Xem / chép lại nội dung</summary><textarea class="inp" rows="7" readonly aria-label="Nội dung gửi shop">${esc(o.text)}</textarea><button class="btn ghost block" type="button" data-zs-copy>Chép lại</button></details>
    <p class="zs-alt">Không dùng Zalo? Gọi <a href="tel:${PHONE}">${PHONE_TXT}</a> – shop nhận đơn qua điện thoại.</p>
  </div>`;
  z.hidden = false; document.body.classList.add('zs-on');
  requestAnimationFrame(() => z.classList.add('on'));
  z.onclick = e => {
    if (e.target === z || e.target.closest('[data-zs-close]')) return closeZs();
    if (e.target.closest('[data-zs-open]')) { copyText(o.text); track('zalo_open', o.k || ''); setTimeout(() => { $('.zs-go', z).hidden = true; $('.zs-back', z).hidden = false; }, 800); }
    if (e.target.closest('[data-zs-copy]')) { const t = $('textarea', z); t.focus(); t.select(); copyText(o.text); toast('Đã chép lại – dán vào ô chat Zalo'); }
    if (e.target.closest('[data-zs-done]')) { track('zalo_done', o.k || ''); closeZs(); o.onDone && o.onDone(); toast('Cảm ơn bạn! Shop sẽ trả lời và xác nhận đơn qua Zalo.'); }
  };
  $('[data-zs-open]', z).focus();
}
function closeZs() { const z = $('#zs'); z.classList.remove('on'); z.hidden = true; z.innerHTML = ''; document.body.classList.remove('zs-on'); zsBack && zsBack.focus && zsBack.focus(); }
function openCart() { $('#drawer').classList.add('on'); $('#drawer').setAttribute('aria-hidden', 'false'); $('.scrim').classList.add('on'); document.body.style.overflow = 'hidden'; $('#drawer .ico').focus(); }
function closeCart() { const d = $('#drawer'); if (!d) return; d.classList.remove('on'); d.setAttribute('aria-hidden', 'true'); $('.scrim').classList.remove('on'); document.body.style.overflow = ''; }
function copyText(t) {
  try { navigator.clipboard.writeText(t).catch(() => copyOld(t)); } catch (e) { copyOld(t); }
}
function copyOld(t) { const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) { } a.remove(); }
let LB = [], LBi = 0;
function stepLb(d) { if (!LB.length) return; LBi = (LBi + d + LB.length) % LB.length; $('#lb img').src = LB[LBi]; }
function openLb(src, list = [src]) { LB = list; LBi = Math.max(0, list.indexOf(src)); const l = $('#lb'); l.classList.toggle('one', list.length < 2); l.querySelector('img').src = src; l.hidden = false; document.body.style.overflow = 'hidden'; }
function closeLb() { const l = $('#lb'); if (!l || l.hidden) return; l.hidden = true; document.body.style.overflow = ''; }
function fieldErr(el, msg) {
  el.classList.add('err'); el.setAttribute('aria-invalid', 'true');
  let n = el.parentElement.querySelector('.ferr'); if (!n) { n = document.createElement('small'); n.className = 'ferr'; el.insertAdjacentElement('afterend', n); }
  n.textContent = msg; el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { el.classList.remove('err'); el.removeAttribute('aria-invalid'); n.remove(); }, { once: true });
  toast(msg);
}
let tT; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tT); tT = setTimeout(() => t.classList.remove('on'), m.length > 40 ? 6000 : 3000); }

/* ---------- reveal ---------- */
let io;
function reveal() {
  const els = $$('.rv:not(.in)');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { els.forEach(e => e.classList.add('in')); return; }
  io = io || new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach(e => io.observe(e));
}
const setMeta = (title, desc) => { document.title = title; let m = $('meta[name=description]'); if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); } m.content = desc; };
const ldJSON = o => { const s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(o); document.head.appendChild(s); };

const absU = u => new URL(u, SITE).href.replace(/\/proposals\/c(-draft)?\//, '/'); // public URLs live at the site root
function pMeta(p) {
  const priced = p.variants.filter(x => x.price > 0), lo = priced.length ? Math.min(...priced.map(x => x.price)) : 0;
  const d = p.desc ? p.desc.replace(/\s+/g, ' ') : `${p.name} cắm tay bởi florist Arch Flowers với hoa tươi trong ngày.`;
  let title = `${p.name}${p.code ? ' ' + p.code : ''} – ${lo ? (priced.length > 1 ? 'từ ' : '') + fmt(lo) : 'Liên hệ'} | Arch Flowers`;
  if (title.length > 65) title = `${p.name}${p.code ? ' ' + p.code : ''} | Arch Flowers`; // Google cuts titles around 60–65 characters
  return { title,
    desc: `${lo ? `${p.name} giá ${priced.length > 1 ? 'từ ' : ''}${fmt(lo)}. ` : ''}${d.slice(0, 120)}${d.length > 120 ? '…' : ''} Giao hoa TP.HCM, nhận đặt theo mẫu.`, lo };
}
function pLD(p) {
  const url = SITE + pUrl(p), priced = p.variants.filter(x => x.price > 0), coll = p.collections[0] || 'all';
  const offer = x => ({ '@type': 'Offer', price: x.price, priceCurrency: 'VND', availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition', url });
  const prod = { '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.code || p.handle, url, image: p.images.map(u => absU(opt(u, 1200) || u)), description: p.desc || p.name, brand: { '@type': 'Brand', name: 'Arch Flowers' }, category: p.type };
  // "Liên hệ" designs have no price yet: leave the offer out rather than publish 0đ
  if (priced.length === 1) prod.offers = offer(priced[0]);
  else if (priced.length > 1) prod.offers = { '@type': 'AggregateOffer', priceCurrency: 'VND', lowPrice: Math.min(...priced.map(x => x.price)), highPrice: Math.max(...priced.map(x => x.price)), offerCount: priced.length, availability: 'https://schema.org/InStock', url };
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Trang chủ', item: SITE }, { '@type': 'ListItem', position: 2, name: collName(coll), item: SITE + cUrl(coll) }, { '@type': 'ListItem', position: 3, name: p.name, item: url }] };
  return [prod, crumbs];
}

/* ---------- HOME ---------- */
function home() {
  const P = DATA.products;
  const hero = P.find(p => /hồng/i.test(p.name) && p.collections.includes('hoa-bo') && p.price >= 1000000) || P[0];
  if (!$('#heroBg img')) $('#heroBg').innerHTML = img(hero.images[0], hero.name, '', true, '(max-width:899px) 100vw, 64vw'); // normally already in index.html
  const hIm = $('#heroBg img'); if (hIm) $('.hero').style.setProperty('--hero-img', `url("${opt(hIm.dataset.o || '', 400) || hIm.src}")`); // small copy is enough for the blurred backdrop
  // hide floating Zalo/call buttons while the hero's own CTAs are on screen
  const hc = $('.hero-cta'), fab = $('.fab');
  if (hc && fab && 'IntersectionObserver' in window) new IntersectionObserver(([e]) => fab.classList.toggle('off', e.isIntersecting)).observe(hc);
  // countdown to 20/10/2026
  // counts down to 00:00 on 20/10 Vietnam time (17:00 UTC on 19/10), then hides itself
  const tick = () => { const v = Date.UTC(2026, 9, 19, 17) - Date.now(); if (v <= 0) { $('.countdown')?.remove(); return; } $('#cdD').textContent = Math.floor(v / 864e5); $('#cdH').textContent = Math.floor(v / 36e5) % 24; $('#cdM').textContent = Math.floor(v / 6e4) % 60; };
  tick(); setInterval(tick, 30000);

  const OCC_IMG = { 'hoa-sinh-nhat': 'img/tile-sinh-nhat-tulip.jpg', 'hoa-bo': 'img/tile-hoa-bo-tulip.jpg', 'hoa-cuoi': '/archflowers-export/images/1__1__e28fbc26f4d54afca6e43434d279756e.jpg' }; // owner-supplied photos
  const occ = [['hoa-sinh-nhat', 'Sinh nhật'], ['hoa-khai-truong', 'Khai trương'], ['hoa-hop', 'Hộp hoa'], ['hoa-bo', 'Hoa bó'], ['hoa-cuoi', 'Hoa cưới'], ['hoa-gio', 'Giỏ hoa']];
  $('#occ').innerHTML = occ.map(([h, n]) => {
    const p = DATA.products.find(x => x.handle === PIN[h] && inColl(x, h)) || byColl(h, 1)[0] || P[0];
    const c = DATA.collections.find(x => x.handle === h);
    return `<a class="tile rv" href="${cUrl(h)}"><div class="tile-i">${img(OCC_IMG[h] || p.images[0], n)}</div><div class="tile-t"><h3>${n}</h3><span>${c ? c.count + ' mẫu' : ''}</span></div></a>`;
  }).join('');

  const sig = P.filter(p => p.price >= 1500000).sort((a, b) => b.price - a.price);
  const f = sig[0] || P[0];
  $('#sigFeature').innerHTML = `<span class="num">01</span><a href="${pUrl(f)}"><figure>${img(f.images[0], f.name)}</figure></a>
    <div class="sig-copy"><span class="code" style="letter-spacing:.2em;font-size:11px;color:#6b5d58">MÃ ${esc(f.code)}</span><h3>${esc(f.name)}</h3>
    <p class="lead">Thiết kế đặt riêng cho những dịp trọng đại — chọn hoa nhập khẩu, cắm tay bởi florist trưởng.</p>
    <div class="price"><b>${pfmt(f.price)}</b>${f.compare > f.price ? `<s>${fmt(f.compare)}</s>` : ''}</div>
    <p style="margin-top:18px"><a class="btn ghost" href="${pUrl(f)}">Xem chi tiết</a></p></div>`;
  $('#sigGrid').innerHTML = sig.slice(1, 5).map(p => cardHTML(p)).join('');

  const best = [...byColl('hoa-bo', 3), ...byColl('hoa-hop', 2), ...byColl('hoa-gio', 2), ...byColl('hoa-sinh-nhat', 1)];
  $('#best').innerHTML = best.map(p => cardHTML(p)).join('');

  $('#bands').innerHTML = BANDS.map(b => `<a class="rv" href="collections/all/?p=${b.id}"><small>${P.filter(p => p.variants.some(x => x.price >= b.min && x.price <= b.max)).length} mẫu</small><b>${b.label}</b><span>Khám phá</span></a>`).join('');
  const sp = P.find(p => /khai trương/i.test(p.name) && p.images[1]) || P[2];
  $('#conciergeBg').innerHTML = img(sp.images[0], '');
  const st = P.find(p => p.collections.includes('hoa-cuoi')) || P[3];
  $('#storyImg').innerHTML = img(st.images[0], 'Florist Arch Flowers cắm hoa') + `<div class="small-img">${img((P[10] || st).images[0], 'Chi tiết bó hoa')}</div>`;
}

// the home sections are filled by JS, so an anchor link (#concierge, #delivery) must be re-applied afterwards
function fixHash() {
  const t = location.hash && document.getElementById(location.hash.slice(1)); if (!t) return;
  const go = () => t.scrollIntoView({ block: 'start', behavior: 'instant' });
  go(); requestAnimationFrame(go); addEventListener('load', go, { once: true }); setTimeout(go, 600);
}

/* ---------- COLLECTION ---------- */
function collection() {
  const q = new URLSearchParams(location.search);
  const S = { c: document.body.dataset.c || q.get('c') || 'all', type: q.get('t') || '', band: q.get('p') || '', sort: q.get('s') || 'featured', shown: 24 };
  const types = [...new Set(DATA.products.map(p => p.type))].filter(t => t !== 'Khác' && !/^kệ hoa/i.test(t));
  // the form (bó / giỏ / hộp) is filtered under "Loại hoa" only, so "Giỏ hoa" and "Hoa giỏ" no longer both appear
  const TYPE_LABEL = { 'Hoa giỏ': 'Giỏ hoa', 'Hoa hộp': 'Hộp hoa' };
  const FORM = ['hoa-bo', 'hoa-gio', 'hoa-hop'];
  const colls = [{ handle: 'all', name: 'Tất cả' }, { handle: 'qua-20-10', name: 'Quà 20/10' }, ...DATA.collections.filter(c => !FORM.includes(c.handle) || c.handle === S.c)];
  const chip = (g, v, l) => `<button class="chip" data-g="${g}" data-v="${esc(v)}" aria-pressed="false">${esc(l)}</button>`;
  $('#filters').innerHTML = `
    <div class="fgroup"><p class="fg-t">Mức giá</p><div class="chips">${chip('band', '', 'Mọi mức giá')}${BANDS_F.map(b => chip('band', b.id, b.label)).join('')}</div></div>
    <div class="fgroup"><p class="fg-t">Dịp & bộ sưu tập</p><div class="chips">${colls.map(c => chip('c', c.handle, c.name)).join('')}</div></div>
    <div class="fgroup"><p class="fg-t">Loại hoa</p><div class="chips">${chip('type', '', 'Mọi loại')}${types.filter(t => !colls.some(c => c.name === t)).map(t => chip('type', t, TYPE_LABEL[t] || t)).join('')}</div></div>`;
  $('#filters').insertAdjacentHTML('beforeend', '<button class="btn cv-main block f-done" type="button" id="fDone">Xem kết quả</button>');
  const closeF = () => { $('#filters').classList.remove('open'); $('#filterBtn').setAttribute('aria-expanded', 'false'); document.body.classList.remove('f-open'); };
  $('#filters').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; S[b.dataset.g] = b.dataset.v; S.shown = 24; run(); });
  $('#fDone').onclick = () => { closeF(); $('#grid').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $('#sort').value = S.sort;
  $('#sort').onchange = e => { S.sort = e.target.value; run(); };
  // phones/tablets: the filter opens as a full-screen sheet, wherever the page is scrolled
  $('#filterBtn').onclick = () => { const o = $('#filters').classList.toggle('open'); $('#filterBtn').setAttribute('aria-expanded', o); document.body.classList.toggle('f-open', o && innerWidth < 1024); };
  $('#filters').insertAdjacentHTML('afterbegin', '<div class="f-top"><b>Bộ lọc</b><button class="ico" type="button" aria-label="Đóng bộ lọc" id="fClose">' + ICON.close + '</button></div>');
  $('#fClose').onclick = closeF;
  $('#more').onclick = () => { S.shown += 24; run(false); };
  function run(scroll = true) {
    const band = bandOf(S.band);
    FROM = S.c; try { sessionStorage.setItem('archFrom', S.c); } catch (e) { }
    const inBand = p => !band || p.variants.some(x => x.price >= band.min && x.price <= band.max); // any size in the band counts
    let list = DATA.products.filter(p => inColl(p, S.c) && (!S.type || p.type === S.type) && inBand(p));
    // with a price band chosen, sort by the size price shown on the card
    const shown = p => (band && p.variants.find(x => x.price >= band.min && x.price <= band.max)?.price) || p.price;
    const sorts = { asc: (a, b) => shown(a) - shown(b), desc: (a, b) => shown(b) - shown(a), off: (a, b) => b.off - a.off, new: (a, b) => b.i - a.i, featured: (a, b) => pinFirst(S.c)(a, b) || (!S.band && (a.price < 500000) - (b.price < 500000)) || a.i - b.i }; // featured: designs under 500k go after the rest unless a price band is chosen
    // unpriced ("Liên hệ") designs always go after the priced ones
    list.sort((a, b) => (!a.price - !b.price) || (sorts[S.sort] || sorts.featured)(a, b));
    const name = collName(S.c);
    $('#cTitle').textContent = name;
    $('#cCount').textContent = `${list.length} thiết kế${band ? ' · ' + band.label : ''}${S.type ? ' · ' + S.type : ''}`;
    $('#fDone').textContent = `Xem ${list.length} mẫu`;
    $('#grid').innerHTML = list.length ? list.slice(0, S.shown).map((p, i) => cardHTML(p, { eager: i < 4, band })).join('') : '';
    $('#empty').hidden = !!list.length;
    $('#more').hidden = list.length <= S.shown;
    $$('.chip').forEach(b => b.setAttribute('aria-pressed', String((S[b.dataset.g] || '') === b.dataset.v)));
    $('#filterBtn').textContent = 'Bộ lọc' + ((S.type ? 1 : 0) + (S.band ? 1 : 0) ? ` (${(S.type ? 1 : 0) + (S.band ? 1 : 0)})` : '');
    const u = new URLSearchParams(); if (S.type) u.set('t', S.type); if (S.band) u.set('p', S.band); if (S.sort !== 'featured') u.set('s', S.sort);
    history.replaceState(null, '', BASE + cUrl(S.c, u.toString()));
    setMeta(collTitle(S.c), COLL_SEO[S.c]?.d || `${name} tại Arch Flowers: ${list.length} mẫu hoa tươi, nhận đặt hoa theo mẫu, giao tận nơi TP.HCM.`);
    const seo = COLL_SEO[S.c]; if ($('#cSeo')) $('#cSeo').innerHTML = seo ? `<h2>${esc(name)} tại Arch Flowers</h2>${seo.x.map(t => `<p>${esc(t)}</p>`).join('')}` : '';
    reveal();
    if (scroll === true && run.done && window.scrollY > 300) $('#main').scrollIntoView({ behavior: 'smooth' });
    run.done = true;
  }
  run();
}

/* ---------- PRODUCT ---------- */
function product() {
  const h = document.body.dataset.h || new URLSearchParams(location.search).get('h');
  const p = DATA.products.find(x => x.handle === h);
  if (!p) { document.head.insertAdjacentHTML('beforeend', '<meta name="robots" content="noindex">'); $('#pdp').innerHTML = `<div class="wrap" style="padding:100px var(--gut);text-align:center"><h1 class="h2">Không tìm thấy sản phẩm</h1><p class="lead" style="margin:20px auto">Mẫu hoa này có thể đã ngừng bán.</p><a class="btn" href="collections/all/">Xem bộ sưu tập</a></div>`; return; }
  let qc = new URLSearchParams(location.search).get('c'); try { qc = qc || sessionStorage.getItem('archFrom'); } catch (e) { }
  const coll = qc && qc !== 'all' && (VIRTUAL[qc] || DATA.collections.some(c => c.handle === qc)) && inColl(p, qc) ? qc : p.collections[0] || 'all';
  const ask = p.variants.every(x => !(x.price > 0)); // no price yet: the main action is asking on Zalo
  const isKT = p.collections.includes('hoa-khai-truong');
  let v = p.variants[0];
  // per-variant compare price when the variant has one, else the product's
  function cmpHTML(x) { const c = x.compare || (x === p.variants[0] ? p.compare : 0); return c > x.price ? `<s>${fmt(c)}</s><span class="tag">Tiết kiệm ${Math.round((1 - x.price / c) * 100)}%</span>` : ''; }
  const pm = pMeta(p); setMeta(pm.title, pm.desc);
  if (!$('script[type="application/ld+json"]')) pLD(p).forEach(ldJSON); // static product pages already carry it

  // shop time is Vietnam time (UTC+7), whatever the phone's time zone
  const nowVN = () => { const d = new Date(); return new Date(d.getTime() + (d.getTimezoneOffset() + 420) * 6e4); };
  const today = nowVN(); const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  // commune-level units of HCMC after the 1 July 2025 reorganisation (NQ 1685/NQ-UBTVQH15): 113 phường, 54 xã, 1 đặc khu
  const WARDS = ['An Đông', 'An Hội Đông', 'An Hội Tây', 'An Khánh', 'An Lạc', 'An Nhơn', 'An Phú', 'An Phú Đông', 'Bà Rịa', 'Bàn Cờ', 'Bảy Hiền', 'Bến Cát', 'Bến Thành', 'Bình Cơ', 'Bình Dương', 'Bình Đông', 'Bình Hòa', 'Bình Hưng Hòa', 'Bình Lợi Trung', 'Bình Phú', 'Bình Quới', 'Bình Tân', 'Bình Tây', 'Bình Thạnh', 'Bình Thới', 'Bình Tiên', 'Bình Trị Đông', 'Bình Trưng', 'Cát Lái', 'Cầu Kiệu', 'Cầu Ông Lãnh', 'Chánh Hiệp', 'Chánh Hưng', 'Chánh Phú Hòa', 'Chợ Lớn', 'Chợ Quán', 'Diên Hồng', 'Dĩ An', 'Đông Hòa', 'Đông Hưng Thuận', 'Đức Nhuận', 'Gia Định', 'Gò Vấp', 'Hạnh Thông', 'Hiệp Bình', 'Hòa Bình', 'Hòa Hưng', 'Hòa Lợi', 'Khánh Hội', 'Lái Thiêu', 'Linh Xuân', 'Long Bình', 'Long Hương', 'Long Nguyên', 'Long Phước', 'Long Trường', 'Minh Phụng', 'Nhiêu Lộc', 'Phú An', 'Phú Định', 'Phú Lâm', 'Phú Lợi', 'Phú Mỹ', 'Phú Nhuận', 'Phú Thạnh', 'Phú Thọ', 'Phú Thọ Hòa', 'Phú Thuận', 'Phước Long', 'Phước Thắng', 'Rạch Dừa', 'Sài Gòn', 'Tam Bình', 'Tam Long', 'Tam Thắng', 'Tăng Nhơn Phú', 'Tân Bình', 'Tân Định', 'Tân Đông Hiệp', 'Tân Hải', 'Tân Hiệp', 'Tân Hòa', 'Tân Hưng', 'Tân Khánh', 'Tân Mỹ', 'Tân Phú', 'Tân Phước', 'Tân Sơn', 'Tân Sơn Hòa', 'Tân Sơn Nhất', 'Tân Sơn Nhì', 'Tân Tạo', 'Tân Thành', 'Tân Thới Hiệp', 'Tân Thuận', 'Tân Uyên', 'Tây Nam', 'Tây Thạnh', 'Thạnh Mỹ Tây', 'Thông Tây Hội', 'Thới An', 'Thới Hòa', 'Thuận An', 'Thuận Giao', 'Thủ Dầu Một', 'Thủ Đức', 'Trung Mỹ Tây', 'Vĩnh Hội', 'Vĩnh Tân', 'Vũng Tàu', 'Vườn Lài', 'Xóm Chiếu', 'Xuân Hòa'];
  const COMMUNES = ['An Long', 'An Nhơn Tây', 'An Thới Đông', 'Bà Điểm', 'Bàu Bàng', 'Bàu Lâm', 'Bắc Tân Uyên', 'Bình Chánh', 'Bình Châu', 'Bình Giã', 'Bình Hưng', 'Bình Khánh', 'Bình Lợi', 'Bình Mỹ', 'Cần Giờ', 'Châu Đức', 'Châu Pha', 'Củ Chi', 'Dầu Tiếng', 'Đất Đỏ', 'Đông Thạnh', 'Hiệp Phước', 'Hóc Môn', 'Hòa Hiệp', 'Hòa Hội', 'Hồ Tràm', 'Hưng Long', 'Kim Long', 'Long Điền', 'Long Hải', 'Long Hòa', 'Long Sơn', 'Minh Thạnh', 'Ngãi Giao', 'Nghĩa Thành', 'Nhà Bè', 'Nhuận Đức', 'Phú Giáo', 'Phú Hòa Đông', 'Phước Hải', 'Phước Hòa', 'Phước Thành', 'Tân An Hội', 'Tân Nhựt', 'Tân Vĩnh Lộc', 'Thanh An', 'Thái Mỹ', 'Thạnh An', 'Thường Tân', 'Trừ Văn Thố', 'Vĩnh Lộc', 'Xuân Sơn', 'Xuân Thới Sơn', 'Xuyên Mộc'];
  const vsort = a => [...a].sort((x, y) => x.localeCompare(y, 'vi'));
  const areaOpts = `<optgroup label="Phường">${vsort(WARDS).map(w => `<option>Phường ${w}</option>`).join('')}</optgroup><optgroup label="Xã">${vsort(COMMUNES).map(w => `<option>Xã ${w}</option>`).join('')}</optgroup><optgroup label="Đặc khu"><option>Đặc khu Côn Đảo</option></optgroup>`;
  // 3-hour delivery windows; the 18:00 – 20:00 window is offered only on holidays
  const slots = ['08:00 – 11:00', '11:00 – 14:00', '15:00 – 18:00'];
  const HOLIDAYS = ['01-01', '02-14', '03-08', '04-30', '05-01', '09-02', '10-20', '11-20', '12-24', '12-25'];
  const HOLI_SLOT = '18:00 – 20:00 (ngày lễ)';
  // the holiday window is always listed, but only selectable when the chosen date is a holiday
  // same-day orders need at least 2 hours before the window starts (owner's rule)
  const LEAD = 2;
  const past = (ds, x) => { const n = nowVN(); if (ds !== iso(n)) return false; const start = +x.split('–')[0].trim().slice(0, 2); return n.getHours() + n.getMinutes() / 60 > start - LEAD; };
  const slotOpts = (ds, cur) => [...slots, HOLI_SLOT].map(x => `<option${(x === HOLI_SLOT && !HOLIDAYS.includes((ds || '').slice(5))) || past(ds, x) ? ' disabled' : ''}${x === cur ? ' selected' : ''}>${x}${past(ds, x) ? ' (đã qua)' : ''}</option>`).join('');
  const daySlots = ds => HOLIDAYS.includes(ds.slice(5)) ? [...slots, HOLI_SLOT] : slots;
  const dayOK = d => daySlots(iso(d)).some(x => !past(iso(d), x));
  const cutNote = ds => { if (ds !== iso(nowVN())) return ''; const open = daySlots(ds).filter(x => !past(ds, x)); return open.length ? `Hôm nay còn kịp giao: đặt trước ${String(+open[open.length - 1].split('–')[0].trim().slice(0, 2) - LEAD).padStart(2, '0')}:00 cho khung ${open[open.length - 1].replace(' (ngày lễ)', '')}.` : ''; };
  const first = dayOK(today) ? today : new Date(today.getTime() + 864e5);
  const imgs = p.images.length ? p.images : [''];
  $('#pdp').innerHTML = `
  <div class="wrap"><nav class="crumbs" aria-label="Breadcrumb" style="padding-top:18px"><a href="index.html">Trang chủ</a>/<a href="${cUrl(coll)}">${esc(collName(coll))}</a>/<span>${esc(p.name)}</span></nav></div>
  <div class="wrap pdp-main">
    <section class="gal" aria-label="Hình ảnh sản phẩm">
      <div class="gal-track" id="track">${imgs.map((s, i) => `<figure>${img(s, p.name + (i ? ' – ảnh ' + (i + 1) : ''), '', i === 0, SIZES.full)}</figure>`).join('')}</div>
      <div class="thumbs">${imgs.map((s, i) => `<button data-i="${i}" aria-label="Ảnh ${i + 1}">${img(s, '', '', false, SIZES.thumb)}</button>`).join('')}</div>
      ${imgs.length > 1 ? `<div class="dots">${imgs.map((s, i) => `<button data-i="${i}" aria-label="Ảnh ${i + 1}"></button>`).join('')}</div>
      <div class="gal-nav"><button data-step="-1" aria-label="Ảnh trước">←</button><button data-step="1" aria-label="Ảnh sau">→</button></div>` : ''}
    </section>
    <section class="p-info">
      <span class="eyebrow">${esc(collName(coll))}</span>
      <h1>${esc(p.name)}</h1>
      <a class="p-stars" href="${MAP}" target="_blank" rel="noopener"><span aria-hidden="true">★★★★★</span> 5.0 · 84 đánh giá Google</a>
      ${p.code ? `<span class="p-code">Mã sản phẩm: ${esc(p.code)}</span>` : ''}
      <div class="p-price"><b id="pPrice">${pfmt(v.price)}</b><span id="pCmp">${cmpHTML(v)}</span></div>
      <div class="p-trust"><span>Nhận đặt hoa theo mẫu</span><span>Ảnh & video hoa trước khi giao</span><span>Freeship bán kính 1km</span></div>
      <form id="buyForm" novalidate>
        <fieldset class="fld"><legend>Kích thước</legend><div class="sizes" role="radiogroup" aria-label="Kích thước">
          ${p.variants.map((x, i) => `<button type="button" class="size" role="radio" aria-checked="${i === 0}" data-v="${i}"><span>${esc(x.title)}</span><small>${pfmt(x.price)}</small></button>`).join('')}</div></fieldset>
        <fieldset class="fld"><legend>Thời gian giao</legend><div class="row2">
          <label><span class="sr">Ngày giao</span><input class="inp" type="date" id="date" min="${iso(first)}" value="${iso(first)}" required></label>
          <label><span class="sr">Khung giờ</span><select class="inp" id="slot">${slotOpts(iso(first))}</select></label></div>
          <div class="qdates">${[[iso(first), dayOK(today) ? 'Hôm nay' : 'Ngày mai'], [iso(new Date(first.getTime() + 864e5)), dayOK(today) ? 'Ngày mai' : 'Ngày kia'], ...(iso(first) < '2026-10-20' && iso(new Date(first.getTime() + 864e5)) < '2026-10-20' ? [['2026-10-20', '20/10']] : [])].map(([d, l]) => `<button type="button" class="qd" data-d="${d}">${l}</button>`).join('')}</div>
          <div class="hint"><span>Giao từ 08:00 đến 18:00 mỗi ngày. Đơn trong ngày: đặt trước ít nhất 2 tiếng.<br>Ngày lễ: có thêm khung 18:00 – 20:00.<b class="cut" id="cut">${cutNote(iso(first))}</b></span></div></fieldset>
        <details class="more-fld"${ask ? ' hidden' : ''}><summary><b>Địa chỉ, người nhận & lời thiệp</b><span>Không bắt buộc – có thể nhắn shop sau trong Zalo</span></summary>
        <div class="fld"><label for="district">Phường / xã giao (TP.HCM)</label><select class="inp" id="district"><option value="">Chọn phường / xã</option><option>Không rõ phường mới – shop gọi xác nhận</option>${areaOpts}</select><div class="hint"><span>Chưa quen tên phường mới? Chọn “Không rõ” và ghi địa chỉ cũ bên dưới.</span></div></div>
        <div class="fld"><label for="addr">Số nhà, tên đường nhận hoa</label><input class="inp" id="addr" autocomplete="street-address" placeholder="Ví dụ: 12 Bàu Cát 2, tầng 3"></div>
        <div class="fld"><label for="to">Tên & SĐT người nhận (nếu tặng người khác)</label><input class="inp" id="to" placeholder="Ví dụ: Chị Lan – 0912 345 678"></div>
        <div class="fld"><label for="msg">${isKT ? 'Nội dung băng rôn / thiệp chúc mừng' : 'Lời nhắn trên thiệp (miễn phí)'}</label><textarea class="inp" id="msg" maxlength="200" placeholder="${isKT ? 'Ví dụ: Chúc mừng khai trương – Hồng phát – Công ty ABC kính tặng' : 'Ví dụ: Chúc mừng Ngày Phụ nữ Việt Nam 20/10 — luôn rạng rỡ nhé!'}"></textarea><div class="hint"><span>${isKT ? 'Ghi tên người/công ty tặng và lời chúc. Shop xác nhận lại trước khi giao.' : 'Viết tay trên thiệp cao cấp.'}</span><span id="msgN">0/200</span></div></div>
        </details>
        <div class="buy">${ask ? `<button class="btn cv-main block" type="button" data-zask>Hỏi giá qua Zalo</button>` : `<button class="btn cv-main block z-main" type="submit">Đặt qua Zalo · <span id="btnPrice">${pfmt(v.price)}</span></button>`}
          <p class="z-note">${ask ? 'Tên và mã mẫu được chép sẵn – mở Zalo, dán và gửi, shop báo giá ngay.' : 'Không cần tài khoản: đơn được chép sẵn, bạn mở Zalo của shop, dán và gửi. Shop xác nhận, gửi ảnh và video hoa trước khi giao.'}</p>
          <div class="pair">${ask ? '' : `<button class="btn ghost" type="button" id="addCart">${ICON.bag}Thêm vào giỏ</button>`}<a class="btn ghost cv-call" href="tel:${PHONE}">Gọi ${PHONE_TXT}</a></div></div>
      </form>
    </section>
    <section class="p-more" aria-label="Thông tin thêm">
      <blockquote class="p-quote">“Hoa đẹp lắm ạ, đã mua 2 lần bên shop lúc nào cũng ưng bụng, đã khéo tay gói hoa đẹp còn giá cả phải chăng nữa.”<footer>Vy Le · Đánh giá Google</footer></blockquote>
      <div class="acc">
        <details open><summary>Chi tiết sản phẩm</summary><div class="acc-b"><p>${esc(p.desc || 'Thiết kế được cắm tay bởi florist Arch Flowers với hoa tươi tuyển chọn trong ngày.').replace(/\s*((?:Hoa chính|Phụ kiện|Gồm|Kích thước|Size (?:nhỏ|vừa|to|lớn))\s*:?)/gi, '<br><b>$1</b>').replace(/^<br>/, '')}</p><p>Loại: ${esc(p.type)}. Kích thước: ${p.variants.map(x => esc(x.title)).join(' / ')}.</p></div></details>
        <details><summary>Giao hàng</summary><div class="acc-b"><ul><li>Freeship trong bán kính 1km quanh cửa hàng.</li><li>Giao đúng khung giờ đã chọn.</li><li>Phí giao theo khu vực, shop báo khi chốt đơn.</li><li>Cửa hàng: <a href="${MAP}" target="_blank" rel="noopener" style="text-decoration:underline">${ADDR}</a></li></ul></div></details>
        <details><summary>Chăm sóc hoa</summary><div class="acc-b"><ul><li>Cắt chéo gốc 2–3cm, thay nước mỗi ngày.</li><li>Đặt nơi thoáng mát, tránh nắng trực tiếp và máy lạnh thổi thẳng.</li><li>Với hộp/giỏ hoa: tưới nhẹ vào mút xốp mỗi ngày.</li></ul></div></details>
        <details><summary>Đổi trả & cam kết</summary><div class="acc-b"><ul><li>Nhận đặt hoa theo mẫu khách gửi.</li><li>Shop gửi ảnh và video hoa qua Zalo để bạn xem trước khi giao.</li><li>Đổi mới miễn phí nếu hoa dập, héo khi nhận.</li><li>Thanh toán: COD, chuyển khoản.</li></ul></div></details>
      </div>
    </section>
  </div>
  <section class="sec ivory"><div class="wrap"><div class="sec-hd"><div><span class="eyebrow">Có thể bạn thích</span><h2 class="h2">Gợi ý <em>cùng phong cách</em></h2></div><a class="link" href="${cUrl(coll)}">Xem tất cả</a></div>
    <div class="grid" id="related"></div></div></section>
  <div class="sticky-buy"><a class="ico cv-call" href="tel:${PHONE}" aria-label="Gọi shop">${ICON.phone}</a>${ask ? `<button class="btn cv-main" type="button" data-zask>Hỏi giá qua Zalo</button>` : `<button class="ico st-cart" type="button" id="stickyCart" aria-label="Thêm vào giỏ">${ICON.bag}</button><button class="btn cv-main" type="button" id="stickyZ">Đặt qua Zalo · <span id="stPrice">${pfmt(v.price)}</span></button>`}</div>`;

  // gallery
  const track = $('#track'), n = imgs.length;
  const go = i => { i = (i + n) % n; track.scrollTo({ left: i * track.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
  const cur = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
  const mark = () => { const i = cur(); $$('.dots button, .thumbs button').forEach(b => b.setAttribute('aria-current', String(+b.dataset.i === i))); };
  track.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true }); mark();
  $$('.dots button, .thumbs button').forEach(b => b.onclick = () => go(+b.dataset.i));
  $$('[data-step]').forEach(b => b.onclick = () => go(cur() + +b.dataset.step));
  const full = imgs.map(u => new URL(u || PH, location.href).href); // zoom shows the original full-resolution photo
  $$('#track img').forEach((im, i) => { im.style.cursor = 'zoom-in'; im.onclick = () => openLb(full[i], full); });

  // variants
  $$('.size').forEach(b => b.onclick = () => {
    v = p.variants[+b.dataset.v];
    $$('.size').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    ['#pPrice', '#btnPrice', '#stPrice'].forEach(s => { if ($(s)) $(s).textContent = pfmt(v.price); });
    $('#pCmp').innerHTML = cmpHTML(v);
  });
  const firstOpen = sel => { if (sel.selectedOptions[0]?.disabled) { const o = [...sel.options].find(x => !x.disabled); if (o) o.selected = true; } };
  const refreshSlots = () => { const sel = $('#slot'), cur = sel.value.replace(' (đã qua)', ''); sel.innerHTML = slotOpts($('#date').value, cur); firstOpen(sel); $('#cut').textContent = cutNote($('#date').value); };
  firstOpen($('#slot'));
  const markQd = () => $$('.qd').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.d === $('#date').value)));
  $$('.qd').forEach(b => b.onclick = () => { $('#date').value = b.dataset.d; refreshSlots(); markQd(); });
  markQd();
  $('#date').addEventListener('change', () => { refreshSlots(); markQd(); });
  setInterval(refreshSlots, 60000); // a page left open keeps closing windows as time passes
  $('#msg').oninput = e => $('#msgN').textContent = e.target.value.length + '/200';
  const slotOK = () => { const sl = $('#slot'); if (!$('#date').value || sl.selectedOptions[0]?.disabled) { refreshSlots(); sl.focus(); toast('Khung giờ này đã qua – vui lòng chọn khung giờ khác hoặc ngày khác'); return false; } return true; };
  const add = e => {
    e && e.preventDefault();
    if (ask || !slotOK()) return;
    addToCart({ h: p.handle, v: v.title, price: v.price, date: $('#date').value, slot: $('#slot').value, district: $('#district').value, addr: $('#addr').value.trim(), to: $('#to').value.trim(), msg: $('#msg').value.trim() });
    openCart();
  };
  // main action: send this design straight to the shop's Zalo
  const order = e => {
    e && e.preventDefault();
    const k = `${p.name}${p.code ? ' (' + p.code + ')' : ''}`;
    if (ask) return zSheet({ k: 'ask:' + k, text: zAsk(p), title: 'Hỏi giá qua Zalo', sum: zSum(p, p.code ? 'Mã ' + esc(p.code) : '') });
    if (!slotOK()) return;
    const d = $('#date').value.split('-').reverse().join('/');
    zSheet({ k: 'order:' + k, text: zForm(), title: 'Đặt qua Zalo', sum: zSum(p, `${esc(v.title)} · ${pfmt(v.price)}<br>Giao ${d}, ${esc($('#slot').value)}`) });
  };
  $('#buyForm').onsubmit = order;
  $$('[data-zask]').forEach(b => b.onclick = order);
  if ($('#addCart')) $('#addCart').onclick = add;
  if ($('#stickyZ')) $('#stickyZ').onclick = order;
  if ($('#stickyCart')) $('#stickyCart').onclick = add;
  // "Liên hệ" designs: only the Zalo question matters, so the delivery form is hidden
  if (ask) { $$('#buyForm > fieldset, #buyForm > .fld, #buyForm > .more-fld').forEach(f => { if (!f.querySelector('.sizes') || p.variants.length < 2) f.hidden = true; }); }
  // Zalo from the product page carries the choices made so far, not just the product name
  const zForm = () => [`Chào Arch Flowers, mình muốn đặt mẫu ${p.name}${p.code ? ' (' + p.code + ')' : ''}`, `Size: ${v.title} – ${pfmt(v.price)}`,
    $('#date').value && `Giao: ${$('#date').value.split('-').reverse().join('/')}, ${$('#slot').value}`,
    ($('#addr').value.trim() || $('#district').value) && `Giao tới: ${[$('#addr').value.trim(), $('#district').value].filter(Boolean).join(', ')}`,
    $('#to').value.trim() && `Người nhận: ${$('#to').value.trim()}`, $('#msg').value.trim() && `Lời thiệp: ${$('#msg').value.trim()}`, pAbs(p)].filter(Boolean).join('\n');
  FROM = coll;
  const rel = DATA.products.filter(x => x !== p && x.price > 0 && x.collections.some(c => p.collections.includes(c))).slice(0, 8);
  $('#related').innerHTML = rel.map(x => cardHTML(x)).join('');
}

/* ---------- boot ---------- */
(async () => {
  try { await loadData(); } catch (e) { console.error(e); document.body.insertAdjacentHTML('afterbegin', '<p style="padding:20px;background:#3B0D18">Không tải được dữ liệu sản phẩm. Hãy chạy qua máy chủ (python3 -m http.server) từ thư mục web.</p>'); }
  chrome();
  if (!DATA) return;
  const page = document.body.dataset.page;
  track('view', page === 'product' ? (DATA.products.find(x => x.handle === document.body.dataset.h) || {}).name || '' : '');
  try { ({ home, collection, product })[page]?.(); } catch (e) { console.error(e); }
  fixHash();
  renderCart();
  reveal();
})();
