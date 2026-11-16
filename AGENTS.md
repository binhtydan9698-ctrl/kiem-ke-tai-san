# Hướng dẫn cho trợ lý lập trình (AGENTS.md)

Antigravity IDE (và các trợ lý khác) tự đọc file này cho mọi thao tác trong dự án.
Quy ước riêng cho mã nguồn trang: [web/AGENTS.md](web/AGENTS.md). Quy trình từng việc: `.agents/skills/`.

## Dự án

Trang **Quản lý tài sản** của Phòng Hành chính, Phân hiệu ĐH FPT Đà Nẵng, gồm 4 phần chính (trang chủ `#trang-chu`):
- **Kiểm kê tài sản 2026** (đang dùng): mọi trang `#tong-quan`, `#don-vi`, `#vi-tri`, `#dv-…`, `#phong-…`, `#xac-minh`,
  `#xuat`, trang một tài sản `#ts-…`, `#ket-qua` / `#ket-qua-lech` (tài sản đã kiểm / lệch số lượng của cả trường, mở từ nút
  "Xem →" của ô số liệu ở Bảng tổng quan — người dùng chọn 16/11/2026: cả 5 ô số liệu đều có nút "Xem →"); mã trong `web/index.html`.
  `#tong-hop` **Tổng hợp toàn bộ tài sản** (ô "Tổng số dòng tài sản", người dùng đặt 16/11/2026): bảng gọn chỉ để lướt (bấm dòng
  mở trang tài sản), 5 nhóm từ trên xuống: Đã kiểm đủ → Lệch số lượng → Chưa tìm thấy → Chưa có vị trí → Chưa kiểm (sổ đã ghi
  phòng) — mỗi tài sản đúng 1 nhóm. Quy luật người dùng đặt: gom cùng tính chất, càng gom càng tốt để dễ lướt bằng mắt: Tòa →
  Phòng (tầng dưới lên tầng trên, số phòng nhỏ đến lớn) → Bộ môn → cùng loại đồ liền nhau (xếp tên bỏ số lượng ở đầu).
- **Quản lý mã QR tài sản** (`#ma-qr`, mã trong `web/ma-qr.js`): in tem mã QR (chọn tài sản, chỉnh mẫu tem, xem trước,
  tải PDF / ảnh PNG / Excel, CSV / In ngay) và **Sổ mã QR**. Quét tem bằng nút Quét mã mở thẳng trang tài sản `#ts-<khoá>`
  trong phần Kiểm kê.
- **Lịch sử** (chung cho cả app): `#lich-su` Thao tác trên app (ai làm gì, lúc nào) · `#nhap-so` Nhập sổ (tài sản vào sổ
  khi nào, từ kế toán qua file BBKK hay cán bộ Hành chính ghi nhận phát sinh) · `#ly-lich` / `#ly-lich-<khoá>` Lý lịch tài sản
  (dòng thời gian: bắt đầu sử dụng → vào sổ trên app → mọi thao tác → xoá khỏi BBKK).
- **Chung** (người dùng thêm 15/11/2026, mã trong `web/chung.js`): `#khau-hao` Khấu hao (tài sản đã hết và sắp hết khấu hao
  trong 12 tháng tới, để gom đi thanh lý; Tải Excel danh sách) · `#dau-moi` Đầu mối quản lý tài sản theo sheet (tên, chức vụ,
  email công việc). Đầu mối dùng chung cho các phần khác: hiện ở trang tài sản, trang sheet, Tài sản thất lạc, Lý lịch, Khấu
  hao — **nhưng KHÔNG đưa vào file "Xuất cho kế toán"** (người dùng dặn: chỉ liên kết hiển thị trên app).
  `#danh-ba` Danh bạ (cần đăng nhập: họ tên, chức vụ, đơn vị, số điện thoại, email, ghi chú; bảng `danh_ba`; số điện thoại tự
  hiện kèm đầu mối khi cùng email / họ tên) · `#quan-ly` Quản lý ứng dụng (`web/dang-nhap.js`: tài khoản của tôi, đổi mật khẩu,
  đăng xuất; quản trị: thêm / khoá thành viên, đặt quyền, đặt lại mật khẩu — nơi phát triển tiếp phần quản lý ứng dụng).
