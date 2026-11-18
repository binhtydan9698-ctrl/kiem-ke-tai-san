# Quy ước cho thư mục web/ (mã nguồn trang)

Đọc bảng **Quy tắc vàng** trong [AGENTS.md](../AGENTS.md) trước — tệp này chỉ nói cách viết mã của trang cho đúng các quy tắc đó.

- HTML + JavaScript thuần, **không** framework, **không** bước bundle. `index.html` chứa CSS + logic chính;
  các file `.js` khác nạp bằng `<script src>` theo thứ tự trong `<head>`. Không đổi sang ES module / React
  trừ khi người dùng yêu cầu.
- **Bảo mật (BAO-MAT.md, skill `bao-mat`)**: logic chính nằm trong `<script type="text/plain" id="kiemke-app">` (thẻ đứng đầu dòng,
  đúng 1 khối), do `dang-nhap.js` (`napVaChay`) chạy sau khi nạp / giải mã dữ liệu. CSP chỉ cho chạy đúng khối này (dấu băm tính
  khi build) và CDN jsDelivr, cdnjs: KHÔNG thêm `<script>` viết thẳng khác, `onclick=`, `eval`, `new Function`; không nhắc nguyên
  văn thẻ mở của khối mã chính trong chú thích HTML. Thêm CDN / dịch vụ ngoài → sửa `cspTrang()` (`scripts/ma-hoa.mjs`).
  File Excel gốc lấy qua `kiemkeTepGoc()`, không `fetch('data/…')` trực tiếp. Bộ thử chạy dưới đúng CSP (vi phạm = lỗi).
- Thư viện ngoài chỉ nạp từ CDN với **phiên bản cố định** (supabase-js 2.118.0 qua jsDelivr, exceljs 4.4.0 qua cdnjs).
- `excel-rules.js` được dùng chung với Node (`scripts/build.mjs`, `scripts/kiem-tra.mjs`): giữ nó chạy được ở cả hai
  (chỉ gắn vào `globalThis`, không dùng DOM).
- Giao diện, thông báo, chú thích: **tiếng Việt**. Màu dùng biến CSS trong `:root` (có bản tối), trang phải dùng được
  trên điện thoại (bề ngang 360px).
- Bảng màu (khối CSS "Bảng màu 2026" cuối `<style>`, chọn từ kho dữ liệu UI/UX Pro Max — `.claude/skills/ui-ux-pro-max`):
  nền/chữ slate (`#F8FAFC`/`#0F172A`), cam `--brand:#EA580C` cho trang trí, `--accent`/`--cta:#C2410C` cho chữ và nút.
  Mọi cặp chữ/nền phải đạt tương phản ≥ 4.5:1 (chữ lớn ≥ 3:1). Đổi màu thì sửa biến trong khối đó, không viết mã màu rời.
- Thẻ phòng (`roomTile`, khối CSS "Thẻ phòng kiểu Bento"): số phòng font **Unbounded** (`--f-display`, có tiếng Việt),
  mỗi tòa một màu (`.t-a` Alpha, `.t-b` Beta, `.t-g` Gamma…: `--tone` cho hình, `--tone-ink` cho chữ), vòng % tiến độ,
  nghiêng 3D + quầng sáng theo chuột. Mọi hiệu ứng phải tắt khi `prefers-reduced-motion: reduce`.
- Giao diện theo phong cách trang daihoc.fpt.edu.vn: màu chủ đạo cam FPT (chữ/viền dùng `--accent`),
  ảnh campus Đà Nẵng ở `web/img/` (bản 1024px lấy từ daihoc.fpt.edu.vn; người dùng yêu cầu không hiện dòng ghi nguồn ảnh trên trang). Ảnh dưới màn hình đầu
  để `loading="lazy"`. Menu "Tổng quan" xổ ra 3 trang: `#tong-quan`, `#don-vi`, `#vi-tri`.
