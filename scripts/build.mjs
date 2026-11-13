// Dựng trang web vào thư mục dist/:
//  1. Đọc file Excel trong "dữ liệu cập nhật/" → dist/data/assets.js (danh sách tài sản cho trang)
//  2. Chép nguyên file Excel → dist/data/goc.xlsx (mẫu cho chức năng "Xuất cho kế toán")
//  3. Chép web/* → dist/
// Vercel chạy lệnh này (npm run build) mỗi lần có thay đổi được đẩy lên GitHub.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { findExcel, DATA_DIR } from './excel-file.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

/* ---------- đọc Excel ---------- */
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
  .toLowerCase().replace(/\s+/g, ' ').trim();

// Cột nhận diện theo TÊN tiêu đề (không phụ thuộc vị trí). Thứ tự trong mảng = ưu tiên.
const COLS = {
  stt:  ['stt', 'so tt', 'so thu tu'],
  ma:   ['ma tscd', 'ma tai san', 'ma ts'],
  ten:  ['ten tscd', 'ten tai san', 'ten ts'],
  sl:   ['so sach', 'sl so sach', 'so luong'],
  ngay: ['ngay bat dau sd', 'ngay bat dau su dung', 'ngay su dung', 'ngay sd'],
  gia:  ['nguyen gia'],
  gc:   ['ghi chu', 'don vi', 'don vi quan ly', 'bo phan su dung'],
  vt:   ['vi tri', 'vi tri theo so', 'phong'],
};

function cellValue(c) {
  let v = c.value;
  if (v && typeof v === 'object') {
    if (v instanceof Date) return v;
    if ('result' in v) v = v.result;            // ô công thức
    else if ('richText' in v) v = v.richText.map(t => t.text).join('');
    else if ('text' in v) v = v.text;            // hyperlink
  }
  return v;
}
const str = v => (v == null ? '' : String(v instanceof Date ? v.toISOString().slice(0, 10) : v)).replace(/ /g, ' ').trim();
function num(v) {
  if (typeof v === 'number') return v;
  const s = str(v).replace(/[^\d,.-]/g, '');
  if (!s) return 0;
  // 1.234.567 hoặc 1,234,567 → bỏ dấu phân cách hàng nghìn
  const n = Number(s.replace(/[.,](?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
function isoDate(v) {
  if (v instanceof Date) return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}-${String(v.getUTCDate()).padStart(2, '0')}`;
  if (typeof v === 'number' && v > 20000 && v < 80000) {            // số ngày kiểu Excel
    return isoDate(new Date(Date.UTC(1899, 11, 30) + v * 86400000));
  }
  const s = str(v); let m;
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/))) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
  return '';
}

function headerMap(ws) {
  for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) {
    const row = ws.getRow(r); const found = {};
    row.eachCell({ includeEmpty: false }, (c, col) => {
      const h = norm(cellValue(c));
      // cột "Thực tế"/"SL thực tế" không phải số sổ sách — để dành cho lúc xuất (web/export.js)
      if (['thuc te', 'sl thuc te', 'so luong thuc te'].some(n => h === n || h.startsWith(n + ' ') || h.startsWith(n + '('))) return;
      for (const [k, names] of Object.entries(COLS)) {
        if (found[k]) continue;
        if (names.some(n => h === n || h.startsWith(n + ' ') || h.startsWith(n + '('))) { found[k] = col; break; }
      }
    });
    if (found.ten && (found.ma || found.sl)) return { row: r, cols: found };
  }
  return null;
}

async function readAssets(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const rows = []; const sheets = []; const warn = [];
  for (const ws of wb.worksheets) {
    const hm = headerMap(ws);
    if (!hm) continue;
    sheets.push(ws.name);
    const { cols } = hm;
    for (let r = hm.row + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const get = k => (cols[k] ? cellValue(row.getCell(cols[k])) : null);
      const ten = str(get('ten')); const ma = str(get('ma'));
      if (!ten && !ma) continue;
      rows.push({
        sttX: get('stt'), ma, ten,
        sl: cols.sl ? num(get('sl')) : 1,
        ngay: isoDate(get('ngay')), gia: num(get('gia')),
        gc: str(get('gc')), vt: str(get('vt')),
        sheet: ws.name, r,
      });
    }
  }
  if (!rows.length) throw new Error('Không tìm thấy dòng tài sản nào. Kiểm tra dòng tiêu đề có "Mã TSCĐ" và "Tên TSCĐ".');

  // STT: dùng cột STT của Excel nếu đủ và không trùng, nếu không đánh số lại 1..N
  const xs = rows.map(x => Number(x.sttX));
  const useX = xs.every(n => Number.isInteger(n) && n > 0) && new Set(xs).size === xs.length;
  // Khoá lưu kết quả: Mã TSCĐ (ổn định khi thêm/xoá/đổi thứ tự dòng); không có mã thì theo sheet + dòng
  const seen = new Map();
  const out = rows.map((x, i) => {
    const stt = useX ? xs[i] : i + 1;
    let key = x.ma ? x.ma : `khong-ma:${x.sheet}:${x.r}`;
    if (seen.has(key)) { warn.push(`Mã ${x.ma} trùng (sheet "${x.sheet}" dòng ${x.r} và dòng ${seen.get(key)})`); key = `${key}#${x.r}`; }
    seen.set(key, x.r);
    return [stt, x.ma, x.ten, x.sl, x.ngay, x.gia, x.gc, x.vt, key, x.sheet, x.r];
  });
  return { rows: out, sheets, warn };
}

/* ---------- dựng dist/ ---------- */
const file = findExcel();
console.log(`Đọc dữ liệu: ${path.relative(ROOT, file)}`);
const { rows, sheets, warn } = await readAssets(file);
warn.forEach(w => console.warn('  ! ' + w));

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

console.log(`Xong: ${rows.length} tài sản từ ${sheets.length} sheet (${sheets.join(', ')}) · phiên bản ${version}`);
console.log(`DATA_DIR=${path.relative(ROOT, DATA_DIR)}`);
