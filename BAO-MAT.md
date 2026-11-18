# Bộ quy tắc bảo mật và riêng tư — Quản lý tài sản

Lập ngày 15/11/2026 theo yêu cầu của người quản trị (Phòng Hành chính, FPTU Đà Nẵng). Áp dụng cho mọi thay đổi trong dự án,
mọi trợ lý lập trình (Claude, Antigravity…) và mọi người quản trị trang. Gặp chỗ quy tắc này chưa nói tới thì **hỏi người quản trị**,
không tự chọn cách lỏng hơn.

## A. Nguồn của bộ quy tắc

Lấy từ các thư viện, kho mã đã được cấp phép dùng trong dự án:

| Nguồn | Giấy phép | Phần dùng |
|---|---|---|
| `ui-ux-pro-max` 2.15.0 (`.claude/skills/ui-ux-pro-max/data`) | MIT | `ux-guidelines.csv` #107 *Accessible Authentication* (cho dán mật khẩu, dùng trình quản lý mật khẩu), #60 *Password Visibility* (nút hiện mật khẩu), #58 *Autofill Support* (khai báo `autocomplete` đúng), #33 / #44 / #80 (báo lỗi rõ, đọc được bằng trình đọc màn hình `role="alert"`, có cách xử lý tiếp); `stacks/*.csv` mục *Security*: làm sạch chữ người dùng nhập trước khi hiển thị, dùng chính sách CSP, chỉ chạy HTTPS, kiểm tra dữ liệu đầu vào, không để khoá bí mật trong mã chạy ở trình duyệt, chặn trang ở cổng vào (navigation guard) |
| Supabase: Auth, Postgres RLS, `supabase-js` 2.118.0 (thư viện app đang dùng) | MIT / Apache-2.0 | Cơ chế bảo mật của chính thư viện: RLS trên mọi bảng; khoá *publishable* là công khai, khoá *service_role* không bao giờ ra trình duyệt; hàm `security definer` phải cố định `search_path` và tự kiểm tra quyền; xác thực 2 bước TOTP và mức xác thực `aal2`; mật khẩu băm bcrypt (tối đa 72 ký tự) |
| Skill `security-review` của Claude Code | — | Rà soát thay đổi trước khi đẩy lên (mục E) |

## B. Quy tắc riêng tư (thông tin cá nhân)

1. **Thông tin cá nhân** (họ tên đi kèm số điện thoại, email, danh bạ) chỉ nằm trong Supabase, sau đăng nhập. Không bao giờ ghi vào
   repo, file build, thông báo trên màn hình, lời nhắn commit, bộ nhớ của trợ lý.
2. Đầu mối (Chung › Đầu mối) chỉ ghi tên, chức vụ, email công việc. Số điện thoại để ở Danh bạ.
3. File "Xuất cho kế toán" không chứa đầu mối, danh bạ, tài khoản.
4. Lịch sử thao tác ghi *ai làm gì, lúc nào*; không ghi mật khẩu, khoá, mã xác thực, số điện thoại.
5. Bản sao lưu (`sao-luu/`) chỉ để trên máy (đã chặn trong `.gitignore`); có danh bạ nên giữ như giấy tờ mật.
6. Repo GitHub để **riêng tư**. Dù vậy vẫn coi như có thể lộ: không commit khoá, mật khẩu, email thật, dữ liệu cá nhân.
7. Trang không cho máy tìm kiếm lập chỉ mục (`robots.txt`, tiêu đề `X-Robots-Tag`).
8. Chỉ thu thập thông tin cần cho quản lý tài sản.
9. **Ảnh tài sản** (nút ⋯ và trang Chung › Ảnh tài sản — trang này dùng lại đúng hộp ⋯, không có đường tải lên / xoá riêng): chỉ chụp tài sản, tem, số máy; không chụp người, giấy tờ cá nhân, màn hình có thông tin cá nhân. Ảnh nằm ở
   kho Supabase Storage **riêng tư** `anh-tai-san`: không có đường link công khai, thành viên xem qua đường dẫn có hạn 1 giờ, chỉ
   quyền Kiểm kê / Quản trị tải lên, xoá (máy chủ chặn). Ảnh được thu nhỏ trong trình duyệt trước khi gửi.

## C. Quy tắc tài khoản đăng nhập

1. **Cả app phải đăng nhập** (sau khi chạy `supabase/dang-nhap.sql`). Quyền được kiểm tra ở **máy chủ** (RLS); ẩn nút trên giao diện
   chỉ là phụ.
