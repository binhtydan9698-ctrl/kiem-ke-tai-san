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
-- Cài đặt Supabase cần có (Authentication → Sign In / Providers → Email) — xem đủ ở BAO-MAT.md mục F:
--   * TẮT "Confirm email"  (không gửi mail xác nhận; tài khoản dùng được ngay)
--   * BẬT "Allow new users to sign up" khi tạo tài khoản (quản trị đầu tiên, thành viên mới); người lạ tự đăng ký cũng KHÔNG
--     đọc được gì vì không có trong thanh_vien. Không thêm thành viên thì có thể TẮT để chặn đăng ký rác.
--   * "Minimum password length": 12 (trang cũng kiểm tra; hàm đặt lại mật khẩu của quản trị bắt 12–72 ký tự)
-- Bảo mật thêm trong file này: 3 mức quyền (Tra cứu / Kiểm kê / Quản trị, máy chủ chặn ghi theo quyền); quản trị BẮT BUỘC
-- xác thực 2 bước (chưa qua bước 2 thì chỉ có quyền tra cứu) — trừ tài khoản được "Miễn mã 6 số" (cột mien_2_lop, chỉ quản trị
-- đã qua 2 bước mới bật / tắt được); khoá giải mã dữ liệu tài sản (bảng bi_mat); thu hồi mọi quyền của người không đăng nhập.

-- ===== bảng =====
-- quyen: 'xem' Tra cứu (chỉ xem) · 'kiem' Kiểm kê (xem + ghi kết quả kiểm kê) · 'admin' Quản trị (toàn quyền, bắt buộc 2 lớp)
create table if not exists public.thanh_vien (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  ten_dang_nhap text not null unique check (ten_dang_nhap ~ '^[a-z0-9._-]{3,40}$'),
  ho_ten        text not null default '',
  quyen         text not null default 'xem',
  khoa          boolean not null default false,
  tao_luc       timestamptz not null default now()
);
-- (bản trước có quyền 'sua' = sửa danh bạ → đổi thành 'kiem')
alter table public.thanh_vien drop constraint if exists thanh_vien_quyen_check;
update public.thanh_vien set quyen = 'kiem' where quyen = 'sua';
alter table public.thanh_vien add constraint thanh_vien_quyen_check check (quyen in ('admin', 'kiem', 'xem'));
-- MIỄN MÃ 6 SỐ (người dùng chốt 17/11/2026): tài khoản quản trị được chọn "Miễn" thì đăng nhập chỉ cần mật khẩu, vẫn toàn quyền.
-- Chỉ đổi qua hàm quan_tri_dat_mien_2_lop (quản trị ĐÃ qua 2 bước), không sửa thẳng được cột này.
alter table public.thanh_vien add column if not exists mien_2_lop boolean not null default false;

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

-- khoá giải mã dữ liệu tài sản (BAO-MAT.md): tạo ngẫu nhiên MỘT LẦN ngay trong Supabase; quản trị chép sang Vercel
-- (biến KIEMKE_KHOA_DU_LIEU). Không có policy nào: không ai đọc thẳng bảng này được, chỉ qua hàm khoa_du_lieu() (thành viên).
create table if not exists public.bi_mat (
  ten      text primary key,
  gia_tri  text not null,
  tao_luc  timestamptz not null default now()
);
insert into public.bi_mat (ten, gia_tri) values ('khoa_du_lieu', encode(extensions.gen_random_bytes(32), 'base64'))
on conflict (ten) do nothing;

