/* Đăng nhập (Supabase Auth) và Chung › Quản lý (tài khoản của tôi, thành viên) — người dùng yêu cầu 15/11/2026.
   - Bật bằng supabase/dang-nhap.sql. Chưa chạy SQL đó (DN.cai=false): trang chạy như cũ, ai có đường link đều dùng được.
   - Đã bật: mở trang phải đăng nhập (tên đăng nhập + mật khẩu); dữ liệu chỉ thành viên đọc/ghi được (RLS trên Supabase).
   - Lần đầu (chưa có thành viên nào): màn hình "Tạo tài khoản quản trị".
   - Quyền: admin (toàn quyền, quản lý thành viên) · sua (xem + sửa Danh bạ) · xem (xem Danh bạ). Ai cũng kiểm kê được.
   - KHÔNG bao giờ ghi mật khẩu vào mã nguồn / repo. Mật khẩu do Supabase Auth giữ (đã băm).
   - Bộ thử giao diện thay cổng Supabase bằng window.KIEMKE_AUTH_GIA (cùng các hàm như sbCong()).
   File nạp trong <head>: chỉ dùng app, esc(), render()… của index.html khi đã chạy. */
(function () {
  const g = window;
  g.QUYEN_TK = [['xem', 'Xem danh bạ'], ['sua', 'Xem và sửa danh bạ'], ['admin', 'Quản trị (toàn quyền)']];
  const DN = g.DN = { cai: false, toi: null, api: null, coQuanTri: true, tv: null, tvTai: false, tvLoi: '', db: { ds: [], tai: false, loi: '' } };
  const QLV = { mk: '' };   // đang đặt lại mật khẩu cho thành viên nào

  // lỗi → câu dễ hiểu
  function viLoi(e) {
    const m = String(e && (e.message || e.error_description || e) || '');
    if (/Invalid login credentials/i.test(m)) return 'Sai tên đăng nhập hoặc mật khẩu.';
    if (/Email not confirmed/i.test(m)) return 'Tài khoản chưa được xác nhận email. Người quản trị cần tắt “Confirm email” trong Supabase (Authentication → Sign In / Providers → Email) rồi thử lại.';
    if (/already registered|already exists|User already/i.test(m)) return 'Email này đã có tài khoản.';
    if (/ten_dang_nhap_check/i.test(m)) return 'Tên đăng nhập chỉ gồm chữ thường không dấu, số, dấu chấm, gạch dưới, gạch ngang (3–40 ký tự).';
    if (/duplicate key|unique/i.test(m)) return 'Tên đăng nhập này đã có người dùng.';
    if (/Signups not allowed|signup.*disabled/i.test(m)) return 'Supabase đang tắt đăng ký tài khoản mới. Người quản trị bật “Allow new users to sign up” trong Supabase.';
    if (/rate limit|only request this after|too many/i.test(m)) return 'Thao tác quá nhiều lần, thử lại sau ít phút.';
    if (/Password should|weak password|MK_NGAN/i.test(m)) return 'Mật khẩu cần ít nhất 8 ký tự.';
    if (/Failed to fetch|NetworkError|network|fetch failed/i.test(m)) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
    return m || 'Có lỗi, thử lại.';
  }
  g.dnLoi = viLoi;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, TEN = /^[a-z0-9._-]{3,40}$/;

  // cổng Supabase thật (một kết nối dùng chung, giữ phiên trên máy — web/supabase-db.js)
  function sbCong() {
    const sb = g.kiemkeSupabase && g.kiemkeSupabase(); if (!sb) return null;
    const cfg = g.KIEMKE_SUPABASE;
    const rpc = async (f, a) => { const { data, error } = await sb.rpc(f, a || {}); if (error) throw error; return data; };
    return {
      async trangThai() {
        const { data, error } = await sb.rpc('trang_thai_dang_nhap');
        if (error) { if (error.code === 'PGRST202' || /Could not find the function/i.test(error.message || '')) return { da_cai: false }; throw error; }
        return data || { da_cai: false };
      },
      emailCua: ten => rpc('email_dang_nhap', { p_ten: ten }),
      async dangNhap(email, mk) { const { error } = await sb.auth.signInWithPassword({ email, password: mk }); if (error) throw error; },
      async toiLaAi() { const { data } = await sb.auth.getSession(); if (!data || !data.session) return null; return rpc('toi_la_ai'); },
      async dangXuat() { await sb.auth.signOut(); },
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
        await rpc('quan_tri_them_thanh_vien', { p_email: o.email, p_ten: o.ten, p_ho_ten: o.hoTen, p_quyen: o.quyen });
        return { daCo };
      },
      async suaThanhVien(uid, o) { const { error } = await sb.from('thanh_vien').update(o).eq('user_id', uid); if (error) throw error; },
      datMatKhau: (uid, mk) => rpc('quan_tri_dat_mat_khau', { p_uid: uid, p_mat_khau: mk }),
      danhBa: {
        async ds() { const { data, error } = await sb.from('danh_ba').select('*').order('ho_ten'); if (error) throw error; return data || []; },
        async luu(r) { const { data, error } = await sb.from('danh_ba').upsert(r).select().single(); if (error) throw error; return data; },
        async xoa(id) { const { error } = await sb.from('danh_ba').delete().eq('id', id); if (error) throw error; },
      },
      theoDoi(f) { sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') f(); }); },
    };
  }

  DN.laQuanTri = () => !!(DN.toi && DN.toi.quyen === 'admin');
  DN.duocSuaDanhBa = () => !!(DN.toi && ['admin', 'sua'].includes(DN.toi.quyen));

  /* ---------- vào trang ---------- */
  DN.batDau = async function (tiep) {
    DN.tiep = tiep;
    DN.api = g.KIEMKE_AUTH_GIA || sbCong();
    if (!DN.api) { DN.tiep = null; tiep(); return; }
    let tt;
    try { tt = await DN.api.trangThai(); }
    catch (e) { manLoi(viLoi(e)); return; }
    if (!tt || !tt.da_cai) { DN.cai = false; DN.tiep = null; tiep(); return; }   // chưa bật đăng nhập: chạy như cũ
    DN.cai = true; DN.coQuanTri = !!tt.co_quan_tri;
    try { const t = await DN.api.toiLaAi(); if (t) { vao(t); return; } } catch (e) { }
    hienMan();
  };
  function vao(t) {
    DN.toi = { uid: t.uid, ten: t.ten, hoTen: t.ho_ten || '', quyen: t.quyen, email: t.email || '' };
    DN.coQuanTri = true; DN.tv = null; DN.tvLoi = '';
    document.body.classList.remove('dn-cho');
    const m = document.getElementById('dnMan'); if (m) m.remove();
    if (DN.api.theoDoi && !DN.theo) { DN.theo = true; DN.api.theoDoi(() => { if (DN.toi && !DN.dangRa) location.reload(); }); }
    if (DN.tiep) { const f = DN.tiep; DN.tiep = null; f(); }
    else { ME = DN.toi.hoTen || DN.toi.ten; showMe(); render(); }
    DN.taiDanhBa();
  }
  DN.dangXuat = async function () {
    DN.dangRa = true;
    try { await DN.api.dangXuat(); } catch (e) { }
    if (DN.api.gia) { DN.toi = null; DN.dangRa = false; DN.db = { ds: [], tai: false, loi: '' }; hienMan(); return; }
    location.reload();
  };
  DN.taiDanhBa = async function () {
    if (!DN.cai || !DN.toi || !DN.api || !DN.api.danhBa) return;
    try { DN.db.ds = await DN.api.danhBa.ds(); DN.db.tai = true; DN.db.loi = ''; }
    catch (e) { DN.db.loi = viLoi(e); DN.db.tai = true; }
    if (typeof V !== 'undefined' && ['danhba', 'ts', 'unit', 'lylich', 'xm', 'daumoi'].includes(V.type) && !busyEditing()) render();
  };

  /* ---------- màn hình đăng nhập / tạo tài khoản quản trị đầu tiên ---------- */
  const fld = (id, nhan, type, ac, ph) => `<div class="dn-f"><label for="${id}">${nhan}</label><input class="in" id="${id}" type="${type}" autocomplete="${ac}"${ph ? ` placeholder="${ph}"` : ''}${type === 'text' ? ' autocapitalize="none" spellcheck="false"' : ''}></div>`;
  function khung(noiDung) {
    document.body.classList.add('dn-cho');
    let m = document.getElementById('dnMan');
    if (!m) { m = document.createElement('div'); m.id = 'dnMan'; m.className = 'dn-man'; document.body.appendChild(m); }
    m.innerHTML = `<div class="dn-the"><img class="dn-logo" src="img/logo-fpt-university.png" alt="FPT Education · FPT University" width="960" height="375">
      <h1>Quản lý tài sản</h1><p class="dn-sub">Phòng Hành chính · FPTU Đà Nẵng</p>${noiDung}</div>`;
    return m;
  }
  function manLoi(msg) {
    const m = khung(`<p class="dn-loi" role="alert">${esc(msg)}</p><button type="button" class="btn pri dn-nut" id="dnLai">Thử lại</button>`);
    m.querySelector('#dnLai').addEventListener('click', () => location.reload());
  }
  function hienMan(thongBao) {
    const dau = !DN.coQuanTri;
    const m = khung(`<form id="dnForm" novalidate>
      ${dau ? `<div class="dn-dau"><b>Tạo tài khoản quản trị (lần đầu)</b><span>Chưa có tài khoản nào. Tài khoản này có toàn quyền: tạo, khoá tài khoản thành viên, đặt quyền, đặt lại mật khẩu.</span></div>
        ${fld('dnTen', 'Tên đăng nhập', 'text', 'username', 'chữ thường không dấu, vd. nguyenvana')}${fld('dnHoTen', 'Họ tên', 'text', 'name', '')}
        ${fld('dnEmail', 'Email công việc', 'email', 'email', 'ten@fe.edu.vn')}${fld('dnMk', 'Mật khẩu (ít nhất 8 ký tự)', 'password', 'new-password', '')}
        ${fld('dnMk2', 'Nhập lại mật khẩu', 'password', 'new-password', '')}`
      : `${fld('dnTen', 'Tên đăng nhập', 'text', 'username', '')}${fld('dnMk', 'Mật khẩu', 'password', 'current-password', '')}`}
      <label class="dn-hien"><input type="checkbox" id="dnHien"> Hiện mật khẩu</label>
      <p class="dn-loi" id="dnLoi" role="alert">${thongBao ? esc(thongBao) : ''}</p>
      <button type="submit" class="btn pri dn-nut" id="dnNut">${dau ? 'Tạo tài khoản và vào trang' : 'Đăng nhập'}</button>
      ${dau ? '' : '<p class="dn-goi">Quên mật khẩu: nhờ người quản trị đặt lại trong Chung › Quản lý.</p>'}
    </form>`);
    const f = m.querySelector('#dnForm');
    m.querySelector('#dnHien').addEventListener('change', e => m.querySelectorAll('#dnMk,#dnMk2').forEach(i => { i.type = e.target.checked ? 'text' : 'password'; }));
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const v = id => (document.getElementById(id)?.value || '').trim(), loi = t => { document.getElementById('dnLoi').textContent = t; };
      const nut = document.getElementById('dnNut'), cu = nut.textContent; nut.disabled = true; nut.textContent = 'Đang xử lý…'; loi('');
      try {
        if (dau) {
          const ten = v('dnTen').toLowerCase(), hoTen = v('dnHoTen').replace(/\s+/g, ' '), email = v('dnEmail').toLowerCase(), mk = document.getElementById('dnMk').value, mk2 = document.getElementById('dnMk2').value;
          if (!TEN.test(ten)) throw new Error('ten_dang_nhap_check');
          if (!hoTen) throw new Error('Nhập họ tên.');
          if (!EMAIL.test(email)) throw new Error('Email chưa đúng dạng, vd. ten@fe.edu.vn');
          if (mk.length < 8) throw new Error('MK_NGAN');
          if (mk !== mk2) throw new Error('Hai lần nhập mật khẩu chưa giống nhau.');
          await DN.api.taoQuanTri({ ten, hoTen, email, mk });
        } else {
          const ten = v('dnTen').toLowerCase(), mk = document.getElementById('dnMk').value;
          if (!ten || !mk) throw new Error('Nhập tên đăng nhập và mật khẩu.');
          const email = ten.includes('@') ? ten : await DN.api.emailCua(ten);
          if (!email) throw new Error('Invalid login credentials');
          await DN.api.dangNhap(email, mk);
        }
        const t = await DN.api.toiLaAi();
        if (!t) { try { await DN.api.dangXuat(); } catch (er) { } throw new Error('Tài khoản chưa được cấp quyền vào trang hoặc đã bị khoá. Liên hệ người quản trị.'); }
        vao(t);
      } catch (er) { loi(viLoi(er)); nut.disabled = false; nut.textContent = cu; }
    });
    setTimeout(() => document.getElementById('dnTen')?.focus(), 30);
  }

  /* ---------- Chung › Quản lý ứng dụng ---------- */
  async function qlTaiTv() {
    DN.tvTai = true;
    try { DN.tv = await DN.api.dsThanhVien() || []; DN.tvLoi = ''; } catch (e) { DN.tvLoi = viLoi(e); DN.tv = DN.tv || []; }
    DN.tvTai = false;
    if (V.type === 'quanly' && !busyEditing()) render();
  }
  const ghi = (title, lines) => { try { logEvent({ kind: 'chung', title, lines: lines || [] }); } catch (e) { } };
  function qlTvHTML() {
    const l = DN.tv;
    return `<section class="ql-the">
      <h2>${ic('Users')}Thành viên</h2>
      <p class="note">Chỉ người có tài khoản mới mở được trang. Mọi thành viên đều kiểm kê, in tem, xem lịch sử được; quyền dưới đây quyết định việc với Danh bạ và quản lý.</p>
      ${DN.tvLoi ? `<div class="ch-note warn">${ic('TriangleAlert')}<div>${esc(DN.tvLoi)}</div></div>` : ''}
      ${!l ? '<div class="empty">Đang tải danh sách thành viên…</div>' : `<div class="tblwrap ql-tbl"><table><thead><tr><th>Tên đăng nhập</th><th>Họ tên</th><th>Email</th><th>Quyền</th><th>Trạng thái</th><th>Đăng nhập cuối</th><th></th></tr></thead><tbody>${l.map(x => {
        const toi = x.user_id === DN.toi.uid, u = esc(x.user_id);
        return `<tr data-uid="${u}"><td class="mono">${esc(x.ten_dang_nhap)}${toi ? ' <small>(bạn)</small>' : ''}</td><td>${esc(x.ho_ten || '')}</td><td>${esc(x.email || '')}</td>
          <td>${toi ? esc(lbl(QUYEN_TK, x.quyen)) : `<select class="in" data-ql="quyen" aria-label="Quyền của ${esc(x.ten_dang_nhap)}">${QUYEN_TK.map(([k, n]) => `<option value="${k}" ${x.quyen === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`}</td>
          <td>${x.khoa ? '<span class="tag warn">Đã khoá</span>' : '<span class="tag info">Đang dùng</span>'}</td>
          <td class="num">${x.dang_nhap_cuoi ? ddmmyy(x.dang_nhap_cuoi) : 'Chưa đăng nhập'}</td>
          <td class="ql-act">${toi ? '' : (QLV.mk === x.user_id
            ? `<input class="in" type="password" id="qlDat-${u}" placeholder="Mật khẩu mới (≥ 8 ký tự)" autocomplete="new-password" aria-label="Mật khẩu mới cho ${esc(x.ten_dang_nhap)}"><button type="button" class="btn sm pri" data-ql="datmk">Lưu</button><button type="button" class="btn sm" data-ql="huymk">Huỷ</button>`
            : `<button type="button" class="btn sm" data-ql="mk">${ic('KeyRound')}Đặt lại mật khẩu</button>`) + `<button type="button" class="btn sm" data-ql="khoa">${x.khoa ? 'Mở khoá' : 'Khoá'}</button>`}</td></tr>`;
      }).join('')}</tbody></table></div>`}
      <form class="ql-form" id="qlThem" novalidate>
        <h3>Thêm thành viên</h3>
        <div class="ql-f ql-f5">
          <div class="fld"><label for="qtTen">Tên đăng nhập</label><input class="in" id="qtTen" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="vd. tranthib"></div>
          <div class="fld"><label for="qtHoTen">Họ tên</label><input class="in" id="qtHoTen" autocomplete="off"></div>
          <div class="fld"><label for="qtEmail">Email công việc</label><input class="in" id="qtEmail" type="email" autocomplete="off" placeholder="ten@fe.edu.vn"></div>
          <div class="fld"><label for="qtMk">Mật khẩu ban đầu</label><input class="in" id="qtMk" type="text" autocomplete="off" placeholder="ít nhất 8 ký tự"></div>
          <div class="fld"><label for="qtQuyen">Quyền</label><select class="in" id="qtQuyen">${QUYEN_TK.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div>
        </div>
        <p class="dn-loi" id="qlThemLoi" role="alert"></p>
        <div class="ql-b"><button type="submit" class="btn pri">${ic('UserPlus')}Thêm thành viên</button></div>
        <p class="note">Gửi tên đăng nhập và mật khẩu ban đầu cho người đó (gặp trực tiếp hoặc tin nhắn riêng), dặn họ đổi mật khẩu sau lần đăng nhập đầu trong Chung › Quản lý.</p>
      </form>
    </section>`;
  }
  g.viewQuanLy = function () {
    qlBind();
    const t = DN.toi;
    if (!DN.cai || !t) {
      app.innerHTML = `${demoBanner()}${banner('hoi-truong', 'Chung', 'Quản lý ứng dụng', 'Tài khoản, mật khẩu và thành viên dùng trang.')}
      <div class="ch-note warn">${ic('TriangleAlert')}<div><b>Chưa bật đăng nhập.</b> Hiện ai có đường link đều xem và sửa được dữ liệu. Để bật: người quản trị chạy file <span class="mono">supabase/dang-nhap.sql</span> trong Supabase (SQL Editor), tắt “Confirm email”, rồi mở lại trang để tạo tài khoản quản trị.</div></div>`;
      return;
    }
    const ad = t.quyen === 'admin';
    if (ad && !DN.tv && !DN.tvTai) qlTaiTv();
    app.innerHTML = `${demoBanner()}${banner('hoi-truong', 'Chung', 'Quản lý ứng dụng', ad ? 'Tài khoản của bạn, đổi mật khẩu, thành viên dùng trang và quyền của từng người.' : 'Tài khoản của bạn và đổi mật khẩu.')}
    <section class="ql-the">
      <h2>${ic('UserRound')}Tài khoản của tôi</h2>
      <dl class="ql-dl"><div><dt>Họ tên</dt><dd>${esc(t.hoTen || '—')}</dd></div><div><dt>Tên đăng nhập</dt><dd class="mono">${esc(t.ten)}</dd></div><div><dt>Email</dt><dd>${esc(t.email || '—')}</dd></div><div><dt>Quyền</dt><dd>${esc(lbl(QUYEN_TK, t.quyen))}</dd></div></dl>
      <form class="ql-form" id="qlMk" novalidate>
        <h3>Đổi mật khẩu</h3>
        <div class="ql-f">
          <div class="fld"><label for="qlMkCu">Mật khẩu hiện tại</label><input class="in" id="qlMkCu" type="password" autocomplete="current-password"></div>
          <div class="fld"><label for="qlMkMoi">Mật khẩu mới (ít nhất 8 ký tự)</label><input class="in" id="qlMkMoi" type="password" autocomplete="new-password"></div>
          <div class="fld"><label for="qlMkMoi2">Nhập lại mật khẩu mới</label><input class="in" id="qlMkMoi2" type="password" autocomplete="new-password"></div>
        </div>
        <p class="dn-loi" id="qlMkLoi" role="alert"></p>
        <div class="ql-b"><button type="submit" class="btn pri">${ic('KeyRound')}Đổi mật khẩu</button><button type="button" class="btn" data-ql="ra">${ic('LogOut')}Đăng xuất</button></div>
      </form>
    </section>
    ${ad ? qlTvHTML() : ''}`;
  };

  function qlBind() {
    if (qlBind.ok) return; qlBind.ok = true;
    const tvCua = el => { const tr = el.closest('[data-uid]'); return tr && (DN.tv || []).find(x => x.user_id === tr.dataset.uid); };
    app.addEventListener('click', async e => {
      const b = e.target.closest('[data-ql]'); if (!b || b.tagName === 'SELECT') return;
      const v = b.dataset.ql, x = tvCua(b);
      if (v === 'ra') { DN.dangXuat(); return; }
      if (v === 'mk' && x) { QLV.mk = x.user_id; render(); setTimeout(() => document.getElementById('qlDat-' + x.user_id)?.focus(), 30); return; }
      if (v === 'huymk') { QLV.mk = ''; render(); return; }
      if (v === 'datmk' && x) {
        const mk = (document.getElementById('qlDat-' + x.user_id)?.value || '');
        if (mk.length < 8) { toast('Mật khẩu cần ít nhất 8 ký tự'); return; }
        b.disabled = true;
        try { await DN.api.datMatKhau(x.user_id, mk); QLV.mk = ''; ghi('Đặt lại mật khẩu cho ' + x.ten_dang_nhap); toast('Đã đặt lại mật khẩu cho ' + x.ten_dang_nhap + '. Gửi riêng cho người đó.'); render(); }
        catch (er) { toast(viLoi(er)); b.disabled = false; }
        return;
      }
      if (v === 'khoa' && x) {
        b.disabled = true;
        try { await DN.api.suaThanhVien(x.user_id, { khoa: !x.khoa }); ghi((x.khoa ? 'Mở khoá' : 'Khoá') + ' tài khoản ' + x.ten_dang_nhap); toast((x.khoa ? 'Đã mở khoá ' : 'Đã khoá ') + x.ten_dang_nhap); await qlTaiTv(); }
        catch (er) { toast(viLoi(er)); b.disabled = false; }
      }
    });
    app.addEventListener('change', async e => {
      const s = e.target; if (s.dataset.ql !== 'quyen') return;
      const x = tvCua(s); if (!x) return;
      try { await DN.api.suaThanhVien(x.user_id, { quyen: s.value }); ghi('Đổi quyền tài khoản ' + x.ten_dang_nhap, [`Quyền: ${lbl(QUYEN_TK, x.quyen)} → ${lbl(QUYEN_TK, s.value)}`]); toast('Đã đổi quyền của ' + x.ten_dang_nhap); await qlTaiTv(); }
      catch (er) { toast(viLoi(er)); s.value = x.quyen; }
    });
    app.addEventListener('submit', async e => {
      const f = e.target; if (f.id !== 'qlMk' && f.id !== 'qlThem') return;
      e.preventDefault();
      const v = id => (document.getElementById(id)?.value || ''), nut = f.querySelector('button[type="submit"]');
      if (f.id === 'qlMk') {
        const loi = t => { document.getElementById('qlMkLoi').textContent = t; };
        const cu = v('qlMkCu'), moi = v('qlMkMoi'), moi2 = v('qlMkMoi2'); loi('');
        if (!cu) { loi('Nhập mật khẩu hiện tại.'); return; }
        if (moi.length < 8) { loi('Mật khẩu mới cần ít nhất 8 ký tự.'); return; }
        if (moi !== moi2) { loi('Hai lần nhập mật khẩu mới chưa giống nhau.'); return; }
        if (moi === cu) { loi('Mật khẩu mới phải khác mật khẩu hiện tại.'); return; }
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
      if (mk.length < 8) { loi('Mật khẩu ban đầu cần ít nhất 8 ký tự.'); return; }
      if ((DN.tv || []).some(x => x.ten_dang_nhap === ten)) { loi('Tên đăng nhập này đã có người dùng.'); return; }
      nut.disabled = true;
      try {
        const r = await DN.api.themThanhVien({ ten, hoTen, email, mk, quyen }) || {};
        ghi('Thêm thành viên ' + ten, [`Họ tên: ${hoTen}`, `Quyền: ${lbl(QUYEN_TK, quyen)}`]);
        toast(r.daCo ? `Email đã có tài khoản: đã cấp quyền cho ${ten}, mật khẩu giữ như cũ` : `Đã thêm thành viên ${ten}`);
        f.reset(); await qlTaiTv();
      } catch (er) { loi(viLoi(er)); }
      nut.disabled = false;
    });
  }
})();
