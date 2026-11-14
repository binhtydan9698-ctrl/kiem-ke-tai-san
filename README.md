# Kiểm kê tài sản FPTU ĐN — bản web

Trang kiểm kê tài sản 2026 (Phòng Hành chính): nhiều tổ cùng kiểm trên điện thoại hoặc máy tính, kết quả lưu
chung trên Supabase, danh sách tài sản lấy từ **một file Excel** trong thư mục `dữ liệu cập nhật/`.

- Web: https://kiem-ke-tai-san-sigma.vercel.app
- Mã nguồn: https://github.com/binhtydan9698-ctrl/kiem-ke-tai-san

## Dùng hằng ngày

| Muốn làm | Cách làm |
|---|---|
| Sửa danh sách tài sản | Mở `dữ liệu cập nhật/BBKK_FPTU_2026_ver01_capnhat.xlsx`, sửa, **Lưu** |
| Web tự cập nhật mỗi lần lưu Excel | Bấm đúp **`Tự động cập nhật.bat`**, để cửa sổ đó mở |
| Đẩy lên web một lần (không để cửa sổ chạy) | Bấm đúp **`Cập nhật lên web.bat`** sau khi lưu Excel |
| Xem thử trên máy trước khi đẩy | Bấm đúp **`Xem thử trên máy.bat`** → http://localhost:3000 |
| Kiểm tra file Excel (đối chiếu sheet Tổng hợp với các sheet con…) | Bấm đúp **`Kiểm tra dữ liệu.bat`**: dòng ✗ là cần sửa trong Excel, dòng ! chỉ là ghi chú |
| Lấy file cho kế toán | Trên web: **Xuất cho kế toán → Tải file Excel cho kế toán** |

Sau khi đẩy, khoảng 1 phút sau web có dữ liệu mới. Ai đang mở trang sẽ thấy thông báo **"Tải lại trang"**.

### Quy tắc file Excel

File hiện tại là biên bản gốc 2026: mỗi đơn vị một sheet (GD, AI, MC, Phòng CNTT…), cộng với sheet **Xem lại** và sheet **Tổng hợp**.

- Trang đọc **mọi sheet** có dòng tiêu đề chứa **Mã TSCĐ** và **Tên TSCĐ**. Tiêu đề 1 dòng hay 2 dòng đều được
  (VD: "Số lượng" ở trên, bên dưới tách thành "Sổ sách" và "Thực tế"). Cột nhận diện theo **tên tiêu đề**, không theo vị trí:
  `STT`, `Mã TSCĐ`, `Tên TSCĐ`, `Sổ sách`, `Thực tế`, `Ngày bắt đầu SD`, `Nguyên giá`, `Ghi chú` (đơn vị quản lý), `Vị trí`.
- Cùng một tài sản có mặt ở nhiều sheet được **gộp theo Mã TSCĐ**. Sheet **Tổng hợp là gốc**; ô nào ở Tổng hợp để trống
  (VD: Vị trí) thì trang lấy từ sheet đơn vị. Nếu hai sheet ghi khác nhau, trang dùng số ở Tổng hợp và
  `Cập nhật lên web.bat` sẽ liệt kê các ô lệch để bạn biết.
  → **Thêm tài sản mới:** thêm vào Tổng hợp (và sheet đơn vị nếu muốn). **Sửa thông tin:** sửa ở Tổng hợp,
  hoặc chỉ ở sheet đơn vị nếu ô đó ở Tổng hợp đang trống.
- Mỗi tài sản được nhận diện bằng **Mã TSCĐ**. Kết quả đã kiểm gắn với mã, nên thêm, xoá hay đổi thứ tự dòng đều an toàn.
  **Đừng đổi mã của tài sản đã kiểm.**
- Dòng **TỔNG CỘNG** và dòng chỉ có phần tên bị xuống dòng (không mã, không số lượng, không nguyên giá) không bị tính là tài sản.
  Phần tên đó được nối vào tài sản có STT liền trước.
- Đơn vị mới trong cột `Ghi chú` sẽ tự xuất hiện trên web.
- Chỉ để **một** file `.xlsx` trong thư mục. Nếu có nhiều file, trang dùng file sửa gần nhất.
- Nếu file Excel lỗi (không đọc được), script **không** đẩy lên, nên web vẫn giữ bản cũ.

### File cho kế toán

File tải về là **chính file Excel gốc**, giữ nguyên các sheet, cột, công thức và định dạng. Ở **mọi sheet** danh sách
(từng đơn vị, Xem lại, Tổng hợp), trang chỉ:
- điền cột `Thực tế` (nếu file có cột đó; tài sản dùng chung chia nhiều đơn vị chỉ điền ở dòng có số sổ sách khớp),
- thêm 3 cột cuối: **Kết quả kiểm kê** (Chưa kiểm / Đủ / Thiếu n / Thừa n / Chưa tìm thấy / Xác nhận mất…),
  **Vị trí thực tế**, **Ghi chú kiểm kê** (tình trạng hỏng, ghi chú tại chỗ, câu trả lời của đại diện),
- thêm sheet **Tài sản phát sinh** nếu có tài sản ngoài sổ.

## Cấu trúc thư mục

