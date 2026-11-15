-- Chạy một lần trong Supabase: SQL Editor → New query → dán toàn bộ → Run.
-- ĐÃ BẬT ĐĂNG NHẬP (đã chạy supabase/dang-nhap.sql) thì KHÔNG chạy lại file này: nó mở lại quyền đọc/ghi cho mọi người có link.
-- Bảng lưu mọi kết quả kiểm kê: col = loại (rows, xm, units, ps; log = lịch sử thao tác), id = mã tài liệu, data = nội dung.

create table if not exists public.kiemke_docs (
  col        text        not null,
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (col, id)
);

-- Theo lựa chọn "ai có link đều dùng được": ai có trang đều đọc và ghi được.
alter table public.kiemke_docs enable row level security;
grant select, insert, update, delete on public.kiemke_docs to anon, authenticated;   -- (dang-nhap.sql thu hồi quyền của anon)

drop policy if exists "kiemke doc" on public.kiemke_docs;
drop policy if exists "kiemke them" on public.kiemke_docs;
drop policy if exists "kiemke sua" on public.kiemke_docs;
drop policy if exists "kiemke xoa" on public.kiemke_docs;
create policy "kiemke doc"  on public.kiemke_docs for select to anon, authenticated using (true);
create policy "kiemke them" on public.kiemke_docs for insert to anon, authenticated with check (true);
create policy "kiemke sua"  on public.kiemke_docs for update to anon, authenticated using (true) with check (true);
create policy "kiemke xoa"  on public.kiemke_docs for delete to anon, authenticated using (true);

-- Bật cập nhật thời gian thực (máy này thấy ngay khi máy khác kiểm)
alter table public.kiemke_docs replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.kiemke_docs;
exception when duplicate_object then null;
end $$;
