/*
 * Quy tắc đọc file Excel biên bản kiểm kê — DÙNG CHUNG cho:
 *   - scripts/build.mjs  (Node: Excel → danh sách tài sản cho web)
 *   - web/export.js      (trình duyệt: điền kết quả vào đúng file Excel gốc)
 * Hai bên phải nhận diện tiêu đề, dòng tổng và khoá tài sản GIỐNG HỆT nhau, nên chỉ sửa ở đây.
 *
 * Hỗ trợ tiêu đề 1 dòng hoặc 2 dòng, ví dụ biên bản FPTU:
 *   dòng 4:  STT | Mã TSCĐ | Tên TSCĐ | Số lượng |         | Ngày bắt đầu SD | Nguyên giá | Ghi chú | Vị trí
 *   dòng 5:      |         |          | Sổ sách  | Thực tế |
 */
(function (g) {
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/\s+/g, ' ').trim();

  // Cột nhận diện theo TÊN tiêu đề (không phụ thuộc vị trí)
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
  const TT = ['thuc te', 'sl thuc te', 'so luong thuc te'];   // cột "Thực tế": web điền khi xuất
  const match = (h, names) => names.some(n => h === n || h.startsWith(n + ' ') || h.startsWith(n + '('));
  // Chữ của ô tiêu đề (ô gộp 2 dòng trả về cùng chữ ở dòng dưới, dòng tiêu đề có thể lặp lại giữa sheet)
  const isHeaderText = v => { const h = norm(v); return !!h && (match(h, COLS.ma) || match(h, COLS.ten) || match(h, TT)); };

  function cellValue(c) {
    let v = c.value;
    if (v && typeof v === 'object') {
      if (v instanceof Date) return v;
      if ('result' in v) v = v.result;                       // ô công thức
      else if ('richText' in v) v = v.richText.map(t => t.text).join('');
      else if ('text' in v) v = v.text;                      // hyperlink
    }
    return v;
  }
  const str = v => (v == null ? '' : String(v instanceof Date ? v.toISOString().slice(0, 10) : v)).replace(/ /g, ' ').trim();

  // Tìm dòng tiêu đề trong 15 dòng đầu. Trả về {row, dataStart, cols} hoặc null (sheet không phải danh sách tài sản).
  function headerMap(ws) {
    for (let r = 1; r <= Math.min(ws.rowCount, 15); r++) {
      const cols = {};
      ws.getRow(r).eachCell({ includeEmpty: false }, (c, col) => {
        const h = norm(cellValue(c));
        if (!cols.tt && match(h, TT)) { cols.tt = col; return; }
        for (const [k, names] of Object.entries(COLS)) {
          if (cols[k]) continue;
          if (match(h, names)) { cols[k] = col; break; }
        }
      });
      if (!(cols.ten && (cols.ma || cols.sl))) continue;
      // Dòng tiêu đề phụ ngay bên dưới (VD: "Sổ sách" | "Thực tế" dưới "Số lượng")
      let dataStart = r + 1;
      const sub = ws.getRow(r + 1); const subCols = {};
      sub.eachCell({ includeEmpty: false }, (c, col) => {
        const h = norm(cellValue(c));
        if (match(h, TT)) subCols.tt = col;
        else if (match(h, ['so sach', 'sl so sach'])) subCols.sl = col;
      });
      const dataLike = c => { const v = cellValue(c); return !!str(v) && !isHeaderText(v); };
      const subHasData = (cols.ma && dataLike(sub.getCell(cols.ma))) || dataLike(sub.getCell(cols.ten));
      if ((subCols.tt || subCols.sl) && !subHasData) { Object.assign(cols, subCols); dataStart = r + 2; }
      return { row: r, dataStart, cols };
    }
    return null;
  }

  // Một dòng dữ liệu → {key, stt, ma, ten, ...} thô; {tiepTen} nếu chỉ là phần tên bị xuống dòng của tài sản phía trên;
  // null nếu là dòng trống / dòng TỔNG CỘNG / dòng tiêu đề lặp lại
  const oneLine = s => s.replace(/\s*[\r\n]+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const slash = s => s.replace(/\s*[\r\n]+\s*/g, ' / ').trim();
  function readRow(ws, hm, r) {
    const row = ws.getRow(r); const get = k => (hm.cols[k] ? cellValue(row.getCell(hm.cols[k])) : null);
    const ma = str(get('ma')), ten = oneLine(str(get('ten'))), stt = get('stt');
    const sttN = Number(stt);
    const hasStt = stt != null && str(stt) !== '' && Number.isFinite(sttN);
    if (!ma && !ten) return null;
    if (isHeaderText(ma) || isHeaderText(ten)) return null;                            // tiêu đề lặp
    if (!ma && (!hasStt || /^(tong cong|cong|tong)\b/.test(norm(ten)))) return null;   // dòng tổng
    // Không mã, không số lượng, không nguyên giá, không ngày: phần tên tài sản phía trên bị xuống dòng
    if (!ma && !str(get('sl')) && !str(get('gia')) && !str(get('ngay'))) return { tiepTen: ten, stt: hasStt ? sttN : null, row: r };
    // Khoá ổn định của tài sản: Mã TSCĐ; không có mã thì STT (STT chung cho mọi sheet của biên bản)
    const key = ma ? ma : (hasStt ? `stt:${sttN}` : `khong-ma:${ws.name}:${r}`);
    return { key, ma, ten, stt: hasStt ? sttN : null, sl: get('sl'), ngay: get('ngay'), gia: get('gia'), gc: oneLine(str(get('gc'))), vt: slash(str(get('vt'))), row: r };
  }

  // Sheet gốc: tên có "tổng hợp" (ưu tiên khi các sheet ghi khác nhau)
  const isPrimarySheet = name => /tong hop/.test(norm(name));

  // Sheet lẻ: tài sản chưa rõ vị trí (vì sao kế toán đưa vào sổ, ai mua) — cán bộ phải kiểm trực tiếp, đối chiếu
  // rồi mới phân bổ vào sheet đơn vị. Tài sản có ở nhiều sheet lẻ thì lấy sheet đứng trước trong danh sách này.
  const REVIEW_SHEETS = ['Xem lại phân bổ', 'Xem lại', 'Chưa có ghi chú'];
  const reviewSheet = name => REVIEW_SHEETS.find(s => norm(s) === norm(name)) || '';

  g.KIEMKE_EXCEL = { norm, str, cellValue, headerMap, readRow, isPrimarySheet, REVIEW_SHEETS, reviewSheet };
})(typeof window !== 'undefined' ? window : globalThis);
