# Thiết kế: Chuyển `frontend` (HTML/CSS/JS thuần) sang `frontend-reactjs` (React + Tailwind)

Ngày: 2026-10-19

## 1. Mục đích và lý do

Frontend hiện tại (`frontend/`) là ~18.000 dòng HTML/CSS/JS thuần: một `index.html` 1.700 dòng chứa toàn bộ markup của mọi màn hình, và 11 module JS dạng IIFE gắn vào `window`, giao tiếp qua biến toàn cục và DOM id. Code khó bảo trì và khó refactor.

Mục tiêu là tạo bản React tương đương **về hành vi** trong `frontend-reactjs/`, làm nền cho các đợt refactor logic về sau. Bước này **chỉ chuyển đổi**, không cải tiến logic.

## 2. Mục tiêu / Không phải mục tiêu / Điều cấm

**Mục tiêu**
- Mọi luồng logic chạy đúng như bản gốc: cùng endpoint, cùng tham số, cùng thứ tự gọi API, cùng chu kỳ polling, cùng key localStorage/sessionStorage, cùng xử lý lỗi, cùng điều hướng và trạng thái màn hình.
- Code tổ chức theo tính năng, TypeScript, Tailwind CSS.
- Chạy song song với bản gốc trên cùng backend để đối chiếu.

**Không phải mục tiêu**
- Giao diện giống từng pixel. Lệch nhỏ chấp nhận được; bố cục, nội dung, màu chủ đạo và trạng thái hiển thị phải tương đương.
- Sửa bug, tối ưu, đổi thuật toán của bản gốc. Bug nào gặp phải thì **giữ nguyên** và ghi vào `frontend-reactjs/MIGRATION_NOTES.md` để xử lý ở đợt refactor sau.
- Viết test tự động đầy đủ.

**Điều cấm (làm thì coi như thất bại dù code chạy)**
- Tạo, sửa hoặc xóa bất kỳ file nào ngoài thư mục `frontend-reactjs/` (bao gồm `frontend/`, `backend/`, file cấu hình ở gốc repo như `package.json`, `pnpm-workspace.yaml`). *Người dùng chốt.* Asset cần dùng được **chép** từ `frontend/` sang, không di chuyển. Lệnh chạy dev đặt trong `frontend-reactjs/package.json`.
- Sửa backend, hoặc thay đổi bất cứ thứ gì trên domain/hạ tầng production.
- Đổi thư viện lõi: Leaflet, hls.js, ECharts, Flatpickr giữ nguyên (người dùng đã chốt).
- Thay đổi hợp đồng API, tên key storage hoặc định dạng giá trị lưu trong storage (token, hạn "ghi nhớ đăng nhập", `drivers_cache`, `vehicles_cache`, `geic_vehicle_icons`, các key `dashcam_setting_*`…). Lý do: bản React về sau sẽ thay bản gốc ở cùng domain, người dùng đang đăng nhập không được bị mất phiên hay mất cache.
- Triển khai bản React lên production ở bước này.

## 3. Hiện trạng (đã khảo sát)

**Màn hình** (điều hướng bằng hash, `frontend/js/main.js`): `dashboard` (mặc định), `liveview`, `playback`, `statistics`, `map`, `driver`, `vehicle`, `settings`, `event-server`, cùng `login`. Hash không hợp lệ thì về `dashboard`. Chưa đăng nhập thì chuyển sang `#login` bằng `location.replace`.

**Module JS và nơi khởi tạo**

| File | Dòng | Ghi chú |
|---|---|---|
| `api.js` | 675 | `ApiModule`: tính `BASE_URL` theo hostname, CSRF token cache, gắn `jsession` vào params, ~35 hàm API |
| `auth.js` | 599 | Token trong sessionStorage hoặc localStorage (ghi nhớ đăng nhập + hạn), parse JWT, tự đăng xuất khi không hoạt động, các modal đổi/quên/reset mật khẩu, phát event `auth-success` / `auth-logout` |
| `main.js` | 317 | Router hash, ẩn/hiện login/app, init các module sau khi đăng nhập, gọi resize Leaflet khi sidebar co giãn hoặc đổi màn hình, modal xác nhận đăng xuất |
| `dashboard.js` | 762 | ECharts; tự init ở DOMContentLoaded; làm mới 120s, polling cảnh báo realtime 60s |
| `liveview.js` | 1861 | hls.js, keepalive, đồng hồ thời gian lái theo xe (1s), polling cảnh báo AI 15s, polling nhận diện khuôn mặt, tab camera/bản đồ |
| `map.js` | 638 | Leaflet, 2 bản đồ (liveview + main), polling vị trí 1,5s, chế độ follow |
| `playback.js` | 1961 | hls.js + Leaflet; tự init ở DOMContentLoaded và được `main.js` gọi `init()` lại |
| `events.js` | 1285 | Màn thống kê, ECharts, modal chi tiết sự kiện |
| `event-server.js` | 276 | Polling cảnh báo 15s, toast + âm thanh, đọc key `dashcam_setting_aiToasts` và `dashcam_setting_aiToastSound` |
| `driver.js` | 2092 | CRUD tài xế, Flatpickr, ảnh, modal xóa; tự init ở DOMContentLoaded |
| `vehicle.js` | 401 | CRUD phương tiện, modal |

