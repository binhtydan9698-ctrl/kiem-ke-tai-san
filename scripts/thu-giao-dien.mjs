// Thử giao diện tự động (npm run thu-giao-dien): build → mở máy chủ tạm → mở Edge/Chrome chạy ngầm → chạy các kịch bản trong
// scripts/thu-giao-dien-kich-ban.js ở chế độ CHỈ LƯU TRÊN MÁY (không đọc, không ghi Supabase) → in ✓ / ✗ → dọn trang thử.
// Cần: Microsoft Edge hoặc Google Chrome trên máy (hoặc biến CHROME_PATH), có mạng (thư viện tải từ CDN).
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const KICH_BAN = [
  { ten: 'dau-trang', mo: 'Đầu trang, 4 phần chính, menu con' },
  { ten: 'quet-ma', mo: 'Quét mã: tem mở thẳng tài sản, không đoán' },
  { ten: 'in-tem', mo: 'In tem mã QR: xem trước, PDF, PNG, CSV, In ngay (đọc lại mọi mã)', cho: 240000 },
  { ten: 'lich-su', mo: 'Lịch sử: Nhập sổ, Lý lịch, Trạng thái sử dụng' },
  { ten: 'quet-lien-tuc', mo: 'Quét liên tục trong phòng' },
  { ten: 'doi-ma', mo: 'Kế toán đổi Mã TSCĐ: tem mã cũ mở tài sản mã mới, lý lịch gộp' },
  { ten: 'phong-ban', mo: 'Phòng bổ sung (Gamma, Alpha), quy tắc “xong”, đổi phòng ban như đổi phòng, Tải Excel Tổng hợp' },
  { ten: 'ket-qua', mo: 'Bảng tổng quan: nút “Xem →” ở 3 ô đầu, trang Kết quả đã kiểm / Lệch số lượng' },
  { ten: 'xuat-goc', mo: 'Xuất cho kế toán sau nhiều thao tác thật: file gốc giữ nguyên, chỉ khác 3 cột cuối + sheet Tài sản phát sinh' },
  { ten: 'chung', mo: 'Chung: 5 mục, khấu hao (chọn số năm), đầu mối theo sheet, không xuất cho kế toán, Ảnh tài sản khi chưa đăng nhập' },
  { ten: 'dang-nhap-dau', mo: 'Đăng nhập: lần đầu tạo tài khoản quản trị (đăng nhập giả, không đụng Supabase)' },
  { ten: 'dang-nhap', mo: 'Đăng nhập: mật khẩu, chặn nhập sai, chính sách mật khẩu, xác thực 2 bước, thành viên, quyền, Danh bạ, tự đăng xuất' },
  { ten: 'anh', mo: 'Ảnh: nút ⋯ trên dòng tài sản (mã QR, tải ảnh lên, thu nhỏ, xem kiểu Messenger) + Chung › Ảnh tài sản (xem, tìm, thêm, xếp, quyền, trợ năng)' },
  { ten: 'ma-hoa', mo: 'Dữ liệu tài sản mã hoá: chưa đăng nhập không đọc được, đăng nhập xong giải mã và chạy', maHoa: true },
  { ten: 'nang-cap-dt', mo: 'Nâng cấp điện thoại: việc kiểm lên trước, vùng bấm ≥ 44px, chữ ≥ 13px, thanh tiến độ dính, banner gọn', dt: true },
  { ten: 'nang-cap-pc', mo: 'Nâng cấp — máy tính giữ bố cục cũ, thanh tiến độ dính, chữ ≥ 13px' },
  { ten: 'tro-nang', mo: 'Trợ năng (axe-core, WCAG 2.2 AA) trên 14 trang chính — cỡ máy tính' },
  { ten: 'tro-nang-dt', mo: 'Trợ năng (axe-core, WCAG 2.2 AA) trên 14 trang chính — cỡ điện thoại', dt: true },
  { ten: 'dien-thoai', mo: 'Điện thoại (390px): thanh dưới, không tràn ngang', dt: true },
];