2. **Mật khẩu**: 12–72 ký tự; không chứa tên đăng nhập, email, họ tên; không toàn chữ số hay một ký tự lặp; không nằm trong danh sách
   mật khẩu phổ biến; có ngày tháng dạng ngày sinh thì cảnh báo. Nên dùng một câu dễ nhớ. Không bắt đổi định kỳ, nhưng **đổi ngay khi
   nghi bị lộ** (kể cả khi đã gửi mật khẩu qua chat, tin nhắn).
   **Ngoại lệ (người dùng chốt 17/11/2026):** *mật khẩu ban đầu* do quản trị đặt cho thành viên (Thêm thành viên, Đặt lại mật khẩu)
   **được** toàn chữ số và lặp lại ký tự (vd. `111111111111`); vẫn đủ 12 ký tự, vẫn chặn mật khẩu phổ biến (vd. `123456789012`) và
   chứa tên / email. Mật khẩu tự đặt (tạo quản trị lần đầu, Đổi mật khẩu) vẫn theo đủ quy tắc trên. **Lần đăng nhập đầu bằng mật
   khẩu ban đầu BẮT BUỘC đổi** sang mật khẩu riêng theo đủ quy tắc (màn hình "Đổi mật khẩu trước khi vào trang"); máy chủ cũng chặn:
   chưa đổi thì không đọc / ghi được dữ liệu (`supabase/dang-nhap.sql`: bảng dấu vết `mk_ban_dau` — sha256 của bản băm, không phải mật
   khẩu; `con_mk_ban_dau()` trong `du_cap_xac_thuc()`). Email đã có tài khoản từ trước thì giữ mật khẩu cũ, không bắt đổi.
   (Máy soát: `npm test` bước 6; thử giao diện `dang-nhap`.) Vì mật khẩu ban đầu toàn số: Supabase → Email → *Password Requirements*
   để **"No required characters"** (mặc định); độ dài tối thiểu 12 vẫn giữ.
3. Không ai, kể cả trợ lý, được biết hay lưu mật khẩu của người khác. Quản trị đặt lại mật khẩu thì gửi riêng, người đó đổi ngay.
4. Mật khẩu chỉ Supabase Auth giữ (đã băm). Trang không ghi mật khẩu vào đâu.
5. **Xác thực 2 bước** (mã OTP 6 số từ Google Authenticator / Microsoft Authenticator) **bắt buộc với tài khoản quản trị** (người
   dùng chốt 15/11/2026): quản trị chưa bật thì phải bật ngay sau mật khẩu mới vào được trang; máy chủ chỉ cho toàn quyền khi phiên
   đã qua bước 2 (chưa qua thì chỉ có quyền tra cứu). Người dùng khác chỉ cần mật khẩu riêng (để biết ai đang dùng). OTP qua SMS
   không dùng: cần gói Supabase trả phí + nhà mạng gửi SMS, đăng ký tên thương hiệu, kém an toàn hơn (chiếm SIM).
   **Ngoại lệ "Miễn mã 6 số"** (người dùng chốt 17/11/2026, dùng tạm cho tài khoản quản trị phụ): ở Chung › Quản lý, bảng Thành viên,
   cột "Mã 6 số" của tài khoản quản trị chọn **Bắt buộc** / **Miễn (chỉ mật khẩu)**. Được miễn thì đúng mật khẩu là vào, vẫn toàn
   quyền. Chỉ quản trị mà phiên **đã qua mã 6 số** mới đổi được ô này (máy chủ chặn: `quan_tri_dat_mien_2_lop`, cột `mien_2_lop`
   không sửa thẳng được); mỗi lần đổi ghi lịch sử; bảng hiện nhãn "Miễn mã 6 số". Không ghi tên tài khoản được miễn vào repo.
   Xong việc thì chọn lại "Bắt buộc". (Máy soát: `npm test` bước 6; thử giao diện `dang-nhap`.)
6. Nhập sai 5 lần → ô đăng nhập khoá 60 giây trên máy đó (Supabase còn giới hạn tần suất ở máy chủ).
7. Báo lỗi chung "Sai tên đăng nhập hoặc mật khẩu", không cho biết tài khoản nào có thật.
8. **Phiên đăng nhập**: không dùng trang quá 8 giờ thì tự đăng xuất; máy dùng chung thì bỏ chọn "Ghi nhớ đăng nhập trên máy này";
   mất máy hay lộ mật khẩu thì bấm "Đăng xuất trên mọi thiết bị".
