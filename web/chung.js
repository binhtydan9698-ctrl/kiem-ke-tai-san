/* Phần thứ 4 "Chung" (người dùng yêu cầu 15/11/2026) — dùng lại ASSETS, UNIT, UNITS, S, save(), banner(), ic(), esc()… của index.html.
   - #khau-hao: tài sản đã hết khấu hao và sắp hết khấu hao (trong 12 tháng tới), để cán bộ quản lý gom đi thanh lý.
     TẠM TÍNH: file BBKK chưa có số năm khấu hao → tính chung một số năm cho mọi tài sản, người xem tích chọn trên trang
     (nhớ trên máy). Mốc bắt đầu = "Ngày bắt đầu SD" (a.ngay). Công trình, xây lắp, phần mềm (a.hoso) không tính ở đây.
   - #dau-moi: danh bạ đầu mối quản lý tài sản theo SHEET (bộ môn, khoa: CNBM / trưởng khoa; phòng ban: trưởng phòng / người phụ
     trách). Chỉ tên, chức vụ, email công việc (trang mở cho người có link: không ghi số điện thoại cá nhân).
     Lưu chung trong S.dm[mã sheet] (col 'dm' trên Supabase, KHÔNG đưa vào repo). Hiện ở trang tài sản, trang sheet, Tài sản thất
     lạc, Lý lịch, Khấu hao. KHÔNG xuất vào file "Xuất cho kế toán" (export.js không đọc S.dm). */
