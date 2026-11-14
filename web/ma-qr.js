/*
 * Phần "Quản lý mã QR tài sản" của trang Quản lý tài sản (#ma-qr): in tem mã QR.
 *   1. Chọn tài sản (lọc theo đơn vị, phòng, tìm; bỏ chọn từng món) · 2. Khổ in (tờ A4 / máy in tem) và cỡ tem
 *   3. Chữ trên tem · 4. Mã QR · xem trước đúng tỉ lệ (có đọc thử mã trên tem đang xem) · 5. Tải file in.
 * Nội dung mã QR và cách đọc lại: web/qr-rules.js (dùng chung với nút Quét mã và npm test).
 * Một bố cục tem (temOps) vẽ ra 4 nơi giống hệt nhau: xem trước & In ngay (SVG), PDF (jsPDF), ảnh PNG (canvas).
 * Dùng chung với index.html: ASSETS, UNITS, UNIT, BY_KEY, roomOf, buildRooms, ROOMNAME, NOROOM, slugify,
 * banner(), ic(), esc(), nf, app, logEvent, MODE. Thư viện tạo mã QR (qrcode-generator) nạp sẵn trong <head>;
 * jsPDF, JSZip, jsQR chỉ tải khi cần.
 */

/* ---------- thư viện, phông chữ ---------- */
const TEM_LIB = {
  jspdf: ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => window.jspdf],
  jszip: ['https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', () => window.JSZip],
  jsqr: ['https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js', () => window.jsQR && (window.jsQR.default || window.jsQR)],
};
const TEM_LOADING = {};
function temLoad(name) {
  const [url, get] = TEM_LIB[name];
  if (get()) return Promise.resolve(get());
  return TEM_LOADING[name] || (TEM_LOADING[name] = new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = url;
    s.onload = () => (get() ? ok(get()) : fail(new Error('thư viện ' + name + ' không chạy được')));
    s.onerror = () => { delete TEM_LOADING[name]; fail(new Error('không tải được thư viện ' + name + ', kiểm tra mạng')); };
    document.head.appendChild(s);
  }));
}
const TEM_FONT = 'TemFont';
const TEM_FONT_FILES = { 400: 'fonts/BeVietnamPro-Regular.ttf', 700: 'fonts/BeVietnamPro-Bold.ttf' };
let temFontP = null;
function temFonts() {
  return temFontP || (temFontP = Promise.all(Object.entries(TEM_FONT_FILES).map(([w, u]) =>
    new FontFace(TEM_FONT, `url(${u})`, { weight: w }).load().then(f => { document.fonts.add(f); return f; })))
    .catch(e => { temFontP = null; throw new Error('không tải được phông chữ in tem'); }));
}
let temB64P = null;   // phông chữ dạng base64 để nhúng vào PDF
function temFontB64() {
  return temB64P || (temB64P = Promise.all([TEM_FONT_FILES[400], TEM_FONT_FILES[700]].map(u =>
    fetch(u).then(r => { if (!r.ok) throw new Error('không tải được phông chữ'); return r.arrayBuffer(); }).then(ab => {
      const by = new Uint8Array(ab); let s = '';
      for (let i = 0; i < by.length; i += 0x8000) s += String.fromCharCode.apply(null, by.subarray(i, i + 0x8000));
      return btoa(s);
    }))).then(([r, b]) => ({ r, b })).catch(e => { temB64P = null; throw e; }));
}
let temCtx = null;
function temW(str, bold, sizeMM) {   // bề ngang chữ (mm) theo đúng phông in tem
  if (!temCtx) temCtx = document.createElement('canvas').getContext('2d');
  temCtx.font = `${bold ? 700 : 400} 100px ${TEM_FONT}`;
  return temCtx.measureText(str).width / 100 * sizeMM;
}

/* ---------- mã QR ---------- */
const TEM_QZ = 2;   // vùng trắng quanh mã QR, tính bằng số ô (ngoài ra còn lề trong tem)
const TEM_QRC = new Map();
function qrMatrix(text, ecc) {
  const k = (ecc || 'M') + '|' + text; let m = TEM_QRC.get(k); if (m) return m;
  if (!window.qrcode) throw new Error('chưa tải được thư viện tạo mã QR, kiểm tra mạng rồi tải lại trang');
  const q = window.qrcode(0, ecc || 'M'); q.addData(text, 'Byte'); q.make();
  const n = q.getModuleCount(); const dark = new Uint8Array(n * n);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) dark[r * n + c] = q.isDark(r, c) ? 1 : 0;
  m = { n, dark };
  if (TEM_QRC.size > 6000) TEM_QRC.clear();
  TEM_QRC.set(k, m); return m;
}
function qrRuns(m) {   // các đoạn ô đen liền nhau theo hàng: [cột, hàng, độ dài]
  if (m.runs) return m.runs; const R = [];
  for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n;) {
    if (m.dark[r * m.n + c]) { let e = c; while (e < m.n && m.dark[r * m.n + e]) e++; R.push([c, r, e - c]); c = e; } else c++;
  }
  return (m.runs = R);
}
const temN = v => +v.toFixed(3);
function qrPath(m, x, y, s) {   // mã QR (kể cả vùng trắng) vừa ô vuông cạnh s tại (x, y)
  const u = s / (m.n + 2 * TEM_QZ), ox = x + TEM_QZ * u, oy = y + TEM_QZ * u;
  return qrRuns(m).map(([c, r, w]) => `M${temN(ox + c * u)} ${temN(oy + r * u)}h${temN(w * u)}v${temN(u)}h${temN(-w * u)}z`).join('');
}
// Mã QR của một tài sản (dùng ở trang tài sản trong phần Kiểm kê)
function qrSvg(text, px) {
  const m = qrMatrix(text, 'M'), N = m.n + 2 * TEM_QZ;
  return `<svg viewBox="0 0 ${N} ${N}" width="${px}" height="${px}" role="img" aria-label="Mã QR của tài sản"><rect width="${N}" height="${N}" fill="#fff"/><path fill="#000" shape-rendering="crispEdges" d="${qrPath(m, 0, 0, N)}"/></svg>`;
}

/* ---------- cài đặt tem (nhớ trên máy này) ---------- */
const TEM_KEY = 'kiemke2026.v1.tem';
const TEM_DEF = {
  mode: 'a4', size: '50x30', w: 50, h: 30, orient: 'p', mt: 10, ml: 8, gx: 2, gy: 2, center: true, pad: 2, border: true,
  head: true, headText: 'TRƯỜNG ĐH FPT ĐÀ NẴNG', ma: true, name: true, nameLines: 3, nameFull: false, room: false, unit: false, v: 2,
  seq: true, font: 0, qrPos: 'auto', qrSize: 0, ecc: 'M', copies: 'one', sort: 'phong', dpi: 300,
};
let TEM = (() => { try { return Object.assign({}, TEM_DEF, JSON.parse(localStorage.getItem(TEM_KEY) || '{}')); } catch (e) { return Object.assign({}, TEM_DEF); } })();
if ((+TEM.v || 1) < 2) { TEM.room = false; TEM.unit = false; TEM.v = 2; }   // 11/2026: mặc định không in phòng, đơn vị (tài sản đổi chỗ, đổi đơn vị)
function temSave() { try { localStorage.setItem(TEM_KEY, JSON.stringify(TEM)); } catch (e) { } }
const TEM_SIZES = [['30x20', '30 × 20 mm'], ['40x25', '40 × 25 mm'], ['40x30', '40 × 30 mm'], ['50x25', '50 × 25 mm'], ['50x30', '50 × 30 mm'],
  ['60x40', '60 × 40 mm'], ['70x50', '70 × 50 mm'], ['100x50', '100 × 50 mm'], ['tuy', 'Tự nhập cỡ khác']];
const TEMV = { unit: '', room: '', q: '', off: new Set(), idx: 0, page: 0, view: 'tem', busy: false, fontOK: false, checked: '', checkMsg: '', bound: false };