- Trang gồm 4 phần dưới "Quản lý tài sản": trang chủ `#trang-chu` (`viewHub`, cũng là trang mở khi không có `#`),
  **Kiểm kê** (mọi trang còn lại, gồm trang một tài sản `#ts-<khoá>` = `viewTS` và trang kết quả cả trường `#ket-qua` /
  `#ket-qua-lech` = `viewKQ`: `V.type='kq'`, `currentList()` = mọi tài sản đã có kết quả, dùng chung `toolsHTML` (bộ lọc riêng)
  / `listBody` / `rowHTML` với trang sheet, phòng; mở từ nút "Xem →" của ô số liệu ở Bảng tổng quan; và `#tong-hop` =
  `viewTongHop`: bảng gọn `thDong` (thẻ `a.th-r` tới `#ts-`), nhóm `thNhom()` theo `TH_NHOM`, xếp phòng `thSapPhong`
  (tòa `BLD_ORDER` → tầng `thTang` → số phòng), bộ môn theo `UNITS`, tên `thSapTen`; ô tìm `#thq`, nút nhóm `data-act="thdi"`), **Mã QR** (`#ma-qr`, `#so-ma-qr`, `viewQR`
  trong `ma-qr.js`), **Lịch sử** (`#lich-su` = `viewLog`, `#nhap-so` = `viewNhapSo`, `#ly-lich[-khoá]` = `viewLyLich`) và
  **Chung** (`#khau-hao` = `viewKhauHao`, `#dau-moi` = `viewDauMoi`, `#danh-ba` = `viewDanhBa` trong `chung.js`; `#quan-ly` =
  `viewQuanLy` trong `dang-nhap.js`; `#anh-tai-san` = `viewAnhTS` trong `anh.js`, `V.type='anh'`; `#tai-san-moi` = `viewTaiSanMoi`
  trong `tai-san-moi.js`, `V.type='tsm'`).
  Đầu trang 2 tầng (khối CSS "Đầu trang 2 tầng" cuối `<style>`): `.top1` = logo `.lgo` + tên `.app` + 4 phần `.sec`
  (`#swKK`, `#swQR`, `#swLS`, `#swCH`; `#swHub` luôn ẩn — về trang chủ bằng logo) + Quét mã + người dùng; `.top2` = menu con
  (`#nav` Kiểm kê, `#navQR`, `#navLS`, `#navCH`, mục `a[data-r]`). `setMod()` đặt `body[data-mod=hub|kk|qr|ls|ch]`, đánh dấu
  phần đang ở và nhớ trang đang xem dở của mỗi phần (`MODLAST`). Màn ≤1440px bỏ chữ " tài sản" (`.sec-x`) cho gọn một hàng.
  Điện thoại (≤860px): `.sec` thành thanh dưới 5 ô [Kiểm kê · Mã QR · (Quét mã nổi ở giữa) · Lịch sử · Chung].
- Chung (`chung.js`, nạp trong `<head>` nên chỉ dùng `KEY`, `app`… khi trang Chung mở; sự kiện gắn một lần ở `chBind()`):
  đầu mối `S.dm[mã sheet]` (col `dm`, thêm vào `COLS`), hiển thị ở nơi khác bằng `dmText(mã sheet)` / `dmCua()`; câu lịch sử
  `logDmLines` (logDescribe khoá `d:`). Khấu hao `khHet(a, năm)`, `khLoc()`, số năm tạm tính `KHV.nam` (nhớ trong
  localStorage `KEY+'.khNam'`). `export.js` / `ketQuaKeToan` KHÔNG được đọc đầu mối.
  Danh bạ `viewDanhBa` (trong `chung.js`): dữ liệu ở bảng Supabase `danh_ba` (KHÔNG ở `kiemke_docs`/`S`), đọc/ghi qua
  `DN.api.danhBa`, bộ nhớ `DN.db.ds`; chỉ hiện khi `DN.cai && DN.toi`; sửa được khi `DN.duocSuaDanhBa()`. Thay đổi ghi lịch sử
  bằng `logEvent({kind:'chung'})`.
