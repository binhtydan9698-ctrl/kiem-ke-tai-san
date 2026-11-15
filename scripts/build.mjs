// Dựng trang web vào thư mục dist/:
//  1. Đọc file Excel trong "dữ liệu cập nhật/" → dist/data/assets.js (danh sách tài sản cho trang)
//  2. Chép nguyên file Excel → dist/data/goc.xlsx (mẫu cho chức năng "Xuất cho kế toán")
//  3. Chép web/* → dist/
//  4. Cập nhật Sổ mã QR "dữ liệu cập nhật/so-ma-qr.json" (scripts/so-ma-qr.mjs) → dist/data/so-ma-qr.js
// Vercel chạy lệnh này (npm run build) mỗi lần có thay đổi được đẩy lên GitHub.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ExcelJS from 'exceljs';
import { findExcel } from './excel-file.mjs';
import { SO_FILE, docSo, vietSo, capNhatSo, homNay, bayGio, docDoiTay } from './so-ma-qr.mjs';
import { docKhoa, maHoa, cspTrang, bamMaChinh } from './ma-hoa.mjs';
import { supabaseConfig } from './cau-hinh.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.KIEMKE_DIST ? path.resolve(process.env.KIEMKE_DIST) : path.join(ROOT, 'dist');   // KIEMKE_DIST: bộ thử dựng bản mã hoá ra thư mục tạm
const KHOA = docKhoa();   // có khoá (Vercel) → dữ liệu tài sản chỉ ghi dạng mã hoá (BAO-MAT.md)

// Quy tắc nhận diện tiêu đề / dòng tổng / khoá tài sản dùng chung với web/export.js
await import(pathToFileURL(path.join(ROOT, 'web', 'excel-rules.js')).href);
const X = globalThis.KIEMKE_EXCEL;

