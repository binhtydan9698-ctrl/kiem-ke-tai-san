/* Đăng nhập (Supabase Auth), nạp dữ liệu và Chung › Quản lý — theo bộ quy tắc BAO-MAT.md (người dùng yêu cầu 15/11/2026).
   - Bật bằng supabase/dang-nhap.sql. Chưa chạy SQL đó (DN.cai=false): trang chạy như cũ, ai có đường link đều dùng được.
   - Đã bật: mở trang phải đăng nhập (tên đăng nhập + mật khẩu [+ mã xác thực 2 bước nếu đã bật]); dữ liệu chỉ thành viên
     đọc/ghi được (RLS trên Supabase). Lần đầu (chưa có thành viên nào): màn hình "Tạo tài khoản quản trị".
   - Quyền (người dùng chốt 15/11/2026): xem = Tra cứu (chỉ xem; trang bật chế độ chỉ xem) · kiem = Kiểm kê (xem + ghi kết quả
     kiểm kê) · admin = Quản trị (toàn quyền; BẮT BUỘC xác thực 2 bước: chưa bật thì phải bật ngay sau mật khẩu, máy chủ chỉ cho
     toàn quyền khi phiên đã qua bước 2). Người dùng khác chỉ cần mật khẩu.
   - Nạp dữ liệu (napVaChay): mã chính của trang (<script type="text/plain" id="kiemke-app">) chỉ chạy sau khi có dữ liệu tài sản.
     data/version.json có ma_hoa=true (build có khoá KIEMKE_KHOA_DU_LIEU) → phải đăng nhập, lấy khoá qua khoa_du_lieu(), giải mã
     data/*.enc (AES-256-GCM) rồi mới chạy; người ngoài tải file .enc cũng không đọc được.
   - KHÔNG bao giờ ghi mật khẩu / khoá vào mã nguồn, lịch sử, thông báo. Mật khẩu do Supabase Auth giữ (đã băm).
   - Bộ thử giao diện thay cổng Supabase bằng window.KIEMKE_AUTH_GIA (scripts/thu-dang-nhap-gia.js, cùng tên hàm như sbCong()).
   File nạp trong <head>: chỉ dùng app, render()… của index.html khi mã chính đã chạy. */
