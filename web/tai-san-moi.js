/* Chung › Tài sản mới (#tai-san-moi) — người dùng chốt 17/11/2026:
   - Tài sản vừa mua, chưa có trong file BBKK: cán bộ mua sắm, giảng viên, cán bộ khác… (quyền "Tạo tài sản mới") tự tạo trên app,
     kèm ảnh — mục đích: người quản lý tài sản nhận ra tài sản bằng hình dáng, màu sắc thay vì chỉ đọc mã khô khan.
   - Tag "Tạo bởi" = nhóm của tài khoản (quản trị đặt ở Chung › Quản lý); máy chủ tự gắn, người tạo không sửa được (dang-nhap.sql:
     giu_tai_san_moi). Chỉ người tạo (và quản trị) sửa / xoá; quyền này không ghi được gì vào tài sản trong file BBKK (máy chủ chặn).
   - Tự nối khi file BBKK có Mã TSCĐ trùng (kể cả mã kế toán đã đổi) hoặc quản trị nối tay (noi): "Đã vào sổ", ảnh tự hiện ở tài
     sản trong sổ (anh.js dsNoi), thôi xuất ở sheet phát sinh.
   - Xuất cho kế toán: tài sản chưa vào sổ gộp vào sheet "Tài sản phát sinh" (cột Nguồn = "Tạo bởi …"); file BBKK gốc giữ nguyên.
   Lưu: S.moi[mã] = {ten, sl, phong, dv, ma, ngay, gia, ghi_chu, anh:[{p,n,at,by}], uid, tao_boi, by, at, noi?} (col 'moi', mỗi tài
   sản một tài liệu để máy chủ kiểm người tạo). Ghi qua save() nên có lịch sử (logMoiLines). Dùng lại S, save(), render(), banner(),
   ic(), esc()… của index.html và moAnhMoi(), xemAnhDs(), anhVeBia() của anh.js (chỉ gọi khi trang đã chạy). */
