/*
 * Xuất cho kế toán: mở đúng file Excel gốc (data/goc.xlsx = file BBKK trong "dữ liệu cập nhật/").
 * QUY TẮC (người dùng chốt 16/11/2026, AGENTS.md): file gốc GIỮ NGUYÊN — mọi sheet, ô, công thức, định dạng, ô gộp, độ rộng cột,
 * chiều cao dòng, vùng lọc, thiết lập in, kể cả cột "Thực tế" có sẵn (để trống như gốc). Mọi thay đổi chỉ gói trong:
 *   - 3 cột cuối thêm vào ở MỌI sheet danh sách: Kết quả kiểm kê · Vị trí thực tế · Ghi chú kiểm kê (ô tiêu đề + ô ở dòng tài sản,
 *     độ rộng 3 cột này, ô gộp tiêu đề 2 dòng của 3 cột này),
 *   - sheet riêng "Tài sản phát sinh" ở cuối file khi có (giống 3 sheet lẻ: chưa rõ phòng ban, để riêng cho dễ xử lý).
 * Cách làm: KHÔNG mở rồi ghi lại cả file bằng thư viện (ExcelJS làm mất độ rộng cột gộp kiểu "D:E", đổi thiết lập in…). File gốc chỉ
 * được ĐỌC (ExcelJS) để biết sheet danh sách, dòng tiêu đề, dòng tài sản; rồi mở gói .xlsx (JSZip) và CHÈN thêm ô của 3 cột mới vào
 * đúng dòng trong phần XML của từng sheet, thêm định dạng mới vào cuối bảng định dạng. Mọi phần khác của file giữ nguyên từng byte.
 * npm test (bước 3) và thử giao diện (kịch bản "xuat-goc", bấm đúng nút trên trang) so file xuất với file gốc từng byte, từng ô
 * (scripts/so-sanh-excel.js) để giữ quy tắc này.
 * Nhận diện tiêu đề / dòng tổng / khoá tài sản: web/excel-rules.js (dùng chung với scripts/build.mjs).
 */