/* ---------- chọn tài sản ---------- */
const temChan = k => { const c = (window.KIEMKE_SO_QR || {}).chan; return !!(c && c[k]); };   // cùng mã mà thông tin lệch giữa các sheet
const temCoMa = a => !!a.ma && String(a.ma) === String(a.key) && !temChan(a.key);   // chưa có Mã TSCĐ, hoặc bị chặn → chưa in tem
function temPool() {
  const q = TEMV.q.trim().toLowerCase();
  return ASSETS.filter(a => temCoMa(a) && (!TEMV.unit || a.unit === TEMV.unit)
    && (!TEMV.room || (TEMV.room === NOROOM ? !roomOf(a) : slugify(roomOf(a)) === TEMV.room))
    && (!q || String(a.ma).toLowerCase().includes(q) || a.ten.toLowerCase().includes(q)));
}
function temSort(list) {
  const U = Object.fromEntries(UNITS.map((u, i) => [u.id, i]));
  const byRoom = (a, b) => { const x = roomOf(a), y = roomOf(b); return (x ? 0 : 1) - (y ? 0 : 1) || x.localeCompare(y, 'vi', { numeric: true }); };
  return list.slice().sort(TEM.sort === 'phong' ? (a, b) => byRoom(a, b) || a.stt - b.stt
    : TEM.sort === 'donvi' ? (a, b) => U[a.unit] - U[b.unit] || a.stt - b.stt : (a, b) => a.stt - b.stt);
}
function temAssets() { return temSort(temPool().filter(a => !TEMV.off.has(a.key))); }
function temCopies(a) { return TEM.copies === 'sl' ? Math.max(1, Math.round(+a.sl || 1)) : 1; }
function temItems(list) { const out = []; for (const a of list) { const n = temCopies(a); for (let i = 1; i <= n; i++) out.push({ a, i, n }); } return out; }
function temCount(list) { return list.reduce((t, a) => t + temCopies(a), 0); }

/* ---------- bố cục một tem (đơn vị mm) ---------- */
const TEM_PT = 25.4 / 72;   // 1 pt = 0,3528 mm
const TEM_LH = 1.2;         // giãn dòng
const TEM_F = { code: 1.35, name: 1, place: 0.85 };   // cỡ từng dòng so với cỡ chữ chính (dòng tiêu đề tính riêng)
function temTexts(it) {
  const a = it.a, u = UNIT[a.unit], room = roomOf(a), place = [];
  if (TEM.room && room) place.push(room.normalize('NFC'));
  if (TEM.unit) place.push((TEM.room ? '' : 'Đơn vị ') + (u ? u.sheet : a.unit));
  return {
    code: String(a.ma || a.key) + (TEM.seq && it.n > 1 ? `  ·  ${it.i}/${it.n}` : ''),
    name: String((TEM.nameFull ? a.ten : a.short) || a.ten).normalize('NFC'),
    place: place.join(' · '),   // vd. "108 Gamma · GD"
  };
}
function temGeo(list) {
  const W = +TEM.w, H = +TEM.h, p = Math.max(0, +TEM.pad || 0), g = 1.5;
  if (!(W >= 10 && H >= 10 && W <= 300 && H <= 300)) return { err: 'Cỡ tem phải từ 10 đến 300 mm.' };
  // dòng tiêu đề chạy ngang hết đầu tem (cỡ vừa bề ngang, tối đa 8 pt)
  let top = p, head = null;
  const ht = TEM.head ? TEM.headText.trim() : '';
  if (ht) {
    const w1 = temW(ht, true, TEM_PT) || 1, size = Math.max(4.5, Math.min(8, (W - 2 * p) / w1, H * 0.085 / TEM_PT)) * TEM_PT;
    head = { str: temFit(ht, true, size, W - 2 * p), size, x: W / 2, y: p + size * 0.86 };
    top = p + size * TEM_LH + 0.5;
  }
  const BW = W - 2 * p, BH = H - top - p;   // phần còn lại cho mã QR và chữ
  const rows = [];
  if (TEM.ma) rows.push(['code', 1]);
  if (TEM.name) rows.push(['name', Math.min(3, Math.max(1, +TEM.nameLines || 1))]);
  if (TEM.room || TEM.unit) rows.push(['place', 1]);
  const fit = (want, max) => Math.max(5, Math.min(want > 0 ? want : max, max));
  if (!rows.length) {
    const qMax = Math.min(BW, BH), q = fit(TEM.qrSize, qMax);
    if (qMax < 5) return { err: 'Tem quá nhỏ: tăng cỡ tem hoặc giảm lề.' };
    return { W, H, p, head, pos: 'center', qr: { x: (W - q) / 2, y: top + (BH - q) / 2, s: q }, qMax, rows, txt: null, s: 0 };
  }
  const pos = TEM.qrPos === 'auto' ? (W / H >= 1.15 ? 'left' : 'top') : TEM.qrPos;
  let qMax, q;
  if (pos === 'left') { qMax = Math.min(BH, BW - g - 8); q = fit(TEM.qrSize, TEM.qrSize > 0 ? qMax : Math.min(qMax, BW * 0.5)); }
  else { qMax = Math.min(BW, BH - g - 4); q = fit(TEM.qrSize, TEM.qrSize > 0 ? qMax : Math.min(qMax, BH * 0.6)); }
  if (qMax < 5) return { err: 'Tem quá nhỏ để có cả mã QR và chữ. Tăng cỡ tem, giảm lề hoặc bớt dòng chữ.' };
  const qr = pos === 'left' ? { x: p, y: top + (BH - q) / 2, s: q } : { x: (W - q) / 2, y: top, s: q };
  const txt = pos === 'left' ? { x: p + q + g, y: top, w: BW - q - g, h: BH, align: 'left' }
    : { x: p, y: top + q + g, w: BW, h: BH - q - g, align: 'center' };
  // cỡ chữ tự động: mọi dòng vừa chiều cao, Mã TSCĐ dài nhất vừa chiều ngang,
  // và không to quá so với bề ngang cột chữ (để tên tài sản hiện được nhiều chữ)
  const sumF = rows.reduce((t, [k, n]) => t + TEM_F[k] * n, 0);
  const sAuto = Math.min(14, txt.h / (sumF * TEM_LH * TEM_PT), Math.max(5, txt.w / 3));
  let s = TEM.font > 0 ? +TEM.font : sAuto;
  if (!(TEM.font > 0) && TEM.ma) {
    let wMax = 0; const seen = new Set();
    for (const a of list) { const c = temTexts({ a, i: temCopies(a), n: temCopies(a) }).code; if (seen.has(c)) continue; seen.add(c); wMax = Math.max(wMax, temW(c, true, TEM_F.code * TEM_PT)); }
    if (wMax > 0) s = Math.min(s, txt.w / wMax);
  }
  s = Math.floor(s * 4) / 4;
  return { W, H, p, head, pos, qr, qMax, rows, txt, s, over: sumF * TEM_LH * TEM_PT * s > txt.h + 0.01, small: s < 5 };
}
function temFit(str, bold, size, w) {   // cắt chữ cho vừa, thêm "…"
  if (!str || temW(str, bold, size) <= w) return str;
  let lo = 0, hi = str.length;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (temW(str.slice(0, mid).trimEnd() + '…', bold, size) <= w) lo = mid; else hi = mid - 1; }
  return lo ? str.slice(0, lo).trimEnd() + '…' : '';
}
function temWrap(text, size, w, max) {
  const words = [];   // từ dài hơn cả dòng thì ngắt thành nhiều mảnh, không cắt "…" giữa chừng
  for (const wd of text.split(/\s+/).filter(Boolean)) {
    let rest = wd;
    while (rest && temW(rest, false, size) > w) { let n = rest.length - 1; while (n > 1 && temW(rest.slice(0, n), false, size) > w) n--; words.push(rest.slice(0, n)); rest = rest.slice(n); }
    if (rest) words.push(rest);
  }
  const L = []; let i = 0;
  while (i < words.length && L.length < max) {
    let line = words[i++];
    while (i < words.length && temW(line + ' ' + words[i], false, size) <= w) line += ' ' + words[i++];
    L.push(line);
  }
  if (i < words.length && L.length) L[L.length - 1] += ' ' + words.slice(i).join(' ');
  return L.map(l => temFit(l, false, size, w));
}
function temOps(it, G) {   // danh sách nét vẽ của một tem, toạ độ mm tính từ góc trái trên của tem
  const ops = [{ t: 'qr', x: G.qr.x, y: G.qr.y, s: G.qr.s, text: KIEMKE_QR.payload(it.a.key) }];
  if (G.head) ops.push({ t: 'text', x: G.head.x, y: G.head.y, size: G.head.size, bold: true, str: G.head.str, align: 'center' });
  if (!G.txt) return ops;
  const T = temTexts(it), L = [];
  for (const [k, n] of G.rows) {
    const size = TEM_F[k] * G.s * TEM_PT, bold = k === 'code';
    if (k === 'name') temWrap(T.name, size, G.txt.w, n).forEach(str => L.push({ str, size, bold: false }));
    else if (T[k]) L.push({ str: temFit(T[k], bold, size, G.txt.w), size, bold });
  }
  const hh = L.reduce((t, l, i) => t + l.size * (i < L.length - 1 ? TEM_LH : 1), 0);
  let y = G.txt.y + Math.max(0, (G.txt.h - hh) / 2);
  const x = G.txt.align === 'center' ? G.txt.x + G.txt.w / 2 : G.txt.x;
  for (const l of L) { ops.push({ t: 'text', x, y: y + l.size * 0.86, size: l.size, bold: l.bold, str: l.str, align: G.txt.align }); y += l.size * TEM_LH; }
  return ops;
}
function temPage(G) {   // khổ trang và vị trí các tem trên một trang
  if (TEM.mode === 'tem') return { PW: G.W, PH: G.H, cols: 1, rows: 1, per: 1, pos: [[0, 0]] };
  let PW = 210, PH = 297; if (TEM.orient === 'l') [PW, PH] = [PH, PW];
  const ml = Math.max(0, +TEM.ml || 0), mt = Math.max(0, +TEM.mt || 0), gx = Math.max(0, +TEM.gx || 0), gy = Math.max(0, +TEM.gy || 0);
  const cols = Math.floor((PW - 2 * ml + gx) / (G.W + gx)), rows = Math.floor((PH - 2 * mt + gy) / (G.H + gy));
  if (cols < 1 || rows < 1) return { PW, PH, cols: 0, rows: 0, per: 0, pos: [] };
  const x0 = TEM.center ? (PW - (cols * G.W + (cols - 1) * gx)) / 2 : ml, y0 = TEM.center ? (PH - (rows * G.H + (rows - 1) * gy)) / 2 : mt;
  const pos = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pos.push([x0 + c * (G.W + gx), y0 + r * (G.H + gy)]);
  return { PW, PH, cols, rows, per: cols * rows, pos };
}

