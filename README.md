# Kiểm kê tài sản FPTU ĐN — bản web

Trang kiểm kê tài sản 2026 (Phòng Hành chính), chạy trên Vercel, lưu kết quả chung trên Supabase
để nhiều tổ cùng kiểm và thấy kết quả của nhau gần như ngay lập tức.

## Các file

| File | Vai trò |
|---|---|
| `index.html` | Toàn bộ giao diện, logic và danh sách tài sản |
| `config.js` | Địa chỉ Supabase và khoá `anon` (khoá công khai) |
| `supabase-db.js` | Bộ nối Supabase: đọc, ghi, nhận thay đổi theo thời gian thực |
| `supabase/schema.sql` | Lệnh tạo bảng `kiemke_docs`, chạy một lần trong Supabase |

Nếu để trống `config.js`, trang vẫn chạy nhưng mỗi máy chỉ lưu kết quả của riêng mình.

## Cài đặt lần đầu

1. **Supabase:** tạo project mới, vào **SQL Editor**, dán nội dung `supabase/schema.sql` rồi bấm **Run**.
2. Vào **Project Settings → API**, chép **Project URL** và khoá **anon public** vào `config.js`.
   Không bao giờ dán khoá `service_role` vào đây.
3. **GitHub:** đẩy thư mục này lên một repository.
4. **Vercel:** chọn **Add New → Project → Import** đúng repository đó, giữ cài đặt mặc định
   (Framework: Other, không có lệnh build), rồi bấm **Deploy**.

## Cập nhật trang

Vercel tự triển khai lại mỗi khi có thay đổi được đẩy lên nhánh `main`:

```bash
git add -A
git commit -m "Mô tả thay đổi"
git push
```

Khoảng 30 giây sau, trang web sẽ hiện bản mới. Kết quả kiểm đã lưu trên Supabase vẫn được giữ nguyên.

## Lưu ý

- Ai có đường link đều xem và ghi được kết quả. Danh sách tài sản nằm trong mã nguồn công khai.
- Muốn xoá sạch kết quả để kiểm lại từ đầu, vào Supabase, mở **Table Editor → kiemke_docs** rồi xoá các dòng.
- Bản trên Claude (artifact) và bản web này dùng **hai kho dữ liệu khác nhau**, không đồng bộ với nhau.
