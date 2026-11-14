// Thử giao diện tự động (npm run thu-giao-dien): build → mở máy chủ tạm → mở Edge/Chrome chạy ngầm → chạy các kịch bản trong
// scripts/thu-giao-dien-kich-ban.js ở chế độ CHỈ LƯU TRÊN MÁY (không đọc, không ghi Supabase) → in ✓ / ✗ → dọn trang thử.
// Cần: Microsoft Edge hoặc Google Chrome trên máy (hoặc biến CHROME_PATH), có mạng (thư viện tải từ CDN).
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const KICH_BAN = [
  { ten: 'dau-trang', mo: 'Đầu trang, 3 phần chính, menu con' },
  { ten: 'quet-ma', mo: 'Quét mã: tem mở thẳng tài sản, không đoán' },
  { ten: 'in-tem', mo: 'In tem mã QR: xem trước, PDF, PNG, CSV, In ngay (đọc lại mọi mã)', cho: 240000 },
  { ten: 'lich-su', mo: 'Lịch sử: Nhập sổ, Lý lịch, Trạng thái sử dụng' },
  { ten: 'quet-lien-tuc', mo: 'Quét liên tục trong phòng' },
  { ten: 'dien-thoai', mo: 'Điện thoại (390px): thanh dưới, không tràn ngang', dt: true },
];

let loi = 0;
const ok = (dk, msg) => { if (dk) console.log('  ✓ ' + msg); else { loi++; console.log('  ✗ ' + msg); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 1. build + trang thử (chỉ lưu trên máy; kịch bản "quet-ma" có thêm 1 tài sản giả đã xoá khỏi BBKK)
const b = spawnSync(process.execPath, [path.join('scripts', 'build.mjs')], { cwd: ROOT, encoding: 'utf8' });
if (b.status !== 0) { console.log(b.stdout + b.stderr); console.log('✗ Build lỗi, dừng.'); process.exit(1); }
const goc = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const chen = (s, sau, them) => { const i = s.indexOf(sau); if (i < 0) throw new Error('không thấy ' + sau); return s.slice(0, i + sau.length) + them + s.slice(i + sau.length); };
let trang = chen(goc, '<head>', '<script>try{localStorage.clear()}catch(e){}</script>');
trang = chen(trang, '<script src="supabase-db.js"></script>', '<script>window.makeSupabaseDb=()=>null;</script>');
trang = chen(trang, '<script src="data/so-ma-qr.js"></script>', '<script>if(location.search==="?quet-ma")KIEMKE_SO_QR.xoa["1234567"]={ten:"Tài sản thử đã xoá khỏi BBKK",donVi:"GD",vt:"108 Gamma",ngay:"2020-01-01",gia:15000000,tu:"2026-11-14",xoa:"2027-01-02"};</script>');
trang = trang.replace('</body>', '<script src="_thu-kich-ban.js"></script></body>');
fs.writeFileSync(path.join(DIST, '_thu-giao-dien.html'), trang);
fs.copyFileSync(path.join(ROOT, 'scripts', 'thu-giao-dien-kich-ban.js'), path.join(DIST, '_thu-kich-ban.js'));
const don = () => { for (const f of ['_thu-giao-dien.html', '_thu-kich-ban.js']) try { fs.unlinkSync(path.join(DIST, f)); } catch { } };

// 2. máy chủ tạm cho dist/
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
const may = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname), f = path.join(DIST, p.endsWith('/') ? p + 'index.html' : p);
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => may.listen(0, '127.0.0.1', r));
const GOC = `http://localhost:${may.address().port}/_thu-giao-dien.html`;

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
};
const gui = (method, params = {}) => new Promise(r => { const i = ++id; cho.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await new Promise(r => (ws.onopen = r));
await gui('Page.enable'); await gui('Runtime.enable');

console.log(`Thử giao diện trên ${path.basename(ung)} chạy ngầm (chế độ chỉ lưu trên máy, không đọc / ghi Supabase)`);
let so = 0;
for (const k of KICH_BAN) {
  console.log(`${++so}. ${k.mo}`);
  await gui('Emulation.setDeviceMetricsOverride', k.dt ? { width: 390, height: 844, deviceScaleFactor: 2, mobile: true } : { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  loiTrang.length = 0;
  await gui('Page.navigate', { url: `${GOC}?${k.ten}` });
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
}

ws.close(); tr.kill(); may.close(); don();
try { fs.rmSync(hoSo, { recursive: true, force: true }); } catch { }
console.log(loi ? `\n✗ ${loi} mục KHÔNG đạt` : '\n✓ Giao diện: tất cả đều đạt');
process.exitCode = loi ? 1 : 0;
