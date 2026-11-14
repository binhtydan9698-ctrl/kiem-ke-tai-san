# Hướng dẫn cho trợ lý lập trình (AGENTS.md)

Antigravity IDE (và các trợ lý khác) tự đọc file này cho mọi thao tác trong dự án.
Quy ước riêng cho mã nguồn trang: [web/AGENTS.md](web/AGENTS.md). Quy trình từng việc: `.agents/skills/`.

## Dự án

Trang **Quản lý tài sản** của Phòng Hành chính, Phân hiệu ĐH FPT Đà Nẵng, gồm 2 phần ngang hàng (trang chủ `#trang-chu`
chọn phần, nút tên ở góc trái chuyển phần):
- **Kiểm kê tài sản 2026** (đang dùng): mọi trang `#tong-quan`, `#don-vi`, `#vi-tri`, `#dv-…`, `#phong-…`, `#xac-minh`,
  `#xuat`, `#lich-su`; mã trong `web/index.html`.
- **Quản lý mã QR tài sản** (`#ma-qr`, mã trong `web/ma-qr.js`): in tem mã QR (chọn tài sản, chỉnh mẫu tem, xem trước,
  tải PDF / ảnh PNG / Excel, CSV / In ngay). Quét tem bằng nút Quét mã mở thẳng trang tài sản `#ts-<khoá>` trong phần Kiểm kê.

Trang tĩnh (HTML + JS thuần) trên Vercel, kết quả kiểm lưu chung trên Supabase, danh sách tài sản lấy từ file Excel
biên bản trong `dữ liệu cập nhật/` (dùng chung cho cả 2 phần).

- Web: https://kiem-ke-tai-san-sigma.vercel.app · Repo (công khai): https://github.com/binhtydan9698-ctrl/kiem-ke-tai-san
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

## Skills trong `.agents/skills/`

- `xem-thu-cuc-bo` — chạy và kiểm tra trang trên máy
- `cap-nhat-du-lieu-excel` — thay/sửa file Excel và đưa lên web
- `trien-khai-len-web` — commit, push, xác nhận Vercel
- `du-lieu-ket-qua-supabase` — xem/sao lưu/chuyển đổi kết quả kiểm trên Supabase

## Luồng dữ liệu

1. `dữ liệu cập nhật/*.xlsx` là nguồn duy nhất của danh sách tài sản (biên bản gốc: mỗi đơn vị một sheet + "Xem lại" + "Tổng hợp").
2. `npm run build` (`scripts/build.mjs`) đọc Excel → `dist/data/assets.js` (`window.KIEMKE_DATA = {version, file, sheets, rows}`),
   `dist/data/version.json`, `dist/data/goc.xlsx`, chép `web/` → `dist/`.
   Mỗi dòng: `[stt, ma, ten, sl, ngay(yyyy-mm-dd), gia, gc(đơn vị), vt(vị trí), key, sheet, dòngExcel, nhómLẻ]`.
   `nhómLẻ` = tên sheet lẻ ("Xem lại phân bổ" / "Xem lại" / "Chưa có ghi chú", theo thứ tự ưu tiên `REVIEW_SHEETS`
   trong `web/excel-rules.js`) hoặc `''`. Tài sản sheet lẻ là tài sản **chưa có vị trí** (chưa rõ vì sao kế toán đưa vào
   sổ, ai mua): trang xếp vào 3 nhóm riêng (id `XLPB`, `XL`, `CBG`), luôn để "Chưa có vị trí" (bỏ qua cột Vị trí Excel,
   chỉ hiện làm gợi ý) cho tới khi cán bộ kiểm trực tiếp rồi phân bổ vào các sheet đơn vị GD … FSC3.
3. `web/index.html` dựng `ASSETS` từ `KIEMKE_DATA.rows`. Trạng thái kiểm kê trong `S = {rows, xm, units, ps}`:
   - `S.rows[stt]`: kết quả từng tài sản `{tt, nf, hs, phong, cond, note, at, by}`
   - `S.xm[stt]`: mục "Tài sản thất lạc" (`#xac-minh`, hỏi đại diện phòng ban) `{kq, cach, phanhoi, phong}`
   - `S.units[id]`: buổi kiểm của đơn vị · `S.ps[key]`: tài sản phát sinh
