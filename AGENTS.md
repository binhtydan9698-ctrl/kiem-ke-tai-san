# Hướng dẫn cho trợ lý lập trình (AGENTS.md)

Antigravity IDE (và các trợ lý khác) tự đọc file này cho mọi thao tác trong dự án. Đọc theo thứ tự:
1. **Quy tắc vàng** (ngay dưới): những điều không bao giờ được làm sai, mỗi điều một dòng.
2. **Quy tắc chi tiết** (mục cùng số): lý do, ngày người dùng chốt, cách làm đúng; cuối mục là các quyết định khác của người dùng.
3. Viết mã trang: [web/AGENTS.md](web/AGENTS.md) · bảo mật: [BAO-MAT.md](BAO-MAT.md) · quy trình từng việc: `.agents/skills/`.

## Quy tắc vàng

Cột "Ai giữ": **Máy** = có bước kiểm tra tự động báo ✗ khi làm sai (ghi rõ bước của `npm test`, kịch bản của `npm run thu-giao-dien`);
**Trợ lý** = máy không kiểm được, trợ lý phải tự giữ. `npm test` bước 7 soát chính bảng này: bước và kịch bản ghi ở đây phải có thật,
quy tắc nào cũng phải có mục chi tiết cùng số.

| # | Quy tắc vàng | Ai giữ |
|---|---|---|
| 1 | Trả lời, giao diện, chú thích mã, commit: **tiếng Việt, lời thường** (người dùng không phải lập trình viên) | Trợ lý |
| 2 | Việc là **quyết định của người dùng** (quy tắc, dữ liệu, cách hiểu chưa rõ) thì **hỏi, kèm gợi ý**; chỉ làm gợi ý được đồng ý; lỗi nhỏ thì tự sửa | Trợ lý |
| 3 | **Không ghi / xoá dữ liệu trên Supabase, không `git push --force`, không xoá lịch sử git** khi chưa được người dùng đồng ý rõ | Trợ lý · Máy: bộ thử giao diện không gửi gì tới Supabase |
| 4 | **Bảo mật theo BAO-MAT.md**: không để mật khẩu, khoá bí mật, email cá nhân, danh bạ vào repo, commit, bộ nhớ | Máy: npm test bước 6; thử giao diện `dang-nhap`, `ma-hoa` · Trợ lý: mật khẩu người dùng gửi |
| 5 | File Excel BBKK là **nguồn duy nhất** của danh sách tài sản; **không tự sửa file Excel**, không sửa tay `dist/` | Máy: npm test bước 1, 7 · Trợ lý |
| 6 | **Xuất cho kế toán giữ nguyên file BBKK gốc**: chỉ thêm 3 cột cuối + sheet "Tài sản phát sinh"; cột "Thực tế" để trống | Máy: npm test bước 3; thử giao diện `xuat-goc` |
| 7 | **Kết quả kiểm lưu theo Mã TSCĐ, không theo STT**; không đổi cách tạo khoá khi chưa có bước chuyển dữ liệu cũ | Máy: npm test bước 2; thử giao diện `ket-qua` |
| 8 | **Mã QR** = đường link `…/#ts-<Mã TSCĐ>` mở đúng một tài sản; không đổi dạng link (tem đã dán phải còn dùng được) | Máy: npm test bước 4, 7; thử giao diện `quet-ma`, `in-tem` |
| 9 | **Sổ mã QR không bao giờ mất mã**, không cấp lại mã cho tài sản khác; **lệch 1 chữ là 2 tài sản** (cùng mã lệch thông tin → chặn in tem) | Máy: npm test bước 5 |
| 10 | **Kế toán đổi Mã TSCĐ: vẫn là tài sản đó**; tem mang mã cũ vẫn mở đúng tài sản | Máy: npm test bước 5; thử giao diện `doi-ma` |
| 11 | **Phòng đã có trên app không xoá, không đổi tên**; danh mục phòng chỉ để thêm phòng chưa có | Máy: npm test bước 2; thử giao diện `phong-ban` |
| 12 | **"Xong" chỉ khi đủ hết hoặc 0/0**; còn thiếu, thừa, chưa tìm thấy thì không hiện xong | Máy: thử giao diện `phong-ban` |
| 13 | **Đầu mối, danh bạ không vào file "Xuất cho kế toán"**; số điện thoại chỉ ở Danh bạ (cần đăng nhập) | Máy: thử giao diện `chung`, `dang-nhap` |
| 14 | Mọi thay đổi dữ liệu kiểm kê đi qua **`save()`** để có lịch sử; mỗi tài liệu ghi lần lượt; không ghi khi đang vẽ trang | Trợ lý · Máy (gián tiếp): thử giao diện soát lịch sử ghi đúng từng thao tác |
| 15 | **Trước khi báo "xong"**: `npm test`, thử giao diện, đưa lên web, `npm run kiem-tra-web`; nói rõ điều đã làm và điều chưa kiểm được | Trợ lý |
| 16 | **Thông số quản lý** (dung lượng, giới hạn gói, số liệu vận hành) **chỉ tài khoản Quản trị thấy**; tài khoản thường không thấy, máy chủ cũng không trả | Máy: thử giao diện `anh` · Trợ lý: chức năng mới |

