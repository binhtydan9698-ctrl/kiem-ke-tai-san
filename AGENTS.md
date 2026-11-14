# Hướng dẫn cho trợ lý lập trình (AGENTS.md)

Antigravity IDE (và các trợ lý khác) tự đọc file này cho mọi thao tác trong dự án.
Quy ước riêng cho mã nguồn trang: [web/AGENTS.md](web/AGENTS.md). Quy trình từng việc: `.agents/skills/`.

## Dự án

Trang **Quản lý tài sản** của Phòng Hành chính, Phân hiệu ĐH FPT Đà Nẵng, gồm 3 phần chính (trang chủ `#trang-chu`):
- **Kiểm kê tài sản 2026** (đang dùng): mọi trang `#tong-quan`, `#don-vi`, `#vi-tri`, `#dv-…`, `#phong-…`, `#xac-minh`,
  `#xuat`, trang một tài sản `#ts-…`; mã trong `web/index.html`.
- **Quản lý mã QR tài sản** (`#ma-qr`, mã trong `web/ma-qr.js`): in tem mã QR (chọn tài sản, chỉnh mẫu tem, xem trước,
  tải PDF / ảnh PNG / Excel, CSV / In ngay) và **Sổ mã QR**. Quét tem bằng nút Quét mã mở thẳng trang tài sản `#ts-<khoá>`
  trong phần Kiểm kê.
- **Lịch sử** (chung cho cả app): `#lich-su` Thao tác trên app (ai làm gì, lúc nào) · `#nhap-so` Nhập sổ (tài sản vào sổ
  khi nào, từ kế toán qua file BBKK hay cán bộ Hành chính ghi nhận phát sinh) · `#ly-lich` / `#ly-lich-<khoá>` Lý lịch tài sản
  (dòng thời gian: kế toán ghi sổ → vào sổ trên app → mọi thao tác → xoá khỏi BBKK).
- Đầu trang 2 tầng: logo FPT University (`web/img/logo-fpt-university.png`, về trang chủ) · 3 phần chính [Kiểm kê | Mã QR |
  Lịch sử] (mỗi phần nhớ trang đang xem dở) · Quét mã · người dùng; tầng dưới là menu con của phần đang mở. Điện thoại:
  thanh dưới cùng [Trang chủ · Kiểm kê · Quét mã · Mã QR · Lịch sử]. Trang tài sản, sheet, phòng có nút "In tem mã QR…"
  mở phần Mã QR lọc sẵn (`qrOpen()`); phần Mã QR và Lịch sử có link ngược về Kiểm kê.

Trang tĩnh (HTML + JS thuần) trên Vercel, kết quả kiểm lưu chung trên Supabase, danh sách tài sản lấy từ file Excel
biên bản trong `dữ liệu cập nhật/` (dùng chung cho cả 2 phần).