let loi = 0;
const ok = (dk, msg) => { if (dk) console.log('  ✓ ' + msg); else { loi++; console.log('  ✗ ' + msg); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 1. build (bản thường vào dist/, bản MÃ HOÁ với khoá thử vào thư mục tạm) + trang thử chỉ lưu trên máy.
//    Mọi thứ bộ thử chèn vào trang đều là file .js riêng (không chèn mã trực tiếp) để trang chạy dưới đúng CSP như trên web.
const dung = env => { const r = spawnSync(process.execPath, [path.join('scripts', 'build.mjs')], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, KIEMKE_KHOA_DU_LIEU: '', ...env } }); if (r.status !== 0) { console.log(r.stdout + r.stderr); console.log('✗ Build lỗi, dừng.'); process.exit(1); } };
dung({});
const MAHOA = fs.mkdtempSync(path.join(os.tmpdir(), 'thu-ma-hoa-')), KHOA_THU = crypto.randomBytes(32).toString('base64');
dung({ KIEMKE_DIST: MAHOA, KIEMKE_KHOA_DU_LIEU: KHOA_THU });
const chen = (s, sau, them) => { const i = s.indexOf(sau); if (i < 0) throw new Error('không thấy ' + sau); return s.slice(0, i + sau.length) + them + s.slice(i + sau.length); };
const TEP1 = 'try{localStorage.clear()}catch(e){}\nwindow.__CSP=[];document.addEventListener("securitypolicyviolation",e=>window.__CSP.push((e.effectiveDirective||e.violatedDirective)+" "+(e.blockedURI||"")));\n';
const TEP2 = `window.makeSupabaseDb=()=>null;window.__KHOA_THU=${JSON.stringify(KHOA_THU)};
window.kiemkeSauKhiNap=function(){   // kịch bản "quet-ma": 1 tài sản giả đã xoá khỏi BBKK; "doi-ma": mã cũ giả đã đổi sang 6497474
  if(location.search==="?quet-ma")KIEMKE_SO_QR.xoa["1234567"]={ten:"Tài sản thử đã xoá khỏi BBKK",donVi:"GD",vt:"108 Gamma",ngay:"2020-01-01",gia:15000000,tu:"2026-11-14",xoa:"2027-01-02"};
  if(location.search==="?doi-ma"){const r=KIEMKE_DATA.rows.find(x=>String(x[8])==="6497474");KIEMKE_SO_QR.xoa["7654321"]={ten:r[2],donVi:r[6],vt:r[7],ngay:r[4],gia:r[5],tu:"2026-11-14",file:"BBKK cũ.xlsx",xoa:"2027-01-02",sang:{ma:"6497474",luc:"2027-01-02 09:30",cach:"tự nhận"}};KIEMKE_SO_QR.sang={"7654321":"6497474"};}
};\n`;
const TEP_THU = ['_thu-giao-dien.html', '_thu-1.js', '_thu-2.js', '_thu-kich-ban.js', '_thu-dang-nhap-gia.js', '_so-sanh-excel.js'];
for (const d of [DIST, MAHOA]) {
  let trang = chen(fs.readFileSync(path.join(d, 'index.html'), 'utf8'), '<head>', '<script src="_thu-1.js"></script>');
  trang = chen(trang, '<script src="supabase-db.js"></script>', '<script src="_thu-2.js"></script><script src="_thu-dang-nhap-gia.js"></script>');
  trang = trang.replace('</body>', '<script src="_so-sanh-excel.js"></script><script src="_thu-kich-ban.js"></script></body>');
  fs.writeFileSync(path.join(d, '_thu-giao-dien.html'), trang);
  fs.writeFileSync(path.join(d, '_thu-1.js'), TEP1); fs.writeFileSync(path.join(d, '_thu-2.js'), TEP2);
  fs.copyFileSync(path.join(ROOT, 'scripts', 'thu-giao-dien-kich-ban.js'), path.join(d, '_thu-kich-ban.js'));
  fs.copyFileSync(path.join(ROOT, 'scripts', 'thu-dang-nhap-gia.js'), path.join(d, '_thu-dang-nhap-gia.js'));
  fs.copyFileSync(path.join(ROOT, 'scripts', 'so-sanh-excel.js'), path.join(d, '_so-sanh-excel.js'));   // so file Xuất cho kế toán với file gốc (kịch bản xuat-goc)   // đăng nhập giả (?dang-nhap…, ?ma-hoa)
}
const don = () => { for (const f of TEP_THU) try { fs.unlinkSync(path.join(DIST, f)); } catch { } try { fs.rmSync(MAHOA, { recursive: true, force: true }); } catch { } };