## Dự án

Trang **Quản lý tài sản** của Phòng Hành chính, Phân hiệu ĐH FPT Đà Nẵng. Trang tĩnh (HTML + JS thuần) trên Vercel, kết quả kiểm
lưu chung trên Supabase, danh sách tài sản lấy từ file Excel biên bản trong `dữ liệu cập nhật/` (dùng chung cho mọi phần).

- Web: https://quan-ly-tai-san-fptudn.vercel.app (tên cũ kiem-ke-tai-san-sigma.vercel.app vẫn mở được) · Repo: https://github.com/binhtydan9698-ctrl/kiem-ke-tai-san

Gồm 4 phần chính (trang chủ `#trang-chu`):
- **Kiểm kê tài sản 2026** (đang dùng): mọi trang `#tong-quan`, `#don-vi`, `#vi-tri`, `#dv-…`, `#phong-…`, `#xac-minh`,
  `#xuat`, trang một tài sản `#ts-…`, `#ket-qua` / `#ket-qua-lech` (tài sản đã kiểm / lệch số lượng của cả trường),
  `#tong-hop` **Tổng hợp toàn bộ tài sản**; mã trong `web/index.html`.
- **Quản lý mã QR tài sản** (`#ma-qr`, mã trong `web/ma-qr.js`): in tem mã QR (chọn tài sản, chỉnh mẫu tem, xem trước,
  tải PDF / ảnh PNG / Excel, CSV / In ngay) và **Sổ mã QR**. Quét tem bằng nút Quét mã mở thẳng trang tài sản `#ts-<khoá>`
  trong phần Kiểm kê.
- **Lịch sử** (chung cho cả app): `#lich-su` Thao tác trên app (ai làm gì, lúc nào) · `#nhap-so` Nhập sổ (tài sản vào sổ
  khi nào, từ kế toán qua file BBKK hay cán bộ Hành chính ghi nhận phát sinh) · `#ly-lich` / `#ly-lich-<khoá>` Lý lịch tài sản
  (dòng thời gian: bắt đầu sử dụng → vào sổ trên app → mọi thao tác → xoá khỏi BBKK).
- **Chung** (người dùng thêm 15/11/2026, mã trong `web/chung.js`): `#khau-hao` Khấu hao (tài sản đã hết và sắp hết khấu hao
  trong 12 tháng tới, để gom đi thanh lý; Tải Excel danh sách) · `#dau-moi` Đầu mối quản lý tài sản theo sheet (tên, chức vụ,
  email công việc; quy tắc 13) · `#danh-ba` Danh bạ (cần đăng nhập: họ tên, chức vụ, đơn vị, số điện thoại, email, ghi chú; bảng
  `danh_ba`; số điện thoại tự hiện kèm đầu mối khi cùng email / họ tên) · `#quan-ly` Quản lý ứng dụng (`web/dang-nhap.js`: tài
  khoản của tôi, đổi mật khẩu, đăng xuất; quản trị: thêm / khoá thành viên, đặt quyền, đặt lại mật khẩu — nơi phát triển tiếp phần
  quản lý ứng dụng) · `#anh-tai-san` **Ảnh tài sản** (mục thứ 5, người dùng thêm 17/11/2026, mã trong `web/anh.js`: nơi quản lý toàn bộ
  ảnh tài sản, cần đăng nhập).
