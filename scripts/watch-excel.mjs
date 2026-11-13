// Tự động cập nhật web khi file Excel trong "dữ liệu cập nhật/" thay đổi.
//   node scripts/watch-excel.mjs          → theo dõi liên tục (cửa sổ phải để mở)
//   node scripts/watch-excel.mjs --once   → đẩy lên một lần rồi thoát
// Mỗi lần: kiểm tra file Excel đọc được (chạy build) → commit riêng thư mục dữ liệu → push lên GitHub.
// Vercel thấy commit mới sẽ tự dựng lại trang (khoảng 1 phút).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DATA_DIR, isDataFile } from './excel-file.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_REL = path.relative(ROOT, DATA_DIR);
const once = process.argv.includes('--once');

const now = () => new Date().toLocaleString('vi-VN');
const log = (...a) => console.log(`[${new Date().toLocaleTimeString('vi-VN')}]`, ...a);
function run(cmd, args, quiet) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: false });
  if (!quiet && r.stdout.trim()) console.log(r.stdout.trim());
  if (r.status !== 0 && r.stderr.trim()) console.error(r.stderr.trim());
  return r;
}
const git = (...args) => run('git', ['-c', 'core.quotepath=false', ...args], true);

function publish() {
  // 1. Có gì thay đổi trong thư mục dữ liệu không?
  const st = git('status', '--porcelain', '--', DATA_REL);
  if (st.status !== 0) { log('Lỗi git:', st.stderr.trim()); return false; }
  if (!st.stdout.trim()) { log('File Excel không có gì mới so với bản trên web.'); return true; }

  // 2. Kiểm tra đọc được file Excel trước khi đẩy (tránh làm hỏng trang web)
  log('Đang kiểm tra file Excel…');
  const b = run(process.execPath, [path.join('scripts', 'build.mjs')]);
  if (b.status !== 0) { log('✗ File Excel có lỗi, CHƯA đẩy lên web. Sửa file rồi lưu lại.'); return false; }

  // 3. Commit riêng thư mục dữ liệu rồi đẩy lên
  git('add', '-A', '--', DATA_REL);
  const c = git('commit', '-m', `Cập nhật dữ liệu Excel ${now()}`, '--', DATA_REL);
  if (c.status !== 0 && !/nothing to commit/.test(c.stdout + c.stderr)) { log('Lỗi commit:', c.stderr.trim() || c.stdout.trim()); return false; }
  const pull = git('pull', '--rebase', '--autostash');
  if (pull.status !== 0) { log('✗ Không lấy được bản mới từ GitHub:', pull.stderr.trim()); return false; }
  const p = git('push');
  if (p.status !== 0) { log('✗ Chưa đẩy lên được GitHub (mạng hoặc đăng nhập):', p.stderr.trim()); return false; }
  log('✓ Đã đẩy lên GitHub. Web sẽ có dữ liệu mới sau khoảng 1 phút.');
  return true;
}

if (once) {
  process.exit(publish() ? 0 : 1);
}

console.log('==============================================================');
console.log(' TỰ ĐỘNG CẬP NHẬT WEB KIỂM KÊ');
console.log(` Đang theo dõi: ${DATA_DIR}`);
console.log(' Lưu file Excel trong thư mục này → web tự cập nhật.');
console.log(' Để cửa sổ này mở. Đóng cửa sổ (hoặc Ctrl+C) để dừng.');
console.log('==============================================================');
publish();

let timer = null;
fs.watch(DATA_DIR, (ev, name) => {
  if (name && !isDataFile(String(name))) return;   // bỏ qua file tạm ~$… của Excel
  clearTimeout(timer);
  // Excel ghi file theo nhiều bước: đợi 8 giây yên lặng rồi mới đẩy
  timer = setTimeout(() => { log(`Phát hiện thay đổi: ${name || 'thư mục dữ liệu'}`); publish(); }, 8000);
});
