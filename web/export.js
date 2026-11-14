/*
 * Xuất cho kế toán: mở đúng file Excel gốc (data/goc.xlsx = file trong "dữ liệu cập nhật/"),
 * giữ nguyên mọi sheet, cột, định dạng; chỉ
 *   - điền cột "Thực tế" (nếu file có cột đó) bằng số lượng đã kiểm,
 *   - thêm 3 cột cuối ở MỌI sheet danh sách: Kết quả kiểm kê · Vị trí thực tế · Ghi chú kiểm kê,
 *   - thêm sheet "Tài sản phát sinh" nếu có.
 * Nhận diện tiêu đề / dòng tổng / khoá tài sản: web/excel-rules.js (dùng chung với scripts/build.mjs).
 */
(function () {
  const EXCELJS = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
  const NEW_COLS = [['Kết quả kiểm kê', 30], ['Vị trí thực tế', 22], ['Ghi chú kiểm kê', 45]];
  const COLOR = { nf: 'FFB0281F', thieu: 'FF9A5700', thua: 'FF9A5700', du: 'FF1B7443', hoso: 'FF2C56A3', chua: 'FF8A9893' };

  function loadExcelJS() {
    if (window.ExcelJS) return Promise.resolve();
    return new Promise((ok, fail) => {
      const s = document.createElement('script'); s.src = EXCELJS;
      s.onload = () => ok(); s.onerror = () => fail(new Error('không tải được thư viện Excel, kiểm tra mạng'));
      document.head.appendChild(s);
    });
  }
  const clone = o => (o ? JSON.parse(JSON.stringify(o)) : undefined);

  // opts.ketQua: { [khoá]: {kq, vt, gc, thucTe, sl, r} } · opts.phatSinh: [{mo_ta, sl, phong, cond, noi}] · opts.tenFile
  window.xuatExcelKeToan = async function (opts) {
    const X = window.KIEMKE_EXCEL;
    if (!X) throw new Error('thiếu excel-rules.js');
    await loadExcelJS();
    const res = await fetch('data/goc.xlsx', { cache: 'no-store' });
    if (!res.ok) throw new Error('không tìm thấy file Excel gốc trên máy chủ');
    const wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(await res.arrayBuffer());

    const done = new Set();
    for (const ws of wb.worksheets) {
      const hm = X.headerMap(ws);
      if (!hm) continue;
      // cột cuối đang có dữ liệu → 3 cột mới nằm ngay sau
      let last = 0;
      ws.eachRow({ includeEmpty: false }, row => row.eachCell({ includeEmpty: false }, (c, col) => { if (col > last) last = col; }));
      const two = hm.dataStart === hm.row + 2;          // tiêu đề 2 dòng → gộp ô tiêu đề mới theo chiều dọc
      const base = ws.getRow(hm.row).getCell(hm.cols.ten);
      NEW_COLS.forEach(([title, width], i) => {
        const col = last + 1 + i;
        if (two) { try { ws.mergeCells(hm.row, col, hm.row + 1, col); } catch (e) { /* đã gộp */ } }
        const c = ws.getRow(hm.row).getCell(col);
        c.value = title;
        if (base.style) c.style = clone(base.style);
        c.font = { ...(clone(base.font) || {}), bold: true };
        c.alignment = { ...(clone(base.alignment) || {}), vertical: 'middle', horizontal: 'center', wrapText: true };
        ws.getColumn(col).width = width;
      });
      if (ws.autoFilter) ws.autoFilter = { from: { row: hm.row, column: 1 }, to: { row: hm.row, column: last + 3 } };

      for (let r = hm.dataStart; r <= ws.rowCount; r++) {
        const x = X.readRow(ws, hm, r);
        if (!x || x.tiepTen) continue;
        const k = opts.ketQua[x.key];
        if (!k) continue;
        const row = ws.getRow(r);
        // Điền "Thực tế" khi số sổ sách ở dòng này khớp số của tài sản (tài sản chia nhiều đơn vị thì chỉ ghi ở cột kết quả)
        const slRow = Number(X.str(x.sl));
        if (hm.cols.tt && k.thucTe !== '' && k.thucTe != null && (!hm.cols.sl || slRow === Number(k.sl)))
          row.getCell(hm.cols.tt).value = Number(k.thucTe);
        [k.kq, k.vt, k.gc].forEach((v, i) => {
          const c = row.getCell(last + 1 + i);
          c.value = v || null;
          c.alignment = { vertical: 'top', wrapText: i === 2 };
          if (i === 0) c.font = { color: { argb: COLOR[k.r] || 'FF000000' }, bold: k.r !== 'chua' && k.r !== 'du' };
        });
        if (k.r !== 'chua') done.add(x.key);
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
    taiVe(buf, fname);
    return done.size;
  };

  // Bảng đơn giản (vd. Lịch sử thao tác) → file .xlsx. cot: [[tiêu đề, độ rộng]], dong: [[giá trị, …]]
  window.xuatBangExcel = async function (tenSheet, cot, dong, tenFile) {
    await loadExcelJS();
    const wb = new window.ExcelJS.Workbook();
    const ws = wb.addWorksheet(tenSheet);
    ws.columns = cot.map(([header, width]) => ({ header, width }));
    dong.forEach(r => ws.addRow(r));
    ws.eachRow(r => { r.alignment = { wrapText: true, vertical: 'top' }; });
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
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