- Cả app phải **đăng nhập** (quy tắc 4); mỗi dòng tài sản có **nút ⋯** (mã QR + ảnh tài sản, mục "Quyết định khác").
- Đầu trang 2 tầng: logo FPT University (`web/img/logo-fpt-university.png`, về trang chủ) · 4 phần chính [Kiểm kê | Mã QR |
  Lịch sử | Chung] (mỗi phần nhớ trang đang xem dở) · Quét mã · người dùng; tầng dưới là menu con của phần đang mở. Điện thoại:
  thanh dưới cùng [Kiểm kê · Mã QR · Quét mã · Lịch sử · Chung], về trang chủ bằng logo. Trang tài sản, sheet, phòng có nút "In tem mã QR…"
  mở phần Mã QR lọc sẵn (`qrOpen()`); phần Mã QR và Lịch sử có link ngược về Kiểm kê.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm install` | Cài thư viện (lần đầu) |
| `npm test` | Build từ Excel + soát dữ liệu + đối chiếu sheet "Tổng hợp" với các sheet con + chạy thử xuất Excel kế toán (so từng ô, từng byte với file gốc) + mã QR, Sổ mã QR, bảo mật, bộ quy tắc. **Chạy sau mọi thay đổi.** |
| `npm run dev` | Build rồi mở máy chủ xem thử http://localhost:3000 (chạy nền; sửa `web/` thì chạy lại) |
| `npm run day-len-web` | Kiểm tra rồi commit + push riêng thư mục dữ liệu Excel |
| `npm run kiem-tra-web` | Sau khi push: đợi Vercel, soát trang thật + Supabase (chỉ đọc) |
| `npm run sao-luu` | Sao lưu kết quả Supabase (và Danh bạ) về `sao-luu/` (chỉ đọc). Đã bật đăng nhập: người dùng tự đặt tạm `$env:KIEMKE_TEN`, `$env:KIEMKE_MK` khi chạy |
| `npm run thu-giao-dien` | Thử giao diện tự động trên Edge/Chrome chạy ngầm (đầu trang, quét mã, in tem + đọc lại mã, lịch sử, quét liên tục, đổi mã, phòng / phòng ban, kết quả, xuất cho kế toán, Chung, đăng nhập giả, ảnh, mã hoá, trợ năng WCAG 2.2 AA, điện thoại), chế độ chỉ lưu trên máy, KHÔNG đụng Supabase. **Chạy sau mọi thay đổi giao diện.** |
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
2. `npm run build` (`scripts/build.mjs`) đọc Excel → `dist/data/assets.js` (`window.KIEMKE_DATA = {version, file, sheets, rows, phong}`),
   `dist/data/version.json`, `dist/data/goc.xlsx`, chép `web/` → `dist/`; cập nhật Sổ mã QR → `dist/data/so-ma-qr.js`
   (`window.KIEMKE_SO_QR = {capNhat, files, dang: {khoá: [lúc vào sổ, file]}, xoa: {khoá: thông tin lúc còn trong sổ}, chan, sang: {mã cũ: mã mới}}`).
   Mỗi dòng: `[stt, ma, ten, sl, ngay(yyyy-mm-dd), gia, gc(đơn vị), vt(vị trí), key, sheet, dòngExcel, nhómLẻ]`.
   `nhómLẻ` = tên sheet lẻ ("Xem lại phân bổ" / "Xem lại" / "Chưa có ghi chú", theo thứ tự ưu tiên `REVIEW_SHEETS`
   trong `web/excel-rules.js`) hoặc `''`. Tài sản sheet lẻ là tài sản **chưa có vị trí** (chưa rõ vì sao kế toán đưa vào
   sổ, ai mua): trang xếp vào 3 nhóm riêng (id `XLPB`, `XL`, `CBG`), luôn để "Chưa có vị trí" (bỏ qua cột Vị trí Excel,
   chỉ hiện làm gợi ý) cho tới khi cán bộ kiểm trực tiếp rồi phân bổ vào các sheet đơn vị GD … FSC3.
   `phong` = danh mục phòng bổ sung (quy tắc 11).
3. `web/index.html` dựng `ASSETS` từ `KIEMKE_DATA.rows`. Trạng thái kiểm kê trong `S = {rows, xm, units, ps, dm, anh}`:
   - `S.rows[stt]`: kết quả từng tài sản `{tt, nf, hs, phong, dv, cond, sd, note, at, by}` — `cond` = Tình trạng (hư hỏng ra sao,
     `COND`), `sd` = Trạng thái sử dụng (`SUDUNG`: '' Đang sử dụng, kho, sua, muon, cho_tl, da_tl, bg), hai mục TÁCH RIÊNG.
     `dv` = **phòng ban hiện tại** khi cán bộ đổi ở ô "Phòng ban" (mục "Quyết định khác"): `a.unit0` = phòng ban theo Excel,
     `a.unit` (getter) = `dv` hoặc `unit0`; `BY_UNIT` dựng lại trong `refreshRooms()` (chi tiết: web/AGENTS.md).
   - `S.xm[stt]`: mục "Tài sản thất lạc" (`#xac-minh`, hỏi đại diện phòng ban) `{kq, cach, phanhoi, phong}`
   - `S.units[id]`: buổi kiểm của đơn vị · `S.ps[key]`: tài sản phát sinh
   - `S.anh[stt]`: danh sách ảnh của tài sản `{ds: [{p: đường dẫn ảnh, n: ảnh nhỏ, at, by}]}` (col `anh`, khoá Mã TSCĐ như `rows`);
     tệp ảnh nằm ở kho `anh-tai-san` (`ts/<khoá>/…jpg`), không vào file cho kế toán, `npm run sao-luu` chỉ lưu danh sách, không lưu tệp ảnh.
4. Đồng bộ: `save()` so `S` với `LAST` rồi ghi từng tài liệu qua `DB.doc(path).set()`; `listen(col)` nhận thay đổi.
   `web/supabase-db.js` cung cấp `DB` (giả lập API `db` của Claude artifact) trên bảng `kiemke_docs(col, id, data)`.
