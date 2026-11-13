// Tìm file Excel dữ liệu trong thư mục "dữ liệu cập nhật/" (dùng chung cho build và tự động cập nhật).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = path.join(ROOT, 'dữ liệu cập nhật');

// Bỏ qua file tạm của Excel (~$...) khi đang mở
export const isDataFile = name => /\.xlsx$/i.test(name) && !name.startsWith('~$');

export function findExcel() {
  if (!fs.existsSync(DATA_DIR)) throw new Error(`Không thấy thư mục "${DATA_DIR}"`);
  const files = fs.readdirSync(DATA_DIR).filter(isDataFile)
    .map(f => ({ f, t: fs.statSync(path.join(DATA_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (!files.length) throw new Error('Thư mục "dữ liệu cập nhật" chưa có file .xlsx nào.');
  if (files.length > 1) console.warn(`  ! Có ${files.length} file Excel, dùng file sửa gần nhất: ${files[0].f}`);
  return path.join(DATA_DIR, files[0].f);
}
