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

/* 4. Mã QR trên tem: mọi tài sản → tạo mã QR → đọc lại bằng bộ giải mã → phải ra đúng tài sản đó */
console.log('4. Mã QR trên tem (web/qr-rules.js)');
{
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const qrcode = require('qrcode-generator');
  const jsQRm = require('jsqr'); const jsQR = jsQRm.default || jsQRm;
  await import(pathToFileURL(path.join(ROOT, 'web', 'qr-rules.js')).href);
  const Q = globalThis.KIEMKE_QR;
  const { WEB_URL } = await import('./cau-hinh.mjs');
  ok(Q.WEB.replace(/\/$/, '') === WEB_URL, `mã QR dẫn tới đúng địa chỉ web (${Q.WEB})`);
  ok(['qr-rules.js', 'ma-qr.js', 'fonts/BeVietnamPro-Regular.ttf', 'fonts/BeVietnamPro-Bold.ttf'].every(f => fs.existsSync(path.join(DIST, f))), 'dist/ có file mã QR và phông chữ in tem');
  // tạo mã như trang (qrcode-generator, kiểu Byte), vẽ thành ảnh đen trắng có vùng trắng 4 ô, giải mã bằng jsQR
  const docLai = (text, ecc) => {
    const q = qrcode(0, ecc); q.addData(text, 'Byte'); q.make();
    const n = q.getModuleCount(), sc = 3, N = n + 8, W = N * sc, d = new Uint8ClampedArray(W * W * 4).fill(255);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c))
      for (let y = 0; y < sc; y++) for (let x = 0; x < sc; x++) { const j = (((r + 4) * sc + y) * W + (c + 4) * sc + x) * 4; d[j] = d[j + 1] = d[j + 2] = 0; }
    const kq = jsQR(d, W, W); return { n, data: kq && kq.data };
  };
  const byKey = new Map(rows.map(r => [r[8], r]));
  const sai = []; let co = 0; const noiDung = new Set();
  for (const r of rows) {
    const k = r[8], p = Q.payload(k), kq = docLai(p, 'M');
    co = Math.max(co, kq.n); noiDung.add(p);
    const ve = Q.parse(kq.data);
    if (!p.startsWith(Q.WEB + '#ts-') || kq.data !== p || ve !== k || byKey.get(ve) !== r) sai.push(k);
  }
  ok(!sai.length, `${rows.length} mã QR (${co}×${co} ô) đều là đường link mở thẳng tài sản trong phần Kiểm kê và đọc lại đúng tài sản`
    + (sai.length ? ` (sai ${sai.length}: ${sai.slice(0, 5).join(', ')})` : ''));
  ok(noiDung.size === rows.length, `${noiDung.size} mã QR khác nhau, không mã nào trùng`);
  const mau = rows.filter((r, i) => i % 25 === 0); const saiEcc = [];
  for (const ecc of ['Q', 'H']) for (const r of mau) { const p = Q.payload(r[8]); if (docLai(p, ecc).data !== p) saiEcc.push(ecc + ':' + r[8]); }
  ok(!saiEcc.length, `mức chịu trầy xước Q, H cũng đọc lại đúng (${mau.length} tài sản mẫu)` + (saiEcc.length ? `: sai ${saiEcc.slice(0, 5).join(', ')}` : ''));
  ok(Q.parse('http://localhost:3000/#ts-5467321') === '5467321' && Q.parse(' ' + Q.payload('5467321') + ' ') === '5467321'
    && Q.parse('5467321') === null && Q.parse('https://vd.vn/#ma=5467321') === null && Q.parse(Q.WEB + '#ts-') === null && Q.parse(Q.WEB + '#ts-%E0%A4%A') === null,
    'đọc đường link trên tem: nhận mọi tên miền, bỏ qua nội dung lạ hoặc hỏng');
  ok(['stt:12', 'khong-ma:Sheet 1:20', 'A/B#C?d=1', 'Mã 01'].every(k => Q.parse(Q.payload(k)) === k), 'khoá có ký tự đặc biệt vẫn đọc lại nguyên vẹn');
}

