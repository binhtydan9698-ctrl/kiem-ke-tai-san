/*
 * Kịch bản thử giao diện — chạy TRONG trình duyệt. scripts/thu-giao-dien.mjs chép file này vào dist/ và mở trang thử
 * ở chế độ CHỈ LƯU TRÊN MÁY (không đọc, không ghi Supabase). Mỗi kịch bản chọn bằng ?<tên>, kết quả ghi vào #dump.
 */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const kq = [], err = [];
  const ok = (dk, msg) => kq.push([!!dk, msg]);
  window.addEventListener('error', e => err.push(String(e.message)));
  window.addEventListener('unhandledrejection', e => err.push('promise: ' + String(e.reason && e.reason.message || e.reason)));
  const xong = () => { const d = document.createElement('script'); d.type = 'application/json'; d.id = 'dump'; d.textContent = JSON.stringify({ done: true, kq, err }); document.body.appendChild(d); };
  const go = async h => { location.hash = h; await W(450); };
  const until = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (f()) return true; } catch (e) { } await W(100); } return false; };
  const txt = id => (document.getElementById(id) || {}).textContent || '';
  const hd = () => ({ mod: document.body.dataset.mod, sec: [...document.querySelectorAll('.sec a[aria-current]:not(.sec-home)')].map(a => a.id).join(), sub: [...document.querySelectorAll('.top2 a[aria-current]')].map(a => a.dataset.r).join(), top2: getComputedStyle(document.querySelector('.top2')).display });
  const loadScript = src => new Promise((ok2, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok2; s.onerror = () => no(new Error('không tải được ' + src)); document.head.appendChild(s); });
  const KB = {};

  KB['dau-trang'] = async () => {
    await go('trang-chu'); let h = hd();
    ok(h.mod === 'hub' && h.top2 === 'none', 'trang chủ: ẩn hàng menu con');
    ok([...document.querySelectorAll('#app .tile b')].map(b => b.textContent).join('|') === 'Kiểm kê tài sản 2026|Quản lý mã QR tài sản|Lịch sử|Chung', 'trang chủ có đủ 4 phần (thêm Chung)');
    { const t = document.querySelector('.top1').getBoundingClientRect(); ok(t.height < 80, `đầu trang 1366px: 4 phần chính nằm gọn một hàng (cao ${Math.round(t.height)}px)`); }
    ok(document.querySelector('.lgo img') && document.querySelector('.lgo img').naturalWidth === 960, 'logo FPT University tải được (960×375)');
    for (const [hash, mod, sec, sub] of [['tong-quan', 'kk', 'swKK', 'tong-quan'], ['vi-tri', 'kk', 'swKK', 'vi-tri'], ['xac-minh', 'kk', 'swKK', 'xac-minh'], ['xuat', 'kk', 'swKK', 'xuat'],
      ['ma-qr', 'qr', 'swQR', 'ma-qr'], ['so-ma-qr', 'qr', 'swQR', 'so-ma-qr'], ['lich-su', 'ls', 'swLS', 'lich-su'], ['nhap-so', 'ls', 'swLS', 'nhap-so'], ['ly-lich', 'ls', 'swLS', 'ly-lich'], ['khau-hao', 'ch', 'swCH', 'khau-hao'], ['dau-moi', 'ch', 'swCH', 'dau-moi']]) {
      await go(hash); h = hd();
      ok(h.mod === mod && h.sec === sec && h.sub === sub && h.top2 !== 'none', `#${hash}: tô đúng phần và mục con`);
    }
    await go('dv-GD'); document.getElementById('swLS').click(); await W(400); document.getElementById('swKK').click(); await W(400);
    ok(location.hash === '#dv-GD', 'bấm lại phần Kiểm kê: về đúng trang đang xem dở');
    await go('ts-6497474'); const ab = [...document.querySelectorAll('.tsx-go a.btn')].find(a => !a.classList.contains('pri'));
    ok(ab && getComputedStyle(ab).color === getComputedStyle(document.body).color, 'nút dạng đường link dùng đúng màu chữ của trang');
  };

  KB['quet-ma'] = async () => {
    const quet = async (t, cam) => { await go('tong-quan'); document.getElementById('scanRes').innerHTML = ''; scanShow(t, cam); await W(400); return decodeURIComponent(location.hash); };
    ok(KIEMKE_QR.payload('1').startsWith('https://quan-ly-tai-san-fptudn.vercel.app/#ts-'), 'mã QR dùng tên miền quan-ly-tai-san-fptudn.vercel.app');
    ok(await quet(KIEMKE_QR.payload('5467321'), true) === '#ts-5467321', 'quét tem (đường link) mở thẳng trang tài sản');
    ok(await quet('5467321', true) === '#ts-5467321', 'mã chỉ có số (gõ tay, mã vạch) khớp đúng → mở tài sản');
    ok(await quet('http://localhost:3000/#ts-5457865', true) === '#ts-5457865', 'tem có tên miền khác vẫn mở đúng tài sản');
    let h = await quet(KIEMKE_QR.WEB + '#ts-9999999', true);
    ok(h === '#tong-quan' && /không có tài sản này/.test(txt('scanMsg')), 'tem mã không có trong sổ: báo rõ, không mở nhầm');
    h = await quet('546732', true);
    ok(h === '#tong-quan' && /không khớp/.test(txt('scanMsg')), 'camera đọc mã gần giống: không đoán');
    await quet('máy chiếu', false);
    ok(document.querySelectorAll('#scanRes .shit').length > 0, 'gõ tay một phần tên: hiện danh sách để chọn');
    h = await quet(KIEMKE_QR.payload('1234567'), true);
    ok(h === '#ts-1234567' && !!document.querySelector('.tsx-xoa'), 'tem của tài sản đã xoá khỏi BBKK: mở trang lưu trong sổ');
  };

  KB['in-tem'] = async () => {
    await go('ma-qr');
    await until(() => TEMV.fontOK && /ok|bad/.test(document.getElementById('qrTest').className), 20000);
    ok(/ok/.test(document.getElementById('qrTest').className), 'xem trước: đọc thử mã trên tem ra đúng tài sản');
    ok(TEM.room === false && TEM.unit === false, 'tem mặc định không in phòng, đơn vị');
    const L = temAssets(), G = temGeo(L), it0 = temItems(L)[0], chu = temOps(it0, G).filter(o => o.t === 'text').map(o => o.str);
    ok(chu.includes(String(it0.a.ma)) && !chu.some(c => roomOf(it0.a) && c.includes(roomOf(it0.a))) && !chu.some(c => /^Đơn vị|· [A-Z]{2,}$/.test(c)), 'tem mặc định chỉ có tiêu đề, mã, tên: ' + chu.join(' | ').slice(0, 90));
    const u = document.getElementById('qrU'); u.value = 'GD'; u.dispatchEvent(new Event('change', { bubbles: true })); await W(400);
    const files = []; window.temDown = (blob, name) => files.push({ name, blob });
    await temExport('pdf'); await temExport('png'); await temExport('csv');
    const pdf = files.find(f => f.name.endsWith('.pdf')), zip = files.find(f => f.name.endsWith('.zip')), csv = files.find(f => f.name.endsWith('.csv'));
    ok(pdf && zip && csv, 'tạo được file PDF, ảnh PNG (.zip), CSV');
    const jsQR = await temLoad('jsqr'), list = temAssets();
    if (pdf) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await pdf.blob.arrayBuffer()) }).promise, pg = await doc.getPage(1), vp = pg.getViewport({ scale: 300 / 72 });
      const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height; await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      const g = temGeo(list), P = temPage(g), k = 300 / 25.4, ctx = cv.getContext('2d'); let dung = 0, n = Math.min(P.per, list.length);
      for (let j = 0; j < n; j++) { const [x, y] = P.pos[j]; const im = ctx.getImageData(Math.round(x * k), Math.round(y * k), Math.round(g.W * k), Math.round(g.H * k)); const r = jsQR(im.data, im.width, im.height); if (r && KIEMKE_QR.parse(r.data) === list[j].key) dung++; }
      ok(dung === n, `mở file PDF, đọc lại ${dung}/${n} mã QR ở trang 1: đúng tài sản`);
    }
    if (zip) {
      const JSZip = await temLoad('jszip'), z = await JSZip.loadAsync(zip.blob), names = Object.keys(z.files); let dung = 0, dpi = 0;
      for (const nm of names) {
        const buf = await z.files[nm].async('uint8array'); if (String.fromCharCode(...buf.subarray(37, 41)) === 'pHYs') dpi++;
        const bmp = await createImageBitmap(new Blob([buf], { type: 'image/png' })), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
        const x = c.getContext('2d'); x.drawImage(bmp, 0, 0); const im = x.getImageData(0, 0, c.width, c.height), r = jsQR(im.data, im.width, im.height);
        if (r && KIEMKE_QR.parse(r.data) === nm.split('_')[1].replace('.png', '')) dung++;
      }
      ok(dung === names.length && dpi === names.length, `${names.length} ảnh PNG: đọc lại đúng ${dung}, có ghi độ phân giải ${dpi}`);
    }
    if (csv) { const t = await csv.blob.text(); ok(t.split('\r\n').length - 1 === list.length, `CSV có đủ ${list.length} dòng tem`); }
    await temExport('print'); await W(900);
    const fr = [...document.querySelectorAll('iframe')].pop();
    ok(fr && fr.contentDocument.querySelectorAll('.pg').length >= 1, 'In ngay: dựng được trang in');
    await go('so-ma-qr'); await W(300);
    ok(document.querySelectorAll('.qr-rule li').length >= 5, 'Sổ mã QR: có đủ quy tắc (gồm quy tắc lệch 1 chữ là 2 tài sản)');
  };

  KB['lich-su'] = async () => {
    await go('nhap-so');
    const coMa = ASSETS.filter(a => a.ma && String(a.ma) === String(a.key)).length;
    ok(document.querySelectorAll('.ns-sum b')[0].textContent === nf.format(coMa), `Nhập sổ: đếm đúng ${nf.format(coMa)} tài sản từ sổ kế toán`);
    ok(document.querySelectorAll('.ns-dot li').length >= 1, 'Nhập sổ: có các đợt vào sổ');
    await go('ts-6497474');
    const stt = +app.querySelector('.row[data-stt]').dataset.stt;
    if (res(BY_STT[stt]) !== 'chua') { app.querySelector('.row[data-stt] [data-act="clr"]').click(); await W(300); }
    app.querySelector('.row[data-stt] [data-act="du"]').click(); await W(350);
    const sd = document.getElementById('sd-' + stt);
    ok(!!sd, 'trang tài sản: có ô Trạng thái sử dụng (tách khỏi Tình trạng)');
    sd.value = 'kho'; sd.dispatchEvent(new Event('change', { bubbles: true })); await W(450);
    ok(/Cất kho/.test(app.querySelector('.row[data-stt]').textContent) && (S.rows[stt] || {}).sd === 'kho', 'trạng thái sử dụng: lưu và hiện nhãn "Cất kho"');
    ok((S.rows[stt] || {}).cond === 'tot', 'Tình trạng giữ nguyên (Tốt), không bị trạng thái sử dụng ghi đè');
    ok(ketQuaKeToan(BY_STT[stt]).gc.includes('Trạng thái sử dụng: Cất kho'), 'trạng thái sử dụng: có trong file cho kế toán');
    await go('ly-lich-6497474'); await W(400);
    const ev = [...document.querySelectorAll('.llist.ly > li')].map(li => li.textContent);
    ok(/Bắt đầu sử dụng/.test(ev[0] || '') && /Vào sổ trên app/.test(ev[1] || ''), 'lý lịch: bắt đầu từ ngày bắt đầu sử dụng, vào sổ trên app');
    ok(!/[Nn]gày ghi sổ/.test(app.textContent), 'lý lịch: dùng tên “Ngày bắt đầu sử dụng” (đúng cột trong file BBKK)');
    ok(ev.some(t => /Kết quả: Chưa kiểm → Đủ/.test(t)), 'lý lịch: có lần kiểm Đủ');
    ok(ev.some(t => /Trạng thái sử dụng: Đang sử dụng → Cất kho/.test(t)), 'lý lịch: có lần đổi trạng thái sử dụng');
  };

  KB['quet-lien-tuc'] = async () => {
    await go('phong-108-gamma'); const name = ROOMNAME['108-gamma'];
    const btn = app.querySelector('[data-act="quetlt"]');
    ok(!!btn, 'trang phòng có nút "Quét liên tục ở phòng này"');
    btn.click(); await W(500);
    ok(SD.open && SC.cont && /Quét liên tục/.test(txt('scanTitle')), 'mở chế độ quét liên tục của phòng');
    const trong = ASSETS.filter(a => roomOf(a) === name && res(a) === 'chua' && !a.hoso);
    const a1 = trong.find(a => a.sl === 1), a3 = trong.find(a => a.sl > 1);
    const ngoai = ASSETS.find(a => roomOf(a) && roomOf(a) !== name && res(a) === 'chua' && a.sl === 1 && !a.hoso);
    scanShow(KIEMKE_QR.payload(a1.key), true); await W(250);
    ok(res(a1) === 'du' && roomOf(a1) === name, 'quét tài sản của phòng: ghi Đủ ngay, giữ phòng');
    const n1 = SC.cont.items.length; scanShow(KIEMKE_QR.payload(a1.key), true); await W(200);
    ok(SC.cont.items.length === n1, 'quét lại cùng tem: không ghi thêm');
    scanShow(KIEMKE_QR.payload(ngoai.key), true); await W(250);
    ok(res(ngoai) === 'chua' && SC.cont.items[0].act === 'move', 'tài sản ghi ở phòng khác: hỏi trước, chưa ghi');
    document.querySelector(`#scanRes [data-ci="${SC.cont.items[0].id}"] [data-cs="move"]`).click(); await W(300);
    ok(res(ngoai) === 'du' && roomOf(ngoai) === name && /Thấy ở/.test(S.rows[ngoai.stt].note || ''), 'bấm "Chuyển vào phòng này": ghi Đủ, đổi phòng, ghi chú nơi thấy');
    if (a3) {
      scanShow(KIEMKE_QR.payload(a3.key), true); await W(250);
      const it = SC.cont.items[0], box = document.querySelector(`#scanRes [data-ci="${it.id}"]`);
      ok(it.act === 'sl' && res(a3) === 'chua', 'tài sản số lượng > 1: hỏi số đếm được');
      box.querySelector('input[data-csn]').value = String(a3.sl - 1); box.querySelector('[data-cs="sl"]').click(); await W(300);
      ok(res(a3) === 'thieu', 'nhập số đếm được ít hơn sổ: ghi Thiếu đúng');
    } else ok(true, 'phòng thử không có tài sản số lượng > 1 chưa kiểm (bỏ qua bước này)');
    const itA1 = SC.cont.items.find(x => x.a === a1);
    document.querySelector(`#scanRes [data-ci="${itA1.id}"] [data-cs="undo"]`).click(); await W(300);
    ok(res(a1) === 'chua', 'Hoàn tác từng món trong lượt quét');
    scanShow('999999999', true); await W(200);
    ok(SC.cont.items[0].kind === 'bad', 'mã lạ: báo không khớp, không ghi');
    ok(/đã ghi/.test(txt('csSum')) && /đã kiểm/.test(txt('csSum')), 'có dòng tổng kết lượt quét');
    ok(LOGMINE.filter(e => e.tag === 'Quét liên tục').length >= 2, 'lịch sử gắn nhãn "Quét liên tục"');
    SD.close(); await W(500);
    ok(!SC.cont && V.type === 'room' && !SD.open, 'đóng lại: về trang phòng, đã vẽ lại');
  };

  // trang thử ?doi-ma: sổ có thêm mã cũ giả 7654321, kế toán đã đổi sang mã 6497474 (cùng tài sản)
  KB['doi-ma'] = async () => {
    const CU = '7654321', MOI = '6497474', a = BY_KEY[MOI];
    const quet = async (t, cam) => { await go('tong-quan'); document.getElementById('scanRes').innerHTML = ''; scanShow(t, cam); await W(450); return decodeURIComponent(location.hash); };
    const bao = () => [...document.querySelectorAll('.tsx-doi')].map(x => x.textContent).join(' | ');
    ok(maMoi(CU) === MOI && maCuCua(MOI).includes(CU), 'sổ mã QR: mã cũ nối sang mã mới');
    ok(await quet(KIEMKE_QR.payload(CU), true) === '#ts-' + MOI && bao().includes('Tem này mang Mã TSCĐ cũ ' + CU), 'quét tem mang mã cũ: mở đúng tài sản mã mới, báo rõ đã đổi mã');
    ok(/Mã TSCĐ cũ/.test(app.querySelector('.tsx-dl').textContent) && app.querySelector('.tsx-dl').textContent.includes(CU), 'trang tài sản: ghi Mã TSCĐ cũ (tem cũ vẫn dùng được)');
    ok(await quet(CU, false) === '#ts-' + MOI, 'gõ tay mã cũ: mở tài sản mã mới');
    await go('tong-quan'); await go('ts-' + CU); await W(300);
    ok(decodeURIComponent(location.hash) === '#ts-' + MOI && bao().includes(CU), 'mở đường link tem cũ bằng camera điện thoại: chuyển sang tài sản mã mới');
    await go('tong-quan'); await go('ts-' + MOI);
    ok(!bao().includes('Tem này mang'), 'mở tài sản bằng mã mới: không báo nhầm "tem mã cũ"');
    // kết quả kiểm đã ghi theo mã cũ (máy chủ giữ riêng) → bấm dùng cho mã mới
    const coKq = !!S.rows[a.stt]; ORPHAN.rows = { [CU]: { tt: a.sl, phong: roomOf(a) || '', cond: 'tot', at: Date.now(), by: 'Người thử' } }; render(); await W(300);
    ok(!coKq || !app.querySelector('[data-act="kqcu"]'), 'mã mới đã có kết quả: không đề nghị lấy kết quả mã cũ');
    delete S.rows[a.stt]; save(); render(); await W(300);
    const nut = app.querySelector('[data-act="kqcu"]');
    ok(!!nut && bao().includes('Mã cũ ' + CU + ' đã được kiểm'), 'mã mới chưa kiểm: hiện kết quả của mã cũ, có nút dùng lại');
    nut.click(); await W(400);
    ok(res(a) === 'du' && !app.querySelector('[data-act="kqcu"]'), 'bấm dùng lại: mã mới ghi Đủ theo kết quả của mã cũ (' + res(a) + ')');
    ok(LOGMINE.some(e => e.key === MOI && /mã cũ/.test(e.tag || '')), 'lịch sử ghi rõ kết quả lấy từ mã cũ');
    await go('ly-lich-' + CU); await W(400);
    const ev = [...document.querySelectorAll('.llist.ly > li')].map(li => li.textContent);
    ok(decodeURIComponent(location.hash) === '#ly-lich-' + MOI, 'lý lịch mã cũ: chuyển sang lý lịch tài sản mã mới');
    ok(ev.some(t => t.includes(`Kế toán đổi Mã TSCĐ ${CU} → ${MOI}`)) && ev.some(t => t.includes('Mã TSCĐ cũ ' + CU)), 'lý lịch: gộp mã cũ (vào sổ, đổi mã) với mã mới');
    await go('nhap-so'); const q = document.getElementById('nsq'); q.value = CU; q.dispatchEvent(new Event('input', { bubbles: true })); await W(400);
    const ns = document.getElementById('nsBody').textContent;
    ok(ns.includes('Đổi sang mã ' + MOI) && ns.includes('đổi từ mã ' + CU), 'Nhập sổ: tìm mã cũ thấy cả 2 dòng, ghi rõ đổi mã');
    await go('so-ma-qr'); await W(300);
    ok(document.getElementById('qrSoBody').textContent.includes(CU) && document.querySelectorAll('.qr-rule li').length >= 6, 'Sổ mã QR: có bảng mã đã đổi và quy tắc đổi Mã TSCĐ');
    const n = roomOf(a);
    if (n) {
      await go('phong-' + slugify(n)); app.querySelector('[data-act="quetlt"]').click(); await W(500);
      S.rows[a.stt] = null; delete S.rows[a.stt];
      scanShow(KIEMKE_QR.payload(CU), true); await W(300);
      const it = SC.cont.items[0];
      ok(it && it.a === a && it.cuMa === CU && /tem mang mã cũ/.test(txt('scanRes')), 'quét liên tục: tem mã cũ vẫn nhận đúng tài sản, ghi rõ tem mã cũ');
      SD.close(); await W(400);
    } else ok(true, 'tài sản thử chưa có phòng (bỏ qua bước quét liên tục)');
  };

  // Chung: khấu hao (tạm tính, chọn số năm) và đầu mối theo sheet (hiện ở các phần khác, không xuất cho kế toán)
  // Bảng tổng quan: 3 ô đầu có nút "Xem →" như 2 ô cuối; trang Kết quả đã kiểm của cả trường (#ket-qua, #ket-qua-lech)
  KB['ket-qua'] = async () => {
    const a = BY_UNIT.GD.find(x => x.sl >= 2 && !x.hoso && x.ma && res(x) === 'chua');
    S.rows[a.stt] = { tt: a.sl - 1, nf: false, phong: roomOf(a), cond: 'tot', at: Date.now(), by: 'Người thử' }; save();
    await go('tong-quan');
    const links = [...document.querySelectorAll('.stats .stat')].map(s => (s.querySelector('.sub a') || {}).getAttribute?.('href') || '');
    ok(links.slice(0, 3).join() === '#tong-hop,#ket-qua,#ket-qua-lech', `3 ô đầu có nút “Xem →”: ${links.slice(0, 3).join(', ')}`);
    // ô Tổng số dòng → trang Tổng hợp toàn bộ tài sản: 5 nhóm theo thứ tự, gom tòa → phòng (tầng dưới lên trên) → bộ môn
    document.querySelector('.stat.acc .sub a').click(); await W(600);
    ok(location.hash === '#tong-hop' && /Tổng hợp toàn bộ tài sản/.test(app.querySelector('h1').textContent) && hd().sub === 'tong-quan', 'bấm “Xem →” ở ô Tổng số dòng: mở trang Tổng hợp toàn bộ tài sản');
    const THU = ['th-du', 'th-lech', 'th-nf', 'th-novt', 'th-chua'], secs = [...app.querySelectorAll('.th-sec')].map(d => d.id);
    ok(secs.length >= 4 && secs.every((id, i) => i === 0 || THU.indexOf(id) > THU.indexOf(secs[i - 1])), `nhóm từ trên xuống đúng thứ tự: ${secs.map(s => s.slice(3)).join(' → ')}`);
    const trong = id => [...app.querySelectorAll(`#${id} .th-r`)].map(r => BY_STT[r.dataset.stt]);
    ok(app.querySelectorAll('.th-r').length === ASSETS.length && new Set([...app.querySelectorAll('.th-r')].map(r => r.dataset.stt)).size === ASSETS.length, `đủ ${ASSETS.length} dòng, mỗi tài sản đúng 1 lần`);
    ok(trong('th-du').every(x => ['du', 'hoso'].includes(res(x))) && trong('th-lech').every(x => ['thieu', 'thua'].includes(res(x))) && trong('th-lech').includes(a)
      && trong('th-nf').every(x => res(x) === 'nf') && trong('th-novt').every(x => res(x) === 'chua' && !roomOf(x)) && trong('th-chua').every(x => res(x) === 'chua' && roomOf(x)),
      'mỗi nhóm đúng tính chất: đủ / lệch / chưa tìm thấy / chưa kiểm chưa có phòng / chưa kiểm đã có phòng');
    { const ph = [...app.querySelectorAll('#th-chua .th-ph a')].map(x => x.textContent), k = n => [thToa(n), thTang(n), thSoPhong(n)];
      const dung = ph.every((n, i) => { if (!i) return true; const p = k(ph[i - 1]), c = k(n); return p[0] < c[0] || (p[0] === c[0] && (p[1] < c[1] || (p[1] === c[1] && p[2] <= c[2]))); });
      ok(ph.length > 10 && dung, `nhóm Chưa kiểm: ${ph.length} phòng xếp theo tòa, tầng dưới lên tầng trên, số phòng nhỏ đến lớn (${ph.slice(0, 4).join(', ')}…)`); }
    { const nhom = [...app.querySelectorAll('#th-chua .th-dv')].map(d => { const r = []; let e = d.nextElementSibling; while (e && e.classList.contains('th-r')) { r.push(BY_STT[e.dataset.stt]); e = e.nextElementSibling; } return r; });
      ok(nhom.length && nhom.every(r => r.length && r.every(x => x.unit === r[0].unit && roomOf(x) === roomOf(r[0])) && r.every((x, i) => !i || thSapTen(r[i - 1], x) <= 0)),
        'trong mỗi phòng: gom theo bộ môn, tài sản cùng loại đứng liền nhau (xếp theo tên, bỏ số lượng ở đầu)');
      const ghe = [...app.querySelectorAll('#th-chua .th-r')].map(r => BY_STT[r.dataset.stt]).filter(x => roomOf(x) === '101 Alpha').map(x => thTenGom(x).split(' ')[0].toLowerCase());
      ok(ghe.length < 2 || ghe.every((w, i) => !i || w === ghe[i - 1] || !ghe.slice(0, i - 1).includes(w)), `phòng 101 Alpha: cùng loại đồ liền nhau (${ghe.join(', ')})`); }
    app.querySelector('[data-act="thdi"][data-k="nf"]').click(); await W(400);
    { const t = document.getElementById('th-nf').getBoundingClientRect().top; ok(t >= 0 && t < 260, 'bấm nút nhóm “Chưa tìm thấy”: cuộn tới đúng nhóm'); }
    { const q = document.getElementById('thq'); q.value = String(a.ma); q.dispatchEvent(new Event('input', { bubbles: true })); await W(500);
      ok(app.querySelectorAll('.th-r').length === 1 && app.querySelector('.th-r').dataset.stt === String(a.stt), 'tìm theo Mã TSCĐ trong trang tổng hợp'); }
    app.querySelector('.th-r').click(); await W(500);
    ok(location.hash === '#ts-' + encodeURIComponent(a.key), 'bấm một dòng: mở trang của tài sản đó');
    TH.q = ''; await go('tong-quan');
    { const s = getComputedStyle(document.querySelector('.stat .sub')); ok(+s.fontWeight >= 500 && s.color === getComputedStyle(document.body).color, 'dòng chữ dưới các ô đậm, cùng màu chữ chính (dễ đọc)'); }
    document.querySelector('.stat.ok .sub a').click(); await W(500);
    const daKiem = ASSETS.filter(x => res(x) !== 'chua');
    const dong = () => [...app.querySelectorAll('.row[data-stt]')].map(r => BY_STT[r.dataset.stt]);
    ok(location.hash === '#ket-qua' && /Tài sản đã kiểm/.test(app.querySelector('h1').textContent) && hd().sub === 'tong-quan', 'bấm “Xem →” ở ô Đã kiểm: mở trang Tài sản đã kiểm (menu tô Bảng tổng quan)');
    ok(dong().length === daKiem.length && dong().every(x => res(x) !== 'chua'), `trang Đã kiểm: đủ ${daKiem.length} dòng đã có kết quả của cả trường, không lẫn dòng chưa kiểm`);
    ok(app.querySelectorAll('.grp[data-by="unit"]').length >= 1 && !!app.querySelector('.row .by'), 'nhóm theo đơn vị, mỗi dòng ghi người kiểm và giờ kiểm');
    await go('tong-quan'); document.querySelector('.stat.warn .sub a').click(); await W(500);
    ok(location.hash === '#ket-qua-lech' && /lệch số lượng/.test(app.querySelector('h1').textContent) && app.querySelector('[data-filter="lech"]').getAttribute('aria-pressed') === 'true', 'bấm “Xem →” ở ô Lệch số lượng: mở sẵn bộ lọc Lệch');
    ok(dong().length && dong().every(x => ['thieu', 'thua'].includes(res(x))) && dong().includes(a), 'trang Lệch: chỉ có tài sản Thiếu / Thừa, có tài sản vừa ghi thiếu');
    app.querySelector('[data-filter="all"]').click(); await W(300);
    ok(/Tài sản đã kiểm/.test(app.querySelector('h1').textContent) && dong().length === ASSETS.filter(x => res(x) !== 'chua').length, 'đổi bộ lọc “Tất cả đã kiểm”: hiện lại mọi tài sản đã kiểm');
    const q = document.getElementById('q'); q.value = String(a.ma); q.dispatchEvent(new Event('input', { bubbles: true })); await W(500);
    ok(dong().length === 1 && dong()[0] === a, 'tìm theo Mã TSCĐ trong trang kết quả');
    app.querySelector(`.row[data-stt="${a.stt}"] [data-act="clr"]`).click(); await W(300);
    ok(res(a) === 'chua', 'bấm “Kiểm lại” ngay trong trang kết quả: tài sản về Chưa kiểm');
  };

  KB['chung'] = async () => {
    try { localStorage.removeItem(KEY + '.khNam'); } catch (e) { }
    KHV.nam = 0; KHV.dv = ''; KHV.q = '';
    const tinh = nam => {
      const now = new Date(); now.setHours(0, 0, 0, 0); const toi = new Date(now); toi.setFullYear(toi.getFullYear() + 1); let het = 0, gan = 0;
      ASSETS.forEach(a => { if (!a.ngay || a.hoso) return; const sd = (S.rows[a.stt] || {}).sd || ''; if (sd === 'da_tl' || sd === 'bg') return; const t = khHet(a, nam); if (t <= now) het++; else if (t <= toi) gan++; });
      return { het, gan };
    };
    const so = () => [...document.querySelectorAll('.kh-sum b')].map(b => +b.textContent.replace(/\D/g, ''));
    await go('khau-hao');
    let s = so(); const t5 = tinh(5);
    ok(KHV.nam === 5 && s[0] === t5.het && s[1] === t5.gan, `khấu hao mặc định tạm tính 5 năm: ${s[0]} đã hết, ${s[1]} sắp hết trong 12 tháng (tính lại khớp)`);
    ok(/Tạm tính/.test(app.textContent) && document.querySelectorAll('.kh-c').length === 6, 'khấu hao: báo rõ đang tạm tính, có ô chọn số năm');
    document.querySelector('.kh-c[data-n="3"]').click(); await W(350);
    s = so(); const t3 = tinh(3);
    ok(KHV.nam === 3 && s[0] === t3.het && s[1] === t3.gan && s[0] > t5.het && localStorage.getItem(KEY + '.khNam') === '3', 'chọn 3 năm: danh sách tính lại, máy nhớ lựa chọn');
    const ngay = [...document.querySelectorAll('#khHet tbody tr td:nth-child(5)')].map(td => td.textContent.trim().slice(0, 10).split('/').reverse().join('-'));
    ok(ngay.length > 1 && ngay.every((d, i) => !i || ngay[i - 1] <= d), 'đã hết khấu hao: xếp từ tài sản hết lâu nhất trước');
    const ds = () => [...document.querySelectorAll('.kh-tbl tbody a[href^="#ts-"]')].map(x => BY_KEY[decodeURIComponent(x.getAttribute('href').slice(4))]);
    ok(ds().every(a => a && !a.hoso), 'không đưa công trình, xây lắp, phần mềm vào danh sách');
    const dv = document.getElementById('khdv'); dv.value = 'HC'; dv.dispatchEvent(new Event('change', { bubbles: true })); await W(350);
    const hc = ds();
    ok(hc.length > 0 && hc.every(a => a.unit === 'HC'), 'lọc theo sheet Phòng Hành chính: chỉ còn tài sản của sheet đó');
    let cap = null; const goc = window.xuatBangExcel; window.xuatBangExcel = async (ten, cot, dong) => { cap = { ten, cot, dong }; };
    app.querySelector('[data-ch="khxlsx"]').click(); await W(400); window.xuatBangExcel = goc;
    const l = khLoc();
    ok(cap && cap.dong.length === l.het.length + l.gan.length && cap.cot[0][0] === 'Khấu hao', `Tải Excel danh sách: ${cap ? cap.dong.length : 0} tài sản, đúng bộ lọc`);
    KHV.dv = '';

    await go('dau-moi');
    ok(document.querySelectorAll('.dm-it').length === UNITS.length, `đầu mối: đủ ${UNITS.length} sheet (bộ môn, khoa, phòng ban, sheet lẻ)`);
    document.querySelector('[data-dm="GD"] [data-ch="dmsua"]').click(); await W(300);
    const f = (k, v) => { document.getElementById(`dm-${k}-GD`).value = v; };
    f('ten', 'Nguyễn Văn Thử'); f('cv', 'Chủ nhiệm bộ môn'); f('email', 'sai-email');
    document.querySelector('[data-dm="GD"] [data-ch="dmluu"]').click(); await W(300);
    ok(!dmCua('GD') && /Email chưa đúng/.test(txt('toastMsg')), 'email sai dạng: không lưu, báo rõ');
    f('email', 'thu.nv@vd.vn'); document.querySelector('[data-dm="GD"] [data-ch="dmluu"]').click(); await W(400);
    ok(dmCua('GD') && dmCua('GD').email === 'thu.nv@vd.vn' && document.querySelector('[data-dm="GD"]').textContent.includes('thu.nv@vd.vn'), 'lưu đầu mối sheet GD: tên, chức vụ, email');
    ok(LOGMINE.some(e => e.kind === 'chung' && /Họ tên: trống → Nguyễn Văn Thử/.test((e.lines || []).join(' '))), 'lịch sử ghi lần thêm đầu mối');
    const aGD = BY_UNIT.GD.find(a => a.ma && String(a.ma) === String(a.key));
    await go('ts-' + aGD.key);
    ok(app.querySelector('.tsx-dl').textContent.includes('Nguyễn Văn Thử'), 'trang tài sản: hiện đầu mối quản lý');
    await go('dv-GD');
    ok((app.querySelector('.dm-l') || {}).textContent.includes('thu.nv@vd.vn'), 'trang sheet: hiện đầu mối');
    await go('ly-lich-' + aGD.key); await W(300);
    ok(app.textContent.includes('Nguyễn Văn Thử'), 'lý lịch tài sản: hiện đầu mối');
    S.rows[aGD.stt] = { tt: 0, nf: true, at: Date.now() }; save(); await go('xac-minh');
    ok([...document.querySelectorAll('.xm')].some(x => x.textContent.includes('Nguyễn Văn Thử')), 'Tài sản thất lạc: hiện đầu mối để liên hệ');
    await go('khau-hao'); const dv2 = document.getElementById('khdv'); dv2.value = 'GD'; dv2.dispatchEvent(new Event('change', { bubbles: true })); await W(350);
    const o = [...document.querySelectorAll('.kh-dm')];
    ok(!o.length || o.every(td => td.textContent.includes('Nguyễn Văn Thử')), 'khấu hao: cột Đầu mối hiện đúng người');
    KHV.dv = '';
    const kq = JSON.stringify(ketQuaKeToan(aGD));
    ok(!kq.includes('thu.nv@vd.vn') && !kq.includes('Nguyễn Văn Thử'), 'kết quả cho kế toán không có đầu mối');
    const src = await (await fetch('export.js')).text();
    ok(!/S\.dm|dmCua|dmText|dmChu/.test(src), 'file “Xuất cho kế toán” không đọc dữ liệu đầu mối');
    await go('ts-' + aGD.key); app.querySelector('.row [data-act="xt"]').click(); await until(() => document.getElementById('xtDlg') && document.getElementById('xtDlg').open);
    const dx = document.getElementById('xtDlg');
    ok(!!dx.querySelector('.xt-qr svg') && /bật đăng nhập/.test(dx.textContent) && !dx.querySelector('input[data-xt="them"]'), 'chưa bật đăng nhập: nút ⋯ vẫn có mã QR; phần ảnh báo cần bật đăng nhập');
    dx.close();
  };

  // Đăng nhập (đăng nhập giả scripts/thu-dang-nhap-gia.js, không đụng Supabase)
  const dien = (id, v) => { document.getElementById(id).value = v; };
  KB['dang-nhap-dau'] = async () => {
    await until(() => document.getElementById('dnMan'));
    ok(/Tạo tài khoản quản trị/.test(txt('dnMan')) && document.body.classList.contains('dn-cho') && getComputedStyle(document.querySelector('.top')).display === 'none', 'lần đầu: hiện màn hình tạo tài khoản quản trị, ẩn toàn bộ trang');
    const tao = async (ten, mk, mk2) => { dien('dnTen', ten); dien('dnHoTen', 'Người Quản Trị'); dien('dnEmail', 'qt@vd.vn'); dien('dnMk', mk); dien('dnMk2', mk2 == null ? mk : mk2); document.getElementById('dnNut').click(); await W(300); };
    await tao('Sai Ten', 'Hoa-sen-nam-2026');
    ok(/chữ thường không dấu/.test(txt('dnLoi')) && !READY, 'tên đăng nhập có chữ hoa, dấu cách: báo lỗi, chưa vào trang');
    await tao('quantri2', 'Ngan#2026');
    ok(/ít nhất 12/.test(txt('dnLoi')), 'chính sách mật khẩu: dưới 12 ký tự bị chặn');
    await tao('quantri2', 'quantri2-hoa-sen');
    ok(/không được chứa tên đăng nhập/.test(txt('dnLoi')), 'chính sách mật khẩu: chứa tên đăng nhập bị chặn');
    await tao('quantri2', 'Hoa-sen-nam-2026', 'khac');
    ok(/chưa giống nhau/.test(txt('dnLoi')), 'nhập lại mật khẩu khác: báo lỗi');
    await tao('quantri2', 'Hoa-sen-nam-2026');
    await until(() => document.getElementById('dnMa'));
    ok(/bắt buộc với quản trị/.test(txt('dnMan')) && !!document.querySelector('.dn-qr img') && !READY, 'tạo quản trị xong: bắt buộc bật xác thực 2 bước trước khi vào trang (có mã QR)');
    dien('dnMa', '000000'); document.getElementById('dnNut').click(); await W(300);
    ok(/Mã xác thực không đúng/.test(txt('dnLoi')) && !READY, 'mã xác thực sai: chưa vào được');
    dien('dnMa', '246810'); document.getElementById('dnNut').click();
    await until(() => READY && !document.getElementById('dnMan'));
    ok(KIEMKE_AUTH_GIA.tk[0].mfa === true, 'đã bật xác thực 2 bước cho quản trị');
    ok(READY && DN.toi && DN.toi.quyen === 'admin' && ME === 'Người Quản Trị', 'tạo xong: vào trang với quyền quản trị, tên người kiểm lấy từ tài khoản');
    ok(KIEMKE_AUTH_GIA.tk.length === 1 && KIEMKE_AUTH_GIA.tk[0].ten === 'quantri2', 'đã tạo đúng 1 tài khoản quản trị');
  };

  KB['dang-nhap'] = async () => {
    const A = KIEMKE_AUTH_GIA;
    const dangNhap = async (ten, mk) => { await until(() => document.getElementById('dnTen')); dien('dnTen', ten); dien('dnMk', mk); document.getElementById('dnNut').click(); await W(400); };
    await until(() => document.getElementById('dnMan'));
    ok(!READY && /Đăng nhập/.test(txt('dnNut')) && !document.getElementById('dnHoTen') && !!document.getElementById('dnNho'), 'mở trang: phải đăng nhập, có ô "Ghi nhớ đăng nhập trên máy này"');
    ok(document.getElementById('dnTen').autocomplete === 'username' && document.getElementById('dnMk').autocomplete === 'current-password', 'ô đăng nhập hỗ trợ trình quản lý mật khẩu (autocomplete)');
    await dangNhap('quantri', 'sai-mat-khau');
    ok(/Sai tên đăng nhập hoặc mật khẩu/.test(txt('dnLoi')) && !READY, 'sai mật khẩu: báo lỗi, không vào được');
    await dangNhap('khongco', 'MatKhauThu#1');
    ok(/Sai tên đăng nhập hoặc mật khẩu/.test(txt('dnLoi')), 'sai tên đăng nhập: báo lỗi chung (không lộ tên nào có thật)');
    for (let i = 0; i < 3; i++) await dangNhap('quantri', 'sai-nua-' + i);
    await dangNhap('quantri', 'MatKhauThu#1');
    ok(/Thử lại sau \d+ giây/.test(txt('dnLoi')) && !READY, 'nhập sai 5 lần: tạm khoá ô đăng nhập 60 giây, kể cả khi gõ đúng');
    try { sessionStorage.removeItem('kiemke-sai'); } catch (e) { }
    await dangNhap('QuanTri', 'MatKhauThu#1'); await until(() => document.getElementById('dnMa'));
    ok(/bắt buộc với quản trị/.test(txt('dnMan')) && !READY, 'quản trị chưa bật 2 lớp: phải bật ngay sau mật khẩu, chưa vào trang');
    dien('dnMa', '246810'); document.getElementById('dnNut').click(); await until(() => READY);
    ok(READY && DN.toi && DN.toi.ten === 'quantri' && txt('whoN') === 'Quản trị thử', 'đăng nhập đúng (gõ chữ hoa vẫn nhận): vào trang, đầu trang hiện tên tài khoản');
    ok(LOGMINE.some(e => e.kind === 'chung' && e.title === 'Đăng nhập') && LOGMINE.some(e => /Bật xác thực 2 bước/.test(e.title)), 'lịch sử ghi lần đăng nhập (thiết bị, trình duyệt) và lần bật 2 lớp');

    await go('quan-ly'); await until(() => document.querySelector('.ql-tbl'));
    ok(/Tài khoản của tôi/.test(app.textContent) && document.querySelectorAll('.ql-tbl tbody tr').length === 1, 'Quản lý: tài khoản của tôi và danh sách thành viên (quản trị)');
    ok(/Khoá dữ liệu tài sản/.test(app.textContent) && /Chưa khoá/.test(app.textContent), 'quản trị thấy mục Khoá dữ liệu tài sản (bản thử chưa khoá)');
    const them = async (ten, hoTen, email, mk, quyen) => { dien('qtTen', ten); dien('qtHoTen', hoTen); dien('qtEmail', email); dien('qtMk', mk); dien('qtQuyen', quyen); document.querySelector('#qlThem button[type="submit"]').click(); await W(400); };
    await them('thanhvien1', 'Thành Viên Một', 'tv1@vd.vn', '123', 'xem');
    ok(/ít nhất 12/.test(txt('qlThemLoi')) && A.tk.length === 1, 'mật khẩu ban đầu quá ngắn: không tạo');
    await them('thanhvien1', 'Thành Viên Một', 'tv1@vd.vn', '123456789012', 'xem');
    ok(/chỉ gồm chữ số|phổ biến/.test(txt('qlThemLoi')) && A.tk.length === 1, 'mật khẩu toàn số / quá phổ biến: không tạo');
    await them('thanhvien1', 'Thành Viên Một', 'tv1@vd.vn', 'Ban-dau-2026!', 'xem');
    await until(() => document.querySelectorAll('.ql-tbl tbody tr').length === 2);
    ok(A.tk.length === 2 && A.tk[1].quyen === 'xem', 'thêm thành viên quyền "Tra cứu"');
    ok([...document.querySelectorAll('#qtQuyen option')].map(o => o.value).join() === 'xem,kiem,admin', 'có đủ 3 mức quyền: Tra cứu, Kiểm kê, Quản trị');
    await them('thanhvien2', 'Thành Viên Hai', 'tv2@vd.vn', 'Song-Han-2026!', 'kiem');
    await until(() => document.querySelectorAll('.ql-tbl tbody tr').length === 3);
    ok(A.tk.length === 3 && A.tk[2].quyen === 'kiem', 'thêm thành viên quyền "Kiểm kê"');
    ok(LOGMINE.some(e => e.kind === 'chung' && /Thêm thành viên thanhvien1/.test(e.title)) && !JSON.stringify(LOGMINE).includes('Ban-dau-2026!'), 'lịch sử ghi lần thêm thành viên, không ghi mật khẩu');
    const tr = () => document.querySelector(`.ql-tbl tr[data-uid="${A.tk[1].uid}"]`);
    tr().querySelector('[data-ql="mk"]').click(); await W(200);
    dien('qlDat-' + A.tk[1].uid, 'Dat-lai-2026!'); tr().querySelector('[data-ql="datmk"]').click(); await W(400);
    ok(A.tk[1].mk === 'Dat-lai-2026!', 'quản trị đặt lại mật khẩu cho thành viên quên mật khẩu');
    const doi = async (cu, moi, moi2) => { dien('qlMkCu', cu); dien('qlMkMoi', moi); dien('qlMkMoi2', moi2 == null ? moi : moi2); document.querySelector('#qlMk button[type="submit"]').click(); await W(400); };
    await doi('sai', 'Moi-moi-2026!');
    ok(/hiện tại chưa đúng/.test(txt('qlMkLoi')) && A.tk[0].mk === 'MatKhauThu#1', 'đổi mật khẩu: sai mật khẩu hiện tại thì không đổi');
    await doi('MatKhauThu#1', 'Ngay-15031990!');
    ok(/ngày tháng/.test(txt('qlMkLoi')) && A.tk[0].mk === 'MatKhauThu#1', 'mật khẩu có ngày sinh: cảnh báo trước, chưa đổi');
    await doi('MatKhauThu#1', 'Moi-moi-2026!');
    ok(A.tk[0].mk === 'Moi-moi-2026!' && /Đã đổi mật khẩu/.test(txt('toastMsg')), 'đổi mật khẩu của mình thành công');

    // xác thực 2 bước (đã bật bắt buộc lúc đăng nhập)
    await until(() => /Đang bật/.test(app.textContent));
    ok(!!app.querySelector('[data-ql="mfadoi"]') && !app.querySelector('[data-ql="mfatat"]'), 'quản trị: xác thực 2 bước đang bật, không có nút tắt, có "Chuyển sang điện thoại mới"');
    app.querySelector('[data-ql="ra"]').click(); await W(500);
    await dangNhap('quantri', 'Moi-moi-2026!'); await until(() => document.getElementById('dnMa'));
    ok(!READY || !DN.toi, 'đăng nhập bằng mật khẩu xong: còn phải nhập mã xác thực 2 bước');
    dien('dnMa', '111111'); document.getElementById('dnNut').click(); await W(300);
    ok(/Mã xác thực không đúng/.test(txt('dnLoi')) && !DN.toi, 'mã xác thực sai: không vào được');
    dien('dnMa', '246810'); document.getElementById('dnNut').click(); await until(() => DN.toi && !document.getElementById('dnMan'));
    ok(DN.toi && DN.toi.ten === 'quantri', 'mã xác thực đúng: vào trang');

    await go('danh-ba'); await until(() => DN.db.tai);
    app.querySelector('[data-db="moi"]').click(); await W(300);
    dien('dbHoTen', 'Lê Thị Danh'); dien('dbChucVu', 'Chủ nhiệm bộ môn'); dien('dbDonVi', 'GD'); dien('dbDt', '0905 123 456'); dien('dbEmail', 'danh.lt@vd.vn');
    document.querySelector('#dbForm button[type="submit"]').click(); await W(400);
    ok(A.db.length === 1 && app.textContent.includes('Lê Thị Danh') && !!app.querySelector('a[href="tel:0905123456"]'), 'Danh bạ: thêm người, số điện thoại bấm gọi được');
    S.dm.GD = { ten: 'Lê Thị Danh', cv: 'Chủ nhiệm bộ môn', email: 'danh.lt@vd.vn', at: Date.now() }; save();
    const aGD = BY_UNIT.GD.find(a => a.ma && String(a.ma) === String(a.key));
    await go('ts-' + aGD.key);
    ok(!!app.querySelector('.tsx-dl a[href="tel:0905123456"]'), 'đầu mối ở trang tài sản: có thêm số điện thoại lấy từ danh bạ');
    ok(!JSON.stringify(ketQuaKeToan(aGD)).includes('0905'), 'số điện thoại không vào kết quả cho kế toán');

    await go('quan-ly'); app.querySelector('[data-ql="ra"]').click(); await W(500);
    ok(!!document.getElementById('dnMan') && document.body.classList.contains('dn-cho'), 'đăng xuất: về màn hình đăng nhập, ẩn trang');
    await dangNhap('thanhvien1', 'Dat-lai-2026!'); await until(() => !document.getElementById('dnMan'));
    ok(DN.toi && DN.toi.quyen === 'xem', 'thành viên đăng nhập được bằng mật khẩu quản trị vừa đặt lại (không cần 2 lớp)');
    await go('ts-' + aGD.key);
    const nutDu = app.querySelector('.row [data-act="du"]');
    ok(document.body.classList.contains('ro') && READONLY && /Tài khoản Tra cứu/.test(app.textContent) && (!nutDu || getComputedStyle(nutDu.closest('.btns') || nutDu).pointerEvents === 'none'), 'quyền "Tra cứu": trang ở chế độ chỉ xem, nút ghi kết quả bị khoá');
    await go('dau-moi');
    ok(!app.querySelector('[data-ch="dmsua"]'), 'quyền "Tra cứu": không sửa được đầu mối');
    await go('danh-ba'); await until(() => DN.db.tai);
    ok(app.textContent.includes('Lê Thị Danh') && !app.querySelector('[data-db="moi"]') && !app.querySelector('[data-db="sua"]'), 'quyền "Tra cứu": xem được danh bạ, không có nút thêm, sửa');
    await go('quan-ly');
    ok(/Tài khoản của tôi/.test(app.textContent) && !app.querySelector('.ql-tbl') && !document.getElementById('qlThem') && !/Khoá dữ liệu tài sản|Xác thực 2 bước/.test(app.textContent), 'người không phải quản trị: không thấy Thành viên, Khoá dữ liệu, Xác thực 2 bước');
    // Kiểm kê: ghi được kết quả, không sửa danh bạ, đầu mối
    app.querySelector('[data-ql="ra"]').click(); await W(500);
    await dangNhap('thanhvien2', 'Song-Han-2026!'); await until(() => !document.getElementById('dnMan'));
    ok(DN.toi && DN.toi.quyen === 'kiem' && !READONLY && !document.body.classList.contains('ro'), 'quyền "Kiểm kê": đăng nhập bằng mật khẩu (không cần 2 lớp), không ở chế độ chỉ xem');
    const aKK = ASSETS.find(a => a.unit === 'HC' && res(a) === 'chua' && !a.hoso);
    await go('ts-' + aKK.key); app.querySelector('.row [data-act="du"]').click(); await W(400);
    ok(res(aKK) === 'du' && LOGMINE.some(e => e.key === aKK.key && e.by === 'Thành Viên Hai'), 'quyền "Kiểm kê": bấm Đủ được, lịch sử ghi đúng tên người kiểm');
    await go('danh-ba'); await until(() => DN.db.tai);
    ok(!app.querySelector('[data-db="moi"]') && !app.querySelector('[data-db="sua"]'), 'quyền "Kiểm kê": không sửa được danh bạ');
    await go('dau-moi');
    ok(!app.querySelector('[data-ch="dmsua"]'), 'quyền "Kiểm kê": không sửa được đầu mối');
    // tự đăng xuất khi để máy không dùng quá 8 giờ
    try { localStorage.setItem('kiemke-hoat-dong', String(Date.now() - 9 * 3600e3)); } catch (e) { }
    ok(DN.kiemTraNhanRoi() === true, 'không dùng trang quá 8 giờ: tự đăng xuất');
    await until(() => document.getElementById('dnMan'));
    ok(/không dùng trang hơn 8 giờ/.test(txt('dnLoi')), 'màn hình đăng nhập báo rõ vì sao bị đăng xuất');
    A.tk[1].khoa = true;
    await dangNhap('thanhvien1', 'Dat-lai-2026!');
    ok(!!document.getElementById('dnMan') && /Sai tên đăng nhập/.test(txt('dnLoi')), 'tài khoản bị khoá: không đăng nhập được');
  };

  // bản build có khoá KIEMKE_KHOA_DU_LIEU: dữ liệu tài sản chỉ có dạng mã hoá
  KB['ma-hoa'] = async () => {
    await until(() => document.getElementById('dnMan'));
    ok(typeof KIEMKE_DATA === 'undefined' && typeof ASSETS === 'undefined', 'chưa đăng nhập: trang chưa có dữ liệu tài sản, mã chính chưa chạy');
    const st = async p => (await fetch(p, { cache: 'no-store' })).status;
    ok(await st('data/assets.js') === 404 && await st('data/goc.xlsx') === 404 && await st('data/so-ma-qr.js') === 404, 'không tải được bản thường của danh sách tài sản, Sổ mã QR, file Excel gốc');
    const enc = new Uint8Array(await (await fetch('data/assets.enc')).arrayBuffer()), chu = new TextDecoder('utf-8', { fatal: false }).decode(enc);
    ok(enc.length > 1000 && !/Máy tính|Mã TSCĐ|6497474|Gamma/.test(chu), 'tải trộm file mã hoá (data/assets.enc): không đọc được tên, mã, phòng');
    dien('dnTen', 'quantri'); dien('dnMk', 'MatKhauThu#1'); document.getElementById('dnNut').click();
    await until(() => document.getElementById('dnMa'));
    ok(typeof ASSETS === 'undefined', 'quản trị chưa qua bước 2: chưa giải mã dữ liệu');
    dien('dnMa', '246810'); document.getElementById('dnNut').click();
    await until(() => typeof READY !== 'undefined' && READY, 30000);
    ok(typeof ASSETS !== 'undefined' && ASSETS.length > 1000 && !!BY_KEY['6497474'], `đăng nhập xong: giải mã đủ ${typeof ASSETS !== 'undefined' ? ASSETS.length : 0} tài sản, trang chạy bình thường`);
    ok(Object.keys(KIEMKE_SO_QR.dang || {}).length > 1000, 'Sổ mã QR giải mã đủ');
    const goc = new Uint8Array(await kiemkeTepGoc());
    ok(goc.length > 10000 && goc[0] === 0x50 && goc[1] === 0x4B, 'file Excel gốc giải mã được (dùng cho Xuất cho kế toán)');
    await go('ts-6497474');
    ok(!!app.querySelector('.tsx'), 'mở trang một tài sản bình thường sau khi giải mã');
  };

  // Nút ⋯ trên dòng tài sản: mã QR + ảnh (kho ảnh giả trong scripts/thu-dang-nhap-gia.js)
  KB['anh'] = async () => {
    const A = KIEMKE_AUTH_GIA;
    const dangNhap = async (ten, mk) => { await until(() => document.getElementById('dnTen')); dien('dnTen', ten); dien('dnMk', mk); document.getElementById('dnNut').click(); await W(400); };
    const taoAnh = (mau, ten) => new Promise(ok => { const c = document.createElement('canvas'); c.width = 2400; c.height = 1800; const x = c.getContext('2d'); x.fillStyle = mau; x.fillRect(0, 0, 2400, 1800); x.fillStyle = '#fff'; x.font = '240px sans-serif'; x.fillText(ten, 300, 1000); c.toBlob(b => ok(new File([b], ten + '.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.92); });
    const chon = files => { const inp = document.querySelector('#xtDlg input[data-xt="them"]'); const dt = new DataTransfer(); files.forEach(f => dt.items.add(f)); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); };
    await dangNhap('kiemvien', 'Kiem-vien-thu-1'); await until(() => READY);
    const a = BY_UNIT.GD.find(x => x.ma && String(x.ma) === String(x.key));
    await go('ts-' + a.key);
    ok(!!app.querySelector('.row [data-act="xt"]'), 'mỗi dòng tài sản có nút ⋯ (mở rộng)');
    app.querySelector('.row [data-act="xt"]').click(); await until(() => document.getElementById('xtDlg') && document.getElementById('xtDlg').open);
    const d = document.getElementById('xtDlg');
    ok(!!d.querySelector('.xt-qr svg') && d.textContent.includes(KIEMKE_QR.payload(a.key)), 'mở rộng: có mã QR đúng của tài sản');
    ok(d.querySelectorAll('input[data-xt="them"]').length === 2, 'quyền Kiểm kê: có nút Thêm ảnh và Chụp ảnh');
    chon([await taoAnh('#c2410c', 'A1'), await taoAnh('#0f766e', 'A2')]);
    await until(() => d.querySelectorAll('.xt-thumb img').length === 2 && !d.querySelector('.xt-cho'), 30000);
    const ds = (S.anh[a.stt] || {}).ds || [];
    ok(ds.length === 2 && A.kho.size === 4, 'tải lên 2 ảnh (mỗi ảnh kèm bản nhỏ), ghi vào danh sách ảnh của tài sản');
    ok(/Đã thêm 2 ảnh/.test(txt('toastMsg')) && document.getElementById('toast').matches(':popover-open'), 'thông báo “Đã thêm 2 ảnh” nổi trên hộp thoại (không bị che)');
    const lon = A.kho.get(ds[0].p), bm = await createImageBitmap(lon), nho = await createImageBitmap(A.kho.get(ds[0].n));
    ok(Math.max(bm.width, bm.height) === 1600 && Math.max(nho.width, nho.height) === 400 && lon.size < 700000, `ảnh thu nhỏ trước khi tải lên: ${bm.width}×${bm.height}, ${Math.round(lon.size / 1024)} KB; ảnh nhỏ ${nho.width}×${nho.height}`);
    ok(LOGMINE.some(e => e.key === a.key && (e.lines || []).some(l => /Thêm \d ảnh/.test(l))), 'lịch sử ghi lần thêm ảnh (theo tên người làm)');
    d.querySelector('[data-xt="xem"]').click(); await until(() => document.getElementById('xemAnh') && document.querySelector('#xemAnh .lb-anh'));
    const lb = document.getElementById('xemAnh');
    ok(lb.open && /1\/2/.test(lb.querySelector('.lb-dem').textContent) && !!lb.querySelector('.lb-nen') && !!lb.querySelector('[data-lb="tai"]') && !!lb.querySelector('[data-lb="dong"]') && lb.querySelectorAll('.lb-nho').length === 2,
      'xem ảnh kiểu Messenger: nền mờ, đếm 1/2, nút tải về, đóng, dải ảnh nhỏ');
    lb.querySelector('[data-lb="sau"]').click(); await W(200);
    ok(/2\/2/.test(lb.querySelector('.lb-dem').textContent) && lb.querySelectorAll('.lb-nho')[1].classList.contains('chon'), 'bấm mũi tên: sang ảnh 2, dải ảnh nhỏ tô ảnh đang xem');
    lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await W(200);
    ok(/1\/2/.test(lb.querySelector('.lb-dem').textContent), 'phím mũi tên: quay vòng về ảnh 1');
    lb.querySelector('[data-lb="dong"]').click(); await W(200);
    ok(!lb.open && d.open, 'đóng trình xem ảnh: về lại hộp mở rộng');
    chon([await taoAnh('#333', 'B1'), await taoAnh('#444', 'B2'), await taoAnh('#555', 'B3'), await taoAnh('#666', 'B4')]);
    await until(() => ((S.anh[a.stt] || {}).ds || []).length === 5 && !d.querySelector('.xt-cho'), 40000);
    ok(S.anh[a.stt].ds.length === 5 && !d.querySelector('input[data-xt="them"]'), 'tối đa 5 ảnh mỗi tài sản: chọn 4 ảnh khi đã có 2 thì chỉ nhận 3, hết chỗ thì ẩn nút thêm');
    const xb = d.querySelector('[data-xt="xoa"]'); xb.click(); await W(150);
    ok(/Xoá\?/.test(xb.textContent) && S.anh[a.stt].ds.length === 5, 'xoá ảnh: bấm lần đầu chỉ hỏi lại');
    xb.click(); await until(() => S.anh[a.stt].ds.length === 4);
    ok(S.anh[a.stt].ds.length === 4 && A.kho.size === 8, 'bấm lần nữa: xoá cả ảnh lớn và ảnh nhỏ');
    d.close(); await W(300);
    ok((app.querySelector('.row .xt-n') || {}).textContent === '4', 'nút ⋯ trên dòng hiện số ảnh của tài sản');
    await go('quan-ly'); app.querySelector('[data-ql="ra"]').click(); await W(500);
    await dangNhap('tracuu', 'Tra-cuu-thu-01'); await until(() => DN.toi && !document.getElementById('dnMan'));
    await go('ts-' + a.key); app.querySelector('.row [data-act="xt"]').click();
    await until(() => d.open && d.querySelectorAll('.xt-thumb img').length === 4);
    ok(!d.querySelector('input[data-xt="them"]') && !d.querySelector('[data-xt="xoa"]'), 'quyền Tra cứu: xem được 4 ảnh, không có nút thêm, xoá');
    d.querySelector('[data-xt="xem"]').click(); await until(() => lb.open && lb.querySelector('.lb-anh'));
    ok(lb.open, 'quyền Tra cứu: mở xem ảnh toàn màn hình được');
    lb.close(); d.close();
  };

  KB['dien-thoai'] = async () => {
    await go('phong-108-gamma'); await W(300);
    const sc = document.getElementById('scanBtn').getBoundingClientRect();
    ok(Math.abs((sc.left + sc.right) / 2 - innerWidth / 2) < 3, 'điện thoại: nút Quét mã nằm giữa thanh dưới');
    const qr = document.getElementById('swQR').getBoundingClientRect(), ls = document.getElementById('swLS').getBoundingClientRect(), ch = document.getElementById('swCH').getBoundingClientRect();
    ok(qr.right <= sc.left + 1 && ls.left >= sc.right - 1, 'điện thoại: nút Quét mã không đè chữ Mã QR / Lịch sử');
    ok(ch.width > 40 && ch.right <= innerWidth + 1 && ch.left >= ls.right - 1, 'điện thoại: thanh dưới có ô Chung, không tràn');
    for (const h of ['trang-chu', 'tong-quan', 'phong-108-gamma', 'ma-qr', 'nhap-so', 'ly-lich-6497474', 'ts-6497474', 'khau-hao', 'dau-moi']) {
      await go(h); await W(300);
      ok(document.documentElement.scrollWidth <= innerWidth + 1, `điện thoại: #${h} không bị tràn ngang`);
    }
  };

  try {
    while ((typeof READY === 'undefined' || !READY) && !document.getElementById('dnMan')) await W(50);   // trang thử đăng nhập: chờ màn hình đăng nhập
    await W(300);
    const ten = location.search.slice(1);
    if (!KB[ten]) ok(false, 'không có kịch bản ' + ten); else await KB[ten]();
  } catch (e) { ok(false, 'kịch bản dừng giữa chừng: ' + String(e && e.stack || e).slice(0, 300)); }
  xong();
})();
