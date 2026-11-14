---
name: trien-khai-len-web
description: >-
  Dùng khi đã sửa code (web/, scripts/) xong và cần đưa lên trang Vercel: commit, push lên GitHub,
  chờ Vercel build và kiểm tra trang thật. Cũng dùng khi người dùng hỏi trang web đã cập nhật chưa.
---

# Triển khai lên web (GitHub → Vercel)

- Repo: https://github.com/binhtydan9698-ctrl/kiem-ke-tai-san (nhánh `main`, **công khai**)
- Web: https://quan-ly-tai-san-fptudn.vercel.app — Vercel tự build mỗi lần có commit mới trên `main`
  (`vercel.json`: `npm run build` → phục vụ `dist/`).

## Các bước

1. `npm test` phải đạt ("✓ Tất cả đều đạt"). Không đạt thì không đẩy. Có sửa giao diện: `npm run thu-giao-dien` cũng phải đạt.
2. Xem lại thay đổi: `git status` và `git diff`. Đảm bảo KHÔNG có: `dist/`, `node_modules/`, `sao-luu/`, `.gemini/`,
   file `~$*.xlsx`, khoá Supabase loại `secret`/`service_role`. (`.gitignore` đã chặn phần lớn, vẫn phải nhìn lại.)
3. Hỏi người dùng trước khi commit/push nếu họ chưa yêu cầu rõ. Commit bằng tiếng Việt, mô tả ngắn gọn thay đổi.
4. `git push` (tài khoản GitHub đã đăng nhập sẵn trên máy qua Git Credential Manager).
5. `npm run kiem-tra-web` — đợi Vercel có đúng phiên bản dữ liệu **và** đúng mã trang (index.html, *.js) của bản build
   trên máy, soát file và Supabase. Sửa giao diện thì vẫn nên mở trang xem bằng mắt (tải lại với Ctrl+F5).

## Nếu Vercel build lỗi

Vào vercel.com → project `kiem-ke-tai-san` → Deployments → xem log. Lỗi hay gặp: file Excel không đọc được
(chạy `npm run build` trên máy để thấy cùng lỗi), thiếu thư viện trong `package.json`.