(function () {
  const g = window;
  const KH_NAM = [3, 4, 5, 6, 8, 10];
  // file nạp trong <head>, trước mã chính của index.html: chỉ dùng KEY, app… khi trang Chung được mở
  const khk = () => KEY + '.khNam';
  g.KHV = { nam: 0, dv: '', q: '', an: true, lim: { het: 200, gan: 200 } };
  g.DMV = { sua: '' };
  const khNam = () => { if (!KHV.nam) { try { const v = +localStorage.getItem(khk()); KHV.nam = KH_NAM.includes(v) ? v : 5; } catch (e) { KHV.nam = 5; } } return KHV.nam; };

  const isoD = t => { const p = n => String(n).padStart(2, '0'); return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`; };
  // ngày hết khấu hao = ngày bắt đầu sử dụng + số năm khấu hao
  g.khHet = (a, nam) => { if (!a || !a.ngay) return null; const [y, m, d] = a.ngay.split('-').map(Number); return new Date(y + nam, m - 1, d); };
  const homNay = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };

  /* ---------- đầu mối ---------- */
  g.dmCua = uid => { const d = (S.dm || {})[uid]; return d && (d.ten || d.email) ? d : null; };
  // người trong Danh bạ (chỉ có sau khi đăng nhập) khớp với đầu mối: cùng email, hoặc cùng họ tên (và cùng sheet nếu danh bạ ghi sheet)
  const dbCuaDm = (uid, d) => {
    const ds = (g.DN && DN.toi && DN.db.ds) || []; if (!ds.length || !d) return null;
    const em = String(d.email || '').toLowerCase(), ten = fold(d.ten || '');
    return ds.find(r => em && String(r.email || '').toLowerCase() === em) || ds.find(r => ten && fold(r.ho_ten) === ten && (!r.don_vi || r.don_vi === uid)) || null;
  };
  g.telHref = s => 'tel:' + String(s || '').replace(/[^\d+]/g, '');
  g.dmText = (uid, o) => {
    const d = dmCua(uid); o = o || {};
    if (!d) return `<span class="dm-no">Chưa có đầu mối</span>${o.sua ? ` · <a href="#dau-moi">thêm ở Chung › Đầu mối</a>` : ''}`;
    const p = dbCuaDm(uid, d);
    return `<b>${esc(d.ten || '')}</b>${d.cv ? ` · ${esc(d.cv)}` : ''}${d.email ? ` · <a class="dm-mail" href="mailto:${esc(d.email)}">${esc(d.email)}</a>` : ''}${p && p.dien_thoai ? ` · <a class="dm-mail" href="${esc(telHref(p.dien_thoai))}">${esc(p.dien_thoai)}</a>` : ''}`;
  };
  g.dmChu = uid => { const d = dmCua(uid); return d ? [d.ten, d.cv, d.email].filter(Boolean).join(' · ') : ''; };
  // câu lịch sử khi đổi đầu mối (logDescribe gọi)
  g.logDmLines = (o, n) => {
    if (!n) return o ? ['Xoá đầu mối' + (o.ten ? ': ' + o.ten : '')] : [];
    const a = o || {}, L = [];
    [['ten', 'Họ tên'], ['cv', 'Chức vụ'], ['email', 'Email']].forEach(([f, t]) => {
      const x = cut(a[f], 80), y = cut(n[f], 80); if (x !== y) L.push(`${t}: ${x || 'trống'} → ${y || 'trống'}`);
    });
    return L;
  };
  const NHOM = [
    ['Bộ môn, khoa', u => !u.review && /Chủ nhiệm|Trưởng khoa/.test(u.dd)],
    ['Phòng ban', u => !u.review && !/Chủ nhiệm|Trưởng khoa/.test(u.dd)],
    ['Sheet lẻ chưa có vị trí', u => !!u.review],
  ];

  g.viewDauMoi = function () {
    chBind();
    const co = UNITS.filter(u => dmCua(u.id)).length, khoa = READONLY || (MODE === 'shared' && !READY) || (g.DN && DN.cai && !DN.laQuanTri());   // đã bật đăng nhập: chỉ quản trị sửa đầu mối
    const hang = u => {
      const d = (S.dm || {})[u.id] || {}, n = (BY_UNIT[u.id] || []).length;
      if (DMV.sua === u.id) return `<div class="dm-it dm-ed" data-dm="${u.id}">
        <div class="dm-u"><b>${esc(u.sheet)}</b><small>${esc(u.ten)} · ${nf.format(n)} tài sản</small></div>
        <div class="dm-f">
          <div class="fld"><label for="dm-ten-${u.id}">Họ tên</label><input class="in" id="dm-ten-${u.id}" value="${esc(d.ten || '')}" autocomplete="off"></div>
          <div class="fld"><label for="dm-cv-${u.id}">Chức vụ</label><input class="in" id="dm-cv-${u.id}" value="${esc(d.cv || u.dd || '')}" placeholder="${esc(u.dd || '')}"></div>
          <div class="fld"><label for="dm-email-${u.id}">Email công việc</label><input class="in" id="dm-email-${u.id}" type="email" inputmode="email" value="${esc(d.email || '')}" placeholder="ten@fe.edu.vn"></div>
          <div class="dm-b"><button type="button" class="btn pri" data-ch="dmluu">${ic('Check')}Lưu</button><button type="button" class="btn" data-ch="dmhuy">Huỷ</button>${dmCua(u.id) ? `<button type="button" class="btn dm-del" data-ch="dmxoa">Xoá đầu mối</button>` : ''}</div>
        </div></div>`;
      return `<div class="dm-it" data-dm="${u.id}">
        <div class="dm-u"><b>${esc(u.sheet)}</b><small>${esc(u.ten)} · ${nf.format(n)} tài sản</small></div>
        <div class="dm-v"><span>${dmText(u.id)}</span>${d.at ? `<small>Cập nhật ${ddmmyy(d.at)}${d.by ? ' · ' + esc(whoLabel(d.by) || d.by) : ''}</small>` : ''}</div>
        ${khoa ? '' : `<button type="button" class="btn sm" data-ch="dmsua">${ic('PenLine')}${dmCua(u.id) ? 'Sửa' : 'Thêm'}</button>`}
      </div>`;
    };
    app.innerHTML = `${demoBanner()}
    ${banner('sanh-giai-tri', 'Chung', 'Đầu mối quản lý tài sản', 'Mỗi phòng ban, bộ môn, khoa (theo sheet của file BBKK) có một đầu mối để liên hệ về tài sản. Đầu mối hiện ở trang tài sản, trang sheet, Tài sản thất lạc, Lý lịch và Khấu hao.')}
    <div class="ch-note">${ic('ShieldAlert')}<div>${g.DN && DN.cai
      ? 'Ở đây ghi <b>tên, chức vụ, email công việc</b>; số điện thoại ghi ở <a href="#danh-ba">Danh bạ</a> và tự hiện kèm đầu mối khi cùng email hoặc họ tên.'
      : 'Trang đang mở cho người có đường link nên chỉ ghi <b>tên, chức vụ, email công việc</b>, không ghi số điện thoại cá nhân.'} Đầu mối <b>không</b> đưa vào file “Xuất cho kế toán”.</div></div>
    <p class="dm-sum"><b class="num">${co}/${UNITS.length}</b> sheet đã có đầu mối</p>
    ${NHOM.map(([t, f]) => { const l = UNITS.filter(f); return l.length ? `<div class="sect"><h2>${t}</h2><span class="num">${l.length} sheet</span></div><div class="dm-list">${l.map(hang).join('')}</div>` : ''; }).join('')}`;
    if (DMV.sua) document.getElementById('dm-ten-' + DMV.sua)?.focus();
  };

  function dmLuu(uid) {
    if (READONLY || (g.DN && DN.cai && !DN.laQuanTri())) { toast('Chỉ quản trị sửa được đầu mối'); return; }
    if (MODE === 'shared' && !READY) { toast('Đang tải dữ liệu chung, thử lại sau giây lát'); return; }
    const v = k => (document.getElementById(`dm-${k}-${uid}`)?.value || '').trim().replace(/\s+/g, ' ');
    const ten = v('ten'), cv = v('cv'), email = v('email').toLowerCase();
    if (!ten && !email) { toast('Nhập ít nhất họ tên hoặc email'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Email chưa đúng dạng, vd. ten@fe.edu.vn'); document.getElementById(`dm-email-${uid}`)?.focus(); return; }
    S.dm = S.dm || {}; S.dm[uid] = { ten, cv, email, at: Date.now(), by: ME || '' };
    DMV.sua = ''; save(); render(); toast('Đã lưu đầu mối ' + (UNIT[uid] ? UNIT[uid].sheet : uid));
  }

  /* ---------- danh bạ (cần đăng nhập; bảng danh_ba trên Supabase, KHÔNG nằm trong kiemke_docs, KHÔNG xuất cho kế toán) ---------- */
  g.DBV = { q: '', dv: '', sua: '', xoa: '' };   // sua: '' | 'moi' | id đang sửa; xoa: id đang hỏi xoá
  const dvTen = c => UNIT[c] ? `${UNIT[c].sheet} · ${UNIT[c].ten}` : (c || 'Chưa ghi đơn vị');
  g.viewDanhBa = function () {
    chBind();
    const ban = banner('thu-vien', 'Chung', 'Danh bạ', 'Thông tin liên hệ của cán bộ các phòng ban, bộ môn liên quan đến tài sản. Chỉ thành viên đã đăng nhập mới xem được.');
    if (!(g.DN && DN.cai && DN.toi)) {
      app.innerHTML = `${demoBanner()}${ban}<div class="ch-note warn">${ic('Lock')}<div><b>Danh bạ cần đăng nhập.</b> Đăng nhập chưa được bật nên chưa dùng được Danh bạ (để bảo vệ thông tin của người có tên trong danh sách). Xem cách bật ở <a href="#quan-ly">Chung › Quản lý</a>.</div></div>`;
      return;
    }
    if (!DN.db.tai) DN.taiDanhBa();
    const sua = DN.duocSuaDanhBa(), q = fold(DBV.q.trim()), ds = DN.db.ds;
    const l = ds.filter(r => (!DBV.dv || r.don_vi === DBV.dv) && (!q || fold([r.ho_ten, r.chuc_vu, r.dien_thoai, r.email, r.ghi_chu, dvTen(r.don_vi)].join(' ')).includes(q)));
    const thu = UNITS.map(u => u.id), nhom = new Map();
    const chieu = XEP.db === 'za' ? -1 : 1;   // ô Sắp xếp: họ tên A → Z / Z → A trong từng đơn vị (người dùng yêu cầu 20/11/2026)
    l.slice().sort((a, b) => { const x = thu.indexOf(a.don_vi), y = thu.indexOf(b.don_vi); return (x < 0 ? 999 : x) - (y < 0 ? 999 : y) || String(a.don_vi).localeCompare(String(b.don_vi)) || XEP_CO.compare(String(a.ho_ten || ''), String(b.ho_ten || '')) * chieu; })
      .forEach(r => { const k = r.don_vi || ''; if (!nhom.has(k)) nhom.set(k, []); nhom.get(k).push(r); });
    const r0 = DBV.sua && DBV.sua !== 'moi' ? ds.find(r => r.id === DBV.sua) || {} : {};
    const form = DBV.sua ? `<form class="ql-form db-form" id="dbForm" novalidate>
        <h3>${DBV.sua === 'moi' ? 'Thêm người vào danh bạ' : 'Sửa: ' + esc(r0.ho_ten || '')}</h3>
        <div class="ql-f ql-f3">
          <div class="fld"><label for="dbHoTen">Họ tên</label><input class="in" id="dbHoTen" value="${esc(r0.ho_ten || '')}" autocomplete="off"></div>
          <div class="fld"><label for="dbChucVu">Chức vụ</label><input class="in" id="dbChucVu" value="${esc(r0.chuc_vu || '')}" autocomplete="off" placeholder="vd. Chủ nhiệm bộ môn"></div>
          <div class="fld"><label for="dbDonVi">Đơn vị (sheet)</label><select class="in" id="dbDonVi"><option value="">Chưa chọn</option>${UNITS.map(u => `<option value="${u.id}" ${r0.don_vi === u.id ? 'selected' : ''}>${esc(u.sheet)} · ${esc(u.ten)}</option>`).join('')}${r0.don_vi && !UNIT[r0.don_vi] ? `<option value="${esc(r0.don_vi)}" selected>${esc(r0.don_vi)}</option>` : ''}</select></div>
          <div class="fld"><label for="dbDt">Số điện thoại</label><input class="in" id="dbDt" type="tel" inputmode="tel" value="${esc(r0.dien_thoai || '')}" autocomplete="off" placeholder="vd. 0905 123 456"></div>
          <div class="fld"><label for="dbEmail">Email</label><input class="in" id="dbEmail" type="email" value="${esc(r0.email || '')}" autocomplete="off" placeholder="ten@fe.edu.vn"></div>
          <div class="fld"><label for="dbGhiChu">Ghi chú</label><input class="in" id="dbGhiChu" value="${esc(r0.ghi_chu || '')}" autocomplete="off"></div>
        </div>
        <p class="dn-loi" id="dbLoi" role="alert"></p>
        <div class="ql-b"><button type="submit" class="btn pri">${ic('Check')}Lưu</button><button type="button" class="btn" data-db="huy">Huỷ</button>${DBV.sua !== 'moi' ? `<button type="button" class="btn dm-del" data-db="xoa">${DBV.xoa === DBV.sua ? 'Bấm lần nữa để xoá' : 'Xoá khỏi danh bạ'}</button>` : ''}</div>
      </form>` : '';
    app.innerHTML = `${demoBanner()}${ban}
    <div class="ch-note">${ic('Lock')}<div>Chỉ <b>thành viên đã đăng nhập</b> xem được danh bạ${sua ? '; bạn được thêm, sửa' : ' (chỉ quản trị được thêm, sửa)'}. Danh bạ không đưa vào file “Xuất cho kế toán”. Số điện thoại tự hiện kèm <a href="#dau-moi">đầu mối</a> khi cùng email hoặc họ tên.</div></div>
    ${DN.db.loi ? `<div class="ch-note warn">${ic('TriangleAlert')}<div>${esc(DN.db.loi)}</div></div>` : ''}
    <div class="tools db-tools">
      <select class="in" id="dbdv" aria-label="Đơn vị"><option value="">Mọi đơn vị</option>${UNITS.map(u => `<option value="${u.id}" ${DBV.dv === u.id ? 'selected' : ''}>${esc(u.sheet)}</option>`).join('')}</select>
      <label class="sbox search">${ic('Search')}<input class="in" id="dbq" type="search" placeholder="Tìm tên, chức vụ, số điện thoại, email…" value="${esc(DBV.q)}" aria-label="Tìm trong danh bạ"></label>
      ${xepHTML('db', [['', 'Tên A → Z'], ['za', 'Tên Z → A']])}
      ${sua && !DBV.sua ? `<button type="button" class="btn pri" data-db="moi">${ic('UserPlus')}Thêm người</button>` : ''}
    </div>
    ${form}
    <p class="dm-sum"><b class="num">${nf.format(l.length)}</b> người${l.length !== ds.length ? ` (trong ${nf.format(ds.length)})` : ''}</p>
    ${!DN.db.tai ? '<div class="empty">Đang tải danh bạ…</div>' : !l.length ? `<div class="empty">${ds.length ? 'Không có ai khớp bộ lọc.' : 'Danh bạ chưa có ai.' + (sua ? ' Bấm “Thêm người”.' : '')}</div>`
      : [...nhom].map(([k, rs]) => `<div class="sect"><h2>${esc(dvTen(k))}</h2><span class="num">${rs.length} người</span></div><div class="dm-list">${rs.map(r => `<div class="dm-it db-it" data-dbid="${esc(r.id)}">
        <div class="dm-u"><b>${esc(r.ho_ten)}</b><small>${esc(r.chuc_vu || '')}</small></div>
        <div class="dm-v"><span>${r.dien_thoai ? `<a class="dm-mail" href="${esc(telHref(r.dien_thoai))}">${esc(r.dien_thoai)}</a>` : '<span class="dm-no">Chưa có số điện thoại</span>'}${r.email ? ` · <a class="dm-mail" href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : ''}</span>${r.ghi_chu ? `<small>${esc(r.ghi_chu)}</small>` : ''}</div>
        ${sua ? `<button type="button" class="btn sm" data-db="sua">${ic('PenLine')}Sửa</button>` : ''}</div>`).join('')}</div>`).join('')}`;
    if (DBV.sua) setTimeout(() => document.getElementById('dbHoTen')?.focus(), 30);
  };
  async function dbLuu(f) {
    const v = id => (document.getElementById(id)?.value || '').trim(), loi = t => { document.getElementById('dbLoi').textContent = t; };
    const r = { ho_ten: v('dbHoTen').replace(/\s+/g, ' '), chuc_vu: v('dbChucVu'), don_vi: v('dbDonVi'), dien_thoai: v('dbDt'), email: v('dbEmail').toLowerCase(), ghi_chu: v('dbGhiChu') };
    if (!r.ho_ten) { loi('Nhập họ tên.'); return; }
    if (r.dien_thoai && r.dien_thoai.replace(/\D/g, '').length < 8) { loi('Số điện thoại chưa đúng (cần ít nhất 8 chữ số).'); return; }
    if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) { loi('Email chưa đúng dạng, vd. ten@fe.edu.vn'); return; }
    if (DBV.sua !== 'moi') r.id = DBV.sua;
    r.cap_nhat = new Date().toISOString(); r.cap_nhat_boi = DN.toi.ten;
    const nut = f.querySelector('button[type="submit"]'); nut.disabled = true;
    try {
      const kq = await DN.api.danhBa.luu(r) || r, i = DN.db.ds.findIndex(x => x.id === kq.id);
      if (i >= 0) DN.db.ds[i] = kq; else DN.db.ds.push(kq);
      try { logEvent({ kind: 'chung', title: (i >= 0 ? 'Sửa danh bạ: ' : 'Thêm vào danh bạ: ') + r.ho_ten, lines: [dvTen(r.don_vi)] }); } catch (e) { }
      DBV.sua = ''; DBV.xoa = ''; render(); toast('Đã lưu ' + r.ho_ten);
    } catch (e) { loi(dnLoi(e)); nut.disabled = false; }
  }

  /* ---------- khấu hao ---------- */
  function khLoc() {
    khNam();
    const now = homNay(), toi = new Date(now); toi.setFullYear(toi.getFullYear() + 1);
    const q = fold(KHV.q.trim()), het = [], gan = [];
    let boQua = 0;
    ASSETS.forEach(a => {
      if (!a.ngay) return;
      if (a.hoso) { boQua++; return; }
      const sd = (S.rows[a.stt] || {}).sd || '';
      if (KHV.an && (sd === 'da_tl' || sd === 'bg')) return;
      if (KHV.dv && a.unit !== KHV.dv) return;
      if (q && !timKhop(a, q, fold([a.ma, a.ten, roomOf(a) || '', UNIT[a.unit].sheet].join(' ')))) return;   // tìm cả theo STT
      const t = khHet(a, KHV.nam);
      if (t <= now) het.push({ a, t }); else if (t <= toi) gan.push({ a, t });
    });
    // ô Sắp xếp (người dùng yêu cầu 20/11/2026): mặc định hết khấu hao sớm nhất trước; A → Z, STT…; gõ đúng STT thì món đó đứng đầu
    const xs = XEP.kh ? xepSS(XEP.kh) : null, s = sttCua(KHV.q);
    const so = (x, y) => (s ? (y.a.stt === s.n) - (x.a.stt === s.n) : 0) || (xs ? xs(x.a, y.a) : x.t - y.t || x.a.stt - y.a.stt);
    het.sort(so); gan.sort(so);
    return { het, gan, boQua, now };
  }
  g.khLoc = khLoc;
  const con = (t, now) => { const d = Math.round((t - now) / 864e5); return d < 31 ? `còn ${d} ngày` : `còn ${Math.round(d / 30.44)} tháng`; };
  function khBang(l, loai, now) {
    if (!l.length) return `<div class="empty">${loai === 'het' ? 'Không có tài sản nào đã hết khấu hao khớp bộ lọc.' : 'Không có tài sản nào sắp hết khấu hao trong 12 tháng tới khớp bộ lọc.'}</div>`;
    const show = l.slice(0, KHV.lim[loai]);
    return `<div class="tblwrap kh-tbl" tabindex="0" role="region" aria-label="${loai === 'het' ? 'Tài sản đã hết khấu hao' : 'Tài sản sắp hết khấu hao'}"><table><thead><tr><th>Mã TSCĐ</th><th>Tên tài sản</th><th>Sheet · vị trí</th><th>Bắt đầu sử dụng</th><th>${loai === 'het' ? 'Hết khấu hao từ' : 'Hết khấu hao'}</th><th class="r">Nguyên giá</th><th>Hiện trạng</th><th>Đầu mối</th></tr></thead><tbody>${show.map(({ a, t }) => {
      const s = S.rows[a.stt] || {}, r = res(a);
      return `<tr><td class="mono"><a href="#ts-${encodeURIComponent(a.key)}">${esc(a.ma || 'STT ' + a.stt)}</a></td><td>${esc(a.short)}${a.sl > 1 ? ` <small>SL ${nf.format(a.sl)}</small>` : ''}</td>
        <td>${esc(UNIT[a.unit].sheet)}<small>${esc(roomOf(a) || 'Chưa có vị trí')}</small></td><td class="num">${dmy(a.ngay)}</td>
        <td class="num">${dmy(isoD(t))}${loai === 'gan' ? `<small>${con(t, now)}</small>` : ''}</td><td class="num r">${money(a.gia)}</td>
        <td><span class="badge ${r}">${RES_LABEL[r]}</span>${s.sd ? ` <span class="tag">${esc(lbl(SUDUNG, s.sd))}</span>` : ''}</td><td class="kh-dm">${dmCua(a.unit) ? esc(dmCua(a.unit).ten || dmCua(a.unit).email) : '<span class="dm-no">—</span>'}</td></tr>`;
    }).join('')}</tbody></table></div>
    ${l.length > show.length ? `<div class="lmorebtn"><button type="button" class="btn" data-ch="khmore" data-l="${loai}">Xem thêm ${nf.format(Math.min(200, l.length - show.length))} tài sản</button></div>` : ''}`;
  }
  g.viewKhauHao = function () {
    chBind();
    const { het, gan, boQua, now } = khLoc(), tong = l => l.reduce((s, x) => s + (+x.a.gia || 0), 0);
    app.innerHTML = `${demoBanner()}
    ${banner('phong-hoc', 'Chung', 'Khấu hao', 'Tài sản đã hết khấu hao và sắp hết khấu hao, để cán bộ quản lý tài sản gom đi thanh lý. Tính từ ngày bắt đầu sử dụng cộng số năm khấu hao.')}
    <div class="ch-note warn">${ic('TriangleAlert')}<div><b>Tạm tính.</b> File BBKK chưa có số năm khấu hao của từng tài sản, nên đang tính chung <b>${KHV.nam} năm</b> cho mọi tài sản. Chọn số năm bên dưới; khi có số liệu của kế toán sẽ bổ sung sau.</div></div>
    <div class="kh-nam" role="radiogroup" aria-label="Số năm khấu hao"><span>Số năm khấu hao</span>${KH_NAM.map(n => `<button type="button" role="radio" aria-checked="${n === KHV.nam}" class="kh-c${n === KHV.nam ? ' on' : ''}" data-ch="khnam" data-n="${n}">${n} năm</button>`).join('')}</div>
    <div class="ns-sum kh-sum">
      <div><small>Đã hết khấu hao</small><b class="num">${nf.format(het.length)}</b><span>tài sản · nguyên giá ${money(tong(het))}</span></div>
      <div><small>Sắp hết trong 12 tháng tới</small><b class="num">${nf.format(gan.length)}</b><span>tài sản · nguyên giá ${money(tong(gan))}</span></div>
      <div><small>Không tính ở đây</small><b class="num">${nf.format(boQua)}</b><span>công trình, xây lắp, phần mềm (thời gian khấu hao khác hẳn)</span></div>
    </div>
    <div class="tools kh-tools">
      <select class="in" id="khdv" aria-label="Sheet"><option value="">Mọi sheet</option>${UNITS.map(u => `<option value="${u.id}" ${KHV.dv === u.id ? 'selected' : ''}>${esc(u.sheet)}</option>`).join('')}</select>
      <label class="sbox search">${ic('Search')}<input class="in" id="khq" type="search" placeholder="Tìm STT, mã, tên, phòng…" value="${esc(KHV.q)}" aria-label="Tìm tài sản"></label>
      ${xepHTML('kh', null, 'Hết khấu hao sớm nhất trước')}
      <label class="kh-an"><input type="checkbox" id="khan" ${KHV.an ? 'checked' : ''}> Ẩn tài sản đã thanh lý, đã bàn giao</label>
      <button type="button" class="btn" data-ch="khxlsx">${ic('Download')}Tải Excel danh sách</button>
    </div>
    <div class="stitle"><h2>Đã <strong>hết khấu hao</strong></h2></div>
    <div id="khHet">${khBang(het, 'het', now)}</div>
    <div class="stitle"><h2>Sắp hết khấu hao <strong>trong 12 tháng tới</strong></h2></div>
    <div id="khGan">${khBang(gan, 'gan', now)}</div>
    <p class="lfoot">Hiện trạng gồm kết quả kiểm kê và trạng thái sử dụng (vd. Chờ thanh lý). Danh sách tải về để gom tài sản đề nghị thanh lý; không phải file cho kế toán.</p>`;
  };
  async function khXlsx(b) {
    const { het, gan } = khLoc(), l = het.map(x => ['Đã hết khấu hao', x]).concat(gan.map(x => ['Sắp hết trong 12 tháng tới', x]));
    if (!l.length) { toast('Không có tài sản nào để tải'); return; }
    const old = b.innerHTML; b.disabled = true; b.textContent = 'Đang tạo file…';
    const cot = [['Khấu hao', 24], ['Mã TSCĐ', 12], ['Tên tài sản', 55], ['Sheet', 20], ['Vị trí', 18], ['Số lượng', 9], ['Bắt đầu sử dụng', 14], ['Hết khấu hao', 14], ['Nguyên giá', 15], ['Kết quả kiểm', 16], ['Trạng thái sử dụng', 22], ['Đầu mối', 36]];
    const dong = l.map(([k, { a, t }]) => [k, a.ma || '', a.ten, UNIT[a.unit].sheet, roomOf(a) || '', a.sl, dmy(a.ngay), dmy(isoD(t)), +a.gia || 0, RES_LABEL[res(a)], lbl(SUDUNG, (S.rows[a.stt] || {}).sd || ''), dmChu(a.unit)]);
    const d = new Date(), p = n => String(n).padStart(2, '0');
    try { await window.xuatBangExcel('Khấu hao', cot, dong, `Khau hao ${KHV.nam} nam ${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`); toast(`Đã tải ${nf.format(dong.length)} tài sản`); }
    catch (e) { console.error(e); toast('Không tạo được file Excel: ' + (e && e.message || e)); }
    finally { b.disabled = false; b.innerHTML = old; }
  }
  const khVe = () => { const { het, gan, now } = khLoc(), h = document.getElementById('khHet'), k = document.getElementById('khGan'); if (h) h.innerHTML = khBang(het, 'het', now); if (k) k.innerHTML = khBang(gan, 'gan', now); };

  /* ---------- sự kiện (gắn một lần, khi trang Chung mở lần đầu) ---------- */
  function chBind() {
  if (chBind.ok) return; chBind.ok = true;
  app.addEventListener('click', e => {
    const d = e.target.closest('[data-db]');
    if (d) {   // danh bạ
      const v = d.dataset.db, it = d.closest('[data-dbid]');
      if (v === 'moi') { DBV.sua = 'moi'; DBV.xoa = ''; render(); }
      else if (v === 'sua' && it) { DBV.sua = it.dataset.dbid; DBV.xoa = ''; render(); }
      else if (v === 'huy') { DBV.sua = ''; DBV.xoa = ''; render(); }
      else if (v === 'xoa') {
        if (DBV.xoa !== DBV.sua) { DBV.xoa = DBV.sua; d.textContent = 'Bấm lần nữa để xoá'; return; }
        const id = DBV.sua, r = DN.db.ds.find(x => x.id === id) || {}; d.disabled = true;
        DN.api.danhBa.xoa(id).then(() => {
          DN.db.ds = DN.db.ds.filter(x => x.id !== id);
          try { logEvent({ kind: 'chung', title: 'Xoá khỏi danh bạ: ' + (r.ho_ten || ''), lines: [dvTen(r.don_vi)] }); } catch (er) { }
          DBV.sua = ''; DBV.xoa = ''; render(); toast('Đã xoá ' + (r.ho_ten || ''));
        }).catch(er => { toast(dnLoi(er)); d.disabled = false; });
      }
      return;
    }
    const b = e.target.closest('[data-ch]'); if (!b) return;
    const v = b.dataset.ch, it = b.closest('[data-dm]'), uid = it ? it.dataset.dm : '';
    if (v === 'khnam') { KHV.nam = +b.dataset.n; KHV.lim = { het: 200, gan: 200 }; try { localStorage.setItem(khk(), String(KHV.nam)); } catch (er) { } render(); return; }
    if (v === 'khmore') { KHV.lim[b.dataset.l] += 200; khVe(); return; }
    if (v === 'khxlsx') { khXlsx(b); return; }
    if (v === 'dmsua') { DMV.sua = uid; render(); return; }
    if (v === 'dmhuy') { DMV.sua = ''; render(); return; }
    if (v === 'dmluu') { dmLuu(uid); return; }
    if (v === 'dmxoa') { if (READONLY) return; delete S.dm[uid]; DMV.sua = ''; save(); render(); toast('Đã xoá đầu mối ' + (UNIT[uid] ? UNIT[uid].sheet : uid)); return; }
  });
  app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.closest('.dm-ed') && e.target.tagName === 'INPUT') { e.preventDefault(); dmLuu(e.target.closest('[data-dm]').dataset.dm); } });
  app.addEventListener('submit', e => { if (e.target.id === 'dbForm') { e.preventDefault(); dbLuu(e.target); } });
  app.addEventListener('input', e => {
    if (e.target.id === 'dbq') {
      DBV.q = e.target.value; clearTimeout(app._db);
      app._db = setTimeout(() => { render(); const i = document.getElementById('dbq'); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (er) { } } }, 250);
    }
  });
  app.addEventListener('input', e => { if (e.target.id === 'khq') { KHV.q = e.target.value; KHV.lim = { het: 200, gan: 200 }; clearTimeout(app._kh); app._kh = setTimeout(khVe, 200); } });
  app.addEventListener('change', e => {
    if (e.target.id === 'dbdv') { DBV.dv = e.target.value; render(); }
    else if (e.target.id === 'khdv') { KHV.dv = e.target.value; KHV.lim = { het: 200, gan: 200 }; render(); }
    else if (e.target.id === 'khan') { KHV.an = e.target.checked; render(); }
  });
  }
})();