- **Đăng nhập** (người dùng chốt 15/11/2026: đăng nhập thật qua Supabase Auth, **cả app phải đăng nhập**): bật bằng
  `supabase/dang-nhap.sql` (người dùng tự chạy trong Supabase SQL Editor + tắt "Confirm email"). Chưa chạy thì trang chạy như cũ
  (`DN.cai=false`). Đã chạy: màn hình đăng nhập trước mọi thứ; lần đầu "Tạo tài khoản quản trị"; RLS chỉ cho thành viên
  (`thanh_vien`, không khoá) đọc `kiemke_docs`, `danh_ba`. Quyền (người dùng chốt 15/11/2026): `xem` **Tra cứu** (chỉ xem, trang
  ở chế độ chỉ xem, vẫn ghi lịch sử) · `kiem` **Kiểm kê** (thêm ghi kết quả kiểm kê, phát sinh, thất lạc) · `admin` **Quản trị**
  (toàn quyền: danh bạ, đầu mối, thành viên, khoá dữ liệu; **bắt buộc xác thực 2 bước** — chưa bật thì phải bật ngay sau mật khẩu,
  máy chủ chỉ cho toàn quyền khi phiên đã qua bước 2). Người dùng khác chỉ cần mật khẩu. Máy chủ chặn ghi theo quyền
  (`duoc_ghi(col)`). Tên người kiểm (`ME`) lấy từ tài khoản.
- Đầu trang 2 tầng: logo FPT University (`web/img/logo-fpt-university.png`, về trang chủ) · 4 phần chính [Kiểm kê | Mã QR |
  Lịch sử | Chung] (mỗi phần nhớ trang đang xem dở) · Quét mã · người dùng; tầng dưới là menu con của phần đang mở. Điện thoại:
  thanh dưới cùng [Kiểm kê · Mã QR · Quét mã · Lịch sử · Chung], về trang chủ bằng logo. Trang tài sản, sheet, phòng có nút "In tem mã QR…"
  mở phần Mã QR lọc sẵn (`qrOpen()`); phần Mã QR và Lịch sử có link ngược về Kiểm kê.
- **Nút ⋯ trên mỗi dòng tài sản** (người dùng thêm 15/11/2026, mã trong `web/anh.js`): hộp mở rộng có mã QR của tài sản (In tem,
  Mở trang tài sản) và **ảnh tài sản** (tối đa 5 ảnh mỗi tài sản, thu nhỏ 1600px trước khi tải lên + ảnh nhỏ 400px), xem ảnh toàn
  màn hình kiểu Messenger (nền mờ, đếm ảnh, tải về / chia sẻ / đóng, mũi tên, dải ảnh nhỏ, vuốt, phím mũi tên). Ảnh ở kho riêng tư
  Supabase Storage `anh-tai-san` (tạo trong `supabase/dang-nhap.sql`): chỉ thành viên xem (đường dẫn có hạn 1 giờ), quyền Kiểm kê /
  Quản trị tải lên, xoá. Chưa bật đăng nhập thì chưa dùng được ảnh (hộp vẫn có mã QR).

Trang tĩnh (HTML + JS thuần) trên Vercel, kết quả kiểm lưu chung trên Supabase, danh sách tài sản lấy từ file Excel
biên bản trong `dữ liệu cập nhật/` (dùng chung cho mọi phần).

- Web: https://quan-ly-tai-san-fptudn.vercel.app (tên cũ kiem-ke-tai-san-sigma.vercel.app vẫn mở được) · Repo: https://github.com/binhtydan9698-ctrl/kiem-ke-tai-san
- Người dùng là cán bộ hành chính, **không phải lập trình viên**, làm việc bằng **tiếng Việt**: trả lời, giao diện,
  chú thích code, thông điệp commit đều bằng tiếng Việt; giải thích bằng lời thường, tránh thuật ngữ khi không cần.