5. "Xuất cho kế toán" (`web/export.js`) chèn 3 cột kết quả vào cuối mọi sheet danh sách của `data/goc.xlsx` (cột Thực tế để trống) + sheet
   "Tài sản phát sinh"; còn lại giữ nguyên file gốc (quy tắc 6).
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

## Quy tắc chi tiết

Số mục trùng với số trong bảng Quy tắc vàng.

### 1. Tiếng Việt, lời thường

Người dùng là cán bộ hành chính, **không phải lập trình viên**, làm việc bằng **tiếng Việt**: trả lời, giao diện,
chú thích code, thông điệp commit đều bằng tiếng Việt; giải thích bằng lời thường, tránh thuật ngữ khi không cần.

### 2. Hỏi khi cần người dùng quyết, luôn đưa gợi ý

Người dùng dặn 15/11/2026: chỗ nào là quyết định của người dùng (quy tắc, dữ liệu, cách hiểu chưa rõ — vd. kế toán đổi Mã TSCĐ
thì 1 mã QR hay 2 mã QR) thì hỏi, đừng tự chọn. Thấy điều có thể làm tốt hơn thì nêu gợi ý (người dùng đánh giá cao, rất cần),
nhưng chỉ làm gợi ý nào người dùng đồng ý. Lỗi nhỏ thì tự sửa (chỉ hỏi khi quan trọng).

### 3. Dữ liệu chung trên Supabase, lịch sử git

- Không ghi/xoá dữ liệu trên Supabase, không `git push --force`, không xoá lịch sử git khi chưa được người dùng đồng ý rõ.
- Bộ thử giao diện chạy ở chế độ chỉ lưu trên máy (máy soát: không có yêu cầu nào gửi tới Supabase); `npm run kiem-tra-web`,
  `npm run sao-luu`, `npm run theo-doi-supabase` chỉ đọc. Kiểm tra trên web thật thì chỉ đọc, không bấm nút ghi dữ liệu chung.

### 4. Bảo mật, riêng tư, tài khoản đăng nhập

- **Bảo mật và riêng tư: theo `BAO-MAT.md`** (người dùng yêu cầu 15/11/2026, lập từ các thư viện đã cấp phép: ui-ux-pro-max, Supabase).
  Gặp chỗ chưa có quy tắc thì hỏi người dùng, không chọn cách lỏng hơn.
- **Mật khẩu, tài khoản:** KHÔNG BAO GIỜ ghi mật khẩu (kể cả mật khẩu người dùng gửi trong chat), email cá nhân hay khoá
  `service_role` vào repo, file cấu hình, bộ nhớ hay lệnh commit. Tài khoản quản trị do người dùng tự tạo trên màn hình "Tạo tài
  khoản quản trị"; mật khẩu do Supabase Auth giữ. Việc cần tài khoản (sao lưu, kiểm tra) dùng biến môi trường `KIEMKE_TEN` /
  `KIEMKE_MK` người dùng tự đặt tạm khi chạy lệnh. Muốn đổi quyền / bảng đăng nhập: sửa `supabase/dang-nhap.sql` và nhờ người
  dùng chạy lại; trang phải giữ chạy được khi SQL chưa chạy (`trangThai()` → `da_cai:false`).
- `web/config.js` chỉ chứa khoá **publishable/anon** (công khai). Không bao giờ đưa khoá `secret`/`service_role` vào repo.
- Repo (người dùng muốn chuyển sang **riêng tư** 15/11/2026; coi như vẫn có thể bị lộ): không commit `sao-luu/`, `.gemini/`,
  `.env`, dữ liệu cá nhân, danh bạ, mật khẩu hay khoá bí mật.
- **Đăng nhập** (người dùng chốt 15/11/2026: đăng nhập thật qua Supabase Auth, **cả app phải đăng nhập**): bật bằng
  `supabase/dang-nhap.sql` (người dùng tự chạy trong Supabase SQL Editor + tắt "Confirm email"). Chưa chạy thì trang chạy như cũ
  (`DN.cai=false`). Đã chạy: màn hình đăng nhập trước mọi thứ; lần đầu "Tạo tài khoản quản trị"; RLS chỉ cho thành viên
  (`thanh_vien`, không khoá) đọc `kiemke_docs`, `danh_ba`. Quyền (người dùng chốt 15/11/2026): `xem` **Tra cứu** (chỉ xem, trang
  ở chế độ chỉ xem, vẫn ghi lịch sử) · `kiem` **Kiểm kê** (thêm ghi kết quả kiểm kê, phát sinh, thất lạc) · `admin` **Quản trị**
  (toàn quyền: danh bạ, đầu mối, thành viên, khoá dữ liệu; **bắt buộc xác thực 2 bước** — chưa bật thì phải bật ngay sau mật khẩu,
  máy chủ chỉ cho toàn quyền khi phiên đã qua bước 2). Người dùng khác chỉ cần mật khẩu. Máy chủ chặn ghi theo quyền
  (`duoc_ghi(col)`). Tên người kiểm (`ME`) lấy từ tài khoản.