-- MẬT KHẨU BAN ĐẦU (người dùng chốt 17/11/2026): quản trị đặt cho thành viên (Thêm thành viên, Đặt lại mật khẩu) được đơn giản
-- (toàn số, lặp ký tự), nhưng lần đăng nhập đầu BẮT BUỘC đổi. Lúc quản trị đặt, ghi DẤU VẾT = sha256 của bản băm mật khẩu (không
-- phải mật khẩu, không phải bản băm). Dấu vết còn trùng mật khẩu hiện tại = chưa đổi → chưa được tính là thành viên (không đọc,
-- không ghi được gì) cho tới khi tự đổi. Không có policy nào: chỉ các hàm bên dưới đọc / ghi bảng này.
create table if not exists public.mk_ban_dau (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  dau_vet  text not null,
  dat_luc  timestamptz not null default now()
);

-- ===== hàm kiểm tra quyền (security definer: đọc thanh_vien không vướng RLS) =====
-- dấu vết của mật khẩu hiện tại (so với mk_ban_dau)
create or replace function public.dau_vet_mk(p_uid uuid) returns text
language sql stable security definer set search_path = public, auth, extensions as $$
  select encode(extensions.digest(coalesce(u.encrypted_password, '')::text, 'sha256'), 'hex') from auth.users u where u.id = p_uid
$$;
-- người đang đăng nhập vẫn dùng mật khẩu ban đầu quản trị đặt (chưa tự đổi)
create or replace function public.con_mk_ban_dau() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.mk_ban_dau m where m.user_id = auth.uid() and m.dau_vet = public.dau_vet_mk(auth.uid()))
$$;
-- quản trị vừa đặt mật khẩu ban đầu cho một tài khoản: ghi dấu vết
create or replace function public.ghi_mk_ban_dau(p_uid uuid) returns void
language sql security definer set search_path = public as $$
  insert into public.mk_ban_dau (user_id, dau_vet) values (p_uid, public.dau_vet_mk(p_uid))
  on conflict (user_id) do update set dau_vet = excluded.dau_vet, dat_luc = now()
$$;

-- tài khoản đang đăng nhập được "Miễn mã 6 số" (quản trị đã qua 2 bước chọn ở Chung › Quản lý)
create or replace function public.duoc_mien_2_lop() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.thanh_vien t where t.user_id = auth.uid() and t.mien_2_lop and not t.khoa)
$$;

-- đủ điều kiện được tính là thành viên: tài khoản đã bật xác thực 2 bước thì phiên phải qua bước 2 (aal2), trừ khi được miễn;
-- và đã tự đổi mật khẩu ban đầu (nếu quản trị đặt)
create or replace function public.du_cap_xac_thuc() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select (coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
      or public.duoc_mien_2_lop())
     and not public.con_mk_ban_dau()
$$;

-- quyền đang có hiệu lực: quản trị chỉ có toàn quyền khi phiên đã qua xác thực 2 bước (aal2) hoặc được miễn; chưa → coi như tra cứu
create or replace function public.quyen_cua_toi() returns text
language sql stable security definer set search_path = public as $$
  select case when quyen = 'admin' and coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' and not mien_2_lop then 'xem' else quyen end
  from public.thanh_vien where user_id = auth.uid() and not khoa and public.du_cap_xac_thuc()
$$;

create or replace function public.la_thanh_vien() returns boolean
language sql stable security definer set search_path = public as $$
  select public.du_cap_xac_thuc() and exists (select 1 from public.thanh_vien where user_id = auth.uid() and not khoa)
$$;

-- khoá giải mã dữ liệu tài sản: chỉ thành viên đã đăng nhập (đủ bước xác thực)
create or replace function public.khoa_du_lieu() returns text
language sql stable security definer set search_path = public as $$
  select gia_tri from public.bi_mat where ten = 'khoa_du_lieu' and public.la_thanh_vien()
$$;

create or replace function public.la_quan_tri() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.quyen_cua_toi() = 'admin', false)
$$;