4. Đồng bộ: `save()` so `S` với `LAST` rồi ghi từng tài liệu qua `DB.doc(path).set()`; `listen(col)` nhận thay đổi.
   `web/supabase-db.js` cung cấp `DB` (giả lập API `db` của Claude artifact) trên bảng `kiemke_docs(col, id, data)`.
5. "Xuất cho kế toán" (`web/export.js`) mở `data/goc.xlsx`, điền cột Thực tế và thêm 3 cột kết quả ở mọi sheet danh sách.
6. Lịch sử thao tác (trang `#lich-su`): `save()` → `logChanges()` so `S` với lần lưu trước, ghi mỗi thao tác 1 bản ghi
   `col='log'` (ai, máy nào, lúc nào, trước → sau) qua hàng đợi `WR`, kèm bản sao 1000 dòng trong localStorage.
   Trang chỉ đọc `log` khi mở trang Lịch sử (`DB.recent()`), không tải lúc mở trang.

## Quy ước BẮT BUỘC

- **Khoá lưu trên Supabase của `rows` và `xm` là `a.key` (= Mã TSCĐ), không phải STT.** Ánh xạ qua `docId()` / `localKey()`.
  Không đổi cách tạo `key` nếu không kèm bước chuyển dữ liệu cũ trên Supabase (xem skill `du-lieu-ket-qua-supabase`).
- Nhận diện tiêu đề (1 hoặc 2 dòng, ô gộp), dòng TỔNG CỘNG, dòng tên bị xuống dòng và cách tạo `key` nằm DUY NHẤT trong
  `web/excel-rules.js` (`globalThis.KIEMKE_EXCEL`), được cả `scripts/build.mjs`, `scripts/kiem-tra.mjs` (Node) và
  `web/export.js` (trình duyệt) dùng. Đừng chép logic này sang chỗ khác.
- Tài sản có mặt ở nhiều sheet: build gộp theo `key`, sheet tên "Tổng hợp" được ưu tiên, ô trống lấy từ sheet khác.
  Export điền kết quả vào MỌI lần xuất hiện của tài sản.
- **Tem mã QR đã in chứa `https://kiem-ke-tai-san-sigma.vercel.app/#ts-<a.key>`** (hoặc chỉ `a.key`). Nội dung mã và cách
  đọc lại nằm DUY NHẤT trong `web/qr-rules.js` (`globalThis.KIEMKE_QR`), dùng chung cho trang và `npm test` (bước 4 tạo mã
  cho mọi tài sản rồi giải mã lại). Không đổi dạng link, không bỏ đường dẫn `#ts-`, không đổi cách tạo `key`: tem đã dán
  sẽ không còn khớp.
- Không sửa tay `dist/` (sinh khi build, đã `.gitignore`). Không tự sửa file Excel trừ khi người dùng yêu cầu.
- `web/config.js` chỉ chứa khoá **publishable/anon** (công khai). Không bao giờ đưa khoá `secret`/`service_role` vào repo.
- Repo **công khai**: không commit `sao-luu/`, `.gemini/`, `.env`, dữ liệu cá nhân hay khoá bí mật.
- Không ghi/xoá dữ liệu trên Supabase, không `git push --force`, không xoá lịch sử git khi chưa được người dùng đồng ý rõ.
- Ghi dữ liệu trên trang: mỗi tài liệu một lần ghi tại một thời điểm (hàng đợi `WR`). Không ghi từ hàm render.

## Trước khi báo "xong"

1. `npm test` → "✓ Tất cả đều đạt".
2. Thay đổi giao diện: xem thử bằng `npm run dev` (skill `xem-thu-cuc-bo`).
3. Đã push: `npm run kiem-tra-web`.
4. Nói rõ cho người dùng điều gì đã làm, điều gì chưa kiểm tra được.
