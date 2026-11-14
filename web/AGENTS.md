# Quy ước cho thư mục web/ (mã nguồn trang)

- HTML + JavaScript thuần, **không** framework, **không** bước bundle. `index.html` chứa CSS + logic chính;
  các file `.js` khác nạp bằng `<script src>` theo thứ tự trong `<head>`. Không đổi sang ES module / React
  trừ khi người dùng yêu cầu.
- Thư viện ngoài chỉ nạp từ CDN với **phiên bản cố định** (supabase-js 2.118.0 qua jsDelivr, exceljs 4.4.0 qua cdnjs).
- `excel-rules.js` được dùng chung với Node (`scripts/build.mjs`, `scripts/kiem-tra.mjs`): giữ nó chạy được ở cả hai
  (chỉ gắn vào `globalThis`, không dùng DOM).
- Giao diện, thông báo, chú thích: **tiếng Việt**. Màu dùng biến CSS trong `:root` (có bản tối), trang phải dùng được
  trên điện thoại (bề ngang 360px).
- Bảng màu (khối CSS "Bảng màu 2026" cuối `<style>`, chọn từ kho dữ liệu UI/UX Pro Max — `.claude/skills/ui-ux-pro-max`):
  nền/chữ slate (`#F8FAFC`/`#0F172A`), cam `--brand:#EA580C` cho trang trí, `--accent`/`--cta:#C2410C` cho chữ và nút.
  Mọi cặp chữ/nền phải đạt tương phản ≥ 4.5:1 (chữ lớn ≥ 3:1). Đổi màu thì sửa biến trong khối đó, không viết mã màu rời.
- Thẻ phòng (`roomTile`, khối CSS "Thẻ phòng kiểu Bento"): số phòng font **Unbounded** (`--f-display`, có tiếng Việt),
  mỗi tòa một màu (`.t-a` Alpha, `.t-b` Beta, `.t-g` Gamma…: `--tone` cho hình, `--tone-ink` cho chữ), vòng % tiến độ,
  nghiêng 3D + quầng sáng theo chuột. Mọi hiệu ứng phải tắt khi `prefers-reduced-motion: reduce`.
- Giao diện theo phong cách trang daihoc.fpt.edu.vn: màu chủ đạo cam FPT (chữ/viền dùng `--accent`),
  ảnh campus Đà Nẵng ở `web/img/` (bản 1024px lấy từ daihoc.fpt.edu.vn; người dùng yêu cầu không hiện dòng ghi nguồn ảnh trên trang). Ảnh dưới màn hình đầu
  để `loading="lazy"`. Menu "Tổng quan" xổ ra 3 trang: `#tong-quan`, `#don-vi`, `#vi-tri`.
- Trang gồm 3 phần dưới "Quản lý tài sản": trang chủ `#trang-chu` (`viewHub`, cũng là trang mở khi không có `#`),
  **Kiểm kê** (mọi trang còn lại, gồm trang một tài sản `#ts-<khoá>` = `viewTS`), **Mã QR** (`#ma-qr`, `#so-ma-qr`, `viewQR`
  trong `ma-qr.js`) và **Lịch sử** (`#lich-su` = `viewLog`, `#nhap-so` = `viewNhapSo`, `#ly-lich[-khoá]` = `viewLyLich`).
  Đầu trang 2 tầng (khối CSS "Đầu trang 2 tầng" cuối `<style>`): `.top1` = logo `.lgo` + tên `.app` + 3 phần `.sec`
  (`#swKK`, `#swQR`, `#swLS`; `#swHub` chỉ hiện ở thanh dưới điện thoại) + Quét mã + người dùng; `.top2` = menu con
  (`#nav` Kiểm kê, `#navQR`, `#navLS`, mục `a[data-r]`). `setMod()` đặt `body[data-mod=hub|kk|qr|ls]`, đánh dấu phần đang ở
  và nhớ trang đang xem dở của mỗi phần (`MODLAST`). Điện thoại (≤860px): `.sec` thành thanh dưới 5 ô, nút Quét mã nổi ở giữa.
  Nút `data-act="qrin"`
  (`data-qk` tài sản / `data-qu` sheet / `data-qr` phòng) gọi `qrOpen()` mở phần Mã QR lọc sẵn; `data-act="qrso"` mở Sổ mã QR.
- Sổ mã QR trên trang: `SOQR = window.KIEMKE_SO_QR` (sinh khi build). Tài sản đã xoá khỏi BBKK: `viewTSXoa`; quét tem của nó
  (`scanGoXoa`) vẫn mở trang này.
  Mã của phần Mã QR viết trong `ma-qr.js` (dùng lại `ASSETS`, `banner()`, `ic()`, `esc()`… của `index.html`); thêm
  file `.js` mới thì thêm vào `MA_TRANG` trong `scripts/kiem-tra-web.mjs`.
- In tem (`ma-qr.js`): một bố cục `temOps()` (mm) vẽ ra cả 4 nơi: xem trước và In ngay (SVG), PDF (jsPDF, nhúng phông
  `fonts/BeVietnamPro-*.ttf`), ảnh PNG (canvas, ghi dpi). Sửa bố cục chỉ sửa `temGeo`/`temOps`. Trước khi xuất luôn chạy
  `temVerify` (giải mã lại mọi mã bằng jsQR). Thư viện jsPDF/JSZip/jsQR chỉ tải khi cần (`temLoad`).
- Quét mã (`scanShow`): tem của app → `KIEMKE_QR.parse` → tra đúng `BY_KEY`; mã khớp nguyên văn → mở `#ts-…`; camera không
  bao giờ đoán gần đúng; mã vạch (không phải QR) phải đọc giống nhau 2 lần mới nhận.
- Chèn chữ do người dùng nhập vào HTML luôn qua `esc()`.
- Trạng thái kiểm kê nằm trong `S`; sau khi đổi `S` phải gọi `save()` rồi làm mới giao diện (`refreshRow`/`render`).
  Không gọi `save()` trong hàm render.
- Lịch sử thao tác tự sinh trong `save()`, nên mọi thay đổi `S` phải qua `save()` mới có lịch sử. Thao tác đổi nhiều
  tài sản một lúc: đặt `LOGCTX={bulk:true,title:'…'}` ngay trước `save()` để gộp 1 dòng. Sự kiện không đổi `S`
  (xuất file, đổi tên) ghi bằng `logEvent({kind,title,lines})`. Câu mô tả thay đổi viết trong `logRowLines`/`logXmLines`/…
- Sửa xong: `npm test`, rồi xem thử bằng skill `xem-thu-cuc-bo`.
