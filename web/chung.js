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
  g.dmText = (uid, o) => {
    const d = dmCua(uid); o = o || {};
    if (!d) return `<span class="dm-no">Chưa có đầu mối</span>${o.sua ? ` · <a href="#dau-moi">thêm ở Chung › Đầu mối</a>` : ''}`;
    return `<b>${esc(d.ten || '')}</b>${d.cv ? ` · ${esc(d.cv)}` : ''}${d.email ? ` · <a class="dm-mail" href="mailto:${esc(d.email)}">${esc(d.email)}</a>` : ''}`;
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
    const co = UNITS.filter(u => dmCua(u.id)).length, khoa = READONLY || (MODE === 'shared' && !READY);
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
    <div class="ch-note">${ic('ShieldAlert')}<div>Trang đang mở cho người có đường link nên chỉ ghi <b>tên, chức vụ, email công việc</b>, không ghi số điện thoại cá nhân. Đầu mối <b>không</b> đưa vào file “Xuất cho kế toán”.</div></div>
    <p class="dm-sum"><b class="num">${co}/${UNITS.length}</b> sheet đã có đầu mối</p>
    ${NHOM.map(([t, f]) => { const l = UNITS.filter(f); return l.length ? `<div class="sect"><h2>${t}</h2><span class="num">${l.length} sheet</span></div><div class="dm-list">${l.map(hang).join('')}</div>` : ''; }).join('')}`;
    if (DMV.sua) document.getElementById('dm-ten-' + DMV.sua)?.focus();
  };

  function dmLuu(uid) {
    if (READONLY) { toast('Bạn chỉ có quyền xem, không lưu được'); return; }
    if (MODE === 'shared' && !READY) { toast('Đang tải dữ liệu chung, thử lại sau giây lát'); return; }
    const v = k => (document.getElementById(`dm-${k}-${uid}`)?.value || '').trim().replace(/\s+/g, ' ');
    const ten = v('ten'), cv = v('cv'), email = v('email').toLowerCase();
    if (!ten && !email) { toast('Nhập ít nhất họ tên hoặc email'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Email chưa đúng dạng, vd. ten@fe.edu.vn'); document.getElementById(`dm-email-${uid}`)?.focus(); return; }
    S.dm = S.dm || {}; S.dm[uid] = { ten, cv, email, at: Date.now(), by: ME || '' };
    DMV.sua = ''; save(); render(); toast('Đã lưu đầu mối ' + (UNIT[uid] ? UNIT[uid].sheet : uid));
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
      if (q && !fold([a.ma, a.ten, roomOf(a) || '', UNIT[a.unit].sheet].join(' ')).includes(q)) return;
      const t = khHet(a, KHV.nam);
      if (t <= now) het.push({ a, t }); else if (t <= toi) gan.push({ a, t });
    });
    het.sort((x, y) => x.t - y.t || x.a.stt - y.a.stt); gan.sort((x, y) => x.t - y.t || x.a.stt - y.a.stt);
    return { het, gan, boQua, now };
  }
  g.khLoc = khLoc;
  const con = (t, now) => { const d = Math.round((t - now) / 864e5); return d < 31 ? `còn ${d} ngày` : `còn ${Math.round(d / 30.44)} tháng`; };
  function khBang(l, loai, now) {
    if (!l.length) return `<div class="empty">${loai === 'het' ? 'Không có tài sản nào đã hết khấu hao khớp bộ lọc.' : 'Không có tài sản nào sắp hết khấu hao trong 12 tháng tới khớp bộ lọc.'}</div>`;
    const show = l.slice(0, KHV.lim[loai]);
    return `<div class="tblwrap kh-tbl"><table><thead><tr><th>Mã TSCĐ</th><th>Tên tài sản</th><th>Sheet · vị trí</th><th>Bắt đầu sử dụng</th><th>${loai === 'het' ? 'Hết khấu hao từ' : 'Hết khấu hao'}</th><th class="r">Nguyên giá</th><th>Hiện trạng</th><th>Đầu mối</th></tr></thead><tbody>${show.map(({ a, t }) => {
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
      <label class="sbox search">${ic('Search')}<input class="in" id="khq" type="search" placeholder="Tìm mã, tên, phòng…" value="${esc(KHV.q)}" aria-label="Tìm tài sản"></label>
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
  app.addEventListener('input', e => { if (e.target.id === 'khq') { KHV.q = e.target.value; KHV.lim = { het: 200, gan: 200 }; clearTimeout(app._kh); app._kh = setTimeout(khVe, 200); } });
  app.addEventListener('change', e => {
    if (e.target.id === 'khdv') { KHV.dv = e.target.value; KHV.lim = { het: 200, gan: 200 }; render(); }
    else if (e.target.id === 'khan') { KHV.an = e.target.checked; render(); }
  });
  }
})();
