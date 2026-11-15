/*
 * Đăng nhập GIẢ cho bộ thử giao diện (npm run thu-giao-dien) — chạy trong trình duyệt, KHÔNG gọi Supabase.
 * Có cùng các hàm như cổng Supabase thật trong web/dang-nhap.js (sbCong). Chỉ bật ở trang thử ?dang-nhap và ?dang-nhap-dau.
 * Mật khẩu ở đây là mật khẩu giả của bộ thử, không phải của ai.
 */
if (location.search === '?dang-nhap' || location.search === '?dang-nhap-dau') (function () {
  const tk = location.search === '?dang-nhap-dau' ? [] : [
    { uid: 'u1', ten: 'quantri', ho_ten: 'Quản trị thử', email: 'quantri@vd.vn', mk: 'MatKhauThu#1', quyen: 'admin', khoa: false },
  ];
  const db = [];
  let phien = null, so = 1;
  const loi = m => { throw new Error(m); };
  const tim = id => tk.find(x => x.uid === id);
  window.KIEMKE_AUTH_GIA = {
    gia: true, tk, db,
    async trangThai() { return { da_cai: true, co_quan_tri: tk.some(x => x.quyen === 'admin' && !x.khoa) }; },
    async emailCua(ten) { const x = tk.find(x => x.ten === ten && !x.khoa); return x ? x.email : null; },
    async dangNhap(email, mk) { const x = tk.find(x => x.email === email); if (!x || x.mk !== mk) loi('Invalid login credentials'); phien = x.uid; },
    async toiLaAi() { const x = phien && tim(phien); return x && !x.khoa ? { uid: x.uid, ten: x.ten, ho_ten: x.ho_ten, quyen: x.quyen, email: x.email } : null; },
    async dangXuat() { phien = null; },
    async taoQuanTri(o) {
      if (tk.length) loi('Đã có tài khoản quản trị');
      tk.push({ uid: 'u' + (++so), ten: o.ten, ho_ten: o.hoTen, email: o.email, mk: o.mk, quyen: 'admin', khoa: false }); phien = 'u' + so;
    },
    async doiMatKhau(email, cu, moi) { const x = tim(phien); if (!x || x.mk !== cu) loi('MK_CU'); x.mk = moi; },
    async dsThanhVien() { return tk.map(x => ({ user_id: x.uid, ten_dang_nhap: x.ten, ho_ten: x.ho_ten, quyen: x.quyen, khoa: x.khoa, email: x.email, tao_luc: new Date().toISOString(), dang_nhap_cuoi: null })); },
    async themThanhVien(o) {
      if (tk.some(x => x.ten === o.ten)) loi('duplicate key value violates unique constraint');
      tk.push({ uid: 'u' + (++so), ten: o.ten, ho_ten: o.hoTen, email: o.email, mk: o.mk, quyen: o.quyen, khoa: false }); return { daCo: false };
    },
    async suaThanhVien(uid, o) { Object.assign(tim(uid), o); },
    async datMatKhau(uid, mk) { tim(uid).mk = mk; },
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
