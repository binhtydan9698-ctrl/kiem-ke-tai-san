/* Nút "⋯" (mở rộng) trên mỗi dòng tài sản — người dùng yêu cầu 15/11/2026: mã QR của tài sản + ảnh tải lên cho từng tài sản
   (mỗi tài sản tối đa ANH_TOI_DA ảnh), xem ảnh toàn màn hình kiểu Messenger (nền mờ, tải về / chia sẻ / đóng, mũi tên, dải ảnh nhỏ).
   - Ảnh lưu ở kho riêng tư Supabase Storage "anh-tai-san" (supabase/dang-nhap.sql): chỉ thành viên đã đăng nhập xem được, qua
     đường dẫn có hạn 1 giờ; Kiểm kê, Quản trị tải lên / xoá (máy chủ chặn theo quyền). Chưa bật đăng nhập → chưa dùng được ảnh.
   - Danh sách ảnh của từng tài sản ghi trong S.anh[stt] = {ds:[{p: ảnh, n: ảnh nhỏ, at, by}]} (col "anh", khoá Mã TSCĐ) để mọi
     máy thấy ngay và có lịch sử; không đưa vào file cho kế toán.
   - Ảnh thu nhỏ trước khi tải lên (cạnh dài ≤ 1600px, JPEG) + ảnh nhỏ 400px cho dải ảnh: tiết kiệm dung lượng (gói miễn phí ~1 GB).
   Dùng lại S, save(), refreshRow(), qrSvg(), KIEMKE_QR, esc(), ic(), toast(), DN của các file khác (chỉ gọi khi trang đã chạy). */
