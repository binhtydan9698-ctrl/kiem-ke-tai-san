// Đọc cấu hình dùng chung cho các script: địa chỉ web và Supabase (lấy từ web/config.js, không lặp lại khoá).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const WEB_URL = (process.env.KIEMKE_WEB_URL || 'https://quan-ly-tai-san-fptudn.vercel.app').replace(/\/$/, '');

export function supabaseConfig() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'web', 'config.js'), 'utf8'), ctx);
  const c = ctx.window.KIEMKE_SUPABASE || {};
  if (!c.url || !c.anonKey) throw new Error('web/config.js chưa có url/anonKey của Supabase');
  return { url: c.url.replace(/\/$/, ''), key: c.anonKey, table: 'kiemke_docs' };
}

// Đã bật đăng nhập trên Supabase chưa (supabase/dang-nhap.sql) — chỉ đọc, không lộ dữ liệu
export async function trangThaiDangNhap() {
  const { url, key } = supabaseConfig();
  const r = await fetch(`${url}/rest/v1/rpc/trang_thai_dang_nhap`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: '{}' });
  if (r.status === 404) return { da_cai: false };
  if (!r.ok) throw new Error(`Supabase trả lỗi ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// Đăng nhập bằng tài khoản thành viên lấy từ biến môi trường KIEMKE_TEN, KIEMKE_MK (chỉ đặt trên máy khi chạy lệnh,
// KHÔNG ghi vào file nào trong repo). Không đặt → null.
export async function dangNhapToken() {
  const ten = process.env.KIEMKE_TEN, mk = process.env.KIEMKE_MK;
  if (!ten || !mk) return null;
  const { url, key } = supabaseConfig(), h = { apikey: key, 'Content-Type': 'application/json' };
  let email = ten.toLowerCase();
  if (!email.includes('@')) {
    const r = await fetch(`${url}/rest/v1/rpc/email_dang_nhap`, { method: 'POST', headers: h, body: JSON.stringify({ p_ten: email }) });
    email = r.ok ? await r.json() : null;
    if (!email) throw new Error('Sai tên đăng nhập hoặc mật khẩu (KIEMKE_TEN / KIEMKE_MK)');
  }
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: h, body: JSON.stringify({ email, password: mk }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('Đăng nhập Supabase không được: ' + (j.error_description || j.msg || r.status));
  return j.access_token;
}

// Đọc một bảng (phân trang 1000 dòng/lần); token: phiên đăng nhập (khi đã bật đăng nhập)
export async function docBang(bang, chon, token, thuTu) {
  const { url, key } = supabaseConfig();
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${url}/rest/v1/${bang}?select=${chon}${thuTu ? '&order=' + thuTu : ''}`, {
      headers: { apikey: key, ...(token ? { Authorization: 'Bearer ' + token } : {}), Range: `${from}-${from + 999}`, 'Range-Unit': 'items' },
    });
    if (!r.ok) throw new Error(`Supabase trả lỗi ${r.status}: ${await r.text()}`);
    const page = await r.json();
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

// Đọc toàn bộ bảng kiemke_docs (phân trang 1000 dòng/lần)
export async function docTatCa(token) {
  const { url, key, table } = supabaseConfig();
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${url}/rest/v1/${table}?select=col,id,data,updated_at&order=col,id`, {
      headers: { apikey: key, ...(token ? { Authorization: 'Bearer ' + token } : {}), Range: `${from}-${from + 999}`, 'Range-Unit': 'items' },
    });
    if (!r.ok) throw new Error(`Supabase trả lỗi ${r.status}: ${await r.text()}`);
    const page = await r.json();
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}
