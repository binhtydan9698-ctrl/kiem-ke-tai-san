/*
 * So file "Xuất cho kế toán" với file BBKK gốc — giữ QUY TẮC người dùng chốt 16/11/2026 (AGENTS.md, web/export.js): file gốc giữ
 * nguyên hoàn toàn; mọi thay đổi chỉ gói trong 3 cột cuối thêm vào ở mỗi sheet danh sách (Kết quả kiểm kê · Vị trí thực tế · Ghi chú
 * kiểm kê) + sheet riêng "Tài sản phát sinh" ở cuối. Dùng chung cho npm test (Node, scripts/kiem-tra.mjs bước 3) và thử giao diện
 * (trình duyệt, kịch bản "xuat-goc" bấm đúng nút Xuất trên trang). Không dùng DOM.
 *   KIEMKE_SOSANH.soSanh(goc, xuat, X)            → { loi, dem }   so TỪNG Ô (ExcelJS.Workbook đã đọc)
 *   KIEMKE_SOSANH.soSanhGoi(zGoc, zXuat, goc, X, kiemXml) → Promise<{ loi, dem }>   so TỪNG BYTE các phần của gói .xlsx (JSZip)
 *     kiemXml(chuỗi) → null | câu lỗi: soát XML đọc được (Node: saxes, trình duyệt: DOMParser)
 */