-- được ghi loại dữ liệu kiểm kê nào: lịch sử (log) — mọi thành viên (để biết ai làm gì, kể cả người chỉ tra cứu);
-- đầu mối (dm) — chỉ quản trị; kết quả kiểm kê, buổi kiểm, phát sinh, thất lạc (rows, units, ps, xm) — Kiểm kê và Quản trị
create or replace function public.duoc_ghi(p_col text) returns boolean
language sql stable security definer set search_path = public as $$
  select case when p_col = 'log' then public.la_thanh_vien()
              when p_col = 'dm' then public.la_quan_tri()
              else coalesce(public.quyen_cua_toi() in ('admin', 'kiem'), false) end
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
  select json_build_object('uid', t.user_id, 'ten', t.ten_dang_nhap, 'ho_ten', t.ho_ten, 'quyen', t.quyen, 'email', u.email::text,
    'doi_mk', public.con_mk_ban_dau(), 'mien_2_lop', t.mien_2_lop)
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

-- quản trị: danh sách thành viên (kèm email, lần đăng nhập cuối, có được miễn mã 6 số không)
drop function if exists public.ds_thanh_vien();   -- bản trước trả ít cột hơn (đổi kiểu trả về phải xoá rồi tạo lại)
create or replace function public.ds_thanh_vien()
returns table (user_id uuid, ten_dang_nhap text, ho_ten text, quyen text, khoa boolean, tao_luc timestamptz, email text, dang_nhap_cuoi timestamptz, mien_2_lop boolean)
language sql stable security definer set search_path = public, auth as $$
  select t.user_id, t.ten_dang_nhap, t.ho_ten, t.quyen, t.khoa, t.tao_luc, u.email::text, u.last_sign_in_at, t.mien_2_lop
  from public.thanh_vien t join auth.users u on u.id = t.user_id
  where public.la_quan_tri()
  order by t.tao_luc
$$;

-- quản trị bật / tắt "Miễn mã 6 số" cho một tài khoản. Chỉ quản trị mà phiên ĐÃ qua 2 bước (aal2) mới đổi được — tài khoản đang
-- được miễn (chỉ mật khẩu) không tự miễn cho người khác được, kể cả khi lộ mật khẩu.
create or replace function public.quan_tri_dat_mien_2_lop(p_uid uuid, p_mien boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.la_quan_tri() then raise exception 'Chỉ quản trị mới đổi được mục này'; end if;
  if coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then raise exception 'CAN_2_LOP'; end if;
  update public.thanh_vien set mien_2_lop = coalesce(p_mien, false) where user_id = p_uid;
  if not found then raise exception 'Không có thành viên này'; end if;
end $$;

-- quản trị: cấp quyền cho tài khoản (email) vừa tạo bằng đăng ký. p_mk_moi = quản trị vừa đặt mật khẩu ban đầu cho tài khoản này
-- (tài khoản mới) → lần đăng nhập đầu phải đổi; email đã có tài khoản từ trước thì giữ mật khẩu cũ, không bắt đổi.
drop function if exists public.quan_tri_them_thanh_vien(text, text, text, text);
create or replace function public.quan_tri_them_thanh_vien(p_email text, p_ten text, p_ho_ten text, p_quyen text, p_mk_moi boolean default true) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid;
begin
  if not public.la_quan_tri() then raise exception 'Chỉ quản trị mới thêm được thành viên'; end if;
  if p_quyen not in ('admin', 'kiem', 'xem') then raise exception 'Quyền không hợp lệ'; end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  if v_uid is null then raise exception 'Chưa có tài khoản với email này'; end if;
  insert into public.thanh_vien (user_id, ten_dang_nhap, ho_ten, quyen)
  values (v_uid, lower(trim(p_ten)), coalesce(p_ho_ten, ''), p_quyen);
  if p_mk_moi then perform public.ghi_mk_ban_dau(v_uid); end if;
end $$;

-- quản trị: đặt lại mật khẩu cho thành viên quên mật khẩu
create or replace function public.quan_tri_dat_mat_khau(p_uid uuid, p_mat_khau text) returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if not public.la_quan_tri() then raise exception 'Chỉ quản trị mới đặt lại được mật khẩu'; end if;
  if length(p_mat_khau) < 12 or length(p_mat_khau) > 72 then raise exception 'Mật khẩu cần 12–72 ký tự'; end if;
  if not exists (select 1 from public.thanh_vien where user_id = p_uid) then raise exception 'Không có thành viên này'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_mat_khau, extensions.gen_salt('bf')), updated_at = now()
  where id = p_uid;
  perform public.ghi_mk_ban_dau(p_uid);   -- mật khẩu quản trị đặt lại = mật khẩu ban đầu: lần đăng nhập sau phải đổi
