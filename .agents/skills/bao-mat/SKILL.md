---
name: bao-mat
description: Bảo mật, riêng tư, tài khoản đăng nhập của trang Quản lý tài sản — đọc trước mọi thay đổi đụng tới đăng nhập, quyền, Supabase SQL, khoá, dữ liệu cá nhân (danh bạ, đầu mối), CSP / tiêu đề bảo mật, hoặc khi người dùng hỏi về an toàn dữ liệu.
---

# Bảo mật và riêng tư

Bộ quy tắc đầy đủ: **`BAO-MAT.md`** (gốc repo, người dùng duyệt 15/11/2026). Tóm tắt việc phải làm:

1. **Không bao giờ** ghi mật khẩu, mã xác thực, khoá `service_role`, khoá dữ liệu (`KIEMKE_KHOA_DU_LIEU`), email cá nhân hay danh bạ
   vào repo, bộ nhớ, commit, log. Người dùng gửi mật khẩu trong chat → không chép lại, nhắc họ đổi.
2. Quyền kiểm tra ở máy chủ: sửa / thêm bảng → bật RLS + policy `to authenticated` dùng `la_thanh_vien()` / `quyen_cua_toi()`; hàm
   `security definer` phải `set search_path` và tự kiểm tra quyền; thu hồi quyền của `anon`. Sửa trong `supabase/dang-nhap.sql`
   (chạy lại được nhiều lần), rồi nhờ người dùng chạy lại. Trang phải chạy được khi SQL chưa chạy (`da_cai:false`).
3. Mọi lời gọi Supabase cho đăng nhập nằm trong `sbCong()` (`web/dang-nhap.js`); thêm hàm thì thêm cả ở đăng nhập giả
   `scripts/thu-dang-nhap-gia.js` và kịch bản trong `scripts/thu-giao-dien-kich-ban.js`.
4. CSP: chỉ khối `<script type="text/plain" id="kiemke-app">` (dấu băm chèn khi build) + CDN cố định phiên bản. Không thêm mã chạy
   thẳng trong HTML, không `onclick=`, không `eval`. Thêm CDN / dịch vụ mới → sửa `cspTrang()` trong `scripts/ma-hoa.mjs`.
5. Dữ liệu tài sản: build có khoá → chỉ `data/*.enc`; trang nạp qua `napVaChay()`; file gốc lấy bằng `kiemkeTepGoc()`.
   Không thêm chỗ nào `fetch('data/assets.js'|'data/goc.xlsx')` trực tiếp.
6. Quyền: `xem` Tra cứu (READONLY + body.ro, vẫn ghi log) · `kiem` Kiểm kê · `admin` Quản trị (bắt buộc 2 lớp: `hoanTat()` →
   `hienBatMfa()`; SQL `quyen_cua_toi()` hạ admin chưa aal2 xuống `xem`, `duoc_ghi(col)` chặn ghi theo quyền). Người khác không bật 2 lớp.
7. Chính sách mật khẩu `DN.kiemTraMatKhau()` (12–72 ký tự…) dùng ở mọi chỗ đặt mật khẩu (mật khẩu ban đầu quản trị đặt cho thành
   viên gọi kèm `banDau: true`: được toàn chữ số, lặp ký tự, nhưng lần đăng nhập đầu bắt buộc đổi — `hienDoiMkDau`, máy chủ chặn qua
   `con_mk_ban_dau()`; người dùng chốt 17/11/2026, BAO-MAT.md mục C.2); SQL đặt lại mật khẩu cũng bắt 12–72.
8. Trước khi báo xong: `npm test` (bước 6), `npm run thu-giao-dien` (không vi phạm CSP), đã push thì `npm run kiem-tra-web`.
   Thay đổi về đăng nhập / quyền / khoá: rà theo mục B–D của `BAO-MAT.md`; nói rõ cho người dùng việc họ phải làm trong
   Supabase / Vercel (mục F) và điều chưa kiểm tra được trên Supabase thật.
