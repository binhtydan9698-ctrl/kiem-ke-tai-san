# Quản lý tài sản FPTU ĐN — bản web

Trang Quản lý tài sản (Phòng Hành chính) gồm 2 phần, chọn ở trang chủ hoặc nút tên ở góc trái:

- **Kiểm kê tài sản 2026** (đang dùng): nhiều tổ cùng kiểm trên điện thoại hoặc máy tính, kết quả lưu chung trên
  Supabase, danh sách tài sản lấy từ **một file Excel** trong thư mục `dữ liệu cập nhật/`.
- **Quản lý mã QR tài sản**: in tem mã QR cho từng tài sản; quét tem bằng nút **Quét mã** mở thẳng tài sản đó.
  **Sổ mã QR** (`dữ liệu cập nhật/so-ma-qr.json`) giữ mọi mã đã cấp, kể cả tài sản đã bị xoá khỏi file BBKK. Không xoá file này.
  Kế toán đổi Mã TSCĐ cho cùng một tài sản thì vẫn là tài sản đó: tem mang mã cũ vẫn mở đúng tài sản, lý lịch gộp cả mã cũ
  (tự nối khi thông tin giống hệt; trường hợp khác khai báo trong `dữ liệu cập nhật/doi-ma-tscd.json`).

- **Lịch sử** (chung cho cả app): thao tác trên app, nhập sổ (tài sản vào sổ khi nào, từ kế toán hay cán bộ Hành chính),
  lý lịch từng tài sản.

Đầu trang có 3 phần chính **Kiểm kê · Mã QR · Lịch sử** (trên điện thoại nằm ở thanh dưới cùng, nút Quét mã ở giữa).

- Web: https://quan-ly-tai-san-fptudn.vercel.app
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
| In tem mã QR | Trên web: **Quản lý mã QR tài sản** → chọn tài sản, chỉnh tem → **Tải PDF để in** (nhà in, máy in tem), ảnh PNG, Excel/CSV (phần mềm máy in tem) hoặc **In ngay** |
| Quét tem để kiểm | Bấm **Quét mã**, đưa tem vào camera → trang mở thẳng tài sản đó để bấm Đủ / Không thấy |
| Đứng trong phòng quét liên tục | Trang phòng → **Quét liên tục ở phòng này**: quét tem nào ghi Đủ tem đó; tài sản phòng khác, số lượng > 1 thì hỏi trước; mỗi món có Hoàn tác |
| Tài sản bấm "Không thấy" (hoặc đếm thiếu) nay đã tìm thấy | **Kiểm kê → Tài sản thất lạc** → **Đã tìm thấy…**: chọn tổng số đã tìm thấy, phòng, phòng ban → **Ghi nhận**; tài sản tự về đúng phòng, phòng ban (thấy đủ tính Đủ, thấy một phần tính Thiếu) |
| Ghi tài sản cất kho, cho mượn, chờ thanh lý, đã bàn giao… | Dòng tài sản → **Chi tiết, ghi chú** → ô **Trạng thái sử dụng** (tách riêng với Tình trạng hư hỏng) |
| Biết khi Supabase bị tạm dừng | GitHub tự đọc thử mỗi sáng 8h; không đọc được thì gửi mail báo (tới email nhận thông báo của tài khoản GitHub) |
| Gom tài sản hết khấu hao đi thanh lý | **Chung → Khấu hao**: chọn số năm khấu hao (đang tạm tính), xem tài sản đã hết và sắp hết trong 12 tháng tới, **Tải Excel danh sách** |
| Xem mã QR, thêm ảnh cho một tài sản | Bấm nút **⋯** trên dòng tài sản: mã QR (In tem, Mở trang tài sản) và ảnh (tối đa 5 ảnh, **Thêm ảnh** / **Chụp ảnh**); bấm ảnh để xem toàn màn hình, vuốt hoặc bấm mũi tên sang ảnh khác, tải về, chia sẻ. Cần bật đăng nhập; quyền Tra cứu chỉ xem |
| Cán bộ mua sắm, giảng viên tạo tài sản vừa mua (kèm ảnh) | Quản trị cấp quyền **Tạo tài sản mới** và đặt **Nhóm (Tạo bởi)** ở Chung → Quản lý; người đó vào **Chung → Tài sản mới** → **Tạo tài sản mới** → thêm ảnh. Chỉ sửa được tài sản do mình tạo; khi file BBKK có Mã TSCĐ trùng thì tự **Đã vào sổ**, ảnh hiện ở tài sản trong sổ; chưa vào sổ thì xuất ở sheet "Tài sản phát sinh" (cột Nguồn) |
| Xem, quản lý ảnh của mọi tài sản | **Chung → Ảnh tài sản**: tài sản có ảnh (ảnh mới nhất trước hoặc theo phòng), danh sách **Chưa có ảnh** xếp theo phòng để đi chụp lần lượt, tìm theo STT / mã / tên / phòng; **Thêm, xoá ảnh** mở đúng hộp ⋯ (cần bật đăng nhập) |
| Chuyển tài sản sang phòng ban khác (vd. tài sản Phòng Hành chính đang gộp) | Dòng tài sản → ô **Phòng ban** (dưới ô Phòng thực tế): chọn phòng ban mới, tài sản sang trang của phòng ban đó; file cho kế toán ghi "Phân bổ về: …" |
| Xem toàn bộ tài sản gom theo kết quả, tòa, phòng, bộ môn | **Bảng tổng quan** → ô Tổng số dòng tài sản → **Xem →** (Tổng hợp toàn bộ tài sản, có **Tải Excel**) |
| Thêm phòng chưa có trên app | Thêm vào `dữ liệu cập nhật/danh-muc-phong.json` (nhờ trợ lý AI), đẩy lên web; phòng mới hiện 0 tài sản, "Xong" |
| Biết liên hệ ai về tài sản của một phòng ban, bộ môn | **Chung → Đầu mối**: nhập tên, chức vụ, email công việc cho từng sheet; đầu mối hiện ở trang tài sản, trang sheet, Tài sản thất lạc (không đưa vào file cho kế toán) |
| Lưu số điện thoại, email của cán bộ liên quan | **Chung → Danh bạ** (chỉ người đã đăng nhập xem được; người có quyền sửa mới thêm, sửa) |
| Đăng nhập, đổi mật khẩu, quản lý thành viên | Bật một lần bằng `supabase/dang-nhap.sql` (Supabase SQL Editor) + tắt "Confirm email"; sau đó **Chung → Quản lý**: đổi mật khẩu, xác thực 2 bước, đăng xuất (cả trên mọi thiết bị); quản trị thêm, khoá thành viên, đặt quyền, đặt lại mật khẩu. Mật khẩu ban đầu quản trị đặt được toàn số (vd. 111111111111); người nhận đăng nhập lần đầu **bắt buộc đổi** sang mật khẩu riêng |
| Bảo mật, riêng tư | Bộ quy tắc **`BAO-MAT.md`** (việc quản trị làm một lần ở mục F, xử lý sự cố ở mục G). Khoá danh sách tài sản và file Excel gốc sau đăng nhập: Chung → Quản lý → **Khoá dữ liệu tài sản** |
| Thử giao diện tự động | `npm run thu-giao-dien` (không đụng dữ liệu chung) |
| Xem ai đã làm gì, lúc nào | Trên web: **Lịch sử → Thao tác trên app** (Của tôi / Mọi người, lọc theo loại, tìm theo mã; **Tải Excel**) |
| Tài sản vào sổ khi nào, từ đâu | **Lịch sử → Nhập sổ** (kế toán qua file BBKK hay cán bộ Hành chính ghi nhận; **Tải Excel**) |
| Tra một tài sản có từ khi nào, đã làm gì | **Lịch sử → Lý lịch tài sản**, hoặc nút **Lý lịch tài sản** ở trang của tài sản |

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

