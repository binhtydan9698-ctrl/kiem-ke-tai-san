# Kiểm kê tài sản FPTU ĐN — bản web

Trang kiểm kê tài sản 2026 (Phòng Hành chính): nhiều tổ cùng kiểm trên điện thoại hoặc máy tính, kết quả lưu
chung trên Supabase, danh sách tài sản lấy từ **một file Excel** trong thư mục `dữ liệu cập nhật/`.

- Web: https://kiem-ke-tai-san-sigma.vercel.app
- Mã nguồn: https://github.com/binhtydan9698-ctrl/kiem-ke-tai-san

## Dùng hằng ngày

| Muốn làm | Cách làm |
|---|---|
| Sửa danh sách tài sản | Mở `dữ liệu cập nhật/Kiểm kê tài sản 2026.xlsx`, sửa, **Lưu** |
| Web tự cập nhật mỗi lần lưu Excel | Bấm đúp **`Tự động cập nhật.bat`**, để cửa sổ đó mở |
| Đẩy lên web một lần (không để cửa sổ chạy) | Bấm đúp **`Cập nhật lên web.bat`** sau khi lưu Excel |
| Xem thử trên máy trước khi đẩy | Bấm đúp **`Xem thử trên máy.bat`** → http://localhost:3000 |
| Lấy file cho kế toán | Trên web: **Xuất cho kế toán → Tải file Excel cho kế toán** |

Sau khi đẩy, khoảng 1 phút sau web có dữ liệu mới. Ai đang mở trang sẽ thấy thông báo **"Tải lại trang"**.

### Quy tắc file Excel

- Trang đọc mọi sheet có dòng tiêu đề chứa **Mã TSCĐ** và **Tên TSCĐ**. Cột nhận diện theo **tên tiêu đề**, không theo vị trí:
  `STT`, `Mã TSCĐ`, `Tên TSCĐ`, `Sổ sách` (hoặc `Số lượng`), `Thực tế`, `Ngày bắt đầu SD`, `Nguyên giá`, `Ghi chú` (đơn vị quản lý), `Vị trí`.
- Mỗi tài sản được nhận diện bằng **Mã TSCĐ**. Kết quả đã kiểm gắn với mã, nên thêm, xoá hay đổi thứ tự dòng đều an toàn.
  **Đừng đổi mã của tài sản đã kiểm.**
- Đơn vị mới trong cột `Ghi chú` sẽ tự xuất hiện trên web.
- Chỉ để **một** file `.xlsx` trong thư mục. Nếu có nhiều file, trang dùng file sửa gần nhất.
- Nếu file Excel lỗi (không đọc được), script **không** đẩy lên, nên web vẫn giữ bản cũ.

### File cho kế toán

File tải về là **chính file Excel gốc**, giữ nguyên các sheet, cột và định dạng. Trang chỉ:
- điền cột `Thực tế` / `SL thực tế` (nếu file có cột đó),
- thêm 3 cột cuối: **Kết quả kiểm kê** (Chưa kiểm / Đủ / Thiếu n / Thừa n / Chưa tìm thấy / Xác nhận mất…),
  **Vị trí thực tế**, **Ghi chú kiểm kê** (tình trạng hỏng, ghi chú tại chỗ, câu trả lời của đại diện),
- thêm sheet **Tài sản phát sinh** nếu có tài sản ngoài sổ.

## Cấu trúc thư mục

```
dữ liệu cập nhật/      File Excel nguồn (sửa ở đây)
web/                   Mã nguồn trang
  index.html           Giao diện + logic kiểm kê
  export.js            Xuất Excel cho kế toán (ExcelJS)
  supabase-db.js       Bộ nối Supabase: đọc/ghi + thời gian thực
  config.js            Địa chỉ Supabase + khoá publishable (công khai)
scripts/
  build.mjs            Excel → dist/data/assets.js, chép web/ → dist/
  watch-excel.mjs      Theo dõi thư mục dữ liệu, tự commit + push
  serve.mjs            Máy chủ xem thử cục bộ
supabase/schema.sql    Bảng kiemke_docs (chạy một lần trong Supabase)
vercel.json            Vercel chạy `npm run build`, phục vụ thư mục dist/
```

## Lập trình tiếp (Antigravity IDE hoặc VS Code)

1. **File → Open Folder…** → chọn thư mục `kiem-ke-tai-san`. Trên máy khác thì chạy:
   `git clone https://github.com/binhtydan9698-ctrl/kiem-ke-tai-san.git`
2. Mở Terminal trong IDE:
   ```bash
   npm install
   npm run dev
   ```
   Mở http://localhost:3000. Mỗi lần sửa code, chạy lại `npm run dev` rồi tải lại trang.
3. Sửa xong thì đẩy lên, Vercel sẽ tự triển khai lại:
   ```bash
   git add -A
   git commit -m "Mô tả thay đổi"
   git push
   ```

Xem [AGENTS.md](AGENTS.md) để biết các quy ước quan trọng (cũng là hướng dẫn cho trợ lý AI trong IDE).

## Lưu ý

- Ai có đường link đều xem và ghi được kết quả. Danh sách tài sản nằm trong mã nguồn công khai.
- Xoá sạch kết quả để kiểm lại từ đầu: vào Supabase → **Table Editor → kiemke_docs**, xoá các dòng.
- Gói Supabase miễn phí tạm dừng project nếu 7 ngày không ai dùng. Khi đó vào Supabase bấm **Restore project**.
- Bản trên Claude (artifact) và bản web này dùng hai kho dữ liệu khác nhau, không đồng bộ với nhau.