/* 5. Sổ mã QR: mã đã cấp không mất, không cấp lại cho tài sản khác, tài sản bị xoá vẫn giữ */
console.log('5. Sổ mã QR ("dữ liệu cập nhật/so-ma-qr.json")');
{
  const { SO_FILE, docSo, capNhatSo } = await import('./so-ma-qr.mjs');
  ok(fs.existsSync(SO_FILE), 'có file sổ mã QR');
  const so = docSo();
  const coMa = rows.filter(r => r[1] && String(r[1]) === String(r[8]));
  const thieu = coMa.filter(r => !so.ma[r[8]] || so.ma[r[8]].xoa);
  ok(!thieu.length, `${coMa.length} tài sản có Mã TSCĐ đều có trong sổ, đang dùng` + (thieu.length ? ` (thiếu ${thieu.length}: ${thieu.slice(0, 5).map(r => r[8]).join(', ')})` : ''));
  const xoa = Object.entries(so.ma).filter(([, e]) => e.xoa);
  ok(xoa.every(([k, e]) => !byKeyHas(k) && e.ten && e.tu && e.xoa), `${xoa.length} mã của tài sản đã xoá khỏi BBKK vẫn giữ đủ thông tin`);
  function byKeyHas(k) { return rows.some(r => r[8] === k); }
  // so với sổ đã lưu trên GitHub: không được mất mã nào
  const g = spawnSync('git', ['-c', 'core.quotepath=false', 'show', 'HEAD:' + path.relative(ROOT, SO_FILE).replace(/\\/g, '/')], { cwd: ROOT, encoding: 'utf8' });
  if (g.status === 0) {
    const cu = JSON.parse(g.stdout).ma || {}, mat = Object.keys(cu).filter(k => !so.ma[k]);
    ok(!mat.length, `không mất mã nào so với sổ trên GitHub (${Object.keys(cu).length} mã)` + (mat.length ? `: mất ${mat.slice(0, 5).join(', ')}` : ''));
  } else console.log('  · sổ chưa có trên GitHub (lần đầu), bỏ qua so sánh');
  const dist = fs.readFileSync(path.join(DIST, 'data', 'so-ma-qr.js'), 'utf8');
  const dctx = { window: {} }; vm.runInNewContext(dist, dctx); const ds = dctx.window.KIEMKE_SO_QR;
  ok(Object.keys(ds.dang).length + Object.keys(ds.xoa).length === Object.keys(so.ma).length, 'trang web nhận đủ sổ mã QR (dist/data/so-ma-qr.js)');
  const chanQR = Object.entries(ds.chan || {});
  ok(!chanQR.length, 'mỗi Mã TSCĐ chỉ có một bộ thông tin (tên, ngày bắt đầu sử dụng, nguyên giá) ở mọi sheet — quy tắc lệch 1 chữ là 2 tài sản'
    + (chanQR.length ? `: ${chanQR.length} mã bị chặn in tem, sửa trong Excel: ${chanQR.slice(0, 3).map(([k, l]) => k + ' (' + l + ')').join('; ')}` : ''));
  // chạy thử quy tắc trên một bản sao (không ghi file): xoá, thêm lại, thêm mới, dùng lại mã, tài sản chưa có mã
  const a = coMa[0], b = coMa[1];
  const b1 = capNhatSo(rows.filter(r => r !== a), so, '2027-01-02');
  const b2 = capNhatSo(rows, b1.so, '2027-02-03');
  const moiR = [...a]; moiR[1] = moiR[8] = '9999998'; moiR[2] = 'Tài sản mới thử';
  const b3 = capNhatSo([...rows, moiR], so, '2027-03-04');
  const dungLai = [...b]; dungLai[2] = 'Tài sản khác dùng lại mã'; dungLai[4] = '2030-01-01'; dungLai[5] = (+b[5] || 0) + 12345;
  const b4 = capNhatSo(rows.map(r => r === b ? dungLai : r), so, '2027-04-05');
  const khongMa = [...a]; khongMa[1] = ''; khongMa[8] = 'stt:99999';
  const b5 = capNhatSo([...rows, khongMa], so, '2027-05-06');
  ok(b1.xoa.includes(a[8]) && b1.so.ma[a[8]] && b1.so.ma[a[8]].xoa === '2027-01-02' && b1.so.ma[a[8]].ten === so.ma[a[8]].ten,
    'thử: tài sản bị xoá khỏi BBKK → vẫn giữ trong sổ, ghi ngày xoá');
  ok(b2.quayLai.includes(a[8]) && !b2.so.ma[a[8]].xoa && b2.so.ma[a[8]].tu === so.ma[a[8]].tu, 'thử: tài sản quay lại BBKK → dùng lại đúng mã cũ, giữ ngày cấp');
  ok(b3.moi.length === 1 && b3.so.ma['9999998'].tu === '2027-03-04' && Object.keys(b3.so.ma).length === Object.keys(so.ma).length + 1, 'thử: thêm tài sản mới → cấp thêm 1 mã, không đụng mã cũ');
  ok(b4.canhBao.length === 1 && b4.so.ma[b[8]].cu && b4.so.ma[b[8]].cu[0].ten === so.ma[b[8]].ten, 'thử: Mã TSCĐ bị dùng lại cho tài sản khác → cảnh báo, giữ thông tin cũ');
  ok(b5.khongMa.length === 1 && !b5.so.ma['stt:99999'], 'thử: tài sản chưa có Mã TSCĐ → chưa cấp mã QR');
  const motChu = [...b]; motChu[2] = String(b[2]) + 'x';
  const b6 = capNhatSo(rows.map(r => r === b ? motChu : r), so, '2027-06-07');
  const b7 = capNhatSo(rows.map(r => r === b ? Object.assign([...b], { 2: '  ' + String(b[2]).replace(/ /g, '  ') + ' ' }) : r), so, '2027-06-07');
  ok(b6.canhBao.length === 1 && b7.canhBao.length === 0, 'thử: tên lệch 1 chữ → cảnh báo; chỉ khác khoảng trắng → không tính là lệch');
  // kế toán đổi Mã TSCĐ cho cùng một tài sản (người dùng chốt: "chung quy thì nó vẫn là nó"): mã cũ nối sang mã mới
  const sangL = Object.entries(so.ma).filter(([, e]) => e.sang);
  const vong = k => { const s = new Set(); while (so.ma[k] && so.ma[k].sang) { if (s.has(k)) return true; s.add(k); k = so.ma[k].sang.ma; } return false; };
  ok(sangL.every(([k, e]) => e.xoa && so.ma[e.sang.ma] && (so.ma[e.sang.ma].maCu || []).includes(k) && !vong(k)) && Object.keys(ds.sang || {}).length === sangL.length,
    `đổi Mã TSCĐ: ${sangL.length} mã cũ nối đúng sang mã mới (mã cũ đã rời BBKK, mã mới có trong sổ, không vòng lặp)`);
  const gonT = s => String(s || '').replace(/\s+/g, ' ').trim();
  const trungTT = r => coMa.filter(x => gonT(x[2]) === gonT(r[2]) && String(x[4]) === String(r[4]) && +x[5] === +r[5]).length;
  const c = coMa.find(r => r[4] && +r[5] > 0 && trungTT(r) === 1 && r !== b) || a;
  const doiR = Object.assign([...c], { 1: '9999997', 8: '9999997' });
  const d1 = capNhatSo(rows.map(r => r === c ? doiR : r), so, '2027-07-08', { luc: '2027-07-08 09:30' });
  ok(d1.doiMa.length === 1 && d1.so.ma[c[8]].sang && d1.so.ma[c[8]].sang.ma === '9999997' && d1.so.ma[c[8]].xoa && (d1.so.ma['9999997'].maCu || []).includes(c[8]),
    'thử: kế toán đổi Mã TSCĐ (tên, ngày bắt đầu sử dụng, nguyên giá giống hệt) → tự nối mã cũ sang mã mới, cùng một tài sản');
  const d2 = capNhatSo(rows, d1.so, '2027-08-09');
  ok(d2.quayLai.includes(c[8]) && !d2.so.ma[c[8]].sang && !d2.so.ma['9999997'].maCu, 'thử: mã cũ quay lại file BBKK → bỏ nối đổi mã');
  const doiR2 = Object.assign([...c], { 1: '9999996', 8: '9999996' });
  const d3 = capNhatSo([...rows.filter(r => r !== c), doiR, doiR2], so, '2027-07-08');
  ok(!d3.doiMa.length && d3.nghiDoi.length === 2 && !d3.so.ma[c[8]].sang, 'thử: 2 mã mới cùng giống hệt một mã cũ → không tự nối (không đoán), báo nghi đổi mã');
  const doiR3 = Object.assign([...c], { 1: '9999995', 8: '9999995', 2: String(c[2]) + ' (sửa tên)' });
  const d4 = capNhatSo(rows.map(r => r === c ? doiR3 : r), so, '2027-07-08');
  const d5 = capNhatSo(rows.map(r => r === c ? doiR3 : r), so, '2027-07-08', { doiTay: [{ cu: c[8], moi: '9999995' }] });
  ok(!d4.doiMa.length && d4.nghiDoi.length === 1 && d5.doiMa.length === 1 && d5.doiMa[0].cach === 'khai báo' && d5.so.ma[c[8]].sang.ma === '9999995',
    'thử: vừa đổi mã vừa sửa tên → chỉ báo nghi, nối khi khai báo trong doi-ma-tscd.json');
  const d6 = capNhatSo(rows, so, '2027-07-08', { doiTay: [{ cu: c[8], moi: b[8] }] });
  ok(!d6.doiMa.length && d6.canhBao.length === 1, 'thử: khai báo đổi mã khi mã cũ vẫn còn trong file BBKK → không nối, cảnh báo');
}