- **Mật khẩu ban đầu** quản trị đặt cho thành viên (Thêm thành viên, Đặt lại mật khẩu) **được toàn chữ số, lặp lại ký tự** (người
  dùng chốt 17/11/2026; vẫn ≥ 12 ký tự, vẫn chặn mật khẩu phổ biến) và **lần đăng nhập đầu bắt buộc đổi** sang mật khẩu riêng theo đủ
  quy tắc (máy chủ chặn đọc / ghi tới khi đổi: `mk_ban_dau`, `con_mk_ban_dau()`). Chỉ thay đổi duy nhất chỗ mật khẩu ban đầu; mọi mật
  khẩu sau đó theo chính sách như cũ (BAO-MAT.md mục C.2).
- **Miễn mã 6 số** (người dùng chốt 17/11/2026, tạm cho tài khoản quản trị phụ; muốn tự đổi qua lại không cần nhờ trợ lý): ô chọn
  "Mã 6 số" (Bắt buộc / Miễn) cho từng tài khoản quản trị ở bảng Thành viên; được miễn thì chỉ cần mật khẩu, vẫn toàn quyền. Chỉ quản
  trị đã qua mã 6 số mới đổi được (máy chủ chặn), có lịch sử. KHÔNG ghi tên tài khoản được miễn vào repo (BAO-MAT.md mục C.5).

### 5. File Excel BBKK là nguồn duy nhất

- Không sửa tay `dist/` (sinh khi build, đã `.gitignore`). Không tự sửa file Excel trừ khi người dùng yêu cầu. (Máy soát: build
  và `npm test` không làm đổi file Excel trong `dữ liệu cập nhật/`.)
- Nhận diện tiêu đề (1 hoặc 2 dòng, ô gộp), dòng TỔNG CỘNG, dòng tên bị xuống dòng và cách tạo `key` nằm DUY NHẤT trong
  `web/excel-rules.js` (`globalThis.KIEMKE_EXCEL`), được cả `scripts/build.mjs`, `scripts/kiem-tra.mjs` (Node) và
  `web/export.js` (trình duyệt) dùng. Đừng chép logic này sang chỗ khác. (Máy soát: không file nào khác tự định nghĩa lại.)
- Tài sản có mặt ở nhiều sheet: build gộp theo `key`, sheet tên "Tổng hợp" được ưu tiên, ô trống lấy từ sheet khác.
  Export điền kết quả vào MỌI lần xuất hiện của tài sản.
- STT của tài sản là số ở cột STT của sheet "Tổng hợp" (đủ và không trùng; nếu thiếu / trùng thì build đánh số lại 1..N và cảnh báo).
- Cột ngày trong file BBKK là **"Ngày bắt đầu SD"**: trên trang gọi là "Ngày bắt đầu sử dụng" (người dùng chốt), không gọi
  "ngày ghi sổ". Dữ liệu vẫn là `ngay` / `r[4]`. (Máy soát: mã trang không có chữ "ngày ghi sổ".)

### 6. Xuất cho kế toán giữ nguyên file BBKK gốc

**File "Xuất cho kế toán" GIỮ NGUYÊN file BBKK gốc (người dùng chốt 16/11/2026):** mọi sheet, ô, công thức, định dạng, ô gộp, độ
rộng cột, chiều cao dòng, vùng lọc, thiết lập in — kể cả cột "Thực tế" có sẵn (để TRỐNG như gốc; số đếm được nằm trong Kết quả
kiểm kê). Mọi thay đổi chỉ gói trong **3 cột cuối** ở mỗi sheet danh sách (Kết quả kiểm kê · Vị trí thực tế · Ghi chú kiểm kê) +
**sheet riêng "Tài sản phát sinh"** ở cuối (giống 3 sheet lẻ: chưa rõ phòng ban, để riêng cho dễ xử lý). `web/export.js` KHÔNG mở
rồi ghi lại cả file bằng thư viện (ExcelJS làm mất độ rộng cột kiểu "D:E", đổi thiết lập in): chỉ đọc file gốc để biết dòng, rồi
chèn ô 3 cột mới thẳng vào XML của sheet. Giữ bằng: `npm test` bước 3 (so từng ô + từng byte, `scripts/so-sanh-excel.js`), thử
giao diện kịch bản `xuat-goc` (bấm đúng nút trên trang sau nhiều thao tác thật). Sửa phần xuất thì mở thử bằng Excel thật.

### 7. Kết quả kiểm lưu theo Mã TSCĐ