(function () {
  const g = window;
  const LIM = 60;
  g.TSM = { q: '', loc: 'chua', tag: '', sua: '', xoa: '', lim: LIM };
  const ds = () => Object.entries(S.moi || {}).map(([id, m]) => Object.assign({ id }, m));
  const dangNhap = () => !!(g.DN && DN.cai);

  // khoá tài sản trong sổ mà tài sản mới đã "vào sổ": quản trị nối tay (noi) hoặc Mã TSCĐ trùng file BBKK (kể cả mã kế toán đã đổi)
  const chuanMa = k => { k = String(k || '').trim(); if (!k) return ''; const k2 = typeof maMoi === 'function' ? maMoi(k) : k; return BY_KEY[k2] ? k2 : ''; };
  g.moiNoi = m => (m ? chuanMa(m.noi) || chuanMa(m.ma) : '');
  let CACHE = { t: 0, map: null };
  g.moiXoaCache = () => { CACHE.t = 0; };
  g.moiCuaTS = a => {   // các tài sản mới đã vào sổ thành tài sản a (anh.js lấy ảnh của chúng hiện ở tài sản trong sổ)
    if (!S.moi) return [];
    if (!CACHE.map || Date.now() - CACHE.t > 150) {
      const mp = new Map();
      Object.values(S.moi).forEach(x => { const k = g.moiNoi(x); if (k) { if (!mp.has(k)) mp.set(k, []); mp.get(k).push(x); } });
      CACHE = { t: Date.now(), map: mp };
    }
    return CACHE.map.get(a.key) || [];
  };

  // quyền: tạo được không; sửa / xoá một tài sản mới (người tạo hoặc quản trị). Máy chủ cũng chặn y như vậy.
  const laChu = m => !dangNhap() || !!(DN.toi && (DN.laQuanTri() || m.uid === DN.toi.uid));
  g.moiDuocTao = () => !(MODE === 'shared' && !READY) && (dangNhap() ? !!(DN.toi && DN.duocTaoMoi()) : !READONLY);
  g.moiDuocSua = m => g.moiDuocTao() && laChu(m);
  const moiId = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // câu lịch sử (logDescribe gọi, khoá "m:")
  const hienGt = (k, v) => v == null || v === '' ? '' : k === 'dv' ? ((UNIT[v] || {}).ten || v) : k === 'gia' ? money(+v) : k === 'ngay' ? dmy(v) : cut(String(v), 80);
  g.logMoiLines = (o, n) => {
    if (!o && n) return [`Tạo tài sản mới: ${cut(n.ten, 80)} · SL ${nf.format(+n.sl || 1)}${n.phong ? ' · ' + cut(n.phong, 40) : ''}${n.tao_boi ? ' · Tạo bởi ' + n.tao_boi : ''}`]
      .concat((n.anh || []).length ? [`Thêm ${n.anh.length} ảnh`] : []);
    if (o && !n) return [`Xoá tài sản mới: ${cut(o.ten, 80)}`];
    if (!o || !n) return [];
    const L = [];
    [['ten', 'Tên'], ['sl', 'Số lượng'], ['phong', 'Phòng'], ['dv', 'Phòng ban'], ['ma', 'Mã TSCĐ'], ['ngay', 'Ngày bắt đầu sử dụng'], ['gia', 'Nguyên giá'],
      ['ghi_chu', 'Ghi chú'], ['tao_boi', 'Tạo bởi'], ['noi', 'Nối với tài sản trong sổ']].forEach(([k, t]) => {
      const x = hienGt(k, o[k]), y = hienGt(k, n[k]); if (x !== y) L.push(`${t}: ${x || 'trống'} → ${y || 'trống'}`);
    });
    const a1 = o.anh || [], a2 = n.anh || [], them = a2.filter(x => !a1.some(y => y.p === x.p)).length, bot = a1.filter(x => !a2.some(y => y.p === x.p)).length;
    if (them) L.push(`Thêm ${them} ảnh`); if (bot) L.push(`Xoá ${bot} ảnh`);
    return L;
  };

  // dòng cho sheet "Tài sản phát sinh" khi xuất cho kế toán: chỉ tài sản CHƯA vào sổ (đã vào sổ thì đã nằm trong file BBKK)
  g.moiChoKeToan = () => ds().filter(m => !g.moiNoi(m)).sort((x, y) => (x.at || 0) - (y.at || 0)).map(m => ({
    mo_ta: m.ten || '', sl: +m.sl || 1, phong: m.phong || '', cond: '', noi: m.dv && UNIT[m.dv] ? UNIT[m.dv].ten : 'Chưa rõ phòng ban',
    nguon: 'Tạo bởi: ' + (m.tao_boi || 'chưa rõ nhóm'), nguoi: m.by || '', ma: m.ma || '', ngay: m.ngay ? dmy(m.ngay) : '', gia: +m.gia || '',
    ghi: [m.ghi_chu || '', (m.anh || []).length ? `${m.anh.length} ảnh trên app` : ''].filter(Boolean).join(' · '), luc: m.at ? ddmmyy(m.at) : '' }));

  /* ---------- trang ---------- */
  function loc() {
    const q = fold(TSM.q.trim());
    return ds().filter(m => (TSM.loc === 'chua' ? !g.moiNoi(m) : TSM.loc === 'noi' ? !!g.moiNoi(m) : true) && (!TSM.tag || (m.tao_boi || '') === TSM.tag)
      && (!q || fold([m.ten, m.ma, m.phong, m.tao_boi, m.by, m.ghi_chu, (UNIT[m.dv] || {}).ten, (UNIT[m.dv] || {}).sheet].join(' ')).includes(q)))
      .sort((x, y) => (y.at || 0) - (x.at || 0));
  }
  function theHTML(m) {
    const k = g.moiNoi(m), a = k ? BY_KEY[k] : null, anh = m.anh || [], x0 = anh[0], sua = g.moiDuocSua(m), kho = g.anhCoKho && g.anhCoKho();
    const u = x0 && g.anhUrlCo ? g.anhUrlCo(x0.n || x0.p) : '';
    return `<article class="at-the tsm-the" data-moi="${esc(m.id)}">
      <button type="button" class="at-anh" data-tsm="anh" aria-label="${anh.length ? `Xem ${anh.length} ảnh của ${esc(m.ten)}` : `Ảnh của ${esc(m.ten)}`}">${x0 && kho
        ? `<img data-p="${esc(x0.n || x0.p)}"${u ? ` src="${esc(u)}"` : ''} alt="" loading="lazy">` : `<span class="tsm-trong">${ic('ImagePlus')}<span>${anh.length ? 'Có ảnh' : 'Chưa có ảnh'}</span></span>`}${anh.length ? `<span class="at-dem">${ic('Images')}${anh.length}</span>` : ''}</button>
      <div class="at-tt"><small class="mono">${m.ma ? 'Mã TSCĐ ' + esc(m.ma) : 'Chưa có Mã TSCĐ'}</small><b>${esc(m.ten || '(chưa đặt tên)')}</b>
        <small>SL ${nf.format(+m.sl || 1)} · ${esc(m.phong || 'Chưa ghi phòng')}${m.dv && UNIT[m.dv] ? ' · ' + esc(UNIT[m.dv].sheet) : ''}</small>
        <small><span class="tag tsm-tag">Tạo bởi: ${esc(m.tao_boi || 'chưa rõ nhóm')}</span></small>
        <small>${esc(whoLabel(m.by) || m.by || '')}${m.at ? ' · ' + ddmmyy(m.at) : ''}</small>
        ${a ? `<small class="tsm-noi">${ic('CircleCheck')}Đã vào sổ: <a href="#ts-${encodeURIComponent(k)}">${esc(a.ma || k)} · ${esc(a.short || a.ten)}</a></small>`
          : `<small class="tsm-cho">${m.ma ? 'Chờ vào sổ (Mã TSCĐ này chưa có trong file BBKK)' : 'Chưa vào sổ'}</small>`}</div>
      <div class="at-b">${sua ? `${kho ? `<button type="button" class="btn sm pri" data-tsm="anh">${ic('ImagePlus')}Thêm, xoá ảnh</button>` : ''}<button type="button" class="btn sm" data-tsm="sua">${ic('PenLine')}Sửa</button><button type="button" class="btn sm tsm-xoa" data-tsm="xoa">${TSM.xoa === m.id ? 'Bấm lần nữa để xoá' : 'Xoá'}</button>`
        : anh.length && kho ? `<button type="button" class="btn sm" data-tsm="anh">${ic('Images')}Xem ảnh</button>` : ''}</div>
    </article>`;
  }
  function ketQua() {
    const l = loc(), show = l.slice(0, TSM.lim), con = l.length - show.length;
    const dem = `<b class="num">${nf.format(l.length)}</b> tài sản mới${TSM.loc === 'chua' ? ' chưa vào sổ' : TSM.loc === 'noi' ? ' đã vào sổ' : ''}${TSM.tag ? ' · tạo bởi ' + esc(TSM.tag) : ''}`;
    const coTS = Object.keys(S.moi || {}).length > 0;
    const than = !l.length ? `<div class="empty">${TSM.q.trim() || TSM.tag ? 'Không có tài sản mới nào khớp bộ lọc.' : TSM.loc === 'noi' ? 'Chưa có tài sản mới nào vào sổ.'
      : TSM.loc === 'chua' && coTS ? 'Mọi tài sản mới đều đã vào sổ (xem ở “Đã vào sổ”).' : 'Chưa có tài sản mới nào.' + (g.moiDuocTao() ? ' Bấm “Tạo tài sản mới”.' : '')}</div>`
      : `<div class="at-luoi tsm-luoi">${show.map(theHTML).join('')}</div>${con > 0 ? `<div class="lmorebtn"><button type="button" class="btn" data-tsm="them">Xem thêm ${nf.format(Math.min(LIM, con))} tài sản</button></div>` : ''}`;
    return { dem, than };
  }
  function formHTML(m) {
    const moi = !m, ad = dangNhap() && DN.laQuanTri(), v = k => esc(m && m[k] != null ? m[k] : '');
    const nhom = moi ? (dangNhap() && DN.toi ? DN.toi.nhom || '' : '') : (m.tao_boi || '');
    const tags = [...new Set((g.NHOM_GOI_Y || []).concat(ds().map(x => x.tao_boi).filter(Boolean)))];
    return `<form class="ql-form tsm-form" id="tsmForm" novalidate>
      <h2>${moi ? 'Tạo tài sản mới' : 'Sửa: ' + esc(m.ten || '')}</h2>
      <div class="ql-f tsm-f">
        <div class="fld tsm-ten"><label for="tsmTen">Tên tài sản (bắt buộc)</label><input class="in" id="tsmTen" value="${v('ten')}" maxlength="200" autocomplete="off" required aria-required="true" placeholder="vd. Máy chiếu Epson EB-X51"></div>
        <div class="fld"><label for="tsmSl">Số lượng</label><input class="in" id="tsmSl" type="number" min="1" step="1" inputmode="numeric" value="${m ? esc(m.sl || 1) : 1}"></div>
        <div class="fld"><label for="tsmPhong">Phòng / vị trí</label><input class="in" id="tsmPhong" list="dl-phong" value="${v('phong')}" maxlength="80" autocomplete="off" placeholder="vd. 202 Gamma"></div>
        <div class="fld"><label for="tsmDv">Phòng ban, bộ môn sử dụng</label><select class="in" id="tsmDv"><option value="">Chưa rõ</option>${UNITS.filter(u => !u.review).map(u => `<option value="${u.id}" ${m && m.dv === u.id ? 'selected' : ''}>${esc(u.sheet)} · ${esc(u.ten)}</option>`).join('')}</select></div>
        <div class="fld"><label for="tsmMa">Mã TSCĐ (nếu đã có)</label><input class="in mono" id="tsmMa" value="${v('ma')}" maxlength="40" autocomplete="off" placeholder="để trống nếu kế toán chưa cấp"></div>
        <div class="fld"><label for="tsmNgay">Ngày bắt đầu sử dụng</label><input class="in" id="tsmNgay" type="date" value="${v('ngay')}"></div>
        <div class="fld"><label for="tsmGia">Nguyên giá (đồng)</label><input class="in" id="tsmGia" type="number" min="0" step="1" inputmode="numeric" value="${m && m.gia ? esc(m.gia) : ''}"></div>
        <div class="fld tsm-ghi"><label for="tsmGhi">Ghi chú</label><input class="in" id="tsmGhi" value="${v('ghi_chu')}" maxlength="300" autocomplete="off" placeholder="vd. nhà cung cấp, số hợp đồng, bảo hành"></div>
        ${ad ? `<div class="fld"><label for="tsmTag">Tạo bởi (tag)</label><input class="in" id="tsmTag" list="dlTsmTag" value="${esc(nhom)}" maxlength="60" autocomplete="off"><datalist id="dlTsmTag">${tags.map(t => `<option value="${esc(t)}"></option>`).join('')}</datalist></div>
        <div class="fld"><label for="tsmNoiIn">Nối tay với tài sản trong sổ (Mã TSCĐ)</label><input class="in mono" id="tsmNoiIn" value="${v('noi')}" maxlength="40" autocomplete="off" placeholder="chỉ khi Mã TSCĐ ở trên không trùng"></div>` : ''}
      </div>
      ${ad ? '' : `<p class="note">Tag “Tạo bởi”: <b>${esc(nhom || 'chưa có nhóm')}</b> — theo nhóm tài khoản${moi ? ' của bạn' : ' của người tạo'} (quản trị đặt ở Chung › Quản lý).</p>`}
      <p class="dn-loi" id="tsmLoi" role="alert"></p>
      <div class="ql-b"><button type="submit" class="btn pri">${ic('Check')}${moi ? (g.anhCoKho && g.anhCoKho() ? 'Tạo và thêm ảnh' : 'Tạo tài sản') : 'Lưu'}</button><button type="button" class="btn" data-tsm="huy">Huỷ</button></div>
    </form>`;
  }
  g.viewTaiSanMoi = function () {
    bind();
    const all = ds(), noi = all.filter(m => g.moiNoi(m)), chua = all.length - noi.length, tao = g.moiDuocTao();
    const nAnh = all.reduce((t, m) => t + (m.anh || []).length, 0), tags = [...new Set(all.map(m => m.tao_boi || '').filter(Boolean))].sort((x, y) => x.localeCompare(y, 'vi'));
    const r = ketQua(), toi = dangNhap() ? DN.toi : null;
    const quyen = !dangNhap() ? 'Đăng nhập chưa bật: ai mở trang cũng tạo, sửa được; ảnh dùng được khi đã bật đăng nhập.'
      : toi.quyen === 'moi' ? `Bạn có quyền <b>Tạo tài sản mới</b>: tạo tài sản vừa mua, sửa và thêm ảnh cho tài sản <b>do chính bạn tạo</b>; tài sản trong file BBKK chỉ xem. Tag “Tạo bởi” theo nhóm tài khoản của bạn: <b>${esc(toi.nhom || 'chưa có nhóm — nhờ quản trị đặt')}</b>.`
        : DN.laQuanTri() ? 'Quản trị: sửa, xoá, đổi tag “Tạo bởi”, nối tay với tài sản trong sổ cho mọi tài sản mới.'
          : tao ? 'Bạn tạo được tài sản mới; chỉ sửa, xoá tài sản do chính bạn tạo.' : 'Tài khoản Tra cứu: chỉ xem.';
    const f = TSM.sua === 'moi' ? formHTML(null) : TSM.sua && S.moi && S.moi[TSM.sua] ? formHTML(S.moi[TSM.sua]) : '';
    app.innerHTML = `${demoBanner()}
    ${banner('phong-lab', 'Chung', 'Tài sản mới', 'Tài sản vừa mua, chưa có trong file BBKK: cán bộ mua sắm, giảng viên… tạo ngay trên app kèm ảnh, để người quản lý tài sản nhận ra tài sản bằng hình dáng, màu sắc. Khi kế toán ghi sổ (file BBKK có Mã TSCĐ trùng), app tự nối: ảnh hiện ở tài sản trong sổ.')}
    <div class="ch-note">${ic('Info')}<div>${quyen} Tài sản chưa vào sổ được gộp vào sheet “Tài sản phát sinh” khi xuất file cho kế toán (cột Nguồn: Tạo bởi …); file BBKK gốc giữ nguyên.</div></div>
    <div class="ns-sum tsm-sum">
      <div><small>Chưa vào sổ</small><b class="num">${nf.format(chua)}</b><span>chờ kế toán ghi sổ · xuất ở sheet “Tài sản phát sinh”</span></div>
      <div><small>Đã vào sổ</small><b class="num">${nf.format(noi.length)}</b><span>đã có trong file BBKK, ảnh hiện ở tài sản trong sổ</span></div>
      <div><small>Ảnh</small><b class="num">${nf.format(nAnh)}</b><span>ảnh của tài sản mới</span></div>
    </div>
    ${f}
    <div class="tools tsm-tools">
      ${tao && TSM.sua !== 'moi' ? `<button type="button" class="btn pri" data-tsm="tao">${ic('PackagePlus')}Tạo tài sản mới</button>` : ''}
      <div class="seg" role="group" aria-label="Lọc theo vào sổ">${[['chua', 'Chưa vào sổ', chua], ['noi', 'Đã vào sổ', noi.length], ['', 'Tất cả', all.length]].map(([k, t, n]) => `<button type="button" data-tsm="loc" data-v="${k}" aria-pressed="${TSM.loc === k}">${t} <em class="num">${nf.format(n)}</em></button>`).join('')}</div>
      <select class="in" id="tsmTagLoc" aria-label="Tạo bởi"><option value="">Mọi nhóm tạo</option>${tags.map(t => `<option value="${esc(t)}" ${TSM.tag === t ? 'selected' : ''}>Tạo bởi: ${esc(t)}</option>`).join('')}</select>
      <label class="sbox search">${ic('Search')}<input class="in" id="tsmQ" type="search" placeholder="Tìm tên, mã, phòng, người tạo…" value="${esc(TSM.q)}" aria-label="Tìm tài sản mới"></label>
    </div>
    <p class="dm-sum" id="tsmDem">${r.dem}</p>
    <div id="tsmKq">${r.than}</div>`;
    if (g.anhVeBia) g.anhVeBia(document.getElementById('tsmKq'));
    if (f) setTimeout(() => { const i = document.getElementById('tsmTen'); if (i) { i.focus(); i.scrollIntoView({ block: 'center' }); } }, 30);
  };
  function ve() {   // chỉ vẽ lại phần kết quả (giữ con trỏ trong ô tìm)
    const k = document.getElementById('tsmKq'), d = document.getElementById('tsmDem'); if (!k) return;
    const r = ketQua(); d.innerHTML = r.dem; k.innerHTML = r.than; if (g.anhVeBia) g.anhVeBia(k);
  }

  function luu() {
    const loi = t => { const p = document.getElementById('tsmLoi'); if (p) p.textContent = t; };
    const val = id => (document.getElementById(id)?.value || '').trim();
    const ten = val('tsmTen').replace(/\s+/g, ' '), sl = Math.round(+val('tsmSl')), ma = val('tsmMa').replace(/\s+/g, ''), giaS = val('tsmGia'), gia = giaS === '' ? 0 : +giaS;
    if (!ten) { loi('Nhập tên tài sản.'); document.getElementById('tsmTen')?.focus(); return; }
    if (!(sl >= 1)) { loi('Số lượng phải từ 1 trở lên.'); document.getElementById('tsmSl')?.focus(); return; }
    if (!(gia >= 0)) { loi('Nguyên giá chưa đúng (chỉ ghi số, đơn vị đồng).'); document.getElementById('tsmGia')?.focus(); return; }
    const ad = dangNhap() && DN.laQuanTri(), noiIn = ad ? val('tsmNoiIn').replace(/\s+/g, '') : '';
    if (noiIn && !chuanMa(noiIn)) { loi(`Mã TSCĐ ${noiIn} không có trong file BBKK hiện tại, chưa nối được.`); document.getElementById('tsmNoiIn')?.focus(); return; }
    const o = { ten, sl, phong: val('tsmPhong').replace(/\s+/g, ' '), dv: val('tsmDv'), ma, ngay: val('tsmNgay'), gia, ghi_chu: val('tsmGhi') };
    S.moi = S.moi || {};
    const tao = TSM.sua === 'moi'; let id = TSM.sua;
    if (tao) {
      if (!g.moiDuocTao()) { loi('Tài khoản của bạn chưa được tạo tài sản mới.'); return; }
      id = moiId();
      const toi = dangNhap() ? DN.toi : null;
      S.moi[id] = Object.assign(o, { anh: [], uid: toi ? toi.uid : '', tao_boi: ad ? val('tsmTag').replace(/\s+/g, ' ') : (toi ? toi.nhom || '' : ''), by: ME || '', at: Date.now() });
      if (noiIn) S.moi[id].noi = noiIn;
    } else {
      const m = S.moi[id]; if (!m || !g.moiDuocSua(m)) { loi('Bạn chỉ sửa được tài sản mới do chính mình tạo.'); return; }
      Object.assign(m, o);
      if (ad) { m.tao_boi = val('tsmTag').replace(/\s+/g, ' '); if (noiIn) m.noi = noiIn; else delete m.noi; }
    }
    save(); g.moiXoaCache(); TSM.sua = ''; TSM.xoa = '';
    const k = g.moiNoi(S.moi[id]); render();
    toast(tao ? (k ? 'Đã tạo. Mã TSCĐ này đã có trong file BBKK: tài sản được nối, ảnh sẽ hiện ở tài sản trong sổ.' : 'Đã tạo tài sản mới. Thêm ảnh để mọi người nhận ra tài sản.') : 'Đã lưu');
    if (tao && g.anhCoKho && g.anhCoKho()) g.moAnhMoi(id);
  }
  async function xoa(id, b) {
    const m = (S.moi || {})[id]; if (!m || !g.moiDuocSua(m)) return;
    if (TSM.xoa !== id) { TSM.xoa = id; b.textContent = 'Bấm lần nữa để xoá'; return; }
    b.disabled = true;
    const tep = (m.anh || []).flatMap(x => [x.p, x.n]).filter(Boolean);
    try { if (tep.length && g.anhCoKho && g.anhCoKho()) await DN.api.anh.xoa(tep); }   // xoá tệp ảnh trước (máy chủ chỉ cho khi tài sản còn)
    catch (e) { toast('Không xoá được ảnh: ' + dnLoi(e)); b.disabled = false; return; }
    delete S.moi[id]; save(); g.moiXoaCache(); TSM.xoa = ''; render(); toast('Đã xoá tài sản mới');
  }
  function bind() {
    if (bind.ok) return; bind.ok = true;
    app.addEventListener('click', e => {
      const b = e.target.closest('[data-tsm]'); if (!b || V.type !== 'tsm') return;
      const v = b.dataset.tsm, the = b.closest('[data-moi]'), id = the ? the.dataset.moi : '', m = id ? (S.moi || {})[id] : null;
      if (v === 'tao') { TSM.sua = 'moi'; TSM.xoa = ''; render(); return; }
      if (v === 'huy') { TSM.sua = ''; render(); return; }
      if (v === 'loc') { TSM.loc = b.dataset.v; TSM.lim = LIM; render(); return; }
      if (v === 'them') { TSM.lim += LIM; ve(); return; }
      if (!m) return;
      if (v === 'sua') { TSM.sua = id; TSM.xoa = ''; render(); return; }
      if (v === 'xoa') { xoa(id, b); return; }
      if (v === 'anh') {
        if (!(g.anhCoKho && g.anhCoKho())) { toast('Ảnh dùng được khi trang đã bật đăng nhập'); return; }
        if (g.moiDuocSua(m)) g.moAnhMoi(id); else if ((m.anh || []).length) g.xemAnhDs(m.anh, 0, String(m.ma || 'tai-san-moi'), m.ten || 'Tài sản mới');
      }
    });
    app.addEventListener('submit', e => { if (e.target.id === 'tsmForm') { e.preventDefault(); luu(); } });
    app.addEventListener('input', e => { if (e.target.id === 'tsmQ' && V.type === 'tsm') { TSM.q = e.target.value; TSM.lim = LIM; clearTimeout(app._tsm); app._tsm = setTimeout(ve, 200); } });
    app.addEventListener('change', e => { if (e.target.id === 'tsmTagLoc' && V.type === 'tsm') { TSM.tag = e.target.value; TSM.lim = LIM; render(); } });
  }
})();