- Nút ⋯ trên dòng tài sản (`anh.js`, `data-act="xt"` → `moMoRong(a)`): `<dialog id="xtDlg">` có mã QR (`qrSvg`, `qrOpen`) và ảnh;
  trình xem ảnh `<dialog id="xemAnh">` (kiểu Messenger). Danh sách ảnh `S.anh[stt]` (col `anh`, có trong `COLS`, `KEYED`), thêm / xoá
  qua `save()` nên có lịch sử (`logAnhLines`). Tệp ảnh qua `DN.api.anh` (`tai`, `url` đường dẫn có hạn, `xoa`) — có ở cả `sbCong()`
  và đăng nhập giả. Chỉ dùng ảnh khi `DN.cai && DN.toi`; tải lên / xoá khi `DN.duocKiemKe() && !READONLY`. Ảnh luôn thu nhỏ trong
  trình duyệt trước khi tải lên. `toast()` là popover nên nổi trên cả hộp thoại đang mở.
  Trang Chung › Ảnh tài sản (`viewAnhTS`, trạng thái `AV = {q, dv, loc: co|chua, xep: moi|phong, lim}`): thẻ `.at-the` (ảnh bìa = ảnh
  nhỏ đầu tiên, lấy đường dẫn có hạn một lần cho mọi thẻ đang hiện — `avAnhNho`), dòng `.at-chua` cho tài sản chưa có ảnh; nút
  `data-at="mo"` gọi `moMoRong(a)` — KHÔNG viết đường tải lên / xoá thứ hai. Gõ tìm chỉ vẽ lại `#avKq` (`avVe`) để giữ con trỏ. Đóng
  hộp ⋯ khi đang ở trang này thì vẽ lại cả trang (`avSauDong`) và đưa con trỏ về nút vừa bấm.
- **Thông số quản lý chỉ Quản trị thấy (quy tắc vàng 16)**: khung chỉ vẽ khi `DN.laQuanTri()`, số liệu qua hàm máy chủ chỉ trả cho
  `la_quan_tri()` (người khác `null`), khung ghi "Thông số quản lý — chỉ tài khoản Quản trị thấy". Mẫu: `avDungLuongHTML()` /
  `avTaiDungLuong()` trong `anh.js` (`DN.api.dungLuongAnh` → `dung_luong_anh()`; có ở cả `sbCong()` và đăng nhập giả), đếm lại sau
  khi đóng hộp ⋯ và khi quá 1 phút; thanh `role="meter"` có nhãn; ≥ 80% (`NGUONG`) thì hiện `phuongAnHTML()` (4 bước không tốn
  kinh phí, kèm số ảnh vượt mức 2 ảnh / tài sản và số ảnh của tài sản đã thanh lý, bàn giao). `render()` gọi `khoAnhBao()` sau mỗi
  lần vẽ: quản trị + kho ≥ 80% → chèn thanh `#khoAnhBao` ở đầu `#app` (mọi trang trừ trang Ảnh tài sản); đếm lại khi quá 1 giờ.
- **Tài sản mới** (`tai-san-moi.js`, người dùng chốt 17/11/2026): `S.moi[mã]` (col `moi` trong `COLS`, không KEYED: id là mã tài sản
  mới `m…`). Quyền `DN.duocTaoMoi()` (admin, kiem, moi); `moiDuocSua(m)` = người tạo (`m.uid`) hoặc quản trị. Quyền `moi` có
  `READONLY=true` (tài sản BBKK chỉ xem) nhưng `save()` vẫn ghi đường dẫn `moi/…` (đoạn "quyền Tạo tài sản mới" trong `save()`), thay
  đổi khác trả lại như cũ. Tag `tao_boi` = `DN.toi.nhom` (máy chủ ghi đè cho người không phải quản trị). Vào sổ: `moiNoi(m)` (Mã TSCĐ /
  `noi`, qua `maMoi()`), `moiCuaTS(a)`; anh.js: `dsNoi(a)` / `dsHien(a)` = ảnh của tài sản + ảnh tài sản mới đã nối (đếm ở nút ⋯, trang
  Ảnh tài sản, xem ảnh); hộp ⋯ dùng chung qua `muc()` (`moMoRong(a)` cho tài sản trong sổ, `moAnhMoi(id)` cho tài sản mới; ảnh tài sản
  mới vào `moi/<mã>/`, đợi tài liệu ghi xong — `choGhi` — rồi mới tải ảnh). Xuất: `moiChoKeToan()` → `phatSinh` (cột Nguồn). Lịch sử
  khoá `m:` → `logMoiLines`, loại `moi`. Nhập sổ: nguồn `moi`. Bảng Thành viên: ô `data-ql="nhom"` + `#qtNhom` (gợi ý `NHOM_GOI_Y`).
