// Sổ mã QR: "dữ liệu cập nhật/so-ma-qr.json" — mọi Mã TSCĐ đã được cấp mã QR, kể cả tài sản đã bị xoá khỏi file BBKK.
//   - Mã QR của tài sản = đường link tới trang tài sản trong phần Kiểm kê, chứa Mã TSCĐ (web/qr-rules.js).
//   - Mã đã cấp không bao giờ cấp lại cho tài sản khác; dòng trong sổ không bao giờ bị xoá.
//   - Tài sản không còn trong file Excel → ghi ngày phát hiện bị xoá ("xoa"), vẫn giữ thông tin để quét tem cũ vẫn ra.
//   - Tài sản quay lại file Excel → bỏ "xoa".
//   - "tu": lúc tài sản vào sổ trên app (ngày, từ 15/11/2026 có cả giờ), "file": file BBKK (sổ kế toán) đưa tài sản vào.
//   - Cùng Mã TSCĐ nhưng tên / ngày bắt đầu sử dụng / nguyên giá khác lần trước (dù 1 chữ) → cảnh báo (theo quy tắc lệch thông tin là
//     tài sản khác: cần kiểm tra với kế toán), thông tin cũ cất vào "cu".
//   - Kế toán ĐỔI Mã TSCĐ cho cùng một tài sản (người dùng chốt 15/11/2026: "chung quy thì nó vẫn là nó"): mã cũ nối sang mã
//     mới — mã cũ có "sang" {ma, luc, cach}, mã mới có "maCu" [mã cũ]. Tem mang mã cũ vẫn mở đúng tài sản (1 mã QR, 2 Mã TSCĐ);
//     in tem mới thì có thêm mã QR mới (2 mã QR, cùng tài sản). Tự nối khi mã mới cấp lần này giống hệt (tên, ngày bắt đầu sử dụng,
//     nguyên giá) đúng một mã đã rời BBKK và ngược lại; trường hợp khác (vừa đổi mã vừa sửa thông tin, nhiều mã giống nhau)
//     chỉ báo "nghi đổi mã", nối bằng khai báo tay trong "dữ liệu cập nhật/doi-ma-tscd.json":
//       { "doi": [ { "cu": "Mã cũ", "moi": "Mã mới", "ghiChu": "…" } ] }
//     Mã cũ quay lại file BBKK → bỏ nối.
// build.mjs gọi capNhatSo(); trên Vercel chỉ tính trong bộ nhớ, không ghi file (sổ được commit từ máy cùng file Excel).
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './excel-file.mjs';

export const SO_FILE = path.join(DATA_DIR, 'so-ma-qr.json');
export const DOI_FILE = path.join(DATA_DIR, 'doi-ma-tscd.json');
export const QUY_TAC = 'Sổ mã QR (tự cập nhật khi build, KHÔNG sửa tay, KHÔNG xoá file này). Mỗi mã QR = 1 Mã TSCĐ, là đường link '
  + 'mở thẳng trang tài sản trong phần Kiểm kê. Mã đã cấp không bao giờ cấp lại cho tài sản khác. Tài sản bị xoá khỏi file BBKK '
  + 'vẫn giữ trong sổ (có ngày "xoa") để quét tem cũ vẫn xem được. Kế toán đổi Mã TSCĐ cho cùng một tài sản: mã cũ có "sang" '
  + '(mã mới), mã mới có "maCu"; tem mã cũ vẫn mở đúng tài sản.';

