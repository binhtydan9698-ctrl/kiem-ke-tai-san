// Sổ mã QR: "dữ liệu cập nhật/so-ma-qr.json" — mọi Mã TSCĐ đã được cấp mã QR, kể cả tài sản đã bị xoá khỏi file BBKK.
//   - Mã QR của tài sản = đường link tới trang tài sản trong phần Kiểm kê, chứa Mã TSCĐ (web/qr-rules.js).
//   - Mã đã cấp không bao giờ cấp lại cho tài sản khác; dòng trong sổ không bao giờ bị xoá.
//   - Tài sản không còn trong file Excel → ghi ngày phát hiện bị xoá ("xoa"), vẫn giữ thông tin để quét tem cũ vẫn ra.
//   - Tài sản quay lại file Excel → bỏ "xoa".
//   - "tu": lúc tài sản vào sổ trên app (ngày, từ 15/11/2026 có cả giờ), "file": file BBKK (sổ kế toán) đưa tài sản vào.
//   - Cùng Mã TSCĐ nhưng ngày ghi sổ VÀ nguyên giá đều khác lần trước → cảnh báo (có thể mã bị dùng lại cho tài sản khác),
//     thông tin cũ cất vào "cu".
// build.mjs gọi capNhatSo(); trên Vercel chỉ tính trong bộ nhớ, không ghi file (sổ được commit từ máy cùng file Excel).
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './excel-file.mjs';

export const SO_FILE = path.join(DATA_DIR, 'so-ma-qr.json');
export const QUY_TAC = 'Sổ mã QR (tự cập nhật khi build, KHÔNG sửa tay, KHÔNG xoá file này). Mỗi mã QR = 1 Mã TSCĐ, là đường link '
  + 'mở thẳng trang tài sản trong phần Kiểm kê. Mã đã cấp không bao giờ cấp lại cho tài sản khác. Tài sản bị xoá khỏi file BBKK '
  + 'vẫn giữ trong sổ (có ngày "xoa") để quét tem cũ vẫn xem được.';

export const homNay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());   // yyyy-mm-dd
// yyyy-mm-dd HH:MM theo giờ Việt Nam (lúc tài sản vào sổ trên app)
export const bayGio = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`; };

export function docSo(file = SO_FILE) {
  if (!fs.existsSync(file)) return { capNhat: '', ma: {} };
  const o = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { capNhat: o.capNhat || '', ma: o.ma || {} };
}

export function vietSo(so) {
  const keys = Object.keys(so.ma).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const dong = keys.map(k => `    ${JSON.stringify(k)}: ${JSON.stringify(so.ma[k])}`);
  return `{\n  "quyTac": ${JSON.stringify(QUY_TAC)},\n  "capNhat": ${JSON.stringify(so.capNhat)},\n  "soMa": ${keys.length},\n  "ma": {\n${dong.join(',\n')}\n  }\n}\n`;
}

// rows: dòng tài sản như dist/data/assets.js [stt, ma, ten, sl, ngay, gia, gc, vt, key, sheet, dòngExcel, nhómLẻ]
// opt.file: tên file BBKK đang đọc (ghi vào "file" của tài sản mới / tài sản chưa có), opt.luc: lúc vào sổ (yyyy-mm-dd HH:MM)
export function capNhatSo(rows, cu, ngay = homNay(), opt = {}) {
  const ma = JSON.parse(JSON.stringify(cu.ma || {}));
  const moi = [], xoa = [], quayLai = [], canhBao = [], khongMa = [];
  const coMat = new Set();
  for (const r of rows) {
    const [, maTS, ten, , ngayGS, gia, gc, vt, key] = r;
    if (!maTS || String(maTS) !== String(key)) { khongMa.push(r); continue; }   // chưa có Mã TSCĐ: chưa cấp mã QR
    const k = String(key); coMat.add(k);
    const snap = { ten: String(ten), donVi: String(gc || ''), vt: String(vt || ''), ngay: String(ngayGS || ''), gia: +gia || 0 };
    const e = ma[k];
    if (!e) { ma[k] = { ...snap, tu: opt.luc || ngay, ...(opt.file ? { file: opt.file } : {}) }; moi.push(k); continue; }
    if (e.xoa) { delete e.xoa; quayLai.push(k); }
    if (opt.file && !e.file) e.file = opt.file;
    if (e.ngay && snap.ngay && e.ngay !== snap.ngay && e.gia && snap.gia && e.gia !== snap.gia) {
      canhBao.push(`Mã ${k}: trước là "${e.ten}" (${e.ngay}, ${e.gia}), nay là "${snap.ten}" (${snap.ngay}, ${snap.gia}) — có thể mã bị dùng lại cho tài sản khác`);
      (e.cu = e.cu || []).push({ ten: e.ten, ngay: e.ngay, gia: e.gia, den: ngay });
    }
    Object.assign(e, snap);
  }
  for (const [k, e] of Object.entries(ma)) if (!coMat.has(k) && !e.xoa) { e.xoa = ngay; xoa.push(k); }
  const doi = JSON.stringify(ma) !== JSON.stringify(cu.ma || {});
  return { so: { capNhat: doi ? ngay : (cu.capNhat || ngay), ma }, doi, moi, xoa, quayLai, canhBao, khongMa };
}
