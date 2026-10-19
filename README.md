# frontend-reactjs

Bản chuyển đổi giao diện quản trị dashcam (hệ thống quản lý tài xế) từ HTML/CSS/JS thuần (`../frontend`) sang React 19 + Vite + TypeScript + Tailwind v4 + TanStack Router/Query + Zustand. Mục tiêu chính là giữ nguyên hành vi của bản gốc (API, timer, storage key, chuỗi tiếng Việt, cả các bug gốc); `../frontend` chỉ để đối chiếu, không bị sửa.

## Yêu cầu

- Node.js (bản LTS mới)
- pnpm
- Backend (`../backend`) chạy ở cổng **4000** với `NODE_ENV=development`. Khi mở trang bằng `localhost` hoặc địa chỉ IP, ứng dụng gọi `http://<host>:4000/api/`.

## Cài đặt và chạy

```bash
pnpm install          # thêm --ignore-workspace nếu pnpm nhận workspace ở thư mục cha
pnpm dev              # http://localhost:5173
pnpm test             # Vitest (jsdom)
pnpm lint
pnpm build && pnpm preview   # http://localhost:4173
```

Đối chiếu tự động với bản gốc (chỉ đọc `../frontend/js`):

```bash
node scripts/check-parity.mjs   # mong đợi dòng cuối: 0 missing
```

## Cấu trúc thư mục

```
src/
  app/        router (hash, tương thích URL cũ), khung ứng dụng, sidebar, RootLayout
  features/   auth, dashboard, vehicle, driver, map, liveview, playback,
              statistics, settings, event-server (mỗi tính năng: lib, queries/loaders, store, components)
  shared/     api (fetchApi, endpoints), auth (session, inactivity, store), map (tile, lớp lãnh thổ),
              query (QueryClient), ui (Button, Modal, toast, loader), lib
  styles/     index.css (Tailwind v4 @theme)
  test/       setup, mock Leaflet, tiện ích render
scripts/      check-parity.mjs
vite-plugins/ api404 (trả 404 cho /api/* ở dev và preview)
docs/         specs và plans của đợt chuyển đổi
```

## Tài liệu

- Thiết kế: [docs/specs](docs/specs/2026-10-19-frontend-reactjs-migration-design.md)
- Kế hoạch: [docs/plans](docs/plans/2026-10-19-frontend-reactjs-migration.md)
- Ánh xạ hàm gốc sang hàm mới, bug gốc được giữ, khác biệt có chủ đích và bảng kiểm chứng từng màn: [MIGRATION_NOTES.md](MIGRATION_NOTES.md)