(function () {
  const g = window;
  const ANH_TOI_DA = 5, CANH = 1600, CANH_NHO = 400;
  const URLS = new Map();   // đường dẫn ảnh → {u, het}
  // hộp đang mở cho: tài sản trong sổ (stt) hoặc tài sản mới (moi = mã tài sản mới, tai-san-moi.js); số ảnh đang tải lên; ảnh đang hỏi xoá
  const XT = { stt: null, moi: null, dang: 0, xoa: '' };
  const LB = { ds: [], i: 0, ma: '' };            // trình xem ảnh

  const dsAnh = a => ((S.anh || {})[a.stt] || {}).ds || [];   // ảnh của chính tài sản trong sổ (thêm / xoá ở nút ⋯)
  // ảnh của tài sản mới đã vào sổ thành tài sản này (Mã TSCĐ trùng hoặc quản trị nối tay — người dùng chốt 17/11/2026: ảnh tự hiện)
  const dsNoi = a => (S.moi && typeof g.moiCuaTS === 'function' ? g.moiCuaTS(a) : []).flatMap(m => m.anh || []);
  const dsHien = a => dsAnh(a).concat(dsNoi(a));
  g.soAnh = a => dsHien(a).length;
  const coKho = () => !!(g.DN && DN.cai && DN.toi && DN.api && DN.api.anh);
  const duocTai = () => coKho() && DN.duocKiemKe() && !READONLY;
  const khoaTep = k => String(k).replace(/[^A-Za-z0-9._-]/g, '_');

  async function layUrl(paths) {
    const now = Date.now(), can = paths.filter(p => !(URLS.get(p) && URLS.get(p).het > now));
    if (can.length) {
      const m = await DN.api.anh.url(can);
      for (const p of can) if (m[p]) URLS.set(p, { u: m[p], het: now + 50 * 60000 });
    }
    return paths.map(p => (URLS.get(p) || {}).u || '');
  }

  // thu nhỏ ảnh trong trình duyệt → JPEG
  async function nen(file, max, q) {
    let src;
    try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) {
      src = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('Không đọc được ảnh ' + file.name + ' (định dạng không hỗ trợ)')); i.src = URL.createObjectURL(file); });
    }
    const w0 = src.width, h0 = src.height, k = Math.min(1, max / Math.max(w0, h0)), w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(src, 0, 0, w, h);
    return new Promise((ok, no) => c.toBlob(b => b ? ok(b) : no(new Error('Không nén được ảnh')), 'image/jpeg', q));
  }

  /* ---------- hộp "Mở rộng" của một tài sản ---------- */
  function hop() {
    let d = document.getElementById('xtDlg');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'xtDlg'; d.className = 'xt'; d.setAttribute('aria-labelledby', 'xtTieuDe');
      document.body.appendChild(d);
      d.addEventListener('click', e => { if (e.target === d) d.close(); xtClick(e); });
      d.addEventListener('change', xtChange);
      d.addEventListener('close', () => {
        const s = XT.stt, mo = XT.moi; XT.stt = null; XT.moi = null; XT.xoa = '';
        try {
          if (mo != null) { if (V.type === 'tsm' || V.type === 'anh') { const y = window.scrollY; render(); window.scrollTo(0, y); } return; }
          if (s == null) return;
          if (V.type === 'anh') avSauDong(s); else if (typeof refreshRow === 'function') refreshRow(s);
        } catch (er) { }
      });
    }
    return d;
  }
  // "mục" đang mở trong hộp: tài sản trong sổ hoặc tài sản mới — cùng cách thêm, xem, xoá ảnh
  function muc() {
    if (XT.moi != null) {
      const id = XT.moi, m = (S.moi || {})[id]; if (!m) return null;
      return { loai: 'moi', id, khoa: 'moi:' + id, ten: m.ten || 'Tài sản mới', ds: m.anh || [], noi: [],
        dau: `${m.ma ? `Mã TSCĐ <b class="mono">${esc(m.ma)}</b>` : 'Chưa có Mã TSCĐ'} · Tài sản mới${m.tao_boi ? ' · Tạo bởi ' + esc(m.tao_boi) : ''}`,
        sua: coKho() && typeof g.moiDuocSua === 'function' && g.moiDuocSua(m), thuMuc: 'moi/' + khoaTep(id), maXem: String(m.ma || 'tai-san-moi'),
        ghi: l => { if (S.moi[id]) S.moi[id].anh = l; } };
    }
    const a = BY_STT[XT.stt]; if (!a) return null;
    return { loai: 'ts', a, khoa: 'ts:' + a.stt, ten: a.short || a.ten, ds: dsAnh(a), noi: dsNoi(a),
      dau: `Mã TSCĐ <b class="mono">${esc(a.ma || 'không mã')}</b> · STT ${a.stt}`, sua: duocTai(), thuMuc: 'ts/' + khoaTep(a.key), maXem: String(a.ma || a.key),
      ghi: l => { S.anh = S.anh || {}; if (l.length) S.anh[a.stt] = { ds: l }; else delete S.anh[a.stt]; } };
  }
  g.moMoRong = function (a) {
    XT.stt = a.stt; XT.moi = null; XT.xoa = '';
    const d = hop(); veHop(); if (!d.open) d.showModal();
  };
  g.moAnhMoi = function (id) {   // ảnh của một tài sản mới (tai-san-moi.js)
    XT.moi = id; XT.stt = null; XT.xoa = '';
    const d = hop(); veHop(); if (!d.open) d.showModal();
  };
  const luoi = (ds, ten, sua, loai) => ds.map((x, i) => `<div class="xt-o"><button type="button" class="xt-thumb" data-xt="${loai}" data-i="${i}" aria-label="Xem ảnh ${i + 1}"><img data-p="${esc(x.n || x.p)}" alt="Ảnh ${i + 1} của ${esc(ten)}" loading="lazy"></button>
        ${sua ? `<button type="button" class="xt-xoa${XT.xoa === x.p ? ' hoi' : ''}" data-xt="xoa" data-i="${i}" aria-label="Xoá ảnh ${i + 1}">${XT.xoa === x.p ? 'Xoá?' : '×'}</button>` : ''}</div>`).join('');
  async function veHop() {
    const d = hop(), m = muc(); if (!m) return;
    const ds = m.ds, tai = m.sua, kho = coKho(), qr = m.loai === 'ts' ? KIEMKE_QR.payload(m.a.key) : '';
    d.innerHTML = `<div class="xt-dau"><div><small>${m.dau}</small><h2 id="xtTieuDe">${esc(m.ten)}</h2></div>
        <button type="button" class="btn sm xt-dong" data-xt="dong" aria-label="Đóng">${ic('X') || '×'}</button></div>
      <div class="xt-than">
        ${m.loai === 'ts' ? `<section class="xt-qr" aria-label="Mã QR của tài sản">${qrSvg(qr, 150)}<div><b>Mã QR trên tem</b><small class="mono">${esc(qr)}</small>
          <div class="xt-b"><button type="button" class="btn sm" data-xt="intem">${ic('Printer')}In tem mã QR</button><a class="btn sm" href="#ts-${encodeURIComponent(m.a.key)}" data-xt="mo">${ic('ArrowRight')}Mở trang tài sản</a></div></div></section>` : ''}
        <section class="xt-anh" aria-label="Ảnh tài sản">
          <div class="xt-anh-dau"><b>Ảnh tài sản</b><small>${ds.length}/${ANH_TOI_DA}</small>
            ${tai && ds.length < ANH_TOI_DA ? `<label class="btn sm pri">${ic('ImagePlus')}Thêm ảnh<input type="file" accept="image/*" multiple data-xt="them" hidden></label><label class="btn sm xt-chup">${ic('Camera')}Chụp ảnh<input type="file" accept="image/*" capture="environment" data-xt="them" hidden></label>` : ''}</div>
          ${!kho ? `<p class="note">${ic('Lock')} Ảnh tài sản dùng được khi trang đã bật đăng nhập (ảnh lưu kho riêng, chỉ thành viên xem được).</p>`
            : `<div class="xt-luoi" id="xtLuoi">${luoi(ds, m.ten, tai, 'xem')}${Array.from({ length: XT.dang }, () => '<div class="xt-o xt-cho"><span>Đang tải lên…</span></div>').join('')}${ds.length || XT.dang ? '' : '<p class="note">Chưa có ảnh.' + (tai ? ' Bấm “Thêm ảnh” hoặc “Chụp ảnh”.' : '') + '</p>'}</div>
          ${tai ? `<p class="note">Mỗi tài sản tối đa ${ANH_TOI_DA} ảnh; ảnh được thu nhỏ trước khi tải lên. Chụp rõ hình dáng, màu sắc, tem để mọi người nhận ra tài sản. Không chụp người, giấy tờ cá nhân.</p>` : ''}`}
        </section>
        ${kho && m.noi.length ? `<section class="xt-anh xt-noi" aria-label="Ảnh từ tài sản mới đã vào sổ"><div class="xt-anh-dau"><b>Ảnh từ tài sản mới đã vào sổ</b><small>${m.noi.length} ảnh · sửa ở <a href="#tai-san-moi" data-xt="mo">Chung › Tài sản mới</a></small></div>
          <div class="xt-luoi" id="xtNoi">${luoi(m.noi, m.ten, false, 'xemnoi')}</div></section>` : ''}
      </div>`;
    if (!kho) return;
    const imgs = [...d.querySelectorAll('img[data-p]')];
    try { await layUrl([...new Set(imgs.map(i => i.dataset.p))]); } catch (e) { const l = d.querySelector('#xtLuoi'); if (l) l.insertAdjacentHTML('afterbegin', `<p class="dn-loi">${esc(dnLoi(e))}</p>`); return; }
    if (!muc() || muc().khoa !== m.khoa) return;
    imgs.forEach(i => { const u = urlCo(i.dataset.p); if (u && i.isConnected) i.src = u; });
  }
  async function xtClick(e) {
    const b = e.target.closest('[data-xt]'); if (!b || b.tagName === 'INPUT') return;
    const d = hop(), m = muc(), v = b.dataset.xt; if (!m) return;
    if (v === 'dong') { d.close(); return; }
    if (v === 'mo') { d.close(); return; }   // để đường link tự chuyển trang
    if (v === 'intem' && m.loai === 'ts') { d.close(); if (typeof qrOpen === 'function') qrOpen({ key: m.a.key }); return; }
    if (v === 'xem') { moXemDs(m.ds, +b.dataset.i, m.maXem, m.ten); return; }
    if (v === 'xemnoi') { moXemDs(m.noi, +b.dataset.i, m.maXem, m.ten); return; }
    if (v === 'xoa' && m.sua) {
      const x = m.ds[+b.dataset.i]; if (!x) return;
      if (XT.xoa !== x.p) { XT.xoa = x.p; b.textContent = 'Xoá?'; b.classList.add('hoi'); return; }
      b.disabled = true;
      try {
        await DN.api.anh.xoa([x.p, x.n].filter(Boolean));
        m.ghi(m.ds.filter(y => y.p !== x.p)); save(); XT.xoa = ''; toast('Đã xoá ảnh'); veHop();
      } catch (er) { toast(dnLoi(er)); b.disabled = false; }
    }
  }
  // chờ tài liệu của tài sản mới ghi xong lên máy chủ (máy chủ chỉ cho tải ảnh vào thư mục của tài sản mới đã có, do mình tạo)
  async function choGhi(p) { for (let i = 0; i < 150 && typeof WR !== 'undefined' && (WR.busy.has(p) || WR.next.has(p)); i++) await new Promise(r => setTimeout(r, 100)); }
  async function xtChange(e) {
    const inp = e.target; if (inp.dataset.xt !== 'them') return;
    const m = muc(), files = [...(inp.files || [])].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
    inp.value = '';
    if (!m || !files.length || !m.sua) return;
    const con = ANH_TOI_DA - m.ds.length - XT.dang;
    if (con <= 0) { toast(`Mỗi tài sản tối đa ${ANH_TOI_DA} ảnh`); return; }
    const lay = files.slice(0, con);
    if (files.length > con) toast(`Chỉ thêm được ${con} ảnh nữa (tối đa ${ANH_TOI_DA} ảnh mỗi tài sản)`);
    XT.dang += lay.length; veHop();
    if (m.loai === 'moi') await choGhi('moi/' + m.id);
    let xong = 0;
    for (const f of lay) {
      try {
        const [lon, nho] = await Promise.all([nen(f, CANH, 0.82), nen(f, CANH_NHO, 0.72)]);
        const ten = `${m.thuMuc}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        await DN.api.anh.tai(ten + '.jpg', lon);
        await DN.api.anh.tai(ten + '-nho.jpg', nho);
        const m2 = muc(), ds0 = m2 && m2.khoa === m.khoa ? m2.ds : (m.loai === 'moi' ? ((S.moi || {})[m.id] || {}).anh || [] : dsAnh(m.a));
        m.ghi(ds0.concat([{ p: ten + '.jpg', n: ten + '-nho.jpg', at: Date.now(), by: ME || '' }]));
        save(); xong++;
      } catch (er) { toast('Không tải được ảnh: ' + dnLoi(er)); }
      XT.dang--; if (muc() && muc().khoa === m.khoa) veHop();
    }
    if (xong) toast(`Đã thêm ${xong} ảnh`);
  }

  /* ---------- xem ảnh toàn màn hình (kiểu Messenger) ---------- */
  function khungXem() {
    let d = document.getElementById('xemAnh');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'xemAnh'; d.className = 'lb'; d.setAttribute('aria-label', 'Xem ảnh tài sản');
      document.body.appendChild(d);
      d.addEventListener('click', e => { const b = e.target.closest('[data-lb]'); if (b) lbBam(b.dataset.lb, b); else if (e.target === d || e.target.classList.contains('lb-khung')) d.close(); });
      d.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); lbDi(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); lbDi(-1); } });
      let x0 = null;
      d.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
      d.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) lbDi(dx < 0 ? 1 : -1); }, { passive: true });
    }
    return d;
  }
  const moXem = (a, i) => moXemDs(dsHien(a), i, String(a.ma || a.key), a.short || a.ten);   // ảnh của tài sản + ảnh từ tài sản mới đã nối
  g.xemAnhDs = (ds, i, ma, ten) => moXemDs(ds, i, ma, ten);
  async function moXemDs(ds, i, ma, ten) {
    if (!ds || !ds.length) return;
    LB.ds = ds; LB.i = Math.min(i, ds.length - 1); LB.ma = ma; LB.ten = ten;
    const d = khungXem(); d.innerHTML = '<div class="lb-khung"><p class="lb-cho">Đang mở ảnh…</p></div>';
    if (!d.open) d.showModal();
    try { await layUrl(LB.ds.map(x => x.p).concat(LB.ds.map(x => x.n || x.p))); } catch (e) { d.innerHTML = `<div class="lb-khung"><p class="lb-cho">${esc(dnLoi(e))}</p></div>`; return; }
    veXem();
  }
  function veXem() {
    const d = khungXem(), x = LB.ds[LB.i]; if (!x) { d.close(); return; }
    const u = p => (URLS.get(p) || {}).u || '', n = LB.ds.length, coShare = !!(navigator.share && navigator.canShare);
    d.innerHTML = `<div class="lb-nen" style="background-image:url('${esc(u(x.n || x.p))}')"></div>
      <div class="lb-khung">
        <img class="lb-anh" src="${esc(u(x.p))}" alt="Ảnh ${LB.i + 1}/${n} của ${esc(LB.ten)}">
        ${n > 1 ? `<button type="button" class="lb-tron lb-truoc" data-lb="truoc" aria-label="Ảnh trước">${ic('ChevronLeft') || '‹'}</button><button type="button" class="lb-tron lb-sau" data-lb="sau" aria-label="Ảnh sau">${ic('ChevronRight') || '›'}</button>` : ''}
      </div>
      <div class="lb-tren"><span class="lb-dem">${esc(LB.ma)} · ${LB.i + 1}/${n}</span>
        <button type="button" class="lb-tron" data-lb="tai" aria-label="Tải ảnh về" title="Tải ảnh về">${ic('Download') || '⤓'}</button>
        ${coShare ? `<button type="button" class="lb-tron" data-lb="chiase" aria-label="Chia sẻ ảnh" title="Chia sẻ">${ic('Share') || '⇪'}</button>` : ''}
        <button type="button" class="lb-tron" data-lb="dong" aria-label="Đóng" title="Đóng">${ic('X') || '×'}</button></div>
      <div class="lb-dai">${LB.ds.map((y, j) => `<button type="button" class="lb-nho${j === LB.i ? ' chon' : ''}" data-lb="chon" data-j="${j}" aria-label="Ảnh ${j + 1}"${j === LB.i ? ' aria-current="true"' : ''}><img src="${esc(u(y.n || y.p))}" alt=""></button>`).join('')}</div>`;
    setTimeout(() => d.querySelector('[data-lb="dong"]')?.focus(), 0);
  }
  function lbDi(k) { const n = LB.ds.length; if (n < 2) return; LB.i = (LB.i + k + n) % n; veXem(); }
  g.xemAnhDi = lbDi;
  async function lbBam(v, b) {
    const d = khungXem(), x = LB.ds[LB.i];
    if (v === 'dong') { d.close(); return; }
    if (v === 'truoc') { lbDi(-1); return; }
    if (v === 'sau') { lbDi(1); return; }
    if (v === 'chon') { LB.i = +b.dataset.j; veXem(); return; }
    if (!x) return;
    const ten = `${LB.ma}-anh-${LB.i + 1}.jpg`;
    try {
      const blob = await (await fetch((URLS.get(x.p) || {}).u)).blob();
      if (v === 'tai') {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ten; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        try { if (typeof g.logEvent === 'function') g.logEvent({ kind: 'xuat', title: 'Tải ảnh tài sản về máy', lines: [`${LB.ma} · ${LB.ten} · ảnh ${LB.i + 1}`] }); } catch (er) { }   // giám sát: tải dữ liệu
      }
      if (v === 'chiase') { const f = new File([blob], ten, { type: 'image/jpeg' }); if (navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: LB.ten }); }
    } catch (e) { if (!/AbortError/.test(e && e.name)) toast('Không ' + (v === 'tai' ? 'tải' : 'chia sẻ') + ' được ảnh'); }
  }
  /* ---------- Chung › Ảnh tài sản (#anh-tai-san) — người dùng yêu cầu 17/11/2026: mục thứ 5 của phần Chung, nơi quản lý toàn bộ
     ảnh tài sản. Xem ảnh của mọi tài sản, tìm theo STT / mã / tên / phòng, lọc theo sheet, danh sách tài sản chưa có ảnh (xếp theo
     phòng để đi chụp lần lượt). Thêm / xoá ảnh dùng lại đúng hộp ⋯ (moMoRong) nên quyền, tối đa 5 ảnh, thu nhỏ ảnh, lịch sử giống hệt. */
  const AV_LIM = { co: 48, chua: 100 };
  g.AV = { q: '', dv: '', loc: 'co', xep: 'moi', xepc: '', lim: AV_LIM.co };   // xep: thẻ "Có ảnh"; xepc: "Chưa có ảnh" (luôn gom theo phòng)
  const moiNhat = a => dsHien(a).reduce((m, x) => x.at > m.at ? x : m, { at: 0 });
  const urlCo = p => { const x = URLS.get(p); return x && x.het > Date.now() ? x.u : ''; };
  const phongCua = a => roomOf(a) || 'Chưa có vị trí';
  // dùng chung cho trang Tài sản mới (tai-san-moi.js): điền ảnh (img[data-p] chưa có src) trong một vùng; có kho ảnh chưa
  g.anhUrlCo = p => urlCo(p);
  g.anhCoKho = () => coKho();
  g.anhVeBia = async function (root) {
    if (!coKho()) return;
    const imgs = [...(root || app).querySelectorAll('img[data-p]:not([src])')]; if (!imgs.length) return;
    try { await layUrl([...new Set(imgs.map(i => i.dataset.p))]); } catch (e) { return; }
    imgs.forEach(i => { const u = urlCo(i.dataset.p); if (u && i.isConnected) i.src = u; });
  };
  function avPham() {   // tài sản trong sheet đang chọn: có ảnh / chưa có ảnh (không tính công trình, xây lắp, phần mềm)
    const l = ASSETS.filter(a => !AV.dv || a.unit === AV.dv);
    return { co: l.filter(a => dsHien(a).length), chua: l.filter(a => !a.hoso && !dsHien(a).length), can: l.filter(a => !a.hoso).length };
  }
  function avLoc(p) {
    const q = fold(AV.q.trim());
    let l = p[AV.loc].filter(a => !q || timKhop(a, q, fold([a.ma, a.ten, roomOf(a), UNIT[a.unit].sheet].join(' '))));
    // ô Xếp theo (thêm tên A → Z, STT… 20/11/2026): "Có ảnh" xếp cả lưới; "Chưa có ảnh" giữ gom theo phòng (đi chụp lần lượt), chỉ xếp trong từng phòng
    const xs = xepSS(AV.loc === 'co' ? AV.xep : AV.xepc || '');
    if (AV.loc === 'co' && AV.xep === 'moi') l.sort((x, y) => moiNhat(y).at - moiNhat(x).at || x.stt - y.stt);
    else if (AV.loc === 'co' && xs) l.sort(xs);
    else l.sort((x, y) => thSapPhong(roomOf(x), roomOf(y)) || (xs ? xs(x, y) : x.stt - y.stt));
    return sttTruoc(l, q);
  }
  const avThe = (a, tai) => {
    const ds = dsHien(a), m = moiNhat(a), x0 = ds[0], ten = a.short || a.ten;
    return `<article class="at-the" data-stt="${a.stt}">
      <button type="button" class="at-anh" data-at="xem" aria-label="Xem ${ds.length} ảnh của ${esc(ten)}"><img data-p="${esc(x0.n || x0.p)}"${urlCo(x0.n || x0.p) ? ` src="${esc(urlCo(x0.n || x0.p))}"` : ''} alt="" loading="lazy"><span class="at-dem">${ic('Images')}${ds.length}</span></button>
      <div class="at-tt"><small class="mono">${esc(a.ma || 'không mã')} · STT ${a.stt}</small><b>${esc(ten)}</b><small>${esc(phongCua(a))} · ${esc(UNIT[a.unit].sheet)}</small>
        ${m.at ? `<small>Ảnh mới nhất ${ddmmyy(m.at)}${m.by ? ' · ' + esc(whoLabel(m.by) || m.by) : ''}</small>` : ''}</div>
      <div class="at-b"><button type="button" class="btn sm${tai ? ' pri' : ''}" data-at="mo">${ic(tai ? 'ImagePlus' : 'Images')}${tai ? 'Thêm, xoá ảnh' : 'Xem ảnh, mã QR'}</button><a class="btn sm" href="#ts-${encodeURIComponent(a.key)}">${ic('ArrowRight')}Trang tài sản</a></div>
    </article>`;
  };
  const avDong = (a, tai) => `<div class="dm-it at-chua" data-stt="${a.stt}">
      <div class="dm-u"><b>${esc(a.short || a.ten)}</b><small class="mono">${esc(a.ma || 'không mã')} · STT ${a.stt}${a.sl > 1 ? ' · SL ' + nf.format(a.sl) : ''}</small></div>
      <div class="dm-v"><span>${esc(UNIT[a.unit].sheet)}</span></div>
      ${tai ? `<button type="button" class="btn sm pri" data-at="mo">${ic('Camera')}Thêm ảnh</button>` : `<a class="btn sm" href="#ts-${encodeURIComponent(a.key)}">${ic('ArrowRight')}Trang tài sản</a>`}
    </div>`;
  function avKetQua() {
    const p = avPham(), l = avLoc(p), tai = duocTai(), show = l.slice(0, AV.lim), con = l.length - show.length;
    const dem = AV.loc === 'co'
      ? `<b class="num">${nf.format(l.length)}</b> tài sản có ảnh · <b class="num">${nf.format(l.reduce((s, a) => s + dsHien(a).length, 0))}</b> ảnh`
      : `<b class="num">${nf.format(l.length)}</b> tài sản chưa có ảnh · xếp theo phòng để đi chụp lần lượt`;
    let than;
    if (!l.length) than = `<div class="empty">${AV.q.trim() ? 'Không có tài sản nào khớp ô tìm.' : AV.loc === 'co' ? 'Chưa có tài sản nào có ảnh.' + (tai ? ' Chọn “Chưa có ảnh” rồi bấm “Thêm ảnh”, hoặc bấm nút ⋯ trên dòng tài sản.' : '') : 'Mọi tài sản ở đây đều đã có ảnh.'}</div>`;
    else if (AV.loc === 'co' && AV.xep !== 'phong') than = `<div class="at-luoi">${show.map(a => avThe(a, tai)).join('')}</div>`;
    else {   // gom theo phòng (tòa → tầng → số phòng), như trang Tổng hợp
      const nhom = new Map(); show.forEach(a => { const k = phongCua(a); if (!nhom.has(k)) nhom.set(k, []); nhom.get(k).push(a); });
      than = [...nhom].map(([k, ds]) => `<div class="sect"><h2>${esc(k)}</h2><span class="num">${ds.length} tài sản</span></div>${AV.loc === 'co'
        ? `<div class="at-luoi">${ds.map(a => avThe(a, tai)).join('')}</div>` : `<div class="dm-list">${ds.map(a => avDong(a, tai)).join('')}</div>`}`).join('');
    }
    return { dem, than: than + (con > 0 ? `<div class="lmorebtn"><button type="button" class="btn" data-at="them">Xem thêm ${nf.format(Math.min(AV_LIM[AV.loc], con))} tài sản</button></div>` : '') };
  }
  async function avAnhNho() {   // lấy đường dẫn có hạn cho ảnh nhỏ của các thẻ đang hiện (một lần gọi)
    const imgs = [...app.querySelectorAll('.at-anh img[data-p]:not([src])')]; if (!imgs.length) return;
    try { await layUrl([...new Set(imgs.map(i => i.dataset.p))]); }
    catch (e) { const k = document.getElementById('avKq'); if (k && !k.querySelector('.dn-loi')) k.insertAdjacentHTML('afterbegin', `<p class="dn-loi" role="alert">${esc(dnLoi(e))}</p>`); return; }
    imgs.forEach(i => { const u = urlCo(i.dataset.p); if (u && i.isConnected) i.src = u; });
  }
  function avVe() {   // chỉ vẽ lại phần kết quả (giữ con trỏ trong ô tìm)
    const k = document.getElementById('avKq'), d = document.getElementById('avDem'); if (!k) return;
    const r = avKetQua(); d.innerHTML = r.dem; k.innerHTML = r.than; avAnhNho();
  }
  /* Dung lượng kho ảnh — THÔNG SỐ QUẢN LÝ, CHỈ TÀI KHOẢN QUẢN TRỊ THẤY (người dùng chốt 17/11/2026). Số liệu lấy từ máy chủ
     (dung_luong_anh trong dang-nhap.sql, chỉ trả cho quản trị); trang cũng chỉ vẽ khi DN.laQuanTri(). */
  const KHO_GOI = 1024 ** 3;          // gói miễn phí Supabase: 1 GB cho mọi tệp trong Storage
  const ANH_UOC = 400 * 1024;         // chưa có ảnh nào: ước mỗi ảnh (ảnh lớn + ảnh nhỏ) khoảng 400 KB
  const bytes = b => b >= 1024 ** 3 ? (b / 1024 ** 3).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' GB'
    : b >= 1024 ** 2 ? (b / 1024 ** 2).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' MB' : Math.round(b / 1024).toLocaleString('vi-VN') + ' KB';
  async function avTaiDungLuong() {
    AV.dl = { tai: false, luc: Date.now() };
    try { AV.dl.d = await DN.api.dungLuongAnh(); if (!AV.dl.d) AV.dl.loi = 'Chưa đọc được dung lượng (chỉ quản trị đã đăng nhập đủ bước mới xem được).'; }
    catch (e) { AV.dl.loi = /dung_luong_anh|PGRST202|Could not find/i.test(String(e && e.message)) ? 'Máy chủ chưa cập nhật: chạy lại file supabase/dang-nhap.sql (bản mới nhất) trong Supabase → SQL Editor.' : dnLoi(e); }
    AV.dl.tai = true;
    const el = document.getElementById('atDl'); if (el && V.type === 'anh') el.outerHTML = avDungLuongHTML();
    if (V.type !== 'anh') g.khoAnhBao();
  }
  /* Kho ảnh sắp đầy (người dùng dặn 17/11/2026: "khi gần 80% thì báo tôi và cho phương án xử lý hợp lý, không tốn kinh phí").
     Quản trị mở app → đếm dung lượng (mỗi lần mở trang, quá 1 giờ đếm lại); từ 80% hiện thanh cảnh báo ở đầu MỌI trang, dẫn tới
     phương án ở Chung › Ảnh tài sản. Chỉ quản trị thấy (quy tắc vàng 16). "Để sau" ẩn trong phiên này, tăng thêm 1% thì báo lại. */
  const NGUONG = 80;
  const khoPct = () => { const s = AV.dl; return s && s.tai && !s.loi && s.d ? (+s.d.byte_moi_kho || 0) / KHO_GOI * 100 : 0; };
  const soPct = p => p.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  g.khoAnhBao = function () {
    if (!(g.DN && DN.cai && DN.toi && DN.laQuanTri() && DN.api && DN.api.dungLuongAnh)) return;
    if (!AV.dl) { avTaiDungLuong(); return; }
    if (!AV.dl.tai) return;
    if (Date.now() - AV.dl.luc > 3600e3) { avTaiDungLuong(); return; }
    document.getElementById('khoAnhBao')?.remove();
    const pct = khoPct(); if (pct < NGUONG || V.type === 'anh') return;   // trang Ảnh tài sản đã có khung dung lượng + phương án
    let an = ''; try { an = sessionStorage.getItem('kiemke-kho-anh-an') || ''; } catch (e) { }
    if (an !== '' && +an >= Math.floor(pct)) return;
    app.insertAdjacentHTML('afterbegin', `<div class="ch-note warn kho-bao" id="khoAnhBao" role="status">${ic('TriangleAlert')}<div><b>Kho ảnh tài sản đã dùng ${soPct(pct)}%</b> (${bytes(+AV.dl.d.byte_moi_kho || 0)} / ${bytes(KHO_GOI)} gói miễn phí). <a href="#anh-tai-san">Xem cách xử lý không tốn kinh phí</a> · <button type="button" class="lnk" data-kho="an">Để sau</button></div></div>`);
  };
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-kho="an"]')) return;
    try { sessionStorage.setItem('kiemke-kho-anh-an', String(Math.floor(khoPct()))); } catch (er) { }
    document.getElementById('khoAnhBao')?.remove();
  });
  // phương án khi kho từ 80%: KHÔNG TỐN KINH PHÍ, xếp theo thứ tự nên làm; kèm số ảnh có thể bớt (chỉ quản trị thấy)
  function phuongAnHTML() {
    let vuot = 0, khongDung = 0;
    ASSETS.forEach(a => {
      const n = dsAnh(a).length; if (!n) return;
      vuot += Math.max(0, n - 2);
      if (['da_tl', 'bg'].includes((S.rows[a.stt] || {}).sd)) khongDung += n;
    });
    return `<div class="ch-note warn at-pa">${ic('TriangleAlert')}<div><b>Kho sắp đầy — cách xử lý không tốn kinh phí</b> (làm lần lượt, tới khi đủ chỗ):
      <ol>
        <li><b>Bớt ảnh thừa:</b> mỗi tài sản giữ 1–2 ảnh rõ nhất để nhận diện (hình dáng, màu sắc, tem). Hiện có <b>${nf.format(vuot)}</b> ảnh vượt mức 2 ảnh / tài sản — xoá trong nút ⋯.</li>
        <li><b>Lưu trữ rồi xoá ảnh tài sản không còn dùng:</b> <b>${nf.format(khongDung)}</b> ảnh thuộc tài sản đã thanh lý / đã bàn giao. Tải về máy tính hoặc Drive công việc trước (nhờ trợ lý làm nút “Tải tất cả ảnh”), rồi mới xoá trên web.</li>
        <li><b>Thu nhỏ ảnh mới thêm một chút</b> (cạnh dài 1280 thay vì 1600 điểm ảnh): chứa thêm khoảng 1,5 lần, vẫn đủ rõ để nhận diện — nhờ trợ lý sửa.</li>
        <li><b>Vẫn thiếu chỗ:</b> nhờ trợ lý chuyển kho ảnh sang Cloudflare R2 (miễn phí 10 GB, gấp 10 lần hiện nay).</li>
      </ol></div></div>`;
  }
  function avDungLuongHTML() {
    if (!DN.laQuanTri()) return '';
    const s = AV.dl; let than;
    if (!s || !s.tai) than = '<div class="empty">Đang tính dung lượng…</div>';
    else if (s.loi) than = `<div class="ch-note warn">${ic('TriangleAlert')}<div>${esc(s.loi)}</div></div>`;
    else {
      const d = s.d, dung = +d.byte_moi_kho || 0, anh = +d.byte || 0, khac = Math.max(0, dung - anh), con = Math.max(0, KHO_GOI - dung);
      const soAnh = Object.values(S.anh || {}).reduce((t, x) => t + ((x && x.ds) || []).length, 0) + Object.values(S.moi || {}).reduce((t, m) => t + ((m && m.anh) || []).length, 0), tb = soAnh ? anh / soAnh : ANH_UOC;
      const pct = dung / KHO_GOI * 100, pctC = pct > 0 && pct < 0.1 ? 'dưới 0,1' : pct.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
      than = `<div class="at-dl-so"><b class="num">${bytes(dung)}</b><span>đã dùng / ${bytes(KHO_GOI)} (gói miễn phí) · ${pctC}%</span></div>
        <div class="at-dl-thanh${pct >= 80 ? ' day' : ''}" role="meter" aria-label="Dung lượng kho đã dùng" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, pct).toFixed(1)}" aria-valuetext="Đã dùng ${pctC}%"><span style="width:${Math.min(100, pct).toFixed(2)}%"></span></div>
        <dl class="ql-dl at-dl-dl">
          <div><dt>Còn trống</dt><dd><b>${bytes(con)}</b> ≈ ${nf.format(Math.floor(con / tb))} ảnh nữa</dd></div>
          <div><dt>Ảnh tài sản</dt><dd>${bytes(anh)} · ${nf.format(soAnh)} ảnh (${nf.format(+d.so_tep || 0)} tệp, mỗi ảnh kèm 1 ảnh nhỏ)</dd></div>
          <div><dt>Trung bình mỗi ảnh</dt><dd>${bytes(tb)}${soAnh ? '' : ' (ước tính, chưa có ảnh)'}</dd></div>
          <div><dt>Giới hạn</dt><dd>mỗi tệp ≤ ${bytes(+d.gioi_han_tep || 3145728)} · mỗi tài sản ≤ ${ANH_TOI_DA} ảnh</dd></div>
          ${khac ? `<div><dt>Tệp khác trong kho</dt><dd>${bytes(khac)}</dd></div>` : ''}
        </dl>
        ${pct >= NGUONG ? phuongAnHTML() : ''}
        <p class="note">Cập nhật ${hh(s.luc)} · <button type="button" class="lnk" data-at="dl">Tính lại</button></p>`;
    }
    return `<section class="ql-the at-dl" id="atDl" aria-labelledby="atDlTd"><h2 id="atDlTd">${ic('HardDrive')}Dung lượng kho ảnh</h2>
      <p class="note">Thông số quản lý — chỉ tài khoản Quản trị thấy. Gói miễn phí Supabase có 1 GB cho mọi tệp trong kho.</p>${than}</section>`;
  }
  g.viewAnhTS = function () {
    avBind();
    const ban = banner('can-tin', 'Chung', 'Ảnh tài sản', 'Ảnh giúp nhận ra tài sản bằng hình dáng, màu sắc thay vì chỉ đọc mã. Toàn bộ ảnh ở một chỗ: xem, tìm theo STT, mã, tên, phòng; thêm hoặc xoá ảnh của từng tài sản (cũng làm được ở nút ⋯ trên mỗi dòng tài sản).');
    if (!coKho()) {
      app.innerHTML = `${demoBanner()}${ban}<div class="ch-note warn">${ic('Lock')}<div><b>Ảnh tài sản cần đăng nhập.</b> Ảnh lưu ở kho riêng, chỉ thành viên đã đăng nhập mới xem được. Đăng nhập chưa được bật nên chưa dùng được ảnh. Xem cách bật ở <a href="#quan-ly">Chung › Quản lý</a>.</div></div>`;
      return;
    }
    const p = avPham(), tai = duocTai(), soAnh = p.co.reduce((s, a) => s + dsHien(a).length, 0), pct0 = p.can ? p.co.length / p.can * 100 : 0, pct = pct0 > 0 && pct0 < 1 ? 'dưới 1' : Math.min(100, Math.round(pct0));
    const r = avKetQua();
    app.innerHTML = `${demoBanner()}${ban}
    <div class="ch-note">${ic('Lock')}<div>Ảnh lưu ở <b>kho riêng</b>, chỉ thành viên đã đăng nhập xem được${tai ? '; bạn được thêm, xoá ảnh' : DN.toi && DN.toi.quyen === 'moi' ? ' (ở đây bạn chỉ xem; ảnh tài sản mới do bạn tạo thì thêm ở <a href="#tai-san-moi">Chung › Tài sản mới</a>)' : ' (quyền Tra cứu chỉ xem, không thêm, xoá)'}. Mỗi tài sản tối đa ${ANH_TOI_DA} ảnh, ảnh được thu nhỏ trước khi tải lên. Ảnh <b>không</b> đưa vào file “Xuất cho kế toán”.</div></div>
    ${(() => { const l = Object.values(S.moi || {}).filter(m => !(g.moiNoi && g.moiNoi(m))), n = l.reduce((t, m) => t + (m.anh || []).length, 0); return l.length ? `<p class="note at-moi">${ic('PackagePlus')} Ngoài ra có ${nf.format(l.length)} tài sản mới chưa vào sổ (${nf.format(n)} ảnh) — xem ở <a href="#tai-san-moi">Chung › Tài sản mới</a>. Khi đã vào sổ, ảnh tự hiện ở tài sản trong sổ.</p>` : ''; })()}
    <div class="ns-sum at-sum">
      <div><small>Tài sản có ảnh</small><b class="num">${nf.format(p.co.length)}</b><span>trên ${nf.format(p.can)} tài sản · ${pct}%</span></div>
      <div><small>Tổng số ảnh</small><b class="num">${nf.format(soAnh)}</b><span>tối đa ${ANH_TOI_DA} ảnh mỗi tài sản</span></div>
      <div><small>Chưa có ảnh</small><b class="num">${nf.format(p.chua.length)}</b><span>tài sản (không tính công trình, xây lắp, phần mềm)</span></div>
    </div>
    ${avDungLuongHTML()}
    <div class="tools at-tools">
      <select class="in" id="avdv" aria-label="Sheet"><option value="">Mọi sheet</option>${UNITS.map(u => `<option value="${u.id}" ${AV.dv === u.id ? 'selected' : ''}>${esc(u.sheet)}</option>`).join('')}</select>
      <div class="seg" role="group" aria-label="Lọc theo ảnh"><button type="button" data-at="loc" data-v="co" aria-pressed="${AV.loc === 'co'}">Có ảnh <em class="num">${nf.format(p.co.length)}</em></button><button type="button" data-at="loc" data-v="chua" aria-pressed="${AV.loc === 'chua'}">Chưa có ảnh <em class="num">${nf.format(p.chua.length)}</em></button></div>
      ${(() => { const co = AV.loc === 'co', v = co ? AV.xep : AV.xepc || '';
        const ds = co ? [['moi', 'Ảnh mới nhất trước'], ['phong', 'Theo phòng'], ...XEP_TS.slice(1)] : [['', 'Theo phòng'], ['az', 'Theo phòng, tên A → Z'], ['za', 'Theo phòng, tên Z → A'], ['stt', 'Theo phòng, STT tăng dần'], ['stt-', 'Theo phòng, STT giảm dần']];
        return `<label class="sbox xep">${ic('ArrowUpDown')}<select class="in" id="avxep" aria-label="Xếp theo">${ds.map(([k, t]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`; })()}
      <label class="sbox search">${ic('Search')}<input class="in" id="avq" type="search" placeholder="Tìm STT, mã, tên, phòng…" value="${esc(AV.q)}" aria-label="Tìm tài sản"></label>
    </div>
    <p class="dm-sum" id="avDem">${r.dem}</p>
    <div id="avKq">${r.than}</div>`;
    avAnhNho();
    if (DN.laQuanTri() && (!AV.dl || (AV.dl.tai && Date.now() - AV.dl.luc > 60000))) avTaiDungLuong();   // quá 1 phút thì đếm lại
  };
  // đóng hộp ⋯ khi đang ở trang Ảnh tài sản: vẽ lại để số ảnh, ảnh bìa đúng; đưa con trỏ về lại nút vừa bấm
  function avSauDong(stt) {
    AV.dl = null;   // ảnh vừa thêm / xoá: đếm lại dung lượng
    const y = window.scrollY; render(); window.scrollTo(0, y);
    app.querySelector(`[data-stt="${stt}"] [data-at="mo"]`)?.focus({ preventScroll: true });
  }
  function avBind() {
    if (avBind.ok) return; avBind.ok = true;
    app.addEventListener('click', e => {
      const b = e.target.closest('[data-at]'); if (!b || V.type !== 'anh') return;
      const v = b.dataset.at, a = BY_STT[(b.closest('[data-stt]') || {}).dataset?.stt];
      if (v === 'loc') { AV.loc = b.dataset.v; AV.lim = AV_LIM[AV.loc]; render(); return; }
      if (v === 'them') { AV.lim += AV_LIM[AV.loc]; avVe(); return; }
      if (v === 'dl') { avTaiDungLuong(); const el = document.getElementById('atDl'); if (el) el.outerHTML = avDungLuongHTML(); return; }
      if (!a) return;
      if (v === 'xem') { moXem(a, 0); return; }
      if (v === 'mo') { moMoRong(a); return; }
    });
    app.addEventListener('input', e => { if (e.target.id === 'avq') { AV.q = e.target.value; AV.lim = AV_LIM[AV.loc]; clearTimeout(app._av); app._av = setTimeout(avVe, 200); } });
    app.addEventListener('change', e => {
      if (e.target.id === 'avdv') { AV.dv = e.target.value; AV.lim = AV_LIM[AV.loc]; render(); }
      else if (e.target.id === 'avxep') { if (AV.loc === 'co') AV.xep = e.target.value; else AV.xepc = e.target.value; AV.lim = AV_LIM[AV.loc]; render(); document.getElementById('avxep')?.focus(); }
    });
  }

  // câu lịch sử khi thêm / xoá ảnh (logDescribe gọi)
  g.logAnhLines = (o, n) => {
    const a = (o && o.ds) || [], b = (n && n.ds) || [], them = b.filter(x => !a.some(y => y.p === x.p)).length, bot = a.filter(x => !b.some(y => y.p === x.p)).length;
    return [them ? `Thêm ${them} ảnh` : '', bot ? `Xoá ${bot} ảnh` : ''].filter(Boolean);
  };
})();
