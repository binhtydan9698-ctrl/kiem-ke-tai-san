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
     `https://quan-ly-tai-san-fptudn.vercel.app/data/version.json`). Chênh lệch lớn → hỏi người dùng trước khi đẩy.
   - Đọc dòng "Sổ mã QR" của build: "mới cấp" (tài sản mới), "vừa xoá khỏi BBKK" (tài sản bị bỏ khỏi file, mã vẫn giữ),
     cảnh báo "có thể mã bị dùng lại cho tài sản khác" → báo người dùng. Sổ `dữ liệu cập nhật/so-ma-qr.json` do build ghi,
     không sửa tay, không xoá dòng; phải commit cùng file Excel.
   - Dòng "↪ Kế toán đổi Mã TSCĐ X → Y (tự nhận)": mã cũ rời file, mã mới có tên, ngày bắt đầu sử dụng, nguyên giá giống hệt → build
     tự nối (cùng một tài sản) → báo người dùng. Dòng "! Nghi kế toán đổi Mã TSCĐ (chưa nối)" → hỏi người dùng có đúng là cùng
     tài sản không; đúng thì thêm vào `dữ liệu cập nhật/doi-ma-tscd.json` `{"doi":[{"cu":"X","moi":"Y","ghiChu":"…"}]}`
     (tạo file nếu chưa có), build lại, kiểm tra dòng "↪", commit cùng file Excel.
3. Đẩy riêng dữ liệu lên: `npm run day-len-web` (kiểm tra lại, commit cả thư mục dữ liệu gồm Excel và sổ mã QR, pull --rebase, push).
4. Xác nhận trên web: `npm run kiem-tra-web` (đợi Vercel tối đa 5 phút, phải thấy "✓ Trang web hoạt động bình thường").

## Khi một tài sản hiện sai

- Tìm trong `dist/data/assets.js` theo Mã TSCĐ; mỗi dòng là
  `[stt, ma, ten, sl, ngay, gia, gc(đơn vị), vt(vị trí), key, sheet, dòngExcel]`.
- Tài sản có mặt ở nhiều sheet: giá trị lấy từ sheet "Tổng hợp", ô trống thì lấy từ sheet khác (theo thứ tự sheet).
- Dòng không mã, không số lượng, không nguyên giá, không ngày = phần tên bị xuống dòng, nối vào tài sản có STT liền trước.
- Danh mục phòng bổ sung `dữ liệu cập nhật/danh-muc-phong.json` (`{soTang:{Tòa:số tầng}, phong:[{toa, so, ghiChu}]}`): thêm phòng chưa
  có trên app (0 tài sản). Người dùng gửi thêm phòng thì thêm dòng vào đây (đúng tầng của tòa, không trùng); không xoá phòng đã có
  trên app. Đổi file này cũng đổi phiên bản dữ liệu (trang báo "Tải lại trang").
- Kế toán đổi Mã TSCĐ của tài sản: vẫn là tài sản đó (người dùng chốt). Mã cũ nối sang mã mới trong Sổ mã QR (tự nhận hoặc
  khai báo `doi-ma-tscd.json`): tem mã cũ mở tài sản mã mới, lý lịch gộp. Kết quả kiểm trên Supabase vẫn lưu theo mã cũ (không
  tự chuyển, không xoá); trang tài sản mã mới hiện kết quả của mã cũ và nút "Dùng kết quả này" để cán bộ bấm.