**Không được nạp trong `index.html` (code chết):** `settings.js`, `mapme-poi.js`, `map-style.js`. Hiện màn Settings chỉ có nút "Đổi mật khẩu" và một thẻ "Sắp ra mắt". Hai file `data/mapme-pois.geojson` và `*.geojson` (Hoàng Sa, Trường Sa, Biển Đông) có thể đang được `map.js`/`playback.js` dùng; builder cần kiểm tra.

**Lưu ý hành vi quan trọng — vòng đời module thực tế:**
- `dashboard.js`, `driver.js`, `playback.js` tự init ở `DOMContentLoaded`, tức **trước khi đăng nhập**.
- Sau khi đăng nhập, `showApp` init LiveView, Events, Map, EventServer, Vehicle (có cờ `isInitialized` nên chỉ init một lần), và gọi `PlaybackModule.init()` **mỗi lần** đăng nhập (không có cờ chặn).
- Đăng xuất chỉ chuyển view, không reload trang. Timer và polling của các module đã init **tiếp tục chạy**, lần đăng nhập sau không init lại (trừ Playback).
- Đổi màn hình chỉ ẩn/hiện section (`display:none`), không hủy trạng thái.

Bản React phải tái hiện **đúng vòng đời này**, kể cả những điểm trông như bug (gọi API trước khi đăng nhập, polling chạy tiếp sau khi đăng xuất, Playback init lặp). Lý do: người dùng yêu cầu logic chạy chính xác như hiện tại và sẽ refactor sau. Mỗi điểm như vậy phải ghi vào `MIGRATION_NOTES.md`.

**Thư viện qua CDN:** Leaflet 1.9.4, hls.js (`@latest`), ECharts 5.5.0, Flatpickr (+ locale `vn`), Font Awesome 6.4.0, font Inter.

**Backend:** cổng 4000. Ở `NODE_ENV=development` CORS cho phép localhost/IP LAN mọi cổng và `credentials: true` (cần cho cookie CSRF). Bản React chạy cổng 5173 gọi trực tiếp được, không cần sửa backend.

## 4. Các quyết định đã chốt

- **Giữ nguyên thư viện lõi** (Leaflet, hls.js, ECharts, Flatpickr), cài qua npm thay vì CDN. *Người dùng chốt.*
- **CSS dùng Tailwind CSS.** *Người dùng chốt.*
- **Kiểm tra bằng cách chạy song song** bản gốc (cổng 3000) và bản React (cổng 5173) trên cùng backend local. Không đụng production. *Người dùng chốt.*
- **Không sửa `frontend/`.** *Người dùng chốt.*

## 5. Kiến trúc và stack (quyết định của Claude)

Nền có sẵn trong `frontend-reactjs/`: React 19, Vite 8, TypeScript 6, React Compiler, ESLint, pnpm.

Bổ sung:
- **Tailwind CSS v4** qua `@tailwindcss/vite`. Design token (màu, radius, bóng) lấy từ các biến CSS trong `styles2.css` và khai báo trong `@theme`.
- **TanStack Router** (code-based route tree), dùng một history adapter tự viết bằng `createHistory` của `@tanstack/history` để giữ đúng URL `#dashboard`, `#login`… (`createHashHistory` mặc định sinh `#/dashboard`). Link và bookmark cũ vẫn hoạt động. *Người dùng chốt.*
- **TanStack Query** cho mọi lời gọi API: đọc dữ liệu và polling dùng `useQuery`/`queryOptions`, thao tác ghi dùng `useMutation`. *Người dùng chốt.* Quy tắc để giữ hành vi:
  - **Một timer của bản gốc ứng với một query.** `queryFn` chạy đúng thân hàm gốc, kể cả khi hàm đó gọi tuần tự nhiều API. Không tách thành nhiều query song song nếu bản gốc chạy tuần tự.
  - `refetchInterval` bằng đúng chu kỳ gốc, `refetchIntervalInBackground: true` (`setInterval` gốc vẫn chạy khi tab trình duyệt bị ẩn).
  - Mặc định toàn cục: `retry: false`, `refetchOnWindowFocus: false`, `refetchOnReconnect: false`.
  - Query key riêng cho từng feature, ví dụ `['dashboard','driverMapping']` và `['liveview','driverMapping']`, để không gộp những lời gọi trùng lặp mà bản gốc đang có.
  - Cờ `enabled` tái hiện thời điểm init gốc (§3).
  - Phần không phải lấy dữ liệu (keepalive iframe, đồng hồ 1 giây, animation, điều khiển Leaflet/ECharts/hls) vẫn dùng timer hoặc effect như bản gốc.
