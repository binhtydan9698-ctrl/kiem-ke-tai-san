// Kiểm tra trang trên Vercel sau khi đẩy lên GitHub (npm run kiem-tra-web).
//   - Đợi Vercel phục vụ đúng phiên bản dữ liệu vừa build trên máy (dist/data/version.json) và đúng mã trang
//     (index.html, *.js trong dist/), mỗi bước tối đa 5 phút
//   - Soát các file của trang và kết nối Supabase (chỉ đọc)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, WEB_URL, docTatCa, trangThaiDangNhap, dangNhapToken, supabaseConfig } from './cau-hinh.mjs';

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
const MA_TRANG = ['index.html', 'ma-qr.js', 'chung.js', 'dang-nhap.js', 'anh.js', 'tai-san-moi.js', 'giam-sat.js', 'bieu-do.js', 'qr-rules.js', 'export.js', 'excel-rules.js', 'supabase-db.js', 'config.js'];
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

for (const f of ['', 'img/logo-fpt-university.png', 'ma-qr.js', 'chung.js', 'dang-nhap.js', 'anh.js', 'tai-san-moi.js', 'giam-sat.js', 'bieu-do.js', 'qr-rules.js', 'fonts/BeVietnamPro-Regular.ttf', 'fonts/BeVietnamPro-Bold.ttf', 'export.js', 'excel-rules.js', 'supabase-db.js', 'config.js', 'robots.txt']) {
  const r = await fetch(`${WEB_URL}/${f}`);
  ok(r.ok, `/${f} → ${r.status}`);
}
// dữ liệu tài sản: thường (chưa khoá) hoặc mã hoá (đã đặt KIEMKE_KHOA_DU_LIEU trên Vercel) — BAO-MAT.md
{
  const v = await (await fetch(`${WEB_URL}/data/version.json?t=${Date.now()}`, { cache: 'no-store' })).json().catch(() => ({}));
  const thuong = ['data/assets.js', 'data/so-ma-qr.js', 'data/goc.xlsx'], mh = ['data/assets.enc', 'data/so-ma-qr.enc', 'data/goc.xlsx.enc'];
  const st = async f => (await fetch(`${WEB_URL}/${f}`)).status;
  if (v.ma_hoa) {
    const a = await Promise.all(thuong.map(st)), b = await Promise.all(mh.map(st));
    ok(a.every(s => s === 404), `dữ liệu đã khoá: không tải được bản thường (${thuong.map((f, i) => f + ' → ' + a[i]).join(', ')})`);
    ok(b.every(s => s === 200), `dữ liệu đã khoá: có bản mã hoá (${mh.map((f, i) => f + ' → ' + b[i]).join(', ')})`);
  } else {
    const a = await Promise.all(thuong.map(st));
    ok(a.every(s => s === 200), `dữ liệu tài sản: ${thuong.map((f, i) => f + ' → ' + a[i]).join(', ')} · CHƯA khoá (ai có link vẫn tải được)`);
  }
}
// tiêu đề bảo mật (vercel.json) + chính sách chặn mã lạ (CSP, chèn khi build)
{
  const r = await fetch(`${WEB_URL}/?t=${Date.now()}`), h = k => r.headers.get(k) || '', html = await r.text();
  ok(h('x-content-type-options') === 'nosniff' && /DENY/i.test(h('x-frame-options')) && h('referrer-policy') && h('permissions-policy') && /noindex/.test(h('x-robots-tag')),
    'tiêu đề bảo mật: nosniff, chặn nhúng trang, referrer, quyền thiết bị, không lập chỉ mục');
  ok(/<meta http-equiv="Content-Security-Policy" content="[^"]*script-src 'self' 'sha256-/.test(html), 'có chính sách chặn mã lạ (CSP) theo dấu băm');
}
try {
  const dem = docs => { const nLog = docs.filter(d => d.col === 'log').length; return `${docs.length - nLog} bản ghi kết quả, ${nLog} dòng lịch sử thao tác`; };
  const tt = await trangThaiDangNhap();
  if (!tt.da_cai) ok(true, `Supabase đọc được (${dem(await docTatCa())}) · CHƯA bật đăng nhập: ai có link đều đọc, sửa được`);
  else {
    ok(true, `Supabase hoạt động · đã bật đăng nhập (${tt.co_quan_tri ? 'đã có tài khoản quản trị' : 'CHƯA có tài khoản quản trị: mở trang để tạo'})`);
    // không đăng nhập: phải không đọc được gì (bị từ chối 401/403, hoặc ra rỗng)
    const an = await docTatCa().catch(e => /\b(401|403)\b|permission denied/i.test(e.message) ? [] : Promise.reject(e));
    ok(!an.length, an.length ? `người KHÔNG đăng nhập vẫn đọc được ${an.length} bản ghi — kiểm tra lại quyền (chạy lại supabase/dang-nhap.sql)` : 'người không đăng nhập không đọc được dữ liệu');
    // máy chủ đã chạy dang-nhap.sql bản mới (có hàm mật khẩu ban đầu, 17/11/2026): hàm có thật nhưng người lạ không gọi được.
    // Chỉ gọi một hàm chỉ-đọc, bị từ chối ngay → không đọc, không ghi gì.
    // (ly_lich_tai_san: bản có giám sát lịch sử, 18/11/2026 — hàm mới nhất của file; gửi đúng tên tham số để máy chủ nhận ra hàm)
    const { url, key } = supabaseConfig();
    const r = await fetch(`${url}/rest/v1/rpc/ly_lich_tai_san`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: '{"p_keys":[],"p_limit":1}' }), t = await r.text();
    ok(/42501|permission denied/.test(t), /PGRST202/.test(t) ? 'máy chủ CHƯA chạy supabase/dang-nhap.sql bản mới nhất (thiếu phần giám sát lịch sử): chạy lại trong Supabase → SQL Editor'
      : /42501|permission denied/.test(t) ? 'máy chủ đã chạy dang-nhap.sql bản mới nhất (mật khẩu ban đầu, Miễn mã 6 số, dung lượng kho ảnh, Tài sản mới, giám sát lịch sử; người lạ không gọi được hàm)' : `hàm ly_lich_tai_san trả lạ: ${r.status} ${t.slice(0, 120)}`);
    const token = await dangNhapToken().catch(e => { ok(false, e.message); return null; });
    if (token) ok(true, `đọc bằng tài khoản thành viên (KIEMKE_TEN): ${dem(await docTatCa(token))}`);
  }
}
catch (e) { ok(false, 'Supabase: ' + e.message); }

console.log(loi ? `\n✗ ${loi} mục không đạt` : '\n✓ Trang web hoạt động bình thường');
process.exit(loi ? 1 : 0);
