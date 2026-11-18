/* Giám sát hoạt động tài khoản — phần Lịch sử (người dùng chốt 18/11/2026: "phần lịch sử là một trong những phần quan trọng của
   app… giám sát hành động của các tài khoản khác"; tham khảo Google Workspace (Audit and investigation, reporting rules) và
   Microsoft 365 (alert policy "xoá số lượng tệp bất thường")):
   - Mỗi dòng lịch sử có đủ: họ tên, tên đăng nhập, chức danh / nhóm, quyền, thiết bị, IP, giờ máy chủ — MÁY CHỦ ĐÓNG DẤU (trigger
     dong_dau_lich_su trong dang-nhap.sql) nên không ai ghi giả tên người khác; không ai sửa / xoá lịch sử của người khác.
   - Quản trị xem của mọi người; người khác chỉ xem của mình (máy chủ chặn: xem_lich_su). Lý lịch tài sản vẫn đủ cho mọi người.
   - Phân loại hành động: tạo / sửa / xoá / xuất, tải / đăng nhập / quản trị tài khoản (gsPhanLoai, ghi kèm mỗi dòng).
   - CẢNH BÁO (chỉ quản trị thấy — quy tắc vàng 16; KHÔNG chặn thao tác của ai; không tính thao tác của chính người xem; xét 7 ngày):
     xoá nhiều / liên tục · thay đổi hàng loạt, ghi đè kết quả người khác · thao tác nhạy cảm, xuất / tải nhiều · giờ lạ, thiết bị lạ.
     Báo bằng thanh đầu trang + số đỏ ở Lịch sử; "Đã xem" lưu trên máy chủ (col 'cb', chỉ quản trị) để mọi máy của quản trị cùng biết.
   Dùng lại LOGMINE, logOnline(), DB, DN, ME, KEY, V, LV, app, render(), ic(), esc(), nf, hh(), ddmmyy() của index.html. */