**Khoá lưu trên Supabase của `rows` và `xm` là `a.key` (= Mã TSCĐ), không phải STT** (cả `anh`). Ánh xạ qua `docId()` / `localKey()`.
Không đổi cách tạo `key` nếu không kèm bước chuyển dữ liệu cũ trên Supabase (xem skill `du-lieu-ket-qua-supabase`).
(Máy soát: khoá không trùng — `npm test` bước 2; `docId()` ra đúng Mã TSCĐ — thử giao diện `ket-qua`.)

### 8. Mã QR

- **Quy tắc mã QR (người dùng đặt):** mỗi mã QR là đường link `https://quan-ly-tai-san-fptudn.vercel.app/#ts-<a.key>` mở thẳng
  trang của đúng một tài sản trong phần Kiểm kê (không có kiểu "chỉ Mã TSCĐ"). Nội dung mã và cách đọc lại nằm DUY NHẤT trong
  `web/qr-rules.js` (`globalThis.KIEMKE_QR`), dùng chung cho trang và `npm test` (bước 4). Không đổi dạng link, không bỏ
  đường dẫn `#ts-`, không đổi cách tạo `key`: tem đã dán sẽ không còn khớp. Tài sản chưa có Mã TSCĐ thì chưa cấp mã QR.
  (Máy soát ở bước 7: địa chỉ web của tem chỉ nằm trong `web/qr-rules.js`.)
- Tem in mặc định chỉ có tiêu đề, Mã TSCĐ, tên (không in phòng, đơn vị vì có thể thay đổi).

### 9. Sổ mã QR, lệch 1 chữ

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

### 10. Kế toán đổi Mã TSCĐ

**Quy tắc đổi Mã TSCĐ (người dùng chốt 15/11/2026: "chung quy thì nó vẫn là nó"):** kế toán đổi Mã TSCĐ cho cùng một tài sản
thì vẫn là tài sản đó. Sổ mã QR nối mã cũ → mã mới (mã cũ có `sang {ma, luc, cach}`, mã mới có `maCu`; trang có
`KIEMKE_SO_QR.sang {cũ: mới}`, `maMoi()` / `maCuCua()`): tem mang mã cũ vẫn mở tài sản mã mới (1 mã QR, 2 Mã TSCĐ), in tem mới
thì có thêm mã QR mới (2 mã QR, cùng tài sản), lý lịch gộp lịch sử của mã cũ. Build tự nối khi mã mới giống hệt (tên, ngày bắt
đầu sử dụng, nguyên giá) đúng một mã đã rời BBKK; còn lại báo "nghi đổi mã" → hỏi người dùng, đúng thì khai báo trong
`dữ liệu cập nhật/doi-ma-tscd.json` `{"doi":[{"cu","moi","ghiChu"}]}`. Kết quả kiểm trên Supabase KHÔNG tự chuyển sang mã mới:
trang tài sản mã mới hiện kết quả của mã cũ (`ORPHAN`, chỉ đọc) và nút "Dùng kết quả này" (ghi qua `save()`).

### 11. Phòng, danh mục phòng bổ sung

**Danh mục phòng bổ sung `dữ liệu cập nhật/danh-muc-phong.json`** (người dùng gửi ảnh danh sách phòng Gamma 5 tầng, Alpha 13 tầng,
16/11/2026; `scripts/danh-muc-phong.mjs`, build đưa vào `KIEMKE_DATA.phong`, `npm test` soát tầng / trùng): chỉ để **THÊM phòng chưa
có** trên app (0 tài sản cho tới khi có tài sản được chuyển vào). Phòng đã có trên app **tuyệt đối không xoá, không đổi tên**;
danh mục không phải danh sách đầy đủ. Ghi chú phòng (vd. "Cybersecurity Lab") hiện ở trang phòng, thẻ phòng, Tổng hợp — cả phòng
đã có (người dùng chọn). Tên phòng mới dạng `<số> <Tòa>` (vd. "202 Gamma"). Lưới thẻ phòng xếp tầng dưới lên tầng trên, có nhãn "Tầng N".

### 12. Quy tắc "xong"

**Quy tắc "xong" (người dùng chốt 16/11/2026):** phòng / nhóm chỉ hiện "Xong" khi đủ hết hoặc 0/0 (`xong(c)`); còn thiếu, thừa,
chưa tìm thấy thì KHÔNG hiện xong (ghi rõ "N lệch", "N chưa thấy").

### 13. Đầu mối, danh bạ

- Đầu mối dùng chung cho các phần khác: hiện ở trang tài sản, trang sheet, Tài sản thất lạc, Lý lịch, Khấu hao — **nhưng KHÔNG
  đưa vào file "Xuất cho kế toán"** (người dùng dặn: chỉ liên kết hiển thị trên app).
- Đầu mối (Chung › Đầu mối, `S.dm`): chỉ tên, chức vụ, email công việc; số điện thoại để ở Danh bạ (bảng `danh_ba`, chỉ thành
  viên đã đăng nhập đọc được). Cả hai lưu trên Supabase qua app, **không bao giờ** ghi vào repo. `export.js` / `ketQuaKeToan`
  không được đọc `S.dm` hay danh bạ.