- **Zustand** cho trạng thái đăng nhập và trạng thái dùng chung giữa các tính năng (ví dụ liveview gọi focus xe trên bản đồ).
- **React Hook Form + Zod** cho các form (login, đổi/quên mật khẩu, tài xế, phương tiện). Quy tắc validate chép đúng từ bản gốc.
- **Font Awesome** giữ nguyên bộ icon (gói `@fortawesome/fontawesome-free` qua npm) để không phải đổi tên icon.
- **socket.io-client** chỉ dùng nếu bản gốc thật sự dùng socket. Builder kiểm tra `event-server.js`; nếu chỉ có polling thì không thêm.

**Tầng API:** `src/shared/api/client.ts` chép nguyên logic `ApiModule`: hàm tính `BASE_URL`, `buildQueryString`, CSRF cache/refresh, gắn `jsession`, `credentials: 'include'`, cách parse lỗi. Mỗi tính năng có `api.ts` gọi qua client này. Kiểu dữ liệu TypeScript suy ra từ cách bản gốc dùng response; chưa chắc thì để `unknown` hoặc kiểu nới lỏng kèm `// TODO(type)`, không đoán.

**Giữ đúng vòng đời module (xem §3):**
- Màn login và mọi section luôn được mount, ẩn/hiện bằng `hidden` (giống `display:none` gốc). Component của route trong TanStack Router chỉ là `null`; router dùng để xác định route đang active và chạy guard (`beforeLoad` → `redirect`).
- Thời điểm bắt đầu polling được điều khiển bằng `enabled`:
  - Dashboard, Driver, Playback chạy ngay khi app tải;
  - các module còn lại chạy theo cờ `hasShownApp` trong auth store. Cờ này bật ở lần vào app đầu tiên và **không** tắt khi đăng xuất.
- Đăng xuất không dừng query. `playbackInit()` có guard và được gọi lại mỗi lần vào app, đúng như bản gốc. Sự kiện "đổi màn hình" (resize Leaflet/ECharts, `PlaybackModule.handleResize` sau 300ms và 800ms) được tái hiện qua một effect lắng nghe route đang active.

**Giao tiếp chéo module** (`window.MapModule.focusOnVehicle`…) thay bằng store Zustand hoặc ref API đăng ký vào store. Không gắn gì lên `window`.

**Event `auth-success` / `auth-logout`** thay bằng action trong auth store; hành vi phía sau (dọn CSRF, hủy timer, chuyển `#login` kèm lý do) giữ nguyên.

## 6. Cấu trúc thư mục

```
frontend-reactjs/
  public/                    # images/, img/markers/, *.geojson, data/ — chép nguyên từ frontend/
  src/
    app/                     # main.tsx, router.tsx, providers.tsx (QueryClient...), AppLayout, Sidebar
    shared/
      api/                   # client.ts (BASE_URL, CSRF, fetchApi), types chung
      auth/                  # store, token storage, jwt, inactivity timer
      ui/                    # Button, Modal, Toast, Table... (Tailwind)
      hooks/                 # useInterval, useLeafletMap, useEcharts, useHls, useFlatpickr
      lib/                   # sanitize, format ngày/giờ, hằng số
    features/
      auth/                  # LoginPage, ChangePassword/Forgot/Reset modals
      dashboard/
      liveview/
      playback/
      statistics/            # events.js
      map/
      driver/
      vehicle/
      event-server/          # toast cảnh báo AI chạy nền
      settings/
        (mỗi feature: api.ts, hooks/, components/, <Feature>Page.tsx, types.ts)
    styles/index.css         # @import "tailwindcss"; @theme; CSS riêng cho Leaflet/Flatpickr nếu cần
  docs/specs/            # tài liệu thiết kế này và kế hoạch
  MIGRATION_NOTES.md         # bug giữ nguyên, sai lệch đã biết, ánh xạ file gốc → file mới
```

