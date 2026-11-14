---
name: du-lieu-ket-qua-supabase
description: >-
  Dùng khi cần xem, sao lưu, đối chiếu, chuyển đổi hoặc xoá kết quả kiểm kê đã lưu trên Supabase
  (bảng kiemke_docs), hoặc khi sửa cách trang lưu/đồng bộ kết quả (web/supabase-db.js, hàm save/listen trong web/index.html).
---

# Kết quả kiểm kê trên Supabase

- Project Supabase: `cwompprfkqsapkwcuqpd`; khoá **publishable** nằm trong `web/config.js` (công khai, được phép).
- Bảng `public.kiemke_docs (col, id, data jsonb, updated_at)` — tạo bằng `supabase/schema.sql`; RLS mở cho mọi người
  có link (đọc + ghi), realtime bật.
- `col`:
  - `rows` — kết quả từng tài sản, `id` = **Mã TSCĐ** (tài sản không mã: `stt:<STT>`),
    `data` = `{tt, nf, hs, phong, cond, note, at, by}`
  - `xm` — mục "Tài sản thất lạc" (hỏi đại diện phòng ban), `id` = Mã TSCĐ, `data` = `{kq, cach, phanhoi, phong, at, by}`
  - `units` — buổi kiểm của đơn vị, `id` = mã đơn vị (GD, AI, …)
  - `ps` — tài sản phát sinh, `id` = mã đơn vị hoặc `p:<slug-phòng>`, `data` = `{items:[…]}`
  - `log` — lịch sử thao tác (trang `#lich-su`), mỗi thao tác một bản ghi, chỉ thêm, không sửa kết quả kiểm.
    `id` = `<thời gian cơ số 36, 9 ký tự>-<mã máy>-<ngẫu nhiên>` (xếp theo id = xếp theo thời gian),
    `data` = `{id, t, t0?, by (tên nhập trên máy), dev (mã máy), kind: kiem|hoi|buoi|ps|xuat|khac, title, key?, ma?, stt?,
    u?, room?, tag?, bulk?, keys?, lines:["Kết quả: Chưa kiểm → Đủ", …]}`. Trang **không** tải `log` lúc mở
    (`loadAll` bỏ qua), chỉ đọc khi vào trang Lịch sử qua `DB.recent()`. Đổi cách tạo `key` không cần chuyển `log`
    (bản ghi cũ vẫn đọc được, chỉ nút "Mở tài sản" không còn trỏ đúng).

## Đọc / sao lưu (an toàn)

- `npm run sao-luu` → `sao-luu/kiemke-<ngày-giờ>.json` (thư mục không lên GitHub).
- Đọc bằng REST: `GET <url>/rest/v1/kiemke_docs?select=col,id,data` với header `apikey: <khoá publishable>`.
  Hàm sẵn có: `docTatCa()` trong `scripts/cau-hinh.mjs`.

## Ghi / xoá / chuyển đổi (phải hỏi trước)

1. **Luôn** `npm run sao-luu` trước.
2. Nói rõ cho người dùng sẽ thay đổi bản ghi nào, bao nhiêu bản ghi, và **đợi người dùng đồng ý** — dữ liệu này là
   kết quả kiểm kê thật của nhiều tổ, mọi máy đang mở trang thấy thay đổi ngay.
3. Đổi cách tạo khoá (`key` trong `web/excel-rules.js`) bắt buộc kèm bước chuyển `id` cũ → mới cho `rows` và `xm`.
4. Xoá sạch để kiểm lại từ đầu: chỉ khi người dùng yêu cầu rõ; làm qua Supabase Table Editor hoặc REST `DELETE`.

## Khi sửa code đồng bộ

- `web/supabase-db.js` giả lập API `db` của Claude artifact: `collection(col).onSnapshot`, `doc("col/id").set/delete`;
  thêm `recent(col, {limit, before, kind, who:{by, dev}})` để đọc lịch sử thao tác (mới trước).
- Trên trang: `save()` so `S` với `LAST`, ghi từng tài liệu qua hàng đợi `WR` (mỗi tài liệu một lần ghi tại một thời điểm,
  tối đa 6 lần ghi song song). `listen(col)` nhận thay đổi; `docId()`/`localKey()` đổi STT ↔ Mã TSCĐ.
- Lịch sử thao tác sinh ra trong `save()` (`logChanges`): chỉ những tài liệu khác `LAST` (thay đổi của chính máy này).
  Thao tác hàng loạt đặt `LOGCTX={bulk:true,title}` (hoặc `{tag:'Hoàn tác'}`) ngay trước `save()` để gộp thành 1 dòng;
  gõ liên tục một ô chữ (ghi chú, câu trả lời) trong 2 phút được gộp vào 1 dòng.
- Thử thay đổi đồng bộ bằng 2 tab trình duyệt cùng mở `npm run dev`, ghi ở tab này, xem tab kia đổi theo,
  rồi trả kết quả về như cũ.