end $$;

-- ===== ai được gọi hàm nào =====
revoke all on function public.duoc_ghi(text), public.du_cap_xac_thuc(), public.quyen_cua_toi(), public.la_thanh_vien(), public.la_quan_tri(), public.toi_la_ai(),
  public.khoa_du_lieu(), public.nhan_quan_tri_dau_tien(text, text), public.ds_thanh_vien(),
  public.quan_tri_them_thanh_vien(text, text, text, text, boolean), public.quan_tri_dat_mat_khau(uuid, text), public.con_mk_ban_dau(),
  public.duoc_mien_2_lop(), public.quan_tri_dat_mien_2_lop(uuid, boolean) from public, anon;
grant execute on function public.duoc_ghi(text), public.du_cap_xac_thuc(), public.quyen_cua_toi(), public.la_thanh_vien(), public.la_quan_tri(), public.toi_la_ai(),
  public.khoa_du_lieu(), public.nhan_quan_tri_dau_tien(text, text), public.ds_thanh_vien(),
  public.quan_tri_them_thanh_vien(text, text, text, text, boolean), public.quan_tri_dat_mat_khau(uuid, text), public.con_mk_ban_dau(),
  public.duoc_mien_2_lop(), public.quan_tri_dat_mien_2_lop(uuid, boolean) to authenticated;
-- dấu vết mật khẩu, ghi dấu vết: chỉ dùng bên trong các hàm trên, không ai gọi thẳng được
revoke all on function public.dau_vet_mk(uuid), public.ghi_mk_ban_dau(uuid) from public, anon, authenticated;
grant execute on function public.trang_thai_dang_nhap(), public.email_dang_nhap(text) to anon, authenticated;

-- người không đăng nhập (anon) không còn quyền gì trên các bảng (RLS vẫn là lớp thứ hai)
revoke all on public.thanh_vien, public.danh_ba, public.bi_mat, public.kiemke_docs from anon;
revoke all on public.bi_mat from authenticated;
revoke all on public.mk_ban_dau from anon, authenticated;
grant select, insert, update, delete on public.kiemke_docs, public.danh_ba to authenticated;
-- thanh_vien: quản trị chỉ sửa thẳng được họ tên, quyền, khoá; cột "miễn mã 6 số" chỉ đổi qua hàm quan_tri_dat_mien_2_lop
revoke update on public.thanh_vien from authenticated;
grant select, delete on public.thanh_vien to authenticated;
grant update (ho_ten, quyen, khoa) on public.thanh_vien to authenticated;

-- ===== quyền trên bảng (RLS) =====
alter table public.thanh_vien enable row level security;
alter table public.danh_ba enable row level security;
alter table public.bi_mat enable row level security;   -- không có policy nào: chỉ đọc qua khoa_du_lieu()
alter table public.mk_ban_dau enable row level security;   -- không có policy nào: chỉ các hàm mật khẩu ban đầu đọc / ghi

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
create policy "db them" on public.danh_ba for insert to authenticated with check (public.la_quan_tri());   -- danh bạ: chỉ quản trị sửa
create policy "db sua"  on public.danh_ba for update to authenticated using (public.la_quan_tri()) with check (public.la_quan_tri());
create policy "db xoa"  on public.danh_ba for delete to authenticated using (public.la_quan_tri());