/* ---------- vẽ: SVG (xem trước, In ngay), canvas (ảnh PNG, đọc thử), PDF ---------- */
function temSvgInner(ops, G, ox, oy) {
  let s = TEM.border ? `<rect x="${temN(ox + 0.075)}" y="${temN(oy + 0.075)}" width="${temN(G.W - 0.15)}" height="${temN(G.H - 0.15)}" fill="none" stroke="#000" stroke-width="0.15"/>` : '';
  for (const o of ops) {
    if (o.t === 'qr') s += `<path fill="#000" shape-rendering="crispEdges" d="${qrPath(qrMatrix(o.text, TEM.ecc), ox + o.x, oy + o.y, o.s)}"/>`;
    else s += `<text x="${temN(ox + o.x)}" y="${temN(oy + o.y)}" font-size="${temN(o.size)}" font-weight="${o.bold ? 700 : 400}"${o.align === 'center' ? ' text-anchor="middle"' : ''} fill="#000">${esc(o.str)}</text>`;
  }
  return s;
}
function temDraw(ctx, ops, G, k) {   // k = số điểm ảnh mỗi mm
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch); ctx.fillStyle = '#000';
  if (TEM.border) { const lw = Math.max(1, Math.round(0.15 * k)); ctx.strokeStyle = '#000'; ctx.lineWidth = lw; ctx.strokeRect(lw / 2, lw / 2, cw - lw, ch - lw); }
  for (const o of ops) {
    if (o.t === 'qr') {   // mỗi ô QR đúng số nguyên điểm ảnh để máy in tem in nét
      const m = qrMatrix(o.text, TEM.ecc), N = m.n + 2 * TEM_QZ, u = Math.max(1, Math.floor(o.s * k / N)), tot = u * N;
      const x0 = Math.round(o.x * k + (o.s * k - tot) / 2) + TEM_QZ * u, y0 = Math.round(o.y * k + (o.s * k - tot) / 2) + TEM_QZ * u;
      for (const [c, r, w] of qrRuns(m)) ctx.fillRect(x0 + c * u, y0 + r * u, w * u, u);
    } else {
      ctx.font = `${o.bold ? 700 : 400} ${o.size * k}px ${TEM_FONT}`; ctx.textAlign = o.align === 'center' ? 'center' : 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(o.str, o.x * k, o.y * k);
    }
  }
}
function temPdfTem(doc, ops, G, ox, oy) {
  if (TEM.border) { doc.setLineWidth(0.15); doc.rect(ox + 0.075, oy + 0.075, G.W - 0.15, G.H - 0.15, 'S'); }
  for (const o of ops) {
    if (o.t === 'qr') {
      const m = qrMatrix(o.text, TEM.ecc), u = o.s / (m.n + 2 * TEM_QZ), x0 = ox + o.x + TEM_QZ * u, y0 = oy + o.y + TEM_QZ * u;
      for (const [c, r, w] of qrRuns(m)) doc.rect(x0 + c * u, y0 + r * u, w * u, u + 0.01, 'F');   // chồng 0,01 mm để không lộ khe giữa các hàng
    } else {
      doc.setFont(TEM_FONT, o.bold ? 'bold' : 'normal'); doc.setFontSize(o.size / TEM_PT);
      doc.text(o.str, ox + o.x, oy + o.y, { align: o.align === 'center' ? 'center' : 'left' });
    }
  }
}