- **Giám sát (quy tắc vàng 17, `giam-sat.js`)**: `logPut` ghi kèm mỗi dòng `uid, tk, cd, quyen, tb` (máy chủ đóng dấu lại + `ip, ts, tbmoi`)
  và `hd, sx, nc` (`gsPhanLoai`: loại hành động, số mục bị xoá, nhạy cảm); `logDescribe` đánh dấu `de` khi sửa kết quả người khác đã ghi.
  Trang Lịch sử: `lsQT()` quản trị (thẻ `LV.tab` ds / tk / cb, lọc `LV.tk, tkTen, cd, quyen, hd, tg, tu, den, chiCb, chiDong`), `lsTK()` người
  thường (chỉ `logMine`). Cảnh báo `gsLuat()` (hàm thuần, ngưỡng `GS_NGUONG`) trên `GS.logs` 7 ngày (`gsTai()` 5 phút một lần), `gsChuaXem()`,
  `gsXem()` (lưu `cb/xem-<uid>` + localStorage); `render()` gọi `gsBao()` (thanh `#gsBao`, số đỏ `.gs-n` ở `#swLS` và menu con). Lý lịch đọc
  qua `DB.lyLich()` (hàm máy chủ `ly_lich_tai_san`). Tải Excel (`xuatBangExcel`) và tải ảnh ghi lịch sử loại `xuat`.
- Menu con cuộn ngang trên màn hẹp: `route()` gọi `menuThay(a)` kéo mục đang mở vào giữa (không để cắt chữ).
- Bộ thử khi đang sửa: `THU_CHI=anh,chung` chỉ chạy các kịch bản đó, `THU_DT=1` chạy cỡ điện thoại, `THU_CHUP=<thư mục>` chụp cả
  trang cuối mỗi kịch bản (để trong thư mục tạm, không đưa vào repo).
- Đăng nhập (`dang-nhap.js`, đối tượng `DN`): một kết nối Supabase dùng chung `kiemkeSupabase()` (supabase-db.js, giữ phiên
  trong localStorage `kiemke-dang-nhap`). `connect()` gọi `DN.batDau(tiep)`: hỏi `trang_thai_dang_nhap` → chưa cài thì chạy như
  cũ; đã cài thì màn hình `#dnMan` (`body.dn-cho` ẩn trang) tới khi đăng nhập, rồi mới `listen()` dữ liệu. `DN.toi = {uid, ten,
  hoTen, quyen, email}`; `ME` = họ tên tài khoản; bấm tên ở đầu trang → `#quan-ly`. Mọi lời gọi Supabase cho đăng nhập nằm trong
  `sbCong()`; bộ thử giao diện thay bằng `window.KIEMKE_AUTH_GIA` (`scripts/thu-dang-nhap-gia.js`, cùng tên hàm) — thêm hàm mới
  thì thêm ở cả hai. Không hiển thị / ghi mật khẩu vào lịch sử hay toast.
  Mật khẩu ban đầu (quản trị đặt: Thêm thành viên, Đặt lại mật khẩu) kiểm bằng `DN.kiemTraMatKhau(mk, {…, banDau: true})` (được toàn
  số, lặp ký tự); `toi_la_ai` trả `doi_mk` → `hoanTat()` mở `hienDoiMkDau()` (bắt buộc đổi, mật khẩu mới kiểm đủ quy tắc, gọi
  `DN.api.doiMkDau`) trước bước bật 2 lớp / vào trang; lịch sử "Đổi mật khẩu ban đầu" ghi trong `DN.ghiDangNhap`.
  Nút `data-act="qrin"`
  (`data-qk` tài sản / `data-qu` sheet / `data-qr` phòng) gọi `qrOpen()` mở phần Mã QR lọc sẵn; `data-act="qrso"` mở Sổ mã QR.
- Sổ mã QR trên trang: `SOQR = window.KIEMKE_SO_QR` (sinh khi build). Tài sản đã xoá khỏi BBKK: `viewTSXoa`; quét tem của nó
  (`scanGoXoa`) vẫn mở trang này. Kế toán đổi Mã TSCĐ (`SOQR.sang {cũ: mới}`): mọi chỗ nhận mã (quét `scanShow`/`contScan`,
  `#ts-`, `#ly-lich-`) tra `maMoi()` trước khi coi là đã xoá → mở tài sản mã mới (`scanGoCu`, `TSCU` để báo "tem mang mã cũ");
  `maCuCua()` cho trang tài sản, lý lịch (đọc log của cả mã cũ), Nhập sổ. Kết quả của mã không còn trong Excel giữ trong
  `ORPHAN` (chỉ đọc, không vào `S`/`LAST` nên không bị ghi đè/xoá); nút `data-act="kqcu"` chép sang mã mới qua `save()`.
  Mã của phần Mã QR viết trong `ma-qr.js` (dùng lại `ASSETS`, `banner()`, `ic()`, `esc()`… của `index.html`); thêm
  file `.js` mới thì thêm vào `MA_TRANG` trong `scripts/kiem-tra-web.mjs`.