- **Hỏi khi cần người dùng quyết, luôn đưa gợi ý** (người dùng dặn 15/11/2026): chỗ nào là quyết định của người dùng (quy tắc,
  dữ liệu, cách hiểu chưa rõ — vd. kế toán đổi Mã TSCĐ thì 1 mã QR hay 2 mã QR) thì hỏi, đừng tự chọn. Thấy điều có thể làm
  tốt hơn thì nêu gợi ý (người dùng đánh giá cao, rất cần), nhưng chỉ làm gợi ý nào người dùng đồng ý. Lỗi nhỏ thì tự sửa.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm install` | Cài thư viện (lần đầu) |
| `npm test` | Build từ Excel + soát dữ liệu + đối chiếu sheet "Tổng hợp" với các sheet con + chạy thử xuất Excel kế toán. **Chạy sau mọi thay đổi.** |
| `npm run dev` | Build rồi mở máy chủ xem thử http://localhost:3000 (chạy nền; sửa `web/` thì chạy lại) |
| `npm run day-len-web` | Kiểm tra rồi commit + push riêng thư mục dữ liệu Excel |
| `npm run kiem-tra-web` | Sau khi push: đợi Vercel, soát trang thật + Supabase (chỉ đọc) |
| `npm run sao-luu` | Sao lưu kết quả Supabase (và Danh bạ) về `sao-luu/` (chỉ đọc). Đã bật đăng nhập: người dùng tự đặt tạm `$env:KIEMKE_TEN`, `$env:KIEMKE_MK` khi chạy |
| `npm run thu-giao-dien` | Thử giao diện tự động trên Edge/Chrome chạy ngầm (đầu trang, quét mã, in tem + đọc lại mã, lịch sử, quét liên tục, đổi mã, Chung, đăng nhập giả, điện thoại), chế độ chỉ lưu trên máy, KHÔNG đụng Supabase. **Chạy sau mọi thay đổi giao diện.** |
| `npm run theo-doi-supabase` | Đọc thử Supabase (chỉ đọc). GitHub Actions chạy mỗi sáng 8h (`.github/workflows/theo-doi-supabase.yml`): giữ Supabase không bị tạm dừng; không đọc được thì lần chạy báo lỗi → GitHub gửi mail tới email nhận thông báo của tài khoản chủ repo (người dùng muốn nhận ở địa chỉ email công việc, không ghi địa chỉ vào repo công khai). |

## Skills trong `.agents/skills/`

- `xem-thu-cuc-bo` — chạy và kiểm tra trang trên máy
- `cap-nhat-du-lieu-excel` — thay/sửa file Excel và đưa lên web
- `trien-khai-len-web` — commit, push, xác nhận Vercel
- `du-lieu-ket-qua-supabase` — xem/sao lưu/chuyển đổi kết quả kiểm trên Supabase
- `bao-mat` — **bảo mật, riêng tư, tài khoản đăng nhập** (bộ quy tắc đầy đủ: `BAO-MAT.md`): đọc trước mọi thay đổi đụng tới đăng
  nhập, quyền, SQL Supabase, khoá, dữ liệu cá nhân, CSP / tiêu đề bảo mật

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
   - `S.anh[stt]`: danh sách ảnh của tài sản `{ds: [{p: đường dẫn ảnh, n: ảnh nhỏ, at, by}]}` (col `anh`, khoá Mã TSCĐ như `rows`);
     tệp ảnh nằm ở kho `anh-tai-san` (`ts/<khoá>/…jpg`), không vào file cho kế toán, `npm run sao-luu` chỉ lưu danh sách, không lưu tệp ảnh.
4. Đồng bộ: `save()` so `S` với `LAST` rồi ghi từng tài liệu qua `DB.doc(path).set()`; `listen(col)` nhận thay đổi.
   `web/supabase-db.js` cung cấp `DB` (giả lập API `db` của Claude artifact) trên bảng `kiemke_docs(col, id, data)`.
5. "Xuất cho kế toán" (`web/export.js`) mở `data/goc.xlsx`, điền cột Thực tế và thêm 3 cột kết quả ở mọi sheet danh sách.
6. Lịch sử thao tác (trang `#lich-su`): `save()` → `logChanges()` so `S` với lần lưu trước, ghi mỗi thao tác 1 bản ghi
   `col='log'` (ai, máy nào, lúc nào, trước → sau) qua hàng đợi `WR`, kèm bản sao 1000 dòng trong localStorage.
   Trang chỉ đọc `log` khi mở trang Lịch sử (`DB.recent()`), không tải lúc mở trang. Lý lịch tài sản đọc `log` theo đúng
   một khoá (`DB.recent('log',{key})`: dòng có `key` hoặc dòng gộp có `keys` chứa khoá). Thao tác nhiều tài sản (gộp, in tem)
   phải ghi `keys` để lý lịch từng tài sản thấy được. Tài sản phát sinh lưu thêm `at`, `by` (trang Nhập sổ).
