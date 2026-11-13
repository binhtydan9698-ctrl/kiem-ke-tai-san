// Kiểm tra trang trên Vercel sau khi đẩy lên GitHub (npm run kiem-tra-web).
//   - Đợi Vercel phục vụ đúng phiên bản dữ liệu vừa build trên máy (dist/data/version.json), tối đa 5 phút
//   - Soát các file của trang và kết nối Supabase (chỉ đọc)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, WEB_URL, docTatCa } from './cau-hinh.mjs';

const local = path.join(ROOT, 'dist', 'data', 'version.json');
if (!fs.existsSync(local)) { console.log('Chưa có dist/. Chạy "npm run build" trước.'); process.exit(1); }
const can = JSON.parse(fs.readFileSync(local, 'utf8')).version;
let loi = 0;
const ok = (dk, msg) => { if (dk) console.log('  ✓ ' + msg); else { loi++; console.log('  ✗ ' + msg); } };

console.log(`Trang: ${WEB_URL}\nĐợi phiên bản dữ liệu ${can}…`);
let ver = null;
for (let i = 0; i < 30; i++) {
  try { ver = (await (await fetch(`${WEB_URL}/data/version.json?t=${Date.now()}`, { cache: 'no-store' })).json()).version; } catch { ver = null; }
  if (ver === can) break;
  await new Promise(r => setTimeout(r, 10000));
}
ok(ver === can, ver === can ? `Vercel đã có phiên bản ${can}` : `Sau 5 phút Vercel vẫn ở phiên bản ${ver} (kiểm tra mục Deployments trên vercel.com)`);

for (const f of ['', 'export.js', 'excel-rules.js', 'supabase-db.js', 'config.js', 'data/assets.js', 'data/goc.xlsx']) {
  const r = await fetch(`${WEB_URL}/${f}`);
  ok(r.ok, `/${f} → ${r.status}`);
}
try { const docs = await docTatCa(); ok(true, `Supabase đọc được (${docs.length} bản ghi kết quả)`); }
catch (e) { ok(false, 'Supabase: ' + e.message); }

console.log(loi ? `\n✗ ${loi} mục không đạt` : '\n✓ Trang web hoạt động bình thường');
process.exit(loi ? 1 : 0);
