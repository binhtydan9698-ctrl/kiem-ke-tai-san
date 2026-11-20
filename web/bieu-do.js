/*
 * Biểu đồ tiến độ ở Bảng tổng quan (Chart.js) — người dùng nâng cấp 21/11/2026, chọn đủ 8 ý:
 *   biểu đồ mới: Tiến độ theo ngày (dự kiến ngày xong) · Theo người kiểm (chỉ Quản trị thấy — quy tắc 16, 17) · Tình trạng & trạng thái
 *   sử dụng (bấm mở danh sách) · Tòa → từng tầng;
 *   nâng cấp: Thước đo (số dòng / số cái / nguyên giá) · Xếp, lọc, ghi % · Tải ảnh (PNG) + Excel số liệu · Lọc chéo tòa ↔ đơn vị.
 * Nạp trong <head> nên chỉ dùng ASSETS, S, res(), count()… (index.html) lúc trang Tổng quan vẽ. Mọi lọc nằm trong CHV (giữ khi trang vẽ lại).
 * Bấm thanh tòa → hiện từng tầng của tòa đó + biểu đồ đơn vị chỉ tính tài sản ở tòa đó; bấm thanh đơn vị → biểu đồ tòa / tầng chỉ tính tài
 * sản của đơn vị đó. Các ô lọc ở thanh công cụ làm đúng việc đó bằng bàn phím. Tải ảnh, Excel ghi lịch sử loại "xuất" (quy tắc 17).
 */