(function () {
  const EXCELJS = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
  const JSZIP = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';   // cùng bản với phần In tem (ma-qr.js)
  const NEW_COLS = [['Kết quả kiểm kê', 30], ['Vị trí thực tế', 22], ['Ghi chú kiểm kê', 45]];
  const COLOR = { nf: 'FFB0281F', thieu: 'FF9A5700', thua: 'FF9A5700', du: 'FF1B7443', hoso: 'FF2C56A3', chua: 'FF8A9893' };
  const PHAT_SINH = 'Tài sản phát sinh';

  function napThuVien(url, lay) {
    if (lay()) return Promise.resolve(lay());
    return new Promise((ok, fail) => {
      const s = document.createElement('script'); s.src = url;
      s.onload = () => (lay() ? ok(lay()) : fail(new Error('thư viện không chạy được: ' + url)));
      s.onerror = () => fail(new Error('không tải được thư viện Excel, kiểm tra mạng'));
      document.head.appendChild(s);
    });
  }
  const loadExcelJS = () => napThuVien(EXCELJS, () => window.ExcelJS);
  const loadJSZip = () => napThuVien(JSZIP, () => window.JSZip);

  /* ---------- công cụ XML nhỏ (chỉ đọc / chèn, không dựng lại cả tài liệu) ---------- */
  const attr = (s, ten) => { const m = new RegExp('\\s' + ten + '="([^"]*)"').exec(s || ''); return m ? m[1] : null; };
  const colSo = s => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  const colChu = n => { let s = ''; for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
  const xmlEsc = s => String(s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const xmlBo = s => String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (a, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (a, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
  // định dạng (chỉ số s) của một ô trong nội dung một dòng
  const sCuaO = (con, ref) => { const m = new RegExp('<c\\b[^>]*?\\sr="' + ref + '"[^>]*?\\/?>').exec(con || ''); return m ? +(attr(m[0], 's') || 0) : 0; };

  /* ---------- bảng định dạng: chỉ THÊM phông / định dạng ô mới vào cuối, không sửa cái có sẵn ---------- */
  function docStyles(xml) {
    const khoi = ten => { const m = new RegExp('<' + ten + '\\b[^>]*>([\\s\\S]*?)</' + ten + '>').exec(xml); return m ? m[1] : ''; };
    const fonts = [...khoi('fonts').matchAll(/<font\b[^>]*?(?:\/>|>[\s\S]*?<\/font>)/g)].map(m => m[0]);
    const xfs = [...khoi('cellXfs').matchAll(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g)].map(m => m[0]);
    if (!fonts.length || !xfs.length) throw new Error('file Excel gốc thiếu bảng định dạng');
    return { xml, fonts, xfs, fontMoi: [], xfMoi: [], nho: {} };
  }
  function fontMoi(S, fid, o) {
    const k = `f${fid}|${o.dam ? 1 : 0}|${o.mau || ''}`;
    if (S.nho[k] == null) {
      let f = S.fonts[fid] || S.fonts[0];
      if (/^<font\b[^>]*\/>$/.test(f)) f = f.replace(/\/>$/, '></font>');
      f = f.replace(/<b\b[^>]*\/>/g, '');
      if (o.dam) f = f.replace(/^(<font\b[^>]*>)/, (a, p) => p + '<b/>');
      if (o.mau) {
        f = f.replace(/<color\b[^>]*\/>/g, '');
        const c = `<color rgb="${o.mau}"/>`;
        f = /<sz\b[^>]*\/>/.test(f) ? f.replace(/(<sz\b[^>]*\/>)/, (a, p) => p + c) : f.replace(/<\/font>$/, c + '</font>');
      }
      S.fontMoi.push(f); S.nho[k] = S.fonts.length + S.fontMoi.length - 1;
    }
    return S.nho[k];
  }
  // định dạng ô mới = chép định dạng ô gốc s (viền, nền, phông chữ…), đổi phông (đậm / màu) và căn lề
  function xfMoi(S, s, o) {
    const k = `x${s}|${o.dam ? 1 : 0}|${o.mau || ''}|${o.ngang || ''}|${o.doc || ''}|${o.xuong ? 1 : 0}`;
    if (S.nho[k] == null) {
      const goc = S.xfs[s] || S.xfs[0], m = /^<xf\b([^>]*?)(\/?)>([\s\S]*?)(?:<\/xf>)?$/.exec(goc);
      let at = m[1], con = m[3] || '';
      const dat = (ten, v) => { at = new RegExp('\\s' + ten + '="[^"]*"').test(at) ? at.replace(new RegExp('(\\s' + ten + ')="[^"]*"'), (a, p) => `${p}="${v}"`) : `${at} ${ten}="${v}"`; };
      dat('fontId', fontMoi(S, +(attr(at, 'fontId') || 0), o)); dat('applyFont', 1); dat('applyAlignment', 1);
      const can = `<alignment${o.ngang ? ` horizontal="${o.ngang}"` : ''}${o.doc ? ` vertical="${o.doc}"` : ''}${o.xuong ? ' wrapText="1"' : ''}/>`;
      con = can + con.replace(/<alignment\b[^>]*\/>/g, '');   // alignment đứng đầu (trước protection) theo chuẩn
      S.xfMoi.push(`<xf${at}>${con}</xf>`); S.nho[k] = S.xfs.length + S.xfMoi.length - 1;
    }
    return S.nho[k];
  }
  function ghiStyles(S) {
    const them = (xml, ten, ds, n) => xml.replace(new RegExp('<' + ten + '\\b([^>]*)>([\\s\\S]*?)</' + ten + '>'), (a, at, con) =>
      `<${ten}${/\scount="\d+"/.test(at) ? at.replace(/\scount="\d+"/, ` count="${n}"`) : at}>${con}${ds.join('')}</${ten}>`);
    let xml = S.xml;
    if (S.fontMoi.length) xml = them(xml, 'fonts', S.fontMoi, S.fonts.length + S.fontMoi.length);
    if (S.xfMoi.length) xml = them(xml, 'cellXfs', S.xfMoi, S.xfs.length + S.xfMoi.length);
    return xml;
  }

  /* ---------- chèn ô 3 cột mới vào phần XML của một sheet ---------- */
  const oXml = (r, x) => x.v == null || x.v === '' ? `<c r="${colChu(x.c)}${r}" s="${x.s}"/>`
    : `<c r="${colChu(x.c)}${r}" s="${x.s}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(x.v)}</t></is></c>`;
  // một dòng có sẵn: giữ nguyên mọi ô; chèn ô mới ngay sau ô cuối cùng đứng trước vùng 3 cột mới.
  // Ô trống chỉ có định dạng nằm trong vùng 3 cột mới thì thay bằng ô mới; ô có dữ liệu ở đó → dừng (không bao giờ ghi đè dữ liệu gốc).
  function suaDong(at, con, r, ds, c1, c3) {
    const moi = ds.map(x => oXml(r, x)).join(''), reC = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let kq = '', tu = 0, da = false, cTruoc = 0, m;
    while ((m = reC.exec(con))) {
      const ref = attr(m[1], 'r'), c = ref ? colSo(ref.replace(/\d+$/, '')) : cTruoc + 1; cTruoc = c;
      if (!da && c >= c1) { kq += con.slice(tu, m.index) + moi; tu = m.index; da = true; }
      if (c >= c1 && c <= c3) {
        if (m[2] && /<(v|f|is)\b/.test(m[2])) throw new Error(`ô ${ref || colChu(c) + r} của file gốc đã có dữ liệu, không ghi đè — kiểm tra lại file Excel`);
        kq += con.slice(tu, m.index); tu = reC.lastIndex;
      }
    }
    if (!da) { const e = con.indexOf('<extLst'), vt = e >= 0 ? e : con.length; kq += con.slice(tu, vt) + moi; tu = vt; }
    kq += con.slice(tu);
    const sp = attr(at, 'spans'); let at2 = at;   // gợi ý "spans" (không bắt buộc) nới ra cho 3 cột mới
    if (sp) { const n = sp.split(/[\s:]+/).map(Number).filter(x => x > 0); if (n.length && Math.max(...n) < c3) at2 = at.replace(/(\sspans=")[^"]*"/, (a, p) => `${p}${Math.min(...n)}:${c3}"`); }
    return `<row${at2}>${kq}</row>`;
  }
  const SAU_GOP = ['phoneticPr', 'conditionalFormatting', 'dataValidations', 'hyperlinks', 'printOptions', 'pageMargins', 'pageSetup', 'headerFooter', 'rowBreaks', 'colBreaks',
    'customProperties', 'cellWatches', 'ignoredErrors', 'smartTags', 'drawing', 'legacyDrawing', 'legacyDrawingHF', 'picture', 'oleObjects', 'controls', 'webPublishItems', 'tableParts', 'extLst'];
  function vaSheet(xml, viec, c1, c3, gop) {
    const mo = /<sheetData\b[^>]*?(\/?)>/.exec(xml);
    if (!mo) throw new Error('sheet không có phần dữ liệu (sheetData)');
    const dau = mo.index + mo[0].length, rong = mo[1] === '/', cuoi = rong ? dau : xml.indexOf('</sheetData>', dau), body = rong ? '' : xml.slice(dau, cuoi);
    const can = [...viec.keys()].sort((a, b) => a - b); let ci = 0;
    const dongMoi = r => `<row r="${r}">${viec.get(r)('').map(x => oXml(r, x)).join('')}</row>`;   // (dòng tiêu đề / tài sản luôn có sẵn; phòng khi thiếu)
    const re = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
    let out = '', tu = 0, rTruoc = 0, m;
    while ((m = re.exec(body))) {
      const r = +(attr(m[1], 'r') || rTruoc + 1); rTruoc = r;
      out += body.slice(tu, m.index); tu = re.lastIndex;
      while (ci < can.length && can[ci] < r) out += dongMoi(can[ci++]);
      if (ci < can.length && can[ci] === r) { out += suaDong(m[1], m[2] || '', r, viec.get(r)(m[2] || ''), c1, c3); ci++; }
      else out += m[0];
    }
    out += body.slice(tu);
    while (ci < can.length) out += dongMoi(can[ci++]);
    let kq = rong ? xml.slice(0, mo.index) + '<sheetData>' + out + '</sheetData>' + xml.slice(dau) : xml.slice(0, dau) + out + xml.slice(cuoi);
    // vùng dữ liệu (dimension) nới ra cho 3 cột mới
    kq = kq.replace(/<dimension\b[^>]*\/>/, t => t.replace(/ref="([A-Z]+\d+):([A-Z]+)(\d+)"/, (a, tl, cB, rB) => colSo(cB) >= c3 ? a : `ref="${tl}:${colChu(c3)}${rB}"`));
    // độ rộng 3 cột mới (chỉ khi file gốc chưa khai cột đó), chèn đúng thứ tự cột
    const tags = NEW_COLS.map(([, w], i) => ({ c: c1 + i, x: `<col min="${c1 + i}" max="${c1 + i}" width="${w}" customWidth="1"/>` }));
    const mc = /<cols\b[^>]*>([\s\S]*?)<\/cols>/.exec(kq);
    if (!mc) kq = kq.replace(/<sheetData\b/, '<cols>' + tags.map(t => t.x).join('') + '</cols><sheetData');
    else {
      const d0 = mc.index + mc[0].indexOf('>') + 1, con = mc[1];
      const ds = [...con.matchAll(/<col\b[^>]*\/>/g)].map(x => ({ i: x.index, mn: +attr(x[0], 'min'), mx: +attr(x[0], 'max') }));
      let moi = con;
      tags.filter(t => !ds.some(d => t.c >= d.mn && t.c <= d.mx)).reverse().forEach(t => { const sau = ds.find(d => d.mn > t.c), vt = sau ? sau.i : con.length; moi = moi.slice(0, vt) + t.x + moi.slice(vt); });
      kq = kq.slice(0, d0) + moi + kq.slice(d0 + con.length);
    }
    // ô gộp tiêu đề 2 dòng của 3 cột mới
    if (gop.length) {
      const t = gop.map(g => `<mergeCell ref="${g}"/>`).join(''), m2 = /<mergeCells\b([^>]*)>([\s\S]*?)<\/mergeCells>/.exec(kq);
      if (m2) {
        const n = (m2[2].match(/<mergeCell\b/g) || []).length + gop.length, at = /\scount="\d+"/.test(m2[1]) ? m2[1].replace(/\scount="\d+"/, ` count="${n}"`) : m2[1];
        kq = kq.slice(0, m2.index) + `<mergeCells${at}>${m2[2]}${t}</mergeCells>` + kq.slice(m2.index + m2[0].length);
      } else {
        const sd = kq.indexOf('</sheetData>'); let vt = -1;
        for (const ten of SAU_GOP) { const i = kq.indexOf('<' + ten, sd); if (i >= 0 && (vt < 0 || i < vt)) vt = i; }
        if (vt < 0) vt = kq.lastIndexOf('</worksheet>');
        kq = kq.slice(0, vt) + `<mergeCells count="${gop.length}">${t}</mergeCells>` + kq.slice(vt);
      }
    }
    return kq;
  }
  function sheetPhatSinh(ds, sTD, sO) {
    const H = ['STT', 'Mô tả (không có trong sổ)', 'Số lượng', 'Phòng', 'Tình trạng', 'Ghi nhận tại'], W = [6, 50, 10, 20, 18, 34];
    const o = (r, c, v, s) => v == null || v === '' ? `<c r="${colChu(c)}${r}" s="${s}"/>` : typeof v === 'number' && isFinite(v) ? `<c r="${colChu(c)}${r}" s="${s}"><v>${v}</v></c>`
      : `<c r="${colChu(c)}${r}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
    const dong = [`<row r="1">${H.map((h, i) => o(1, i + 1, h, sTD)).join('')}</row>`]
      .concat(ds.map((p, i) => `<row r="${i + 2}">${[i + 1, p.mo_ta, Number(p.sl) || p.sl, p.phong, p.cond, p.noi].map((v, j) => o(i + 2, j + 1, v, sO)).join('')}</row>`));
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + `<dimension ref="A1:F${ds.length + 1}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
      + `<sheetFormatPr defaultRowHeight="15"/><cols>${W.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
      + `<sheetData>${dong.join('')}</sheetData><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
  }

  // opts.ketQua: { [khoá]: {kq, vt, gc, r} } · opts.phatSinh: [{mo_ta, sl, phong, cond, noi}] · opts.tenFile
  window.xuatExcelKeToan = async function (opts) {
    const X = window.KIEMKE_EXCEL;
    if (!X) throw new Error('thiếu excel-rules.js');
    await loadExcelJS(); await loadJSZip();
    // file gốc: dang-nhap.js cung cấp kiemkeTepGoc() (tự giải mã khi dữ liệu trên web đã mã hoá — BAO-MAT.md)
    const goc0 = window.kiemkeTepGoc ? await window.kiemkeTepGoc() : await (async () => {
      const res = await fetch('data/goc.xlsx', { cache: 'no-store' });
      if (!res.ok) throw new Error('không tìm thấy file Excel gốc trên máy chủ');
      return res.arrayBuffer();
    })();
    const goc = goc0 instanceof ArrayBuffer ? goc0 : goc0.buffer.slice(goc0.byteOffset, goc0.byteOffset + goc0.byteLength);
    // 1. CHỈ ĐỌC file gốc để biết sheet danh sách, dòng tiêu đề, dòng tài sản (không ghi lại bằng thư viện)
    const wb = new window.ExcelJS.Workbook(); await wb.xlsx.load(goc.slice(0));
    // 2. mở gói .xlsx gốc; tên sheet → phần XML
    const zip = await window.JSZip.loadAsync(goc.slice(0));
    const docP = p => { const f = zip.file(p); if (!f) throw new Error('file Excel gốc thiếu phần ' + p); return f.async('string'); };
    const wbx = await docP('xl/workbook.xml'), rel = await docP('xl/_rels/workbook.xml.rels');
    const dich = {}; for (const m of rel.matchAll(/<Relationship\b[^>]*>/g)) dich[attr(m[0], 'Id')] = attr(m[0], 'Target');
    const pre = (/<sheet\b[^>]*\s([A-Za-z_][\w.-]*):id="/.exec(wbx) || [0, 'r'])[1];
    const phan = {}, tenCo = new Set();
    for (const m of wbx.matchAll(/<sheet\b[^>]*\/?>/g)) {
      const ten = xmlBo(attr(m[0], 'name')), t = dich[attr(m[0], pre + ':id')]; tenCo.add(ten);
      if (t) phan[ten] = t.startsWith('/') ? t.slice(1) : 'xl/' + t;
    }
    const S = docStyles(await docP('xl/styles.xml'));
    const done = new Set();
    for (const ws of wb.worksheets) {
      const hm = X.headerMap(ws);
      if (!hm) continue;
      const p = phan[ws.name];
      if (!p || !zip.file(p)) throw new Error(`không tìm thấy phần dữ liệu của sheet "${ws.name}" trong file gốc`);
      // cột cuối đang có dữ liệu → 3 cột mới nằm ngay sau
      let last = 0;
      ws.eachRow({ includeEmpty: false }, row => row.eachCell({ includeEmpty: false }, (c, col) => { if (col > last) last = col; }));
      const c1 = last + 1, c3 = last + NEW_COLS.length, tenRef = r => colChu(hm.cols.ten) + r, viec = new Map();
      let sTD = null;   // định dạng ô tiêu đề mới = chép ô tiêu đề cột Tên, chữ đậm, căn giữa
      for (let r = hm.row; r < hm.dataStart; r++) viec.set(r, con => {
        if (sTD == null) sTD = xfMoi(S, sCuaO(con, tenRef(r)), { dam: true, ngang: 'center', doc: 'center', xuong: true });
        return NEW_COLS.map(([t], i) => ({ c: c1 + i, s: sTD, v: r === hm.row ? t : null }));
      });
      const gop = hm.dataStart - hm.row > 1 ? NEW_COLS.map((x, i) => `${colChu(c1 + i)}${hm.row}:${colChu(c1 + i)}${hm.dataStart - 1}`) : [];
      for (let r = hm.dataStart; r <= ws.rowCount; r++) {
        const x = X.readRow(ws, hm, r);
        if (!x || x.tiepTen) continue;
        const k = opts.ketQua[x.key];
        if (!k) continue;
        viec.set(r, con => { const s = sCuaO(con, tenRef(r));   // định dạng ô mới chép từ ô Tên của chính dòng đó (viền, nền…)
          return [k.kq, k.vt, k.gc].map((v, i) => ({ c: c1 + i, v: v ? String(v) : null,
            s: xfMoi(S, s, i === 0 ? { mau: COLOR[k.r] || 'FF000000', dam: k.r !== 'chua' && k.r !== 'du', doc: 'center', xuong: true } : { doc: 'center', xuong: true }) })); });
        if (k.r !== 'chua') done.add(x.key);
      }
      zip.file(p, vaSheet(await docP(p), viec, c1, c3, gop));
    }

    // 3. sheet riêng "Tài sản phát sinh" ở cuối (không đụng sheet gốc nào)
    let wbx2 = wbx;
    if (opts.phatSinh && opts.phatSinh.length) {
      let ten = PHAT_SINH, n = 2; while (tenCo.has(ten)) ten = `${PHAT_SINH} ${n++}`;
      let so = 1; while (zip.file(`xl/worksheets/sheet${so}.xml`)) so++;
      let rid = 'rIdKiemKe1'; while (dich[rid]) rid += 'x';
      const sheetId = Math.max(0, ...[...wbx.matchAll(/<sheet\b[^>]*\/?>/g)].map(m => +attr(m[0], 'sheetId') || 0)) + 1;
      zip.file(`xl/worksheets/sheet${so}.xml`, sheetPhatSinh(opts.phatSinh, xfMoi(S, 0, { dam: true, doc: 'center', xuong: true }), xfMoi(S, 0, { doc: 'top', xuong: true })));
      wbx2 = wbx.replace(/<\/sheets>/, `<sheet name="${xmlEsc(ten)}" sheetId="${sheetId}" ${pre}:id="${rid}"/></sheets>`);
      zip.file('xl/_rels/workbook.xml.rels', rel.replace(/<\/Relationships>/, `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${so}.xml"/></Relationships>`));
      const ct = await docP('[Content_Types].xml');
      zip.file('[Content_Types].xml', ct.replace(/<\/Types>/, `<Override PartName="/xl/worksheets/sheet${so}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`));
      zip.file('xl/workbook.xml', wbx2);
    }
    zip.file('xl/styles.xml', ghiStyles(S));

    const buf = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const d = new Date(), p2 = x => String(x).padStart(2, '0');
    const fname = `${opts.tenFile || 'Kiem ke'} - cho ke toan ${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}.xlsx`;
    taiVe(buf, fname);
    return done.size;
  };

  // Bảng đơn giản (vd. Lịch sử thao tác) → file .xlsx. cot: [[tiêu đề, độ rộng]], dong: [[giá trị, …]]
  // tuy.loc: bật nút lọc ở dòng tiêu đề (vd. Tổng hợp toàn bộ tài sản: lọc theo nhóm, tòa, phòng, phòng ban)
  window.xuatBangExcel = async function (tenSheet, cot, dong, tenFile, tuy) {
    await loadExcelJS();
    const wb = new window.ExcelJS.Workbook();
    const ws = wb.addWorksheet(tenSheet);
    ws.columns = cot.map(([header, width]) => ({ header, width }));
    dong.forEach(r => ws.addRow(r));
    ws.eachRow(r => { r.alignment = { wrapText: true, vertical: 'top' }; });
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    if (tuy && tuy.loc) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cot.length } };
    taiVe(await wb.xlsx.writeBuffer(), tenFile + '.xlsx');
    return dong.length;
  };

  function taiVe(buf, fname) {
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a'); a.href = url; a.download = fname;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
})();
