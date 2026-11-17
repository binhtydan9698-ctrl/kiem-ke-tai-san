/*
 * Đăng nhập GIẢ cho bộ thử giao diện (npm run thu-giao-dien) — chạy trong trình duyệt, KHÔNG gọi Supabase.
 * Có cùng các hàm như cổng Supabase thật trong web/dang-nhap.js (sbCong). Chỉ bật ở trang thử ?dang-nhap, ?dang-nhap-dau, ?ma-hoa, ?anh.
 * Mật khẩu, mã xác thực ở đây là của bộ thử, không phải của ai. Mã xác thực 2 bước giả: 246810.
 */
if (['?dang-nhap', '?dang-nhap-dau', '?ma-hoa', '?anh'].includes(location.search)) (function () {
  const tk = location.search === '?dang-nhap-dau' ? [] : [
    { uid: 'u1', ten: 'quantri', ho_ten: 'Quản trị thử', email: 'quantri@vd.vn', mk: 'MatKhauThu#1', quyen: 'admin', khoa: false, mfa: false },
  ].concat(location.search === '?anh' ? [
    { uid: 'u8', ten: 'kiemvien', ho_ten: 'Kiểm Viên Thử', email: 'kiemvien@vd.vn', mk: 'Kiem-vien-thu-1', quyen: 'kiem', khoa: false, mfa: false },
    { uid: 'u9', ten: 'tracuu', ho_ten: 'Tra Cứu Thử', email: 'tracuu@vd.vn', mk: 'Tra-cuu-thu-01', quyen: 'xem', khoa: false, mfa: false },
  ] : []);
  const kho = new Map();   // kho ảnh giả: đường dẫn → ảnh
  const db = [], MA = '246810';
  let phien = null, aal2 = false, so = 1;
  const loi = m => { throw new Error(m); };
  const tim = id => tk.find(x => x.uid === id);
  window.KIEMKE_AUTH_GIA = {
    gia: true, tk, db,
    async trangThai() { return { da_cai: true, co_quan_tri: tk.some(x => x.quyen === 'admin' && !x.khoa) }; },
    async emailCua(ten) { const x = tk.find(x => x.ten === ten && !x.khoa); return x ? x.email : null; },
    async dangNhap(email, mk) { const x = tk.find(x => x.email === email); if (!x || x.mk !== mk) loi('Invalid login credentials'); phien = x.uid; aal2 = false; },
    async coPhien() { return !!phien; },
    async toiLaAi() { const x = phien && tim(phien); return x && !x.khoa ? { uid: x.uid, ten: x.ten, ho_ten: x.ho_ten, quyen: x.quyen, email: x.email, doi_mk: !!x.doi } : null; },
    async dangXuat() { phien = null; aal2 = false; },
    async taoQuanTri(o) {
      if (tk.length) loi('Đã có tài khoản quản trị');
      tk.push({ uid: 'u' + (++so), ten: o.ten, ho_ten: o.hoTen, email: o.email, mk: o.mk, quyen: 'admin', khoa: false, mfa: false }); phien = 'u' + so;
    },
    async doiMatKhau(email, cu, moi) { const x = tim(phien); if (!x || x.mk !== cu) loi('MK_CU'); x.mk = moi; x.doi = false; },
    // giống Supabase: mật khẩu mới trùng mật khẩu cũ thì báo lỗi; đổi xong thì hết "mật khẩu ban đầu" (dang-nhap.sql: con_mk_ban_dau)
    async doiMkDau(moi) { const x = tim(phien); if (!x) loi('Chưa đăng nhập'); if (x.mk === moi) loi('New password should be different from the old password.'); x.mk = moi; x.doi = false; },
    async dsThanhVien() { return tk.map(x => ({ user_id: x.uid, ten_dang_nhap: x.ten, ho_ten: x.ho_ten, quyen: x.quyen, khoa: x.khoa, email: x.email, tao_luc: new Date().toISOString(), dang_nhap_cuoi: null })); },
    async themThanhVien(o) {
      if (tk.some(x => x.ten === o.ten)) loi('duplicate key value violates unique constraint');
      tk.push({ uid: 'u' + (++so), ten: o.ten, ho_ten: o.hoTen, email: o.email, mk: o.mk, quyen: o.quyen, khoa: false, mfa: false, doi: true }); return { daCo: false };
    },
    async suaThanhVien(uid, o) { Object.assign(tim(uid), o); },
    async datMatKhau(uid, mk) { if (mk.length < 12) loi('Mật khẩu cần 12–72 ký tự'); tim(uid).mk = mk; tim(uid).doi = true; },
    async khoaDuLieu() { const x = phien && tim(phien); return x && !x.khoa && (!x.mfa || aal2) ? (window.__KHOA_THU || null) : null; },
    async canMa2() { const x = phien && tim(phien); return !!(x && x.mfa && !aal2); },
    async xacThuc2(code) { if (code !== MA) loi('Invalid TOTP code entered'); aal2 = true; },
    async dsYeuTo() { const x = phien && tim(phien); return x && x.mfa ? [{ id: 'f-' + x.uid, status: 'verified' }] : []; },
    async batMfa() { return { id: 'f-moi', qr: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="21" height="21"><rect width="21" height="21" fill="#000"/></svg>'), secret: 'JBSWY3DPEHPK3PXP' }; },
    async xacNhanMfa(id, code) { if (code !== MA) loi('Invalid TOTP code entered'); tim(phien).mfa = true; aal2 = true; },
    async tatMfa() { tim(phien).mfa = false; },
    anh: {
      async tai(p, blob) { const x = tim(phien); if (!x || !['admin', 'kiem'].includes(x.quyen)) loi('new row violates row-level security policy'); if (kho.has(p)) loi('The resource already exists'); kho.set(p, blob); },
      async url(ps) { const m = {}; ps.forEach(p => { if (kho.has(p)) m[p] = URL.createObjectURL(kho.get(p)); }); return m; },
      async xoa(ps) { const x = tim(phien); if (!x || !['admin', 'kiem'].includes(x.quyen)) loi('new row violates row-level security policy'); ps.forEach(p => kho.delete(p)); },
    },
    kho,
    danhBa: {
      async ds() { return db.map(r => Object.assign({}, r)); },
      async luu(r) {
        const x = tim(phien); if (!x || !['admin', 'sua'].includes(x.quyen)) loi('new row violates row-level security policy');
        const c = Object.assign({}, r, { id: r.id || 'd' + (++so) }), i = db.findIndex(y => y.id === c.id);
        if (i >= 0) db[i] = c; else db.push(c); return Object.assign({}, c);
      },
      async xoa(id) { const i = db.findIndex(y => y.id === id); if (i >= 0) db.splice(i, 1); },
    },
  };
})();