/* ---------- chuyển kiểu ---------- */
const empty = v => v == null || v === '';
function num(v) {
  if (typeof v === 'number') return v;
  const s = X.str(v).replace(/[^\d,.-]/g, '');
  if (!s) return null;
  // 1.234.567 hoặc 1,234,567 → bỏ dấu phân cách hàng nghìn
  const n = Number(s.replace(/[.,](?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
function isoDate(v) {
  if (v instanceof Date) return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}-${String(v.getUTCDate()).padStart(2, '0')}`;
  if (typeof v === 'number' && v > 20000 && v < 80000) return isoDate(new Date(Date.UTC(1899, 11, 30) + v * 86400000)); // số ngày kiểu Excel
  const s = X.str(v); let m;
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/))) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
  return '';
}

/* ---------- đọc Excel ----------
 * Biên bản có thể có nhiều sheet (mỗi đơn vị một sheet + sheet "Tổng hợp"), cùng một tài sản xuất hiện ở nhiều sheet.
 * Gộp theo khoá (Mã TSCĐ): sheet "Tổng hợp" là gốc; ô nào ở đó trống thì lấy từ sheet khác (VD: Vị trí ghi ở sheet đơn vị).
 */
const FIELDS = ['stt', 'ten', 'sl', 'ngay', 'gia', 'gc', 'vt'];
async function readAssets(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheets = []; const items = new Map(); const conflicts = [];
  const chan = [];   // cùng Mã TSCĐ nhưng tên / ngày bắt đầu sử dụng / nguyên giá lệch giữa các sheet → theo quy tắc là 2 tài sản, chặn in tem
  const gon = s => String(s).replace(/\s+/g, ' ').trim();
  const order = wb.worksheets.map((ws, i) => ({ ws, i }))
    .sort((a, b) => (X.isPrimarySheet(b.ws.name) - X.isPrimarySheet(a.ws.name)) || a.i - b.i);
  for (const { ws } of order) {
    const hm = X.headerMap(ws);
    if (!hm) continue;
    sheets.push(ws.name);
    let prev = null;
    for (let r = hm.dataStart; r <= ws.rowCount; r++) {
      const x = X.readRow(ws, hm, r);
      if (!x) continue;
      if (x.tiepTen) {                       // phần tên bị xuống dòng → nối vào tài sản phía trên (STT liền trước)
        const sát = prev && prev.lastRow === r - 1 && (x.stt == null || prev.stt == null || prev.stt === x.stt - 1);
        if (sát && !prev.ten.includes(x.tiepTen)) prev.ten = `${prev.ten} ${x.tiepTen}`;
        continue;
      }
      const v = { stt: x.stt, ten: x.ten, sl: num(x.sl), ngay: isoDate(x.ngay), gia: num(x.gia), gc: x.gc, vt: x.vt };
      const cur = items.get(x.key);
      if (!cur) { prev = { ...v, ma: x.ma, key: x.key, sheet: ws.name, r, lastRow: r, sheets: [ws.name] }; items.set(x.key, prev); continue; }
      prev = cur; cur.lastRow = r; if (!cur.sheets.includes(ws.name)) cur.sheets.push(ws.name);
      for (const f of FIELDS) {
        if (empty(cur[f]) && !empty(v[f])) cur[f] = v[f];
        else if (f === 'ten' && String(cur.ten).startsWith(String(v.ten))) continue;   // tên đã được nối phần xuống dòng
        else if (!empty(cur[f]) && !empty(v[f]) && String(cur[f]) !== String(v[f]))
        { conflicts.push(`Mã ${x.ma || x.key} · ${f}: "${cur[f]}" (sheet ${cur.sheet}) khác "${v[f]}" (sheet ${ws.name}) → dùng "${cur[f]}"`);
          if (['ten', 'ngay', 'gia'].includes(f) && !(f === 'ten' && gon(cur.ten) === gon(v.ten))) chan.push({ key: x.key, f, a: cur[f], sa: cur.sheet, b: v[f], sb: ws.name }); }
      }
    }
  }
  const list = [...items.values()];
  if (!list.length) throw new Error('Không tìm thấy dòng tài sản nào. Kiểm tra dòng tiêu đề có "Mã TSCĐ" và "Tên TSCĐ".');

  // STT: dùng STT trong Excel nếu đủ và không trùng, nếu không đánh số lại 1..N
  const xs = list.map(x => x.stt);
  const useX = xs.every(n => Number.isInteger(n) && n > 0) && new Set(xs).size === xs.length;
  // Nhóm lẻ (chưa rõ vị trí): tên sheet lẻ đầu tiên theo thứ tự X.REVIEW_SHEETS mà tài sản có mặt
  const nhomLe = x => { const ds = x.sheets.map(X.reviewSheet).filter(Boolean); return X.REVIEW_SHEETS.find(s => ds.includes(s)) || ''; };
  const rows = list.map((x, i) => [useX ? x.stt : i + 1, x.ma, x.ten, x.sl ?? 1, x.ngay, x.gia ?? 0, x.gc, x.vt, x.key, x.sheet, x.r, nhomLe(x)]);
  return { rows, sheets, conflicts, useX, chan };
}

/* ---------- dựng dist/ ---------- */
const file = findExcel();
console.log(`Đọc dữ liệu: ${path.relative(ROOT, file)}`);
const { rows, sheets, conflicts, useX, chan } = await readAssets(file);
const TRUONG = { ten: 'Tên', ngay: 'Ngày bắt đầu sử dụng', gia: 'Nguyên giá' };
const soChan = {};
chan.forEach(c => { (soChan[c.key] = soChan[c.key] || []).push(`${TRUONG[c.f]} "${c.a}" (sheet ${c.sa}) khác "${c.b}" (sheet ${c.sb})`); });
for (const k in soChan) soChan[k] = soChan[k].join('; ');
if (conflicts.length) {
  console.warn(`  ! ${conflicts.length} ô ghi khác nhau giữa các sheet (đã ưu tiên sheet Tổng hợp):`);
  conflicts.slice(0, 8).forEach(c => console.warn('    ' + c));
  if (conflicts.length > 8) console.warn(`    … và ${conflicts.length - 8} ô khác`);
}
if (!useX) console.warn('  ! Cột STT trống hoặc trùng, đã đánh số lại 1..N');

const buf = fs.readFileSync(file);
const version = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
const meta = { version, file: path.basename(file), sheets, count: rows.length, builtAt: new Date().toISOString() };

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'data'), { recursive: true });
fs.cpSync(path.join(ROOT, 'web'), DIST, { recursive: true, filter: s => !/\.md$/i.test(s) });   // không phát hành AGENTS.md
fs.writeFileSync(path.join(DIST, 'data', 'assets.js'),
  `// Sinh tự động từ "${path.relative(ROOT, file).replace(/\\/g, '/')}" — đừng sửa tay, sửa file Excel.\n` +
  `window.KIEMKE_DATA=${JSON.stringify({ ...meta, rows })};\n`);
fs.copyFileSync(file, path.join(DIST, 'data', 'goc.xlsx'));

/* ---------- Sổ mã QR: mã đã cấp không bao giờ mất, tài sản bị xoá vẫn giữ ---------- */
const SQ = capNhatSo(rows, docSo(), homNay(), { file: path.basename(file), luc: bayGio(), doiTay: docDoiTay() });
// Trên Vercel chỉ tính trong bộ nhớ (sổ được commit từ máy cùng file Excel); trên máy thì ghi lại sổ khi có thay đổi
if (SQ.doi && !process.env.VERCEL) fs.writeFileSync(SO_FILE, vietSo(SQ.so));
// cho trang: đang dùng {khoá: [lúc vào sổ, số thứ tự file]}, đã xoá {khoá: thông tin lúc còn trong sổ},
// đổi mã {mã cũ: mã mới} (kế toán đổi Mã TSCĐ cho cùng một tài sản: tem mã cũ mở tài sản mã mới)
const soDang = {}, soXoa = {}, soFile = [], soSang = {};
const fileSo = f => { if (!f) return -1; let i = soFile.indexOf(f); if (i < 0) { soFile.push(f); i = soFile.length - 1; } return i; };
for (const [k, e] of Object.entries(SQ.so.ma)) { if (e.xoa) soXoa[k] = e; else soDang[k] = [e.tu, fileSo(e.file)]; if (e.sang) soSang[k] = e.sang.ma; }
const soQR = { capNhat: SQ.so.capNhat, files: soFile, dang: soDang, xoa: soXoa, chan: soChan, sang: soSang };
fs.writeFileSync(path.join(DIST, 'data', 'so-ma-qr.js'),
  '// Sinh tự động từ "dữ liệu cập nhật/so-ma-qr.json" — đừng sửa tay.\n' +
  `window.KIEMKE_SO_QR=${JSON.stringify(soQR)};\n`);

/* ---------- Bảo mật (BAO-MAT.md) ---------- */
// 1. Có khoá (Vercel): danh sách tài sản, Sổ mã QR, file Excel gốc CHỈ ghi dạng mã hoá; trang giải mã sau khi đăng nhập
if (KHOA) {
  const ghiMaHoa = (ten, noiDung) => fs.writeFileSync(path.join(DIST, 'data', ten), maHoa(KHOA, noiDung));
  ghiMaHoa('assets.enc', JSON.stringify({ ...meta, rows }));
  ghiMaHoa('so-ma-qr.enc', JSON.stringify(soQR));
  ghiMaHoa('goc.xlsx.enc', buf);
  for (const f of ['assets.js', 'so-ma-qr.js', 'goc.xlsx']) fs.rmSync(path.join(DIST, 'data', f), { force: true });
}
fs.writeFileSync(path.join(DIST, 'data', 'version.json'), JSON.stringify({ ...meta, ma_hoa: !!KHOA }));
// 2. Chính sách chặn mã lạ (CSP): chỉ khối mã chính của trang (theo dấu băm) và các CDN đã cho phép mới chạy được
{
  const f = path.join(DIST, 'index.html'), html = fs.readFileSync(f, 'utf8');
  let sbUrl = ''; try { sbUrl = supabaseConfig().url; } catch { }
  const csp = cspTrang(bamMaChinh(html), sbUrl);
  if (!/<meta charset="utf-8">/i.test(html)) throw new Error('index.html thiếu <meta charset="utf-8"> để chèn CSP');
  fs.writeFileSync(f, html.replace(/<meta charset="utf-8">/i, m => `${m}\n<meta http-equiv="Content-Security-Policy" content="${csp}">`));
}

const le = X.REVIEW_SHEETS.map(s => `${s} ${rows.filter(r => r[11] === s).length}`).join(', ');
console.log(`Xong: ${rows.length} tài sản từ ${sheets.length} sheet · phiên bản ${version}` + (KHOA ? ' · dữ liệu tài sản đã MÃ HOÁ (chỉ thành viên đăng nhập mở được)' : ''));
console.log(`  Chưa có vị trí (sheet lẻ): ${le}`);
console.log(`  Sổ mã QR: ${Object.keys(SQ.so.ma).length} mã đã cấp (đang dùng ${Object.keys(soDang).length}, đã xoá khỏi BBKK ${Object.keys(soXoa).length})`
  + (SQ.moi.length ? ` · mới cấp ${SQ.moi.length}` : '') + (SQ.xoa.length ? ` · vừa xoá khỏi BBKK ${SQ.xoa.length}: ${SQ.xoa.slice(0, 10).join(', ')}` : '')
  + (SQ.quayLai.length ? ` · quay lại ${SQ.quayLai.length}` : '') + (Object.keys(soSang).length ? ` · mã cũ đã đổi sang mã mới ${Object.keys(soSang).length}` : '')
  + (SQ.doi && process.env.VERCEL ? ' (chưa ghi sổ: đang chạy trên Vercel)' : ''));
SQ.doiMa.forEach(d => console.log(`  ↪ Kế toán đổi Mã TSCĐ ${d.cu} → ${d.moi} (${d.cach}): cùng một tài sản, tem mang mã cũ vẫn mở đúng tài sản`));
SQ.canhBao.forEach(c => console.warn('  ! ' + c));
if (SQ.nghiDoi.length) {
  console.warn(`  ! Nghi kế toán đổi Mã TSCĐ (chưa nối): nếu đúng là cùng một tài sản, khai báo trong "dữ liệu cập nhật/doi-ma-tscd.json" {"doi":[{"cu":"mã cũ","moi":"mã mới"}]}`);
  SQ.nghiDoi.slice(0, 10).forEach(c => console.warn('    ' + c));
}
if (Object.keys(soChan).length) {
  console.warn(`  ✗ ${Object.keys(soChan).length} Mã TSCĐ có thông tin lệch giữa các sheet: theo quy tắc là 2 tài sản khác nhau, phải khác mã QR → đã chặn in tem, cần kế toán sửa cho thống nhất:`);
  Object.entries(soChan).slice(0, 10).forEach(([k, l]) => console.warn(`    Mã ${k}: ${l}`));
}
if (SQ.khongMa.length) console.warn(`  ! ${SQ.khongMa.length} tài sản chưa có Mã TSCĐ: chưa cấp mã QR được (STT ${SQ.khongMa.slice(0, 10).map(r => r[0]).join(', ')})`);
