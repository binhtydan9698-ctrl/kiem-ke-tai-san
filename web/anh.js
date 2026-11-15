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
  const XT = { stt: null, dang: 0, xoa: '' };   // dialog đang mở cho tài sản nào; số ảnh đang tải lên; ảnh đang hỏi xoá
  const LB = { ds: [], i: 0, ma: '' };            // trình xem ảnh

  const dsAnh = a => ((S.anh || {})[a.stt] || {}).ds || [];
  g.soAnh = a => dsAnh(a).length;
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
      d.addEventListener('close', () => { const s = XT.stt; XT.stt = null; XT.xoa = ''; if (s != null && typeof refreshRow === 'function') try { refreshRow(s); } catch (er) { } });
    }
    return d;
  }
  g.moMoRong = function (a) {
    XT.stt = a.stt; XT.xoa = '';
    const d = hop(); veHop(); if (!d.open) d.showModal();
  };
  async function veHop() {
    const d = hop(), a = BY_STT[XT.stt]; if (!a) return;
    const ds = dsAnh(a), qr = KIEMKE_QR.payload(a.key), tai = duocTai(), kho = coKho();
    d.innerHTML = `<div class="xt-dau"><div><small>Mã TSCĐ <b class="mono">${esc(a.ma || 'không mã')}</b> · STT ${a.stt}</small><h2 id="xtTieuDe">${esc(a.short || a.ten)}</h2></div>
        <button type="button" class="btn sm xt-dong" data-xt="dong" aria-label="Đóng">${ic('X') || '×'}</button></div>
      <div class="xt-than">
        <section class="xt-qr" aria-label="Mã QR của tài sản">${qrSvg(qr, 150)}<div><b>Mã QR trên tem</b><small class="mono">${esc(qr)}</small>
          <div class="xt-b"><button type="button" class="btn sm" data-xt="intem">${ic('Printer')}In tem mã QR</button><a class="btn sm" href="#ts-${encodeURIComponent(a.key)}" data-xt="mo">${ic('ArrowRight')}Mở trang tài sản</a></div></div></section>
        <section class="xt-anh" aria-label="Ảnh tài sản">
          <div class="xt-anh-dau"><b>Ảnh tài sản</b><small>${ds.length}/${ANH_TOI_DA}</small>
            ${tai && ds.length < ANH_TOI_DA ? `<label class="btn sm pri">${ic('ImagePlus')}Thêm ảnh<input type="file" accept="image/*" multiple data-xt="them" hidden></label><label class="btn sm xt-chup">${ic('Camera')}Chụp ảnh<input type="file" accept="image/*" capture="environment" data-xt="them" hidden></label>` : ''}</div>
          ${!kho ? `<p class="note">${ic('Lock')} Ảnh tài sản dùng được khi trang đã bật đăng nhập (ảnh lưu kho riêng, chỉ thành viên xem được).</p>`
            : `<div class="xt-luoi" id="xtLuoi">${ds.length || XT.dang ? '' : '<p class="note">Chưa có ảnh.' + (tai ? ' Bấm “Thêm ảnh” hoặc “Chụp ảnh”.' : '') + '</p>'}</div>
          ${tai ? `<p class="note">Mỗi tài sản tối đa ${ANH_TOI_DA} ảnh; ảnh được thu nhỏ trước khi tải lên. Không chụp người, giấy tờ cá nhân.</p>` : ''}`}
        </section>
      </div>`;
    if (!kho) return;
    const l = d.querySelector('#xtLuoi'), nho = ds.map(x => x.n || x.p);
    let urls = [];
    try { urls = await layUrl(nho); } catch (e) { l.innerHTML = `<p class="dn-loi">${esc(dnLoi(e))}</p>`; return; }
    if (XT.stt !== a.stt) return;
    l.innerHTML = ds.map((x, i) => `<div class="xt-o"><button type="button" class="xt-thumb" data-xt="xem" data-i="${i}" aria-label="Xem ảnh ${i + 1}"><img src="${esc(urls[i])}" alt="Ảnh ${i + 1} của ${esc(a.short || a.ten)}" loading="lazy"></button>
        ${tai ? `<button type="button" class="xt-xoa${XT.xoa === x.p ? ' hoi' : ''}" data-xt="xoa" data-i="${i}" aria-label="Xoá ảnh ${i + 1}">${XT.xoa === x.p ? 'Xoá?' : '×'}</button>` : ''}</div>`).join('')
      + Array.from({ length: XT.dang }, () => '<div class="xt-o xt-cho"><span>Đang tải lên…</span></div>').join('')
      + (ds.length || XT.dang ? '' : '<p class="note">Chưa có ảnh.' + (tai ? ' Bấm “Thêm ảnh” hoặc “Chụp ảnh”.' : '') + '</p>');
  }
  async function xtClick(e) {
    const b = e.target.closest('[data-xt]'); if (!b || b.tagName === 'INPUT') return;
    const d = hop(), a = BY_STT[XT.stt], v = b.dataset.xt; if (!a) return;
    if (v === 'dong') { d.close(); return; }
    if (v === 'mo') { d.close(); return; }   // để đường link tự chuyển trang
    if (v === 'intem') { d.close(); if (typeof qrOpen === 'function') qrOpen({ key: a.key }); return; }
    if (v === 'xem') { moXem(a, +b.dataset.i); return; }
    if (v === 'xoa') {
      const x = dsAnh(a)[+b.dataset.i]; if (!x) return;
      if (XT.xoa !== x.p) { XT.xoa = x.p; b.textContent = 'Xoá?'; b.classList.add('hoi'); return; }
      b.disabled = true;
      try {
        await DN.api.anh.xoa([x.p, x.n].filter(Boolean));
        S.anh[a.stt] = { ds: dsAnh(a).filter(y => y.p !== x.p) }; if (!S.anh[a.stt].ds.length) delete S.anh[a.stt];
        save(); XT.xoa = ''; toast('Đã xoá ảnh'); veHop();
      } catch (er) { toast(dnLoi(er)); b.disabled = false; }
    }
  }
  async function xtChange(e) {
    const inp = e.target; if (inp.dataset.xt !== 'them') return;
    const a = BY_STT[XT.stt], files = [...(inp.files || [])].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
    inp.value = '';
    if (!a || !files.length || !duocTai()) return;
    const con = ANH_TOI_DA - dsAnh(a).length - XT.dang;
    if (con <= 0) { toast(`Mỗi tài sản tối đa ${ANH_TOI_DA} ảnh`); return; }
    const lay = files.slice(0, con);
    if (files.length > con) toast(`Chỉ thêm được ${con} ảnh nữa (tối đa ${ANH_TOI_DA} ảnh mỗi tài sản)`);
    XT.dang += lay.length; veHop();
    let xong = 0;
    for (const f of lay) {
      try {
        const [lon, nho] = await Promise.all([nen(f, CANH, 0.82), nen(f, CANH_NHO, 0.72)]);
        const ten = `ts/${khoaTep(a.key)}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        await DN.api.anh.tai(ten + '.jpg', lon);
        await DN.api.anh.tai(ten + '-nho.jpg', nho);
        S.anh = S.anh || {};
        S.anh[a.stt] = { ds: dsAnh(a).concat([{ p: ten + '.jpg', n: ten + '-nho.jpg', at: Date.now(), by: ME || '' }]) };
        save(); xong++;
      } catch (er) { toast('Không tải được ảnh: ' + dnLoi(er)); }
      XT.dang--; if (XT.stt === a.stt) veHop();
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
  async function moXem(a, i) {
    LB.ds = dsAnh(a); LB.i = i; LB.ma = String(a.ma || a.key); LB.ten = a.short || a.ten;
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
      if (v === 'tai') { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ten; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
      if (v === 'chiase') { const f = new File([blob], ten, { type: 'image/jpeg' }); if (navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: LB.ten }); }
    } catch (e) { if (!/AbortError/.test(e && e.name)) toast('Không ' + (v === 'tai' ? 'tải' : 'chia sẻ') + ' được ảnh'); }
  }
  // câu lịch sử khi thêm / xoá ảnh (logDescribe gọi)
  g.logAnhLines = (o, n) => {
    const a = (o && o.ds) || [], b = (n && n.ds) || [], them = b.filter(x => !a.some(y => y.p === x.p)).length, bot = a.filter(x => !b.some(y => y.p === x.p)).length;
    return [them ? `Thêm ${them} ảnh` : '', bot ? `Xoá ${bot} ảnh` : ''].filter(Boolean);
  };
})();