- In tem (`ma-qr.js`): một bố cục `temOps()` (mm) vẽ ra cả 4 nơi: xem trước và In ngay (SVG), PDF (jsPDF, nhúng phông
  `fonts/BeVietnamPro-*.ttf`), ảnh PNG (canvas, ghi dpi). Sửa bố cục chỉ sửa `temGeo`/`temOps`. Trước khi xuất luôn chạy
  `temVerify` (giải mã lại mọi mã bằng jsQR). Thư viện jsPDF/JSZip/jsQR chỉ tải khi cần (`temLoad`).
- Quét liên tục trong phòng (nút `data-act="quetlt"` ở trang phòng → `contOpen`): `SC.cont` bật thì `scanShow` chuyển sang
  `contScan`: tài sản của phòng ghi Đủ ngay (`contDu`, qua `save()`, lịch sử gắn nhãn "Quét liên tục"); phòng khác / số lượng
  > 1 / hồ sơ → hỏi (`contAct`); mỗi món có Hoàn tác riêng; đóng hộp quét thì vẽ lại phòng.
- Phòng ban của tài sản: `a.unit` là getter (`S.rows[stt].dv` hoặc `a.unit0` theo Excel) nên mọi chỗ dùng `a.unit` / `BY_UNIT`
  tự đi theo phòng ban hiện tại; cần phòng ban theo file Excel thì dùng `a.unit0`. Ô chọn `dvField(a)` (`data-f="dv"`, nằm dưới ô
  phòng trong `roomField`) → `moveUnit()` (snap, `save()`, `refreshRooms()` dựng lại `BY_UNIT`, Hoàn tác); câu lịch sử "Phòng ban: …"
  trong `logRowLines`; trang sheet gốc `chuyenDiHTML(id)`. Danh mục phòng bổ sung `DMP` (`KIEMKE_DATA.phong`): `buildRooms()` và
  `refreshRooms()` chỉ thêm phòng có slug chưa có; ghi chú `ghiChuPhong(tên)`. Lưới thẻ phòng xếp `thSapPhong`, nhãn tầng `tangTiles()`.
  "Xong" luôn tính bằng `xong(count)` (đủ hết hoặc 0/0), không dùng `chua===0`.
- Trạng thái sử dụng: ô `data-f="sd"` trong phần "Chi tiết, ghi chú" của dòng tài sản (trang tài sản mở sẵn); nhãn trên dòng,
  câu lịch sử trong `logRowLines`, cột Ghi chú kiểm kê trong `ketQuaKeToan`. Không gộp vào `COND`.
- Nút dạng đường link dùng `a.btn` (màu chữ của trang). Thử giao diện: `npm run thu-giao-dien`.
- Quét mã (`scanShow`): tem của app → `KIEMKE_QR.parse` → tra đúng `BY_KEY`; mã khớp nguyên văn → mở `#ts-…`; camera không
  bao giờ đoán gần đúng; mã vạch (không phải QR) phải đọc giống nhau 2 lần mới nhận.
- Tìm tài sản (mọi ô tìm: Bảng tổng quan `#gq`, trang sheet / phòng / kết quả `#q`, Tổng hợp `#thq`, Lý lịch, Khấu hao, In tem):
  luôn qua `timKhop(a, q, chữ)` để tìm được theo **STT** (cột STT sheet Tổng hợp, người dùng yêu cầu 16/11/2026): "142" → STT 142
  đứng đầu (`sttTruoc`) + mã / tên chứa "142"; "STT 142" / "#142" → chỉ đúng STT. `#gq` gõ STT + Enter mở thẳng `#ts-`.