(function (g) {
  const PHAT_SINH = /^Tài sản phát sinh( \d+)?$/;
  // JSON không phụ thuộc thứ tự khoá (ExcelJS đọc 2 lần có thể xếp khoá khác nhau)
  const xep = v => Array.isArray(v) ? v.map(xep) : v && typeof v === 'object' && !(v instanceof Date) ? Object.keys(v).sort().reduce((o, k) => (o[k] = xep(v[k]), o), {}) : v;
  const J = v => JSON.stringify(xep(v === undefined ? null : v));
  const giaTri = c => { const v = c.value; if (v && typeof v === 'object' && (v.formula || v.sharedFormula)) return { f: v.formula || null, sf: v.sharedFormula || null }; return v instanceof Date ? v.toISOString() : v; };
  // cột cuối đang có dữ liệu của sheet gốc (đúng cách web/export.js tính) → 3 cột mới là last+1..last+3
  const cotCuoi = ws => { let last = 0; ws.eachRow({ includeEmpty: false }, r => r.eachCell({ includeEmpty: false }, (c, col) => { if (col > last) last = col; })); return last; };
  const attr = (s, ten) => { const m = new RegExp('\\s' + ten + '="([^"]*)"').exec(s || ''); return m ? m[1] : null; };
  const colSo = s => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  const xmlBo = s => String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

  /* ---------- 1. so TỪNG Ô (giá trị, công thức, định dạng, ô gộp, cột, dòng, thiết lập sheet) ---------- */
  function soSanh(goc, xuat, X) {
    const loi = [], dem = { sheet: 0, o: 0, oMoi: 0 };
    const L = s => { if (loi.length < 60) loi.push(s); };
    const tg = goc.worksheets.map(w => w.name), tx = xuat.worksheets.map(w => w.name);
    if (J(tx.slice(0, tg.length)) !== J(tg)) L(`danh sách sheet khác gốc: ${tx.slice(0, tg.length).join(', ')}`);
    tx.slice(tg.length).forEach(n => { if (!PHAT_SINH.test(n)) L(`thêm sheet lạ "${n}"`); });
    if (J(xuat.definedNames && xuat.definedNames.model) !== J(goc.definedNames && goc.definedNames.model)) L('vùng đặt tên (defined names) khác gốc');

    for (const wg of goc.worksheets) {
      const wx = xuat.getWorksheet(wg.name); if (!wx) continue;
      dem.sheet++;
      const hm = X.headerMap(wg), last = cotCuoi(wg);
      const moi = c => !!hm && c > last && c <= last + 3;
      const dongTS = new Set(); if (hm) for (let r = hm.dataStart; r <= wg.rowCount; r++) { const x = X.readRow(wg, hm, r); if (x && !x.tiepTen) dongTS.add(r); }
      const dongTieuDe = r => !!hm && r >= hm.row && r < hm.dataStart;
      const ten = `sheet "${wg.name}"`;
      for (const k of ['state', 'properties', 'views', 'pageSetup', 'headerFooter', 'conditionalFormattings', 'autoFilter']) if (J(wg[k]) !== J(wx[k])) L(`${ten}: ${k} khác gốc`);
      if (J(wg.dataValidations && wg.dataValidations.model) !== J(wx.dataValidations && wx.dataValidations.model)) L(`${ten}: dataValidations khác gốc`);
      const nCot = Math.max(wg.columnCount, wx.columnCount), nDong = Math.max(wg.rowCount, wx.rowCount);
      for (let c = 1; c <= nCot; c++) {
        if (moi(c)) continue;
        const a = wg.getColumn(c), b = wx.getColumn(c);
        if (J([a.width, a.hidden, a.outlineLevel, a.style]) !== J([b.width, b.hidden, b.outlineLevel, b.style])) L(`${ten}: cột ${c} đổi độ rộng / ẩn / định dạng (${J(a.width)} → ${J(b.width)})`);
      }
      if (wx.rowCount !== wg.rowCount) L(`${ten}: số dòng ${wg.rowCount} → ${wx.rowCount}`);
      for (let r = 1; r <= nDong; r++) {
        const ra = wg.getRow(r), rb = wx.getRow(r);
        if (J([ra.height, ra.hidden, ra.outlineLevel]) !== J([rb.height, rb.hidden, rb.outlineLevel])) L(`${ten}: dòng ${r} đổi chiều cao / ẩn`);
        const n = Math.max(ra.cellCount, rb.cellCount);
        for (let c = 1; c <= n; c++) {
          const ca = ra.getCell(c), cb = rb.getCell(c);
          if (moi(c)) {                                   // 3 cột mới: chỉ ở dòng tiêu đề / dòng tài sản, luôn là chữ (không công thức)
            const v = cb.value;
            if (v == null) continue;
            dem.oMoi++;
            if (!dongTieuDe(r) && !dongTS.has(r)) L(`${ten}!${cb.address}: ghi vào dòng không phải tài sản (vd. dòng TỔNG CỘNG)`);
            if (typeof v !== 'string') L(`${ten}!${cb.address}: giá trị không phải chữ (${J(v).slice(0, 40)})`);
            continue;
          }
          dem.o++;
          if (J(giaTri(ca)) !== J(giaTri(cb))) L(`${ten}!${ca.address}: giá trị "${J(giaTri(ca)).slice(0, 40)}" → "${J(giaTri(cb)).slice(0, 40)}"`);
          else if (J(ca.style) !== J(cb.style)) L(`${ten}!${ca.address}: định dạng ô khác gốc`);
        }
      }
      const mg = new Set(Object.keys(wg._merges || {})), mx = Object.keys(wx._merges || {});
      [...mg].forEach(m => { if (!(wx._merges || {})[m]) L(`${ten}: mất ô gộp ${m}`); });
      mx.filter(m => !mg.has(m)).forEach(m => { const t = wx._merges[m].model || {}; if (!(moi(t.left) && t.left === t.right && dongTieuDe(t.top) && dongTieuDe(t.bottom))) L(`${ten}: thêm ô gộp lạ ${m}`); });
    }
    return { loi, dem };
  }

  /* ---------- 2. so TỪNG BYTE các phần của gói .xlsx ---------- */
  async function soSanhGoi(zg, zx, goc, X, kiemXml) {
    const loi = [], dem = { phan: 0, giongByte: 0, sheetSua: 0 };
    const L = s => { if (loi.length < 60) loi.push(s); };
    const doc = (z, p) => z.file(p) ? z.file(p).async('string') : Promise.resolve(null);
    const tep = z => Object.keys(z.files).filter(p => !z.files[p].dir);
    // phần XML của từng sheet trong file gốc + vùng 3 cột mới của mỗi sheet danh sách
    const wbg = await doc(zg, 'xl/workbook.xml'), relg = await doc(zg, 'xl/_rels/workbook.xml.rels');
    const dich = {}; for (const m of relg.matchAll(/<Relationship\b[^>]*>/g)) dich[attr(m[0], 'Id')] = attr(m[0], 'Target');
    const pre = (/<sheet\b[^>]*\s([A-Za-z_][\w.-]*):id="/.exec(wbg) || [0, 'r'])[1];
    const phan = {}; for (const m of wbg.matchAll(/<sheet\b[^>]*\/?>/g)) { const t = dich[attr(m[0], pre + ':id')]; if (t) phan[xmlBo(attr(m[0], 'name'))] = t.startsWith('/') ? t.slice(1) : 'xl/' + t; }
    const vung = {}; for (const ws of goc.worksheets) { const hm = X.headerMap(ws); if (hm && phan[ws.name]) { const last = cotCuoi(ws); vung[phan[ws.name]] = [last + 1, last + 3]; } }
    const SUA = new Set(['xl/styles.xml', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', '[Content_Types].xml', ...Object.keys(vung)]);
    // a. mọi phần khác: giống từng byte
    for (const p of tep(zg)) {
      dem.phan++;
      if (!zx.file(p)) { L(`mất phần ${p}`); continue; }
      if (SUA.has(p)) continue;
      const [a, b] = await Promise.all([zg.file(p).async('uint8array'), zx.file(p).async('uint8array')]);
      if (a.length !== b.length || a.some((v, i) => v !== b[i])) L(`phần ${p} bị thay đổi`); else dem.giongByte++;
    }
    // b. phần mới: chỉ được là sheet "Tài sản phát sinh"
    const wbx = await doc(zx, 'xl/workbook.xml'), relx = await doc(zx, 'xl/_rels/workbook.xml.rels'), ctg = await doc(zg, '[Content_Types].xml'), ctx = await doc(zx, '[Content_Types].xml');
    const moi = tep(zx).filter(p => !zg.file(p));
    const psSheet = [...wbx.matchAll(/<sheet\b[^>]*\/?>/g)].filter(m => PHAT_SINH.test(xmlBo(attr(m[0], 'name'))));
    if (moi.length > 1 || psSheet.length > 1 || (moi.length && !/^xl\/worksheets\/sheet\d+\.xml$/.test(moi[0])) || moi.length !== psSheet.length) L(`thêm phần lạ: ${moi.join(', ') || '(không)'} · sheet phát sinh: ${psSheet.length}`);
    // c. workbook.xml / rels / [Content_Types].xml: bỏ đúng phần khai báo sheet phát sinh → phải giống gốc từng ký tự
    const boPS = s => s.replace(/<sheet\b[^>]*\/>/g, t => PHAT_SINH.test(xmlBo(attr(t, 'name'))) ? '' : t);
    const boPart = (s, tag, at) => s.replace(new RegExp('<' + tag + '\\b[^>]*\\/>', 'g'), t => moi.some(p => (attr(t, at) || '').replace(/^\//, '').replace(/^worksheets\//, 'xl/worksheets/') === p) ? '' : t);
    if (boPS(wbx) !== wbg) L('workbook.xml đổi ngoài phần thêm sheet phát sinh');
    if (boPart(relx, 'Relationship', 'Target') !== relg) L('workbook.xml.rels đổi ngoài phần thêm sheet phát sinh');
    if (boPart(ctx, 'Override', 'PartName') !== ctg) L('[Content_Types].xml đổi ngoài phần thêm sheet phát sinh');
    // d. styles.xml: phông / định dạng ô gốc giữ nguyên, chỉ thêm vào cuối; phần còn lại giống từng ký tự
    const sg = await doc(zg, 'xl/styles.xml'), sx = await doc(zx, 'xl/styles.xml');
    const bo2 = s => s.replace(/<(fonts|cellXfs)\b[^>]*>[\s\S]*?<\/\1>/g, '<$1/>');
    if (bo2(sg) !== bo2(sx)) L('styles.xml: phần ngoài danh sách phông / định dạng ô bị đổi');
    for (const [k, t] of [['fonts', 'font'], ['cellXfs', 'xf']]) {
      const ds = s => { const m = new RegExp('<' + k + '\\b[^>]*>([\\s\\S]*?)</' + k + '>').exec(s); return m ? [...m[1].matchAll(new RegExp('<' + t + '\\b[^>]*?(?:/>|>[\\s\\S]*?</' + t + '>)', 'g'))].map(x => x[0]) : []; };
      const a = ds(sg), b = ds(sx);
      if (b.length < a.length || a.some((x, i) => x !== b[i])) L(`styles.xml: ${k} gốc bị đổi (chỉ được thêm vào cuối)`);
    }
    // e. sheet danh sách: bỏ ô / khai báo cột / ô gộp của đúng 3 cột mới → phải giống gốc từng ký tự
    for (const [p, [c1, c3]] of Object.entries(vung)) {
      const a = await doc(zg, p), b = await doc(zx, p);
      const trong = ref => { const c = colSo(String(ref).replace(/\d+$/, '')); return c >= c1 && c <= c3; };
      const chuan = s => s.replace(/<dimension\b[^>]*\/>/, '<dimension/>')
        .replace(/(<row\b[^>]*?)\sspans="[^"]*"/g, '$1')
        .replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (all, at) => { const r = attr(at, 'r'); return r && trong(r) ? '' : all; })
        .replace(/<col\b[^>]*\/>/g, t => { const mn = +attr(t, 'min'), mx = +attr(t, 'max'); return mn === mx && mn >= c1 && mn <= c3 ? '' : t; }).replace(/<cols><\/cols>/, '')
        .replace(/<mergeCell\b[^>]*\/>/g, t => { const m = /^([A-Z]+)\d+:([A-Z]+)\d+$/.exec(attr(t, 'ref') || ''); return m && m[1] === m[2] && trong(m[1] + '1') ? '' : t; })
        .replace(/(<mergeCells\b[^>]*?)\scount="\d+"/, '$1').replace(/<mergeCells><\/mergeCells>/, '')
        .replace(/<row\b([^>]*?)><\/row>/g, '<row$1/>');
      if (chuan(a) !== chuan(b)) {
        const x = chuan(a), y = chuan(b); let i = 0; while (i < x.length && x[i] === y[i]) i++;
        L(`${p}: đổi ngoài 3 cột mới, quanh: …${x.slice(Math.max(0, i - 60), i + 60)}… → …${y.slice(Math.max(0, i - 60), i + 60)}…`);
      } else dem.sheetSua++;
      const dg = attr(/<dimension\b[^>]*\/>/.exec(a)?.[0], 'ref'), dx = attr(/<dimension\b[^>]*\/>/.exec(b)?.[0], 'ref');
      if (dg && dx && dg.replace(/:[A-Z]+/, ':') !== dx.replace(/:[A-Z]+/, ':')) L(`${p}: vùng dữ liệu đổi số dòng (${dg} → ${dx})`);
    }
    // f. XML các phần đã chèn / thêm đọc được (không hỏng file)
    if (kiemXml) for (const p of [...SUA, ...moi]) { const s = await doc(zx, p); if (s != null) { const e = kiemXml(s); if (e) L(`${p}: XML hỏng — ${e}`); } }
    return { loi, dem };
  }
  g.KIEMKE_SOSANH = { soSanh, soSanhGoi, PHAT_SINH };
})(typeof globalThis !== 'undefined' ? globalThis : window);