- Web: https://quan-ly-tai-san-fptudn.vercel.app (tên cũ kiem-ke-tai-san-sigma.vercel.app vẫn mở được) · Repo (công khai): https://github.com/binhtydan9698-ctrl/kiem-ke-tai-san
- Người dùng là cán bộ hành chính, **không phải lập trình viên**, làm việc bằng **tiếng Việt**: trả lời, giao diện,
  chú thích code, thông điệp commit đều bằng tiếng Việt; giải thích bằng lời thường, tránh thuật ngữ khi không cần.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm install` | Cài thư viện (lần đầu) |
| `npm test` | Build từ Excel + soát dữ liệu + đối chiếu sheet "Tổng hợp" với các sheet con + chạy thử xuất Excel kế toán. **Chạy sau mọi thay đổi.** |
| `npm run dev` | Build rồi mở máy chủ xem thử http://localhost:3000 (chạy nền; sửa `web/` thì chạy lại) |
| `npm run day-len-web` | Kiểm tra rồi commit + push riêng thư mục dữ liệu Excel |
| `npm run kiem-tra-web` | Sau khi push: đợi Vercel, soát trang thật + Supabase (chỉ đọc) |
| `npm run sao-luu` | Sao lưu kết quả Supabase về `sao-luu/` (chỉ đọc) |
| `npm run thu-giao-dien` | Thử giao diện tự động trên Edge/Chrome chạy ngầm (đầu trang, quét mã, in tem + đọc lại mã, lịch sử, quét liên tục, điện thoại), chế độ chỉ lưu trên máy, KHÔNG đụng Supabase. **Chạy sau mọi thay đổi giao diện.** |
| `npm run theo-doi-supabase` | Đọc thử Supabase (chỉ đọc). GitHub Actions chạy mỗi sáng 8h (`.github/workflows/theo-doi-supabase.yml`): giữ Supabase không bị tạm dừng; không đọc được thì lần chạy báo lỗi → GitHub gửi mail tới email nhận thông báo của tài khoản chủ repo (người dùng muốn nhận ở địa chỉ email công việc, không ghi địa chỉ vào repo công khai). |

## Skills trong `.agents/skills/`

- `xem-thu-cuc-bo` — chạy và kiểm tra trang trên máy
- `cap-nhat-du-lieu-excel` — thay/sửa file Excel và đưa lên web
- `trien-khai-len-web` — commit, push, xác nhận Vercel
- `du-lieu-ket-qua-supabase` — xem/sao lưu/chuyển đổi kết quả kiểm trên Supabase

## Luồng dữ liệu

1. `dữ liệu cập nhật/*.xlsx` là nguồn duy nhất của danh sách tài sản (biên bản gốc: mỗi đơn vị một sheet + "Xem lại" + "Tổng hợp").
2. `npm run build` (`scripts/build.mjs`) đọc Excel → `dist/data/assets.js` (`window.KIEMKE_DATA = {version, file, sheets, rows}`),
   `dist/data/version.json`, `dist/data/goc.xlsx`, chép `web/` → `dist/`; cập nhật Sổ mã QR → `dist/data/so-ma-qr.js`
   (`window.KIEMKE_SO_QR = {capNhat, files, dang: {khoá: [lúc vào sổ, file]}, xoa: {khoá: thông tin lúc còn trong sổ}, chan, sang: {mã cũ: mã mới}}`).
   Mỗi dòng: `[stt, ma, ten, sl, ngay(yyyy-mm-dd), gia, gc(đơn vị), vt(vị trí), key, sheet, dòngExcel, nhómLẻ]`.
   `nhómLẻ` = tên sheet lẻ ("Xem lại phân bổ" / "Xem lại" / "Chưa có ghi chú", theo thứ tự ưu tiên `REVIEW_SHEETS`
   trong `web/excel-rules.js`) hoặc `''`. Tài sản sheet lẻ là tài sản **chưa có vị trí** (chưa rõ vì sao kế toán đưa vào
   sổ, ai mua): trang xếp vào 3 nhóm riêng (id `XLPB`, `XL`, `CBG`), luôn để "Chưa có vị trí" (bỏ qua cột Vị trí Excel,
   chỉ hiện làm gợi ý) cho tới khi cán bộ kiểm trực tiếp rồi phân bổ vào các sheet đơn vị GD … FSC3.
3. `web/index.html` dựng `ASSETS` từ `KIEMKE_DATA.rows`. Trạng thái kiểm kê trong `S = {rows, xm, units, ps}`:
   - `S.rows[stt]`: kết quả từng tài sản `{tt, nf, hs, phong, cond, sd, note, at, by}` — `cond` = Tình trạng (hư hỏng ra sao,
     `COND`), `sd` = Trạng thái sử dụng (`SUDUNG`: '' Đang sử dụng, kho, sua, muon, cho_tl, da_tl, bg), hai mục TÁCH RIÊNG.
   - `S.xm[stt]`: mục "Tài sản thất lạc" (`#xac-minh`, hỏi đại diện phòng ban) `{kq, cach, phanhoi, phong}`
   - `S.units[id]`: buổi kiểm của đơn vị · `S.ps[key]`: tài sản phát sinh
4. Đồng bộ: `save()` so `S` với `LAST` rồi ghi từng tài liệu qua `DB.doc(path).set()`; `listen(col)` nhận thay đổi.
   `web/supabase-db.js` cung cấp `DB` (giả lập API `db` của Claude artifact) trên bảng `kiemke_docs(col, id, data)`.
5. "Xuất cho kế toán" (`web/export.js`) mở `data/goc.xlsx`, điền cột Thực tế và thêm 3 cột kết quả ở mọi sheet danh sách.
6. Lịch sử thao tác (trang `#lich-su`): `save()` → `logChanges()` so `S` với lần lưu trước, ghi mỗi thao tác 1 bản ghi
   `col='log'` (ai, máy nào, lúc nào, trước → sau) qua hàng đợi `WR`, kèm bản sao 1000 dòng trong localStorage.
   Trang chỉ đọc `log` khi mở trang Lịch sử (`DB.recent()`), không tải lúc mở trang. Lý lịch tài sản đọc `log` theo đúng
   một khoá (`DB.recent('log',{key})`: dòng có `key` hoặc dòng gộp có `keys` chứa khoá). Thao tác nhiều tài sản (gộp, in tem)
   phải ghi `keys` để lý lịch từng tài sản thấy được. Tài sản phát sinh lưu thêm `at`, `by` (trang Nhập sổ).

## Quy ước BẮT BUỘC

- **Khoá lưu trên Supabase của `rows` và `xm` là `a.key` (= Mã TSCĐ), không phải STT.** Ánh xạ qua `docId()` / `localKey()`.
  Không đổi cách tạo `key` nếu không kèm bước chuyển dữ liệu cũ trên Supabase (xem skill `du-lieu-ket-qua-supabase`).
- Nhận diện tiêu đề (1 hoặc 2 dòng, ô gộp), dòng TỔNG CỘNG, dòng tên bị xuống dòng và cách tạo `key` nằm DUY NHẤT trong
  `web/excel-rules.js` (`globalThis.KIEMKE_EXCEL`), được cả `scripts/build.mjs`, `scripts/kiem-tra.mjs` (Node) và
  `web/export.js` (trình duyệt) dùng. Đừng chép logic này sang chỗ khác.
- Tài sản có mặt ở nhiều sheet: build gộp theo `key`, sheet tên "Tổng hợp" được ưu tiên, ô trống lấy từ sheet khác.
  Export điền kết quả vào MỌI lần xuất hiện của tài sản.
- **Quy tắc mã QR (người dùng đặt):** mỗi mã QR là đường link `https://quan-ly-tai-san-fptudn.vercel.app/#ts-<a.key>` mở thẳng
  trang của đúng một tài sản trong phần Kiểm kê (không có kiểu "chỉ Mã TSCĐ"). Nội dung mã và cách đọc lại nằm DUY NHẤT trong
  `web/qr-rules.js` (`globalThis.KIEMKE_QR`), dùng chung cho trang và `npm test` (bước 4). Không đổi dạng link, không bỏ
  đường dẫn `#ts-`, không đổi cách tạo `key`: tem đã dán sẽ không còn khớp. Tài sản chưa có Mã TSCĐ thì chưa cấp mã QR.
- **Sổ mã QR `dữ liệu cập nhật/so-ma-qr.json`** (`scripts/so-ma-qr.mjs`, build tự cập nhật trên máy, Vercel chỉ đọc): mọi Mã TSCĐ
  đã cấp mã QR; mã không bao giờ cấp lại cho tài sản khác (cùng mã mà ngày ghi sổ và nguyên giá đều khác → cảnh báo, thông tin
  cũ vào `cu`); tài sản bị xoá khỏi file BBKK vẫn giữ (có ngày `xoa`), quét tem cũ mở trang "đã xoá khỏi BBKK". **Không xoá
  dòng nào trong sổ, không sửa tay**; commit cùng file Excel (`npm run day-len-web` commit cả thư mục). `npm test` bước 5
  soát sổ không mất mã nào so với bản trên GitHub.
- **Quy tắc lệch 1 chữ (người dùng đặt):** mã QR đi theo thông tin tài sản. Hai dòng lệch dù 1 chữ (tên, ngày ghi sổ, nguyên
  giá) là 2 tài sản khác nhau, bắt buộc khác mã QR; tài sản số lượng lớn (cùng một dòng) dùng chung 1 mã QR. Cùng Mã TSCĐ mà
  lệch thông tin giữa các sheet → build báo ✗ và chặn in tem mã đó (`chan` trong `dist/data/so-ma-qr.js`), `npm test` ✗;
  khác chỉ ở khoảng trắng thì không tính. Thông tin một mã đổi so với lần trước → Sổ mã QR cảnh báo, cất thông tin cũ vào `cu`
  (vẫn cùng mã QR, tem đã dán vẫn dùng).
- **Quy tắc đổi Mã TSCĐ (người dùng chốt 15/11/2026: "chung quy thì nó vẫn là nó"):** kế toán đổi Mã TSCĐ cho cùng một tài sản
  thì vẫn là tài sản đó. Sổ mã QR nối mã cũ → mã mới (mã cũ có `sang {ma, luc, cach}`, mã mới có `maCu`; trang có
  `KIEMKE_SO_QR.sang {cũ: mới}`, `maMoi()` / `maCuCua()`): tem mang mã cũ vẫn mở tài sản mã mới (1 mã QR, 2 Mã TSCĐ), in tem mới
  thì có thêm mã QR mới (2 mã QR, cùng tài sản), lý lịch gộp lịch sử của mã cũ. Build tự nối khi mã mới giống hệt (tên, ngày ghi
  sổ, nguyên giá) đúng một mã đã rời BBKK; còn lại báo "nghi đổi mã" → hỏi người dùng, đúng thì khai báo trong
  `dữ liệu cập nhật/doi-ma-tscd.json` `{"doi":[{"cu","moi","ghiChu"}]}`. Kết quả kiểm trên Supabase KHÔNG tự chuyển sang mã mới:
  trang tài sản mã mới hiện kết quả của mã cũ (`ORPHAN`, chỉ đọc) và nút "Dùng kết quả này" (ghi qua `save()`).
- Tem in mặc định chỉ có tiêu đề, Mã TSCĐ, tên (không in phòng, đơn vị vì có thể thay đổi).
- Không sửa tay `dist/` (sinh khi build, đã `.gitignore`). Không tự sửa file Excel trừ khi người dùng yêu cầu.
- `web/config.js` chỉ chứa khoá **publishable/anon** (công khai). Không bao giờ đưa khoá `secret`/`service_role` vào repo.
- Repo **công khai**: không commit `sao-luu/`, `.gemini/`, `.env`, dữ liệu cá nhân hay khoá bí mật.
- Không ghi/xoá dữ liệu trên Supabase, không `git push --force`, không xoá lịch sử git khi chưa được người dùng đồng ý rõ.
- Ghi dữ liệu trên trang: mỗi tài liệu một lần ghi tại một thời điểm (hàng đợi `WR`). Không ghi từ hàm render.

## Trước khi báo "xong"

1. `npm test` → "✓ Tất cả đều đạt".
2. Thay đổi giao diện: `npm run thu-giao-dien` → "✓ Giao diện: tất cả đều đạt" (thêm kịch bản vào
   `scripts/thu-giao-dien-kich-ban.js` cho chức năng mới); xem thử bằng `npm run dev` (skill `xem-thu-cuc-bo`).
   Lỗi nhỏ tự tìm thấy thì tự sửa (chỉ hỏi khi quan trọng); không tự làm các gợi ý người dùng chưa yêu cầu.
3. Đã push: `npm run kiem-tra-web`.
4. Nói rõ cho người dùng điều gì đã làm, điều gì chưa kiểm tra được.