-- Dữ liệu kiểm kê: thay quyền "ai có link đều dùng được" (schema.sql) bằng "chỉ thành viên đã đăng nhập"
drop policy if exists "kiemke doc" on public.kiemke_docs;
drop policy if exists "kiemke them" on public.kiemke_docs;
drop policy if exists "kiemke sua" on public.kiemke_docs;
drop policy if exists "kiemke xoa" on public.kiemke_docs;
create policy "kiemke doc"  on public.kiemke_docs for select to authenticated using (public.la_thanh_vien());
create policy "kiemke them" on public.kiemke_docs for insert to authenticated with check (public.duoc_ghi(col));
create policy "kiemke sua"  on public.kiemke_docs for update to authenticated using (public.duoc_ghi(col)) with check (public.duoc_ghi(col));
create policy "kiemke xoa"  on public.kiemke_docs for delete to authenticated using (public.duoc_ghi(col) and (col <> 'log' or public.la_quan_tri()));

-- ===== Kho ảnh tài sản (nút ⋯ trên dòng tài sản, web/anh.js) =====
-- Kho RIÊNG TƯ (public = false): chỉ thành viên đã đăng nhập xem được (qua đường dẫn có hạn); Kiểm kê, Quản trị tải lên / xoá.
-- Mỗi ảnh tối đa 3 MB (trang đã thu nhỏ ảnh còn khoảng 0,2–0,5 MB), chỉ nhận ảnh JPEG / PNG / WebP.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anh-tai-san', 'anh-tai-san', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anh tai san xem" on storage.objects;
drop policy if exists "anh tai san them" on storage.objects;
drop policy if exists "anh tai san sua" on storage.objects;
drop policy if exists "anh tai san xoa" on storage.objects;
create policy "anh tai san xem"  on storage.objects for select to authenticated using (bucket_id = 'anh-tai-san' and public.la_thanh_vien());
create policy "anh tai san them" on storage.objects for insert to authenticated with check (bucket_id = 'anh-tai-san' and public.duoc_ghi('anh'));
create policy "anh tai san sua"  on storage.objects for update to authenticated using (bucket_id = 'anh-tai-san' and public.duoc_ghi('anh')) with check (bucket_id = 'anh-tai-san' and public.duoc_ghi('anh'));
create policy "anh tai san xoa"  on storage.objects for delete to authenticated using (bucket_id = 'anh-tai-san' and public.duoc_ghi('anh'));

-- Dung lượng kho ảnh (Chung › Ảnh tài sản) — THÔNG SỐ QUẢN LÝ, CHỈ QUẢN TRỊ (người dùng chốt 17/11/2026): người khác gọi được hàm
-- nhưng chỉ nhận null. Chỉ trả số tệp, tổng dung lượng (không trả tên tệp, đường dẫn). row_security = off: đếm đủ mọi tệp; nếu
-- máy chủ không cho bỏ qua RLS thì báo lỗi rõ ràng chứ không trả số thiếu.
create or replace function public.dung_luong_anh() returns json
language sql stable security definer set search_path = public, storage set row_security = off as $$
  select case when public.la_quan_tri() then json_build_object(
    'so_tep', (select count(*) from storage.objects o where o.bucket_id = 'anh-tai-san'),
    'byte', (select coalesce(sum((o.metadata ->> 'size')::bigint), 0) from storage.objects o where o.bucket_id = 'anh-tai-san'),
    'byte_moi_kho', (select coalesce(sum((o.metadata ->> 'size')::bigint), 0) from storage.objects o),
    'gioi_han_tep', (select b.file_size_limit from storage.buckets b where b.id = 'anh-tai-san')
  ) end
$$;
revoke all on function public.dung_luong_anh() from public, anon;
grant execute on function public.dung_luong_anh() to authenticated;

-- Muốn quay lại như cũ (ai có link đều dùng được): chạy lại supabase/schema.sql (nó cấp lại quyền cho anon).
