-- ĐĂNG NHẬP cho trang Quản lý tài sản — chạy MỘT LẦN trong Supabase: SQL Editor → New query → dán toàn bộ → Run.
-- Chạy lại nhiều lần cũng không sao (không xoá dữ liệu).
--
-- Sau khi chạy:
--   * Chỉ THÀNH VIÊN đã đăng nhập (có trong bảng thanh_vien, không bị khoá) mới đọc / ghi được dữ liệu kiểm kê
--     (bảng kiemke_docs) và Danh bạ (bảng danh_ba). Người chỉ có đường link trang thì không đọc được gì.
--   * Mở trang → màn hình "Tạo tài khoản quản trị" (chỉ hiện khi CHƯA có thành viên nào): người quản trị tự gõ tên đăng
--     nhập, email công việc, mật khẩu. Sau đó quản trị tạo tài khoản thành viên trong Chung › Quản lý.
-- File này KHÔNG chứa mật khẩu hay email của ai (repo có thể công khai). Mật khẩu do Supabase Auth giữ (đã băm).
--
-- Cài đặt Supabase cần có (Authentication → Sign In / Providers → Email):
--   * TẮT "Confirm email"  (không gửi mail xác nhận; tài khoản dùng được ngay)
--   * BẬT "Allow new users to sign up" (trang tạo tài khoản thành viên bằng đăng ký; người lạ tự đăng ký cũng KHÔNG
--     đọc được gì vì không có trong thanh_vien)

-- ===== bảng =====
create table if not exists public.thanh_vien (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  ten_dang_nhap text not null unique check (ten_dang_nhap ~ '^[a-z0-9._-]{3,40}$'),
  ho_ten        text not null default '',
  quyen         text not null default 'xem' check (quyen in ('admin', 'sua', 'xem')),  -- admin: toàn quyền · sua: xem + sửa danh bạ · xem: xem danh bạ
  khoa          boolean not null default false,
  tao_luc       timestamptz not null default now()
);

create table if not exists public.danh_ba (
  id           uuid primary key default gen_random_uuid(),
  ho_ten       text not null,
  chuc_vu      text not null default '',
  don_vi       text not null default '',       -- mã sheet trong file BBKK (GD, AI, HC…) hoặc chữ tự do
  dien_thoai   text not null default '',
  email        text not null default '',
  ghi_chu      text not null default '',
  cap_nhat     timestamptz not null default now(),
  cap_nhat_boi text not null default ''
);

-- ===== hàm kiểm tra quyền (security definer: đọc thanh_vien không vướng RLS) =====
create or replace function public.quyen_cua_toi() returns text
language sql stable security definer set search_path = public as $$
  select quyen from public.thanh_vien where user_id = auth.uid() and not khoa
$$;

create or replace function public.la_thanh_vien() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.thanh_vien where user_id = auth.uid() and not khoa)
$$;

create or replace function public.la_quan_tri() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.quyen_cua_toi() = 'admin', false)
$$;

-- trước khi đăng nhập: đã bật đăng nhập chưa, đã có quản trị chưa (không lộ dữ liệu)
create or replace function public.trang_thai_dang_nhap() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('da_cai', true, 'co_quan_tri', exists (select 1 from public.thanh_vien where quyen = 'admin' and not khoa))
$$;

-- tên đăng nhập → email đăng nhập (chỉ tài khoản đang dùng)
create or replace function public.email_dang_nhap(p_ten text) returns text
language sql stable security definer set search_path = public, auth as $$
  select u.email::text from public.thanh_vien t join auth.users u on u.id = t.user_id
  where t.ten_dang_nhap = lower(trim(p_ten)) and not t.khoa
$$;

-- thông tin tài khoản của chính mình (null nếu chưa là thành viên / đã bị khoá)
create or replace function public.toi_la_ai() returns json
language sql stable security definer set search_path = public, auth as $$
  select json_build_object('uid', t.user_id, 'ten', t.ten_dang_nhap, 'ho_ten', t.ho_ten, 'quyen', t.quyen, 'email', u.email::text)
  from public.thanh_vien t join auth.users u on u.id = t.user_id
  where t.user_id = auth.uid() and not t.khoa
$$;

