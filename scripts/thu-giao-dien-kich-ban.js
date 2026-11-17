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
  // axe-core: chuẩn WCAG 2.2 AA + khuyến nghị. preload:false — axe không tự tải lại tệp CSS (phông Google) để soi; trang chặn việc đó
  // bằng CSP và không được nới CSP vì bộ thử. Tắt riêng luật "skip-link" (nhóm khuyến nghị, KHÔNG phải tiêu chí WCAG): app dùng
  // đường link #… làm trang, menu con cuộn ngang trên điện thoại đẩy mục đầu ra khỏi màn hình và axe đoán nhầm đó là "link nhảy tới
  // nội dung". Thay bằng kiểm tra chặt hơn linkHong(): mọi link #… trên trang phải mở một trang có thật hoặc trỏ tới phần tử có thật.
  const AXE = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, rules: { 'skip-link': { enabled: false } }, resultTypes: ['violations'], preload: false };
  const TRANG_CO = /^(trang-chu|tong-quan|don-vi|vi-tri|xac-minh|xuat|ket-qua|ket-qua-lech|tong-hop|ma-qr|so-ma-qr|lich-su|nhap-so|ly-lich|khau-hao|dau-moi|danh-ba|quan-ly|anh-tai-san|(ts|ly-lich|phong)-.+)$/;
  const linkHong = () => [...new Set([...document.querySelectorAll('a[href^="#"]')].map(a => decodeURIComponent(a.getAttribute('href').slice(1))))]
    .filter(h => h && !document.getElementById(h) && !(h.startsWith('dv-') ? UNIT[h.slice(3)] : TRANG_CO.test(h)));
  const KB = {};

  KB['dau-trang'] = async () => {
    await go('trang-chu'); let h = hd();
    ok(h.mod === 'hub' && h.top2 === 'none', 'trang chủ: ẩn hàng menu con');
    ok([...document.querySelectorAll('#app .tile b')].map(b => b.textContent).join('|') === 'Kiểm kê tài sản 2026|Quản lý mã QR tài sản|Lịch sử|Chung', 'trang chủ có đủ 4 phần (thêm Chung)');
    { const t = document.querySelector('.top1').getBoundingClientRect(); ok(t.height < 80, `đầu trang 1366px: 4 phần chính nằm gọn một hàng (cao ${Math.round(t.height)}px)`); }
    ok(document.querySelector('.lgo img') && document.querySelector('.lgo img').naturalWidth === 960, 'logo FPT University tải được (960×375)');
    for (const [hash, mod, sec, sub] of [['tong-quan', 'kk', 'swKK', 'tong-quan'], ['vi-tri', 'kk', 'swKK', 'vi-tri'], ['xac-minh', 'kk', 'swKK', 'xac-minh'], ['xuat', 'kk', 'swKK', 'xuat'],
      ['ma-qr', 'qr', 'swQR', 'ma-qr'], ['so-ma-qr', 'qr', 'swQR', 'so-ma-qr'], ['lich-su', 'ls', 'swLS', 'lich-su'], ['nhap-so', 'ls', 'swLS', 'nhap-so'], ['ly-lich', 'ls', 'swLS', 'ly-lich'], ['khau-hao', 'ch', 'swCH', 'khau-hao'], ['dau-moi', 'ch', 'swCH', 'dau-moi'], ['anh-tai-san', 'ch', 'swCH', 'anh-tai-san']]) {
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
    // quy tắc vàng 7: kết quả kiểm lưu theo Mã TSCĐ (khoá a.key), không theo STT — đổi thứ tự dòng Excel không làm gắn nhầm tài sản
    { const b = BY_UNIT.GD.find(x => x.ma && String(x.ma) === String(x.key)), n = ASSETS.filter(x => x.ma && String(x.ma) !== String(x.key)).length;
      ok(docId('rows', b.stt) === String(b.ma) && docId('xm', b.stt) === String(b.ma) && docId('anh', b.stt) === String(b.ma) && localKey('rows', String(b.ma)) === String(b.stt) && docId('units', 'GD') === 'GD',
        `kết quả kiểm, xác minh, ảnh lưu theo Mã TSCĐ (STT ${b.stt} → khoá ${b.ma}), không theo STT; ${n} tài sản có khoá khác Mã TSCĐ`); }
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
    // Tìm theo STT (cột STT sheet Tổng hợp) ở mọi ô tìm tài sản — người dùng yêu cầu 16/11/2026
    const go2 = async (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); await W(500); };
    const a142 = ASSETS.find(x => x.stt === 142);
    await go('tong-quan'); await go2('gq', '142');
    { const h = app.querySelector('#gres .srow'); ok(h && h.classList.contains('stt-hit') && h.textContent.includes(String(a142.ma)), `Bảng tổng quan: gõ “142” → tài sản STT 142 (${a142.ma}) đứng đầu, tô nổi`); }
    document.getElementById('gq').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await W(500);
    ok(location.hash === '#ts-' + encodeURIComponent(a142.key), 'gõ STT rồi Enter: mở thẳng trang tài sản đó');
    await go('dv-' + a142.unit); await go2('q', 'stt 142');
    ok([...app.querySelectorAll('.row[data-stt]')].map(r => +r.dataset.stt).join() === '142', 'trang sheet: gõ “STT 142” → đúng 1 tài sản STT 142');
    await go('tong-hop'); await go2('thq', '#142');
    ok(app.querySelectorAll('.th-r').length === 1 && app.querySelector('.th-r').dataset.stt === '142', 'Tổng hợp: gõ “#142” → đúng tài sản STT 142');
    TH.q = ''; await go('ly-lich'); await go2('llq', '142');
    ok(/STT 142/.test((document.querySelector('#llRes a') || {}).textContent || ''), 'Lý lịch tài sản: gõ “142” → tài sản STT 142 đứng đầu');
  };

  // Phòng bổ sung (danh mục phòng Gamma / Alpha), quy tắc "xong", đổi phòng ban như đổi phòng, Tải Excel Tổng hợp
  KB['phong-ban'] = async () => {
    const DM = KIEMKE_DATA.phong, coSan = new Set(ASSETS.map(a => slugify(a.vt0)).filter(Boolean));
    const moi = DM.filter(p => !coSan.has(slugify(p.ten)));
    await go('vi-tri');
    const the = n => [...app.querySelectorAll('.room')].find(r => r.getAttribute('href') === '#phong-' + slugify(n));
    ok(moi.length > 100 && moi.every(p => the(p.ten)), `thêm ${moi.length} phòng chưa có (vd. ${moi.slice(0, 3).map(p => p.ten).join(', ')})`);
    { const t = the(moi[0].ten); ok(t && t.classList.contains('done') && /Xong · 0 tài sản/.test(t.textContent), `phòng mới ${moi[0].ten}: 0 tài sản, hiện “Xong” (0/0)`); }
    { const sl = [...app.querySelectorAll('.room')].map(r => r.getAttribute('href')); ok(sl.length === new Set(sl).size, 'không có phòng nào bị lặp'); }
    { const r101 = the('101 Gamma'); ok(r101 && new RegExp(roomAssets(slugify('101 Gamma')).length + ' dòng').test(r101.textContent) && /101/.test(r101.textContent), 'phòng đã có (101 Gamma) giữ nguyên tên và tài sản'); }
    ok(!!app.querySelector('.rooms .tang-n') && [...app.querySelectorAll('.rooms .tang-n')].some(x => /Tầng 2/.test(x.textContent)), 'lưới phòng có nhãn tầng (tầng dưới lên tầng trên)');
    await go('phong-' + slugify('408 Gamma'));
    ok(/Cybersecurity Lab/.test((app.querySelector('.ph-gc') || {}).textContent || ''), 'trang phòng hiện ghi chú phòng (408 Gamma: Cybersecurity Lab)');
    await go('phong-' + slugify('101 Gamma'));
    ok(/101 Gamma/.test(app.querySelector('h1').textContent) && /bộ môn AI/.test((app.querySelector('.ph-gc') || {}).textContent || ''), 'phòng đã có cũng hiện ghi chú, tên giữ nguyên');
    await go('phong-' + slugify('305 Alpha'));
    ok(/0\/0 dòng/.test(app.textContent) && /Xong/.test((app.querySelector('#prog') || {}).textContent || ''), 'trang phòng mới: tiến độ 0/0, Xong');
    // quy tắc xong: đủ hết mới xong; còn thiếu / chưa tìm thấy thì chưa xong
    const ph = Object.values(buildRooms()).find(r => r.slug !== NOROOM && r.list.length >= 2 && r.list.every(a => !a.hoso && a.sl >= 1)), L = ph.list;
    L.forEach(a => { S.rows[a.stt] = { tt: a.sl, nf: false, phong: roomOf(a), cond: 'tot', at: Date.now() }; }); save(); refreshRooms();
    await go('vi-tri'); ok(the(ph.name).classList.contains('done'), `${ph.name}: kiểm đủ hết → Xong`);
    S.rows[L[0].stt] = { ...S.rows[L[0].stt], tt: L[0].sl - 1 || 0, nf: L[0].sl - 1 ? false : true }; save(); refreshRooms();
    await go('tong-quan'); await go('vi-tri');
    ok(!the(ph.name).classList.contains('done') && !/Xong/.test(the(ph.name).querySelector('.st').textContent), `${ph.name}: còn 1 món ${res(L[0]) === 'nf' ? 'chưa tìm thấy' : 'thiếu'} → KHÔNG hiện xong (“${the(ph.name).querySelector('.st').textContent}”)`);
    // đổi phòng ban: tài sản ở Phòng Hành chính → Bộ môn GD
    await go('dv-HC');
    ok(/đang gộp tài sản chưa phân bổ/.test(app.textContent), 'trang Phòng Hành chính: báo đang gộp tài sản chưa phân bổ về các phòng ban');
    const a = BY_UNIT.HC.find(x => x.ma && res(x) === 'chua'), soHC = BY_UNIT.HC.length, soGD = BY_UNIT.GD.length;
    const sel = app.querySelector(`.row[data-stt="${a.stt}"] select[data-f="dv"]`);
    ok(!!sel && sel.value === 'HC' && sel.querySelectorAll('option').length >= 18, 'mỗi dòng có ô Phòng ban (như ô Phòng thực tế)');
    sel.value = 'GD'; sel.dispatchEvent(new Event('change', { bubbles: true })); await W(400);
    ok(a.unit === 'GD' && a.unit0 === 'HC' && S.rows[a.stt].dv === 'GD' && BY_UNIT.HC.length === soHC - 1 && BY_UNIT.GD.length === soGD + 1 && res(a) === 'chua', 'đổi sang Bộ môn GD: rời Phòng Hành chính, sang GD, kết quả kiểm giữ nguyên');
    ok(!app.querySelector(`.row[data-stt="${a.stt}"]`) && !!app.querySelector('.cdi') && app.querySelector('.cdi').textContent.includes(String(a.ma)), 'trang Phòng Hành chính: tài sản rời danh sách, hiện ở mục “Đã chuyển sang phòng ban khác”');
    await go('dv-GD');
    ok(!!app.querySelector(`.row[data-stt="${a.stt}"]`) && /Từ Phòng Hành chính/.test(app.querySelector(`.row[data-stt="${a.stt}"]`).textContent), 'trang Bộ môn GD: có tài sản vừa chuyển, gắn nhãn “Từ Phòng Hành chính”');
    ok(/Phân bổ về: Bộ môn Thiết kế mỹ thuật số/.test(ketQuaKeToan(a).gc), 'file cho kế toán: Ghi chú kiểm kê có “Phân bổ về: …”');
    ok(LOGMINE.some(e => e.key === a.key && (e.lines || []).some(l => /Phòng ban: Phòng Hành chính → Bộ môn Thiết kế/.test(l))), 'lịch sử ghi “Phòng ban: Phòng Hành chính → Bộ môn …”');
    document.getElementById('toastUndo').click(); await W(400);
    ok(a.unit === 'HC' && BY_UNIT.HC.length === soHC, 'bấm Hoàn tác: tài sản về lại Phòng Hành chính');
    // Tổng hợp: ghi chú phòng ở tiêu đề phòng; Tải Excel đúng thứ tự trên trang
    await go('tong-hop');
    ok([...app.querySelectorAll('.th-ph small')].some(x => /Cybersecurity|bộ môn AI|Studio/.test(x.textContent)) || !app.querySelector('.th-ph'), 'Tổng hợp: tiêu đề phòng có ghi chú phòng');
    let cap = null; const goc = window.xuatBangExcel; window.xuatBangExcel = async (ten, cot, dong, tf, tuy) => { cap = { ten, cot, dong, tuy }; };
    app.querySelector('[data-act="thxlsx"]').click(); await W(400); window.xuatBangExcel = goc;
    const thuTu = [...app.querySelectorAll('.th-r')].map(r => +r.dataset.stt);
    ok(cap && cap.dong.length === ASSETS.length && cap.dong.every((d, i) => d[6] === thuTu[i]) && cap.tuy && cap.tuy.loc && cap.cot[0][0] === 'Nhóm',
      `Tải Excel Tổng hợp: ${cap ? cap.dong.length : 0} dòng, đúng thứ tự nhóm / tòa / phòng / bộ môn như trên trang, có nút lọc`);
    // tốc độ: trang "Chưa có vị trí" (nhiều dòng nhất) vẫn mở nhanh dù ô chọn phòng có thêm phòng mới
    const t0 = performance.now(); await go('phong-' + NOROOM); const ms = performance.now() - t0 - 450;
    ok(app.querySelectorAll('.row').length > 300 && ms < 4000, `trang Chưa có vị trí (${app.querySelectorAll('.row').length} dòng) mở trong ~${Math.max(0, Math.round(ms))} ms`);
  };

  // Xuất cho kế toán sau nhiều thao tác THẬT trên trang (bấm nút, chọn ô như cán bộ): file BBKK gốc giữ nguyên hoàn toàn,
  // chỉ khác ở 3 cột cuối (Kết quả kiểm kê · Vị trí thực tế · Ghi chú kiểm kê) + sheet "Tài sản phát sinh" — người dùng chốt 16/11/2026
  KB['xuat-goc'] = async () => {
    const GHI = '=SUM(A1:A9) +84 905 <b>&"\' — chữ đặc biệt';   // ô ghi chú trên trang là ô 1 dòng; trường hợp xuống dòng đã thử ở npm test
    await go('dv-GD');
    const L = BY_UNIT.GD.filter(a => !a.hoso && a.ma && res(a) === 'chua').slice(0, 6);
    const dong = a => app.querySelector(`.row[data-stt="${a.stt}"]`);
    const bam = async (a, act) => { dong(a).querySelector(`[data-act="${act}"]`).click(); await W(300); };
    const chon = async (a, f, v) => { const el = dong(a).querySelector(`[data-f="${f}"]`); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); await W(400); };
    await bam(L[0], 'du'); await bam(L[0], 'more'); await chon(L[0], 'note', GHI);              // Đủ + ghi chú "khó"
    await chon(L[1], 'tt', String(Math.max(0, L[1].sl - 1)));                                    // sửa số → thiếu
    await bam(L[2], 'nf');                                                                       // Không thấy
    await bam(L[3], 'du'); await bam(L[3], 'more'); await chon(L[3], 'cond', 'hong_mp'); await chon(L[3], 'sd', 'muon');   // tình trạng + trạng thái sử dụng
    await chon(L[4], 'phong', '202 Gamma');                                                      // đổi phòng (phòng bổ sung)
    await chon(L[5], 'dv', 'HC');                                                                // đổi phòng ban
    S.xm[L[2].stt] = { kq: 'chi', phong: '101 Gamma', phanhoi: 'Đang để ở 101 Gamma' }; save();   // xác minh thất lạc
    await go('dv-GD');
    document.getElementById('ps-mt').value = 'Máy in phát sinh thử'; document.getElementById('ps-sl').value = '2'; document.getElementById('ps-ph').value = '108 Gamma';
    document.getElementById('psForm').requestSubmit(); await W(300);                              // tài sản phát sinh
    ok(res(L[0]) === 'du' && res(L[1]) === 'thieu' && res(L[2]) === 'nf' && S.rows[L[0].stt].note === GHI && L[5].unit === 'HC' && roomOf(L[4]) === '202 Gamma' && (S.ps.GD || []).length,
      'đã làm đủ thao tác thật: Đủ, sửa số, Không thấy, ghi chú, tình trạng, trạng thái sử dụng, đổi phòng, đổi phòng ban, xác minh, tài sản phát sinh' + ` [${[res(L[0]), res(L[1]), res(L[2]), L[5].unit, roomOf(L[4])].join(' | ')}]`);
    // bấm đúng nút "Tải file Excel cho kế toán", bắt file tải về
    await go('xuat');
    let blob = null; const goc0 = URL.createObjectURL; URL.createObjectURL = b => { blob = b; return 'blob:thu-xuat'; };
    app.querySelector('[data-act="xlsx"]').click();
    await until(() => blob, 60000); URL.createObjectURL = goc0;
    ok(!!blob, 'bấm “Tải file Excel cho kế toán”: tạo được file');
    if (!blob) return;
    const bx = await blob.arrayBuffer(), bg = await (await fetch('data/goc.xlsx', { cache: 'no-store' })).arrayBuffer();
    const g = new ExcelJS.Workbook(); await g.xlsx.load(bg.slice(0));
    const x = new ExcelJS.Workbook(); await x.xlsx.load(bx.slice(0));
    const X = KIEMKE_EXCEL, SS = KIEMKE_SOSANH;
    const s1 = SS.soSanh(g, x, X);
    ok(!s1.loi.length, s1.loi.length ? `file xuất KHÁC gốc ngoài 3 cột cuối: ${s1.loi.slice(0, 4).join(' · ')}` : `so từng ô: ${s1.dem.sheet} sheet, ${s1.dem.o} ô gốc giống hệt (cột Thực tế để trống như gốc); chỉ thêm ${s1.dem.oMoi} ô ở 3 cột cuối`);
    const kiemXml = s => { const d = new DOMParser().parseFromString(s, 'application/xml'), e = d.getElementsByTagName('parsererror')[0]; return e ? e.textContent.slice(0, 120) : null; };
    const s2 = await SS.soSanhGoi(await JSZip.loadAsync(bg.slice(0)), await JSZip.loadAsync(bx.slice(0)), g, X, kiemXml);
    ok(!s2.loi.length, s2.loi.length ? `gói .xlsx KHÁC gốc: ${s2.loi.slice(0, 3).join(' · ')}` : `so từng byte: phần không liên quan giống hệt, bỏ 3 cột mới thì mọi sheet giống gốc từng ký tự, XML đọc được`);
    // đúng nội dung các thao tác vừa làm, ở đúng dòng của tài sản
    const o3 = a => { for (const ws of g.worksheets) { const hm = X.headerMap(ws); if (!hm) continue; let last = 0; ws.eachRow({ includeEmpty: false }, r => r.eachCell({ includeEmpty: false }, (c, col) => { if (col > last) last = col; }));
      for (let r = hm.dataStart; r <= ws.rowCount; r++) { const xr = X.readRow(ws, hm, r); if (xr && !xr.tiepTen && xr.key === a.key) { const w = x.getWorksheet(ws.name), row = w.getRow(r);
        return { kq: row.getCell(last + 1).value, vt: row.getCell(last + 2).value, gc: row.getCell(last + 3).value, tt: hm.cols.tt ? row.getCell(hm.cols.tt).value : null, ttGoc: hm.cols.tt ? ws.getRow(r).getCell(hm.cols.tt).value : null }; } } } return {}; };
    const k = L.map(o3);
    ok(k[0].kq === 'Đã kiểm - Đủ' && k[0].gc === GHI, 'Đủ + ghi chú giữ nguyên văn (dấu =, +, <>&"), là chữ thường không thành công thức' + ` [${JSON.stringify(k[0])}]`);
    ok(/^Đã kiểm - Thiếu 1/.test(k[1].kq) && k[1].tt === k[1].ttGoc, `sửa số → “${k[1].kq}”; cột Thực tế để nguyên như gốc`);
    ok(k[2].kq === 'Chưa tìm thấy (đơn vị chỉ vị trí khác)' && k[2].vt === '101 Gamma' && /Đại diện trả lời: Đang để ở 101 Gamma/.test(k[2].gc || ''), 'Không thấy + xác minh: kết quả, vị trí được chỉ, câu trả lời của đại diện');
    ok(/Hỏng một phần/.test(k[3].gc || '') && /Trạng thái sử dụng: Cho mượn/.test(k[3].gc || ''), 'tình trạng, trạng thái sử dụng vào Ghi chú kiểm kê');
    ok(k[4].vt === '202 Gamma' && /Phân bổ về: Phòng Hành chính/.test(k[5].gc || ''), 'đổi phòng → Vị trí thực tế; đổi phòng ban → “Phân bổ về: …”');
    const ps = x.worksheets[x.worksheets.length - 1];
    const psDong = []; ps.eachRow((r, i) => { if (i > 1) psDong.push(r.getCell(2).value); });
    ok(ps.name === 'Tài sản phát sinh' && psDong.includes('Máy in phát sinh thử') && psDong.length === (S.ps.GD || []).length && x.worksheets.length === g.worksheets.length + 1,
      `tài sản phát sinh ở sheet riêng cuối file (${psDong.length} món: ${psDong.join('; ')})`);
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
    await go('anh-tai-san');
    ok([...document.querySelectorAll('#navCH a[data-r]')].map(x => x.textContent.trim()).join('|') === 'Khấu hao|Đầu mối|Danh bạ|Quản lý|Ảnh tài sản' && document.querySelector('#navCH a[data-r="anh-tai-san"]').getAttribute('aria-current') === 'page' && document.body.dataset.mod === 'ch',
      'phần Chung có mục thứ 5 “Ảnh tài sản” (#anh-tai-san), sau Khấu hao, Đầu mối, Danh bạ, Quản lý');
    ok(/Ảnh tài sản cần đăng nhập/.test(app.textContent) && !app.querySelector('.at-luoi') && !!app.querySelector('#app a[href="#quan-ly"]'), 'Ảnh tài sản khi chưa bật đăng nhập: báo rõ cần đăng nhập (chỉ chỗ xem cách bật), không hiện ảnh');
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
    ok(/phổ biến/.test(txt('qlThemLoi')) && A.tk.length === 1, 'mật khẩu ban đầu quá phổ biến (123456789012): không tạo');
    // người dùng cho phép 17/11/2026: mật khẩu BAN ĐẦU được toàn chữ số, được lặp lại ký tự
    await them('thanhvien1', 'Thành Viên Một', 'tv1@vd.vn', '111111111111', 'xem');
    await until(() => document.querySelectorAll('.ql-tbl tbody tr').length === 2);
    ok(A.tk.length === 2 && A.tk[1].quyen === 'xem' && A.tk[1].mk === '111111111111', 'thêm thành viên quyền "Tra cứu", mật khẩu ban đầu lặp một chữ số (111111111111) được nhận');
    ok([...document.querySelectorAll('#qtQuyen option')].map(o => o.value).join() === 'xem,kiem,admin', 'có đủ 3 mức quyền: Tra cứu, Kiểm kê, Quản trị');
    await them('thanhvien2', 'Thành Viên Hai', 'tv2@vd.vn', '202611170002', 'kiem');
    await until(() => document.querySelectorAll('.ql-tbl tbody tr').length === 3);
    ok(A.tk.length === 3 && A.tk[2].quyen === 'kiem' && A.tk[2].mk === '202611170002', 'thêm thành viên quyền "Kiểm kê", mật khẩu ban đầu toàn chữ số được nhận');
    ok(LOGMINE.some(e => e.kind === 'chung' && /Thêm thành viên thanhvien1/.test(e.title)) && !JSON.stringify(LOGMINE).includes('111111111111') && !JSON.stringify(LOGMINE).includes('202611170002'), 'lịch sử ghi lần thêm thành viên, không ghi mật khẩu');
    const tr = () => document.querySelector(`.ql-tbl tr[data-uid="${A.tk[1].uid}"]`);
    tr().querySelector('[data-ql="mk"]').click(); await W(200);
    dien('qlDat-' + A.tk[1].uid, '999999999999'); tr().querySelector('[data-ql="datmk"]').click(); await W(400);
    ok(A.tk[1].mk === '999999999999', 'quản trị đặt lại mật khẩu cho thành viên quên mật khẩu (mật khẩu ban đầu toàn số được nhận)');
    const doi = async (cu, moi, moi2) => { dien('qlMkCu', cu); dien('qlMkMoi', moi); dien('qlMkMoi2', moi2 == null ? moi : moi2); document.querySelector('#qlMk button[type="submit"]').click(); await W(400); };
    await doi('sai', 'Moi-moi-2026!');
    ok(/hiện tại chưa đúng/.test(txt('qlMkLoi')) && A.tk[0].mk === 'MatKhauThu#1', 'đổi mật khẩu: sai mật khẩu hiện tại thì không đổi');
    await doi('MatKhauThu#1', '555555555555');
    ok(/chỉ gồm chữ số/.test(txt('qlMkLoi')) && A.tk[0].mk === 'MatKhauThu#1', 'tự đổi mật khẩu của mình: vẫn không được toàn chữ số / lặp một ký tự (chỉ mật khẩu ban đầu mới được)');
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
    // lần đăng nhập đầu bằng mật khẩu ban đầu: bắt đổi mật khẩu (người dùng chốt 17/11/2026), mật khẩu mới theo đủ quy tắc
    await dangNhap('thanhvien1', '999999999999'); await until(() => document.getElementById('dnMkMoi'));
    ok(!!document.getElementById('dnMkMoi') && !DN.toi && document.body.classList.contains('dn-cho') && /Đổi mật khẩu trước khi vào trang/.test(document.getElementById('dnMan').textContent),
      'đăng nhập bằng mật khẩu ban đầu: phải đổi mật khẩu trước, chưa vào được trang');
    const doiDau = async (a, b) => { dien('dnMkMoi', a); dien('dnMkMoi2', b == null ? a : b); document.getElementById('dnNut').click(); await W(400); };
    await doiDau('888888888888');
    ok(/chỉ gồm chữ số/.test(txt('dnLoi')) && A.tk[1].mk === '999999999999', 'mật khẩu mới không được toàn số / lặp một ký tự (quy tắc đầy đủ)');
    await doiDau('Rieng-tu-cua-toi-1', 'Rieng-tu-cua-toi-2');
    ok(/chưa giống nhau/.test(txt('dnLoi')) && A.tk[1].mk === '999999999999', 'hai lần nhập mật khẩu mới khác nhau: không đổi');
    await doiDau('Rieng-tu-cua-toi-1'); await until(() => !document.getElementById('dnMan'));
    ok(DN.toi && DN.toi.quyen === 'xem' && A.tk[1].mk === 'Rieng-tu-cua-toi-1' && !A.tk[1].doi, 'đổi xong mật khẩu riêng thì vào trang (thành viên không cần 2 lớp)');
    await until(() => LOGMINE.some(e => /Đổi mật khẩu ban đầu/.test(e.title)));
    ok(LOGMINE.some(e => /Đổi mật khẩu ban đầu/.test(e.title)) && !JSON.stringify(LOGMINE).includes('Rieng-tu-cua-toi-1'), 'lịch sử ghi “Đổi mật khẩu ban đầu”, không ghi mật khẩu');
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
    await dangNhap('thanhvien2', '202611170002'); await until(() => document.getElementById('dnMkMoi'));
    await doiDau('202611170002');
    ok(/chỉ gồm chữ số/.test(txt('dnLoi')), 'không giữ lại mật khẩu ban đầu toàn số làm mật khẩu riêng');
    A.tk[2].mk = 'Kiem-vien-hai-2026'; A.tk[2].doi = true;   // giả như quản trị đặt mật khẩu ban đầu “mạnh”: nhập lại đúng nó thì không được
    await doiDau('Kiem-vien-hai-2026');
    ok(/phải khác mật khẩu ban đầu/.test(txt('dnLoi')) && !DN.toi, 'mật khẩu mới trùng mật khẩu ban đầu: không được, báo rõ');
    await doiDau('Kiem-vien-hai-rieng'); await until(() => !document.getElementById('dnMan'));
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
    await dangNhap('thanhvien1', 'Rieng-tu-cua-toi-1');
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

    // Chung › Ảnh tài sản (#anh-tai-san): nơi quản lý toàn bộ ảnh tài sản
    await go('anh-tai-san'); await until(() => app.querySelector('.at-the .at-anh img[src]'));
    const the = () => [...app.querySelectorAll('.at-the')], soLieu = () => [...app.querySelectorAll('.at-sum b')].map(x => +x.textContent.replace(/\D/g, ''));
    ok(the().length === 1 && +the()[0].dataset.stt === a.stt && the()[0].querySelector('.at-dem').textContent.trim() === '4', 'Ảnh tài sản: có thẻ của tài sản vừa chụp, ảnh bìa hiện, đếm 4 ảnh');
    const chua0 = ASSETS.filter(x => !x.hoso && x.stt !== a.stt).length, sl = soLieu();
    ok(sl[0] === 1 && sl[1] === 4 && sl[2] === chua0, `số liệu: 1 tài sản có ảnh, 4 ảnh, ${nf.format(chua0)} tài sản chưa có ảnh (không tính công trình, xây lắp, phần mềm)`);
    the()[0].querySelector('[data-at="xem"]').click(); await until(() => lb.open && lb.querySelector('.lb-anh'));
    ok(/1\/4/.test(lb.querySelector('.lb-dem').textContent), 'bấm ảnh bìa: mở trình xem ảnh toàn màn hình, 1/4');
    lb.querySelector('[data-lb="dong"]').click(); await W(200);
    app.querySelector('[data-at="loc"][data-v="chua"]').click(); await W(300);
    const b2 = BY_UNIT.GD.find(x => x !== a && !x.hoso && x.ma && !(S.anh[x.stt] || {}).ds);
    const tim = v => { const i = document.getElementById('avq'); i.focus(); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); };
    tim('STT ' + b2.stt); await W(400);
    ok(app.querySelectorAll('.at-chua').length === 1 && +app.querySelector('.at-chua').dataset.stt === b2.stt && document.activeElement.id === 'avq', 'Chưa có ảnh: tìm “STT …” ra đúng 1 tài sản, con trỏ vẫn ở ô tìm');
    app.querySelector('.at-chua [data-at="mo"]').click(); await until(() => d.open && d.querySelector('.xt-dau small').textContent.includes('STT ' + b2.stt));
    chon([await taoAnh('#1d4ed8', 'C1')]);
    await until(() => ((S.anh[b2.stt] || {}).ds || []).length === 1 && !d.querySelector('.xt-cho'), 30000);
    d.close(); await W(300);
    ok(!app.querySelector('.at-chua') && soLieu()[0] === 2 && soLieu()[1] === 5, 'thêm ảnh ngay từ trang: đóng hộp thì tài sản rời danh sách “Chưa có ảnh”, số liệu tăng (2 tài sản, 5 ảnh)');
    ok(LOGMINE.some(e => e.key === b2.key && (e.lines || []).some(l => /Thêm 1 ảnh/.test(l))), 'thêm ảnh từ trang Ảnh tài sản cũng ghi lịch sử');
    tim(''); app.querySelector('[data-at="loc"][data-v="co"]').click(); await W(300);
    ok(the().map(x => +x.dataset.stt).join() === [b2.stt, a.stt].join(), 'Có ảnh, xếp “Ảnh mới nhất trước”: tài sản vừa thêm ảnh đứng đầu');
    const xep = document.getElementById('avxep'); xep.value = 'phong'; xep.dispatchEvent(new Event('change', { bubbles: true })); await W(300);
    ok(app.querySelectorAll('#avKq .sect h2').length >= 1 && the().length === 2, 'xếp “Theo phòng”: gom thẻ ảnh theo phòng, có tên phòng làm tiêu đề');
    await loadScript('https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js');
    const kqAxe = await axe.run(document, AXE);
    ok(!kqAxe.violations.length && !linkHong().length, 'trang Ảnh tài sản (đã đăng nhập, có ảnh) đạt trợ năng WCAG 2.2 AA, không có link hỏng' + (kqAxe.violations.length ? ': ' + kqAxe.violations.map(v => `${v.id} (${v.nodes[0].target.join(' ')})`).join('; ') : ''));
    xep.value = 'moi'; AV.xep = 'moi';
    await go('quan-ly'); app.querySelector('[data-ql="ra"]').click(); await W(500);
    await dangNhap('tracuu', 'Tra-cuu-thu-01'); await until(() => DN.toi && !document.getElementById('dnMan'));
    await go('ts-' + a.key); app.querySelector('.row [data-act="xt"]').click();
    await until(() => d.open && d.querySelectorAll('.xt-thumb img').length === 4);
    ok(!d.querySelector('input[data-xt="them"]') && !d.querySelector('[data-xt="xoa"]'), 'quyền Tra cứu: xem được 4 ảnh, không có nút thêm, xoá');
    d.querySelector('[data-xt="xem"]').click(); await until(() => lb.open && lb.querySelector('.lb-anh'));
    ok(lb.open, 'quyền Tra cứu: mở xem ảnh toàn màn hình được');
    lb.close(); d.close();
    await go('anh-tai-san'); await until(() => app.querySelector('.at-the .at-anh img[src]'));
    ok(the().length === 2 && !app.querySelector('[data-at="mo"].pri') && /quyền Tra cứu chỉ xem/.test(app.textContent), 'quyền Tra cứu ở trang Ảnh tài sản: xem được 2 tài sản có ảnh, không có nút thêm, xoá');
    app.querySelector('[data-at="loc"][data-v="chua"]').click(); await W(300);
    ok(app.querySelectorAll('.at-chua').length > 0 && !app.querySelector('.at-chua [data-at="mo"]'), 'quyền Tra cứu: danh sách “Chưa có ảnh” chỉ có link Trang tài sản, không có nút Thêm ảnh');
    AV.loc = 'co'; AV.q = ''; render(); window.scrollTo(0, 0); await until(() => app.querySelector('.at-the .at-anh img[src]'));
  };

  // Trợ năng (axe-core, chuẩn WCAG 2.2 AA): 14 trang chính không có vi phạm nào — chữ đủ tương phản, ô nhập / ô chọn có nhãn,
  // vùng bấm ≥ 24px, bảng cuộn dùng được bằng bàn phím, tiêu đề đúng thứ tự… (chạy ở cỡ máy tính và cỡ điện thoại)
  KB['tro-nang'] = async () => {
    await loadScript('https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js');
    const TRANG = ['trang-chu', 'tong-quan', 'vi-tri', 'phong-108-gamma', 'dv-GD', 'ts-6497474', 'tong-hop', 'ket-qua', 'xac-minh', 'xuat', 'ma-qr', 'lich-su', 'khau-hao', 'dau-moi'];
    const sai = [];
    for (const t of TRANG) {
      await go(t); await W(400);
      const kq = await axe.run(document, AXE);
      kq.violations.forEach(v => sai.push(`#${t}: ${v.id} (${v.nodes.length} chỗ, vd ${v.nodes[0].target.join(' ')})`));
      linkHong().forEach(h => sai.push(`#${t}: link #${h} không mở trang nào`));
    }
    const gia = document.createElement('a'); gia.href = '#khong-co-trang-nay'; gia.textContent = 'thử'; app.appendChild(gia);
    const bat = linkHong(); gia.remove();
    ok(bat.length === 1 && bat[0] === 'khong-co-trang-nay', 'kiểm tra link #… bắt được link hỏng thật (thử chèn một link không mở trang nào)');
    ok(!sai.length, sai.length ? `trợ năng: ${sai.length} loại vi phạm — ${sai.slice(0, 4).join(' · ')}` : `trợ năng (axe-core, WCAG 2.2 AA): ${TRANG.length} trang chính không có vi phạm nào`);
  };
  KB['tro-nang-dt'] = KB['tro-nang'];

  // Nâng cấp giao diện (người dùng chọn 17/11/2026): đưa việc kiểm lên trước (điện thoại), vùng bấm ≥ 44px, chữ ≥ 13px, thanh tiến độ dính
  const chuNho = () => [...document.querySelectorAll('body *')].filter(e => !e.closest('svg') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
    && e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) > 0 && parseFloat(getComputedStyle(e).fontSize) < 13).map(e => (e.className || e.tagName) + ' ' + getComputedStyle(e).fontSize);
  const caoDemo = () => (document.querySelector('#app .demo') || { offsetHeight: 0 }).offsetHeight;
  const tuyetDoi = el => el.getBoundingClientRect().top + scrollY;
  KB['nang-cap-dt'] = async () => {
    await go('phong-108-gamma'); await W(300);
    const dv = app.querySelector('details[data-nho="dv"]'), r1 = app.querySelector('#rows .row');
    ok(dv && !dv.open, 'trang phòng (điện thoại): khung "Đơn vị có tài sản ở đây" thu gọn thành 1 dòng bấm mở');
    ok(tuyetDoi(r1) - caoDemo() < innerHeight, `trang phòng: tài sản đầu tiên hiện ngay màn hình đầu (cách đầu trang ${Math.round(tuyetDoi(r1) - caoDemo())}px, màn hình cao ${innerHeight}px)`);
    ok(r1.querySelector('.c-act').getBoundingClientRect().top < r1.querySelector('.c-room').getBoundingClientRect().top, 'mỗi dòng: nút Đủ / Không thấy nằm ngay dưới tên, trước ô chọn phòng');
    const bam = [...app.querySelectorAll('#rows .row')].slice(0, 6).flatMap(r => [...r.querySelectorAll('.c-act .btn, select.in, input.in, .stepper button')]).filter(e => e.getClientRects().length);
    const thap = bam.filter(e => e.getBoundingClientRect().height < 44);
    ok(bam.length > 20 && !thap.length, `vùng bấm ≥ 44px: ${bam.length} nút / ô chọn ở 6 dòng đầu` + (thap.length ? ` — thấp: ${thap.slice(0, 3).map(e => (e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().height) + 'px').join(', ')}` : ''));
    // thanh tiến độ dính
    const dinh = document.getElementById('dinh');
    ok(dinh.hidden, 'thanh tiến độ dính: ẩn khi khung Tiến độ kiểm còn nhìn thấy');
    scrollTo(0, tuyetDoi(app.querySelector('#rows .row:nth-of-type(4)')) - 120); await W(500);
    const so = () => +(/(\d+)\//.exec(dinh.textContent) || [])[1];
    ok(!dinh.hidden && /108 Gamma/.test(dinh.textContent) && /\d+\/\d+/.test(dinh.textContent), `cuộn xuống: thanh dính hiện "${dinh.textContent.replace(/\s+/g, ' ').trim()}"`);
    const truoc = so(), cho = [...app.querySelectorAll('#rows .row')].find(r => r.querySelector('[data-act="du"]') && BY_STT[r.dataset.stt] && res(BY_STT[r.dataset.stt]) === 'chua');
    cho.querySelector('[data-act="du"]').click(); await W(400);
    ok(so() === truoc + 1, `bấm Đủ: thanh dính cập nhật ngay (${truoc} → ${so()})`);
    dinh.click(); await until(() => scrollY < 5, 4000); await W(300);
    ok(scrollY < 5 && dinh.hidden, 'bấm thanh dính: lên đầu trang, thanh ẩn đi');
    ok(!chuNho().length, 'chữ nhỏ nhất 13px (trang phòng)' + (chuNho().length ? ': ' + [...new Set(chuNho())].slice(0, 4).join(', ') : ''));
    // trang một tài sản
    await go('ts-6497474'); await W(300);
    const nut = app.querySelector('.ts-kiem .c-act .btn');
    ok(nut && tuyetDoi(nut) - caoDemo() + nut.offsetHeight < innerHeight && !app.querySelector('.ts-kiem .more'), `trang một tài sản (quét tem): nút kiểm hiện ngay màn hình đầu (đáy nút ${Math.round(tuyetDoi(nut) - caoDemo() + nut.offsetHeight)}px), chi tiết chưa mở sẵn`);
    ok(app.querySelector('.tsx-qr').getBoundingClientRect().top > nut.getBoundingClientRect().top, 'mã QR thu nhỏ xuống dưới phần kiểm');
    ok(!chuNho().length, 'chữ nhỏ nhất 13px (trang tài sản)' + (chuNho().length ? ': ' + [...new Set(chuNho())].slice(0, 4).join(', ') : ''));
    // trang phòng ban: thành phần buổi kiểm thu gọn, mở rồi thì nhớ khi trang vẽ lại
    await go('dv-GD'); await W(300);
    let bk = app.querySelector('details[data-nho="bk"]');
    ok(bk && !bk.open, 'trang phòng ban (điện thoại): "Thành phần buổi kiểm kê" thu gọn');
    bk.open = true; await W(150); app.querySelector('[data-filter="du"]').click(); await W(300);
    bk = app.querySelector('details[data-nho="bk"]');
    ok(bk.open, 'mở khung ra rồi đổi bộ lọc (trang vẽ lại): khung vẫn mở');
    // banner gọn
    await go('vi-tri'); await W(300);
    const pb = app.querySelector('.pban'), pm = pb.querySelector('.pban-mo');
    ok(pb.offsetHeight < 140 && getComputedStyle(pb.querySelector('p')).display === 'none' && getComputedStyle(pb.querySelector('img')).display === 'none', `banner đầu trang gọn (cao ${pb.offsetHeight}px, ẩn ảnh và phần giới thiệu)`);
    pm.click(); await W(150);
    ok(getComputedStyle(pb.querySelector('p')).display !== 'none' && pm.getAttribute('aria-expanded') === 'true', 'bấm "Giới thiệu": hiện phần giới thiệu');
    ok(!chuNho().length, 'chữ nhỏ nhất 13px (trang số phòng)' + (chuNho().length ? ': ' + [...new Set(chuNho())].slice(0, 4).join(', ') : ''));
  };
  KB['nang-cap-pc'] = async () => {
    await go('ts-6497474'); await W(300);
    const tsx = app.querySelector('.ts-trang .tsx');
    ok(getComputedStyle(tsx).display === 'grid' && app.querySelector('.tsx-qr').getBoundingClientRect().left < app.querySelector('.tsx-dau').getBoundingClientRect().left && !!app.querySelector('.ts-kiem .more'),
      'máy tính: trang một tài sản giữ bố cục cũ (mã QR bên trái, chi tiết mở sẵn)');
    await go('phong-108-gamma'); await W(300);
    ok(app.querySelector('details[data-nho="dv"]').open && getComputedStyle(app.querySelector('.pban-mo') || document.body).display !== 'inline-flex', 'máy tính: khung "Đơn vị có tài sản ở đây" mở sẵn như cũ');
    scrollTo(0, 1600); await W(500);
    const dinh = document.getElementById('dinh');
    ok(!dinh.hidden && /\d+\/\d+/.test(dinh.textContent), 'máy tính: thanh tiến độ dính cũng hiện khi cuộn xuống');
    for (const t of ['tong-quan', 'vi-tri', 'tong-hop', 'dv-GD']) { await go(t); await W(300); const l = chuNho(); ok(!l.length, `chữ nhỏ nhất 13px (#${t})` + (l.length ? ': ' + [...new Set(l)].slice(0, 4).join(', ') : '')); }
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
