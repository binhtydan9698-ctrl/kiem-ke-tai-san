// Đọc cấu hình dùng chung cho các script: địa chỉ web và Supabase (lấy từ web/config.js, không lặp lại khoá).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const WEB_URL = (process.env.KIEMKE_WEB_URL || 'https://kiem-ke-tai-san-sigma.vercel.app').replace(/\/$/, '');

export function supabaseConfig() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'web', 'config.js'), 'utf8'), ctx);
  const c = ctx.window.KIEMKE_SUPABASE || {};
  if (!c.url || !c.anonKey) throw new Error('web/config.js chưa có url/anonKey của Supabase');
  return { url: c.url.replace(/\/$/, ''), key: c.anonKey, table: 'kiemke_docs' };
}

// Đọc toàn bộ bảng kiemke_docs (phân trang 1000 dòng/lần)
export async function docTatCa() {
  const { url, key, table } = supabaseConfig();
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${url}/rest/v1/${table}?select=col,id,data,updated_at&order=col,id`, {
      headers: { apikey: key, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' },
    });
    if (!r.ok) throw new Error(`Supabase trả lỗi ${r.status}: ${await r.text()}`);
    const page = await r.json();
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}
