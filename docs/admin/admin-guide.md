# Hướng dẫn Quản trị Lagom (Admin Guide)

Bản quản trị nằm tại `/admin`, đăng nhập bằng tài khoản nhân sự (Owner được tạo bởi
`npm run seed`). Mọi thay đổi đều là **bản nháp** cho tới khi bấm **Xuất bản**; bản công khai
chị đổi theo cơ chế release (nháp không bao giờ chạm trang công khai).

## Công việc hằng ngày

| Việc cần làm | Màn hình |
| --- | --- |
| Sửa nội dung trang chủ, thêm/xóa/sắp xếp phần | Tổng quan → **Trang** → trang `home` |
| Viết chính sách / trang mới | **Trang** → Tạo trang mới (slug ví dụ `chinh-sach-moi`) |
| Đổi tên, giá, mô tả, ảnh, biến thể sản phẩm | **Sản phẩm** |
| Nhập 60 sản phẩm từ bảng giá | **Lịch sử hoạt động → Nhập bảng giá** |
| Tạo/sửa bộ sưu tập, chọn sản phẩm thủ công hoặc theo luật | **Danh mục & Bộ sưu tập** |
| Tải ảnh, sửa alt, kiểm tra ảnh đang dùng ở đâu | **Thư viện ảnh** |
| Đổi menu đầu trang và nhóm liên kết chân trang | **Điều hướng & Footer** |
| Chạy khuyến mãi có lịch | **Khuyến mãi** |
| Thêm đánh giá khách (chỉ nội dung có thật) | **Đánh giá & FAQ** |
| Thêm câu hỏi thường gặp | **Đánh giá & FAQ → Câu hỏi thường gặp** |
| Đổi màu thương hiệu, bo góc, bố cục | **Giao diện** |
| Đổi số điện thoại, Zalo, địa chỉ, khung giờ giao, trạng thái nhận đơn | **Cài đặt doanh nghiệp** |
| Thêm nhân sự, phân quyền | **Người dùng & Quyền** |
| Xem ai đổi gì khi nào; khôi phục phiên bản cũ | **Lịch sử hoạt động** |

## Ánh xạ trang công khai ↔ màn hình quản trị

| Khu vực trên trang cửa hàng | Nguồn dữ liệu | Màn hình admin |
| --- | --- | --- |
| Trang chủ (`/`) | trang CMS slug `home` (nếu chưa có: nội dung dựng sẵn) | Trang |
| Trang chính sách (`/pages/<slug>/`) | trang CMS cùng slug, ngược lại policies dựng sẵn | Trang |
| Menu đầu trang, menu di động | entity navigation (ngược lại: menu dựng sẵn) | Điều hướng & Footer |
| Cột liên kết chân trang | entity navigation | Điều hướng & Footer |
| Dải khuyến mãi đầu trang, banner trang chủ | promotion theo `placement` | Khuyến mãi |
| Sản phẩm, giá "từ", badge giảm giá | entity product (đã xuất bản) | Sản phẩm |
| Bộ sưu tập và lọc theo bộ sưu tập | entity collection | Danh mục & Bộ sưu tập |
| Ảnh sản phẩm / ảnh trang | entity media + media_usage | Thư viện ảnh |
| Số điện thoại / Zalo / khung giờ giao trong trang | entity settings | Cài đặt doanh nghiệp |
| Màu nền, màu nhấn, bo góc, bề rộng | entity theme (ngược lại: token dựng sẵn) | Giao diện |
| Mục "Đánh giá" / "Câu hỏi thường gặp" trong trang | testimonial / faq đã xuất bản | Đánh giá & FAQ |

## Quy trình an toàn

1. **Lưu nháp** — không ảnh hưởng trang công khai; có autosave và cảnh báo xung đột khi hai người cùng sửa.
2. **Xuất bản** — hệ thống kiểm tra điều kiện (slug, giá, ảnh…) trước khi thay trang công khai; lỗi giữ nguyên bản cũ.
3. **Khôi phục** — mục → Lịch sử → Khôi phục tạo bản nháp mới từ phiên bản cũ (lịch sử không bị xóa).
4. Ảnh đang được dùng thì không xóa được — hệ thống liệt kê nơi đang dùng trước khi cho phép gỡ.
5. Khuyến mãi hết hạn tự động biến mất khỏi trang công khai, không cần thao tác thủ công.

## Phân quyền

| Vai trò | Làm được |
| --- | --- |
| Owner | Mọi thứ, kể cả nhân sự và quyền |
| admin | Sửa + xuất bản nội dung và cấu hình (không quản lý user) |
| content-editor | Chỉ lưu nháp trang/menu/khuyến mãi/FAQ; **không xuất bản được, kể cả gọi thẳng API** |
| catalog-manager | Nháp sản phẩm/bộ sưu tập/ảnh theo phạm vi được giao |
| publisher | Duyệt và xuất bản, không sửa nội dung |
| viewer | Chỉ xem |
