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
    f('email', 'thu.nv@fe.edu.vn'); document.querySelector('[data-dm="GD"] [data-ch="dmluu"]').click(); await W(400);
    ok(dmCua('GD') && dmCua('GD').email === 'thu.nv@fe.edu.vn' && document.querySelector('[data-dm="GD"]').textContent.includes('thu.nv@fe.edu.vn'), 'lưu đầu mối sheet GD: tên, chức vụ, email');
    ok(LOGMINE.some(e => e.kind === 'chung' && /Họ tên: trống → Nguyễn Văn Thử/.test((e.lines || []).join(' '))), 'lịch sử ghi lần thêm đầu mối');
    const aGD = BY_UNIT.GD.find(a => a.ma && String(a.ma) === String(a.key));
    await go('ts-' + aGD.key);
    ok(app.querySelector('.tsx-dl').textContent.includes('Nguyễn Văn Thử'), 'trang tài sản: hiện đầu mối quản lý');
    await go('dv-GD');
    ok((app.querySelector('.dm-l') || {}).textContent.includes('thu.nv@fe.edu.vn'), 'trang sheet: hiện đầu mối');
    await go('ly-lich-' + aGD.key); await W(300);
    ok(app.textContent.includes('Nguyễn Văn Thử'), 'lý lịch tài sản: hiện đầu mối');
    S.rows[aGD.stt] = { tt: 0, nf: true, at: Date.now() }; save(); await go('xac-minh');
    ok([...document.querySelectorAll('.xm')].some(x => x.textContent.includes('Nguyễn Văn Thử')), 'Tài sản thất lạc: hiện đầu mối để liên hệ');
    await go('khau-hao'); const dv2 = document.getElementById('khdv'); dv2.value = 'GD'; dv2.dispatchEvent(new Event('change', { bubbles: true })); await W(350);
    const o = [...document.querySelectorAll('.kh-dm')];
    ok(!o.length || o.every(td => td.textContent.includes('Nguyễn Văn Thử')), 'khấu hao: cột Đầu mối hiện đúng người');
    KHV.dv = '';
    const kq = JSON.stringify(ketQuaKeToan(aGD));
    ok(!kq.includes('thu.nv@fe.edu.vn') && !kq.includes('Nguyễn Văn Thử'), 'kết quả cho kế toán không có đầu mối');
    const src = await (await fetch('export.js')).text();
    ok(!/S\.dm|dmCua|dmText|dmChu/.test(src), 'file “Xuất cho kế toán” không đọc dữ liệu đầu mối');
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
    while (typeof READY === 'undefined' || !READY) await W(50);
    await W(300);
    const ten = location.search.slice(1);
    if (!KB[ten]) ok(false, 'không có kịch bản ' + ten); else await KB[ten]();
  } catch (e) { ok(false, 'kịch bản dừng giữa chừng: ' + String(e && e.stack || e).slice(0, 300)); }
  xong();
})();
