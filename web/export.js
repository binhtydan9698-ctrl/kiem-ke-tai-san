/*
 * Xuất cho kế toán: mở đúng file Excel gốc (data/goc.xlsx = file trong "dữ liệu cập nhật/"),
 * giữ nguyên mọi sheet, cột, định dạng; chỉ
 *   - điền cột "Thực tế" / "SL thực tế" (nếu file có cột đó) bằng số lượng đã kiểm,
 *   - thêm 3 cột cuối: Kết quả kiểm kê · Vị trí thực tế · Ghi chú kiểm kê,
 *   - thêm sheet "Tài sản phát sinh" nếu có.
 * Cách nhận diện dòng phải GIỐNG scripts/build.mjs (khoá = Mã TSCĐ, không mã thì "khong-ma:<sheet>:<dòng>").
 */
(function () {
  const EXCELJS = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
  const NEW_COLS = [['Kết quả kiểm kê', 30], ['Vị trí thực tế', 22], ['Ghi chú kiểm kê', 45]];

  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/\s+/g, ' ').trim();
  const COLS = {
    stt: ['stt', 'so tt', 'so thu tu'],
    ma: ['ma tscd', 'ma tai san', 'ma ts'],
    ten: ['ten tscd', 'ten tai san', 'ten ts'],
    sl: ['so sach', 'sl so sach', 'so luong'],
    ngay: ['ngay bat dau sd', 'ngay bat dau su dung', 'ngay su dung', 'ngay sd'],
    gia: ['nguyen gia'],
    gc: ['ghi chu', 'don vi', 'don vi quan ly', 'bo phan su dung'],
    vt: ['vi tri', 'vi tri theo so', 'phong'],
  };
  const TT = ['thuc te', 'sl thuc te', 'so luong thuc te'];

  function cellValue(c) {
    let v = c.value;
    if (v && typeof v === 'object') {
      if (v instanceof Date) return v;
      if ('result' in v) v = v.result;
      else if ('richText' in v) v = v.richText.map(t => t.text).join('');
      else if ('text' in v) v = v.text;
    }
    return v;
  }
  const str = v => (v == null ? '' : String(v instanceof Date ? v.toISOString().slice(0, 10) : v)).replace(/ /g, ' ').trim();
  const match = (h, names) => names.some(n => h === n || h.startsWith(n + ' ') || h.startsWith(n + '('));

  function headerMap(ws) {
    for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) {
      const found = {};
      ws.getRow(r).eachCell({ includeEmpty: false }, (c, col) => {
        const h = norm(cellValue(c));
        if (!found.tt && match(h, TT)) { found.tt = col; return; }
        for (const [k, names] of Object.entries(COLS)) {
          if (found[k]) continue;
          if (match(h, names)) { found[k] = col; break; }
        }
      });
      if (found.ten && (found.ma || found.sl)) return { row: r, cols: found };
    }
    return null;
  }

  function loadExcelJS() {
    if (window.ExcelJS) return Promise.resolve();
    return new Promise((ok, fail) => {
      const s = document.createElement('script'); s.src = EXCELJS;
      s.onload = () => ok(); s.onerror = () => fail(new Error('không tải được thư viện Excel, kiểm tra mạng'));
      document.head.appendChild(s);
    });
  }
  const clone = o => (o ? JSON.parse(JSON.stringify(o)) : undefined);
  const COLOR = { nf: 'FFB0281F', thieu: 'FF9A5700', thua: 'FF9A5700', du: 'FF1B7443', hoso: 'FF2C56A3', chua: 'FF8A9893' };

  // opts.ketQua: { [khoá]: {kq, vt, gc, thucTe, r} } · opts.phatSinh: [{mo_ta, sl, phong, cond, noi}] · opts.tenFile
  window.xuatExcelKeToan = async function (opts) {
    await loadExcelJS();
    const res = await fetch('data/goc.xlsx', { cache: 'no-store' });
    if (!res.ok) throw new Error('không tìm thấy file Excel gốc trên máy chủ');
    const wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(await res.arrayBuffer());

    const seen = new Set(); let filled = 0;
    for (const ws of wb.worksheets) {
      const hm = headerMap(ws);
      if (!hm) continue;
      const { cols } = hm;
      // cột cuối đang có dữ liệu → 3 cột mới nằm ngay sau
      let last = 0;
      ws.eachRow({ includeEmpty: false }, row => row.eachCell({ includeEmpty: false }, (c, col) => { if (col > last) last = col; }));
      const hdr = ws.getRow(hm.row);
      const base = hdr.getCell(cols.ten);
      NEW_COLS.forEach(([title, width], i) => {
        const c = hdr.getCell(last + 1 + i);
        c.value = title;
        if (base.style) c.style = clone(base.style);
        c.font = { ...(clone(base.font) || {}), bold: true };
        ws.getColumn(last + 1 + i).width = width;
      });
      if (ws.autoFilter) ws.autoFilter = { from: { row: hm.row, column: 1 }, to: { row: hm.row, column: last + 3 } };

      for (let r = hm.row + 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const ma = cols.ma ? str(cellValue(row.getCell(cols.ma))) : '';
        const ten = str(cellValue(row.getCell(cols.ten)));
        if (!ten && !ma) continue;
        let key = ma ? ma : `khong-ma:${ws.name}:${r}`;
        if (seen.has(key)) key = `${key}#${r}`;
        seen.add(key);
        const k = opts.ketQua[key];
        if (!k) continue;
        if (cols.tt && k.thucTe !== '' && k.thucTe != null) row.getCell(cols.tt).value = Number(k.thucTe);
        const vals = [k.kq, k.vt, k.gc];
        vals.forEach((v, i) => {
          const c = row.getCell(last + 1 + i);
          c.value = v || null;
          c.alignment = { vertical: 'top', wrapText: i === 2 };
          if (i === 0) c.font = { color: { argb: COLOR[k.r] || 'FF000000' }, bold: k.r !== 'chua' && k.r !== 'du' };
        });
        if (k.r !== 'chua') filled++;
      }
    }

    if (opts.phatSinh && opts.phatSinh.length) {
      let name = 'Tài sản phát sinh', n = 2;
      while (wb.getWorksheet(name)) name = `Tài sản phát sinh ${n++}`;
      const ws = wb.addWorksheet(name);
      ws.columns = [
        { header: 'STT', width: 6 }, { header: 'Mô tả (không có trong sổ)', width: 50 }, { header: 'Số lượng', width: 10 },
        { header: 'Phòng', width: 20 }, { header: 'Tình trạng', width: 18 }, { header: 'Ghi nhận tại', width: 34 }];
      ws.getRow(1).font = { bold: true };
      opts.phatSinh.forEach((p, i) => ws.addRow([i + 1, p.mo_ta, p.sl, p.phong, p.cond, p.noi]));
    }

    const buf = await wb.xlsx.writeBuffer();
    const d = new Date(), p2 = x => String(x).padStart(2, '0');
    const fname = `${opts.tenFile || 'Kiem ke'} - cho ke toan ${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}.xlsx`;
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a'); a.href = url; a.download = fname;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return filled;
  };
})();