7. Chung: `S.dm[mã sheet]` = đầu mối `{ten, cv, email, at, by}` (col `dm` trên Supabase, id = mã sheet trong `UNITS`; lịch sử
   loại "Đầu mối (Chung)"). Khấu hao **tạm tính**: file BBKK chưa có số năm khấu hao → `ngày bắt đầu sử dụng + N năm`, N do
   người xem tích chọn (3–10, mặc định 5, nhớ trên máy); không tính công trình, xây lắp, phần mềm (`a.hoso`). Khi người dùng
   có số năm thật từ kế toán thì bổ sung (người dùng đang kiểm tra lại — nhắc khi được hỏi).
8. Nạp trang (BAO-MAT.md): `index.html` KHÔNG nạp thẳng dữ liệu; mã chính nằm trong `<script type="text/plain" id="kiemke-app">`.
   `web/dang-nhap.js` (`napVaChay`) đọc `data/version.json`: `ma_hoa=false` → nạp `data/assets.js`, `data/so-ma-qr.js`;
   `ma_hoa=true` (build trên Vercel có biến `KIEMKE_KHOA_DU_LIEU`) → đăng nhập, lấy khoá `khoa_du_lieu()`, giải mã `data/*.enc`
   (AES-256-GCM, `scripts/ma-hoa.mjs`) → rồi mới chạy mã chính. Build chèn CSP (dấu băm của khối mã chính) vào `dist/index.html`.

## Quy ước BẮT BUỘC

- **Bảo mật và riêng tư: theo `BAO-MAT.md`** (người dùng yêu cầu 15/11/2026, lập từ các thư viện đã cấp phép: ui-ux-pro-max, Supabase).
  Gặp chỗ chưa có quy tắc thì hỏi người dùng, không chọn cách lỏng hơn.

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
  đã cấp mã QR; mã không bao giờ cấp lại cho tài sản khác (cùng mã mà ngày bắt đầu sử dụng và nguyên giá đều khác → cảnh báo, thông tin
  cũ vào `cu`); tài sản bị xoá khỏi file BBKK vẫn giữ (có ngày `xoa`), quét tem cũ mở trang "đã xoá khỏi BBKK". **Không xoá
  dòng nào trong sổ, không sửa tay**; commit cùng file Excel (`npm run day-len-web` commit cả thư mục). `npm test` bước 5
  soát sổ không mất mã nào so với bản trên GitHub.
- **Quy tắc lệch 1 chữ (người dùng đặt):** mã QR đi theo thông tin tài sản. Hai dòng lệch dù 1 chữ (tên, ngày bắt đầu sử dụng, nguyên
  giá) là 2 tài sản khác nhau, bắt buộc khác mã QR; tài sản số lượng lớn (cùng một dòng) dùng chung 1 mã QR. Cùng Mã TSCĐ mà
  lệch thông tin giữa các sheet → build báo ✗ và chặn in tem mã đó (`chan` trong `dist/data/so-ma-qr.js`), `npm test` ✗;
  khác chỉ ở khoảng trắng thì không tính. Thông tin một mã đổi so với lần trước → Sổ mã QR cảnh báo, cất thông tin cũ vào `cu`
  (vẫn cùng mã QR, tem đã dán vẫn dùng).