9. **Quyền tối thiểu** (máy chủ chặn theo quyền): *Tra cứu* — chỉ xem mọi thông tin, kể cả danh bạ; trang ở chế độ chỉ xem ·
   *Tạo tài sản mới* (người dùng chốt 17/11/2026, cho cán bộ mua sắm, giảng viên, cán bộ khác) — xem mọi thông tin; tạo tài sản vừa
   mua ở Chung › Tài sản mới, sửa / xoá / thêm ảnh **chỉ tài sản do chính mình tạo**; không ghi được gì vào tài sản trong file BBKK
   (máy chủ: `duoc_ghi`, `chu_moi`, `duoc_ghi_anh`; người tạo và tag "Tạo bởi" do máy chủ gắn — trigger `giu_tai_san_moi`) ·
   *Kiểm kê* — thêm ghi kết quả kiểm kê, tài sản phát sinh, thất lạc · *Quản trị* — toàn quyền (danh bạ, đầu mối, thành viên, khoá
   dữ liệu, sửa mọi tài sản mới). Mọi thành viên đều ghi lịch sử theo tên. Khoá tài khoản có hiệu lực ngay, kể cả máy đang mở trang.
   (Máy soát: `npm test` bước 6; thử giao diện `tai-san-moi`.)
10. Lịch sử ghi lại: đăng nhập (thiết bị, trình duyệt), đăng xuất, thêm / khoá / đổi quyền / đặt lại mật khẩu thành viên, bật / tắt xác
    thực 2 bước, sao chép khoá dữ liệu, tải Excel / tải ảnh về máy. **Lịch sử là căn cứ giám sát** (người dùng chốt 18/11/2026, quy tắc vàng
    17): máy chủ đóng dấu mỗi dòng (tài khoản, tên đăng nhập, chức danh / nhóm, quyền, giờ máy chủ, **địa chỉ IP**; thiết bị từng dùng ở
    bảng `thiet_bi` không ai đọc thẳng được); không ai sửa dòng của người khác, **không ai xoá** lịch sử (kể cả quản trị); quản trị xem
    tất cả, người khác chỉ xem của mình; Lý lịch tài sản (mọi thành viên) bỏ thiết bị, IP, tên đăng nhập. IP, thiết bị chỉ quản trị
    thấy, chỉ dùng để giám sát an toàn tài khoản. Cảnh báo hành động đáng ngờ chỉ báo quản trị, không chặn thao tác. (Máy soát: `npm
    test` bước 6; thử giao diện `giam-sat`.)