### 14. Ghi dữ liệu qua `save()`

- Ghi dữ liệu trên trang: mỗi tài liệu một lần ghi tại một thời điểm (hàng đợi `WR`). Không ghi từ hàm render.
- Mọi thay đổi `S` phải qua `save()` mới có lịch sử thao tác (cách viết: web/AGENTS.md); thao tác nào cũng phải có câu lịch sử.

### 15. Trước khi báo "xong"

1. `npm test` → "✓ Tất cả đều đạt" (bước 6 soát bảo mật: CSP, khoá bí mật / email thật trong repo, mã hoá, SQL; bước 7 soát quy tắc
   trong mã và bảng Quy tắc vàng).
2. Thay đổi giao diện: `npm run thu-giao-dien` → "✓ Giao diện: tất cả đều đạt" (thêm kịch bản vào
   `scripts/thu-giao-dien-kich-ban.js` cho chức năng mới); xem thử bằng `npm run dev` (skill `xem-thu-cuc-bo`).
   Lỗi nhỏ tự tìm thấy thì tự sửa (chỉ hỏi khi quan trọng); gợi ý thì nêu ra và chờ người dùng chọn, không tự làm.
3. Đã push: `npm run kiem-tra-web`.
4. Nói rõ cho người dùng điều gì đã làm, điều gì chưa kiểm tra được.
5. Có quy tắc mới người dùng chốt: thêm vào đúng mục ở đây (kèm ngày); quan trọng thì thêm 1 dòng vào bảng Quy tắc vàng, ghi rõ
   máy kiểm tra ở đâu (thêm bước kiểm tra nếu làm được).

### 16. Thông số quản lý chỉ Quản trị thấy

**Người dùng chốt 17/11/2026** (khi thêm "Dung lượng kho ảnh" ở Chung › Ảnh tài sản, dặn lưu thành quy tắc cho việc tương tự): trang
của quản trị hiện các **thông số để quản lý** — dung lượng đã dùng / còn trống, giới hạn của gói dịch vụ (Supabase miễn phí: 1 GB
tệp), ước tính còn chứa được bao nhiêu, cảnh báo sắp đầy…; tài khoản thường (Tra cứu, Kiểm kê) **không cần, không thấy**.
Làm đủ 2 lớp: (1) trang chỉ vẽ khi `DN.laQuanTri()`; (2) số liệu lấy qua hàm máy chủ chỉ trả cho `la_quan_tri()` (người khác nhận
`null`), chỉ trả con số (không trả tên tệp, đường dẫn, dữ liệu cá nhân). Ghi rõ trên khung "Thông số quản lý — chỉ tài khoản Quản trị
thấy". Thêm thông số mới thì thêm bước thử: quyền thường không thấy, quản trị thấy và số khớp (vd. thử giao diện `anh`).

### Quyết định khác của người dùng (giao diện, chức năng)

- **Bảng tổng quan:** cả 5 ô số liệu đều có nút "Xem →" (người dùng chọn 16/11/2026): Tổng số dòng → `#tong-hop`; Đã kiểm →
  `#ket-qua`; Lệch số lượng → `#ket-qua-lech`; Chưa tìm thấy → `#xac-minh`; Chưa có vị trí → trang phòng "Chưa có vị trí".
- **`#tong-hop` Tổng hợp toàn bộ tài sản** (ô "Tổng số dòng tài sản", người dùng đặt 16/11/2026): bảng gọn chỉ để lướt (bấm dòng
  mở trang tài sản), có **Tải Excel**; 5 nhóm từ trên xuống: Đã kiểm đủ → Lệch số lượng → Chưa tìm thấy → Chưa có vị trí → Chưa kiểm
  (sổ đã ghi phòng) — mỗi tài sản đúng 1 nhóm. Quy luật người dùng đặt: gom cùng tính chất, càng gom càng tốt để dễ lướt bằng mắt:
  Tòa → Phòng (tầng dưới lên tầng trên, số phòng nhỏ đến lớn) → Bộ môn → cùng loại đồ liền nhau (xếp tên bỏ số lượng ở đầu).
- **Đổi phòng ban như đổi số phòng** (người dùng yêu cầu 16/11/2026): ô "Phòng ban" trên dòng tài sản; Phòng Hành chính đang gộp
  tài sản chưa phân bổ về các phòng ban (giống 3 sheet lẻ bên vị trí). Tài sản đi theo nhánh Kiểm theo phòng ban của phòng ban
  mới; trang sheet gốc có mục "Đã chuyển sang phòng ban khác"; file kế toán ghi "Phân bổ về: …" ở Ghi chú kiểm kê (người dùng chọn).