/* ---------- trang #ma-qr ---------- */
function viewQR() {
  if (document.getElementById('qrw')) { temRefresh(); return; }   // dữ liệu chung đổi: chỉ cập nhật, giữ nguyên chỗ đang chỉnh
  const rooms = Object.values(buildRooms()).filter(r => r.slug !== NOROOM).sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
  const opt = (list, cur) => list.map(([v, t]) => `<option value="${esc(v)}"${String(cur) === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const num = (id, k, lbl, min, max, step) => `<div class="fld"><label for="${id}">${lbl}</label><input class="in" id="${id}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${step || 1}" data-t="${k}"></div>`;
  const chk = (id, k, lbl) => `<label class="chk" for="${id}"><input type="checkbox" id="${id}" data-t="${k}"> ${lbl}</label>`;
  app.innerHTML = `${banner('phong-lab', 'Quản lý tài sản', 'In tem mã QR tài sản',
    'Chọn tài sản, chỉnh mẫu tem rồi tải file in. Quét tem bằng nút <b>Quét mã</b> sẽ mở thẳng đúng tài sản trong phần Kiểm kê.')}
  <div class="qrw" id="qrw">
    <div class="qr-col">
      <section class="panel qr-s" aria-labelledby="qrh1"><h3 id="qrh1"><span class="qn">1</span>Chọn tài sản</h3>
        <div class="qr-g2">
          <div class="fld"><label for="qrU">Đơn vị (sheet)</label><select class="in" id="qrU" data-qf="unit"><option value="">Tất cả đơn vị</option>${opt(UNITS.map(u => [u.id, u.sheet]), TEMV.unit)}</select></div>
          <div class="fld"><label for="qrR">Phòng</label><select class="in" id="qrR" data-qf="room"><option value="">Tất cả phòng</option>${opt(rooms.map(r => [r.slug, r.name]), TEMV.room)}<option value="${NOROOM}"${TEMV.room === NOROOM ? ' selected' : ''}>Chưa có vị trí</option></select></div>
        </div>
        <div class="fld"><label for="qrQ">Tìm theo mã hoặc tên</label><input class="in" id="qrQ" type="search" data-qf="q" value="${esc(TEMV.q)}" placeholder="VD: 5467321 hoặc máy chiếu"></div>
        <div class="qr-g2">
          <div class="fld"><label for="qrSort">Thứ tự tem</label><select class="in" id="qrSort" data-t="sort">${opt([['phong', 'Theo phòng'], ['donvi', 'Theo đơn vị (sheet)'], ['stt', 'Theo STT trong sổ']], TEM.sort)}</select></div>
          <div class="fld"><label for="qrCp">Số tem mỗi tài sản</label><select class="in" id="qrCp" data-t="copies">${opt([['one', '1 tem'], ['sl', 'Bằng số lượng trong sổ']], TEM.copies)}</select></div>
        </div>
        <p class="qr-count" id="qrCount"></p>
        <details class="qr-pick" id="qrPick"><summary>Bỏ chọn từng tài sản</summary>
          <div class="qr-pt"><button type="button" class="btn sm" data-qa="all">Chọn tất cả đang lọc</button><button type="button" class="btn sm" data-qa="none">Bỏ chọn tất cả đang lọc</button></div>
          <div class="qr-list" id="qrList"></div>
        </details>
      </section>
      <section class="panel qr-s" aria-labelledby="qrh2"><h3 id="qrh2"><span class="qn">2</span>Khổ in và cỡ tem</h3>
        <div class="seg qr-seg" role="group" aria-label="Khổ in"><button type="button" data-tv="mode:a4">Tờ A4 nhiều tem</button><button type="button" data-tv="mode:tem">Máy in tem (mỗi tem một trang)</button></div>
        <div class="qr-g3">
          <div class="fld"><label for="qrSize">Cỡ tem</label><select class="in" id="qrSize" data-t="size">${opt(TEM_SIZES, TEM.size)}</select></div>
          ${num('qrW', 'w', 'Rộng (mm)', 10, 300, 0.5)}${num('qrH', 'h', 'Cao (mm)', 10, 300, 0.5)}
        </div>
        <div id="qrA4" class="qr-a4">
          <div class="qr-g2">
            <div class="fld"><label for="qrOr">Chiều giấy</label><select class="in" id="qrOr" data-t="orient">${opt([['p', 'A4 dọc'], ['l', 'A4 ngang']], TEM.orient)}</select></div>
            <div class="fld qr-end">${chk('qrCe', 'center', 'Căn giữa trang')}</div>
          </div>
          <div class="qr-g4">${num('qrMt', 'mt', 'Lề trên', 0, 50, 0.5)}${num('qrMl', 'ml', 'Lề trái', 0, 50, 0.5)}${num('qrGx', 'gx', 'Cách ngang', 0, 30, 0.5)}${num('qrGy', 'gy', 'Cách dọc', 0, 30, 0.5)}</div>
          <p class="qr-info" id="qrGrid"></p>
        </div>
        <div class="qr-g2">${chk('qrBd', 'border', 'Viền quanh tem (đường cắt)')}${num('qrPad', 'pad', 'Lề trong tem (mm)', 0, 10, 0.5)}</div>
      </section>
      <section class="panel qr-s" aria-labelledby="qrh3"><h3 id="qrh3"><span class="qn">3</span>Chữ trên tem</h3>
        <div class="qr-line">${chk('qrHdOn', 'head', 'Dòng tiêu đề (ngang đầu tem)')}<input class="in" id="qrHd" data-t="headText" aria-label="Chữ dòng tiêu đề" maxlength="60"></div>
        ${chk('qrMa', 'ma', 'Mã TSCĐ (chữ to)')}
        <div class="qr-line">${chk('qrNm', 'name', 'Tên tài sản')}
          <select class="in" id="qrNl" data-t="nameLines" aria-label="Số dòng tên">${opt([[1, 'tối đa 1 dòng'], [2, 'tối đa 2 dòng'], [3, 'tối đa 3 dòng']], TEM.nameLines)}</select>
          <select class="in" id="qrNf" data-t="nameFull" aria-label="Tên rút gọn hay đầy đủ">${opt([['false', 'tên rút gọn'], ['true', 'tên đầy đủ']], String(TEM.nameFull))}</select></div>
        ${chk('qrRm', 'room', 'Phòng')}${chk('qrUn', 'unit', 'Đơn vị (sheet), cùng dòng với phòng')}${chk('qrSq', 'seq', 'Số thứ tự tem (vd. 3/20) khi in nhiều tem cho một tài sản')}
        <div class="qr-g2"><div class="fld"><label for="qrFs">Cỡ chữ</label><select class="in" id="qrFs" data-t="font">${opt([[0, 'Tự động (lớn nhất vừa tem)'], ...[5, 6, 7, 8, 9, 10, 11, 12, 14].map(v => [v, v + ' pt'])], TEM.font)}</select></div></div>
      </section>
      <section class="panel qr-s" aria-labelledby="qrh4"><h3 id="qrh4"><span class="qn">4</span>Mã QR</h3>
        <div class="qr-g2">
          <div class="fld"><label for="qrPos">Vị trí mã QR</label><select class="in" id="qrPos" data-t="qrPos">${opt([['auto', 'Tự động theo cỡ tem'], ['left', 'Bên trái, chữ bên phải'], ['top', 'Bên trên, chữ bên dưới']], TEM.qrPos)}</select></div>
          ${num('qrQs', 'qrSize', 'Cỡ mã QR (mm, để trống = tự động)', 0, 200, 0.5)}
        </div>
        <div class="qr-g2">
          <div class="fld"><span class="lbl qr-lb">Nội dung mã QR</span><p class="qr-info">Đường link mở thẳng tài sản trong phần Kiểm kê (theo quy tắc, không đổi được)</p></div>
          <div class="fld"><label for="qrEc">Mức chịu trầy xước</label><select class="in" id="qrEc" data-t="ecc">${opt([['M', 'Vừa (15%) – khuyên dùng'], ['Q', 'Cao (25%)'], ['H', 'Rất cao (30%), mã dày hơn']], TEM.ecc)}</select></div>
        </div>
        <p class="qr-info" id="qrMod"></p>
      </section>
    </div>
    <div class="qr-col qr-side">
      <section class="panel qr-pv" aria-labelledby="qrh5"><h3 id="qrh5" class="qr-vh">Xem trước <span>(đúng tỉ lệ)</span></h3>
        <div class="qr-pvh">
          <div class="seg" role="group" aria-label="Kiểu xem trước"><button type="button" data-qv="tem">Một tem</button><button type="button" data-qv="trang">Cả trang</button></div>
          <div class="qr-nav"><button type="button" class="btn sm" data-qa="prev" aria-label="Trước">‹</button><span id="qrPos2" class="num"></span><button type="button" class="btn sm" data-qa="next" aria-label="Sau">›</button></div>
        </div>
        <div class="qr-stage" id="qrStage"><div class="empty">Đang tải phông chữ in tem…</div></div>
        <p class="qr-cap" id="qrCap"></p>
        <p class="qr-test" id="qrTest" role="status"></p>
      </section>
      <section class="panel qr-ex" aria-labelledby="qrh6"><h3 id="qrh6"><span class="qn">5</span>Tải file in</h3>
        <div class="qr-btns">
          <button type="button" class="btn pri" data-qa="pdf">${ic('FileDown')}Tải PDF để in</button>
          <button type="button" class="btn" data-qa="print">${ic('Printer')}In ngay</button>
          <span class="qr-png"><button type="button" class="btn" data-qa="png">${ic('Images')}Ảnh PNG (.zip)</button><select class="in" id="qrDpi" data-t="dpi" aria-label="Độ phân giải ảnh">${opt([[203, '203 dpi'], [300, '300 dpi'], [600, '600 dpi']], TEM.dpi)}</select></span>
          <button type="button" class="btn" data-qa="xlsx">${ic('FileSpreadsheet')}Dữ liệu Excel</button>
          <button type="button" class="btn" data-qa="csv">${ic('FileText')}Dữ liệu CSV</button>
        </div>
        <p class="qr-msg" id="qrMsg" role="status"></p>
        <ul class="qr-help">
          <li><b>Gửi nhà in:</b> chọn <i>Tờ A4 nhiều tem</i> (hoặc chỉnh lề, khoảng cách theo tờ decal nhà in đưa), bật viền cắt, tải <b>PDF</b>.</li>
          <li><b>Máy in tem:</b> chọn <i>Máy in tem</i> và đúng cỡ cuộn tem, tải <b>PDF</b> (mỗi tem một trang) hoặc <b>ảnh PNG</b> đúng độ phân giải máy (thường 203 hoặc 300 dpi). Khi in, chọn cỡ giấy bằng cỡ tem, tỉ lệ 100%.</li>
          <li><b>Phần mềm của máy in tem</b> (BarTender, NiceLabel, ZebraDesigner, P-touch Editor…): tải <b>Excel</b> hoặc <b>CSV</b>, cho phần mềm tạo mã QR từ cột “Nội dung mã QR”.</li>
          <li>Trước khi xuất, trang tự đọc thử mọi mã QR và chỉ xuất khi mã nào cũng mở đúng tài sản.</li>
        </ul>
      </section>
    </div>
  </div>
  <section class="panel qr-so" id="qrSo" aria-labelledby="qrh7">
    <h3 id="qrh7">${ic('BookOpen')}Sổ mã QR và quy tắc</h3>
    <ol class="qr-rule">
      <li>Mỗi mã QR là đường link <b>mở thẳng trang của đúng một tài sản trong phần Kiểm kê</b>, quét bằng nút Quét mã hay camera điện thoại đều được.</li>
      <li>Mã QR gắn với <b>Mã TSCĐ</b>. Mã đã cấp <b>không bao giờ cấp lại</b> cho tài sản khác; thêm tài sản mới vào file BBKK thì có mã mới, không trùng mã cũ.</li>
      <li>Tài sản <b>bị xoá khỏi file BBKK vẫn được giữ trong Sổ mã QR</b>: quét tem cũ vẫn xem được thông tin và biết tài sản đã bị xoá ngày nào.</li>
      <li>Hai dòng tài sản <b>lệch thông tin dù 1 chữ</b> (tên, ngày ghi sổ, nguyên giá) là <b>2 tài sản khác nhau, bắt buộc khác mã QR</b>. Tài sản số lượng lớn (cùng một dòng trong sổ) dùng chung 1 mã QR. Mã TSCĐ nào có các dòng lệch thông tin sẽ bị chặn in tem cho tới khi kế toán sửa cho thống nhất.</li>
      <li>Kế toán <b>đổi Mã TSCĐ</b> cho cùng một tài sản thì <b>vẫn là tài sản đó</b>: mã cũ được nối sang mã mới. Tem mang mã cũ vẫn quét được và mở đúng tài sản (1 mã QR, 2 Mã TSCĐ); in tem mới thì tài sản có thêm mã QR mới, cả 2 tem đều dùng được (2 mã QR, cùng tài sản). Lý lịch tài sản gộp cả lịch sử của mã cũ. App tự nối khi mã cũ rời file BBKK và mã mới có tên, ngày ghi sổ, nguyên giá giống hệt; vừa đổi mã vừa sửa thông tin thì cán bộ Hành chính khai báo để nối.</li>
      <li>Sổ tự cập nhật mỗi lần đưa file Excel lên web và được lưu riêng cùng file Excel (file <span class="mono">so-ma-qr.json</span> trong thư mục “dữ liệu cập nhật”).</li>
    </ol>
    <div id="qrSoBody"></div>
  </section>`;
  temBind(); temSync(); temSoDraw();
  temFonts().then(() => { TEMV.fontOK = true; temRefresh(); }).catch(e => { const st = document.getElementById('qrStage'); if (st) st.innerHTML = `<div class="empty">${esc('Lỗi: ' + e.message)}</div>`; });
}

/* Sổ mã QR: số mã đã cấp, mã của tài sản đã xoá khỏi BBKK (lưu riêng, sinh khi build) */
function temSoDraw() {
  const box = document.getElementById('qrSoBody'); if (!box) return;
  const so = window.KIEMKE_SO_QR || { dang: {}, xoa: {} }, tatCa = Object.entries(so.xoa || {}), nDang = Object.keys(so.dang || {}).length, chan = Object.entries(so.chan || {});
  const xoa = tatCa.filter(([, e]) => !e.sang), doi = tatCa.filter(([, e]) => e.sang);   // đã xoá hẳn / kế toán đổi sang mã mới (cùng tài sản)
  box.innerHTML = `<div class="qr-sof">
      <div><small>Mã đã cấp</small><b class="num">${nf.format(nDang + tatCa.length)}</b></div>
      <div><small>Đang dùng</small><b class="num">${nf.format(nDang)}</b></div>
      <div><small>Tài sản đã xoá khỏi BBKK</small><b class="num">${nf.format(xoa.length)}</b></div>
      ${doi.length ? `<div><small>Mã cũ đã đổi sang mã mới</small><b class="num">${nf.format(doi.length)}</b></div>` : ''}
    </div>
    ${chan.length ? `<div class="qr-chan"><b>${chan.length} Mã TSCĐ bị chặn in tem</b> (cùng mã nhưng thông tin lệch giữa các sheet):<ul>${chan.map(([k, l]) => `<li><span class="mono">${esc(k)}</span>: ${esc(l)}</li>`).join('')}</ul></div>` : ''}
    ${doi.length ? `<p class="qr-info">Kế toán đổi Mã TSCĐ (cùng một tài sản): tem mang mã cũ vẫn quét được, mở tài sản mã mới.</p><div class="tblwrap qr-sot"><table><thead><tr><th>Mã cũ</th><th>Mã mới</th><th>Tên tài sản</th><th>Đổi lúc</th><th>Cách nối</th></tr></thead><tbody>${doi.sort((a, b) => String(b[1].sang.luc || '').localeCompare(String(a[1].sang.luc || ''))).map(([k, e]) => `<tr><td class="mono">${esc(k)}</td><td class="mono"><a href="#ts-${encodeURIComponent(e.sang.ma)}">${esc(e.sang.ma)}</a></td><td>${esc(e.ten)}</td><td class="num">${esc(tuText(e.sang.luc))}</td><td>${e.sang.cach === 'tự nhận' ? 'App tự nhận (thông tin giống hệt)' : 'Cán bộ Hành chính khai báo'}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${xoa.length ? `<div class="tblwrap qr-sot"><table><thead><tr><th>Mã TSCĐ</th><th>Tên tài sản</th><th>Vị trí theo sổ</th><th>Cấp mã</th><th>Xoá khỏi BBKK</th></tr></thead><tbody>${xoa.sort((a, b) => (b[1].xoa || '').localeCompare(a[1].xoa || '')).map(([k, e]) => `<tr><td class="mono"><a href="#ts-${encodeURIComponent(k)}">${esc(k)}</a></td><td>${esc(e.ten)}</td><td>${esc(e.vt || '—')}</td><td class="num">${dmy(e.tu)}</td><td class="num">${dmy(e.xoa)}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="qr-info">Chưa có tài sản nào bị xoá khỏi file BBKK. Khi có, mã QR của chúng vẫn được giữ và liệt kê ở đây.</p>'}
    <div class="qr-btns"><button type="button" class="btn" data-qa="soxlsx">${ic('FileSpreadsheet')}Tải Sổ mã QR (Excel)</button><span class="qr-info">Sổ cập nhật ngày ${dmy(so.capNhat)}</span></div>`;
}
function temSoXlsx() {
  const so = window.KIEMKE_SO_QR || { dang: {}, xoa: {} };
  const cot = [['Mã TSCĐ', 12], ['Tên tài sản', 55], ['Đơn vị', 30], ['Vị trí', 18], ['Ngày ghi sổ', 12], ['Nguyên giá', 14], ['Cấp mã QR', 12], ['Trạng thái', 26], ['Nội dung mã QR', 55]];
  const dong = [];
  ASSETS.filter(temCoMa).forEach(a => dong.push([String(a.ma), a.ten, UNIT[a.unit] ? UNIT[a.unit].ten : a.unit, roomOf(a), dmy(a.ngay), a.gia || 0, dmy(String((Array.isArray(so.dang[a.key]) ? so.dang[a.key][0] : so.dang[a.key]) || '').slice(0, 10)), 'Đang dùng' + (maCuCua(a.key).length ? ' (đổi từ mã ' + maCuCua(a.key).join(', ') + ')' : ''), KIEMKE_QR.payload(a.key)]));
  Object.entries(so.xoa || {}).forEach(([k, e]) => dong.push([k, e.ten, e.donVi, e.vt, dmy(e.ngay), e.gia || 0, dmy(e.tu), e.sang ? 'Kế toán đổi sang Mã TSCĐ ' + e.sang.ma + ' (cùng tài sản, tem cũ vẫn dùng được)' : 'Đã xoá khỏi BBKK ngày ' + dmy(e.xoa), KIEMKE_QR.payload(k)]));
  return window.xuatBangExcel('Sổ mã QR', cot, dong, 'So ma QR - ' + new Date().toLocaleDateString('vi-VN').replace(/\//g, '-'));
}
// Mở phần Mã QR đúng tài sản / sheet / phòng đang xem ở phần Kiểm kê (hoặc mở Sổ mã QR)
function qrOpen(o) {
  o = o || {};
  if (o.so) { if (location.hash === '#so-ma-qr') document.getElementById('qrSo')?.scrollIntoView({ block: 'start' }); else location.hash = 'so-ma-qr'; return; }
  TEMV.unit = o.unit || ''; TEMV.room = o.room || ''; TEMV.q = '';
  if (o.key) { const a = BY_KEY[o.key]; TEMV.q = a ? String(a.ma || a.key) : String(o.key); TEMV.off.delete(o.key); }
  TEMV.idx = 0; TEMV.page = 0; TEMV.view = 'tem';
  const w = document.getElementById('qrw'); if (w) app.innerHTML = '';   // dựng lại trang với bộ lọc mới
  if (location.hash === '#ma-qr') render(); else location.hash = 'ma-qr';
}

function temSync() {   // đưa cài đặt lên các ô nhập
  const w = document.getElementById('qrw'); if (!w) return;
  w.querySelectorAll('[data-t]').forEach(el => {
    const v = TEM[el.dataset.t];
    if (el.type === 'checkbox') el.checked = !!v;
    else if (document.activeElement !== el) el.value = (el.type === 'number' && !(+v > 0) && el.dataset.t === 'qrSize') ? '' : String(v);
  });
  w.querySelectorAll('[data-tv]').forEach(b => { const [k, v] = b.dataset.tv.split(':'); b.setAttribute('aria-pressed', String(TEM[k]) === v); });
  w.querySelectorAll('[data-qv]').forEach(b => b.setAttribute('aria-pressed', TEMV.view === b.dataset.qv));
  document.getElementById('qrA4').hidden = TEM.mode !== 'a4';
  document.getElementById('qrHd').disabled = !TEM.head;
  document.getElementById('qrNl').disabled = document.getElementById('qrNf').disabled = !TEM.name;
}

function temRefresh(keepList) {
  const w = document.getElementById('qrw'); if (!w) return;
  const pool = temPool(), list = temSort(pool.filter(a => !TEMV.off.has(a.key))), nTem = temCount(list);
  const off = pool.length - list.length;
  const kk = TEMV.room ? `<a class="lnk qrkk" href="#phong-${esc(TEMV.room)}">Mở ${TEMV.room === NOROOM ? 'nhóm Chưa có vị trí' : esc(ROOMNAME[TEMV.room] || TEMV.room)} trong Kiểm kê →</a>`
    : TEMV.unit ? `<a class="lnk qrkk" href="#dv-${esc(TEMV.unit)}">Mở sheet ${esc(UNIT[TEMV.unit].sheet)} trong Kiểm kê →</a>` : '';
  const khongMa = ASSETS.filter(a => !(a.ma && String(a.ma) === String(a.key))).length, chan = ASSETS.filter(a => temChan(a.key)).length;
  document.getElementById('qrCount').innerHTML = `Sẽ in <b class="num">${nf.format(nTem)}</b> tem cho <b class="num">${nf.format(list.length)}</b> tài sản${off ? ` (đã bỏ chọn ${nf.format(off)})` : ''}${kk ? '<br>' + kk : ''}${khongMa ? `<br><span class="qr-warn">${khongMa} tài sản chưa có Mã TSCĐ nên chưa cấp mã QR.</span>` : ''}${chan ? `<br><span class="qr-warn">${chan} tài sản bị chặn in tem: cùng Mã TSCĐ nhưng thông tin lệch giữa các sheet (xem Sổ mã QR).</span>` : ''}${TEM.copies === 'sl' && nTem > 3000 ? '<br><span class="qr-warn">Rất nhiều tem: file PDF sẽ được chia thành nhiều phần.</span>' : ''}`;
  if (!keepList && document.getElementById('qrPick').open) temListDraw(pool);
  if (!TEMV.fontOK) return;
  const stage = document.getElementById('qrStage'), info = document.getElementById('qrGrid'), mod = document.getElementById('qrMod');
  const G = temGeo(list);
  if (G.err) { stage.innerHTML = `<div class="empty">${esc(G.err)}</div>`; info.textContent = ''; mod.textContent = ''; temTestSet(''); return; }
  const P = temPage(G), items = temItems(list);
  if (TEM.mode === 'a4') info.innerHTML = P.per ? `${P.cols} cột × ${P.rows} hàng = <b>${P.per} tem/trang</b> · ${nf.format(Math.ceil(nTem / P.per) || 0)} trang A4` : '<span class="qr-warn">Tem lớn hơn khổ giấy: giảm cỡ tem hoặc lề.</span>';
  // cỡ ô nhỏ nhất của mã QR → đánh giá dễ quét
  const sample = list[0] || ASSETS[0], m = qrMatrix(KIEMKE_QR.payload(sample.key), TEM.ecc), u = G.qr.s / (m.n + 2 * TEM_QZ);
  const lv = u >= 0.5 ? ['ok', 'quét tốt'] : u >= 0.35 ? ['warn', 'quét được, nên in từ 300 dpi trở lên'] : ['bad', 'quá nhỏ, khó quét: tăng cỡ mã QR hoặc chọn “Chỉ Mã TSCĐ”'];
  mod.innerHTML = `Mã QR ${temVN(G.qr.s)} mm · ${m.n}×${m.n} ô · mỗi ô ${temVN(u, 2)} mm: <b class="qr-${lv[0]}">${lv[1]}</b>`
    + (G.txt ? `<br>Cỡ chữ chính ${temVN(G.s)} pt${G.small ? ' · <span class="qr-warn">chữ nhỏ dưới 5 pt, khó đọc</span>' : ''}${G.over ? ' · <span class="qr-warn">chữ không vừa tem, giảm cỡ chữ hoặc bớt dòng</span>' : ''}` : '');
  // xem trước
  if (!items.length) { stage.innerHTML = '<div class="empty">Chưa chọn tài sản nào.</div>'; document.getElementById('qrPos2').textContent = ''; document.getElementById('qrCap').textContent = ''; temTestSet(''); return; }
  const page = TEMV.view === 'trang' && P.per > 1;
  const nPg = P.per ? Math.ceil(items.length / P.per) : 1;
  TEMV.idx = Math.min(Math.max(0, TEMV.idx), items.length - 1); TEMV.page = Math.min(Math.max(0, TEMV.page), nPg - 1);
  if (page) {
    const part = items.slice(TEMV.page * P.per, (TEMV.page + 1) * P.per);
    stage.innerHTML = `<svg class="qr-page" viewBox="0 0 ${P.PW} ${P.PH}" font-family="${TEM_FONT}" role="img" aria-label="Trang ${TEMV.page + 1}"><rect width="${P.PW}" height="${P.PH}" fill="#fff"/>${part.map((it, j) => { const [x, y] = P.pos[j]; return (TEM.border ? '' : `<rect x="${temN(x)}" y="${temN(y)}" width="${G.W}" height="${G.H}" fill="none" stroke="#c8c8c8" stroke-width="0.2" stroke-dasharray="1 1"/>`) + temSvgInner(temOps(it, G), G, x, y); }).join('')}</svg>`;
    document.getElementById('qrPos2').textContent = `Trang ${TEMV.page + 1}/${nPg}`;
    document.getElementById('qrCap').textContent = `Khổ ${TEM.orient === 'l' ? 'A4 ngang' : 'A4 dọc'} · ${P.PW} × ${P.PH} mm`;
    temTestSet('');
  } else {
    const it = items[TEMV.idx], ops = temOps(it, G);
    stage.innerHTML = `<svg class="qr-one" viewBox="-1 -1 ${G.W + 2} ${G.H + 2}" style="max-width:${Math.round((G.W + 2) * 7)}px" font-family="${TEM_FONT}" role="img" aria-label="Tem của tài sản ${esc(it.a.ma)}"><rect width="${G.W}" height="${G.H}" fill="#fff"${TEM.border ? '' : ' stroke="#c8c8c8" stroke-width="0.15" stroke-dasharray="0.8 0.8"'}/>${temSvgInner(ops, G, 0, 0)}</svg>`;
    document.getElementById('qrPos2').textContent = `Tem ${nf.format(TEMV.idx + 1)}/${nf.format(items.length)}`;
    document.getElementById('qrCap').innerHTML = `${temVN(G.W)} × ${temVN(G.H)} mm · ${esc(it.a.ma)} · ${esc(it.a.short)}<br><a class="lnk qrkk" href="#ts-${encodeURIComponent(it.a.key)}">Mở tài sản này trong Kiểm kê →</a>`;
    temTestSoon(it, G, ops);
  }
}
const temVN = (v, d) => (+v).toLocaleString('vi-VN', { maximumFractionDigits: d == null ? 1 : d });

/* đọc thử mã QR trên tem đang xem (vẽ ra ảnh như khi in rồi giải mã lại) */
function temTestSet(html, cls) { const t = document.getElementById('qrTest'); if (t) { t.className = 'qr-test ' + (cls || ''); t.innerHTML = html; } }
function temTestSoon(it, G, ops) {
  clearTimeout(temTestSoon.t);
  temTestSet('Đang đọc thử mã trên tem này…');
  temTestSoon.t = setTimeout(async () => {
    try {
      const jsQR = await temLoad('jsqr'); const k = 12;   // 12 điểm ảnh/mm ≈ 300 dpi
      const cv = document.createElement('canvas'); cv.width = Math.round(G.W * k); cv.height = Math.round(G.H * k);
      const ctx = cv.getContext('2d', { willReadFrequently: true }); temDraw(ctx, ops, G, k);
      const img = ctx.getImageData(0, 0, cv.width, cv.height), r = jsQR(img.data, img.width, img.height);
      const want = KIEMKE_QR.payload(it.a.key), key = r && KIEMKE_QR.parse(r.data);
      if (r && r.data === want && key === it.a.key && BY_KEY[key] === it.a) temTestSet(`${ic('CircleCheck')} Đọc thử mã trên tem này: mở đúng tài sản <b>${esc(it.a.ma)}</b>`, 'ok');
      else temTestSet(`${ic('CircleAlert')} Không đọc lại được mã trên tem này. Tăng cỡ mã QR hoặc lề trong tem.`, 'bad');
    } catch (e) { temTestSet(esc('Chưa đọc thử được: ' + e.message), 'bad'); }
  }, 350);
}

function temListDraw(pool) {
  const box = document.getElementById('qrList'); if (!box) return;
  const list = temSort(pool), MAX = 600;
  box.innerHTML = list.slice(0, MAX).map(a => `<label class="qr-row"><input type="checkbox" data-qk="${esc(a.key)}"${TEMV.off.has(a.key) ? '' : ' checked'}><span class="mono">${esc(a.ma)}</span><span class="qr-nm">${esc(a.short)}</span><span class="qr-rm">${esc(roomOf(a) || 'Chưa có vị trí')}</span>${temCopies(a) > 1 ? `<span class="num">×${temCopies(a)}</span>` : ''}</label>`).join('')
    + (list.length > MAX ? `<p class="qr-info">Đang hiện ${MAX}/${nf.format(list.length)} tài sản. Lọc theo đơn vị, phòng hoặc tìm để thấy phần còn lại.</p>` : '')
    || '<div class="empty">Không có tài sản nào khớp bộ lọc.</div>';
}

function temBind() {
  if (TEMV.bound) return; TEMV.bound = true;
  const inQR = e => e.target.closest && e.target.closest('#qrw,#qrSo');
  const setT = el => {
    const k = el.dataset.t; let v;
    if (el.type === 'checkbox') v = el.checked;
    else if (el.type === 'number') v = el.value === '' ? 0 : +el.value;
    else if (k === 'nameFull') v = el.value === 'true';
    else if (['nameLines', 'font', 'dpi'].includes(k)) v = +el.value;
    else v = el.value;
    if (el.type === 'number' && !isFinite(v)) return;
    TEM[k] = v;
    if (k === 'size' && v !== 'tuy') { const [w, h] = v.split('x').map(Number); TEM.w = w; TEM.h = h; }
    if (k === 'w' || k === 'h') { const s = `${TEM.w}x${TEM.h}`; TEM.size = TEM_SIZES.some(([x]) => x === s) ? s : 'tuy'; }
    if (k === 'copies' || k === 'sort') { TEMV.idx = 0; TEMV.page = 0; }
    temSave(); temSync(); temRefreshSoon();
  };
  app.addEventListener('input', e => {
    if (!inQR(e)) return; const t = e.target;
    if (t.dataset.qf) { TEMV[t.dataset.qf] = t.value; TEMV.idx = 0; TEMV.page = 0; temRefreshSoon(); }
    else if (t.dataset.t && (t.type === 'number' || t.type === 'text' || t.tagName === 'INPUT' && !t.type)) setT(t);
  });
  app.addEventListener('change', e => {
    if (!inQR(e)) return; const t = e.target;
    if (t.dataset.qk != null) { if (t.checked) TEMV.off.delete(t.dataset.qk); else TEMV.off.add(t.dataset.qk); temRefreshSoon(true); return; }
    if (t.dataset.qf) { TEMV[t.dataset.qf] = t.value; TEMV.idx = 0; TEMV.page = 0; temRefresh(); return; }
    if (t.dataset.t) setT(t);
  });
  app.addEventListener('toggle', e => { if (e.target.id === 'qrPick' && e.target.open) temListDraw(temPool()); }, true);
  app.addEventListener('click', e => {
    if (!inQR(e)) return;
    const b = e.target.closest('[data-qa],[data-tv],[data-qv]'); if (!b) return;
    if (b.dataset.tv) { const [k, v] = b.dataset.tv.split(':'); TEM[k] = v; temSave(); temSync(); temRefresh(); return; }
    if (b.dataset.qv) { TEMV.view = b.dataset.qv; temSync(); temRefresh(); return; }
    const a = b.dataset.qa;
    if (a === 'prev' || a === 'next') { const d = a === 'next' ? 1 : -1; if (TEMV.view === 'trang' && TEM.mode === 'a4') TEMV.page += d; else TEMV.idx += d; temRefresh(); return; }
    if (a === 'soxlsx') { temSoXlsx(); return; }
    if (a === 'all' || a === 'none') { temPool().forEach(x => a === 'all' ? TEMV.off.delete(x.key) : TEMV.off.add(x.key)); temListDraw(temPool()); temRefresh(); return; }
    temExport(a);
  });
}
function temRefreshSoon(keepList) {
  clearTimeout(temRefreshSoon.t);
  temRefreshSoon.t = setTimeout(() => temRefresh(keepList), 120);
}

/* ---------- xuất file ---------- */
function temMsg(html, bad) { const m = document.getElementById('qrMsg'); if (m) { m.className = 'qr-msg' + (bad ? ' bad' : ''); m.innerHTML = html; } }
const temTick = () => new Promise(r => setTimeout(r, 0));
function temDown(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 20000);
}
function temName() {
  const d = new Date(), p2 = x => String(x).padStart(2, '0');
  const pham = TEMV.room ? (TEMV.room === NOROOM ? 'Chua co vi tri' : (ROOMNAME[TEMV.room] || TEMV.room)) : TEMV.unit ? UNIT[TEMV.unit].sheet : 'Tat ca';
  return `Tem QR - ${pham} - ${TEM.w}x${TEM.h}mm - ${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}`.replace(/[\\/:*?"<>|]/g, '-');
}
// Đọc thử MỌI mã QR sắp in: tạo mã → vẽ thành ảnh → giải mã lại → phải ra đúng nội dung và đúng tài sản
async function temVerify(list) {
  const sig = TEM.ecc + list.map(a => a.key).join(',');
  if (TEMV.checked === sig) return true;
  const jsQR = await temLoad('jsqr'); const bad = [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i], p = KIEMKE_QR.payload(a.key), m = qrMatrix(p, TEM.ecc);
    const sc = 3, N = m.n + 8, W = N * sc, d = new Uint8ClampedArray(W * W * 4).fill(255);
    for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) if (m.dark[r * m.n + c])
      for (let y = 0; y < sc; y++) for (let x = 0; x < sc; x++) { const j = (((r + 4) * sc + y) * W + (c + 4) * sc + x) * 4; d[j] = d[j + 1] = d[j + 2] = 0; }
    const r = jsQR(d, W, W), k = r && KIEMKE_QR.parse(r.data);
    if (!r || r.data !== p || k !== a.key || BY_KEY[k] !== a) bad.push(a.ma || a.key);
    if (i % 50 === 49) { temMsg(`Đang đọc thử mã QR ${nf.format(i + 1)}/${nf.format(list.length)}…`); await temTick(); }
  }
  if (bad.length) { temMsg(`✗ ${bad.length} mã QR đọc lại không khớp tài sản (${esc(bad.slice(0, 5).join(', '))}${bad.length > 5 ? '…' : ''}). Chưa xuất file.`, true); return false; }
  TEMV.checked = sig; return true;
}
async function temExport(kind) {
  if (TEMV.busy || !['pdf', 'print', 'png', 'xlsx', 'csv'].includes(kind)) return;
  const list = temAssets(), items = temItems(list);
  if (!items.length) { temMsg('Chưa chọn tài sản nào để in.', true); return; }
  const G = temGeo(list); if (G.err) { temMsg(esc(G.err), true); return; }
  const P = temPage(G);
  if (!P.per) { temMsg('Tem lớn hơn khổ giấy A4: giảm cỡ tem hoặc lề.', true); return; }
  if (kind === 'png' && items.length > 3000) { temMsg(`${nf.format(items.length)} ảnh là quá nhiều để tải một lần. Hãy lọc bớt (theo đơn vị hoặc phòng) hoặc dùng PDF.`, true); return; }
  TEMV.busy = true; document.getElementById('qrw').classList.add('busy');
  try {
    await temFonts();
    temMsg('Đang đọc thử mã QR…');
    if (!(await temVerify(list))) return;
    const ok = `✓ Đã đọc thử ${nf.format(list.length)} mã QR: mã nào cũng mở đúng tài sản.`;
    const name = temName();
    if (kind === 'pdf') await temPdf(items, G, P, name);
    else if (kind === 'print') await temPrint(items, G, P);
    else if (kind === 'png') await temPng(items, G, name);
    else temData(items, kind, name);
    const what = { pdf: 'file PDF', print: 'lệnh in', png: 'ảnh PNG', xlsx: 'file Excel dữ liệu tem', csv: 'file CSV dữ liệu tem' }[kind];
    temMsg(`${ok}<br>${kind === 'print' ? 'Đã mở hộp thoại in.' : 'Đã tạo ' + what + '.'} ${nf.format(items.length)} tem.`);
    if (typeof logEvent === 'function') logEvent({ kind: 'xuat', title: `In tem mã QR: ${what}`, keys: list.map(a => a.key), lines: [`${nf.format(items.length)} tem cho ${nf.format(list.length)} tài sản`, `Tem ${TEM.w}×${TEM.h} mm · ${TEM.mode === 'a4' ? 'tờ A4 ' + P.per + ' tem/trang' : 'máy in tem'}`] });
  } catch (e) { console.error(e); temMsg(esc('Lỗi: ' + e.message), true); }
  finally { TEMV.busy = false; const w = document.getElementById('qrw'); if (w) w.classList.remove('busy'); }
}
async function temPdf(items, G, P, name) {
  temMsg('Đang tạo file PDF…');
  const { jsPDF } = await temLoad('jspdf'); const fonts = await temFontB64();
  const per = P.per, LIM = per * Math.max(1, Math.floor(2000 / per));   // mỗi file tối đa ~2000 tem
  const parts = []; for (let s = 0; s < items.length; s += LIM) parts.push(items.slice(s, s + LIM));
  const out = [], orient = P.PW > P.PH ? 'l' : 'p';
  for (let pi = 0; pi < parts.length; pi++) {
    const doc = new jsPDF({ unit: 'mm', format: [P.PW, P.PH], orientation: orient, compress: true });
    doc.addFileToVFS('tem-r.ttf', fonts.r); doc.addFont('tem-r.ttf', TEM_FONT, 'normal');
    doc.addFileToVFS('tem-b.ttf', fonts.b); doc.addFont('tem-b.ttf', TEM_FONT, 'bold');
    doc.setProperties({ title: name, subject: 'Tem mã QR tài sản', creator: 'Quản lý tài sản FPTU ĐN' });
    const part = parts[pi], nPg = Math.ceil(part.length / per);
    for (let g = 0; g < nPg; g++) {
      if (g) doc.addPage([P.PW, P.PH], orient);
      doc.setFillColor(0, 0, 0); doc.setDrawColor(0, 0, 0); doc.setTextColor(0, 0, 0);
      part.slice(g * per, (g + 1) * per).forEach((it, j) => { const [x, y] = P.pos[j]; temPdfTem(doc, temOps(it, G), G, x, y); });
      if (g % 5 === 4) { temMsg(`Đang tạo PDF${parts.length > 1 ? ` phần ${pi + 1}/${parts.length}` : ''}: trang ${g + 1}/${nPg}…`); await temTick(); }
    }
    out.push(doc.output('blob'));
  }
  if (out.length === 1) { temDown(out[0], name + '.pdf'); return; }
  const JSZip = await temLoad('jszip'), zip = new JSZip();
  out.forEach((b, i) => { const a = i * LIM + 1, z = Math.min(items.length, (i + 1) * LIM); zip.file(`${name} - phan ${i + 1} (tem ${a}-${z}).pdf`, b); });
  temDown(await zip.generateAsync({ type: 'blob' }), name + '.zip');
}
async function temPng(items, G, name) {
  temMsg('Đang tạo ảnh…');
  const JSZip = await temLoad('jszip'), zip = new JSZip(), dpi = +TEM.dpi || 300, k = dpi / 25.4;
  const cv = document.createElement('canvas'); cv.width = Math.round(G.W * k); cv.height = Math.round(G.H * k);
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const pad = String(items.length).length;
  for (let i = 0; i < items.length; i++) {
    const it = items[i]; temDraw(ctx, temOps(it, G), G, k);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const png = temPhys(new Uint8Array(await blob.arrayBuffer()), dpi);
    zip.file(`${String(i + 1).padStart(pad, '0')}_${it.a.ma || it.a.key}${it.n > 1 ? '_' + it.i + 'of' + it.n : ''}.png`, png);
    if (i % 25 === 24) { temMsg(`Đang tạo ảnh ${nf.format(i + 1)}/${nf.format(items.length)}…`); await temTick(); }
  }
  temMsg('Đang nén ảnh…'); await temTick();
  temDown(await zip.generateAsync({ type: 'blob' }), `${name} - ${dpi}dpi.zip`);
}
// Ghi độ phân giải (pHYs) vào ảnh PNG để phần mềm in hiểu đúng kích thước thật của tem
const TEM_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function temCrc(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = TEM_CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function temPhys(png, dpi) {
  for (let i = 8; i + 8 < png.length;) { const len = (png[i] << 24 | png[i + 1] << 16 | png[i + 2] << 8 | png[i + 3]) >>> 0, ty = String.fromCharCode(png[i + 4], png[i + 5], png[i + 6], png[i + 7]); if (ty === 'pHYs') return png; if (ty === 'IDAT') break; i += 12 + len; }
  const ppm = Math.round(dpi / 0.0254), ch = new Uint8Array(21), dv = new DataView(ch.buffer);
  dv.setUint32(0, 9); ch.set([0x70, 0x48, 0x59, 0x73], 4); dv.setUint32(8, ppm); dv.setUint32(12, ppm); ch[16] = 1; dv.setUint32(17, temCrc(ch.subarray(4, 17)));
  const at = 33, out = new Uint8Array(png.length + 21); out.set(png.subarray(0, at)); out.set(ch, at); out.set(png.subarray(at), at + 21); return out;
}
function temData(items, kind, name) {
  const cot = [['STT tem', 8], ['Mã TSCĐ', 12], ['Tên trên tem', 40], ['Tên đầy đủ', 55], ['Phòng', 18], ['Đơn vị', 16], ['Số lượng trong sổ', 10], ['Tem số', 9], ['Nội dung mã QR', 55]];
  const dong = items.map((it, i) => { const a = it.a; return [i + 1, String(a.ma || a.key), a.short, a.ten, roomOf(a), UNIT[a.unit] ? UNIT[a.unit].sheet : a.unit, a.sl, `${it.i}/${it.n}`, KIEMKE_QR.payload(a.key)]; });
  if (kind === 'xlsx') return window.xuatBangExcel('Tem QR', cot, dong, name);
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const csv = '﻿' + [cot.map(c => q(c[0])), ...dong.map(r => r.map(q))].map(r => r.join(',')).join('\r\n');
  temDown(new Blob([csv], { type: 'text/csv;charset=utf-8' }), name + '.csv');
}
async function temPrint(items, G, P) {
  const pages = []; for (let s = 0; s < items.length; s += P.per) pages.push(items.slice(s, s + P.per));
  const body = pages.map(pg => `<div class="pg"><svg xmlns="http://www.w3.org/2000/svg" width="${P.PW}mm" height="${P.PH}mm" viewBox="0 0 ${P.PW} ${P.PH}" font-family="${TEM_FONT}">${pg.map((it, j) => { const [x, y] = P.pos[j]; return temSvgInner(temOps(it, G), G, x, y); }).join('')}</svg></div>`).join('');
  const base = new URL('.', location.href).href;
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(temName())}</title><base href="${esc(base)}"><style>
@font-face{font-family:${TEM_FONT};src:url(${TEM_FONT_FILES[400]});font-weight:400}@font-face{font-family:${TEM_FONT};src:url(${TEM_FONT_FILES[700]});font-weight:700}
@page{size:${P.PW}mm ${P.PH}mm;margin:0}html,body{margin:0;padding:0;background:#fff}
.pg{width:${P.PW}mm;height:${P.PH}mm;overflow:hidden;break-after:page;page-break-after:always}.pg:last-child{break-after:auto;page-break-after:auto}svg{display:block}
</style></head><body>${body}</body></html>`;
  const fr = document.createElement('iframe');
  fr.setAttribute('aria-hidden', 'true'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(fr);
  await new Promise(r => { fr.onload = r; fr.srcdoc = html; });
  const d = fr.contentDocument;
  await Promise.all([d.fonts.load(`400 10px ${TEM_FONT}`), d.fonts.load(`700 10px ${TEM_FONT}`)]).catch(() => { });
  await d.fonts.ready;
  fr.contentWindow.focus(); fr.contentWindow.print();
  setTimeout(() => fr.remove(), 60000);
}