File tải về là **chính file Excel gốc, giữ nguyên hoàn toàn** (mọi sheet, ô, công thức, định dạng, độ rộng cột, kể cả cột
`Thực tế` có sẵn — để trống như gốc). Mọi thay đổi chỉ gói trong:
- 3 cột cuối ở **mọi sheet** danh sách (từng đơn vị, Xem lại, Tổng hợp): **Kết quả kiểm kê** (Chưa kiểm / Đủ / Thiếu n (thực tế
  x/y) / Thừa n / Chưa tìm thấy / Xác nhận mất…), **Vị trí thực tế**, **Ghi chú kiểm kê** (tình trạng hỏng, trạng thái sử dụng,
  "Phân bổ về: …" khi đổi phòng ban, ghi chú tại chỗ, câu trả lời của đại diện),
- sheet riêng **Tài sản phát sinh** ở cuối file nếu có tài sản ngoài sổ.

`npm test` so từng ô, từng byte file xuất với file gốc để giữ đúng quy tắc này (quy tắc trong `AGENTS.md`).

## Cấu trúc thư mục

```
dữ liệu cập nhật/      File Excel nguồn (sửa ở đây)
web/                   Mã nguồn trang
  index.html           Giao diện + logic kiểm kê
  excel-rules.js       Quy tắc đọc Excel (tiêu đề, dòng tổng, khoá) — dùng chung cho build và xuất
  export.js            Xuất Excel cho kế toán (ExcelJS)
  anh.js               Nút ⋯ trên dòng tài sản: mã QR + ảnh tài sản, xem ảnh toàn màn hình
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
AGENTS.md              Bộ quy tắc cho trợ lý AI (bảng "Quy tắc vàng" ở đầu)
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
| `AGENTS.md`, `web/AGENTS.md` | Bộ quy tắc trợ lý AI luôn đọc. Đầu `AGENTS.md` là bảng **Quy tắc vàng** (15 điều không bao giờ được làm sai, mỗi điều ghi rõ máy kiểm tra ở đâu hay trợ lý tự giữ); `npm test` bước 7 soát bảng này |
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
