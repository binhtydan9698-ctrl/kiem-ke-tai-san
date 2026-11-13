# Quy ước cho thư mục web/ (mã nguồn trang)

- HTML + JavaScript thuần, **không** framework, **không** bước bundle. `index.html` chứa CSS + logic chính;
  các file `.js` khác nạp bằng `<script src>` theo thứ tự trong `<head>`. Không đổi sang ES module / React
  trừ khi người dùng yêu cầu.
- Thư viện ngoài chỉ nạp từ CDN với **phiên bản cố định** (supabase-js 2.118.0 qua jsDelivr, exceljs 4.4.0 qua cdnjs).
- `excel-rules.js` được dùng chung với Node (`scripts/build.mjs`, `scripts/kiem-tra.mjs`): giữ nó chạy được ở cả hai
  (chỉ gắn vào `globalThis`, không dùng DOM).
- Giao diện, thông báo, chú thích: **tiếng Việt**. Màu dùng biến CSS trong `:root` (có bản tối), trang phải dùng được
  trên điện thoại (bề ngang 360px).
- Giao diện theo phong cách trang daihoc.fpt.edu.vn: màu chủ đạo cam FPT (`--brand:#f37021`, chữ/viền dùng `--accent`),
  ảnh campus Đà Nẵng ở `web/img/` (bản 1024px lấy từ daihoc.fpt.edu.vn, giữ dòng ghi nguồn ảnh). Ảnh dưới màn hình đầu
  để `loading="lazy"`. Menu "Tổng quan" xổ ra 3 trang: `#tong-quan`, `#don-vi`, `#vi-tri`.
- Chèn chữ do người dùng nhập vào HTML luôn qua `esc()`.
- Trạng thái kiểm kê nằm trong `S`; sau khi đổi `S` phải gọi `save()` rồi làm mới giao diện (`refreshRow`/`render`).
  Không gọi `save()` trong hàm render.
- Sửa xong: `npm test`, rồi xem thử bằng skill `xem-thu-cuc-bo`.
