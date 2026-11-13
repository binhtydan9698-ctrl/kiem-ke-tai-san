# Hướng dẫn cho trợ lý lập trình (AGENTS.md)

Dự án: trang kiểm kê tài sản tĩnh (HTML + JS thuần, không framework), triển khai trên Vercel,
dữ liệu chung trên Supabase. Người dùng làm việc bằng **tiếng Việt**; giao diện và chú thích viết tiếng Việt.

## Luồng dữ liệu

1. `dữ liệu cập nhật/*.xlsx` là nguồn duy nhất của danh sách tài sản.
2. `npm run build` (`scripts/build.mjs`) đọc Excel và sinh `dist/data/assets.js`
   (`window.KIEMKE_DATA = {version, file, rows}`), `dist/data/version.json`, `dist/data/goc.xlsx`, rồi chép `web/` → `dist/`.
   Mỗi dòng: `[stt, ma, ten, sl, ngay(yyyy-mm-dd), gia, gc(đơn vị), vt(vị trí), key, sheet, dòngExcel]`.
3. `web/index.html` dựng `ASSETS` từ `KIEMKE_DATA.rows`. Trạng thái kiểm kê nằm trong `S = {rows, xm, units, ps}`:
   - `S.rows[stt]`: kết quả từng tài sản `{tt, nf, hs, phong, cond, note, at, by}`
   - `S.xm[stt]`: hỏi đại diện `{kq, cach, phanhoi, phong}`
   - `S.units[id]`: thông tin buổi kiểm của đơn vị · `S.ps[key]`: tài sản phát sinh
4. Đồng bộ: `save()` so sánh `S` với `LAST` rồi ghi từng tài liệu qua `DB.doc(path).set()`; `listen(col)` nhận thay đổi.
   `web/supabase-db.js` cung cấp `DB` (giả lập API `db` của Claude artifact) trên bảng `kiemke_docs(col, id, data)`.

## Quy ước BẮT BUỘC

- **Khoá lưu trên máy chủ của `rows` và `xm` là `a.key` (= Mã TSCĐ), không phải STT.** Ánh xạ qua `docId()` / `localKey()`.
  Không đổi cách tạo `key` nếu không viết kèm bước chuyển dữ liệu cũ trên Supabase.
- Cách nhận diện tiêu đề và tạo `key` phải **giống hệt nhau** ở `scripts/build.mjs` và `web/export.js`.
  Sửa một bên thì sửa cả bên kia.
- Không sửa tay `dist/`; thư mục này sinh khi build và đã nằm trong `.gitignore`.
- `web/config.js` chỉ chứa khoá **publishable/anon** (công khai). Không bao giờ đưa khoá `secret`/`service_role` vào repo.
- Thư viện ngoài nạp từ CDN với phiên bản cố định (supabase-js 2.118.0, exceljs 4.4.0). Không dùng tag `@latest`.
- Ghi dữ liệu: mỗi tài liệu chỉ một lần ghi tại một thời điểm (hàng đợi `WR` trong index.html). Không ghi từ hàm render.

## Kiểm tra trước khi đẩy

```bash
npm run build          # phải in "Xong: N tài sản…"
npm run dev            # mở http://localhost:3000 và thử: kiểm 1 món, xem tab Xuất cho kế toán, tải file Excel
```
