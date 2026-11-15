// Mã hoá dữ liệu tài sản khi build (Quy tắc bảo mật BAO-MAT.md, mục "Dữ liệu tài sản sau đăng nhập").
//   - Khoá: biến môi trường KIEMKE_KHOA_DU_LIEU (32 byte, base64) — đặt trong Vercel (Settings → Environment Variables),
//     KHÔNG ghi vào repo. Cùng khoá đó nằm trong Supabase (bảng bi_mat, chỉ thành viên đã đăng nhập lấy được qua khoa_du_lieu()).
//   - Định dạng file .enc: 12 byte IV + bản mã AES-256-GCM + 16 byte tag (đúng thứ tự WebCrypto giải mã: iv riêng, data = mã + tag).
//   - Không có khoá (build trên máy, bộ thử): ghi file thường như cũ.
import crypto from 'node:crypto';

export function docKhoa(env = process.env) {
  const v = (env.KIEMKE_KHOA_DU_LIEU || '').trim();
  if (!v) return null;
  const k = Buffer.from(v, 'base64');
  if (k.length !== 32) throw new Error('KIEMKE_KHOA_DU_LIEU phải là khoá 32 byte dạng base64 (chép nguyên văn từ Chung › Quản lý › Khoá dữ liệu tài sản)');
  return k;
}

export function maHoa(khoa, buf) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', khoa, iv);
  const ct = Buffer.concat([c.update(Buffer.isBuffer(buf) ? buf : Buffer.from(buf)), c.final()]);
  return Buffer.concat([iv, ct, c.getAuthTag()]);
}

// giải mã giống hệt trình duyệt (WebCrypto) — dùng cho npm test
export async function giaiMaWeb(khoaB64, buf) {
  const k = await crypto.webcrypto.subtle.importKey('raw', Buffer.from(khoaB64, 'base64'), 'AES-GCM', false, ['decrypt']);
  const b = new Uint8Array(buf);
  return Buffer.from(await crypto.webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, k, b.slice(12)));
}

// Chính sách chặn mã lạ (CSP) cho trang: chỉ chạy mã của trang (khối mã chính theo dấu băm) và các CDN đã cho phép
export function cspTrang(hashMaChinh, supabaseUrl) {
  const sb = supabaseUrl ? supabaseUrl.replace(/\/$/, '') : '';
  const ws = sb.replace(/^https:/, 'wss:');
  return [
    "default-src 'self'",
    `script-src 'self' 'sha256-${hashMaChinh}' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    `connect-src 'self' blob: data:${sb ? ' ' + sb + ' ' + ws : ''}`,
    "worker-src 'self' blob:",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
  ].join('; ');
}

// dấu băm sha256 (base64) của khối mã chính trong index.html — trình duyệt tính trên chữ đã đổi xuống dòng về \n
export function bamMaChinh(html) {
  // thẻ phải đứng đầu dòng (tránh khớp nhầm chữ trong lời chú thích); đúng một khối
  const tim = [...html.matchAll(/^<script type="text\/plain" id="kiemke-app">([\s\S]*?)<\/script>/gm)];
  if (tim.length !== 1) throw new Error(`index.html cần đúng 1 dòng bắt đầu bằng <script type="text/plain" id="kiemke-app"> (đang có ${tim.length})`);
  const m = tim[0];
  return crypto.createHash('sha256').update(m[1].replace(/\r\n?/g, '\n'), 'utf8').digest('base64');
}
