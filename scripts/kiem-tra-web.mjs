// Kiểm tra trang trên Vercel sau khi đẩy lên GitHub (npm run kiem-tra-web).
//   - Đợi Vercel phục vụ đúng phiên bản dữ liệu vừa build trên máy (dist/data/version.json) và đúng mã trang
//     (index.html, *.js trong dist/), mỗi bước tối đa 5 phút
//   - Soát các file của trang và kết nối Supabase (chỉ đọc)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, WEB_URL, docTatCa, trangThaiDangNhap, dangNhapToken } from './cau-hinh.mjs';

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

// Đợi Vercel phục vụ đúng mã trang vừa build (cần khi chỉ sửa giao diện, dữ liệu Excel không đổi)
const MA_TRANG = ['index.html', 'ma-qr.js', 'chung.js', 'dang-nhap.js', 'qr-rules.js', 'export.js', 'excel-rules.js', 'supabase-db.js', 'config.js'];
const boCR = s => s.replace(/\r/g, '');
const tren_may = Object.fromEntries(MA_TRANG.map(f => [f, boCR(fs.readFileSync(path.join(ROOT, 'dist', f), 'utf8'))]));
let khac = MA_TRANG;
for (let i = 0; i < 30; i++) {
  khac = [];
  for (const f of MA_TRANG) {
    try { const r = await fetch(`${WEB_URL}/${f === 'index.html' ? '' : f}?t=${Date.now()}`, { cache: 'no-store' }); if (boCR(await r.text()) !== tren_may[f]) khac.push(f); }
    catch { khac.push(f); }
  }
  if (!khac.length) break;
  await new Promise(r => setTimeout(r, 10000));
}
ok(!khac.length, !khac.length ? `Mã trang trên Vercel giống bản trên máy (${MA_TRANG.join(', ')})`
  : `Sau 5 phút trên Vercel vẫn khác bản trên máy: ${khac.join(', ')} (chưa push, hoặc Vercel build lỗi — xem Deployments trên vercel.com)`);

for (const f of ['', 'img/logo-fpt-university.png', 'ma-qr.js', 'chung.js', 'dang-nhap.js', 'qr-rules.js', 'fonts/BeVietnamPro-Regular.ttf', 'fonts/BeVietnamPro-Bold.ttf', 'export.js', 'excel-rules.js', 'supabase-db.js', 'config.js', 'data/assets.js', 'data/so-ma-qr.js', 'data/goc.xlsx']) {
  const r = await fetch(`${WEB_URL}/${f}`);
  ok(r.ok, `/${f} → ${r.status}`);
}
try {
  const dem = docs => { const nLog = docs.filter(d => d.col === 'log').length; return `${docs.length - nLog} bản ghi kết quả, ${nLog} dòng lịch sử thao tác`; };
  const tt = await trangThaiDangNhap();
  if (!tt.da_cai) ok(true, `Supabase đọc được (${dem(await docTatCa())}) · CHƯA bật đăng nhập: ai có link đều đọc, sửa được`);
  else {
    ok(true, `Supabase hoạt động · đã bật đăng nhập (${tt.co_quan_tri ? 'đã có tài khoản quản trị' : 'CHƯA có tài khoản quản trị: mở trang để tạo'})`);
    const an = await docTatCa();   // không đăng nhập: phải không đọc được gì
    ok(!an.length, an.length ? `người KHÔNG đăng nhập vẫn đọc được ${an.length} bản ghi — kiểm tra lại quyền (chạy lại supabase/dang-nhap.sql)` : 'người không đăng nhập không đọc được dữ liệu');
    const token = await dangNhapToken().catch(e => { ok(false, e.message); return null; });
    if (token) ok(true, `đọc bằng tài khoản thành viên (KIEMKE_TEN): ${dem(await docTatCa(token))}`);
  }
}
catch (e) { ok(false, 'Supabase: ' + e.message); }

console.log(loi ? `\n✗ ${loi} mục không đạt` : '\n✓ Trang web hoạt động bình thường');
process.exit(loi ? 1 : 0);