(function () {
  const g = window;
  g.QUYEN_TK = [['xem', 'Tra cứu (chỉ xem)'], ['kiem', 'Kiểm kê (xem + ghi kết quả kiểm)'], ['admin', 'Quản trị (toàn quyền, bắt buộc 2 lớp)']];
  const DN = g.DN = { cai: false, toi: null, api: null, coQuanTri: true, maHoa: false, tv: null, tvTai: false, tvLoi: '', db: { ds: [], tai: false, loi: '' }, mfa: null };
  const QLV = { mk: '', mfaMoi: null };   // đang đặt lại mật khẩu cho thành viên nào; đang bật xác thực 2 bước
  const NHAN_ROI_GIO = 8;                 // không dùng trang quá 8 giờ → tự đăng xuất (máy dùng chung)
  const SAI_TOI_DA = 5, CHO_GIAY = 60;    // nhập sai 5 lần → chờ 60 giây
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { } }, del: k => { try { sessionStorage.removeItem(k); } catch (e) { } } };

  // lỗi → câu dễ hiểu
  function viLoi(e) {
    const m = String(e && (e.message || e.error_description || e) || '');
    if (/Invalid login credentials/i.test(m)) return 'Sai tên đăng nhập hoặc mật khẩu.';
    if (/Invalid TOTP|invalid.*code|MFA|Mã xác thực/i.test(m)) return 'Mã xác thực không đúng hoặc đã hết hạn (mã đổi sau mỗi 30 giây).';
    if (/Email not confirmed/i.test(m)) return 'Tài khoản chưa được xác nhận email. Người quản trị cần tắt “Confirm email” trong Supabase (Authentication → Sign In / Providers → Email) rồi thử lại.';
    if (/already registered|already exists|User already/i.test(m)) return 'Email này đã có tài khoản.';
    if (/ten_dang_nhap_check/i.test(m)) return 'Tên đăng nhập chỉ gồm chữ thường không dấu, số, dấu chấm, gạch dưới, gạch ngang (3–40 ký tự).';
    if (/duplicate key|unique/i.test(m)) return 'Tên đăng nhập này đã có người dùng.';
    if (/Signups not allowed|signup.*disabled/i.test(m)) return 'Supabase đang tắt đăng ký tài khoản mới. Người quản trị bật “Allow new users to sign up” trong Supabase (tắt lại sau khi thêm xong).';
    if (/rate limit|only request this after|too many/i.test(m)) return 'Thao tác quá nhiều lần, thử lại sau ít phút.';
    if (/different from the old password|same_password/i.test(m)) return 'Mật khẩu mới phải khác mật khẩu ban đầu.';
    if (/CAN_2_LOP/.test(m)) return 'Chỉ quản trị đã đăng nhập bằng mã 6 số mới đổi được mục này.';
    if (/Could not find the function|PGRST202/i.test(m)) return 'Máy chủ chưa cập nhật: người quản trị cần chạy lại file supabase/dang-nhap.sql (bản mới nhất) trong Supabase → SQL Editor.';
    if (/reauthenticat/i.test(m)) return 'Cần đăng nhập lại rồi mới đổi được mật khẩu: bấm “Đăng xuất”, đăng nhập lại rồi đổi ngay.';
    if (/Password should|weak password|pwned|leaked/i.test(m)) return 'Mật khẩu chưa đủ mạnh hoặc đã từng bị lộ trên mạng. Chọn mật khẩu khác (ít nhất 12 ký tự).';
    if (/Failed to fetch|NetworkError|network|fetch failed/i.test(m)) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
    return m || 'Có lỗi, thử lại.';
  }
  g.dnLoi = viLoi;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, TEN = /^[a-z0-9._-]{3,40}$/;

  /* ---------- chính sách mật khẩu (BAO-MAT.md mục C) ---------- */
  const PHO_BIEN = ['password', 'matkhau', 'matkhaucuatoi', '123456', '12345678', '123456789', '1234567890', '123456789012', 'qwerty', 'qwertyuiop', 'abc123', '111111', 'iloveyou', 'admin', 'administrator',
    'fpt', 'fptu', 'fpt123', 'fptuniversity', 'fptdanang', 'fptudn', 'quanlytaisan', 'kiemke', 'kiemketaisan', 'hanhchinh', 'phonghanhchinh'];
  const gon = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
  // o.banDau: mật khẩu BAN ĐẦU quản trị đặt cho thành viên (Thêm thành viên, Đặt lại mật khẩu) — người dùng cho phép 17/11/2026 chỉ
  // gồm chữ số và lặp lại ký tự (dễ đọc cho người nhận). Mật khẩu tự đặt (tạo quản trị lần đầu, Đổi mật khẩu) vẫn kiểm đủ.
  DN.kiemTraMatKhau = function (mk, o) {
    o = o || {}; mk = String(mk || '');
    if (mk.length < 12) return 'Mật khẩu cần ít nhất 12 ký tự. Nên dùng một câu dễ nhớ, vd. “Kiem ke tai san nam 2027!”.';
    if (mk.length > 72) return 'Mật khẩu dài quá 72 ký tự.';
    if (!o.banDau && (/^\d+$/.test(mk) || /^(.)\1+$/.test(mk))) return 'Mật khẩu không được chỉ gồm chữ số hoặc một ký tự lặp lại.';
    const t = gon(mk);
    for (const w of [o.ten, String(o.email || '').split('@')[0], o.hoTen].map(gon).filter(x => x.length >= 3)) if (t.includes(w)) return 'Mật khẩu không được chứa tên đăng nhập, email hay họ tên.';
    if (PHO_BIEN.some(w => t === w || (w.length >= 6 && t.startsWith(w) && t.length - w.length <= 4))) return 'Mật khẩu này quá phổ biến, dễ đoán. Chọn mật khẩu khác.';
    return '';
  };
  // cảnh báo (không chặn): có ngày tháng dạng ngày sinh
  DN.canhBaoMatKhau = mk => /(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(19|20)\d\d|(19|20)\d\d(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/.test(String(mk || '').replace(/[^\d]/g, '')) ? 'Mật khẩu có ngày tháng (vd. ngày sinh) nên dễ đoán hơn. Bấm lại để vẫn dùng, hoặc chọn mật khẩu khác.' : '';
  const thietBi = () => {
    const u = navigator.userAgent || '';
    const os = /Android/i.test(u) ? 'Android' : /iPhone/i.test(u) ? 'iPhone' : /iPad/i.test(u) ? 'iPad' : /Windows/i.test(u) ? 'Windows' : /Mac OS/i.test(u) ? 'Mac' : /Linux/i.test(u) ? 'Linux' : 'Thiết bị khác';
    const tr = /Edg\//.test(u) ? 'Edge' : /coc_coc|CocCoc/i.test(u) ? 'Cốc Cốc' : /Firefox\//.test(u) ? 'Firefox' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : 'trình duyệt khác';
    return `${os} · ${tr}`;
  };

  // cổng Supabase thật (một kết nối dùng chung, giữ phiên trên máy — web/supabase-db.js)
  function sbCong() {
    const sb = g.kiemkeSupabase && g.kiemkeSupabase(); if (!sb) return null;
    const cfg = g.KIEMKE_SUPABASE;
    const rpc = async (f, a) => { const { data, error } = await sb.rpc(f, a || {}); if (error) throw error; return data; };
    const chk = r => { if (r && r.error) throw r.error; return r ? r.data : null; };
    return {
      async trangThai() {
        const { data, error } = await sb.rpc('trang_thai_dang_nhap');
        if (error) { if (error.code === 'PGRST202' || /Could not find the function/i.test(error.message || '')) return { da_cai: false }; throw error; }
        return data || { da_cai: false };
      },
      emailCua: ten => rpc('email_dang_nhap', { p_ten: ten }),
      async dangNhap(email, mk) { const { error } = await sb.auth.signInWithPassword({ email, password: mk }); if (error) throw error; },
      async coPhien() { const { data } = await sb.auth.getSession(); return !!(data && data.session); },
      async toiLaAi() { const { data } = await sb.auth.getSession(); if (!data || !data.session) return null; return rpc('toi_la_ai'); },
      async dangXuat(phamVi) { await sb.auth.signOut(phamVi === 'global' ? { scope: 'global' } : undefined); },
      async taoQuanTri(o) {
        const { data, error } = await sb.auth.signUp({ email: o.email, password: o.mk });
        if (error) throw error;
        if (!data.session) throw new Error('Email not confirmed');
        await rpc('nhan_quan_tri_dau_tien', { p_ten: o.ten, p_ho_ten: o.hoTen });
      },
      async doiMatKhau(email, cu, moi) {
        const r = await sb.auth.signInWithPassword({ email, password: cu });
        if (r.error) throw new Error('MK_CU');
        const { error } = await sb.auth.updateUser({ password: moi }); if (error) throw error;
      },
      dsThanhVien: () => rpc('ds_thanh_vien'),
      async themThanhVien(o) {
        // tạo tài khoản bằng một kết nối riêng (không đổi phiên đăng nhập của quản trị), rồi cấp quyền
        const sb2 = g.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'kiemke-tao-tk' } });
        const { error } = await sb2.auth.signUp({ email: o.email, password: o.mk });
        let daCo = false;
        if (error) { if (/already registered|already exists/i.test(error.message || '')) daCo = true; else throw error; }
        // tài khoản mới (mật khẩu ban đầu quản trị vừa đặt) → lần đăng nhập đầu phải đổi; email đã có tài khoản thì giữ mật khẩu cũ
        await rpc('quan_tri_them_thanh_vien', { p_email: o.email, p_ten: o.ten, p_ho_ten: o.hoTen, p_quyen: o.quyen, p_mk_moi: !daCo });
        return { daCo };
      },
      // lần đăng nhập đầu bằng mật khẩu ban đầu: tự đặt mật khẩu riêng (vừa đăng nhập xong nên không hỏi lại mật khẩu cũ)
      async doiMkDau(moi) { const { error } = await sb.auth.updateUser({ password: moi }); if (error) throw error; },
      async suaThanhVien(uid, o) { const { error } = await sb.from('thanh_vien').update(o).eq('user_id', uid); if (error) throw error; },
      datMien2Lop: (uid, mien) => rpc('quan_tri_dat_mien_2_lop', { p_uid: uid, p_mien: !!mien }),
      datMatKhau: (uid, mk) => rpc('quan_tri_dat_mat_khau', { p_uid: uid, p_mat_khau: mk }),
      khoaDuLieu: () => rpc('khoa_du_lieu'),
      // xác thực 2 bước (TOTP: Google Authenticator, Microsoft Authenticator…)
      async canMa2() { const d = chk(await sb.auth.mfa.getAuthenticatorAssuranceLevel()); return !!(d && d.nextLevel === 'aal2' && d.currentLevel !== 'aal2'); },
      async xacThuc2(code) {
        const f = chk(await sb.auth.mfa.listFactors()), tt = (f && f.totp) || [];
        if (!tt.length) throw new Error('Chưa bật xác thực 2 bước');
        chk(await sb.auth.mfa.challengeAndVerify({ factorId: tt[0].id, code }));
      },
      async dsYeuTo() { const f = chk(await sb.auth.mfa.listFactors()); return ((f && f.totp) || []).map(x => ({ id: x.id, status: x.status })); },
      async batMfa() {
        const f = chk(await sb.auth.mfa.listFactors());
        for (const x of ((f && f.all) || []).filter(x => x.status !== 'verified')) await sb.auth.mfa.unenroll({ factorId: x.id });   // bỏ lần bật dở
        const d = chk(await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Quản lý tài sản ' + Date.now() }));
        return { id: d.id, qr: d.totp.qr_code, secret: d.totp.secret };
      },
      async xacNhanMfa(id, code) { chk(await sb.auth.mfa.challengeAndVerify({ factorId: id, code })); },
      async tatMfa(id) { chk(await sb.auth.mfa.unenroll({ factorId: id })); },
      danhBa: {
        async ds() { const { data, error } = await sb.from('danh_ba').select('*').order('ho_ten'); if (error) throw error; return data || []; },
        async luu(r) { const { data, error } = await sb.from('danh_ba').upsert(r).select().single(); if (error) throw error; return data; },
        async xoa(id) { const { error } = await sb.from('danh_ba').delete().eq('id', id); if (error) throw error; },
      },
      // kho ảnh riêng tư (Supabase Storage "anh-tai-san", anh.js): tải lên, lấy đường dẫn có hạn 1 giờ, xoá
      anh: {
        async tai(p, blob) { const { error } = await sb.storage.from('anh-tai-san').upload(p, blob, { contentType: 'image/jpeg', upsert: false, cacheControl: '3600' }); if (error) throw error; },
        async url(ps) {
          const { data, error } = await sb.storage.from('anh-tai-san').createSignedUrls(ps, 3600); if (error) throw error;
          const m = {}; (data || []).forEach(x => { if (x && x.signedUrl) m[x.path] = x.signedUrl; }); return m;
        },
        async xoa(ps) { const { error } = await sb.storage.from('anh-tai-san').remove(ps); if (error) throw error; },
      },
      theoDoi(f) { sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') f(); }); },
    };
  }

  DN.laQuanTri = () => !!(DN.toi && DN.toi.quyen === 'admin');
  DN.duocSuaDanhBa = () => DN.laQuanTri();   // danh bạ, đầu mối: chỉ quản trị sửa
  DN.duocKiemKe = () => !!(DN.toi && ['admin', 'kiem'].includes(DN.toi.quyen));

  /* ---------- nạp dữ liệu rồi mới chạy mã chính ---------- */
  const napScript = src => new Promise((ok, loi) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => loi(new Error('Không tải được ' + src)); document.head.appendChild(s); });
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function napVaChay() {
    const m = document.getElementById('kiemke-app'); if (!m || m.dataset.chay) return;
    m.dataset.chay = '1';
    let ver = {};
    try { const r = await fetch('data/version.json', { cache: 'no-store' }); if (r.ok) ver = await r.json(); } catch (e) { }
    DN.maHoa = !!ver.ma_hoa;
    try {
      if (!DN.maHoa) { await napScript('data/assets.js'); await napScript('data/so-ma-qr.js'); }
      else {
        // dữ liệu đã mã hoá: đăng nhập trước, lấy khoá (chỉ thành viên), giải mã
        await new Promise(xong => DN.batDau(xong));
        if (!DN.cai || !DN.toi) throw new Error('Dữ liệu tài sản đã được khoá nhưng Supabase chưa bật đăng nhập. Người quản trị chạy supabase/dang-nhap.sql.');
        const k = await DN.api.khoaDuLieu();
        if (!k) throw new Error('Không lấy được khoá dữ liệu (tài khoản chưa có quyền).');
        const key = await crypto.subtle.importKey('raw', b64(k), 'AES-GCM', false, ['decrypt']);
        const giai = async p => {
          const r = await fetch(p, { cache: 'no-store' }); if (!r.ok) throw new Error('Không tải được ' + p);
          const b = new Uint8Array(await r.arrayBuffer());
          try { return await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, key, b.slice(12)); }
          catch (e) { throw new Error('Không giải mã được dữ liệu: khoá trên Vercel (KIEMKE_KHOA_DU_LIEU) khác khoá trên Supabase. Người quản trị xem Chung › Quản lý › Khoá dữ liệu tài sản.'); }
        };
        const td = new TextDecoder();
        g.KIEMKE_DATA = JSON.parse(td.decode(await giai('data/assets.enc')));
        g.KIEMKE_SO_QR = JSON.parse(td.decode(await giai('data/so-ma-qr.enc')));
        g.kiemkeTepGoc = () => giai('data/goc.xlsx.enc');
      }
      if (g.kiemkeSauKhiNap) g.kiemkeSauKhiNap();   // móc cho bộ thử giao diện
    } catch (e) { manLoi(viLoi(e)); return; }
    const s = document.createElement('script'); s.textContent = m.textContent; document.body.appendChild(s);   // CSP cho phép đúng khối này (dấu băm)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', napVaChay); else setTimeout(napVaChay, 0);

  /* ---------- vào trang ---------- */
  DN.batDau = async function (tiep) {
    if (DN.cai && DN.toi) { tiep(); return; }   // đã đăng nhập lúc nạp dữ liệu mã hoá
    DN.tiep = tiep;
    DN.api = DN.api || g.KIEMKE_AUTH_GIA || sbCong();
    if (!DN.api) { DN.tiep = null; tiep(); return; }
    let tt;
    try { tt = await DN.api.trangThai(); }
    catch (e) { manLoi(viLoi(e)); return; }
    if (!tt || !tt.da_cai) { DN.cai = false; DN.tiep = null; tiep(); return; }   // chưa bật đăng nhập: chạy như cũ
    DN.cai = true; DN.coQuanTri = !!tt.co_quan_tri;
    const tb = ss.get('kiemke-thong-bao'); ss.del('kiemke-thong-bao');
    try {
      if (await phienSan()) {
        if (nhanRoiQua()) { await DN.api.dangXuat(); hienMan('Bạn đã được đăng xuất vì không dùng trang hơn ' + NHAN_ROI_GIO + ' giờ. Đăng nhập lại.'); return; }
        if (await hoanTat(false)) return;
      }
    } catch (e) { }
    hienMan(tb || '');
  };
  const phienSan = async () => DN.api.coPhien ? DN.api.coPhien() : !!(await DN.api.toiLaAi());
  function vao(t, moi) {
    DN.toi = { uid: t.uid, ten: t.ten, hoTen: t.ho_ten || '', quyen: t.quyen, email: t.email || '', mien: !!t.mien_2_lop };
    DN.coQuanTri = true; DN.tv = null; DN.tvLoi = ''; DN.mfa = null;
    if (moi) DN.vuaDangNhap = thietBi();
    ghiHoatDong(true); theoDoiNhanRoi();
    document.body.classList.remove('dn-cho');
    const m = document.getElementById('dnMan'); if (m) m.remove();
    if (DN.api.theoDoi && !DN.theo) { DN.theo = true; DN.api.theoDoi(() => { if (DN.toi && !DN.dangRa) location.reload(); }); }
    if (DN.tiep) { const f = DN.tiep; DN.tiep = null; f(); }
    else { ME = DN.toi.hoTen || DN.toi.ten; READONLY = !DN.duocKiemKe(); document.body.classList.toggle('ro', READONLY); showMe(); render(); DN.ghiDangNhap(); }
    DN.taiDanhBa();
  }
  // ghi "Đăng nhập" vào Lịch sử (gọi sau khi trang đã sẵn sàng ghi)
  DN.ghiDangNhap = function () {
    if (!DN.vuaDangNhap || typeof logEvent !== 'function') return;
    const tb = DN.vuaDangNhap; DN.vuaDangNhap = null;
    try { logEvent({ kind: 'chung', title: 'Đăng nhập', lines: [tb] }); } catch (e) { }
    if (DN.doiMkLanDau) { DN.doiMkLanDau = false; try { logEvent({ kind: 'chung', title: 'Đổi mật khẩu ban đầu (bắt buộc ở lần đăng nhập đầu)', lines: [] }); } catch (e) { } }
    if (DN.batMfaLanDau) { DN.batMfaLanDau = false; try { logEvent({ kind: 'chung', title: 'Bật xác thực 2 bước (bắt buộc với quản trị)', lines: [] }); } catch (e) { } }
  };
  DN.dangXuat = async function (phamVi, thongBao) {
    DN.dangRa = true;
    try { if (typeof logEvent === 'function' && DN.toi) logEvent({ kind: 'chung', title: phamVi === 'global' ? 'Đăng xuất trên mọi thiết bị' : 'Đăng xuất', lines: [thietBi()] }); } catch (e) { }
    if (!DN.api.gia) await new Promise(r => setTimeout(r, 400));   // để dòng lịch sử kịp ghi
    try { await DN.api.dangXuat(phamVi); } catch (e) { }
    if (DN.api.gia) { DN.toi = null; DN.dangRa = false; DN.db = { ds: [], tai: false, loi: '' }; hienMan(thongBao || ''); return; }
    if (thongBao) ss.set('kiemke-thong-bao', thongBao);
    location.reload();
  };
  DN.taiDanhBa = async function () {
    if (!DN.cai || !DN.toi || !DN.api || !DN.api.danhBa) return;
    try { DN.db.ds = await DN.api.danhBa.ds(); DN.db.tai = true; DN.db.loi = ''; }
    catch (e) { DN.db.loi = viLoi(e); DN.db.tai = true; }
    if (typeof V !== 'undefined' && ['danhba', 'ts', 'unit', 'lylich', 'xm', 'daumoi'].includes(V.type) && !busyEditing()) render();
  };

  /* ---------- tự đăng xuất khi không dùng lâu (máy dùng chung) ---------- */
  const HD = 'kiemke-hoat-dong';
  function ghiHoatDong(ngay) { const now = Date.now(); if (ngay || now - (ghiHoatDong.t || 0) > 60000) { ghiHoatDong.t = now; ls.set(HD, String(now)); } }
  const nhanRoiQua = now => { const t = +ls.get(HD) || 0; return !!t && (now || Date.now()) - t > NHAN_ROI_GIO * 3600e3; };
  DN.nhanRoiQua = nhanRoiQua;
  DN.kiemTraNhanRoi = function (now) { if (DN.toi && nhanRoiQua(now)) { DN.dangXuat('', 'Bạn đã được đăng xuất vì không dùng trang hơn ' + NHAN_ROI_GIO + ' giờ. Đăng nhập lại.'); return true; } return false; };
  function theoDoiNhanRoi() {
    if (theoDoiNhanRoi.ok) return; theoDoiNhanRoi.ok = true;
    ['click', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { if (DN.toi && !nhanRoiQua()) ghiHoatDong(); }, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') DN.kiemTraNhanRoi(); });
    setInterval(() => DN.kiemTraNhanRoi(), 5 * 60000);
  }

  /* ---------- màn hình đăng nhập / tạo tài khoản quản trị đầu tiên / mã xác thực 2 bước ---------- */
  const fld = (id, nhan, type, ac, ph) => `<div class="dn-f"><label for="${id}">${nhan}</label><input class="in" id="${id}" type="${type}" autocomplete="${ac}"${ph ? ` placeholder="${E(ph)}"` : ''}${type === 'text' ? ' autocapitalize="none" spellcheck="false"' : ''}${type === 'text' && ac === 'one-time-code' ? ' inputmode="numeric" maxlength="6"' : ''}></div>`;
  function khung(noiDung) {
    document.body.classList.add('dn-cho');
    let m = document.getElementById('dnMan');
    if (!m) { m = document.createElement('div'); m.id = 'dnMan'; m.className = 'dn-man'; document.body.appendChild(m); }
    m.innerHTML = `<div class="dn-the"><img class="dn-logo" src="img/logo-fpt-university.png" alt="FPT Education · FPT University" width="960" height="375">
      <h1>Quản lý tài sản</h1><p class="dn-sub">Phòng Hành chính · FPTU Đà Nẵng</p>${noiDung}</div>`;
    return m;
  }
  function manLoi(msg) {
    const m = khung(`<p class="dn-loi" role="alert">${E(msg)}</p><button type="button" class="btn pri dn-nut" id="dnLai">Thử lại</button>`);
    m.querySelector('#dnLai').addEventListener('click', () => location.reload());
  }
  const sai = { doc: () => { try { return JSON.parse(ss.get('kiemke-sai') || '{}'); } catch (e) { return {}; } }, ghi: o => ss.set('kiemke-sai', JSON.stringify(o)) };
  function hienMan(thongBao) {
    const dau = !DN.coQuanTri, nho = ls.get('kiemke-nho') !== '0';
    const m = khung(`<form id="dnForm" novalidate>
      ${dau ? `<div class="dn-dau"><b>Tạo tài khoản quản trị (lần đầu)</b><span>Chưa có tài khoản nào. Tài khoản này có toàn quyền: tạo, khoá tài khoản thành viên, đặt quyền, đặt lại mật khẩu.</span></div>
        ${fld('dnTen', 'Tên đăng nhập', 'text', 'username', 'chữ thường không dấu, vd. nguyenvana')}${fld('dnHoTen', 'Họ tên', 'text', 'name', '')}
        ${fld('dnEmail', 'Email công việc', 'email', 'email', 'ten@fe.edu.vn')}${fld('dnMk', 'Mật khẩu (ít nhất 12 ký tự)', 'password', 'new-password', '')}
        ${fld('dnMk2', 'Nhập lại mật khẩu', 'password', 'new-password', '')}`
      : `${fld('dnTen', 'Tên đăng nhập', 'text', 'username', '')}${fld('dnMk', 'Mật khẩu', 'password', 'current-password', '')}`}
      <label class="dn-hien"><input type="checkbox" id="dnHien"> Hiện mật khẩu</label>
      ${dau ? '' : `<label class="dn-hien"><input type="checkbox" id="dnNho"${nho ? ' checked' : ''}> Ghi nhớ đăng nhập trên máy này <small>(bỏ chọn nếu là máy dùng chung)</small></label>`}
      <p class="dn-loi" id="dnLoi" role="alert">${thongBao ? E(thongBao) : ''}</p>
      <button type="submit" class="btn pri dn-nut" id="dnNut">${dau ? 'Tạo tài khoản và vào trang' : 'Đăng nhập'}</button>
      ${dau ? '' : '<p class="dn-goi">Quên mật khẩu: nhờ người quản trị đặt lại trong Chung › Quản lý.</p>'}
    </form>`);
    const f = m.querySelector('#dnForm');
    m.querySelector('#dnHien').addEventListener('change', e => m.querySelectorAll('#dnMk,#dnMk2').forEach(i => { i.type = e.target.checked ? 'text' : 'password'; }));
    let daCanhBao = '';
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const v = id => (document.getElementById(id)?.value || '').trim(), loi = t => { document.getElementById('dnLoi').textContent = t; };
      const nut = document.getElementById('dnNut'), cu = nut.textContent;
      const s0 = sai.doc(); if (s0.den && Date.now() < s0.den) { loi(`Nhập sai quá ${SAI_TOI_DA} lần. Thử lại sau ${Math.ceil((s0.den - Date.now()) / 1000)} giây.`); return; }
      nut.disabled = true; nut.textContent = 'Đang xử lý…'; loi('');
      try {
        if (dau) {
          const ten = v('dnTen').toLowerCase(), hoTen = v('dnHoTen').replace(/\s+/g, ' '), email = v('dnEmail').toLowerCase(), mk = document.getElementById('dnMk').value, mk2 = document.getElementById('dnMk2').value;
          if (!TEN.test(ten)) throw new Error('ten_dang_nhap_check');
          if (!hoTen) throw new Error('Nhập họ tên.');
          if (!EMAIL.test(email)) throw new Error('Email chưa đúng dạng, vd. ten@fe.edu.vn');
          const ly = DN.kiemTraMatKhau(mk, { ten, email, hoTen }); if (ly) throw new Error(ly);
          if (mk !== mk2) throw new Error('Hai lần nhập mật khẩu chưa giống nhau.');
          const cb = DN.canhBaoMatKhau(mk); if (cb && daCanhBao !== mk) { daCanhBao = mk; throw new Error(cb); }
          await DN.api.taoQuanTri({ ten, hoTen, email, mk });
        } else {
          const ten = v('dnTen').toLowerCase(), mk = document.getElementById('dnMk').value;
          if (!ten || !mk) throw new Error('Nhập tên đăng nhập và mật khẩu.');
          ls.set('kiemke-nho', document.getElementById('dnNho').checked ? '1' : '0');   // supabase-db.js đọc để giữ phiên ở localStorage hay chỉ trong phiên
          const email = ten.includes('@') ? ten : await DN.api.emailCua(ten);
          try {
            if (!email) throw new Error('Invalid login credentials');
            await DN.api.dangNhap(email, mk);
          } catch (er) {
            if (/Invalid login credentials/i.test(er && er.message)) { const s = sai.doc(); s.n = (s.n || 0) + 1; if (s.n >= SAI_TOI_DA) { s.n = 0; s.den = Date.now() + CHO_GIAY * 1000; } sai.ghi(s); }
            throw er;
          }
          sai.ghi({});
        }
        if (!(await hoanTat(true))) { try { await DN.api.dangXuat(); } catch (er) { } throw new Error('Tài khoản chưa được cấp quyền vào trang hoặc đã bị khoá. Liên hệ người quản trị.'); }
      } catch (er) { loi(viLoi(er)); nut.disabled = false; nut.textContent = cu; }
    });
    setTimeout(() => document.getElementById('dnTen')?.focus(), 30);
  }
  // sau mật khẩu: còn bước 2 thì hỏi mã; còn dùng mật khẩu ban đầu quản trị đặt thì bắt đổi; quản trị chưa bật 2 bước thì bắt bật
  // ngay; xong thì vào trang. false = không có quyền
  // Tài khoản được "Miễn mã 6 số" (quản trị chọn ở Chung › Quản lý, người dùng chốt 17/11/2026): đúng mật khẩu là vào, bỏ qua cả
  // bước nhập mã lẫn bắt bật 2 lớp (máy chủ cũng cho đủ quyền: duoc_mien_2_lop trong dang-nhap.sql).
  async function hoanTat(moi) {
    const t = await DN.api.toiLaAi(); if (!t) return false;
    if (!t.mien_2_lop && await DN.api.canMa2()) { hienMa2(); return true; }
    if (t.doi_mk) { hienDoiMkDau(t, moi); return true; }
    if (t.quyen === 'admin' && !t.mien_2_lop && !((await DN.api.dsYeuTo()) || []).some(f => f.status === 'verified')) { hienBatMfa(t, moi); return true; }
    vao(t, moi); return true;
  }
  // lần đăng nhập đầu bằng mật khẩu ban đầu (người dùng chốt 17/11/2026): bắt đổi sang mật khẩu riêng theo đủ quy tắc mới vào trang.
  // Máy chủ cũng chặn: chưa đổi thì không đọc / ghi được dữ liệu (con_mk_ban_dau trong dang-nhap.sql).
  function hienDoiMkDau(t, moi) {
    const m = khung(`<form id="dnForm4" novalidate>
      <div class="dn-dau"><b>Đổi mật khẩu trước khi vào trang</b><span>Bạn đang dùng <b>mật khẩu ban đầu</b> do người quản trị đặt. Đặt mật khẩu riêng của bạn để vào trang: ít nhất 12 ký tự, nên là một câu dễ nhớ (vd. “Kiem ke phong 108 Gamma!”); không toàn chữ số, không chứa tên đăng nhập, họ tên.</span></div>
      <input type="text" id="dnTenAn" autocomplete="username" value="${E(t.ten || '')}" hidden>
      ${fld('dnMkMoi', 'Mật khẩu mới (ít nhất 12 ký tự)', 'password', 'new-password', '')}
      ${fld('dnMkMoi2', 'Nhập lại mật khẩu mới', 'password', 'new-password', '')}
      <label class="dn-hien"><input type="checkbox" id="dnHien"> Hiện mật khẩu</label>
      <p class="dn-loi" id="dnLoi" role="alert"></p>
      <button type="submit" class="btn pri dn-nut" id="dnNut">Đổi mật khẩu và vào trang</button>
      <button type="button" class="btn dn-nut" id="dnHuy">Đăng xuất</button></form>`);
    m.querySelector('#dnHien').addEventListener('change', e => m.querySelectorAll('#dnMkMoi,#dnMkMoi2').forEach(i => { i.type = e.target.checked ? 'text' : 'password'; }));
    m.querySelector('#dnHuy').addEventListener('click', async () => { try { await DN.api.dangXuat(); } catch (e) { } hienMan(''); });
    let daCanhBao = '';
    m.querySelector('#dnForm4').addEventListener('submit', async e => {
      e.preventDefault();
      const nut = document.getElementById('dnNut'), loi = x => { document.getElementById('dnLoi').textContent = x; };
      const mk = document.getElementById('dnMkMoi').value, mk2 = document.getElementById('dnMkMoi2').value;
      const ly = DN.kiemTraMatKhau(mk, { ten: t.ten, email: t.email, hoTen: t.ho_ten }); if (ly) { loi(ly); return; }   // quy tắc đầy đủ (không phải mật khẩu ban đầu)
      if (mk !== mk2) { loi('Hai lần nhập mật khẩu mới chưa giống nhau.'); return; }
      const cb = DN.canhBaoMatKhau(mk); if (cb && daCanhBao !== mk) { daCanhBao = mk; loi(cb); return; }
      nut.disabled = true; loi('');
      try {
        await DN.api.doiMkDau(mk); DN.doiMkLanDau = true;
        if (!(await hoanTat(moi))) { try { await DN.api.dangXuat(); } catch (er) { } throw new Error('Tài khoản chưa được cấp quyền vào trang hoặc đã bị khoá. Liên hệ người quản trị.'); }
      } catch (er) { loi(viLoi(er)); nut.disabled = false; }
    });
    setTimeout(() => document.getElementById('dnMkMoi')?.focus(), 30);
  }
  async function hienBatMfa(t, moi) {
    const m = khung(`<div class="dn-dau"><b>Bật xác thực 2 bước (bắt buộc với quản trị)</b><span>Tài khoản quản trị có toàn quyền nên cần thêm lớp mã 6 số.
      Cài ứng dụng <b>Google Authenticator</b> hoặc <b>Microsoft Authenticator</b> trên điện thoại, chọn thêm tài khoản rồi quét mã QR dưới đây.</span></div>
      <div id="dnMfa"><p class="dn-goi">Đang tạo mã…</p></div>`);
    let f;
    try { f = await DN.api.batMfa(); }
    catch (e) { m.querySelector('#dnMfa').innerHTML = `<p class="dn-loi" role="alert">${E(viLoi(e))}</p><button type="button" class="btn pri dn-nut" id="dnLai">Thử lại</button>`; m.querySelector('#dnLai').addEventListener('click', () => location.reload()); return; }
    m.querySelector('#dnMfa').innerHTML = `<form id="dnForm3" novalidate>
      <div class="dn-qr"><img src="${E(f.qr)}" alt="Mã QR để thêm vào ứng dụng xác thực" width="180" height="180"></div>
      <p class="dn-goi">Không quét được thì nhập tay mã này vào ứng dụng: <span class="mono">${E(f.secret)}</span></p>
      ${fld('dnMa', 'Mã 6 số ứng dụng hiện ra', 'text', 'one-time-code', '6 chữ số')}
      <p class="dn-loi" id="dnLoi" role="alert"></p>
      <button type="submit" class="btn pri dn-nut" id="dnNut">Xác nhận và vào trang</button>
      <button type="button" class="btn dn-nut" id="dnHuy">Đăng xuất</button></form>`;
    m.querySelector('#dnHuy').addEventListener('click', async () => { try { await DN.api.dangXuat(); } catch (e) { } hienMan(''); });
    m.querySelector('#dnForm3').addEventListener('submit', async e => {
      e.preventDefault();
      const nut = document.getElementById('dnNut'), loi = x => { document.getElementById('dnLoi').textContent = x; };
      const ma = (document.getElementById('dnMa').value || '').replace(/\s/g, '');
      if (!/^\d{6}$/.test(ma)) { loi('Nhập đủ 6 chữ số.'); return; }
      nut.disabled = true; loi('');
      try { await DN.api.xacNhanMfa(f.id, ma); DN.batMfaLanDau = true; vao(t, moi); }
      catch (er) { loi(viLoi(er)); nut.disabled = false; }
    });
    setTimeout(() => document.getElementById('dnMa')?.focus(), 30);
  }
  function hienMa2() {
    const m = khung(`<form id="dnForm2" novalidate>
      <div class="dn-dau"><b>Xác thực 2 bước</b><span>Mở ứng dụng xác thực trên điện thoại (Google Authenticator, Microsoft Authenticator…) và nhập mã 6 số của “Quản lý tài sản”.</span></div>
      ${fld('dnMa', 'Mã xác thực', 'text', 'one-time-code', '6 chữ số')}
      <p class="dn-loi" id="dnLoi" role="alert"></p>
      <button type="submit" class="btn pri dn-nut" id="dnNut">Xác nhận</button>
      <button type="button" class="btn dn-nut" id="dnHuy">Đăng nhập tài khoản khác</button>
    </form>`);
    m.querySelector('#dnHuy').addEventListener('click', async () => { try { await DN.api.dangXuat(); } catch (e) { } hienMan(''); });
    m.querySelector('#dnForm2').addEventListener('submit', async e => {
      e.preventDefault();
      const nut = document.getElementById('dnNut'), loi = t => { document.getElementById('dnLoi').textContent = t; };
      const ma = (document.getElementById('dnMa').value || '').replace(/\s/g, '');
      if (!/^\d{6}$/.test(ma)) { loi('Nhập đủ 6 chữ số.'); return; }
      nut.disabled = true; loi('');
      try {
        await DN.api.xacThuc2(ma);
        if (!(await hoanTat(true))) { try { await DN.api.dangXuat(); } catch (er) { } throw new Error('Tài khoản chưa được cấp quyền vào trang hoặc đã bị khoá. Liên hệ người quản trị.'); }
      } catch (er) { loi(viLoi(er)); nut.disabled = false; }
    });
    setTimeout(() => document.getElementById('dnMa')?.focus(), 30);
  }

  /* ---------- Chung › Quản lý ứng dụng ---------- */
  async function qlTaiTv(ep) {   // ep: sau thao tác của chính người dùng → luôn vẽ lại
    DN.tvTai = true;
    try { DN.tv = await DN.api.dsThanhVien() || []; DN.tvLoi = ''; } catch (e) { DN.tvLoi = viLoi(e); DN.tv = DN.tv || []; }
    DN.tvTai = false;
    if (V.type === 'quanly' && (ep || !busyEditing())) render();
  }
  async function qlTaiMfa(ep) {
    DN.mfa = { tai: false, ds: [] };
    try { DN.mfa.ds = await DN.api.dsYeuTo() || []; } catch (e) { DN.mfa.loi = viLoi(e); }
    DN.mfa.tai = true;
    if (V.type === 'quanly' && (ep || !busyEditing())) render();
  }
  const ghi = (title, lines) => { try { logEvent({ kind: 'chung', title, lines: lines || [] }); } catch (e) { } };
  function qlMfaHTML() {
    const f = DN.mfa, bat = f && f.ds.some(x => x.status === 'verified'), moi = QLV.mfaMoi;
    return `<section class="ql-the">
      <h2>${ic('ShieldCheck')}Xác thực 2 bước</h2>
      <p class="note">Bắt buộc với tài khoản quản trị: đăng nhập cần thêm mã 6 số từ ứng dụng trên điện thoại (Google Authenticator, Microsoft Authenticator…). Người biết mật khẩu của bạn cũng không vào được nếu không có điện thoại. Đổi điện thoại thì bấm “Chuyển sang điện thoại mới” khi còn giữ điện thoại cũ.</p>
      ${DN.toi.mien ? `<div class="ch-note warn">${ic('TriangleAlert')}<div>Tài khoản của bạn đang được <b>miễn mã 6 số</b>: đăng nhập chỉ cần mật khẩu. Khi xong việc, nhờ quản trị (đã đăng nhập bằng mã 6 số) chọn lại “Bắt buộc” ở bảng Thành viên.</div></div>` : ''}
      ${!f || !f.tai ? '<div class="empty">Đang kiểm tra…</div>' : f.loi ? `<div class="ch-note warn">${ic('TriangleAlert')}<div>${E(f.loi)}</div></div>`
        : moi ? `<div class="ql-mfa"><img src="${E(moi.qr)}" alt="Mã QR để thêm vào ứng dụng xác thực" width="180" height="180"><div>
            <p>1. Mở ứng dụng xác thực, chọn thêm tài khoản, quét mã QR bên cạnh (hoặc nhập mã: <span class="mono">${E(moi.secret)}</span>).</p>
            <p>2. Nhập mã 6 số ứng dụng hiện ra:</p>
            <div class="ql-b"><input class="in" id="qlMfaMa" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6 chữ số" aria-label="Mã xác thực"><button type="button" class="btn pri" data-ql="mfaxn">Xác nhận và bật</button><button type="button" class="btn" data-ql="mfahuy">Huỷ</button></div>
            <p class="dn-loi" id="qlMfaLoi" role="alert"></p></div></div>`
        : bat ? `<p><span class="tag info">Đang bật</span></p><div class="ql-b"><button type="button" class="btn" data-ql="mfadoi">${ic('Smartphone')}Chuyển sang điện thoại mới</button></div>`
        : `<p><span class="tag warn">Chưa bật</span></p><div class="ql-b"><button type="button" class="btn pri" data-ql="mfabat">${ic('Smartphone')}Bật xác thực 2 bước</button></div>`}
    </section>`;
  }
  function qlKhoaHTML() {
    return `<section class="ql-the">
      <h2>${ic('FileLock')}Khoá dữ liệu tài sản</h2>
      ${DN.maHoa ? `<p><span class="tag info">Đang khoá</span> Danh sách tài sản, Sổ mã QR và file Excel gốc trên web đã được <b>mã hoá</b>: người không đăng nhập tải về cũng không đọc được.</p>`
        : `<p><span class="tag warn">Chưa khoá</span> Ai biết đường link vẫn tải được danh sách tài sản và file Excel gốc. Khoá trong 3 bước:</p>
        <ol class="ql-buoc"><li>Bấm <b>Sao chép khoá</b> bên dưới (không gửi khoá qua tin nhắn, email).</li>
          <li>Vào vercel.com → dự án <b>kiem-ke-tai-san</b> → <b>Settings → Environment Variables</b> → thêm: Key <span class="mono">KIEMKE_KHOA_DU_LIEU</span>, Value: dán khoá, chọn <b>Production</b> và <b>Preview</b> → <b>Save</b>.</li>
          <li>Vào <b>Deployments</b> → bản mới nhất → <b>⋯ → Redeploy</b>. Xong, báo trợ lý để kiểm tra.</li></ol>`}
      <div class="ql-b"><button type="button" class="btn" data-ql="saokhoa">${ic('Copy')}Sao chép khoá</button></div>
      <p class="note">Khoá chỉ quản trị sao chép được và nằm ở 2 nơi: Supabase (bảng bi_mat) và Vercel. Không ghi khoá vào file nào, không gửi qua mạng xã hội.</p>
    </section>`;
  }
  function qlTvHTML() {
    const l = DN.tv;
    return `<section class="ql-the">
      <h2>${ic('Users')}Thành viên</h2>
      <p class="note">Chỉ người có tài khoản mới mở được trang; ai làm gì đều ghi lịch sử theo tên. <b>Tra cứu</b>: chỉ xem mọi thông tin (kể cả danh bạ), không ghi được gì. <b>Kiểm kê</b>: thêm ghi kết quả kiểm kê, tài sản phát sinh, thất lạc. <b>Quản trị</b>: toàn quyền (danh bạ, đầu mối, thành viên), bắt buộc xác thực 2 bước — trừ khi chọn <b>Miễn</b> ở cột “Mã 6 số” (đăng nhập chỉ cần mật khẩu; chỉ nên dùng tạm, xong việc chọn lại “Bắt buộc”). Khoá tài khoản có hiệu lực ngay, kể cả máy đang đăng nhập.</p>
      ${DN.toi.mien ? `<div class="ch-note warn">${ic('TriangleAlert')}<div>Bạn đang đăng nhập không qua mã 6 số nên không đổi được cột “Mã 6 số”. Việc này cần một quản trị đã đăng nhập bằng mã 6 số.</div></div>` : ''}
      ${DN.tvLoi ? `<div class="ch-note warn">${ic('TriangleAlert')}<div>${E(DN.tvLoi)}</div></div>` : ''}
      ${!l ? '<div class="empty">Đang tải danh sách thành viên…</div>' : `<div class="tblwrap ql-tbl" tabindex="0" role="region" aria-label="Danh sách thành viên"><table><thead><tr><th>Tên đăng nhập</th><th>Họ tên</th><th>Email</th><th>Quyền</th><th>Mã 6 số</th><th>Trạng thái</th><th>Đăng nhập cuối</th><th></th></tr></thead><tbody>${l.map(x => {
        const toi = x.user_id === DN.toi.uid, u = E(x.user_id), ad = x.quyen === 'admin';
        // ô chọn "Mã 6 số khi đăng nhập" (chỉ tài khoản quản trị mới cần mã; người dùng chốt 17/11/2026 cho phép miễn tạm)
        const mien = !ad ? '<span class="dm-no">Không cần</span>'
          : `<select class="in" data-ql="mien" aria-label="Mã 6 số khi đăng nhập của ${E(x.ten_dang_nhap)}"${DN.toi.mien ? ' disabled' : ''}><option value="0"${x.mien_2_lop ? '' : ' selected'}>Bắt buộc</option><option value="1"${x.mien_2_lop ? ' selected' : ''}>Miễn (chỉ mật khẩu)</option></select>`;
        return `<tr data-uid="${u}"><td class="mono">${E(x.ten_dang_nhap)}${toi ? ' <small>(bạn)</small>' : ''}</td><td>${E(x.ho_ten || '')}</td><td>${E(x.email || '')}</td>
          <td>${toi ? E(lbl(QUYEN_TK, x.quyen)) : `<select class="in" data-ql="quyen" aria-label="Quyền của ${E(x.ten_dang_nhap)}">${QUYEN_TK.map(([k, n]) => `<option value="${k}" ${x.quyen === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`}</td>
          <td>${mien}</td>
          <td>${x.khoa ? '<span class="tag warn">Đã khoá</span>' : '<span class="tag info">Đang dùng</span>'}${ad && x.mien_2_lop ? ' <span class="tag warn">Miễn mã 6 số</span>' : ''}</td>
          <td class="num">${x.dang_nhap_cuoi ? ddmmyy(x.dang_nhap_cuoi) : 'Chưa đăng nhập'}</td>
          <td class="ql-act">${toi ? '' : (QLV.mk === x.user_id
            ? `<input class="in" type="password" id="qlDat-${u}" placeholder="Mật khẩu mới (≥ 12 ký tự, được toàn số)" autocomplete="new-password" aria-label="Mật khẩu mới cho ${E(x.ten_dang_nhap)}"><button type="button" class="btn sm pri" data-ql="datmk">Lưu</button><button type="button" class="btn sm" data-ql="huymk">Huỷ</button>`
            : `<button type="button" class="btn sm" data-ql="mk">${ic('KeyRound')}Đặt lại mật khẩu</button>`) + `<button type="button" class="btn sm" data-ql="khoa">${x.khoa ? 'Mở khoá' : 'Khoá'}</button>`}</td></tr>`;
      }).join('')}</tbody></table></div>`}
      <form class="ql-form" id="qlThem" novalidate>
        <h3>Thêm thành viên</h3>
        <div class="ql-f ql-f5">
          <div class="fld"><label for="qtTen">Tên đăng nhập</label><input class="in" id="qtTen" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="vd. tranthib"></div>
          <div class="fld"><label for="qtHoTen">Họ tên</label><input class="in" id="qtHoTen" autocomplete="off"></div>
          <div class="fld"><label for="qtEmail">Email công việc</label><input class="in" id="qtEmail" type="email" autocomplete="off" placeholder="ten@fe.edu.vn"></div>
          <div class="fld"><label for="qtMk">Mật khẩu ban đầu</label><input class="in" id="qtMk" type="text" autocomplete="off" placeholder="ít nhất 12 ký tự, được toàn số"></div>
          <div class="fld"><label for="qtQuyen">Quyền</label><select class="in" id="qtQuyen">${QUYEN_TK.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div>
        </div>
        <p class="dn-loi" id="qlThemLoi" role="alert"></p>
        <div class="ql-b"><button type="submit" class="btn pri">${ic('UserPlus')}Thêm thành viên</button></div>
        <p class="note">Gửi tên đăng nhập và mật khẩu ban đầu cho người đó (gặp trực tiếp hoặc tin nhắn riêng), dặn họ đổi mật khẩu ngay sau lần đăng nhập đầu trong Chung › Quản lý.</p>
      </form>
    </section>`;
  }
  g.viewQuanLy = function () {
    qlBind();
    const t = DN.toi;
    if (!DN.cai || !t) {
      app.innerHTML = `${demoBanner()}${banner('hoi-truong', 'Chung', 'Quản lý ứng dụng', 'Tài khoản, mật khẩu, thành viên và bảo mật của trang.')}
      <div class="ch-note warn">${ic('TriangleAlert')}<div><b>Chưa bật đăng nhập.</b> Hiện ai có đường link đều xem và sửa được dữ liệu. Để bật: người quản trị chạy file <span class="mono">supabase/dang-nhap.sql</span> trong Supabase (SQL Editor), tắt “Confirm email”, rồi mở lại trang để tạo tài khoản quản trị. Hướng dẫn đầy đủ: <span class="mono">BAO-MAT.md</span>.</div></div>`;
      return;
    }
    const ad = t.quyen === 'admin';
    if (ad && !DN.tv && !DN.tvTai) qlTaiTv();
    if (ad && !DN.mfa) qlTaiMfa();
    app.innerHTML = `${demoBanner()}${banner('hoi-truong', 'Chung', 'Quản lý ứng dụng', ad ? 'Tài khoản của bạn, mật khẩu, xác thực 2 bước, thành viên và khoá dữ liệu tài sản.' : 'Tài khoản của bạn và mật khẩu.')}
    <section class="ql-the">
      <h2>${ic('UserRound')}Tài khoản của tôi</h2>
      <dl class="ql-dl"><div><dt>Họ tên</dt><dd>${E(t.hoTen || '—')}</dd></div><div><dt>Tên đăng nhập</dt><dd class="mono">${E(t.ten)}</dd></div><div><dt>Email</dt><dd>${E(t.email || '—')}</dd></div><div><dt>Quyền</dt><dd>${E(lbl(QUYEN_TK, t.quyen))}</dd></div></dl>
      <form class="ql-form" id="qlMk" novalidate>
        <h3>Đổi mật khẩu</h3>
        <div class="ql-f">
          <div class="fld"><label for="qlMkCu">Mật khẩu hiện tại</label><input class="in" id="qlMkCu" type="password" autocomplete="current-password"></div>
          <div class="fld"><label for="qlMkMoi">Mật khẩu mới (ít nhất 12 ký tự)</label><input class="in" id="qlMkMoi" type="password" autocomplete="new-password"></div>
          <div class="fld"><label for="qlMkMoi2">Nhập lại mật khẩu mới</label><input class="in" id="qlMkMoi2" type="password" autocomplete="new-password"></div>
        </div>
        <p class="dn-loi" id="qlMkLoi" role="alert"></p>
        <div class="ql-b"><button type="submit" class="btn pri">${ic('KeyRound')}Đổi mật khẩu</button><button type="button" class="btn" data-ql="ra">${ic('LogOut')}Đăng xuất</button><button type="button" class="btn" data-ql="ramoi">${ic('MonitorX')}Đăng xuất trên mọi thiết bị</button></div>
        <p class="note">Mật khẩu nên là một câu dễ nhớ, không dùng ngày sinh, tên, số điện thoại; không dùng chung với tài khoản khác. Để máy không dùng quá ${NHAN_ROI_GIO} giờ thì trang tự đăng xuất. Mất điện thoại / lộ mật khẩu: bấm “Đăng xuất trên mọi thiết bị” rồi đổi mật khẩu.</p>
      </form>
    </section>
    ${ad ? qlMfaHTML() + qlKhoaHTML() + qlTvHTML() : ''}`;
  };

  function qlBind() {
    if (qlBind.ok) return; qlBind.ok = true;
    const tvCua = el => { const tr = el.closest('[data-uid]'); return tr && (DN.tv || []).find(x => x.user_id === tr.dataset.uid); };
    app.addEventListener('click', async e => {
      const b = e.target.closest('[data-ql]'); if (!b || b.tagName === 'SELECT') return;
      const v = b.dataset.ql, x = tvCua(b);
      if (v === 'ra') { DN.dangXuat(); return; }
      if (v === 'ramoi') { DN.dangXuat('global', 'Đã đăng xuất trên mọi thiết bị. Nên đổi mật khẩu nếu nghi bị lộ.'); return; }
      if (v === 'saokhoa') {
        b.disabled = true;
        try {
          const k = await DN.api.khoaDuLieu(); if (!k) throw new Error('Chưa có khoá (chạy lại supabase/dang-nhap.sql).');
          try { await navigator.clipboard.writeText(k); toast('Đã sao chép khoá. Dán vào Vercel, không gửi qua tin nhắn.'); }
          catch (er) { const i = document.createElement('input'); i.className = 'in mono'; i.value = k; i.readOnly = true; b.after(i); i.select(); toast('Chọn và sao chép khoá trong ô vừa hiện'); }
          ghi('Sao chép khoá dữ liệu tài sản');
        } catch (er) { toast(viLoi(er)); }
        b.disabled = false; return;
      }
      if (v === 'mfadoi') { QLV.mfaCu = ((DN.mfa && DN.mfa.ds) || []).filter(y => y.status === 'verified').map(y => y.id); }
      if (v === 'mfabat' || v === 'mfadoi') { b.disabled = true; try { QLV.mfaMoi = await DN.api.batMfa(); render(); setTimeout(() => document.getElementById('qlMfaMa')?.focus(), 30); } catch (er) { toast(viLoi(er)); b.disabled = false; } return; }
      if (v === 'mfahuy') { QLV.mfaMoi = null; QLV.mfaCu = null; render(); return; }
      if (v === 'mfaxn') {
        const ma = (document.getElementById('qlMfaMa')?.value || '').replace(/\s/g, ''), l = t => { const p = document.getElementById('qlMfaLoi'); if (p) p.textContent = t; };
        if (!/^\d{6}$/.test(ma)) { l('Nhập đủ 6 chữ số.'); return; }
        b.disabled = true;
        try {
          await DN.api.xacNhanMfa(QLV.mfaMoi.id, ma);
          const cu = QLV.mfaCu || []; for (const id of cu) await DN.api.tatMfa(id);   // bỏ điện thoại cũ sau khi điện thoại mới đã chạy
          QLV.mfaMoi = null; QLV.mfaCu = null;
          ghi(cu.length ? 'Chuyển xác thực 2 bước sang điện thoại mới' : 'Bật xác thực 2 bước'); toast(cu.length ? 'Đã chuyển sang điện thoại mới' : 'Đã bật xác thực 2 bước'); await qlTaiMfa(true);
        }
        catch (er) { l(viLoi(er)); b.disabled = false; }
        return;
      }
      if (v === 'mfatat') {
        const f = (DN.mfa && DN.mfa.ds || []).find(y => y.status === 'verified'); if (!f) return;
        b.disabled = true;
        try { await DN.api.tatMfa(f.id); ghi('Tắt xác thực 2 bước'); toast('Đã tắt xác thực 2 bước'); await qlTaiMfa(true); }
        catch (er) { toast(viLoi(er)); b.disabled = false; }
        return;
      }
      if (v === 'mk' && x) { QLV.mk = x.user_id; render(); setTimeout(() => document.getElementById('qlDat-' + x.user_id)?.focus(), 30); return; }
      if (v === 'huymk') { QLV.mk = ''; render(); return; }
      if (v === 'datmk' && x) {
        const mk = (document.getElementById('qlDat-' + x.user_id)?.value || '');
        const ly = DN.kiemTraMatKhau(mk, { ten: x.ten_dang_nhap, email: x.email, hoTen: x.ho_ten, banDau: true }); if (ly) { toast(ly); return; }
        b.disabled = true;
        try { await DN.api.datMatKhau(x.user_id, mk); QLV.mk = ''; ghi('Đặt lại mật khẩu cho ' + x.ten_dang_nhap); toast('Đã đặt lại mật khẩu cho ' + x.ten_dang_nhap + '. Gửi riêng cho người đó, dặn đổi ngay.'); render(); }
        catch (er) { toast(viLoi(er)); b.disabled = false; }
        return;
      }
      if (v === 'khoa' && x) {
        b.disabled = true;
        try { await DN.api.suaThanhVien(x.user_id, { khoa: !x.khoa }); ghi((x.khoa ? 'Mở khoá' : 'Khoá') + ' tài khoản ' + x.ten_dang_nhap); toast((x.khoa ? 'Đã mở khoá ' : 'Đã khoá ') + x.ten_dang_nhap); await qlTaiTv(true); }
        catch (er) { toast(viLoi(er)); b.disabled = false; }
      }
    });
    app.addEventListener('change', async e => {
      const s = e.target;
      if (s.dataset.ql === 'mien') {   // Miễn / Bắt buộc mã 6 số cho một tài khoản quản trị
        const x = tvCua(s); if (!x) return;
        const mien = s.value === '1'; s.disabled = true;
        try {
          await DN.api.datMien2Lop(x.user_id, mien);
          ghi((mien ? 'Miễn mã 6 số cho tài khoản ' : 'Bắt buộc lại mã 6 số cho tài khoản ') + x.ten_dang_nhap, [mien ? 'Đăng nhập chỉ cần mật khẩu' : 'Đăng nhập cần mật khẩu + mã 6 số']);
          toast(mien ? `Đã miễn mã 6 số cho ${x.ten_dang_nhap}: đăng nhập chỉ cần mật khẩu. Xong việc nhớ chọn lại “Bắt buộc”.` : `Đã bắt buộc lại mã 6 số cho ${x.ten_dang_nhap}`);
          await qlTaiTv(true);
        } catch (er) { toast(viLoi(er)); s.value = x.mien_2_lop ? '1' : '0'; s.disabled = false; }
        return;
      }
      if (s.dataset.ql !== 'quyen') return;
      const x = tvCua(s); if (!x) return;
      try { await DN.api.suaThanhVien(x.user_id, { quyen: s.value }); ghi('Đổi quyền tài khoản ' + x.ten_dang_nhap, [`Quyền: ${lbl(QUYEN_TK, x.quyen)} → ${lbl(QUYEN_TK, s.value)}`]); toast('Đã đổi quyền của ' + x.ten_dang_nhap); await qlTaiTv(true); }
      catch (er) { toast(viLoi(er)); s.value = x.quyen; }
    });
    let mkCanhBao = '';
    app.addEventListener('submit', async e => {
      const f = e.target; if (f.id !== 'qlMk' && f.id !== 'qlThem') return;
      e.preventDefault();
      const v = id => (document.getElementById(id)?.value || ''), nut = f.querySelector('button[type="submit"]');
      if (f.id === 'qlMk') {
        const loi = t => { document.getElementById('qlMkLoi').textContent = t; };
        const cu = v('qlMkCu'), moi = v('qlMkMoi'), moi2 = v('qlMkMoi2'); loi('');
        if (!cu) { loi('Nhập mật khẩu hiện tại.'); return; }
        const ly = DN.kiemTraMatKhau(moi, { ten: DN.toi.ten, email: DN.toi.email, hoTen: DN.toi.hoTen }); if (ly) { loi(ly); return; }
        if (moi !== moi2) { loi('Hai lần nhập mật khẩu mới chưa giống nhau.'); return; }
        if (moi === cu) { loi('Mật khẩu mới phải khác mật khẩu hiện tại.'); return; }
        const cb = DN.canhBaoMatKhau(moi); if (cb && mkCanhBao !== moi) { mkCanhBao = moi; loi(cb); return; }
        nut.disabled = true;
        try { await DN.api.doiMatKhau(DN.toi.email, cu, moi); f.reset(); ghi('Đổi mật khẩu của mình'); toast('Đã đổi mật khẩu'); }
        catch (er) { loi(/MK_CU/.test(er && er.message) ? 'Mật khẩu hiện tại chưa đúng.' : viLoi(er)); }
        nut.disabled = false;
        return;
      }
      const loi = t => { document.getElementById('qlThemLoi').textContent = t; };
      const ten = v('qtTen').trim().toLowerCase(), hoTen = v('qtHoTen').trim().replace(/\s+/g, ' '), email = v('qtEmail').trim().toLowerCase(), mk = v('qtMk'), quyen = v('qtQuyen'); loi('');
      if (!TEN.test(ten)) { loi(viLoi('ten_dang_nhap_check')); return; }
      if (!hoTen) { loi('Nhập họ tên.'); return; }
      if (!EMAIL.test(email)) { loi('Email chưa đúng dạng, vd. ten@fe.edu.vn'); return; }
      const ly = DN.kiemTraMatKhau(mk, { ten, email, hoTen, banDau: true }); if (ly) { loi('Mật khẩu ban đầu: ' + ly); return; }
      if ((DN.tv || []).some(x => x.ten_dang_nhap === ten)) { loi('Tên đăng nhập này đã có người dùng.'); return; }
      nut.disabled = true;
      try {
        const r = await DN.api.themThanhVien({ ten, hoTen, email, mk, quyen }) || {};
        ghi('Thêm thành viên ' + ten, [`Họ tên: ${hoTen}`, `Quyền: ${lbl(QUYEN_TK, quyen)}`]);
        toast(r.daCo ? `Email đã có tài khoản: đã cấp quyền cho ${ten}, mật khẩu giữ như cũ` : `Đã thêm thành viên ${ten}`);
        f.reset(); await qlTaiTv(true);
      } catch (er) { loi(viLoi(er)); }
      nut.disabled = false;
    });
  }
})();