- **Tìm theo STT** (người dùng yêu cầu 16/11/2026) ở mọi ô tìm tài sản: "142" → tài sản STT 142 đứng đầu; "STT 142" / "#142" → chỉ
  đúng STT đó; ô tìm nhanh ở Bảng tổng quan gõ STT + Enter mở thẳng tài sản.
- **Nâng cấp giao diện** (người dùng chọn cả 4, 17/11/2026): chữ nhỏ nhất 13px; điện thoại: nút / ô bấm cao ≥ 44px, việc kiểm lên
  trước (nút Đủ / Không thấy ngay dưới tên tài sản, banner và khung phụ thu gọn, trang một tài sản: tên → phần kiểm → thông tin →
  mã QR nhỏ; máy tính giữ bố cục cũ); thanh tiến độ dính ở trang phòng / phòng ban. Trang luôn đạt chuẩn trợ năng WCAG 2.2 AA
  (thử giao diện `tro-nang`, `tro-nang-dt`). Chi tiết: web/AGENTS.md.
- **Nút ⋯ trên mỗi dòng tài sản** (người dùng thêm 15/11/2026, mã trong `web/anh.js`): hộp mở rộng có mã QR của tài sản (In tem,
  Mở trang tài sản) và **ảnh tài sản** (tối đa 5 ảnh mỗi tài sản, thu nhỏ 1600px trước khi tải lên + ảnh nhỏ 400px), xem ảnh toàn
  màn hình kiểu Messenger (nền mờ, đếm ảnh, tải về / chia sẻ / đóng, mũi tên, dải ảnh nhỏ, vuốt, phím mũi tên). Ảnh ở kho riêng tư
  Supabase Storage `anh-tai-san` (tạo trong `supabase/dang-nhap.sql`): chỉ thành viên xem (đường dẫn có hạn 1 giờ), quyền Kiểm kê /
  Quản trị tải lên, xoá. Chưa bật đăng nhập thì chưa dùng được ảnh (hộp vẫn có mã QR).
- **Chung › Ảnh tài sản `#anh-tai-san`** (người dùng yêu cầu 17/11/2026: giữ ảnh trong nút ⋯ và thêm mục thứ 5 của phần Chung, sau
  Khấu hao, Đầu mối, Danh bạ, Quản lý — "chỗ quản lý toàn bộ ảnh tài sản"): số liệu (tài sản có ảnh, tổng số ảnh, chưa có ảnh — không
  tính công trình, xây lắp, phần mềm), lọc theo sheet, **Có ảnh** (ảnh mới nhất trước hoặc gom theo phòng) / **Chưa có ảnh** (xếp theo
  phòng để đi chụp lần lượt), tìm theo STT / mã / tên / phòng. Thêm, xoá ảnh mở **đúng hộp ⋯** (không viết đường tải lên thứ hai) nên
  quyền, tối đa 5 ảnh, thu nhỏ ảnh, lịch sử giống hệt. Giữ bằng thử giao diện `anh`, `chung`. Quản trị thấy thêm khung **Dung lượng kho
  ảnh** (đã dùng / 1 GB, còn trống ≈ bao nhiêu ảnh, số ảnh / tệp, trung bình mỗi ảnh, giới hạn, cảnh báo ≥ 80%; hàm máy chủ
  `dung_luong_anh()`) — quy tắc 16.
- **Mục đích của kho ảnh** (người dùng nói rõ 17/11/2026, dùng làm căn cứ cho mọi thay đổi phần ảnh): mã tài sản khô khan, ít ai biết
  hình dáng, màu sắc của toàn bộ tài sản; bộ phận mua sắm, kế toán chỉ lo phần việc của họ, không dùng mã cho kiểm kê. Ảnh là **căn cứ
  nhận diện tài sản** cho người quản lý tài sản. Từ nay **cán bộ mua sắm khi mua sẽ tự tải ảnh kèm mã**, người quản lý tài sản lấy
  thông tin từ chính ảnh đó → ưu tiên: ảnh đủ rõ để nhận ra (hình dáng, màu sắc, tem), tải lên dễ cho người không rành máy tính.
- **Kho ảnh sắp đầy** (người dùng dặn 17/11/2026): từ **80%** app tự báo quản trị ở đầu mọi trang (`khoAnhBao()`, "Để sau" ẩn trong
  phiên, tăng thêm 1% thì báo lại) và trang Ảnh tài sản hiện **phương án KHÔNG TỐN KINH PHÍ** theo thứ tự: bớt ảnh thừa (giữ 1–2 ảnh
  rõ nhất mỗi tài sản) → tải lưu trữ về máy / Drive rồi xoá ảnh tài sản đã thanh lý, bàn giao → thu nhỏ ảnh mới (1280 điểm ảnh) →
  chuyển kho sang Cloudflare R2 (miễn phí 10 GB). Không đề xuất gói trả phí trừ khi người dùng hỏi. Giữ bằng thử giao diện `anh`.