11. Màn hình đăng nhập cho dán mật khẩu, dùng trình quản lý mật khẩu, có nút hiện mật khẩu (ui-ux-pro-max #107, #60, #58).
12. Chỉ quản trị tạo tài khoản. Khi không thêm thành viên, tắt "Allow new users to sign up" trong Supabase để chặn đăng ký rác.

## D. Quy tắc hệ thống

1. **Chặn mã lạ (CSP)**: trang chỉ chạy khối mã chính của nó (theo dấu băm, chèn khi build) và thư viện từ jsDelivr, cdnjs.
   Không dùng `unsafe-eval`, không chèn mã chạy thẳng trong HTML, không gắn sự kiện kiểu `onclick=`.
2. Thư viện ngoài luôn cố định phiên bản.
3. Chữ người dùng nhập luôn qua `esc()` trước khi đưa vào HTML.
4. **Tiêu đề bảo mật** (`vercel.json`): `nosniff`, cấm nhúng trang vào trang khác, `Referrer-Policy`, `Permissions-Policy` (chỉ
   cho camera để quét tem), HSTS, `Cross-Origin-Opener-Policy`, `X-Robots-Tag: noindex`.
5. **Khoá**: `web/config.js` chỉ có khoá *publishable*. Khoá *service_role* không bao giờ ở trình duyệt hay repo. Khoá dữ liệu tài sản
   chỉ ở Supabase (bảng `bi_mat`) và Vercel (biến `KIEMKE_KHOA_DU_LIEU`).
6. **Supabase**: RLS bật trên mọi bảng. Sau khi bật đăng nhập, người không đăng nhập không có quyền trên bảng nào. Hàm đặc quyền cố
   định `search_path`, tự kiểm tra quyền bên trong. Người chưa đăng nhập chỉ gọi được 2 hàm: hỏi trạng thái và đổi tên đăng nhập
   thành email.
7. **Dữ liệu tài sản sau đăng nhập**: khi Vercel có khoá, build chỉ ghi danh sách tài sản, Sổ mã QR, file Excel gốc dạng **mã hoá
   AES-256-GCM**. Trang giải mã trong trình duyệt sau khi đăng nhập. Người ngoài tải file về chỉ thấy dữ liệu vô nghĩa.
8. Chỉ chạy HTTPS (Vercel lo).
9. Mọi thay đổi dữ liệu kiểm kê đi qua `save()` để có lịch sử.

## E. Kiểm tra tự động (chạy trước khi báo "xong")

- `npm test` bước 6: CSP đúng dấu băm, không mã chạy thẳng, thư viện cố định phiên bản, không khoá bí mật / email thật trong repo,
  `.gitignore`, tiêu đề bảo mật, mã hoá đúng như trình duyệt giải mã, SQL thu hồi quyền.
- `npm run thu-giao-dien`: mọi kịch bản chạy dưới đúng CSP (vi phạm là lỗi); đăng nhập giả (mật khẩu, chặn nhập sai, chính sách mật
  khẩu, xác thực 2 bước, quyền, tự đăng xuất); bản dữ liệu mã hoá.
- `npm run kiem-tra-web`: tiêu đề bảo mật và CSP trên web thật; dữ liệu đã khoá thì bản thường phải 404; người không đăng nhập phải
  không đọc được gì.
- Thay đổi đụng tới đăng nhập, quyền, khoá, SQL: rà soát theo mục B–D (dùng skill `security-review` nếu có).

## F. Việc người quản trị làm một lần trong Supabase, Vercel, GitHub

1. **Supabase → Authentication → Sign In / Providers → Email**: tắt *Confirm email*; *Minimum password length* = 12; bật *Allow new
   users to sign up* lúc tạo tài khoản (tắt lại khi xong). Gói trả phí có *leaked password protection* thì bật.
2. **Supabase → SQL Editor**: chạy `supabase/dang-nhap.sql` (bản mới nhất; file đổi thì chạy lại, không mất dữ liệu). File này tạo
   luôn kho ảnh tài sản riêng tư `anh-tai-san` (Storage).
3. Mở trang → **Tạo tài khoản quản trị** → trang bắt **bật xác thực 2 bước** ngay (cài Google / Microsoft Authenticator, quét mã QR)
   → vào Chung › Quản lý đổi mật khẩu nếu đã từng gửi qua chat.
4. **Khoá dữ liệu tài sản**: Chung › Quản lý › *Sao chép khoá* → Vercel → Settings → Environment Variables → `KIEMKE_KHOA_DU_LIEU`
   (Production + Preview) → Save → Deployments → Redeploy.
5. **GitHub**: repo → Settings → *Change visibility* → Private.
6. Tạo tài khoản thành viên với quyền vừa đủ; xong thì tắt *Allow new users to sign up*.

## G. Khi có sự cố

| Sự cố | Làm ngay |
|---|---|
| Nghi lộ mật khẩu | "Đăng xuất trên mọi thiết bị" → đổi mật khẩu → bật xác thực 2 bước |
| Thành viên nghỉ việc / chuyển công tác | Khoá tài khoản trong Chung › Quản lý |
| Thành viên quên mật khẩu | Quản trị "Đặt lại mật khẩu", gửi riêng, dặn đổi ngay |
| Quản trị quên mật khẩu hoặc mất điện thoại xác thực | Supabase → Authentication → Users → chọn tài khoản → gửi đặt lại mật khẩu / gỡ yếu tố xác thực; nhờ trợ lý hướng dẫn |
| Lộ khoá dữ liệu tài sản | SQL: `update public.bi_mat set gia_tri = encode(extensions.gen_random_bytes(32), 'base64') where ten = 'khoa_du_lieu';` → chép khoá mới sang Vercel → Redeploy |
| Thấy tài khoản lạ trong Supabase → Users | Xoá tài khoản đó (không có trong danh sách Thành viên thì vốn không đọc được gì) |

## H. Rủi ro còn lại (đã biết, chấp nhận)

- Thành viên đã đăng nhập xem được toàn bộ dữ liệu tài sản (đúng thiết kế: ai cũng kiểm kê).
- Mã nguồn trang (không phải dữ liệu) ai cũng tải được; trong đó không có bí mật.
- Ai đoán đúng một tên đăng nhập thì biết email công việc của tài khoản đó (hàm `email_dang_nhap`, cần để đăng nhập bằng tên).
- Gói Supabase miễn phí chưa có hạn phiên phía máy chủ → dùng tự đăng xuất 8 giờ ở trình duyệt.
- Tài khoản quản trị đang được "Miễn mã 6 số": lộ mật khẩu là lộ toàn quyền (danh bạ, thành viên, khoá dữ liệu). Chỉ dùng tạm, mật khẩu
  mạnh, xong việc chọn lại "Bắt buộc"; tài khoản đó không tự miễn cho người khác được.
