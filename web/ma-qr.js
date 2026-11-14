/*
 * Phần "Quản lý mã QR tài sản" của trang Quản lý tài sản (đường dẫn #ma-qr).
 * Ngang hàng với phần "Kiểm kê tài sản 2026" (các trang còn lại trong index.html).
 * Hiện mới là trang giữ chỗ; chức năng sẽ xây ở bước sau, viết trong file này.
 * Dùng chung với index.html: danh sách ASSETS, các hàm banner(), ic(), esc(), nf, biến app.
 */
function viewQR() {
  const coMa = ASSETS.filter(a => a.ma).length;
  const nPhong = Object.values(buildRooms()).filter(r => r.slug !== NOROOM).length;
  app.innerHTML = `${banner('phong-lab', 'Quản lý tài sản', 'Quản lý mã QR tài sản',
    'Nơi quản lý tem mã QR gắn trên từng tài sản của trường.')}
  <div class="qr-wip">
    <span class="qr-ic">${ic('QrCode')}</span>
    <div><b>Phần này đang được xây dựng</b>
      <p>Các chức năng sẽ được thêm vào đây ở bước tiếp theo. Trong lúc chờ, bạn vẫn dùng nút <b>Quét mã</b> trong phần
      <a href="#tong-quan">Kiểm kê tài sản 2026</a> để tra tài sản theo tem.</p></div>
  </div>
  <div class="stitle"><h2>Dữ liệu <strong>đã có sẵn</strong></h2></div>
  <div class="qr-facts">
    <div><small>Dòng tài sản trong sổ</small><b class="num">${nf.format(ASSETS.length)}</b></div>
    <div><small>Có Mã TSCĐ</small><b class="num">${nf.format(coMa)}</b></div>
    <div><small>Phòng, khu vực</small><b class="num">${nf.format(nPhong)}</b></div>
  </div>
  <p class="qr-note">Lấy từ cùng file Excel biên bản mà phần Kiểm kê đang dùng.</p>`;
}