- Xuất cho kế toán (`export.js`): KHÔNG ghi lại cả file bằng ExcelJS — chỉ đọc để biết dòng, rồi chèn ô 3 cột mới vào XML (JSZip),
  thêm định dạng vào CUỐI `styles.xml`. Quy tắc "file gốc giữ nguyên" trong AGENTS.md; bộ so sánh `scripts/so-sanh-excel.js`.
- **Trợ năng (WCAG 2.2 AA)**: thử giao diện kịch bản `tro-nang` / `tro-nang-dt` (axe-core trên 14 trang chính, cỡ máy tính và
  điện thoại) phải 0 vi phạm. Ô nhập / ô chọn phải có nhãn (nhãn chữ ẩn trên máy tính thì thêm `aria-label`); chữ / nền tương phản
  ≥ 4.5:1 (chữ trắng trên nền cam dùng `--cta`, không dùng `--brand`); vùng bấm ≥ 24px (`.lnk` đã có `min-height:24px`); bảng cuộn
  ngang `tblwrap` có `tabindex="0" role="region" aria-label="…"` (mỗi bảng một nhãn riêng); tiêu đề không nhảy cấp (h1 → h2 → h3).
  Bộ thử tắt riêng luật axe `skip-link` (nhóm khuyến nghị, không phải tiêu chí WCAG: app dùng link `#…` làm trang, menu con cuộn ngang
  bị axe đoán nhầm) và thay bằng `linkHong()`: mọi link `#…` phải mở trang có thật (`TRANG_CO`) hoặc trỏ tới phần tử có thật. Thêm
  trang mới (`#…`) thì thêm vào `TRANG_CO` trong `scripts/thu-giao-dien-kich-ban.js`.
- **Nâng cấp giao diện 17/11/2026 (người dùng chọn cả 4, giữ bằng thử giao diện `nang-cap-dt`, `nang-cap-pc`)**:
  - Chữ nhỏ nhất **13px** ở mọi nơi (kể cả chữ đặt thẳng `style="font-size:…"`); cỡ 0 chỉ để ẩn chữ có chủ ý.
  - Điện thoại (≤ 860px): vùng bấm **≥ 44px** cho nút trong dòng tài sản, ô chọn / ô nhập, nút −/+, nút lọc (khối CSS "Nâng cấp
    điện thoại"); dòng tài sản xếp `order`: mã → tên → **nút Đủ / Không thấy** → ô phòng, phòng ban, số, tình trạng.
  - "Đưa việc kiểm lên trước" chỉ trên điện thoại, máy tính giữ bố cục cũ: banner `banner()` gọn (ẩn ảnh, phần giới thiệu sau
    nút "Giới thiệu" `data-act="pbanmo"`); khung phụ là `<details class="panel thu-gon" data-nho="…">` mở sẵn trên máy tính,
    thu gọn trên điện thoại (`moSan(k)`, nhớ trạng thái trong `ui.mo` tới khi rời trang); trang một tài sản bọc `.ts-trang`,
    điện thoại xếp tên `.tsx-dau` → phần kiểm `.ts-kiem` → thông tin → mã QR nhỏ, không mở sẵn chi tiết.
  - Thanh tiến độ dính `#dinh` (nằm trong `<header>`, đặt tuyệt đối nên không làm giật trang): trang phòng / phòng ban, hiện khi
    `#prog` cuộn khuất (`dinhGan()` sau mỗi lần vẽ, `dinhVe()` khi số đổi trong `refreshRow`); bấm để lên đầu trang.
- Chèn chữ do người dùng nhập vào HTML luôn qua `esc()`.
- Trạng thái kiểm kê nằm trong `S`; sau khi đổi `S` phải gọi `save()` rồi làm mới giao diện (`refreshRow`/`render`).
  Không gọi `save()` trong hàm render.
- Lịch sử thao tác tự sinh trong `save()`, nên mọi thay đổi `S` phải qua `save()` mới có lịch sử. Thao tác đổi nhiều
  tài sản một lúc: đặt `LOGCTX={bulk:true,title:'…'}` ngay trước `save()` để gộp 1 dòng. Sự kiện không đổi `S`
  (xuất file, đổi tên) ghi bằng `logEvent({kind,title,lines})`. Câu mô tả thay đổi viết trong `logRowLines`/`logXmLines`/…
- Sửa xong: `npm test`, rồi xem thử bằng skill `xem-thu-cuc-bo`.
