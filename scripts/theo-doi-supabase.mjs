// Theo dõi Supabase — GitHub Actions chạy mỗi sáng (.github/workflows/theo-doi-supabase.yml); chạy tay: npm run theo-doi-supabase
//   - Đọc thử 1 dòng dữ liệu chung (CHỈ ĐỌC). Việc đọc đều đặn cũng giúp dự án Supabase gói miễn phí không bị tạm dừng
//     vì lâu không dùng.
//   - Không đọc được (dự án bị tạm dừng / lỗi): in hướng dẫn bật lại và kết thúc với lỗi → GitHub gửi mail báo lần chạy
//     thất bại tới email nhận thông báo của tài khoản GitHub chủ repo.
import fs from 'node:fs';
import { supabaseConfig, WEB_URL } from './cau-hinh.mjs';

const { url, key, table } = supabaseConfig();
const ghi = s => { console.log(s); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + '\n\n'); };

async function docThu() {
  const c = new AbortController(), t = setTimeout(() => c.abort(), 20000);
  try {
    const r = await fetch(`${url}/rest/v1/${table}?select=col&limit=1`, { headers: { apikey: key, Authorization: 'Bearer ' + key }, signal: c.signal });
    return { ok: r.ok, ma: r.status, noiDung: (await r.text()).slice(0, 300) };
  } catch (e) { return { ok: false, ma: 0, noiDung: String(e && e.message || e) }; }
  finally { clearTimeout(t); }
}

let kq;
for (let lan = 1; lan <= 3; lan++) {          // thử 3 lần, cách nhau 30 giây, tránh báo nhầm vì mạng chập chờn
  kq = await docThu();
  if (kq.ok) break;
  if (lan < 3) await new Promise(r => setTimeout(r, 30000));
}
const luc = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
if (kq.ok) ghi(`✓ ${luc}: Supabase đang hoạt động (đọc thử được). Trang: ${WEB_URL}`);
else {
  ghi(`✗ ${luc}: KHÔNG đọc được dữ liệu chung trên Supabase (mã ${kq.ma}: ${kq.noiDung})`);
  ghi('Có thể dự án Supabase đã bị tạm dừng vì lâu không dùng (gói miễn phí) hoặc đang gặp sự cố. Trang Quản lý tài sản sẽ đứng ở "Đang kết nối…" và không lưu được kết quả kiểm.');
  ghi('Cách bật lại: đăng nhập https://supabase.com/dashboard → chọn dự án của trang → bấm "Restore project" (Khôi phục), đợi vài phút rồi mở lại trang. Kết quả kiểm đã lưu không bị mất.');
  process.exitCode = 1;   // không gọi process.exit(): để kết nối mạng đóng xong (tránh lỗi thoát của Node trên Windows)
}
