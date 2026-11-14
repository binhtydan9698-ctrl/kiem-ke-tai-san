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
{ const le = rows.filter(r => r[11]); const nhom = ['Xem lại phân bổ', 'Xem lại', 'Chưa có ghi chú'].map(s => `${s} ${le.filter(r => r[11] === s).length}`).join(' · ');
  ok(rows.every(r => typeof r[11] === 'string') && le.length > 0, `tài sản chưa rõ vị trí (sheet lẻ) có nhóm riêng: ${nhom}`); }
ok(['web/index.html', 'web/export.js', 'web/excel-rules.js', 'web/config.js', 'web/supabase-db.js'].every(f => fs.existsSync(path.join(DIST, path.basename(f)))), 'dist/ có đủ file của trang');

/* 2b. Đối chiếu sheet "Tổng hợp" với các sheet con: Tổng hợp phải là tổng của tất cả sheet trước nó */
console.log('2b. Đối chiếu sheet Tổng hợp với các sheet con');
await import(pathToFileURL(path.join(ROOT, 'web', 'excel-rules.js')).href);
{
  const X = globalThis.KIEMKE_EXCEL;
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(path.join(DIST, 'data', 'goc.xlsx'));
  const so = v => { if (typeof v === 'number') return v; const s = X.str(v).replace(/[^\d,.-]/g, ''); if (!s) return null;
    const n = Number(s.replace(/[.,](?=\d{3}(\D|$))/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const ngay = v => v instanceof Date ? v.toISOString().slice(0, 10) : X.str(v);
  const per = {}; let tongCong = null;
  for (const ws of wb.worksheets) {
    const hm = X.headerMap(ws); if (!hm) continue;
    const list = per[ws.name] = [];
    for (let r = hm.dataStart; r <= ws.rowCount; r++) {
      const x = X.readRow(ws, hm, r);
      if (x && !x.tiepTen) { list.push({ key: x.key, ma: x.ma || x.key, sl: so(x.sl), gia: so(x.gia), ngay: ngay(x.ngay), r }); continue; }
      if (!x && X.isPrimarySheet(ws.name) && /tong cong/.test(X.norm(X.str(X.cellValue(ws.getRow(r).getCell(hm.cols.ten)))))) {
        const row = ws.getRow(r); const g = k => hm.cols[k] ? so(X.cellValue(row.getCell(hm.cols[k]))) : null;
        tongCong = { sl: g('sl'), gia: g('gia'), r };
      }
    }
  }
  const TH = Object.keys(per).find(n => X.isPrimarySheet(n));
  const con = Object.keys(per).filter(n => n !== TH);
  if (!TH || !con.length) console.log('  – Không có sheet "Tổng hợp" cùng các sheet con, bỏ qua đối chiếu');
  else {
    const T = new Map(per[TH].map(a => [a.key, a]));
    const noi = new Map(); con.forEach(n => per[n].forEach(a => (noi.get(a.key) || noi.set(a.key, []).get(a.key)).push({ n, a })));
    const ds = (l, f) => l.slice(0, 5).map(f).join('; ') + (l.length > 5 ? `; … và ${l.length - 5} mục khác` : '');
    const tongDong = con.reduce((s, n) => s + per[n].length, 0);
    ok(per[TH].length === T.size, `"${TH}" không có mã ghi trùng (${per[TH].length} dòng)`);
    const thieu = [...noi.entries()].filter(([k]) => !T.has(k)).map(([, l]) => l[0]);
    ok(!thieu.length, `mọi tài sản ở ${con.length} sheet con đều có trong "${TH}"` +
      (thieu.length ? ` — THIẾU ${thieu.length}: ${ds(thieu, ({ n, a }) => `mã ${a.ma} (sheet ${n}, dòng ${a.r})`)}` : ` (${tongDong} dòng, bỏ trùng còn ${noi.size} mã)`));
    const thua = per[TH].filter(a => !noi.has(a.key));
    ok(!thua.length, `"${TH}" không có tài sản nằm ngoài các sheet con` +
      (thua.length ? ` — THỪA ${thua.length}: ${ds(thua, a => `mã ${a.ma} (dòng ${a.r})`)}` : ''));
    const lech = [];
    for (const [k, l] of noi) { const t = T.get(k); if (!t) continue;
      for (const { n, a } of l) {
        if (a.gia != null && t.gia != null && Math.abs(a.gia - t.gia) > 0.5) lech.push(`mã ${a.ma}: nguyên giá Tổng hợp ${t.gia} ≠ ${n} ${a.gia}`);
        if (a.ngay && t.ngay && a.ngay !== t.ngay) lech.push(`mã ${a.ma}: ngày Tổng hợp ${t.ngay} ≠ ${n} ${a.ngay}`);
      } }
    ok(!lech.length, 'nguyên giá và ngày của từng tài sản khớp giữa Tổng hợp và sheet con' + (lech.length ? ` — LỆCH ${lech.length}: ${ds(lech, s => s)}` : ''));
    const slTH = per[TH].reduce((s, a) => s + (a.sl || 0), 0), giaTH = per[TH].reduce((s, a) => s + (a.gia || 0), 0);
    const vn = v => Math.round(v).toLocaleString('vi-VN');
    if (tongCong && (tongCong.sl != null || tongCong.gia != null))
      ok((tongCong.sl == null || Math.abs(tongCong.sl - slTH) < 0.5) && (tongCong.gia == null || Math.abs(tongCong.gia - giaTH) < 1),
        `dòng TỔNG CỘNG (dòng ${tongCong.r}) khớp tổng tính lại: SL ${vn(slTH)} · nguyên giá ${vn(giaTH)} đ` +
        (tongCong.sl != null && Math.abs(tongCong.sl - slTH) >= 0.5 ? ` — Excel ghi SL ${vn(tongCong.sl)}` : '') +
        (tongCong.gia != null && Math.abs(tongCong.gia - giaTH) >= 1 ? ` — Excel ghi nguyên giá ${vn(tongCong.gia)}` : ''));
    else console.log(`  – "${TH}" không có dòng TỔNG CỘNG (hoặc chưa lưu kết quả công thức), bỏ qua so tổng`);
    // Số lượng khác nhau: chỉ ghi chú, vì tài sản dùng chung có thể được chia cho nhiều đơn vị (VD Tổng hợp 3 = 1+1+1)
    const slKhac = [...noi.entries()].filter(([k, l]) => T.has(k) && l.some(({ a }) => a.sl != null && T.get(k).sl != null && a.sl !== T.get(k).sl));
    slKhac.forEach(([k, l]) => console.log(`  ! mã ${T.get(k).ma}: số lượng Tổng hợp ${T.get(k).sl}, các sheet con ghi ${l.map(({ n, a }) => `${n} ${a.sl}`).join(', ')} (kiểm tra nếu không phải tài sản dùng chung)`));
  }
}

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