(function (g) {
  'use strict';
  let CH = {}, DRAWN = false, bound = false;
  const CHV = g.CHV = { do: 'dong', toa: null, tang: null, dv: null, xep: 'sheet', anXong: false };
  const DO = { dong: ['Số dòng', () => 1], cai: ['Số cái', a => +a.sl || 0], gia: ['Nguyên giá', a => +a.gia || 0] };
  const SEG = [['Đủ / đã xác nhận', '--ok', c => c.du + c.hoso], ['Lệch số lượng', '--warn', c => c.lech], ['Chưa tìm thấy', '--bad', c => c.nf], ['Chưa kiểm', '--chart-idle', c => c.chua]];
  const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const w = () => DO[CHV.do][1];
  // đếm theo thước đo đang chọn (số dòng / số cái theo sổ / nguyên giá), cùng các ô như count()
  function dem(list, f) { f = f || w(); const c = { tong: 0, du: 0, hoso: 0, thieu: 0, thua: 0, nf: 0, chua: 0 }; list.forEach(a => { const v = f(a); c[res(a)] += v; c.tong += v; }); c.lech = c.thieu + c.thua; c.da = c.tong - c.chua; return c; }
  const so = v => CHV.do === 'gia' ? money(v) : nf.format(Math.round(v));
  const dv = () => CHV.do === 'dong' ? ' dòng' : CHV.do === 'cai' ? ' cái' : '';
  const pt = c => c.tong ? Math.round(c.da / c.tong * 100) : null;
  const toaCua = a => { const n = roomOf(a); return n ? building(n) : ''; };
  const tangCua = a => { const t = thTang(roomOf(a)); return roomOf(a) ? t : 0; };
  const tenToa = b => b === '' ? 'Chưa có vị trí' : b === 'Khu khác' ? 'Khu khác' : 'Tòa ' + b;
  const tenTang = t => t === 0 ? 'Chưa có vị trí' : t === 99 ? 'Không rõ tầng' : 'Tầng ' + t;
  // tài sản theo bộ lọc; bo = các lọc bỏ qua (vd. biểu đồ đơn vị bỏ qua lọc đơn vị để còn chọn đơn vị khác)
  function khop(a, f, bo) { bo = bo || {}; return (bo.toa || f.toa == null || toaCua(a) === f.toa) && (bo.tang || f.tang == null || tangCua(a) === f.tang) && (bo.dv || !f.dv || a.unit === f.dv); }
  const loc = bo => ASSETS.filter(a => khop(a, CHV, bo));
  g.chKhop = (a, f) => khop(a, f);   // trang Kết quả: danh sách mở từ biểu đồ Tình trạng giữ cùng bộ lọc
  const coLoc = () => CHV.toa != null || CHV.tang != null || !!CHV.dv;
  function locChu(f) { f = f || CHV; return [f.toa != null ? tenToa(f.toa) : '', f.tang != null ? tenTang(f.tang) : '', f.dv ? UNIT[f.dv].sheet : ''].filter(Boolean).join(' · '); }
  g.chLocChu = locChu;
  const qt = () => !!(g.DN && DN.cai && DN.toi && DN.laQuanTri());   // Theo người kiểm: chỉ Quản trị (quy tắc 16, 17)
  const cdVal = a => ((S.rows[a.stt] || {}).cond || a.cond0 || '');
  const sdVal = a => ((S.rows[a.stt] || {}).sd || '');
  const ngayVN = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`; };
  const ngayK = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

  /* ---------- nhóm dữ liệu cho từng biểu đồ ---------- */
  function nhomToa() {   // tòa (chưa chọn tòa) hoặc từng tầng của tòa đang chọn
    if (CHV.toa == null) {
      const m = {}; loc({ toa: 1, tang: 1 }).forEach(a => (m[toaCua(a)] = m[toaCua(a)] || []).push(a));
      return [...BLD_ORDER.filter(b => m[b]), ...(m[''] ? [''] : [])].map(b => ({ label: tenToa(b), id: b, l: m[b], chon: false }));
    }
    const m = {}; loc({ tang: 1 }).forEach(a => (m[tangCua(a)] = m[tangCua(a)] || []).push(a));
    return Object.keys(m).map(Number).sort((x, y) => x - y).map(t => ({ label: (CHV.tang === t ? '▸ ' : '') + tenTang(t), id: t, l: m[t], chon: CHV.tang === t }));
  }
  function nhomDv() {
    const m = {}; loc({ dv: 1 }).forEach(a => (m[a.unit] = m[a.unit] || []).push(a));
    let l = UNITS.filter(u => m[u.id]).map(u => ({ label: (CHV.dv === u.id ? '▸ ' : '') + (u.sheet.length > 22 ? u.sheet.slice(0, 21) + '…' : u.sheet), id: u.id, l: m[u.id], chon: CHV.dv === u.id }));
    if (CHV.anXong) l = l.filter(x => !xong(count(x.l)) || x.chon);   // "xong" theo quy tắc 12 (đủ hết hoặc 0/0)
    if (CHV.xep !== 'sheet') { const d = CHV.xep === 'tang' ? 1 : -1; l.sort((x, y) => ((pt(dem(x.l)) ?? 101) - (pt(dem(y.l)) ?? 101)) * d); }
    return l;
  }
  function nhomNgay() {   // theo lần ghi kết quả gần nhất của mỗi tài sản (S.rows[].at)
    const f = w(), m = new Map(); let tong = 0, con = 0, khongNgay = 0;
    loc().forEach(a => { const v = f(a); tong += v; if (res(a) === 'chua') { con += v; return; } const s = S.rows[a.stt]; if (!s || !s.at) { khongNgay += v; return; } const k = ngayK(s.at); m.set(k, (m.get(k) || 0) + v); });
    const keys = [...m.keys()].sort(), homNay = ngayK(Date.now()), ngay = [];
    if (keys.length) { const d = new Date(keys[0] + 'T00:00:00'), cuoi = homNay > keys[keys.length - 1] ? homNay : keys[keys.length - 1]; while (ngayK(d) <= cuoi && ngay.length < 400) { ngay.push(ngayK(d)); d.setDate(d.getDate() + 1); } }
    let cd = khongNgay; const all = ngay.map(k => { cd += m.get(k) || 0; return { k, v: m.get(k) || 0, cd }; });
    const show = all.slice(-45), coKiem = keys.length, tb = coKiem ? [...m.values()].reduce((s, v) => s + v, 0) / coKiem : 0;
    let du = null, nLam = null;
    if (con > 0 && tb > 0) { nLam = Math.ceil(con / tb); const d = new Date(); let n = nLam; while (n > 0) { d.setDate(d.getDate() + 1); const t = d.getDay(); if (t !== 0 && t !== 6) n--; } du = d; }
    return { show, all, tong, con, tb, coKiem, du, nLam, khongNgay };
  }
  function nhomTT(gt, ds, bo0) {   // tình trạng / trạng thái sử dụng: mỗi mục một thanh (bỏ mục mặc định — Tốt / Đang sử dụng)
    const f = w(), m = {}; let mac = 0, chuaGhi = 0;
    loc().forEach(a => { const v = f(a), k = gt(a); if (k === bo0) mac += v; else if (k === '') chuaGhi += v; else m[k] = (m[k] || 0) + v; });
    return { l: ds.filter(([k]) => k !== bo0 && m[k]).map(([k, t]) => ({ label: t, id: k, v: m[k] })), mac, chuaGhi };
  }
  function nhomNguoi() {   // ai đã ghi kết quả (S.rows[].by — người ghi gần nhất, như trên mỗi dòng tài sản)
    const f = w(), m = new Map(), hom = ngayK(Date.now());
    loc().forEach(a => { const r = res(a); if (r === 'chua') return; const s = S.rows[a.stt] || {}, k = s.by || ''; const x = m.get(k) || { c: { tong: 0, du: 0, hoso: 0, thieu: 0, thua: 0, nf: 0, chua: 0 }, hom: 0, dong: 0 };
      const v = f(a); x.c[r] += v; x.c.tong += v; x.dong++; if (s.at && ngayK(s.at) === hom) x.hom++; m.set(k, x); });
    return [...m.entries()].map(([k, x]) => { x.c.lech = x.c.thieu + x.c.thua; x.c.da = x.c.tong; return { label: (k ? (k === ME ? ME + ' (bạn)' : whoLabel(k)) : 'Chưa nhập tên') + (x.hom ? ` · hôm nay ${x.hom}` : ''), ten: k ? (k === ME ? ME : whoLabel(k)) : 'Chưa nhập tên', c: x.c, hom: x.hom, dong: x.dong }; })
      .sort((x, y) => y.c.tong - x.c.tong);
  }

  /* ---------- HTML ---------- */
  const nutAnh = (k, ten) => `<button type="button" class="bd-anh" data-bd="anh" data-c="${k}" aria-label="Tải ảnh biểu đồ ${ten}" title="Tải ảnh (PNG)">${ic('ImageDown') || ic('Download')}</button>`;
  const the = (k, icon, ten, phu, than, rong) => `<div class="ccard${rong ? ' bd-rong' : ''}" data-chc="${k}"><div class="bd-dau"><h3>${ic(icon)}${ten}</h3>${nutAnh(k, ten)}</div><div class="cs">${phu}</div>${than}</div>`;
  function trongHTML() {
    const tenDo = DO[CHV.do][0].toLowerCase(), c = dem(loc()), p = pt(c), ng = qt() ? nhomNguoi() : null;
    const toaDs = [...BLD_ORDER.filter(b => ASSETS.some(a => toaCua(a) === b)), ...(ASSETS.some(a => !roomOf(a)) ? [''] : [])];
    const tangDs = CHV.toa == null ? [] : [...new Set(ASSETS.filter(a => toaCua(a) === CHV.toa).map(tangCua))].sort((x, y) => x - y);
    const opt = (v, t, chon) => `<option value="${esc(String(v))}" ${chon ? 'selected' : ''}>${esc(t)}</option>`;
    const moTrang = [CHV.toa != null ? (CHV.toa === '' ? `<a class="lnk" href="#phong-${NOROOM}">Mở nhóm Chưa có vị trí →</a>` : `<a class="lnk" href="#vi-tri" data-gobld="${esc(CHV.toa)}">Mở trang ${esc(tenToa(CHV.toa))} →</a>`) : '',
      CHV.dv ? `<a class="lnk" href="#dv-${CHV.dv}">Mở sheet ${esc(UNIT[CHV.dv].sheet)} →</a>` : ''].join('');
    const nn = nhomNgay(), tt = nhomTT(cdVal, COND, 'tot'), sd = nhomTT(sdVal, SUDUNG, '');
    const duTxt = !nn.coKiem ? 'Chưa có ngày nào có kết quả kiểm.' : nn.con <= 0 ? 'Đã kiểm hết.'
      : `Trung bình <b>${so(nn.tb)}${dv()}</b> mỗi ngày có kiểm (${nn.coKiem} ngày) · còn <b>${so(nn.con)}${dv()}</b> · dự kiến xong <b>${ngayVN(+nn.du)}</b> (khoảng ${nn.nLam} ngày làm việc, thứ Hai – thứ Sáu)`;
    return `<div class="bd-cu" role="group" aria-label="Thước đo và bộ lọc biểu đồ">
        <div class="seg" role="group" aria-label="Thước đo">${Object.entries(DO).map(([k, [t]]) => `<button type="button" data-bd="do" data-v="${k}" aria-pressed="${CHV.do === k}">${t}</button>`).join('')}</div>
        <select class="in" id="bdToa" aria-label="Lọc theo tòa">${opt('*', 'Mọi tòa', CHV.toa == null)}${toaDs.map(b => opt(b === '' ? '_' : b, tenToa(b), CHV.toa === b)).join('')}</select>
        ${CHV.toa != null ? `<select class="in" id="bdTang" aria-label="Lọc theo tầng">${opt('*', 'Mọi tầng', CHV.tang == null)}${tangDs.map(t => opt(t, tenTang(t), CHV.tang === t)).join('')}</select>` : ''}
        <select class="in" id="bdDv" aria-label="Lọc theo đơn vị">${opt('*', 'Mọi đơn vị', !CHV.dv)}${UNITS.filter(u => BY_UNIT[u.id].length).map(u => opt(u.id, u.sheet, CHV.dv === u.id)).join('')}</select>
        ${coLoc() ? `<button type="button" class="btn sm" data-bd="bo">${ic('X')}Bỏ lọc</button>` : ''}
        <button type="button" class="btn sm" data-bd="xlsx">${ic('Download')}Tải Excel số liệu</button>
      </div>
      ${coLoc() ? `<p class="bd-loc" role="status">${ic('ListFilter')}<span>Đang lọc: <b>${esc(locChu())}</b>${moTrang ? ' · ' + moTrang : ''}</span></p>` : ''}
      <div class="cgrid">
        <div class="ccol">
          ${the('donut', 'ChartPie', coLoc() ? 'Kết quả (đang lọc)' : 'Kết quả toàn trường', `Theo ${tenDo}${CHV.do === 'cai' ? ' theo sổ' : ''} của tài sản trong biên bản`,
            `<div class="donut"><div class="cv"><canvas id="chDonut" role="img" aria-label="Đã kiểm ${p ?? 0}% theo ${tenDo}"></canvas><div class="mid"><div><b>${p == null ? '—' : p + '%'}</b><small>đã kiểm</small></div></div></div>
            <div class="legend">${SEG.map(([l, v, f]) => `<div><i class="${v === '--chart-idle' ? 'idle' : ''}" style="background:var(${v})"></i><span>${l}</span><b>${so(f(c))}</b></div>`).join('')}</div></div>`)}
          ${CHV.toa == null
            ? the('toa', 'Building2', 'Theo tòa nhà', `Mỗi thanh là 100% ${tenDo} ở tòa · bấm một tòa để xem từng tầng`, `<div class="cbox" id="cbBld"><canvas id="chBld" role="img" aria-label="Tiến độ theo tòa nhà"></canvas></div>`)
            : the('toa', 'Layers', `${esc(tenToa(CHV.toa))}: từng tầng`, `Bấm một tầng để chỉ tính tầng đó · <button type="button" class="lnk" data-bd="toave">← Tất cả tòa</button>`, `<div class="cbox" id="cbBld"><canvas id="chBld" role="img" aria-label="Tiến độ từng tầng của ${esc(tenToa(CHV.toa))}"></canvas></div>`)}
        </div>
        ${the('dv', 'Users', 'Theo đơn vị (sheet)', `Mỗi thanh là 100% ${tenDo} của đơn vị · số cuối thanh là % đã kiểm · bấm để lọc`,
          `<div class="bd-dvcu"><select class="in" id="bdXep" aria-label="Xếp đơn vị">${opt('sheet', 'Thứ tự sheet', CHV.xep === 'sheet')}${opt('tang', '% đã kiểm: thấp → cao', CHV.xep === 'tang')}${opt('giam', '% đã kiểm: cao → thấp', CHV.xep === 'giam')}</select>
            <label class="chk"><input type="checkbox" id="bdAnXong" ${CHV.anXong ? 'checked' : ''}> Ẩn đơn vị đã xong</label></div>
          <div class="cbox" id="cbUnit"><canvas id="chUnit" role="img" aria-label="Tiến độ theo đơn vị"></canvas></div>`)}
      </div>
      <div class="cgrid bd-g2">
        ${the('ngay', 'CalendarDays', 'Tiến độ theo ngày', `Cột: ${tenDo} kiểm trong ngày · đường: % đã kiểm cộng dồn · ngày theo lần ghi kết quả gần nhất của mỗi tài sản`,
          `<p class="bd-du">${duTxt}</p><div class="cbox" style="height:220px"><canvas id="chNgay" role="img" aria-label="Tiến độ kiểm theo ngày"></canvas></div>`, true)}
        ${the('tt', 'Wrench', 'Tình trạng & trạng thái sử dụng', `Theo ${tenDo} · bấm một thanh để mở danh sách tài sản`,
          `<p class="bd-du">Tình trạng: Tốt <b>${so(tt.mac)}</b>${tt.chuaGhi ? ` · chưa ghi <b>${so(tt.chuaGhi)}</b>` : ''}</p>
          ${tt.l.length ? `<div class="cbox" style="height:${tt.l.length * 28 + 24}px"><canvas id="chTT" role="img" aria-label="Tình trạng tài sản"></canvas></div>` : '<p class="bd-trong">Chưa có tài sản nào ghi hư hỏng, tiêu hao, đề nghị thanh lý.</p>'}
          <p class="bd-du">Trạng thái sử dụng: Đang sử dụng <b>${so(sd.mac)}</b></p>
          ${sd.l.length ? `<div class="cbox" style="height:${sd.l.length * 28 + 24}px"><canvas id="chSD" role="img" aria-label="Trạng thái sử dụng"></canvas></div>` : '<p class="bd-trong">Chưa có tài sản nào cất kho, cho mượn, chờ thanh lý…</p>'}`)}
      </div>
      ${ng ? `<div class="bd-g3">${the('ng', 'UserCheck', 'Theo người kiểm', `Thông số quản lý — chỉ tài khoản Quản trị thấy · ${tenDo} đã ghi kết quả, theo người ghi gần nhất của mỗi tài sản`,
          ng.length ? `<div class="cbox" style="height:${ng.length * 30 + 30}px"><canvas id="chNg" role="img" aria-label="Số tài sản đã kiểm theo người kiểm"></canvas></div>` : '<p class="bd-trong">Chưa có kết quả kiểm nào.</p>', true)}</div>` : ''}`;
  }
  g.chartsHTML = function () {
    if (!g.Chart) return '';
    bind();
    let open = window.innerWidth >= 860; try { const v = localStorage.getItem(KEY + '.charts'); if (v) open = v === '1'; } catch (e) { }   // điện thoại: thu gọn sẵn
    return `<details class="charts" id="charts" ${open ? 'open' : ''}>
      <summary><span class="chev">${ic('ChevronRight')}</span>${ic('ChartBar')} Biểu đồ tiến độ <span>Đổi thước đo, bấm vào thanh để lọc (tòa → tầng, đơn vị), tải ảnh / Excel để báo cáo</span></summary>
      <div id="bdTrong"></div></details>`;
  };

  /* ---------- vẽ ---------- */
  // ghi chữ ở cuối mỗi thanh (vd. "98%")
  const nhanCuoi = { id: 'bdNhan', afterDatasetsDraw(ch, a, o) {
    if (!o || !o.nhan) return; const { ctx, chartArea } = ch, meta = ch.getDatasetMeta(ch.data.datasets.length - 1);
    ctx.save(); ctx.font = `600 12px ${cssv('--f-ui') || 'sans-serif'}`; ctx.fillStyle = cssv('--fg'); ctx.textBaseline = 'middle';
    meta.data.forEach((bar, i) => { if (o.nhan[i] != null) ctx.fillText(o.nhan[i], (o.tuyet ? bar.x : chartArea.right) + 6, bar.y); }); ctx.restore(); } };
  function thanhChong(canvas, groups, onPick, tuyet) {   // thanh chồng: 100% (tòa, đơn vị) hoặc số tuyệt đối (người kiểm)
    const muted = cssv('--muted'), line = cssv('--line'), fg = cssv('--fg');
    const seg = tuyet ? SEG.slice(0, 3) : SEG, cs = groups.map(x => x.c || dem(x.l));
    const gt = (v, c) => tuyet ? v : c.tong ? v / c.tong * 100 : 0;
    return new Chart(canvas, { type: 'bar', plugins: [nhanCuoi],
      data: { labels: groups.map(x => x.label), datasets: seg.map(([l, v, f]) => ({ label: l, data: cs.map(c => gt(f(c), c)), raw: cs.map(f), backgroundColor: cssv(v),
        borderColor: v === '--chart-idle' ? muted : 'transparent', borderWidth: v === '--chart-idle' ? 1 : 0, barPercentage: .75, categoryPercentage: .9 })) },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: DRAWN ? false : { duration: 450 }, layout: { padding: { right: tuyet ? 70 : 44 } },
        scales: { x: { stacked: true, min: 0, max: tuyet ? undefined : 100, ticks: { precision: 0, callback: v => tuyet ? (CHV.do === 'gia' ? money(v) : nf.format(v)) : v + '%', color: muted, font: { size: 11 } }, grid: { color: line }, border: { display: false } },
          y: { stacked: true, ticks: { color: fg, font: { size: 11.5 } }, grid: { display: false }, border: { display: false } } },
        plugins: { legend: { display: false }, bdNhan: { nhan: cs.map(c => tuyet ? so(c.tong) : (pt(c) == null ? '—' : pt(c) + '%')), tuyet },
          tooltip: { callbacks: { label: x => `${x.dataset.label}: ${so(x.dataset.raw[x.dataIndex])}${dv()}${tuyet ? '' : ` (${Math.round(x.parsed.x)}%)`}`,
            footer: it => { const c = cs[it[0].dataIndex], x = groups[it[0].dataIndex]; return tuyet ? `Tổng ${so(c.tong)}${dv()}${x.hom ? ' · hôm nay ' + x.hom + ' dòng' : ''}` : `Tổng ${so(c.tong)}${dv()} · đã kiểm ${so(c.da)}${dv()}`; } } } },
        onClick: (e, els) => { if (els.length && onPick) onPick(groups[els[0].index]); },
        onHover: (e, els) => { if (e.native && e.native.target) e.native.target.style.cursor = els.length && onPick ? 'pointer' : 'default'; } } });
  }
  function thanhDon(canvas, groups, mau, onPick) {   // một màu, số tuyệt đối (tình trạng, trạng thái sử dụng)
    return new Chart(canvas, { type: 'bar', plugins: [nhanCuoi],
      data: { labels: groups.map(x => x.label), datasets: [{ data: groups.map(x => x.v), backgroundColor: cssv(mau), barPercentage: .7 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: DRAWN ? false : { duration: 450 }, layout: { padding: { right: 70 } },
        scales: { x: { min: 0, ticks: { precision: 0, callback: v => CHV.do === 'gia' ? money(v) : nf.format(v), color: cssv('--muted'), font: { size: 11 } }, grid: { color: cssv('--line') }, border: { display: false } },
          y: { ticks: { color: cssv('--fg'), font: { size: 11.5 } }, grid: { display: false }, border: { display: false } } },
        plugins: { legend: { display: false }, bdNhan: { nhan: groups.map(x => so(x.v)), tuyet: true }, tooltip: { callbacks: { label: x => `${so(x.parsed.x)}${dv()} · bấm để mở danh sách` } } },
        onClick: (e, els) => { if (els.length) onPick(groups[els[0].index]); },
        onHover: (e, els) => { if (e.native && e.native.target) e.native.target.style.cursor = els.length ? 'pointer' : 'default'; } } });
  }
  g.killCharts = function () { Object.values(CH).forEach(c => { try { c.destroy(); } catch (e) { } }); CH = {}; };
  g.drawCharts = function () {
    const box = document.getElementById('bdTrong'); if (!g.Chart || !box) return;
    g.killCharts(); box.innerHTML = trongHTML(); fillIcons(box);
    Chart.defaults.font.family = cssv('--f-ui') || 'sans-serif';
    const c = dem(loc()), el = id => document.getElementById(id);
    if (el('chDonut')) CH.donut = new Chart(el('chDonut'), { type: 'doughnut',
      data: { labels: SEG.map(s => s[0]), datasets: [{ data: SEG.map(s => s[2](c)), backgroundColor: SEG.map(s => cssv(s[1])), borderColor: SEG.map(s => s[1] === '--chart-idle' ? cssv('--muted') : cssv('--surface')), borderWidth: SEG.map(s => s[1] === '--chart-idle' ? 1 : 2) }] },
      options: { cutout: '72%', responsive: true, maintainAspectRatio: false, animation: DRAWN ? false : { duration: 450 }, plugins: { legend: { display: false },
        tooltip: { callbacks: { label: x => `${x.label}: ${so(x.parsed)}${dv()} (${c.tong ? Math.round(x.parsed / c.tong * 100) : 0}%)` } } } } });
    const bg = nhomToa(); if (el('cbBld')) { el('cbBld').style.height = (bg.length * 30 + 24) + 'px';
      CH.toa = thanhChong(el('chBld'), bg, x => { if (CHV.toa == null) { CHV.toa = x.id; CHV.tang = null; } else CHV.tang = CHV.tang === x.id ? null : x.id; ve(); }); }
    const ug = nhomDv(); if (el('cbUnit')) { el('cbUnit').style.height = (Math.max(ug.length, 1) * 24 + 24) + 'px';
      CH.dv = thanhChong(el('chUnit'), ug, x => { CHV.dv = CHV.dv === x.id ? null : x.id; ve(); }); }
    const nn = nhomNgay();
    if (el('chNgay')) CH.ngay = new Chart(el('chNgay'), { data: { labels: nn.show.map(x => x.k.slice(8) + '/' + x.k.slice(5, 7)),
        datasets: [{ type: 'bar', label: `Kiểm trong ngày`, data: nn.show.map(x => x.v), backgroundColor: cssv('--ok'), yAxisID: 'y', order: 2 },
          { type: 'line', label: '% đã kiểm cộng dồn', data: nn.show.map(x => nn.tong ? x.cd / nn.tong * 100 : 0), borderColor: cssv('--accent'), backgroundColor: cssv('--accent'), pointRadius: 2, tension: .25, yAxisID: 'y1', order: 1 }] },
      options: { responsive: true, maintainAspectRatio: false, animation: DRAWN ? false : { duration: 450 },
        scales: { x: { ticks: { color: cssv('--muted'), font: { size: 11 }, maxRotation: 0, autoSkip: true }, grid: { display: false } },
          y: { beginAtZero: true, position: 'left', ticks: { precision: 0, color: cssv('--muted'), font: { size: 11 }, callback: v => CHV.do === 'gia' ? money(v) : nf.format(v) }, grid: { color: cssv('--line') } },
          y1: { min: 0, max: 100, position: 'right', ticks: { color: cssv('--muted'), font: { size: 11 }, callback: v => v + '%' }, grid: { display: false } } },
        plugins: { legend: { labels: { color: cssv('--fg'), boxWidth: 12, font: { size: 12 } } },
          tooltip: { callbacks: { label: x => x.datasetIndex ? `Đã kiểm cộng dồn: ${Math.round(x.parsed.y)}%` : `Kiểm trong ngày: ${so(x.parsed.y)}${dv()}` } } } } });
    const moDs = (k, x) => { g.pendingTT = { k, v: x.id, ten: x.label, toa: CHV.toa, tang: CHV.tang, dv: CHV.dv }; location.hash = 'ket-qua'; };
    const tt = nhomTT(cdVal, COND, 'tot'), sd = nhomTT(sdVal, SUDUNG, '');
    if (el('chTT')) CH.tt = thanhDon(el('chTT'), tt.l, '--warn', x => moDs('cond', x));
    if (el('chSD')) CH.sd = thanhDon(el('chSD'), sd.l, '--info', x => moDs('sd', x));
    if (el('chNg')) CH.ng = thanhChong(el('chNg'), nhomNguoi(), null, true);
    DRAWN = true;
  };
  // đổi thước đo / lọc: vẽ lại phần biểu đồ, đưa con trỏ về lại ô vừa dùng
  function ve() {
    const a = document.activeElement, giu = a && (a.id ? '#' + a.id : a.dataset && a.dataset.bd === 'do' ? `[data-bd="do"][data-v="${a.dataset.v}"]` : '');
    g.drawCharts(); const n = giu && document.querySelector('#bdTrong ' + giu); if (n) n.focus();
  }

  /* ---------- tải ảnh, Excel ---------- */
  function taiAnh(k) {
    const ch = CH[k], the = document.querySelector(`[data-chc="${k}"]`); if (!ch || !the) return;
    const src = ch.canvas, r = src.width / (src.clientWidth || src.width), pad = 20 * r, font = cssv('--f-ui') || 'sans-serif';
    const tieuDe = the.querySelector('h3').textContent.trim(), phu = [DO[CHV.do][0], locChu() ? 'Lọc: ' + locChu() : '', 'Lúc ' + ddmmyy(Date.now())].filter(Boolean).join(' · ');
    const chuThich = k === 'ngay' ? [['Kiểm trong ngày', '--ok'], ['% đã kiểm cộng dồn', '--accent']] : ['tt', 'ng'].includes(k) ? [] : SEG.map(s => [s[0], s[1]]);
    const out = document.createElement('canvas'), dau = 64 * r, cuoi = chuThich.length ? 34 * r : 12 * r;
    out.width = src.width + pad * 2; out.height = src.height + dau + cuoi;
    const x = out.getContext('2d'); x.fillStyle = cssv('--surface') || '#fff'; x.fillRect(0, 0, out.width, out.height);
    x.fillStyle = cssv('--fg'); x.font = `700 ${16 * r}px ${font}`; x.textBaseline = 'top'; x.fillText(tieuDe, pad, 14 * r);
    x.fillStyle = cssv('--muted'); x.font = `${12 * r}px ${font}`; x.fillText(phu, pad, 38 * r);
    x.drawImage(src, pad, dau);
    let cx = pad; x.font = `${12 * r}px ${font}`; x.textBaseline = 'middle';
    chuThich.forEach(([t, v]) => { x.fillStyle = cssv(v); x.fillRect(cx, dau + src.height + 12 * r, 10 * r, 10 * r); x.fillStyle = cssv('--fg'); x.fillText(t, cx + 15 * r, dau + src.height + 17 * r); cx += x.measureText(t).width + 34 * r; });
    if (k === 'donut') { x.fillStyle = cssv('--fg'); x.font = `700 ${22 * r}px ${font}`; x.textAlign = 'center'; x.fillText(the.querySelector('.mid b').textContent, pad + src.width / 2, dau + src.height / 2); }
    const d = new Date(), p = n => String(n).padStart(2, '0'), ten = `Bieu do - ${tieuDe.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').replace(/[^\w ()-]+/g, '')} ${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}.png`;
    out.toBlob(b => { const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = ten; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 10000); });
    try { logEvent({ kind: 'xuat', title: 'Tải ảnh biểu đồ: ' + tieuDe, lines: [phu, ten] }); } catch (e) { }   // quy tắc 17: tải ra file cũng ghi lịch sử
    toast('Đã tải ảnh biểu đồ');
  }
  async function taiExcel(b) {
    if (!g.xuatNhieuBang) { toast('Chưa tải được chức năng xuất Excel'); return; }
    const pc = c => c.tong ? Math.round(c.da / c.tong * 1000) / 10 : '';
    const cot = [['Tên', 28], ['Số dòng', 9], ['Đủ / đã xác nhận', 11], ['Lệch số lượng', 10], ['Chưa tìm thấy', 10], ['Chưa kiểm', 10], ['% đã kiểm (dòng)', 11], ['Số cái theo sổ', 11], ['% đã kiểm (cái)', 11], ['Nguyên giá', 16], ['Nguyên giá đã kiểm', 16], ['% đã kiểm (nguyên giá)', 13]];
    const dongCua = (ten, l) => { const d = count(l), cc = dem(l, DO.cai[1]), gg = dem(l, DO.gia[1]); return [ten, d.tong, d.du + d.hoso, d.lech, d.nf, d.chua, pc(d), cc.tong, pc(cc), gg.tong, gg.da, pc(gg)]; };
    const bo = (f, khongLoc) => ASSETS.filter(a => khop(a, CHV, khongLoc) && f(a));
    const toa = [...BLD_ORDER, ''].filter(t => ASSETS.some(a => toaCua(a) === t)).map(t => dongCua(tenToa(t), bo(a => toaCua(a) === t, { toa: 1, tang: 1 })));
    const tang = []; [...BLD_ORDER, ''].forEach(t => { const l = bo(a => toaCua(a) === t, { toa: 1, tang: 1 }); [...new Set(l.map(tangCua))].sort((x, y) => x - y).forEach(n => tang.push(dongCua(tenToa(t) + ' · ' + tenTang(n), l.filter(a => tangCua(a) === n)))); });
    const dvi = UNITS.filter(u => BY_UNIT[u.id].length).map(u => dongCua(u.ten, bo(a => a.unit === u.id, { dv: 1 })));
    const nd = (() => { const giu = CHV.do, r = {}; ['dong', 'cai', 'gia'].forEach(k => { CHV.do = k; r[k] = nhomNgay(); }); CHV.do = giu;
      return r.dong.all.map((x, i) => [x.k.split('-').reverse().join('/'), x.v, x.cd, r.dong.tong ? Math.round(x.cd / r.dong.tong * 1000) / 10 : '', r.cai.all[i].v, r.gia.all[i].v, r.gia.all[i].cd]); })();
    const ttDong = (gt, ds) => ds.map(([k, t]) => { const l = loc().filter(a => gt(a) === k); return [t, l.length, l.reduce((s, a) => s + (+a.sl || 0), 0), l.reduce((s, a) => s + (+a.gia || 0), 0)]; }).filter(r => r[1]);
    const bang = [
      { ten: 'Thông tin', cot: [['Mục', 22], ['Nội dung', 70]], dong: [['Lúc tải', ddmmyy(Date.now())], ['Bộ lọc', locChu() || 'Không lọc (toàn trường)'],
        ['Ghi chú', 'Số dòng = số dòng tài sản trong file BBKK; số cái theo sổ; nguyên giá theo sổ. Theo ngày: theo lần ghi kết quả gần nhất của mỗi tài sản.'], ['Toàn bộ (theo bộ lọc)', ''], ...[dongCua('Tất cả', loc())].map(r => ['Đã kiểm', `${r[1] - r[5]}/${r[1]} dòng (${r[6]}%) · ${r[8]}% số cái · ${r[11]}% nguyên giá`])] },
      { ten: 'Theo tòa', cot, dong: toa }, { ten: 'Theo tầng', cot, dong: tang }, { ten: 'Theo đơn vị', cot, dong: dvi },
      { ten: 'Theo ngày', cot: [['Ngày', 12], ['Dòng kiểm trong ngày', 14], ['Dòng cộng dồn', 12], ['% cộng dồn (dòng)', 12], ['Số cái kiểm trong ngày', 14], ['Nguyên giá kiểm trong ngày', 18], ['Nguyên giá cộng dồn', 18]], dong: nd },
      { ten: 'Tình trạng', cot: [['Tình trạng', 26], ['Số dòng', 9], ['Số cái', 9], ['Nguyên giá', 16]], dong: ttDong(cdVal, [...COND, ['', 'Chưa ghi']]) },
      { ten: 'Trạng thái sử dụng', cot: [['Trạng thái sử dụng', 28], ['Số dòng', 9], ['Số cái', 9], ['Nguyên giá', 16]], dong: ttDong(sdVal, SUDUNG) },
      ...(qt() ? [{ ten: 'Theo người kiểm', cot: [['Người ghi kết quả', 28], ['Số dòng đã ghi', 12], ['Hôm nay', 9], ['Đủ / đã xác nhận', 11], ['Lệch số lượng', 10], ['Chưa tìm thấy', 10]],
        dong: (() => { const giu = CHV.do; CHV.do = 'dong'; const r = nhomNguoi().map(x => [x.ten, x.dong, x.hom, x.c.du + x.c.hoso, x.c.lech, x.c.nf]); CHV.do = giu; return r; })() }] : [])];
    const d = new Date(), p = n => String(n).padStart(2, '0');
    b.disabled = true; const cu = b.innerHTML; b.textContent = 'Đang tạo file…';
    try { await g.xuatNhieuBang(`So lieu bieu do ${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`, bang, 'Số liệu biểu đồ tiến độ' + (locChu() ? ' (' + locChu() + ')' : '')); toast('Đã tải file Excel số liệu'); }
    catch (e) { console.error(e); toast('Không tạo được file Excel: ' + (e && e.message || e)); }
    finally { b.disabled = false; b.innerHTML = cu; }
  }

  /* ---------- sự kiện (gắn một lần) ---------- */
  function bind() {
    if (bound) return; bound = true;
    app.addEventListener('click', e => {
      const b = e.target.closest('#charts [data-bd]'); if (!b) return; const v = b.dataset.bd;
      if (v === 'do') { CHV.do = b.dataset.v; ve(); }
      else if (v === 'bo') { CHV.toa = CHV.tang = CHV.dv = null; ve(); document.getElementById('bdToa')?.focus(); }
      else if (v === 'toave') { CHV.toa = CHV.tang = null; ve(); document.getElementById('bdToa')?.focus(); }
      else if (v === 'anh') taiAnh(b.dataset.c);
      else if (v === 'xlsx') taiExcel(b);
    });
    app.addEventListener('change', e => {
      const t = e.target; if (!t.closest || !t.closest('#charts')) return;
      if (t.id === 'bdToa') { CHV.toa = t.value === '*' ? null : t.value === '_' ? '' : t.value; CHV.tang = null; }
      else if (t.id === 'bdTang') CHV.tang = t.value === '*' ? null : +t.value;
      else if (t.id === 'bdDv') CHV.dv = t.value === '*' ? null : t.value;
      else if (t.id === 'bdXep') CHV.xep = t.value;
      else if (t.id === 'bdAnXong') CHV.anXong = t.checked;
      else return;
      ve();
    });
  }
})(window);
