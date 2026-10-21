// Promotions, testimonials and FAQs — three thin screens over the shared CRUD surface.
// Overlap and expiry behavior lives on the server (publicSite), so expired campaigns disappear
// without anyone opening this dashboard (§10).

import { CrudScreen, type FieldSpec } from '../crud';

const PROMO_FIELDS: FieldSpec[] = [
  { path: 'title', label: 'Tiêu đề', kind: 'text' },
  { path: 'message', label: 'Nội dung hiển thị', kind: 'textarea' },
  {
    path: 'placement',
    label: 'Vị trí hiển thị',
    kind: 'select',
    options: [
      ['header-strip', 'Dải thông báo đầu trang'],
      ['home-hero', 'Trong ảnh bìa trang chủ'],
      ['home-banner', 'Banner trang chủ'],
      ['footer', 'Chân trang'],
    ],
  },
  { path: 'link', label: 'Đường dẫn khi bấm', kind: 'text', hint: 'Ví dụ /collections/hoa-sinh-nhat/ hoặc https://…' },
  { path: 'imageAssetId', label: 'Ảnh (mã tài nguyên)', kind: 'text', hint: 'Lấy mã từ Thư viện ảnh.' },
  { path: 'priority', label: 'Ưu tiên (0–100)', kind: 'number', hint: 'Khi trùng lịch, ưu tiên cao hơn hiển thị trước.' },
  { path: 'startAt', label: 'Bắt đầu (theo giờ trình duyệt)', kind: 'datetime' },
  { path: 'endAt', label: 'Kết thúc (theo giờ trình duyệt)', kind: 'datetime' },
  { path: 'visible', label: 'Hiển thị', kind: 'checkbox' },
];

export function PromotionsPage() {
  return (
    <CrudScreen
      type="promotion"
      title="Khuyến mãi"
      description="Chiến dịch có lịch chạy. Khuyến mãi hết hạn tự động biến mất khỏi trang công khai, không cần thao tác thủ công."
      blank={() => ({ title: 'Khuyến mãi mới', placement: 'home-banner', priority: 0, visible: true })}
      fields={PROMO_FIELDS}
    />
  );
}

const TESTIMONIAL_FIELDS: FieldSpec[] = [
  { path: 'name', label: 'Tên khách hàng', kind: 'text' },
  { path: 'quote', label: 'Lời nhận xét', kind: 'textarea' },
  { path: 'rating', label: 'Số sao (1–5, để trống nếu không có)', kind: 'number' },
  { path: 'sourceLabel', label: 'Nguồn (ví dụ Google)', kind: 'text' },
  { path: 'sourceUrl', label: 'Link nguồn (https://…)', kind: 'text' },
  { path: 'sort', label: 'Thứ tự hiển thị', kind: 'number' },
];

export function TestimonialsPage() {
  return (
    <CrudScreen
      type="testimonial"
      title="Đánh giá của khách hàng"
      description="Chỉ nhập nhận xét có thật, kèm nguồn khi có. Hệ thống không tự tạo đánh giá hay số lượt đánh giá."
      blank={() => ({ name: '', quote: '', sort: 0 })}
      fields={TESTIMONIAL_FIELDS}
    />
  );
}

const FAQ_FIELDS: FieldSpec[] = [
  { path: 'category', label: 'Nhóm câu hỏi', kind: 'text', hint: 'Ví dụ: Giao hàng, Đổi trả.' },
  { path: 'question', label: 'Câu hỏi', kind: 'text' },
  { path: 'answer', label: 'Câu trả lời', kind: 'textarea' },
  { path: 'sort', label: 'Thứ tự hiển thị', kind: 'number' },
];

export function FaqsPage() {
  return (
    <CrudScreen
      type="faq"
      title="Câu hỏi thường gặp"
      description="Câu hỏi được nhóm theo chủ đề và hiển thị trong phần “Câu hỏi thường gặp” của trang."
      blank={() => ({ category: 'Chung', question: '', answer: '', sort: 0 })}
      fields={FAQ_FIELDS}
    />
  );
}
