// Sao lưu toàn bộ kết quả kiểm kê trên Supabase về máy (npm run sao-luu).
// File lưu ở sao-luu/kiemke-<ngày-giờ>.json — thư mục này KHÔNG đưa lên GitHub (.gitignore).
// Chỉ đọc, không sửa/xoá gì trên Supabase.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, docTatCa } from './cau-hinh.mjs';

const docs = await docTatCa();
const d = new Date(), p = n => String(n).padStart(2, '0');
const ten = `kiemke-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
const dir = path.join(ROOT, 'sao-luu');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, ten), JSON.stringify({ luc: d.toISOString(), soBanGhi: docs.length, docs }, null, 1));
const dem = docs.reduce((m, x) => (m[x.col] = (m[x.col] || 0) + 1, m), {});
console.log(`Đã sao lưu ${docs.length} bản ghi → sao-luu/${ten}`);
console.log('  ' + Object.entries(dem).map(([k, v]) => `${k}: ${v}`).join(' · '));