/* 6. Bảo mật và riêng tư (BAO-MAT.md) */
console.log('6. Bảo mật và riêng tư (BAO-MAT.md)');
{
  const { maHoa, giaiMaWeb, docKhoa, bamMaChinh } = await import('./ma-hoa.mjs');
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8'), src = fs.readFileSync(path.join(ROOT, 'web', 'index.html'), 'utf8');
  const csp = (/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html) || [])[1] || '';
  ok(csp && csp.includes(`'sha256-${bamMaChinh(html)}'`) && !/unsafe-eval/.test(csp) && !/script-src[^;]*unsafe-inline/.test(csp) && /object-src 'none'/.test(csp),
    'trang có chính sách chặn mã lạ (CSP): chỉ khối mã chính theo dấu băm, không unsafe-eval / unsafe-inline cho mã');
  const inline = [...src.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/g)].filter(m => !/type="text\/plain" id="kiemke-app"/.test(m[1]));
  ok(!inline.length && !/\son[a-z]+\s*=\s*["']/i.test(src.replace(/<script type="text\/plain" id="kiemke-app">[\s\S]*?<\/script>/, '')), 'không có mã chạy thẳng trong HTML ngoài khối mã chính, không gắn sự kiện kiểu onclick=');
  const cdn = [...src.matchAll(/<script src="(https?:[^"]+)"/g)].map(m => m[1]);
  ok(cdn.every(u => /@\d+\.\d+\.\d+|\/\d+\.\d+\.\d+\//.test(u)), `thư viện ngoài đều cố định phiên bản (${cdn.length} thư viện)`);
  const cfg = fs.readFileSync(path.join(ROOT, 'web', 'config.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');   // bỏ dòng chú thích (có lời dặn "service_role")
  ok(!/service_role|sb_secret_|c2VydmljZV9yb2xl/.test(cfg), 'web/config.js chỉ có khoá công khai (không có khoá secret / service_role)');
  // file đang được Git theo dõi: không có khoá bí mật, không có email thật (trừ ví dụ ten@fe.edu.vn)
  const tracked = spawnSync('git', ['-c', 'core.quotepath=false', 'ls-files'], { cwd: ROOT, encoding: 'utf8' }).stdout.split('\n').filter(f => f && /\.(js|mjs|json|html|md|sql|yml|txt|css)$/i.test(f));
  const lo = [];
  for (const f of tracked) {
    if (f === 'scripts/kiem-tra.mjs') continue;   // chính file này chứa các mẫu cần tìm
    let t = ''; try { t = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { continue; }
    if (/sb_secret_|-----BEGIN [A-Z ]*PRIVATE KEY|c2VydmljZV9yb2xl|KIEMKE_KHOA_DU_LIEU\s*=\s*['"][A-Za-z0-9+/]{40,}/.test(t)) lo.push(f + ' (khoá bí mật)');
    const em = (t.match(/[a-z0-9._%+-]+@(fe|fpt)\.edu\.vn/gi) || []).filter(e => !/^ten@/i.test(e));
    if (em.length) lo.push(f + ' (email: ' + [...new Set(em)].slice(0, 2).join(', ') + ')');
  }
  ok(!lo.length, `${tracked.length} file trong repo: không có khoá bí mật, không có email thật` + (lo.length ? ': ' + lo.slice(0, 4).join('; ') : ''));
  const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  ok(['sao-luu/', '.env'].every(x => gi.includes(x)), '.gitignore chặn sao-luu/ (bản sao dữ liệu) và .env (khoá trên máy)');
  const vj = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')), hd = (vj.headers || []).flatMap(h => h.headers.map(x => x.key.toLowerCase()));
  ok(['x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy', 'strict-transport-security', 'x-robots-tag'].every(k => hd.includes(k)), 'vercel.json có đủ tiêu đề bảo mật');
  ok(/Disallow: \//.test(fs.readFileSync(path.join(ROOT, 'web', 'robots.txt'), 'utf8')), 'robots.txt: không cho máy tìm kiếm lập chỉ mục');
  // mã hoá dữ liệu tài sản: Node mã hoá → giải mã đúng như trình duyệt (WebCrypto)
  const khoa = (await import('node:crypto')).randomBytes(32), b64 = khoa.toString('base64'), mau = Buffer.from(JSON.stringify({ rows: rows.slice(0, 50) }));
  const enc = maHoa(khoa, mau), dec = await giaiMaWeb(b64, enc);
  ok(dec.equals(mau) && !enc.includes(Buffer.from(String(rows[0][2]).slice(0, 12))), 'mã hoá dữ liệu tài sản: giải mã kiểu trình duyệt ra đúng, bản mã không lộ tên tài sản');
  let sai = false; try { await giaiMaWeb(Buffer.alloc(32, 7).toString('base64'), enc); } catch { sai = true; }
  let ngan = false; try { docKhoa({ KIEMKE_KHOA_DU_LIEU: 'abc' }); } catch { ngan = true; }
  ok(sai && ngan && docKhoa({}) === null, 'sai khoá thì không giải mã được; khoá sai độ dài bị từ chối; không có khoá thì build bản thường');
  const sql = fs.readFileSync(path.join(ROOT, 'supabase', 'dang-nhap.sql'), 'utf8');
  ok(/revoke all on public\.thanh_vien, public\.danh_ba, public\.bi_mat, public\.kiemke_docs from anon/.test(sql) && /du_cap_xac_thuc/.test(sql) && /length\(p_mat_khau\) < 12/.test(sql)
    && (sql.match(/security definer set search_path/g) || []).length >= 10, 'dang-nhap.sql: thu hồi quyền người không đăng nhập, bắt xác thực 2 bước, mật khẩu ≥ 12, hàm đặc quyền đều cố định search_path');
}

console.log(loi ? `\n✗ ${loi} mục KHÔNG đạt` : '\n✓ Tất cả đều đạt');
process.exit(loi ? 1 : 0);
