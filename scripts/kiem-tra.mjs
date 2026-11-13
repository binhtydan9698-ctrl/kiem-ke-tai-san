// Kiểm tra tự động (npm test): build từ file Excel thật, soát dữ liệu, rồi chạy thử "Xuất cho kế toán"
// ngay trong Node (dùng đúng web/excel-rules.js + web/export.js) và mở lại file kết quả để soát từng sheet.
// Thoát mã 0 = đạt, 1 = có lỗi. Không ghi gì lên Supabase hay GitHub.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ExcelJS from 'exceljs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let loi = 0;
const ok = (dk, msg) => { if (dk) console.log('  ✓ ' + msg); else { loi++; console.log('  ✗ ' + msg); } };

/* 1. Build */
console.log('1. Build từ file Excel');
const b = spawnSync(process.execPath, [path.join('scripts', 'build.mjs')], { cwd: ROOT, encoding: 'utf8' });
process.stdout.write((b.stdout + b.stderr).trimEnd().replace(/^/gm, '     ') + '\n');
if (b.status !== 0) { console.error(b.stderr); console.log('✗ Build lỗi, dừng.'); process.exit(1); }

/* 2. Dữ liệu tài sản */
console.log('2. Dữ liệu tài sản (dist/data/assets.js)');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(DIST, 'data', 'assets.js'), 'utf8'), ctx);
const D = ctx.window.KIEMKE_DATA; const rows = D.rows;
ok(rows.length > 0, `${rows.length} tài sản`);
ok(new Set(rows.map(r => r[8])).size === rows.length, 'khoá (Mã TSCĐ) không trùng');
ok(new Set(rows.map(r => r[0])).size === rows.length, 'STT không trùng');
ok(rows.every(r => r[2] && r[2].length > 2), 'tài sản nào cũng có tên');
ok(rows.every(r => typeof r[3] === 'number' && r[3] >= 0), 'số lượng sổ sách là số ≥ 0');
ok(rows.every(r => r[4] === '' || /^\d{4}-\d{2}-\d{2}$/.test(r[4])), 'ngày đúng dạng yyyy-mm-dd');
ok(!rows.some(r => /^(tong cong|tổng cộng)/i.test(r[2]) || /^m[aã]\s*tsc/i.test(r[1])), 'không lẫn dòng TỔNG CỘNG / dòng tiêu đề');
ok(['web/index.html', 'web/export.js', 'web/excel-rules.js', 'web/config.js', 'web/supabase-db.js'].every(f => fs.existsSync(path.join(DIST, path.basename(f)))), 'dist/ có đủ file của trang');

/* 3. Xuất cho kế toán: chạy web/export.js trong Node */
console.log('3. Xuất Excel cho kế toán (chạy thử web/export.js)');
globalThis.window = globalThis;
globalThis.ExcelJS = ExcelJS;
await import(pathToFileURL(path.join(ROOT, 'web', 'excel-rules.js')).href);
const gocBuf = fs.readFileSync(path.join(DIST, 'data', 'goc.xlsx'));
globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => gocBuf.buffer.slice(gocBuf.byteOffset, gocBuf.byteOffset + gocBuf.byteLength) });
let blob = null, tenFile = '';
globalThis.document = { createElement: () => ({ click() { tenFile = this.download; }, remove() {} }), body: { appendChild() {} }, head: { appendChild() {} } };
URL.createObjectURL = x => { blob = x; return 'blob:kiem-tra'; };
URL.revokeObjectURL = () => {};
await import(pathToFileURL(path.join(ROOT, 'web', 'export.js')).href);

