// Sao lưu toàn bộ kết quả kiểm kê trên Supabase về máy (npm run sao-luu).
// File lưu ở sao-luu/kiemke-<ngày-giờ>.json — thư mục này KHÔNG đưa lên GitHub (.gitignore).
// Chỉ đọc, không sửa/xoá gì trên Supabase.
// Đã bật đăng nhập (supabase/dang-nhap.sql): dữ liệu chỉ thành viên đọc được → chạy kèm tài khoản, chỉ đặt tạm khi chạy lệnh:
//   PowerShell:  $env:KIEMKE_TEN='<tên đăng nhập>'; $env:KIEMKE_MK='<mật khẩu>'; npm run sao-luu
//   (KHÔNG ghi tên/mật khẩu vào file nào trong repo.) Có đăng nhập thì sao lưu thêm Danh bạ.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, docTatCa, docBang, trangThaiDangNhap, dangNhapToken } from './cau-hinh.mjs';

const tt = await trangThaiDangNhap();
const token = await dangNhapToken();
if (tt.da_cai && !token) {
  console.log('✗ Supabase đã bật đăng nhập: chỉ thành viên đọc được dữ liệu. Chạy lại kèm tài khoản (chỉ đặt tạm, không lưu vào repo):');
  console.log("    $env:KIEMKE_TEN='<tên đăng nhập>'; $env:KIEMKE_MK='<mật khẩu>'; npm run sao-luu");
  process.exitCode = 1;
} else {
  const docs = await docTatCa(token);
  const danhBa = tt.da_cai && token ? await docBang('danh_ba', '*', token, 'ho_ten') : null;
  if (!docs.length) {
    console.log('✗ Không đọc được bản ghi nào' + (tt.da_cai ? ' (tài khoản chưa có quyền, hoặc đã bị khoá)' : '') + ': KHÔNG ghi file sao lưu rỗng.');
    process.exitCode = 1;
  } else {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    const ten = `kiemke-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
    const dir = path.join(ROOT, 'sao-luu');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, ten), JSON.stringify({ luc: d.toISOString(), soBanGhi: docs.length, docs, ...(danhBa ? { danhBa } : {}) }, null, 1));
    const dem = docs.reduce((m, x) => (m[x.col] = (m[x.col] || 0) + 1, m), {});
    console.log(`Đã sao lưu ${docs.length} bản ghi${danhBa ? ` và ${danhBa.length} người trong Danh bạ` : ''} → sao-luu/${ten}`);
    console.log('  ' + Object.entries(dem).map(([k, v]) => `${k}: ${v}`).join(' · '));
  }
}