-- tài khoản quản trị đầu tiên: chỉ được khi CHƯA có thành viên nào
create or replace function public.nhan_quan_tri_dau_tien(p_ten text, p_ho_ten text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  perform pg_advisory_xact_lock(71402026);
  if exists (select 1 from public.thanh_vien) then raise exception 'Đã có tài khoản quản trị'; end if;
  insert into public.thanh_vien (user_id, ten_dang_nhap, ho_ten, quyen)
  values (auth.uid(), lower(trim(p_ten)), coalesce(p_ho_ten, ''), 'admin');
end $$;

-- quản trị: danh sách thành viên (kèm email, lần đăng nhập cuối)
create or replace function public.ds_thanh_vien()
returns table (user_id uuid, ten_dang_nhap text, ho_ten text, quyen text, khoa boolean, tao_luc timestamptz, email text, dang_nhap_cuoi timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select t.user_id, t.ten_dang_nhap, t.ho_ten, t.quyen, t.khoa, t.tao_luc, u.email::text, u.last_sign_in_at
  from public.thanh_vien t join auth.users u on u.id = t.user_id
  where public.la_quan_tri()
  order by t.tao_luc
$$;

-- quản trị: cấp quyền cho tài khoản (email) vừa tạo bằng đăng ký
create or replace function public.quan_tri_them_thanh_vien(p_email text, p_ten text, p_ho_ten text, p_quyen text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid;
begin
  if not public.la_quan_tri() then raise exception 'Chỉ quản trị mới thêm được thành viên'; end if;
  if p_quyen not in ('admin', 'sua', 'xem') then raise exception 'Quyền không hợp lệ'; end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  if v_uid is null then raise exception 'Chưa có tài khoản với email này'; end if;
  insert into public.thanh_vien (user_id, ten_dang_nhap, ho_ten, quyen)
  values (v_uid, lower(trim(p_ten)), coalesce(p_ho_ten, ''), p_quyen);
end $$;

-- quản trị: đặt lại mật khẩu cho thành viên quên mật khẩu
create or replace function public.quan_tri_dat_mat_khau(p_uid uuid, p_mat_khau text) returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if not public.la_quan_tri() then raise exception 'Chỉ quản trị mới đặt lại được mật khẩu'; end if;
  if length(p_mat_khau) < 8 then raise exception 'Mật khẩu cần ít nhất 8 ký tự'; end if;
  if not exists (select 1 from public.thanh_vien where user_id = p_uid) then raise exception 'Không có thành viên này'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_mat_khau, extensions.gen_salt('bf')), updated_at = now()
  where id = p_uid;
end $$;

-- ===== ai được gọi hàm nào =====
revoke all on function public.quyen_cua_toi(), public.la_thanh_vien(), public.la_quan_tri(), public.toi_la_ai(),
  public.nhan_quan_tri_dau_tien(text, text), public.ds_thanh_vien(), public.quan_tri_them_thanh_vien(text, text, text, text),
  public.quan_tri_dat_mat_khau(uuid, text) from public, anon;
grant execute on function public.quyen_cua_toi(), public.la_thanh_vien(), public.la_quan_tri(), public.toi_la_ai(),
  public.nhan_quan_tri_dau_tien(text, text), public.ds_thanh_vien(), public.quan_tri_them_thanh_vien(text, text, text, text),
  public.quan_tri_dat_mat_khau(uuid, text) to authenticated;
grant execute on function public.trang_thai_dang_nhap(), public.email_dang_nhap(text) to anon, authenticated;

-- ===== quyền trên bảng (RLS) =====
alter table public.thanh_vien enable row level security;
alter table public.danh_ba enable row level security;

drop policy if exists "tv xem" on public.thanh_vien;
drop policy if exists "tv sua" on public.thanh_vien;
drop policy if exists "tv xoa" on public.thanh_vien;
create policy "tv xem" on public.thanh_vien for select to authenticated using (public.la_thanh_vien());
create policy "tv sua" on public.thanh_vien for update to authenticated using (public.la_quan_tri()) with check (public.la_quan_tri());
create policy "tv xoa" on public.thanh_vien for delete to authenticated using (public.la_quan_tri());
-- thêm thành viên chỉ qua hàm nhan_quan_tri_dau_tien / quan_tri_them_thanh_vien (không có quyền insert trực tiếp)

drop policy if exists "db xem" on public.danh_ba;
drop policy if exists "db them" on public.danh_ba;
drop policy if exists "db sua" on public.danh_ba;
drop policy if exists "db xoa" on public.danh_ba;
create policy "db xem"  on public.danh_ba for select to authenticated using (public.la_thanh_vien());
create policy "db them" on public.danh_ba for insert to authenticated with check (public.quyen_cua_toi() in ('admin', 'sua'));
create policy "db sua"  on public.danh_ba for update to authenticated using (public.quyen_cua_toi() in ('admin', 'sua')) with check (public.quyen_cua_toi() in ('admin', 'sua'));
create policy "db xoa"  on public.danh_ba for delete to authenticated using (public.quyen_cua_toi() in ('admin', 'sua'));

-- Dữ liệu kiểm kê: thay quyền "ai có link đều dùng được" (schema.sql) bằng "chỉ thành viên đã đăng nhập"
drop policy if exists "kiemke doc" on public.kiemke_docs;
drop policy if exists "kiemke them" on public.kiemke_docs;
drop policy if exists "kiemke sua" on public.kiemke_docs;
drop policy if exists "kiemke xoa" on public.kiemke_docs;
create policy "kiemke doc"  on public.kiemke_docs for select to authenticated using (public.la_thanh_vien());
create policy "kiemke them" on public.kiemke_docs for insert to authenticated with check (public.la_thanh_vien());
create policy "kiemke sua"  on public.kiemke_docs for update to authenticated using (public.la_thanh_vien()) with check (public.la_thanh_vien());
create policy "kiemke xoa"  on public.kiemke_docs for delete to authenticated using (public.la_thanh_vien());

-- Muốn quay lại như cũ (ai có link đều dùng được): chạy lại supabase/schema.sql.