// 2. máy chủ tạm: dist/ ở "/", bản mã hoá ở "/ma-hoa/"
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
const may = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname), goc = DIST;
  if (p.startsWith('/ma-hoa/')) { goc = MAHOA; p = p.slice(7); }
  const f = path.join(goc, p.endsWith('/') ? p + 'index.html' : p);
  if (!f.startsWith(goc) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => may.listen(0, '127.0.0.1', r));
const GOC = `http://localhost:${may.address().port}/_thu-giao-dien.html`, GOC_MH = `http://localhost:${may.address().port}/ma-hoa/_thu-giao-dien.html`;

// 3. trình duyệt chạy ngầm, điều khiển qua DevTools
const ung = [process.env.CHROME_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'].filter(Boolean).find(p => fs.existsSync(p));
if (!ung) { console.log('Không tìm thấy Edge / Chrome trên máy (đặt biến CHROME_PATH). Bỏ qua thử giao diện.'); don(); may.close(); process.exit(1); }
const port = 9300 + Math.floor(Math.random() * 600), hoSo = fs.mkdtempSync(path.join(os.tmpdir(), 'thu-giao-dien-'));
const tr = spawn(ung, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${hoSo}`, '--window-size=1366,900', 'about:blank'], { stdio: 'ignore' });
let dich = null;
for (let i = 0; i < 75 && !dich; i++) { await sleep(200); try { dich = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page'); } catch { } }
if (!dich) { console.log('✗ Không mở được trình duyệt chạy ngầm.'); tr.kill(); don(); may.close(); process.exit(1); }
const ws = new WebSocket(dich.webSocketDebuggerUrl);
let id = 0; const cho = new Map(), loiTrang = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && cho.has(m.id)) { cho.get(m.id)(m); cho.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') loiTrang.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  else if (m.method === 'Page.javascriptDialogOpening') gui('Page.handleJavaScriptDialog', { accept: true, promptText: 'Người thử' });   // hộp hỏi tên: tự trả lời
  else if (m.method === 'Network.requestWillBeSent') {   // quy tắc vàng 3: bộ thử không bao giờ được gửi gì tới Supabase (dữ liệu chung)
    const u = m.params.request.url; soYeuCau++;
    if (/supabase\.co/i.test(u) || (SUPA && u.startsWith(SUPA))) guiSupa.push(`${m.params.request.method} ${u.slice(0, 90)}`);
  }
};
let soYeuCau = 0;   // tổng số yêu cầu mạng thấy được (chứng tỏ bộ theo dõi có chạy)
const guiSupa = [], SUPA =(/url:\s*["']([^"']+)["']/.exec(fs.readFileSync(path.join(ROOT, 'web', 'config.js'), 'utf8')) || [])[1] || '';
const gui = (method, params = {}) => new Promise(r => { const i = ++id; cho.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await new Promise(r => (ws.onopen = r));
await gui('Page.enable'); await gui('Runtime.enable'); await gui('Network.enable');

console.log(`Thử giao diện trên ${path.basename(ung)} chạy ngầm (chế độ chỉ lưu trên máy, không đọc / ghi Supabase)`);
let so = 0;
// dùng khi sửa: THU_CHI=anh,chung chỉ chạy các kịch bản này; THU_DT=1 chạy cỡ điện thoại; THU_CHUP=<thư mục> chụp màn hình cuối mỗi kịch bản
const CHI = (process.env.THU_CHI || '').split(',').filter(Boolean), CHUP = process.env.THU_CHUP || '';
for (const k of KICH_BAN) {
  if (CHI.length && !CHI.includes(k.ten)) continue;
  console.log(`${++so}. ${k.mo}`);
  await gui('Emulation.setDeviceMetricsOverride', (k.dt || process.env.THU_DT) ? { width: 390, height: 844, deviceScaleFactor: 2, mobile: true } : { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  loiTrang.length = 0;
  await gui('Page.navigate', { url: `${k.maHoa ? GOC_MH : GOC}?${k.ten}` });
  const t0 = Date.now(); let kq = null;
  while (Date.now() - t0 < (k.cho || 120000)) {
    await sleep(500);
    const r = await gui('Runtime.evaluate', { expression: "(()=>{const d=document.getElementById('dump');return d?d.textContent:''})()", returnByValue: true });
    const v = r.result?.result?.value; if (v) { try { kq = JSON.parse(v); if (kq.done) break; } catch { } }
  }
  if (!kq) { ok(false, `kịch bản không chạy xong sau ${Math.round((k.cho || 120000) / 1000)} giây`); continue; }
  kq.kq.forEach(([d, m]) => ok(d, m));
  const loiJs = [...new Set([...kq.err, ...loiTrang])];
  ok(!loiJs.length, 'không có lỗi JavaScript trên trang' + (loiJs.length ? ': ' + loiJs.slice(0, 3).join(' | ').slice(0, 300) : ''));
  // chính sách chặn mã lạ (CSP) không được chặn nhầm chức năng nào (bỏ qua pdf.js — chỉ bộ thử dùng để đọc lại PDF)
  const csp = JSON.parse((await gui('Runtime.evaluate', { expression: 'JSON.stringify(window.__CSP||[])', returnByValue: true })).result?.result?.value || '[]').filter(x => !/pdf\.worker|pdf\.js/.test(x));
  ok(!csp.length, 'không vi phạm chính sách chặn mã lạ (CSP)' + (csp.length ? ': ' + [...new Set(csp)].slice(0, 4).join(' | ') : ''));
  if (CHUP) { const m = (await gui('Page.getLayoutMetrics')).result.cssContentSize, r = await gui('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: m.width, height: Math.min(m.height, 6000), scale: 1 } }); fs.mkdirSync(CHUP, { recursive: true }); fs.writeFileSync(path.join(CHUP, k.ten + (process.env.THU_DT ? '-dt' : '') + '.png'), Buffer.from(r.result.data, 'base64')); }
}

console.log('Cuối cùng: dữ liệu chung trên Supabase');
ok(!guiSupa.length && soYeuCau > (CHI.length ? 0 : 100) && SUPA, guiSupa.length ? `bộ thử đã gửi ${guiSupa.length} yêu cầu tới Supabase: ${[...new Set(guiSupa)].slice(0, 3).join(' | ')}`
  : `theo dõi ${soYeuCau.toLocaleString('vi-VN')} yêu cầu mạng của cả bộ thử: không yêu cầu nào tới Supabase — dữ liệu chung không bị đụng (quy tắc vàng 3)`);

ws.close(); tr.kill(); may.close(); don();
try { fs.rmSync(hoSo, { recursive: true, force: true }); } catch { }
console.log(loi ? `\n✗ ${loi} mục KHÔNG đạt` : '\n✓ Giao diện: tất cả đều đạt');
process.exitCode = loi ? 1 : 0;
