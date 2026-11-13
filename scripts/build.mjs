// Dựng trang web vào thư mục dist/:
//  1. Đọc file Excel trong "dữ liệu cập nhật/" → dist/data/assets.js (danh sách tài sản cho trang)
//  2. Chép nguyên file Excel → dist/data/goc.xlsx (mẫu cho chức năng "Xuất cho kế toán")
//  3. Chép web/* → dist/
// Vercel chạy lệnh này (npm run build) mỗi lần có thay đổi được đẩy lên GitHub.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ExcelJS from 'exceljs';
import { findExcel } from './excel-file.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

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
      if (!cur) { prev = { ...v, ma: x.ma, key: x.key, sheet: ws.name, r, lastRow: r }; items.set(x.key, prev); continue; }
      prev = cur; cur.lastRow = r;
      for (const f of FIELDS) {
        if (empty(cur[f]) && !empty(v[f])) cur[f] = v[f];
        else if (f === 'ten' && String(cur.ten).startsWith(String(v.ten))) continue;   // tên đã được nối phần xuống dòng
        else if (!empty(cur[f]) && !empty(v[f]) && String(cur[f]) !== String(v[f]))
          conflicts.push(`Mã ${x.ma || x.key} · ${f}: "${cur[f]}" (sheet ${cur.sheet}) khác "${v[f]}" (sheet ${ws.name}) → dùng "${cur[f]}"`);
      }
    }
  }
  const list = [...items.values()];
  if (!list.length) throw new Error('Không tìm thấy dòng tài sản nào. Kiểm tra dòng tiêu đề có "Mã TSCĐ" và "Tên TSCĐ".');

  // STT: dùng STT trong Excel nếu đủ và không trùng, nếu không đánh số lại 1..N
  const xs = list.map(x => x.stt);
  const useX = xs.every(n => Number.isInteger(n) && n > 0) && new Set(xs).size === xs.length;
  const rows = list.map((x, i) => [useX ? x.stt : i + 1, x.ma, x.ten, x.sl ?? 1, x.ngay, x.gia ?? 0, x.gc, x.vt, x.key, x.sheet, x.r]);
  return { rows, sheets, conflicts, useX };
}

/* ---------- dựng dist/ ---------- */
const file = findExcel();
console.log(`Đọc dữ liệu: ${path.relative(ROOT, file)}`);
const { rows, sheets, conflicts, useX } = await readAssets(file);
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
fs.cpSync(path.join(ROOT, 'web'), DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'data', 'assets.js'),
  `// Sinh tự động từ "${path.relative(ROOT, file).replace(/\\/g, '/')}" — đừng sửa tay, sửa file Excel.\n` +
  `window.KIEMKE_DATA=${JSON.stringify({ ...meta, rows })};\n`);
fs.writeFileSync(path.join(DIST, 'data', 'version.json'), JSON.stringify(meta));
fs.copyFileSync(file, path.join(DIST, 'data', 'goc.xlsx'));

console.log(`Xong: ${rows.length} tài sản từ ${sheets.length} sheet · phiên bản ${version}`);