```
dữ liệu cập nhật/      File Excel nguồn (sửa ở đây)
web/                   Mã nguồn trang
  index.html           Giao diện + logic kiểm kê
  excel-rules.js       Quy tắc đọc Excel (tiêu đề, dòng tổng, khoá) — dùng chung cho build và xuất
  export.js            Xuất Excel cho kế toán (ExcelJS)
  supabase-db.js       Bộ nối Supabase: đọc/ghi + thời gian thực
  config.js            Địa chỉ Supabase + khoá publishable (công khai)
  AGENTS.md            Quy ước riêng cho mã nguồn trang (cho trợ lý AI)
scripts/
  build.mjs            Excel → dist/data/assets.js, chép web/ → dist/
  kiem-tra.mjs         npm test: soát dữ liệu + chạy thử xuất Excel kế toán
  kiem-tra-web.mjs     Kiểm tra trang trên Vercel sau khi đẩy
  sao-luu-supabase.mjs Sao lưu kết quả kiểm về sao-luu/
  cau-hinh.mjs         Địa chỉ web + đọc cấu hình Supabase cho các script
  watch-excel.mjs      Theo dõi thư mục dữ liệu, tự commit + push
  excel-file.mjs       Tìm file Excel trong thư mục dữ liệu
  serve.mjs            Máy chủ xem thử cục bộ
supabase/schema.sql    Bảng kiemke_docs (chạy một lần trong Supabase)
.agents/skills/        Quy trình cho trợ lý AI của Antigravity
.vscode/               F5, Run Task, cài đặt editor
AGENTS.md              Quy tắc chung cho trợ lý AI
vercel.json            Vercel chạy `npm run build`, phục vụ thư mục dist/
```

## Lập trình tiếp trong Antigravity IDE

### Mở dự án

1. Mở **Antigravity IDE** → **File → Open Folder…** → chọn `C:\Users\OS\Desktop\kiem-ke-tai-san`
   (đúng thư mục này, không phải thư mục cha). Trên máy khác: `git clone https://github.com/binhtydan9698-ctrl/kiem-ke-tai-san.git`.
2. Lần đầu: mở Terminal (<kbd>Ctrl</kbd>+<kbd>`</kbd>) → `npm install`.

### Những gì đã chuẩn bị sẵn cho Antigravity

| File | Tác dụng |
|---|---|
| `AGENTS.md`, `web/AGENTS.md` | Quy tắc trợ lý AI luôn đọc: dự án làm gì, lệnh nào, điều gì không được làm (khoá Supabase, repo công khai…) |
| `.agents/skills/` | 4 quy trình trợ lý AI tự dùng khi phù hợp: **xem-thu-cuc-bo**, **cap-nhat-du-lieu-excel**, **trien-khai-len-web**, **du-lieu-ket-qua-supabase** |
| `.vscode/launch.json` | Bấm **F5** → build và mở trang xem thử trên trình duyệt |
| `.vscode/tasks.json` | **Terminal → Run Task…**: Kiểm tra, Build, Xem thử, Đẩy dữ liệu Excel, Kiểm tra trang Vercel, Sao lưu Supabase |
| `.vscode/settings.json`, `.editorconfig` | UTF-8, thụt lề 2 dấu cách, ẩn `dist/`, `node_modules/` khỏi tìm kiếm |

### Cách nhờ trợ lý AI (Agent) trong Antigravity

Mở khung **Agent** ở thanh bên, gõ yêu cầu bằng tiếng Việt, ví dụ:
- "Thêm nút in biên bản cho từng đơn vị, xem thử rồi đẩy lên web."
- "Tôi vừa sửa file Excel, đưa lên web giúp tôi."
- "Sao lưu kết quả kiểm kê hôm nay."

Trợ lý đã được dặn: chạy `npm test` sau mỗi thay đổi, hỏi bạn trước khi đẩy lên GitHub hay sửa/xoá dữ liệu Supabase.

### Lệnh hay dùng

| Lệnh | Việc |
|---|---|
| `npm test` | Kiểm tra toàn bộ: đọc Excel, soát dữ liệu, chạy thử xuất file kế toán |
| `npm run dev` | Xem thử ở http://localhost:3000 (sửa code thì chạy lại) |
| `npm run kiem-tra-web` | Sau khi đẩy lên: kiểm tra trang trên Vercel |
| `npm run sao-luu` | Sao lưu kết quả kiểm kê về thư mục `sao-luu/` (không lên GitHub) |

Đẩy thay đổi code lên (Vercel tự triển khai lại):
```bash
git add -A
git commit -m "Mô tả thay đổi"
git push
```

> **Lưu ý:** bản xem thử trên máy dùng **chung dữ liệu Supabase** với trang thật. Bấm thử "Đủ"/"Không thấy" sẽ hiện
> ngay trên máy của các tổ khác. Lỡ bấm thì bấm "Kiểm lại" để trả về như cũ.

## Lưu ý

- Ai có đường link đều xem và ghi được kết quả. Danh sách tài sản nằm trong mã nguồn công khai.
- Xoá sạch kết quả để kiểm lại từ đầu: vào Supabase → **Table Editor → kiemke_docs**, xoá các dòng.
- Gói Supabase miễn phí tạm dừng project nếu 7 ngày không ai dùng. Khi đó vào Supabase bấm **Restore project**.
- Bản trên Claude (artifact) và bản web này dùng hai kho dữ liệu khác nhau, không đồng bộ với nhau.