export const homNay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());   // yyyy-mm-dd
// yyyy-mm-dd HH:MM theo giờ Việt Nam (lúc tài sản vào sổ trên app)
export const bayGio = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`; };

export function docSo(file = SO_FILE) {
  if (!fs.existsSync(file)) return { capNhat: '', ma: {} };
  const o = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { capNhat: o.capNhat || '', ma: o.ma || {} };
}

// khai báo tay các lần kế toán đổi Mã TSCĐ cho cùng một tài sản: [{cu, moi, ghiChu}]
export function docDoiTay(file = DOI_FILE) {
  if (!fs.existsSync(file)) return [];
  const o = JSON.parse(fs.readFileSync(file, 'utf8'));
  return (Array.isArray(o) ? o : (o.doi || [])).filter(d => d && d.cu != null && d.moi != null);
}

export function vietSo(so) {
  const keys = Object.keys(so.ma).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const dong = keys.map(k => `    ${JSON.stringify(k)}: ${JSON.stringify(so.ma[k])}`);
  return `{\n  "quyTac": ${JSON.stringify(QUY_TAC)},\n  "capNhat": ${JSON.stringify(so.capNhat)},\n  "soMa": ${keys.length},\n  "ma": {\n${dong.join(',\n')}\n  }\n}\n`;
}

const gon = s => String(s || '').replace(/\s+/g, ' ').trim();   // bỏ khác biệt chỉ do khoảng trắng

// rows: dòng tài sản như dist/data/assets.js [stt, ma, ten, sl, ngay, gia, gc, vt, key, sheet, dòngExcel, nhómLẻ]
// opt.file: tên file BBKK đang đọc (ghi vào "file" của tài sản mới / tài sản chưa có), opt.luc: lúc vào sổ (yyyy-mm-dd HH:MM)
// opt.doiTay: khai báo tay đổi Mã TSCĐ [{cu, moi}] (docDoiTay())
export function capNhatSo(rows, cu, ngay = homNay(), opt = {}) {
  const ma = JSON.parse(JSON.stringify(cu.ma || {}));
  const moi = [], xoa = [], quayLai = [], canhBao = [], khongMa = [], doiMa = [], nghiDoi = [];
  const coMat = new Set();
  // bỏ nối "đổi mã" của mã cũ c (mã cũ quay lại file BBKK, hoặc nối lại sang mã khác)
  const boNoi = c => {
    const e = ma[c], t = e && e.sang && ma[e.sang.ma];
    if (t && t.maCu) { t.maCu = t.maCu.filter(x => x !== c); if (!t.maCu.length) delete t.maCu; }
    if (e) delete e.sang;
  };
  for (const r of rows) {
    const [, maTS, ten, , ngayGS, gia, gc, vt, key] = r;
    if (!maTS || String(maTS) !== String(key)) { khongMa.push(r); continue; }   // chưa có Mã TSCĐ: chưa cấp mã QR
    const k = String(key); coMat.add(k);
    const snap = { ten: String(ten), donVi: String(gc || ''), vt: String(vt || ''), ngay: String(ngayGS || ''), gia: +gia || 0 };
    const e = ma[k];
    if (!e) { ma[k] = { ...snap, tu: opt.luc || ngay, ...(opt.file ? { file: opt.file } : {}) }; moi.push(k); continue; }
    if (e.xoa) { delete e.xoa; boNoi(k); quayLai.push(k); }
    if (opt.file && !e.file) e.file = opt.file;
    const lech = [gon(e.ten) !== gon(snap.ten) && 'tên', e.ngay && snap.ngay && e.ngay !== snap.ngay && 'ngày bắt đầu sử dụng', e.gia && snap.gia && e.gia !== snap.gia && 'nguyên giá'].filter(Boolean);
    if (lech.length) {
      canhBao.push(`Mã ${k}: ${lech.join(', ')} khác lần trước — trước là "${e.ten}" (${e.ngay}, ${e.gia}), nay là "${snap.ten}" (${snap.ngay}, ${snap.gia}). Theo quy tắc lệch thông tin là tài sản khác: kiểm tra với kế toán (tem đã in vẫn mở mã này)`);
      (e.cu = e.cu || []).push({ ten: e.ten, ngay: e.ngay, gia: e.gia, den: ngay });
    }
    Object.assign(e, snap);
  }
  for (const [k, e] of Object.entries(ma)) if (!coMat.has(k) && !e.xoa) { e.xoa = ngay; xoa.push(k); }

  // kế toán đổi Mã TSCĐ cho cùng một tài sản: nối mã cũ (đã rời BBKK) sang mã mới
  const noi = (c, m, cach) => {
    boNoi(c); ma[c].sang = { ma: m, luc: opt.luc || ngay, cach };
    ma[m].maCu = [...new Set([...(ma[m].maCu || []), c])]; doiMa.push({ cu: c, moi: m, cach });
  };
  // 1. khai báo tay (doi-ma-tscd.json): chạy lại mỗi lần build, đã nối rồi thì thôi
  for (const d of opt.doiTay || []) {
    const c = String(d.cu).trim(), m = String(d.moi).trim(), tb = `Khai báo đổi mã ${c} → ${m}: `;
    if (!c || !m || c === m) { canhBao.push(tb + 'mã cũ và mã mới phải khác nhau'); continue; }
    if (!ma[c] || !ma[m]) { canhBao.push(tb + `không có mã ${!ma[c] ? c : m} trong sổ mã QR, chưa nối`); continue; }
    if (!ma[c].xoa) { canhBao.push(tb + `mã ${c} vẫn còn trong file BBKK, chưa nối`); continue; }
    let x = m; for (let i = 0; i < 50 && ma[x] && ma[x].sang; i++) x = ma[x].sang.ma;
    if (x === c) { canhBao.push(tb + 'thành vòng lặp (mã mới lại đổi về mã cũ), chưa nối'); continue; }
    if (!(ma[c].sang && ma[c].sang.ma === m)) noi(c, m, 'khai báo');
  }
  // 2. tự nhận: mã mới cấp lần này giống hệt (tên, ngày bắt đầu sử dụng, nguyên giá) đúng một mã đã rời BBKK chưa nối, và ngược lại
  const giong = (x, y) => !!gon(x.ten) && gon(x.ten) === gon(y.ten) && String(x.ngay || '') === String(y.ngay || '')
    && (+x.gia || 0) === (+y.gia || 0) && !!(x.ngay || +x.gia);
  const roi = Object.keys(ma).filter(k => ma[k].xoa && !ma[k].sang);
  const ung = moi.map(m => [m, roi.filter(c => giong(ma[c], ma[m]))]);
  for (const [m, cs] of ung) {
    if (cs.length === 1 && ung.filter(([, c2]) => c2.includes(cs[0])).length === 1) { noi(cs[0], m, 'tự nhận'); continue; }
    if (cs.length) { nghiDoi.push(`Mã mới ${m} giống hệt (tên, ngày bắt đầu sử dụng, nguyên giá) các mã đã rời BBKK: ${cs.join(', ')} — có nhiều khả năng nên chưa tự nối`); continue; }
    const gan = roi.filter(c => ma[c].ngay && +ma[c].gia && ma[c].ngay === ma[m].ngay && +ma[c].gia === +ma[m].gia);
    if (gan.length) nghiDoi.push(`Mã mới ${m} "${ma[m].ten}" cùng ngày bắt đầu sử dụng, nguyên giá với mã đã rời BBKK ${gan.map(c => `${c} "${ma[c].ten}"`).join(', ')} nhưng tên khác`);
  }
  const doi = JSON.stringify(ma) !== JSON.stringify(cu.ma || {});
  return { so: { capNhat: doi ? ngay : (cu.capNhat || ngay), ma }, doi, moi, xoa, quayLai, canhBao, khongMa, doiMa, nghiDoi };
}