(function () {
  const g = window;

  /* ---------- loại hành động ---------- */
  g.HD = { tao: ['Tạo, thêm', 'CirclePlus'], sua: ['Sửa, ghi kết quả', 'PenLine'], xoa: ['Xoá, bỏ', 'Trash2'], xuat: ['Xuất, tải dữ liệu', 'Download'],
    vao: ['Đăng nhập, đăng xuất', 'LogIn'], qtri: ['Quản trị tài khoản', 'UserCog'] };
  const QTRI = /thành viên|quyền|Khoá tài khoản|Mở khoá tài khoản|mật khẩu|mã 6 số|xác thực 2 bước|khoá dữ liệu|chức danh|nhóm tài khoản|mọi thiết bị/i;
  const NHAY_CAM = /Đổi quyền|Khoá tài khoản|Mở khoá tài khoản|Đặt lại mật khẩu|Miễn mã 6 số|Sao chép khoá|Tắt xác thực 2 bước|Thêm thành viên|Xoá khỏi danh bạ/i;
  // số mục bị xoá / bỏ trong một dòng lịch sử (kể cả dòng gộp nhiều tài sản: "mã · tên: câu 1; câu 2")
  function soXoa(lines) {
    let n = 0;
    (lines || []).forEach(l => {
      let s = String(l);
      s = s.replace(/Xoá (\d+) ảnh/g, (m, k) => { n += +k; return ''; });
      n += (s.match(/(^|[;:] )(Xoá|Bỏ )/g) || []).length + (s.match(/→ Chưa kiểm/g) || []).length;
    });
    return n;
  }
  g.gsPhanLoai = e => {
    const t = String((e && e.title) || ''), L = (e && e.lines) || [], sx = soXoa(L) + (/^(Xoá|Bỏ )/.test(t) ? 1 : 0);
    const hd = e.kind === 'xuat' || /^(Xuất|Tải)/.test(t) ? 'xuat' : /^(Đăng nhập|Đăng xuất)/.test(t) ? 'vao'
      : e.kind === 'chung' && QTRI.test(t) ? 'qtri' : sx ? 'xoa'
        : /^(Tạo|Thêm)/.test(t) || L.some(l => /^(Tạo tài sản mới|Thêm tài sản phát sinh|Thêm \d+ ảnh|Đưa vào mục)/.test(String(l))) ? 'tao' : 'sua';
    return { hd, sx, nc: NHAY_CAM.test(t) ? 1 : 0 };
  };
  g.gsHd = e => (e && e.hd) || g.gsPhanLoai(e || {}).hd;

  /* ---------- luật cảnh báo (hàm thuần: thử được bằng dữ liệu giả) ---------- */
  g.GS_LOAI = {
    xoa: ['Xoá nhiều, xoá liên tục', 'Trash2', 'cao'], 'hang-loat': ['Thay đổi hàng loạt', 'Layers', 'vua'], 'ghi-de': ['Ghi đè kết quả người khác', 'Replace', 'vua'],
    'nhay-cam': ['Thao tác nhạy cảm', 'ShieldAlert', 'cao'], xuat: ['Xuất, tải dữ liệu nhiều', 'Download', 'vua'],
    'gio-la': ['Thao tác giờ lạ (22:00–6:00)', 'Moon', 'vua'], 'thiet-bi': ['Thiết bị lạ', 'MonitorSmartphone', 'cao'],
  };
  g.GS_NGUONG = { xoaMuc: 5, xoaLan: 3, xoaPhut: 10, hangLoat: 30, xuatLan: 5, xuatPhut: 60, dem: [22, 6] };
  const AI = e => e.uid || ('ten:' + (e.by || ''));
  const LUC = e => +(e.ts || e.t0 || e.t) || 0;
  function cum(l, gap) {   // gom các dòng liên tiếp cách nhau không quá gap
    const out = []; let c = null;
    l.forEach(e => { if (c && LUC(e) - LUC(c[c.length - 1]) <= gap) c.push(e); else { c = [e]; out.push(c); } });
    return out;
  }
  function truot(l, win, min) {   // cụm có ít nhất min dòng nằm trong một khoảng win
    const out = []; let i = 0;
    while (i < l.length) {
      let j = i; while (j + 1 < l.length && LUC(l[j + 1]) - LUC(l[i]) <= win) j++;
      if (j - i + 1 >= min) { let k = j; while (k + 1 < l.length && LUC(l[k + 1]) - LUC(l[k]) <= win) k++; out.push(l.slice(i, k + 1)); i = k + 1; } else i++;
    }
    return out;
  }
  const gioCua = t => new Date(t).getHours();
  g.gsLuat = function (ds, o) {
    o = o || {}; const N = g.GS_NGUONG, theo = new Map();
    ds.forEach(e => { if (!e || (o.boQua && o.boQua(e))) return; const k = AI(e); if (!theo.has(k)) theo.set(k, []); theo.get(k).push(Object.assign({}, e, e.hd ? {} : g.gsPhanLoai(e))); });
    const cb = [];
    for (const [k, l0] of theo) {
      const l = l0.sort((x, y) => LUC(x) - LUC(y)), cuoi = l[l.length - 1];
      const nguoi = { uid: cuoi.uid || '', by: cuoi.by || '', tk: cuoi.tk || '', cd: cuoi.cd || '', quyen: cuoi.quyen || '' };
      const them = (loai, c, chiTiet) => cb.push({ id: loai + ':' + k + ':' + c[0].id, loai, nguoi, t0: LUC(c[0]), t1: LUC(c[c.length - 1]), ids: c.map(x => x.id), chiTiet });
      cum(l.filter(e => e.sx > 0), N.xoaPhut * 60000).forEach(c => { const n = c.reduce((s, e) => s + e.sx, 0); if (n >= N.xoaMuc || c.length >= N.xoaLan) them('xoa', c, `${n} mục bị xoá / bỏ qua ${c.length} lần thao tác`); });
      l.filter(e => (+e.bulk || 0) >= N.hangLoat).forEach(e => them('hang-loat', [e], `Một lần đổi ${e.bulk} mục: ${e.title || ''}`));
      cum(l.filter(e => e.de), 60 * 60000).forEach(c => them('ghi-de', c, `Sửa kết quả kiểm người khác đã ghi ${c.length} lần (người ghi trước: ${[...new Set(c.map(e => e.de))].join(', ')})`));
      l.filter(e => e.nc).forEach(e => them('nhay-cam', [e], (e.title || '') + ((e.lines || []).length ? ' — ' + e.lines.join('; ') : '')));
      truot(l.filter(e => (e.hd || '') === 'xuat'), N.xuatPhut * 60000, N.xuatLan).forEach(c => them('xuat', c, `${c.length} lần xuất / tải dữ liệu trong khoảng ${N.xuatPhut} phút`));
      const dem = l.filter(e => { const h = gioCua(LUC(e)); return h >= N.dem[0] || h < N.dem[1]; }), theoDem = new Map();
      dem.forEach(e => { const d = new Date(LUC(e) - 6 * 3600e3).toDateString(); if (!theoDem.has(d)) theoDem.set(d, []); theoDem.get(d).push(e); });
      theoDem.forEach(c => them('gio-la', c, `${c.length} thao tác lúc ${hh(LUC(c[0]))}${c.length > 1 ? '–' + hh(LUC(c[c.length - 1])) : ''}`));
      l.filter(e => e.tbmoi).forEach(e => them('thiet-bi', [e], `Thiết bị / trình duyệt chưa từng dùng: ${e.tb || 'không rõ'}${e.ip ? ' · IP ' + e.ip : ''}`));
    }
    return cb.sort((a, b) => b.t1 - a.t1);
  };

  /* ---------- dữ liệu cảnh báo cho quản trị (7 ngày gần nhất) ---------- */
  const NGAY = 7 * 864e5;
  const idMoc = t => Math.floor(t).toString(36).padStart(9, '0');   // id lịch sử bắt đầu bằng thời gian (cơ số 36)
  g.gsIdMoc = idMoc;
  const laQT = () => !!(g.DN && DN.cai && DN.toi && DN.laQuanTri());
  g.GS = { logs: new Map(), tai: false, dang: false, cb: [], xem: { ids: [] }, xemTai: false, luc: 0, loi: '' };
  const xemId = () => 'xem-' + ((DN.toi && DN.toi.uid) || 'toi');
  async function taiXem() {
    GS.xemTai = true;
    try { const v = JSON.parse(localStorage.getItem(KEY + '.cbXem') || 'null'); if (v && Array.isArray(v.ids)) GS.xem = v; } catch (e) { }
    try { if (logOnline() && DB.doc) { const d = await DB.doc('cb/' + xemId()).get(); if (d && Array.isArray(d.ids)) GS.xem = { ids: [...new Set(d.ids.concat(GS.xem.ids))] }; } } catch (e) { }
  }
  function luuXem() {
    GS.xem = { ids: GS.xem.ids.slice(-800), at: Date.now() };
    try { localStorage.setItem(KEY + '.cbXem', JSON.stringify(GS.xem)); } catch (e) { }
    if (logOnline() && DB.doc) DB.doc('cb/' + xemId()).set(GS.xem).catch(() => { });
  }
  const tinh = () => { GS.cb = g.gsLuat([...GS.logs.values()], { boQua: e => e.uid ? e.uid === DN.toi.uid : (!!ME && e.by === ME) || e.dev === DEV }); };
  g.gsTai = async function () {
    if (!laQT() || GS.dang) return; GS.dang = true;
    const moc = idMoc(Date.now() - NGAY);
    try {
      if (logOnline()) {
        let before = null;
        for (let i = 0; i < 6; i++) {   // mới trước cũ sau, tối đa 6 000 dòng trong 7 ngày
          const r = await DB.recent('log', { limit: 1000, after: moc, before });
          r.forEach(x => { if (x && x.data && typeof x.data === 'object') GS.logs.set(x.id, Object.assign({}, x.data, { id: x.id })); });
          if (r.length < 1000) break; before = r[r.length - 1].id;
        }
      }
      LOGMINE.forEach(e => { if (e.id >= moc) GS.logs.set(e.id, e); });
      for (const id of [...GS.logs.keys()]) if (id < moc) GS.logs.delete(id);
      if (!GS.xemTai) await taiXem();
      tinh(); GS.loi = '';
    } catch (e) { GS.loi = 'Chưa tải được dữ liệu cảnh báo (kiểm tra mạng).'; }
    GS.luc = Date.now(); GS.tai = true; GS.dang = false; capNhat();
    if (V.type === 'log' && typeof logDraw === 'function') logDraw();
  };
  g.gsChuaXem = () => GS.cb.filter(c => !GS.xem.ids.includes(c.id));
  g.gsXem = ids => { ids.forEach(id => { if (!GS.xem.ids.includes(id)) GS.xem.ids.push(id); }); luuXem(); capNhat(); };
  // cảnh báo của một dòng lịch sử (để gắn nhãn đỏ vào dòng đó)
  g.gsCuaDong = id => GS.cb.filter(c => c.ids.includes(id));

  /* ---------- số đỏ ở mục Lịch sử + thanh báo đầu trang (chỉ quản trị) ---------- */
  function capNhat() {
    const n = laQT() ? g.gsChuaXem().length : 0;
    document.querySelectorAll('#swLS, .top2 a[data-r="lich-su"]').forEach(a => {
      a.querySelector('.gs-n')?.remove();
      if (n) a.insertAdjacentHTML('beforeend', `<span class="gs-n"><span aria-hidden="true">${n > 99 ? '99+' : n}</span><span class="vh"> (${n} cảnh báo hoạt động chưa xem)</span></span>`);
    });
    g.gsBao();
  }
  g.gsCapNhat = capNhat;
  g.gsBao = function () {
    if (!laQT()) return;
    if (!GS.tai && !GS.dang && READY) { g.gsTai(); return; }
    document.getElementById('gsBao')?.remove();
    const l = g.gsChuaXem(); if (!l.length || V.type === 'log') return;
    let an = 0; try { an = +sessionStorage.getItem('kiemke-gs-an') || 0; } catch (e) { }
    if (an && an >= l.length) return;
    const tom = l.slice(0, 2).map(c => `<b>${esc(GS_LOAI[c.loai][0])}</b> — ${esc(c.nguoi.by || c.nguoi.tk || 'không rõ')}${c.nguoi.cd ? ' (' + esc(c.nguoi.cd) + ')' : ''}, ${ddmmyy(c.t1)}`).join(' · ');
    app.insertAdjacentHTML('afterbegin', `<div class="ch-note warn gs-bao" id="gsBao" role="status">${ic('ShieldAlert')}<div><b>${l.length} cảnh báo hoạt động chưa xem</b> (chỉ để bạn nắm tình hình, không chặn thao tác của ai): ${tom}${l.length > 2 ? ' …' : ''} · <a href="#lich-su" data-gs="mocb">Xem cảnh báo</a> · <button type="button" class="lnk" data-gs="an">Để sau</button></div></div>`);
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-gs]'); if (!b) return;
    const v = b.dataset.gs;
    if (v === 'an') { try { sessionStorage.setItem('kiemke-gs-an', String(g.gsChuaXem().length)); } catch (er) { } document.getElementById('gsBao')?.remove(); return; }
    if (v === 'mocb') { LV.tab = 'cb'; if (V.type === 'log') render(); return; }   // link #lich-su tự chuyển trang
    if (v === 'tab') { LV.tab = b.dataset.v; render(); return; }
    if (v === 'xem') { g.gsXem([b.dataset.id]); render(); return; }
    if (v === 'xemhet') { g.gsXem(g.gsChuaXem().map(c => c.id)); render(); toast('Đã đánh dấu đã xem mọi cảnh báo'); return; }
    if (v === 'loc') {   // xem các thao tác của cảnh báo / của một tài khoản
      LV.tab = 'ds'; LV.tk = b.dataset.uid || ''; LV.tkTen = b.dataset.by || ''; LV.chiDong = b.dataset.ids ? b.dataset.ids.split(',') : null;
      LV.tg = b.dataset.tg || '7'; LV.need = true; render(); window.scrollTo(0, 0); return;
    }
    if (v === 'bochi') { LV.chiDong = null; render(); return; }
  });
  setInterval(() => { if (laQT() && GS.tai && !document.hidden) g.gsTai(); }, 5 * 60000);

  /* ---------- khung "Cảnh báo" và "Theo tài khoản" trong trang Lịch sử (quản trị) ---------- */
  const QUYEN_NGAN = { admin: 'Quản trị', kiem: 'Kiểm kê', moi: 'Tạo tài sản mới', xem: 'Tra cứu' };
  g.gsQuyenNgan = q => QUYEN_NGAN[q] || '';
  const ai = n => `<b>${esc(n.by || n.tk || 'không rõ')}</b>${n.tk ? ` <span class="mono gs-tk">@${esc(n.tk)}</span>` : ''}${n.cd ? ` <span class="tag gs-cd">${esc(n.cd)}</span>` : ''}${n.quyen ? ` <span class="tag">${esc(QUYEN_NGAN[n.quyen] || n.quyen)}</span>` : ''}`;
  g.gsAiHTML = ai;
  g.gsCanhBaoHTML = function () {
    if (!GS.tai) return `<div class="empty">${GS.dang ? 'Đang xét lịch sử 7 ngày gần nhất…' : 'Chưa tải dữ liệu cảnh báo.'}</div>`;
    const chua = g.gsChuaXem(), N = g.GS_NGUONG;
    const the = c => { const [ten, icn, muc] = GS_LOAI[c.loai], moi = !GS.xem.ids.includes(c.id);
      return `<li class="gs-cb muc-${muc}${moi ? ' moi' : ''}" data-cb="${esc(c.id)}">
        <span class="gs-ic" aria-hidden="true">${ic(icn)}</span>
        <div><div class="gs-dau"><b>${esc(ten)}</b><span class="tag ${muc === 'cao' ? 'bad' : 'warn'}">${muc === 'cao' ? 'Mức cao' : 'Cần chú ý'}</span>${moi ? '<span class="tag info">Chưa xem</span>' : ''}</div>
          <div class="gs-ai">${ai(c.nguoi)}</div>
          <p>${esc(c.chiTiet)}</p>
          <small class="num">${ddmmyy(c.t0)}${c.t1 - c.t0 > 59000 ? ' – ' + hh(c.t1) : ''} · ${c.ids.length} dòng lịch sử</small>
          <div class="gs-b"><button type="button" class="btn sm" data-gs="loc" data-uid="${esc(c.nguoi.uid)}" data-by="${esc(c.nguoi.by)}" data-ids="${esc(c.ids.join(','))}">${ic('ListFilter')}Xem các thao tác</button>${moi ? `<button type="button" class="btn sm" data-gs="xem" data-id="${esc(c.id)}">${ic('Check')}Đã xem</button>` : ''}</div></div></li>`; };
    return `<div class="ch-note">${ic('Info')}<div>Cảnh báo chỉ để bạn nắm tình hình, <b>không chặn thao tác</b> của ai. Xét lịch sử <b>7 ngày gần nhất</b> của mọi tài khoản trừ chính bạn; tự cập nhật 5 phút một lần.
      Luật: xoá ≥ ${N.xoaMuc} mục hoặc ≥ ${N.xoaLan} lần xoá cách nhau ≤ ${N.xoaPhut} phút · một lần đổi ≥ ${N.hangLoat} mục · sửa kết quả người khác đã ghi · đổi quyền, khoá, đặt lại mật khẩu, miễn mã 6 số, sao chép khoá dữ liệu, thêm thành viên, xoá danh bạ · ≥ ${N.xuatLan} lần xuất / tải trong ${N.xuatPhut} phút · thao tác từ ${N.dem[0]}:00 đến ${N.dem[1]}:00 · thiết bị chưa từng dùng.</div></div>
      ${GS.loi ? `<div class="ch-note warn">${ic('TriangleAlert')}<div>${esc(GS.loi)}</div></div>` : ''}
      <div class="gs-tren"><span><b class="num">${nf.format(chua.length)}</b> chưa xem · ${nf.format(GS.cb.length)} cảnh báo trong 7 ngày</span>${chua.length ? `<button type="button" class="btn sm" data-gs="xemhet">${ic('CheckCheck')}Đã xem tất cả</button>` : ''}</div>
      ${GS.cb.length ? `<ol class="gs-ds">${chua.concat(GS.cb.filter(c => !chua.includes(c))).map(the).join('')}</ol>` : '<div class="empty">Không có cảnh báo nào trong 7 ngày gần nhất.</div>'}`;
  };
  g.gsTheoTaiKhoanHTML = function (tv) {
    if (!GS.tai) return `<div class="empty">${GS.dang ? 'Đang xét lịch sử 7 ngày gần nhất…' : 'Chưa tải dữ liệu.'}</div>`;
    const logs = [...GS.logs.values()], homNay = new Date().toDateString(), chua = g.gsChuaXem();
    const m = new Map();
    (tv || []).forEach(x => m.set(x.user_id, { uid: x.user_id, by: x.ho_ten || x.ten_dang_nhap, tk: x.ten_dang_nhap, cd: x.nhom || '', quyen: x.quyen, khoa: x.khoa, l: [] }));
    logs.forEach(e => { const k = e.uid || ('ten:' + (e.by || '')); if (!m.has(k)) m.set(k, { uid: e.uid || '', by: e.by || '', tk: e.tk || '', cd: e.cd || '', quyen: e.quyen || '', l: [] }); m.get(k).l.push(e); });
    const hang = [...m.values()].map(x => {
      const l = x.l, cuoi = l.reduce((a, e) => Math.max(a, LUC(e)), 0), tb = [...new Set(l.map(e => e.tb).filter(Boolean))], ip = [...new Set(l.map(e => e.ip).filter(Boolean))];
      return Object.assign(x, { nay: l.filter(e => new Date(LUC(e)).toDateString() === homNay).length, tuan: l.length, xoa: l.reduce((s, e) => s + ((e.sx != null ? e.sx : g.gsPhanLoai(e).sx) || 0), 0),
        cb: chua.filter(c => (c.nguoi.uid || ('ten:' + c.nguoi.by)) === (x.uid || ('ten:' + x.by))).length, cuoi, tb, ip });
    }).sort((a, b) => b.cb - a.cb || b.cuoi - a.cuoi || a.by.localeCompare(b.by, 'vi'));
    return `<p class="lnote">Thống kê 7 ngày gần nhất của từng tài khoản (thông số quản lý — chỉ tài khoản Quản trị thấy). Bấm “Xem thao tác” để lọc lịch sử của người đó.</p>
      <div class="tblwrap gs-tbl" tabindex="0" role="region" aria-label="Hoạt động theo từng tài khoản"><table><thead><tr><th>Tài khoản</th><th>Hôm nay</th><th>7 ngày</th><th>Mục bị xoá</th><th>Cảnh báo chưa xem</th><th>Hoạt động gần nhất</th><th>Thiết bị, IP (7 ngày)</th><th><span class="vh">Xem thao tác</span></th></tr></thead><tbody>${hang.map(x => `<tr>
        <td>${ai(x)}${x.khoa ? ' <span class="tag warn">Đã khoá</span>' : ''}</td><td class="num">${nf.format(x.nay)}</td><td class="num">${nf.format(x.tuan)}</td>
        <td class="num">${x.xoa ? `<b>${nf.format(x.xoa)}</b>` : '0'}</td><td class="num">${x.cb ? `<span class="tag bad">${nf.format(x.cb)}</span>` : '0'}</td>
        <td class="num">${x.cuoi ? ddmmyy(x.cuoi) : 'Chưa có trong 7 ngày'}</td><td><small>${esc(x.tb.join(' · ') || '—')}${x.ip.length ? '<br>IP ' + esc(x.ip.slice(0, 3).join(', ')) + (x.ip.length > 3 ? '…' : '') : ''}</small></td>
        <td>${x.uid || x.by ? `<button type="button" class="btn sm" data-gs="loc" data-uid="${esc(x.uid)}" data-by="${esc(x.by)}">${ic('ListFilter')}Xem thao tác</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
  };
})();
