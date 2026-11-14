---
name: cap-nhat-du-lieu-excel
description: >-
  Dùng khi người dùng thay, sửa hoặc thêm file Excel biên bản kiểm kê trong thư mục "dữ liệu cập nhật",
  muốn đưa dữ liệu Excel mới lên web, hoặc hỏi vì sao một tài sản/ô Excel hiện sai trên trang.
---

# Cập nhật dữ liệu Excel lên web

Nguồn duy nhất của danh sách tài sản: **một** file `.xlsx` trong `dữ liệu cập nhật/`
(hiện là `BBKK_FPTU_2026_ver01_capnhat.xlsx`). Quy tắc đọc nằm ở `web/excel-rules.js`, gộp sheet ở `scripts/build.mjs`.

## Các bước

1. **Không tự sửa nội dung file Excel** trừ khi người dùng yêu cầu rõ. Nếu người dùng đưa file mới:
   chép vào `dữ liệu cập nhật/`, xoá file `.xlsx` cũ trong đó (`git rm`), đừng để hai file cùng lúc.
2. Kiểm tra file đọc được và đúng: `npm test`. Mục "2b" đối chiếu sheet "Tổng hợp" với các sheet con (thiếu/thừa tài sản,
   lệch nguyên giá/ngày, dòng TỔNG CỘNG); dòng "!" chỉ là ghi chú số lượng khác nhau (tài sản dùng chung), không phải lỗi.
   - Đọc kỹ các dòng `!` của build: "ô ghi khác nhau giữa các sheet" (Tổng hợp được ưu tiên),
     "STT trống hoặc trùng" (nếu xuất hiện là bất thường với biên bản này). Báo lại cho người dùng.
   - So số tài sản ("Xong: N tài sản") với lần trước (`git show HEAD:...` hoặc bản trên web
     `https://kiem-ke-tai-san-sigma.vercel.app/data/version.json`). Chênh lệch lớn → hỏi người dùng trước khi đẩy.
3. Đẩy riêng dữ liệu lên: `npm run day-len-web` (kiểm tra lại, commit chỉ thư mục dữ liệu, pull --rebase, push).
4. Xác nhận trên web: `npm run kiem-tra-web` (đợi Vercel tối đa 5 phút, phải thấy "✓ Trang web hoạt động bình thường").

## Khi một tài sản hiện sai

- Tìm trong `dist/data/assets.js` theo Mã TSCĐ; mỗi dòng là
  `[stt, ma, ten, sl, ngay, gia, gc(đơn vị), vt(vị trí), key, sheet, dòngExcel]`.
- Tài sản có mặt ở nhiều sheet: giá trị lấy từ sheet "Tổng hợp", ô trống thì lấy từ sheet khác (theo thứ tự sheet).
- Dòng không mã, không số lượng, không nguyên giá, không ngày = phần tên bị xuống dòng, nối vào tài sản có STT liền trước.
- Đổi Mã TSCĐ của tài sản đã kiểm sẽ làm mất liên kết với kết quả trên Supabase (kết quả lưu theo mã) —
  cảnh báo người dùng nếu thấy mã cũ biến mất mà mã mới xuất hiện.