## 7. Thứ tự thực hiện và cách kiểm chứng

Thứ tự (mỗi bước chạy được và đối chiếu được trước khi qua bước sau):
1. Nền: Tailwind, router, providers, tầng API, assets.
2. Auth + layout/sidebar + modal đăng xuất + các modal mật khẩu.
3. Dashboard. 4. Vehicle. 5. Driver. 6. Map. 7. Liveview. 8. Playback. 9. Statistics. 10. Event-server (toast nền). 11. Settings.

Kiểm chứng mỗi màn:
- Chạy `pnpm dev:backend`, bản gốc ở cổng 3000, bản React ở cổng 5173.
- Thực hiện cùng thao tác trên cả hai, so tab Network: cùng URL, query, method, body, thứ tự gọi và chu kỳ polling. So thêm trạng thái UI và nội dung storage.
- `pnpm build` và `pnpm lint` không lỗi.
- Ghi mọi sai lệch đã biết vào `MIGRATION_NOTES.md`.

**Lưu ý phiên đăng nhập:** hai bản chạy khác cổng, tức khác origin, nên storage không dùng chung. Mỗi bản phải đăng nhập riêng. Đây là hành vi đúng, không phải lỗi.

**Thế nào là "khớp" (quyết định của Claude):**
- *Bắt buộc khớp:* endpoint, method, query/body, header (`X-CSRF-Token`, `credentials`), chu kỳ polling, thứ tự các lời gọi trong cùng một thao tác, nội dung storage, trạng thái UI sau mỗi thao tác.
- *Chấp nhận, ghi chú vào `MIGRATION_NOTES.md`:*
  - lời gọi bị nhân đôi do StrictMode ở chế độ dev. Khi đối chiếu, dùng bản build (`pnpm build && pnpm preview`) để loại yếu tố này;
  - lệch vài trăm ms về thời điểm.
- *Không được làm mất lời gọi trùng lặp của bản gốc* (ví dụ Playback init lặp, `driver/mapping` gọi lại ở nhiều màn). Vì vậy không để TanStack Query gộp request ở những chỗ đó: dùng key riêng hoặc gọi trực tiếp.
- `auth.js` gọi `fetch("/api/reset-password-request")` theo đường dẫn tương đối, tức trúng static server. Bản React giữ nguyên đường dẫn tương đối này. Vite dev/preview phải được cấu hình để `/api/*` **không** rơi vào SPA fallback (trả 404 như `http-server`), để nhánh xử lý lỗi chạy giống bản gốc.

**Phần không kiểm tra được ở local:** xem §9.

## 8. Để lại cho người thực hiện quyết định

- Cách chia component chi tiết trong từng tính năng.
- Chọn Query hay `useInterval` cho từng luồng polling cụ thể, miễn là trung thực.
- Cách chuyển CSS gốc sang Tailwind. Với vùng phức tạp (popup Leaflet, Flatpickr theme, timeline playback) được phép giữ CSS thuần trong file riêng.
- Phiên bản cụ thể của các gói: dùng bản ổn định mới nhất tại thời điểm cài, ghim `hls.js` ở major hiện tại thay vì `@latest`.

**Triển khai về sau (quyết định của Claude):** build phải chạy được ở đường dẫn gốc `/` của domain hiện tại (Vite `base: '/'`) và giữ nguyên toàn bộ nhánh tính `BASE_URL` cho production, để sau này có thể thay bản gốc mà không phải sửa gì. Việc triển khai thực tế nằm ngoài phạm vi bước này.

## 9. Phụ thuộc bên ngoài và mức kiểm chứng

Liveview, Playback và một phần Driver phụ thuộc vào thiết bị thật và dịch vụ ngoài:
- thiết bị và media qua fleetscontrol.com / `fleet-media-proxy`;
- dịch vụ nhận diện khuôn mặt ở cổng 5001;
- bigdatacloud (reverse geocoding), OSRM (dẫn đường), mixkit (âm thanh cảnh báo).

**Người dùng chốt:** đối chiếu dựa trên source code hiện có. Với các màn phụ thuộc thiết bị hoặc dịch vụ ngoài, kiểm chứng bằng cách so luồng code từng hàm: file gốc ↔ file mới, cùng lời gọi, cùng nhánh xử lý, cùng timer. Ghi bảng ánh xạ vào `MIGRATION_NOTES.md`. Những gì chạy được ở local (đăng nhập, dashboard, CRUD tài xế/phương tiện, thống kê, bản đồ khi có dữ liệu) vẫn đối chiếu chạy thật nếu backend local khởi động được. Nếu không khởi động được thì cũng chỉ so theo code.
