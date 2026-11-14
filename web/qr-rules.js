/*
 * Quy tắc mã QR trên tem tài sản — DÙNG CHUNG cho trang web (ma-qr.js, nút Quét mã) và scripts/kiem-tra.mjs (Node).
 * Chỉ gắn vào globalThis.KIEMKE_QR, không dùng DOM.
 *
 * Nội dung mã QR (chọn khi in tem):
 *   'link' (mặc định): https://kiem-ke-tai-san-sigma.vercel.app/#ts-<khoá>
 *          → quét bằng nút Quét mã của app: mở thẳng tài sản; quét bằng camera điện thoại thường: mở web đúng tài sản.
 *   'ma':  chỉ <khoá> (= Mã TSCĐ) → mã QR nhỏ gọn hơn, chỉ nút Quét mã của app hiểu.
 * <khoá> là a.key (= Mã TSCĐ), đúng khoá lưu kết quả trên Supabase. Đổi cách tạo khoá thì tem đã in sẽ không còn khớp.
 */
(function (g) {
  const WEB = 'https://kiem-ke-tai-san-sigma.vercel.app/';
  const PRE = 'ts-';

  function payload(key, kieu) {
    const k = String(key);
    return kieu === 'ma' ? k : WEB + '#' + PRE + encodeURIComponent(k);
  }

  // Nội dung quét được → khoá tài sản nếu đó là tem của app (dạng link, tên miền nào cũng nhận), ngược lại null.
  // Tem dạng 'ma' (chỉ Mã TSCĐ) trả null ở đây: trang tự so khớp đúng nguyên văn với Mã TSCĐ.
  function parse(text) {
    const t = String(text == null ? '' : text).trim();
    const m = /^https?:\/\/[^#\s]*#ts-([^#?&\s/]+)$/i.exec(t);
    if (!m) return null;
    try { const k = decodeURIComponent(m[1]); return k ? k : null; } catch (e) { return null; }
  }

  g.KIEMKE_QR = { WEB, PRE, payload, parse };
})(typeof globalThis !== 'undefined' ? globalThis : window);