- **Quy tắc đổi Mã TSCĐ (người dùng chốt 15/11/2026: "chung quy thì nó vẫn là nó"):** kế toán đổi Mã TSCĐ cho cùng một tài sản
  thì vẫn là tài sản đó. Sổ mã QR nối mã cũ → mã mới (mã cũ có `sang {ma, luc, cach}`, mã mới có `maCu`; trang có
  `KIEMKE_SO_QR.sang {cũ: mới}`, `maMoi()` / `maCuCua()`): tem mang mã cũ vẫn mở tài sản mã mới (1 mã QR, 2 Mã TSCĐ), in tem mới
  thì có thêm mã QR mới (2 mã QR, cùng tài sản), lý lịch gộp lịch sử của mã cũ. Build tự nối khi mã mới giống hệt (tên, ngày bắt
  đầu sử dụng, nguyên giá) đúng một mã đã rời BBKK; còn lại báo "nghi đổi mã" → hỏi người dùng, đúng thì khai báo trong
  `dữ liệu cập nhật/doi-ma-tscd.json` `{"doi":[{"cu","moi","ghiChu"}]}`. Kết quả kiểm trên Supabase KHÔNG tự chuyển sang mã mới:
  trang tài sản mã mới hiện kết quả của mã cũ (`ORPHAN`, chỉ đọc) và nút "Dùng kết quả này" (ghi qua `save()`).
- Tem in mặc định chỉ có tiêu đề, Mã TSCĐ, tên (không in phòng, đơn vị vì có thể thay đổi).
- Cột ngày trong file BBKK là **"Ngày bắt đầu SD"**: trên trang gọi là "Ngày bắt đầu sử dụng" (người dùng chốt), không gọi
  "ngày ghi sổ". Dữ liệu vẫn là `ngay` / `r[4]`.
- Đầu mối (Chung › Đầu mối, `S.dm`): chỉ tên, chức vụ, email công việc; số điện thoại để ở Danh bạ (bảng `danh_ba`, chỉ thành
  viên đã đăng nhập đọc được). Cả hai lưu trên Supabase qua app, **không bao giờ** ghi vào repo. `export.js` / `ketQuaKeToan`
  không được đọc `S.dm` hay danh bạ.
- **Mật khẩu, tài khoản:** KHÔNG BAO GIỜ ghi mật khẩu (kể cả mật khẩu người dùng gửi trong chat), email cá nhân hay khoá
  `service_role` vào repo, file cấu hình, bộ nhớ hay lệnh commit. Tài khoản quản trị do người dùng tự tạo trên màn hình "Tạo tài
  khoản quản trị"; mật khẩu do Supabase Auth giữ. Việc cần tài khoản (sao lưu, kiểm tra) dùng biến môi trường `KIEMKE_TEN` /
  `KIEMKE_MK` người dùng tự đặt tạm khi chạy lệnh. Muốn đổi quyền / bảng đăng nhập: sửa `supabase/dang-nhap.sql` và nhờ người
  dùng chạy lại; trang phải giữ chạy được khi SQL chưa chạy (`trangThai()` → `da_cai:false`).
- Không sửa tay `dist/` (sinh khi build, đã `.gitignore`). Không tự sửa file Excel trừ khi người dùng yêu cầu.
- `web/config.js` chỉ chứa khoá **publishable/anon** (công khai). Không bao giờ đưa khoá `secret`/`service_role` vào repo.
- Repo (người dùng muốn chuyển sang **riêng tư** 15/11/2026; coi như vẫn có thể bị lộ): không commit `sao-luu/`, `.gemini/`,
  `.env`, dữ liệu cá nhân, danh bạ, mật khẩu hay khoá bí mật.
- Không ghi/xoá dữ liệu trên Supabase, không `git push --force`, không xoá lịch sử git khi chưa được người dùng đồng ý rõ.
- Ghi dữ liệu trên trang: mỗi tài liệu một lần ghi tại một thời điểm (hàng đợi `WR`). Không ghi từ hàm render.

## Trước khi báo "xong"

1. `npm test` → "✓ Tất cả đều đạt" (bước 6 soát bảo mật: CSP, khoá bí mật / email thật trong repo, mã hoá, SQL).
2. Thay đổi giao diện: `npm run thu-giao-dien` → "✓ Giao diện: tất cả đều đạt" (thêm kịch bản vào
   `scripts/thu-giao-dien-kich-ban.js` cho chức năng mới); xem thử bằng `npm run dev` (skill `xem-thu-cuc-bo`).
   Lỗi nhỏ tự tìm thấy thì tự sửa (chỉ hỏi khi quan trọng); gợi ý thì nêu ra và chờ người dùng chọn, không tự làm.
3. Đã push: `npm run kiem-tra-web`.
4. Nói rõ cho người dùng điều gì đã làm, điều gì chưa kiểm tra được.
