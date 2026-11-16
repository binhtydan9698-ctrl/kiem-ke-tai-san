// Danh mục phòng bổ sung: "dữ liệu cập nhật/danh-muc-phong.json" (người dùng gửi ảnh danh sách phòng Gamma, Alpha 16/11/2026).
// Chỉ để THÊM phòng chưa có trên app (0 tài sản); phòng đã có giữ nguyên. Build đưa vào KIEMKE_DATA.phong; npm test soát.
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './excel-file.mjs';

export const PHONG_FILE = path.join(DATA_DIR, 'danh-muc-phong.json');

// → { soTang: {Tòa: số tầng}, phong: [{ten:'202 Gamma', toa, so, tang, ghiChu}] } (chưa có file thì rỗng)
export function docDanhMucPhong() {
  if (!fs.existsSync(PHONG_FILE)) return { soTang: {}, phong: [] };
  const d = JSON.parse(fs.readFileSync(PHONG_FILE, 'utf8'));
  return {
    soTang: d.soTang || {},
    phong: (d.phong || []).map(p => ({ ten: `${p.so} ${p.toa}`, toa: p.toa, so: String(p.so), tang: Math.floor(+p.so / 100), ghiChu: p.ghiChu || '' })),
  };
}

// lỗi trong danh mục: tòa chưa khai số tầng, số phòng sai dạng, tầng vượt số tầng của tòa, trùng phòng
export function kiemTraDanhMucPhong(dm) {
  const loi = [], da = new Set();
  for (const p of dm.phong) {
    if (!dm.soTang[p.toa]) loi.push(`${p.ten}: tòa ${p.toa} chưa khai số tầng (soTang)`);
    else if (!/^\d{3,4}$/.test(p.so) || p.tang < 1 || p.tang > dm.soTang[p.toa]) loi.push(`${p.ten}: tầng ${p.tang} không có ở tòa ${p.toa} (${dm.soTang[p.toa]} tầng)`);
    if (da.has(p.ten)) loi.push(`${p.ten}: trùng`);
    da.add(p.ten);
  }
  return loi;
}
