---
name: xem-thu-cuc-bo
description: >-
  Dùng khi cần chạy trang kiểm kê trên máy để xem thử hoặc kiểm tra một thay đổi giao diện/logic
  (người dùng nói "xem thử", "chạy thử", "mở trang", "kiểm tra trên trình duyệt", hoặc sau khi sửa web/).
---

# Xem thử trang kiểm kê trên máy

Trang là HTML/JS tĩnh; bước build sinh `dist/` từ `web/` và file Excel trong `dữ liệu cập nhật/`.

## Các bước

1. Nếu chưa có `node_modules/`: `npm install`.
2. Kiểm tra nhanh trước: `npm test` (build + soát dữ liệu + chạy thử xuất Excel). Phải kết thúc bằng
   "✓ Tất cả đều đạt". Nếu có mục ✗ thì sửa trước khi xem giao diện.
3. Chạy máy chủ xem thử (chạy nền, không chờ nó kết thúc): `npm run dev`
   → in ra `Xem thử: http://localhost:3000`. Mỗi lần sửa file trong `web/` phải dừng và chạy lại lệnh này
   (dist/ không tự cập nhật).
4. Mở http://localhost:3000 bằng trình duyệt của agent. Kiểm tra theo thay đổi vừa làm, tối thiểu:
   - Góc trên hiện **"Đã lưu chung"** (đã nối Supabase). "Chỉ lưu trên máy này" nghĩa là `web/config.js` trống hoặc lỗi.
   - Trang Tổng quan có số tài sản đúng với dòng "Xong: N tài sản" của build.
   - Mở một đơn vị (`#dv-GD`), một phòng (`#phong-108-gamma`), trang `#xac-minh`, trang `#xuat`.
   - Console không có lỗi đỏ.

## Cẩn thận

- Bản xem thử trên máy **dùng Supabase thật** (dữ liệu chung với web). Đừng bấm "Đủ", "Không thấy", sửa phòng…
  để thử nghiệm trừ khi người dùng đồng ý; nếu lỡ bấm, bấm "Kiểm lại" / "Hoàn tác" để trả về như cũ.
- Lần đầu ghi kết quả, trang hỏi tên người kiểm bằng hộp thoại `prompt()`; điều này chặn trình duyệt tự động.
  Muốn tránh, chạy trong console trước: `localStorage.setItem('kiemke2026.v1.name','Thử nghiệm')`.
- Thử "Tải file Excel cho kế toán" không ghi gì lên Supabase, an toàn để bấm.
