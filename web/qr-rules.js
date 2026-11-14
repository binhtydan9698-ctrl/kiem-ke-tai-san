/*
 * Quy tắc mã QR trên tem tài sản — DÙNG CHUNG cho trang web (ma-qr.js, nút Quét mã) và scripts/kiem-tra.mjs (Node).
 * Chỉ gắn vào globalThis.KIEMKE_QR, không dùng DOM.
 *
 * QUY TẮC: mỗi mã QR là đường link mở thẳng trang của đúng một tài sản trong phần Kiểm kê:
 *   https://kiem-ke-tai-san-sigma.vercel.app/#ts-<khoá>
 *   → quét bằng nút Quét mã của app hay camera điện thoại thường đều mở đúng tài sản.
 * <khoá> là a.key (= Mã TSCĐ), đúng khoá lưu kết quả trên Supabase và khoá của Sổ mã QR (scripts/so-ma-qr.mjs):
 * mã đã cấp không cấp lại cho tài sản khác; tài sản bị xoá khỏi file BBKK vẫn giữ trong sổ.
 * Đổi dạng link hoặc cách tạo khoá thì tem đã in sẽ không còn khớp.
 */
(function (g) {
  const WEB = 'https://kiem-ke-tai-san-sigma.vercel.app/';
  const PRE = 'ts-';

  function payload(key) {
    return WEB + '#' + PRE + encodeURIComponent(String(key));
  }

  // Nội dung quét được → khoá tài sản nếu đó là tem của app (dạng link, tên miền nào cũng nhận), ngược lại null.
  // Nội dung chỉ là Mã TSCĐ (gõ tay, mã vạch cũ) trả null ở đây: trang tự so khớp đúng nguyên văn với Mã TSCĐ.
  function parse(text) {
    const t = String(text == null ? '' : text).trim();
    const m = /^https?:\/\/[^#\s]*#ts-([^#?&\s/]+)$/i.exec(t);
    if (!m) return null;
    try { const k = decodeURIComponent(m[1]); return k ? k : null; } catch (e) { return null; }
  }

  g.KIEMKE_QR = { WEB, PRE, payload, parse };
})(typeof globalThis !== 'undefined' ? globalThis : window);