// Kết quả mẫu: 3 tài sản đầu có kết quả, còn lại "Chưa kiểm" (giống trang tạo ra)
const ketQua = {};
rows.forEach(r => { ketQua[r[8]] = { kq: 'Chưa kiểm', vt: '', gc: '', thucTe: '', sl: r[3], r: 'chua' }; });
const [a, bb, c] = rows;
ketQua[a[8]] = { kq: 'Đã kiểm - Đủ', vt: 'Phòng thử A', gc: '', thucTe: a[3], sl: a[3], r: 'du' };
ketQua[bb[8]] = { kq: 'Đã kiểm - Thiếu 1', vt: 'Phòng thử B', gc: 'Hỏng một phần', thucTe: Math.max(0, bb[3] - 1), sl: bb[3], r: 'thieu' };
ketQua[c[8]] = { kq: 'Chưa tìm thấy', vt: '', gc: 'Đại diện trả lời: đang mượn', thucTe: 0, sl: c[3], r: 'nf' };
const soDong = await window.xuatExcelKeToan({ ketQua, phatSinh: [{ mo_ta: 'Đồ thử', sl: 1, phong: 'P1', cond: 'Tốt', noi: 'Thử' }], tenFile: 'kiem-tra' });
ok(blob && tenFile.endsWith('.xlsx'), `tạo được file "${tenFile}"`);
ok(soDong === 3, `báo đúng 3 tài sản có kết quả (nhận ${soDong})`);

const X = globalThis.KIEMKE_EXCEL;
const goc = new ExcelJS.Workbook(); await goc.xlsx.load(gocBuf);
const moi = new ExcelJS.Workbook(); await moi.xlsx.load(Buffer.from(await blob.arrayBuffer()));
ok(moi.worksheets.length === goc.worksheets.length + 1, `giữ đủ ${goc.worksheets.length} sheet gốc + 1 sheet Tài sản phát sinh`);
const congThuc = ws => { let n = 0; ws.eachRow(r => r.eachCell(c => { if (c.formula || (c.value && c.value.formula)) n++; })); return n; };

let sheetDS = 0, thieuCot = [], thieuKq = [], saiMau = [], matCongThuc = [];
for (const wg of goc.worksheets) {
  const wm = moi.getWorksheet(wg.name);
  if (!wm) { thieuCot.push(wg.name); continue; }
  if (congThuc(wg) !== congThuc(wm)) matCongThuc.push(wg.name);
  const hm = X.headerMap(wg);
  if (!hm) continue;
  sheetDS++;
  let last = 0; wg.eachRow({ includeEmpty: false }, r => r.eachCell({ includeEmpty: false }, (cc, col) => { if (col > last) last = col; }));
  const tieuDe = [1, 2, 3].map(i => X.str(wm.getRow(hm.row).getCell(last + i).value));
  if (tieuDe.join('|') !== 'Kết quả kiểm kê|Vị trí thực tế|Ghi chú kiểm kê') thieuCot.push(wg.name);
  for (let r = hm.dataStart; r <= wg.rowCount; r++) {
    const x = X.readRow(wg, hm, r);
    if (!x || x.tiepTen) continue;
    const kq = X.str(wm.getRow(r).getCell(last + 1).value);
    if (!kq) { thieuKq.push(`${wg.name}!${r}`); continue; }
    if (kq !== ketQua[x.key].kq) saiMau.push(`${wg.name}!${r}`);
  }
}
ok(sheetDS > 0, `${sheetDS} sheet danh sách được nhận diện`);
ok(!thieuCot.length, '3 cột mới có ở mọi sheet danh sách' + (thieuCot.length ? ': thiếu ở ' + thieuCot.join(', ') : ''));
ok(!thieuKq.length, 'mọi dòng tài sản đều có Kết quả kiểm kê' + (thieuKq.length ? ` (thiếu ${thieuKq.length}: ${thieuKq.slice(0, 5).join(', ')})` : ''));
ok(!saiMau.length, 'kết quả ghi đúng tài sản ở mọi sheet' + (saiMau.length ? ` (sai ${saiMau.length}: ${saiMau.slice(0, 5).join(', ')})` : ''));
ok(!matCongThuc.length, 'giữ nguyên công thức (dòng TỔNG CỘNG…)' + (matCongThuc.length ? ': lệch ở ' + matCongThuc.join(', ') : ''));

console.log(loi ? `\n✗ ${loi} mục KHÔNG đạt` : '\n✓ Tất cả đều đạt');
process.exit(loi ? 1 : 0);
