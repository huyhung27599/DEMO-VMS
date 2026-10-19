# Kế hoạch triển khai: Chuyển `frontend` sang `frontend-reactjs`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng bản React + Tailwind trong `frontend-reactjs/` có hành vi giống hệt `frontend/` (cùng lời gọi API, timer, storage, điều hướng), giao diện tương đương.

**Architecture:**
- Mọi màn hình (login và 9 section) được mount một lần khi app tải, rồi ẩn/hiện bằng `hidden`, đúng như `display:none` của bản gốc.
- TanStack Router (code-based, hash history tự viết để giữ URL `#dashboard`) quyết định section nào đang active và chạy guard đăng nhập. Component của route là `null`.
- Mọi lời gọi API đi qua TanStack Query. **Mỗi timer của bản gốc ứng với một query**, và `queryFn` chạy đúng thân hàm gốc.
- Thời điểm "init" của từng module gốc được tái hiện bằng cờ `enabled`.
- Leaflet, ECharts, hls.js và Flatpickr được điều khiển bởi **controller** TypeScript, nhận element qua ref.

**Tech Stack:** React 19, Vite 8, TypeScript 6, React Compiler (đã có sẵn); `@tanstack/react-router`, `@tanstack/history`, `@tanstack/react-query`, `@tanstack/react-query-devtools`; Tailwind CSS v4 (`@tailwindcss/vite`), Zustand, React Hook Form + Zod; Leaflet, hls.js, ECharts 5, Flatpickr, `@fortawesome/fontawesome-free`; Vitest + jsdom + Testing Library.

**Spec:** [`frontend-reactjs/docs/specs/2026-10-19-frontend-reactjs-migration-design.md`](../specs/2026-10-19-frontend-reactjs-migration-design.md)

## Global Constraints

- Chỉ được tạo, sửa hoặc xóa file **bên trong `frontend-reactjs/`**. Không đụng `frontend/`, `backend/`, file ở gốc repo, hay production.
- Giữ nguyên thư viện lõi: Leaflet 1.9.x, hls.js (ghim major hiện tại, không dùng `latest`), ECharts 5.x, Flatpickr (+ locale `vn`).
- Giữ nguyên **từng ký tự** của key và định dạng giá trị storage:
  - `dashcam_auth_token`, `dashcam_auth_user`, `dashcam_auth_remember`, `dashcam_auth_remember_exp`;
  - `drivers_cache`, `vehicles_cache`, `geic_vehicle_icons`;
  - `dashcam_setting_aiToasts`, `dashcam_setting_aiToastSound`.
- Giữ nguyên hằng số thời gian:
  - Đăng xuất do không hoạt động: 1 giờ, hoặc 8 giờ nếu chọn "ghi nhớ". Hạn "ghi nhớ đăng nhập": 30 ngày.
  - Dashboard: làm mới mỗi 120.000 ms, cảnh báo realtime mỗi 60.000 ms.
  - Event-server: polling mỗi 15.000 ms.
  - Map: lấy vị trí mỗi 1.500 ms.
  - Liveview: cảnh báo AI mỗi 15.000 ms, sự kiện AI mỗi 3.000 ms (chỉ khi tab `ai-events` đang active), đồng hồ thời gian lái mỗi 1.000 ms, kiểm tra khuôn mặt mỗi 10.000 ms, khoảng keepalive như `liveview.js`.
- Route hợp lệ: `dashboard, liveview, playback, statistics, map, driver, vehicle, event-server, settings, login`. Mặc định `dashboard`. URL dạng **`#<route>`**, không có `/`. Hash so khớp không phân biệt hoa thường.
- Mặc định của QueryClient: `retry: false`, `refetchOnWindowFocus: false`, `refetchOnReconnect: false`, `refetchIntervalInBackground: true` (đặt ở từng query có polling), `staleTime: 0`.
- Query key luôn bắt đầu bằng tên feature, để không gộp những lời gọi trùng lặp mà bản gốc đang có, ví dụ `driver/mapping` ở dashboard, driver và liveview.
- Mọi chuỗi tiếng Việt hiển thị chép nguyên văn từ bản gốc. Bug của bản gốc giữ nguyên và ghi vào `MIGRATION_NOTES.md`.
- Mỗi task thêm các dòng ánh xạ của mình vào `MIGRATION_NOTES.md`: `file gốc:hàm → file mới:hàm`.
- Lệnh kiểm tra chung: `pnpm test`, `pnpm lint`, `pnpm build` đều chạy trong `frontend-reactjs/` và phải xanh khi kết thúc mỗi task.

## Quy ước TanStack (mọi task feature tuân theo)

```ts
// features/<f>/queries.ts
export const <f>Keys = { all: ['<f>'] as const, /* ... */ }
export const <name>QueryOptions = (args) => queryOptions({
  queryKey: [...<f>Keys.all, '<name>', args],
  queryFn: () => <tên hàm gốc>(args),      // thân hàm gốc, giữ thứ tự gọi API
  refetchInterval: <ms gốc> | false,
  refetchIntervalInBackground: true,
})
// features/<f>/mutations.ts — useXxxMutation() bọc hàm ghi của bản gốc; onSuccess làm đúng việc bản gốc làm sau khi lưu (refresh, đóng modal, toast)
// features/<f>/lib.ts — hàm thuần chuyển nguyên, giữ tên gốc (bỏ tiền tố `_`)
// features/<f>/<x>Controller.ts — chỉ khi có thư viện mệnh lệnh: class nhận HTMLElement, có các method mang tên hàm gốc
// features/<f>/store.ts — Zustand, chỉ cho state UI dùng chung (tab đang mở, modal, xe đang chọn)
```

- **Polling:** `useQuery(xxxQueryOptions(...))` đặt trong component section. Section luôn mount nên polling chạy cả khi section bị ẩn, giống bản gốc.
- **Cờ `enabled`:** `useModuleEnabled(module)` trả `true` theo đúng thời điểm init gốc:
  - `dashboard`, `driver`, `playback`: luôn `true` từ lúc tải trang;
  - `liveview`, `events`, `map`, `event-server`, `vehicle`: `useAuthStore(s => s.hasShownApp)`.
- **Gọi ngầm (fire-and-forget):** chỗ bản gốc gọi một hàm load mà không đợi (ví dụ `refresh()` sau khi lưu), bản mới dùng `queryClient.refetchQueries({ queryKey })`. Không dùng `invalidateQueries`, vì nó không refetch query đang inactive.
- `innerHTML` của bản gốc được viết lại bằng JSX từ dữ liệu query. Chuỗi HTML do API trả về (ví dụ `getLiveVideoHtml`) vẫn xử lý như bản gốc.

## Review Focus

1. **Phiên hết hạn giữa chừng** (HTTP 401 hoặc `result` bằng 5 / `'5'`): đăng xuất kèm thông báo đúng nguyên văn. Nếu đang ở màn login thì đăng xuất im lặng. Action bắt đầu bằng `face/` không bao giờ gây đăng xuất. Test ở Task 1.
2. **Mở lại app khi token JWT đã hết hạn, hoặc hạn "ghi nhớ" đã qua:** storage bị xóa sạch và router thay URL bằng `#login` (`replace`). Test ở Task 3 và Task 4.
3. **Hash rỗng, hash sai, `#/dashboard`, hoặc `#login` khi đã đăng nhập:** về `#dashboard`. Khi chưa đăng nhập, độ dài `history` không tăng. Test ở Task 4.
4. **StrictMode và tab trình duyệt bị ẩn:** polling không bị nhân đôi khi effect chạy hai lần, và vẫn chạy khi `document.visibilityState === 'hidden'`. Test ở Task 4 (helper `expectPolling`) và trong từng task feature.
5. **Đăng xuất rồi đăng nhập lại:** query vẫn polling, không có query trùng. `hasShownApp` giữ `true`. Activity listener được gắn lại. Test ở Task 4.

---

## Cấu trúc file

```
frontend-reactjs/
  vite.config.ts                 # + tailwind, plugin api404, port 5173 strict, vitest config
  vite-plugins/api404.ts
  public/                        # chép từ frontend/: images/, img/markers/, *.geojson, data/
  MIGRATION_NOTES.md
  scripts/check-parity.mjs
  src/
    main.tsx                     # StrictMode > QueryClientProvider > RouterProvider
    styles/index.css             # @import "tailwindcss"; @theme (token từ styles2.css :root)
    test/setup.ts, test/renderWithProviders.tsx, test/expectPolling.ts
    app/
      router.tsx                 # route tree, guard, createAppRouter()
      legacyHashHistory.ts       # createLegacyHashHistory(): RouterHistory — '#dashboard' <-> '/dashboard'
      RootLayout.tsx             # <LoginScreen/> + <AppShell/> + <AiToastStack/>
      AppShell.tsx, Sidebar.tsx, LogoutConfirmModal.tsx
      useActiveSection.ts        # route active (từ router) + side effect của switchSection
      useModuleEnabled.ts
    shared/
      api/client.ts, api/endpoints.ts, api/types.ts
      auth/session.ts, auth/inactivity.ts, auth/authStore.ts
      query/queryClient.ts       # queryClient singleton (dùng được ngoài React)
      map/tiles.ts, map/territorial.ts
      lib/sanitize.ts
      ui/Modal.tsx, ui/Button.tsx
    features/
      auth/  dashboard/  vehicle/  driver/  map/  liveview/  playback/  statistics/  event-server/  settings/
```

---

### Task 0: Nền dự án

**Files:**
- Modify: `frontend-reactjs/package.json`, `vite.config.ts`, `index.html`, `tsconfig.app.json` (thêm `"vitest/globals"` vào `types`)
- Create: `vite-plugins/api404.ts`, `src/styles/index.css`, `src/test/{setup.ts,api404.test.ts}`, `MIGRATION_NOTES.md`
- Delete: `src/App.tsx`, `src/App.css`, `src/index.css`, `src/assets/*`
- Copy (`cp -r`, không `mv`): `frontend/images`, `frontend/img`, `frontend/data`, `frontend/*.geojson` → `frontend-reactjs/public/`

**Interfaces:**
- Produces:
  - lệnh `pnpm dev` (5173), `pnpm preview` (4173), `pnpm test` (`vitest run`);
  - plugin `api404(): Plugin`;
  - token Tailwind: `primary`, `primary-hover`, `danger`, `danger-hover`, `text-main`, `text-muted`, `border`, `sidebar`, `sidebar-text`, `sidebar-hover`, radius `sm|md|lg`, shadow `sm|md|lg`, `glow-primary`, font `Inter`.

- [ ] **Step 1:** `cd frontend-reactjs && git init && git add -A && git commit -m "chore: scaffold ban dau"`. Repo gốc không phải git; chỉ init bên trong thư mục này.
- [ ] **Step 2:** Cài dependency:
  - `pnpm add @tanstack/react-router @tanstack/history @tanstack/react-query zustand react-hook-form zod @hookform/resolvers leaflet hls.js echarts flatpickr @fortawesome/fontawesome-free`
  - `pnpm add -D @tanstack/react-query-devtools @tanstack/router-devtools tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @types/leaflet`
- [ ] **Step 3: Viết test fail** `src/test/api404.test.ts`: tạo server bằng `createServer` của Vite với plugin `api404()`. `GET /api/reset-password-request` phải trả **404**, còn `GET /` trả 200 kèm HTML.
- [ ] **Step 4:** Chạy `pnpm test`. Kỳ vọng: FAIL.
- [ ] **Step 5:** Viết `api404()`: middleware trong `configureServer` và `configurePreviewServer` trả 404 với mọi `req.url` bắt đầu bằng `/api/`. Thêm `tailwindcss()` và `api404()` vào `vite.config.ts`, giữ plugin react và babel React Compiler. Cấu hình `server: { port: 5173, strictPort: true }` và `test: { environment: 'jsdom', globals: true, setupFiles: 'src/test/setup.ts' }`.
- [ ] **Step 6:** Viết `styles/index.css` dùng `@theme` với giá trị lấy từ `:root` của `frontend/css/styles2.css`. Import CSS của Leaflet, Flatpickr (`flatpickr.min.css` + `themes/light.css`) và Font Awesome. Thêm font Inter vào `index.html`, `<title>Dashcam Admin Platform</title>`.
- [ ] **Step 7:** Chạy `pnpm test && pnpm lint && pnpm build`. Kỳ vọng: PASS.
- [ ] **Step 8: Commit** `chore: tailwind, tanstack, vitest, asset, plugin api404`.

### Task 1: API client

**Files:** Create `src/shared/api/client.ts`, `src/shared/api/types.ts`, `src/shared/api/client.test.ts`

**Interfaces:**
- Produces:
  - `resolveBaseUrl(loc: { hostname: string; protocol: string }): string`
  - `BASE_URL: string`
  - `buildQueryString(params?: Record<string, unknown>): string`
  - `fetchCsrfToken(): Promise<string>`, `ensureCsrfToken()`, `refreshCsrfToken()`
  - `clearSecurityContext(): void`
  - `getSecurityContext()`: chữ ký giống `api.js`
  - `fetchApi<T = ApiResponse>(action: string, params?: Record<string, unknown>, method?: string): Promise<T>`
  - `registerAuthBridge(b: { isAtLogin(): boolean; logout(reason?: string): void }): void`
  - `type ApiResponse = { result: number | string; msg?: string; [k: string]: unknown }`
- `fetchApi` **không bao giờ ném lỗi**; bản gốc trả `{result:99,…}`. Vì vậy query có `retry: false` sẽ luôn ở trạng thái `success` với `result` khác 0, đúng như bản gốc xử lý. Token đọc thẳng từ storage (session trước, rồi local) mà không kiểm tra hạn, giống `getStoredToken()` gốc.

- [ ] **Step 1: Viết test fail.** Mỗi trường hợp một `it`, `fetch` được mock:
  - `resolveBaseUrl({hostname:'localhost',protocol:'http:'})` → `'http://localhost:4000/api/'`
  - `resolveBaseUrl` với `'192.168.1.5'` → `'http://192.168.1.5:4000/api/'`
  - `resolveBaseUrl` với `'dashcam.geicdashcam.cloud'`, `'https:'` → `'https://apidashcam.geicdashcam.cloud/api/'`
  - `resolveBaseUrl` với `'app.example.com'`, `'https:'` → `'https://api.example.com/api/'`
  - `buildQueryString({a:1,b:'',c:null,d:undefined,e:'x y'})` → `'?a=1&e=x%20y'`; `buildQueryString({})` → `''`
  - GET: URL có `jsession=<token>` và `_t=<Date.now()>`; header `X-CSRF-Token`, `Authorization: Bearer <token>`; `credentials:'include'`, `cache:'no-store'`.
  - POST: body là `JSON.stringify(params)` (có `jsession`), không có `_t`.
  - CSRF chỉ được fetch một lần cho hai lời gọi liên tiếp.
  - Phản hồi 403: lấy CSRF mới rồi gửi lại **đúng một lần** với header mới.
  - 401 với action `'vehicle/x'`: trả `{result:5,msg:'Session expired or revoked.'}`, sau `setTimeout 0` thì gọi `logout('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.')`. Nếu `isAtLogin()` là true thì gọi `logout()` không tham số.
  - 401 với action `'face/health'`: trả `{result:401,...}` và **không** gọi logout.
  - 200 với `{result:'5'}`: trả `{result:5,msg:'Session expired on upstream server.'}` và logout với `'Phiên làm việc trên máy chủ đã hết hạn. Vui lòng đăng nhập lại.'`.
  - 500 → `{result:99,msg:'HTTP Error 500'}`; fetch ném lỗi → `{result:99,msg:'Fetch exception: <message>'}`.
- [ ] **Step 2:** Chạy `pnpm test client`. Kỳ vọng: FAIL.
- [ ] **Step 3:** Viết `client.ts` chuyển từ `frontend/js/api.js:1-175`.
- [ ] **Step 4:** Chạy `pnpm test client`. Kỳ vọng: PASS.
- [ ] **Step 5: Commit** `feat(api): client fetchApi + CSRF`.

### Task 2: Endpoints

**Files:** Create `src/shared/api/endpoints.ts`, `src/shared/api/endpoints.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: `export const api` có **đúng** tập key của `return {}` tại `frontend/js/api.js:606` (`BASE_URL`, `login`, `logout`, `changePassword`, … `uninstallDevice`) cùng các hàm CSRF. Chữ ký giống hệt bản gốc; kiểu suy từ cách dùng, chưa chắc thì `unknown` kèm `// TODO(type)`.

- [ ] **Step 1: Viết test fail:**
  - `Object.keys(api).sort()` bằng danh sách key chép cứng từ `api.js:606`;
  - `it.each` cho mọi hàm: `action`, `method` và `params` truyền vào `fetchApi` (đã mock) đúng như thân hàm trong `api.js`;
  - hàm gọi `fetch` trực tiếp hoặc upload `FormData`: kiểm tra URL, method và body.
- [ ] **Step 2:** Chạy `pnpm test endpoints`. Kỳ vọng: FAIL. **Step 3:** Viết `endpoints.ts` từ `api.js:175-605`. **Step 4:** Chạy lại. Kỳ vọng: PASS.
- [ ] **Step 5: Commit** `feat(api): endpoints`.

### Task 3: Phiên đăng nhập, tự đăng xuất khi không hoạt động, auth store

**Files:** Create `src/shared/auth/{session,inactivity,authStore}.ts`, `src/shared/lib/sanitize.ts`, `src/shared/query/queryClient.ts`, cùng file `*.test.ts` tương ứng.

**Interfaces:**
- Consumes: `api.login`, `api.logout`, `refreshCsrfToken`, `clearSecurityContext`, `registerAuthBridge`.
- Produces:
  - `session.ts`: `TOKEN_KEY`, `USER_NAME_KEY`, `REMEMBER_ME_KEY`, `REMEMBER_EXP_KEY`, `parseJwt(t): Record<string, unknown> | null`, `isTokenExpired(t)`, `hasPersistentSession()`, `getToken()`, `getStoredUsername()`, `clearAuthStorage()`, `saveAuthSession(token, username, rememberMe)`, `isAuthenticated()`, `getUsername()`.
  - `inactivity.ts`: `setupActivityListeners()`, `resetActivityTimer()`, `teardownActivityListeners()` (gọi `authActions.logout(...)` khi hết thời gian).
  - `authStore.ts`:
    - `useAuthStore` với state `{ view: 'login' | 'app'; username: string; logoutReason: string; hasShownApp: boolean }`;
    - `authActions.login(username, password, rememberMe): Promise<{ ok: true } | { ok: false; error: string }>`;
    - `authActions.logout(reason?: string): Promise<void>`;
    - `authActions.showApp(username)`, `authActions.showLogin(reason)`.
    - Khi module được import, gọi `registerAuthBridge({ isAtLogin: () => useAuthStore.getState().view === 'login', logout: authActions.logout })`.
  - `queryClient.ts`: `export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false, staleTime: 0 }, mutations: { retry: false } } })`.
  - `sanitizeHTML(str: string): string`.

- [ ] **Step 1: Viết test fail** (jsdom storage, fake timers, `vi.setSystemTime`):
  - `saveAuthSession('t','u',true)` → localStorage có `dashcam_auth_token='t'`, `dashcam_auth_user='u'`, `dashcam_auth_remember='1'`, `dashcam_auth_remember_exp` = `now + 2592000000`.
  - `saveAuthSession('t','u',false)` → ghi vào sessionStorage, localStorage không có `dashcam_auth_remember`.
  - `getToken()` khi `remember_exp` đã qua → `null` và cả 6 key bị xóa khỏi hai storage.
  - `getToken()` với JWT có `exp` < now → `null` và storage bị xóa. Token không phải JWT → trả nguyên token.
  - `resetActivityTimer` sau 3.600.000 ms (không ghi nhớ) → `logout('Phiên đăng nhập hết thời gian. Vui lòng đăng nhập lại.')`. Có ghi nhớ thì sau 28.800.000 ms.
  - `authActions.login('', 'x', false)` → `{ok:false,error:'Vui lòng nhập tài khoản và mật khẩu.'}`, không gọi API.
  - `authActions.login` thành công (`{result:0,jsession:'j',account_name:'A'}`):
    - thứ tự gọi `refreshCsrfToken` → `api.login`;
    - lưu session;
    - `view === 'app'`, `hasShownApp === true`, activity timer được gắn.
  - `authActions.login` thất bại với `{result:1,msg:'Sai'}` → `error 'Sai'`. Không có `msg` → `'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.'`.
  - `authActions.logout('lý do')`:
    - gọi `api.logout` chỉ khi đang đăng nhập;
    - sau đó xóa storage, gọi `clearSecurityContext`;
    - `view === 'login'`, `logoutReason === 'lý do'`, **`hasShownApp` vẫn true**;
    - `queryClient` **không** bị clear.
  - `sanitizeHTML('<b>&')` → kết quả giống hệt `auth.js:123`.
- [ ] **Step 2:** Chạy `pnpm test auth`. Kỳ vọng: FAIL. **Step 3:** Viết code từ `auth.js:10-160, 451-485` và `main.js:31-130`. **Step 4:** Chạy lại. Kỳ vọng: PASS.
- [ ] **Step 5: Commit** `feat(auth): session, inactivity, store`.

### Task 4: Router, khung ứng dụng và màn đăng nhập

**Files:**
- Create: `src/app/{legacyHashHistory.ts,router.tsx,RootLayout.tsx,AppShell.tsx,Sidebar.tsx,LogoutConfirmModal.tsx,useActiveSection.ts,useModuleEnabled.ts}`
- Create: `src/features/auth/{LoginScreen,ChangePasswordModal,ForgotPasswordModal,ResetRequestModal}.tsx`, `src/features/auth/{schemas,mutations}.ts`
- Create: `src/features/settings/SettingsSection.tsx`, `src/shared/ui/{Modal,Button}.tsx`
- Create: `src/test/{renderWithProviders.tsx,expectPolling.ts}`, `src/app/*.test.ts(x)`
- Modify: `src/main.tsx`
- Tạo `features/<f>/<F>Section.tsx` placeholder cho 8 feature còn lại, và `features/playback/init.ts` export `playbackInit(): void` rỗng. Các task sau sẽ thay bằng code thật.

**Interfaces:**
- Consumes: Task 3.
- Produces:
  - `createLegacyHashHistory(win?: Window): RouterHistory`, dựng bằng `createHistory` của `@tanstack/history`:
    - `getLocation` đọc `'#dashboard'` thành pathname `'/dashboard'`; hash rỗng thành `'/'`;
    - `pushState(path)` ghi `'#' + path.slice(1)`;
    - `replaceState` dùng `history.replaceState` với cùng dạng URL;
    - lắng nghe `hashchange` / `popstate` để `notify`.
    - Trước khi viết, đọc mã nguồn `createHashHistory` trong `node_modules/@tanstack/history` và làm theo y hệt, chỉ khác phần định dạng hash.
  - `createAppRouter(opts?: { history?: RouterHistory }): Router`. Route tree:
    - `rootRoute` có `component: RootLayout`;
    - một route con cho mỗi route hợp lệ (`/dashboard`, … `/settings`, `/login`) với `component: () => null`;
    - `/` và `notFoundComponent` chuyển sang `/dashboard`;
    - path không phân biệt hoa thường (`caseSensitive: false`);
    - `beforeLoad` của các route app: nếu `!isAuthenticated()` thì `throw redirect({ to: '/login', replace: true })`;
    - `beforeLoad` của `/login`: nếu đã đăng nhập thì `redirect({ to: '/dashboard' })`.
  - `declare module '@tanstack/react-router' { interface Register { router: ReturnType<typeof createAppRouter> } }`.
  - `useActiveSection(): AppRoute | 'login'` lấy từ `useRouterState`. Đồng thời chạy side effect của `switchSection` (`main.js:139-185`): cập nhật nav `active` / `aria-current`, và gọi các callback đăng ký qua `onSectionShown(id, cb)` (cũng export từ file này) mà map, playback, statistics sẽ dùng.
  - `useModuleEnabled(m: 'dashboard' | 'driver' | 'playback' | 'liveview' | 'events' | 'map' | 'event-server' | 'vehicle'): boolean`.
  - `RootLayout`:
    - render `<LoginScreen hidden={view !== 'login'}/>`, `<AppShell hidden={view !== 'app'}/>`, `<Outlet/>`;
    - lúc mount, chạy `checkAuthState` một lần (có guard module-level vì StrictMode). Nếu đã đăng nhập thì `authActions.showApp`, đồng thời `setupActivityListeners()` và `resetActivityTimer()`;
    - lắng nghe `view` để `navigate` (`/login` với `replace` khi đăng xuất, `/dashboard` sau đăng nhập), đúng như `main.js:39-130`;
    - mỗi lần `showApp`: `queryClient.refetchQueries({ queryKey: ['dashboard'] })` (tương đương `loadDashboardData`), và gọi `playbackInit()` (Task 12).
  - `AppShell` render mọi `<XSection hidden={active !== id}/>`.
  - `test/renderWithProviders(ui, { route?: string })`: QueryClient mới với cùng default, router dùng `createMemoryHistory`.
  - `test/expectPolling(queryFnMock, ms)`: tiến fake timer `ms` ba lần, kiểm tra số lần gọi tăng đúng 1 mỗi lần, kể cả khi đặt `document.visibilityState='hidden'`.

- [ ] **Step 1: Viết test fail:**
  - `legacyHashHistory.test.ts`:
    - `location.hash='#Driver'` → `history.location.pathname==='/Driver'`;
    - `history.push('/vehicle')` → `location.hash==='#vehicle'` và `history.length` tăng 1;
    - `history.replace('/login')` → `location.hash==='#login'` và `history.length` không đổi.
  - `router.test.tsx`:
    - chưa đăng nhập, hash `#vehicle` → sau khi load, hash là `#login` và `history.length` không đổi;
    - đã đăng nhập, `''` / `'#xyz'` / `'#/dashboard'` / `'#login'` → `#dashboard`;
    - `'#DRIVER'` → section driver hiển thị.
  - `AppShell.test.tsx`:
    - `#vehicle` → chỉ section vehicle không có `hidden`, các section khác vẫn nằm trong DOM;
    - nav item vehicle có `aria-current="page"`;
    - chuyển sang `map` thì gọi callback `onSectionShown('map')`.
  - `lifecycle.test.tsx`:
    - đăng nhập → đăng xuất → đăng nhập: `hasShownApp` luôn true;
    - một query giả dùng `enabled: useModuleEnabled('vehicle')` và `refetchInterval: 1000`: chưa chạy trước lần đăng nhập đầu, vẫn chạy sau khi đăng xuất, không bị nhân đôi khi render trong `<StrictMode>` (dùng `expectPolling`).
  - `LoginScreen.test.tsx`:
    - submit rỗng → hiện `'Vui lòng nhập tài khoản và mật khẩu.'`;
    - khi mutation đang chạy, nút bị disable với nhãn `'Đang xác thực…'`;
    - khi lỗi, nút trở về `'ĐĂNG NHẬP'` và ô mật khẩu bị xóa;
    - `logoutReason` hiển thị đúng như `main.js:99-130`.
  - Các modal đổi, quên, reset mật khẩu (dùng `useMutation`): mỗi modal một test cho lời gọi API, gồm cả `fetch('/api/reset-password-request', …)` theo đường dẫn tương đối, và một test cho chuỗi thông báo thành công/lỗi. Giá trị lấy từ `auth.js:216-450`.
  - Modal xác nhận đăng xuất: "Có" → `authActions.logout()`, "Không" hoặc click overlay → đóng (`main.js:205-252`).
- [ ] **Step 2:** Chạy `pnpm test app auth`. Kỳ vọng: FAIL.
- [ ] **Step 3:** Viết code. Markup sidebar, login và các modal chép từ `index.html:1-640` rồi chuyển sang Tailwind. Section Settings chỉ có thẻ "Đổi mật khẩu" (mở `ChangePasswordModal`) và thẻ "Sắp ra mắt" bị disable (`index.html:1294-1331`). Sidebar `mouseenter`, `mouseleave` và `transitionend(width)` gọi `onSectionShown` của `map` sau 220 ms, đúng như `main.js:85-97`. Mount Router/Query devtools chỉ khi `import.meta.env.DEV`.
- [ ] **Step 4:** Chạy `pnpm test && pnpm lint && pnpm build`. Kỳ vọng: PASS.
- [ ] **Step 5: Kiểm tra tay** (nếu backend local chạy được): đăng nhập, đăng xuất, "ghi nhớ", đổi mật khẩu trên cả cổng 3000 và 5173. So tab Network và Storage, ghi sai lệch vào `MIGRATION_NOTES.md`.
- [ ] **Step 6: Commit** `feat(app): router, shell, auth UI`.

### Task 5: Dashboard

**Files:** `src/features/dashboard/{queries,lib,chartsController}.ts`, `components/*`, `DashboardSection.tsx`, `*.test.ts(x)` — nguồn: `frontend/js/dashboard.js`, `index.html:636-845`, CSS dashboard trong `styles2.css`.

**Interfaces:**
- Produces:
  - `dashboardKeys`;
  - `dashboardRefreshQueryOptions()`: `queryFn` = `refresh` gốc (`dashboard.js:678-692`, giữ thứ tự `loadDriverMapping`, `loadVehicleStatus`, … `loadMileage`), `refetchInterval: 120_000`;
  - `realtimeAlarmsQueryOptions()`: `queryFn` = `pollRealtimeAlarms`, `refetchInterval: 60_000`;
  - `DashboardChartsController` với các method `initCharts(els)`, `updateStatusChart`, `updateOnlineTrend`, `updateAlarmDistChart`, `updateAlarmRankChart`, `updateMileageRankChart`, `resize()`, `dispose()`.
  - `enabled: useModuleEnabled('dashboard')`, luôn true, đúng như `DOMContentLoaded`.

- [ ] **Step 1: Viết test fail:**
  - `lib.test.ts`: `today()`, `todayDatetime()`, `normalizeId()`, `formatTime()`, `getStatusBadge()`, mỗi hàm 2–3 ca, kỳ vọng suy từ `dashboard.js:24-95`;
  - `queries.test.ts`:
    - `queryFn` của refresh gọi các API theo đúng thứ tự gốc;
    - `loadDriverMapping` gọi `fetch(BASE_URL + 'driver/mapping')`;
    - `expectPolling` cho 120.000 và 60.000 ms khi render `DashboardSection` **chưa đăng nhập**.
- [ ] **Step 2:** Chạy `pnpm test dashboard`. Kỳ vọng: FAIL.
- [ ] **Step 3:** Viết code. Option ECharts chép nguyên. `renderVehicleTable` và `renderAlarmFeed` viết lại thành JSX.
- [ ] **Step 4:** Chạy `pnpm test dashboard && pnpm build`. Kỳ vọng: PASS.
- [ ] **Step 5:** Ghi ánh xạ, đối chiếu Network. **Step 6: Commit** `feat(dashboard)`.

### Task 6: Phương tiện

**Files:** `src/features/vehicle/{queries,mutations,lib}.ts`, `components/*`, `VehicleSection.tsx` — nguồn: `frontend/js/vehicle.js`, `index.html:1405-1497` và `vehicle-modal`, `css/vehicle.css`.

**Interfaces:**
- Produces:
  - `vehiclesQueryOptions()` (`loadVehicles`), `companiesQueryOptions()` (`loadCompanies`), cả hai `enabled: useModuleEnabled('vehicle')`;
  - `useSaveVehicleMutation()` (thêm hoặc sửa theo `handleSave`), `useDeleteVehicleMutation()` (`confirmDelete`). `onSuccess` gọi `refetchQueries(['vehicle'])` như `refresh()` gốc.

- [ ] **Step 1: Viết test fail:**
  - `extractDevId`, `getVehicleTypeLabel`, `getVehicleTypeClass`: mỗi hàm một bảng ca, kỳ vọng từ `vehicle.js:340-369`;
  - ô tìm kiếm debounce đúng số ms gốc;
  - save ở chế độ thêm gọi `api.addVehicle`, chế độ sửa gọi `api.editVehicle`, payload đúng như `vehicle.js:267-305`;
  - xóa gọi `api.deleteVehicle` rồi refetch.
- [ ] **Step 2–4:** FAIL → viết code (form dùng React Hook Form + Zod theo `handleSave`) → PASS, `pnpm build`.
- [ ] **Step 5:** Ghi ánh xạ, đối chiếu CRUD. **Step 6: Commit** `feat(vehicle)`.

### Task 7: Tài xế, phần dữ liệu và logic nhận diện khuôn mặt

**Files:** `src/features/driver/{lib,faceEvents}.ts`, `src/features/driver/__fixtures__/*`, `*.test.ts` — nguồn: `frontend/js/driver.js:41-905`.

**Interfaces:**
- Produces:
  - `lib.ts`: các hàm thuần, giữ nguyên tên: `formatDateForInput`, `extractDevIdFromVehicle`, `extractDevIdFromAny`, `normalizeUnixSeconds`, `toDisplayableImageUrl`, `escapeHtml`, `toAbsoluteFleetUrl`, `firstPathFromField`, `nestedMediaUrl`, `shallowScanImageField`, `apiResultOk`, `pickIdentifyAlarmRows`, `pickEvidenceRows`, `parseEvidenceTimeToSt`, `evidenceItemToFaceEvent`, `dedupeIdentifyRows`, `extractSimilarityPct`, `pickRegisteredFaceUrl`, `pickCaptureFaceUrl`, `extractJobNumFromEvent`, `localRegisteredPhotoFromMapping`, `eventImageScore`, `dedupeFaceEventsMerged`, `formatIdentifyEventTime`, `mapLocalFaceLogToEvent`, `identifyAlarmTypeLabel`, `parseFacePhotoUrlToSlots`, `formatDateMsToDateInput`, `parseDateInputToUtcMs`.
  - `faceEvents.ts` (async, không phụ thuộc React, dùng làm `queryFn` ở Task 8): `loadDriverMapping`, `buildVehicleMap` (đọc/ghi `vehicles_cache`), `resolveDeviceForDriver`, `findAllDevicesForDriver`, `enrichMissingFaceImagesFromPeers`, `enrichIdentifyRowPlate`, `fetchIdentifyAlarmsMerged`, `checkFaceServiceHealth`.

- [ ] **Step 1: Viết test fail.** Chép `../ai_events_raw_data_sample.json` và `../ai_events_raw_output_actual.json` vào `__fixtures__/` (chỉ đọc file gốc):
  - `fetchIdentifyAlarmsMerged` (mock api) trả đúng nội dung output fixture, nếu fixture đó đúng là output của luồng này. Nếu không phải thì ghi chú lại và dùng kỳ vọng suy từ code.
  - Mỗi hàm thuần có ít nhất một ca thường và một ca thiếu field hoặc `null`.
  - `buildVehicleMap` ghi `vehicles_cache` đúng định dạng gốc.
- [ ] **Step 2:** Chạy test. Kỳ vọng: FAIL. **Step 3:** Viết code. **Step 4:** Chạy test. Kỳ vọng: PASS.
- [ ] **Step 5: Commit** `feat(driver): lib + face events`.

### Task 8: Tài xế, phần giao diện

**Files:** `src/features/driver/{queries,mutations,store,datePickerController}.ts`, `components/*`, `DriverSection.tsx` — nguồn: `driver.js:906-2092`, `index.html:1347-1404, 440-530, 1498-1590`, `css/driver.css`.

**Interfaces:**
- Consumes: Task 7.
- Produces:
  - `driversQueryOptions()`: `queryFn` = `loadDrivers` gốc. Dùng `initialData` đọc từ `drivers_cache` và `initialDataUpdatedAt: 0`, để vừa hiện dữ liệu cache ngay vừa fetch luôn như bản gốc. Sau khi fetch thì ghi lại `drivers_cache`.
  - `faceEventsQueryOptions()` (`loadFaceEvents`), `faceHealthQueryOptions()`.
  - Mutation: `useSaveDriverMutation()` (chuỗi `saveDriver` / `registerLocalDriver` / upload ảnh), `useDeleteDriverMutation()` (`deleteDriver` + `deleteLocalDriver`).
  - Tất cả `enabled: useModuleEnabled('driver')`, luôn true, đúng như `driver.js:6`.
  - `DatePickerController` bọc Flatpickr với `locale: Vietnamese` và option giống `driver.js:1189, 1532`.

- [ ] **Step 1: Viết test fail:**
  - section render ra dữ liệu từ `drivers_cache` trước khi API trả về, sau đó cập nhật và ghi lại cache;
  - lưu tài xế gọi API đúng thứ tự `driver.js:1775-1950`;
  - xóa gọi hai API rồi refetch;
  - chuyển tab `.dtab-btn` đổi nội dung;
  - Flatpickr được khởi tạo với đúng option.
- [ ] **Step 2–4:** FAIL → viết code (lưới ảnh chân dung, lightbox, modal) → PASS, `pnpm build`.
- [ ] **Step 5:** Ghi ánh xạ. Phần dùng dịch vụ khuôn mặt đối chiếu theo code. **Step 6: Commit** `feat(driver): ui`.

### Task 9: Bản đồ

**Files:** `src/features/map/{queries,lib,mapController,store}.ts`, `MapSection.tsx`, `src/shared/map/{tiles,territorial}.ts` — nguồn: `frontend/js/map.js`.

**Interfaces:**
- Produces:
  - `addTerritorialOverlays(map: L.Map): void` (fetch `hoangsa.geojson`, `truongsa.geojson`, `biendong.geojson` theo đường dẫn tương đối);
  - `addTileLayerWithFallback(map: L.Map): L.TileLayer`;
  - `vehiclePositionsQueryOptions()`: `queryFn` = `_fetchOnce`, `refetchInterval: 1500`, `enabled: useModuleEnabled('map') && trackingActive`;
  - `mapController` (singleton, vì liveview và map dùng chung) với các method đúng key `return {}` ở `map.js:629`: `attach({ main, liveView }: { main?: HTMLElement; liveView?: HTMLElement })`, `updateMapMarkers(data)`, `focusOnVehicle(deviceId)`, `focusOnLocation(lat, lng)`, `handleResize()`, `centerMapOnAllMarkers()`, `toggleIconSettings()`, `saveIcon()`;
  - `useMapStore`: `{ followTarget: string | null; trackingActive: boolean; iconSettingsOpen: boolean }`;
  - `onSectionShown('map' | 'liveview', mapController.handleResize)`.

- [ ] **Step 1: Viết test fail:**
  - `lerp`, `ease`, `darkenColor`, `lightenColor`, `getTrackingIconSvg`: bảng ca;
  - `getCustomIcon` / `setCustomIcon` đọc và ghi `geic_vehicle_icons` đúng định dạng;
  - `expectPolling(_fetchOnce, 1500)` sau đăng nhập; mỗi lần có dữ liệu mới thì gọi `updateMapMarkers` (mock Leaflet bằng `vi.mock('leaflet')`);
  - `dragstart` tắt follow.
- [ ] **Step 2–4:** FAIL → viết code → PASS, `pnpm build`.
- [ ] **Step 5:** Ghi ánh xạ. **Step 6: Commit** `feat(map)`.

### Task 10: Liveview, phần luồng video và danh sách xe

**Files:** `src/features/liveview/{queries,lib,streamController,store}.ts`, `components/{VehicleList,StreamWall,UnifiedPlayer,CompanyDropdown}.tsx`, `LiveviewSection.tsx` — nguồn: `liveview.js:1-300, 985-1200, 1670-1861`, `index.html:846-957`.

**Interfaces:**
- Consumes: `mapController.focusOnVehicle`, `focusOnLocation`, `handleResize`.
- Produces:
  - `liveviewVehiclesQueryOptions()` (`loadVehicleDropdown`), `liveviewDriverMappingQueryOptions()` (key `['liveview','driverMapping']`), cả hai `enabled: useModuleEnabled('liveview')`;
  - `streamController`: `startKeepalive(deviceId, iframe)`, `stopKeepalive()`, `reloadActiveIframe()`, `playHlsStream(video: HTMLVideoElement, url: string): Promise<void>`, `resolveUnifiedPlayerUrl(...)`;
  - `lib.ts`: `extractUrlFromLiveHtmlResponse(html: string)`, `pickFirst`, `normalizeDriverInfo`;
  - `useLiveviewStore`: `{ selectedDeviceIds: string[]; leftTab: 'camera' | 'map'; rightTab: 'map-view' | 'ai-events' | ... }`.

- [ ] **Step 1: Viết test fail:**
  - `extractUrlFromLiveHtmlResponse`: ít nhất 3 mẫu HTML ứng với các nhánh regex;
  - `pickFirst`, `normalizeDriverInfo`: bảng ca;
  - `startKeepalive` dùng interval đúng khoảng gốc, gọi lại thì dừng timer cũ;
  - `playHlsStream`: khi `Hls.isSupported()` là false thì dùng `video.src`; nhánh `Hls.Events.ERROR` xử lý như gốc;
  - chuyển sang `map-view` thì gọi `mapController.handleResize` sau timeout như `liveview.js:271-275`.
- [ ] **Step 2–4:** FAIL → viết code → PASS, `pnpm build`.
- [ ] **Step 5:** Ghi ánh xạ (đối chiếu theo code). **Step 6: Commit** `feat(liveview): streams`.

### Task 11: Liveview, phần cảnh báo AI, sự kiện AI và thông tin tài xế

**Files:** `src/features/liveview/{aiQueries,driverInfo}.ts`, `components/{AiAlertsDropdown,AiEventsPanel,DriverInfoCard,AiEventModal}.tsx` — nguồn: `liveview.js:300-985, 1200-1670`.

**Interfaces:**
- Consumes: Task 10, `api.*`.
- Produces:
  - `aiAlertsQueryOptions()`: `queryFn` = `pollAiAlerts`, `refetchInterval: 15_000`;
  - `aiEventsQueryOptions()`: `queryFn` = `loadApiAiEvents(true)`, `refetchInterval: 3_000`, `enabled: liveviewEnabled && rightTab === 'ai-events'`. Lần tải đầu (không silent) chạy như `liveview.js` khi mở tab;
  - `driverInfoQueryOptions(deviceId)`: `queryFn` = phần làm mới của `loadDriverInfoForWall`, `refetchInterval: 10_000`. Dùng trong `DriverInfoCard`, nên tự dừng khi card unmount (tương đương `!document.body.contains(contentEl)`);
  - `useDrivingDuration(deviceId)`: tick 1.000 ms bằng `setInterval` trong effect;
  - `lib`: `getDurationString`, `formatDriverName`, `extractDriverCode`, `buildDriverInfoFromListRow`.

- [ ] **Step 1: Viết test fail** (fake timers):
  - `expectPolling` cho cảnh báo AI (15.000 ms);
  - sự kiện AI chỉ polling 3.000 ms khi `rightTab === 'ai-events'` và dừng khi đổi tab;
  - card thông tin tài xế polling 10.000 ms và ngừng sau khi unmount;
  - đồng hồ thời gian lái tăng mỗi giây;
  - thumbnail tải trễ `idx * 250` ms;
  - các hàm `lib`: bảng ca.
- [ ] **Step 2–4:** FAIL → viết code → PASS, `pnpm build`.
- [ ] **Step 5:** Ghi ánh xạ. Ghi chú sai lệch thời điểm: interval gốc chạy liên tục và kiểm tra tab ở mỗi tick, còn query bắt đầu đếm lại khi tab được bật. **Step 6: Commit** `feat(liveview): ai + driver info`.

### Task 12: Playback, phần tìm kiếm và video

**Files:** `src/features/playback/{queries,mutations,videoController,store,init}.ts`, `components/{SearchForm,VideoPanel,ChannelTabs,RightPanel}.tsx`, `PlaybackSection.tsx` — nguồn: `playback.js:1-1195`, `index.html:958-1091`.

**Interfaces:**
- Produces:
  - `playbackInit(): void` có guard `_isInitialized` y như `playback.js:402-412`. Hàm đặt giờ bắt đầu và kết thúc bằng `localDt(now)` / `localDt(now, true)` vào store, rồi bật `vehicleDropdownEnabled` (tương đương `loadVehicleDropdown()`). Được gọi từ `RootLayout` mỗi lần `showApp` và một lần `once` khi đăng nhập thành công (`playback.js:1954-1956`).
  - `playbackVehiclesQueryOptions()`: `enabled` theo `vehicleDropdownEnabled`.
  - `useSearchPlaybackMutation()`: `mutationFn` = `onSearch` gốc. Tìm kiếm do người dùng bấm nên dùng mutation, giữ thứ tự `playback.js:496-557`.
  - `videoController`: `showUnifiedPlaybackPlayer`, `loadVideoFiles`, `showPlaybackIframe`, `handleResize()`.
  - `onSectionShown('playback')` gọi `handleResize` sau 300 ms và 800 ms (`main.js:164-166`), thêm một lần sau 220 ms (`playback.js:1957-1959`).

- [ ] **Step 1: Viết test fail:**
  - `localDt`: bảng ca;
  - `onSearch` gọi API đúng thứ tự gốc;
  - probe `fleet-media-proxy` dùng `AbortController` với timeout 8.000 ms và 10.000 ms (`playback.js:381, 775`);
  - `showPlaybackIframe` thử lại sau 800 ms;
  - `playbackInit()` gọi hai lần chỉ bật dropdown một lần;
  - chuyển sang section playback gọi `handleResize` ba lần đúng các mốc 220/300/800 ms.
- [ ] **Step 2–4:** FAIL → viết code → PASS, `pnpm build`.
- [ ] **Step 5:** Ghi ánh xạ. **Step 6: Commit** `feat(playback): video`.

### Task 13: Playback, phần hành trình GPS, bản đồ và timeline

**Files:** `src/features/playback/{track,geocode,trackMapController}.ts`, `components/{TrackMap,Timeline,TrackStats}.tsx` — nguồn: `playback.js:1196-1950`.

**Interfaces:**
- Consumes: `addTerritorialOverlays`, `addTileLayerWithFallback` (Task 9).
- Produces:
  - `useLoadGpsTrackMutation()`: `mutationFn` = `loadGpsTrack`;
  - `fetchAllTrackRows(...): Promise<{ rows; mayHaveMore }>`;
  - `reverseGeocodeCached(lat, lng)`: cache bằng `queryClient.fetchQuery` với key `['playback','geocode',lat,lng]` và `staleTime: Infinity`;
  - `enrichTimelinePlaces(...)`, `getOsrmMatchedRoute(...)`, `computeStats(rows)`;
  - `trackMapController`: `initMap(el)`, `renderTrackOnMap`, `clearTrack`, `fitMapTrack`, `startTrackAnimation`, `stopTrackAnimation`, `toggleFullscreen`, `toggleTrackMapFullscreen`, `handleResize`.

- [ ] **Step 1: Viết test fail:**
  - `fetchAllTrackRows` gom nhiều trang tới điều kiện dừng gốc;
  - `reverseGeocodeCached` không gọi `fetch` lần hai cho cùng tọa độ;
  - `enrichTimelinePlaces` chờ `GEO_REQUEST_DELAY_MS` giữa các request;
  - `computeStats`: bảng ca;
  - bước animation dùng độ trễ `Math.max(30, 150 - speed)`;
  - URL OSRM và bigdatacloud giống hệt gốc.
- [ ] **Step 2–4:** FAIL → viết code → PASS, `pnpm build`.
- [ ] **Step 5:** Ghi ánh xạ. **Step 6: Commit** `feat(playback): track`.

### Task 14: Thống kê

**Files:** `src/features/statistics/{queries,lib,evidence,chartsController}.ts`, `components/*`, `StatisticsSection.tsx` — nguồn: `frontend/js/events.js`, `index.html:1092-1293`, `css/statistics.css`.

**Interfaces:**
- Produces:
  - `statisticsQueryOptions(filters)`: `queryFn` = `loadStatistics`, gồm `fetchSafetyAlarmRange` và `fetchMileageStats` theo đúng thứ tự gốc; `enabled: useModuleEnabled('events')`;
  - `eventEvidenceQueryOptions(event)`: `queryFn` = `fetchEventEvidenceBundle`, chỉ bật khi modal mở;
  - `StatisticsChartsController.resizeCharts()`, gắn với `onSectionShown('statistics')`;
  - `exportCSV(events): string` cùng hàm tải file.

- [ ] **Step 1: Viết test fail:**
  - mỗi hàm thuần trong `events.js:186-547` có bảng ca: `toNum`, `normalizeCoord`, `normalizeSpeed`, `parseGpsStatusSpeed`, `parsePositionString`, `getViolationDisplayName`, `isSbacString`, `parseAlarmCodeFromSbacString`, `parseAlarmCodeValue`, `inferAlarmCodeFromName`, `getAlarmCode`, `getEventTimeSec`, `getApiSeverity`, `normalizeAlarmEvent`, `dedupeAlarmRows`, `needsEvidenceSupplement`, `alarmTypeMatchesFilter`;
  - `fetchMileageStats` trả `{ totalKm, kmPer100 }`;
  - `exportCSV` sinh đúng chuỗi CSV;
  - URL proxy media có dạng `BASE_URL + 'fleet-media-proxy?u=…&jsession=…'`.
- [ ] **Step 2–4:** FAIL → viết code → PASS, `pnpm build`.
- [ ] **Step 5:** Ghi ánh xạ. **Step 6: Commit** `feat(statistics)`.

### Task 15: Event-server (toast cảnh báo chạy nền)

**Files:** `src/features/event-server/{queries,store,sound}.ts`, `components/AiToastStack.tsx` (mount trong `RootLayout`) — nguồn: `frontend/js/event-server.js`.

**Interfaces:**
- Produces:
  - `eventServerAlarmsQueryOptions()`: `queryFn` = `pollAlarms`, `refetchInterval: 15_000`, `enabled: useModuleEnabled('event-server')`. Mỗi kết quả mới gọi `showToast(alarm)` theo đúng logic chọn cảnh báo mới của bản gốc;
  - `useToastStore`, `showToast(alarm)`, `removeToast(id)`.
  - CSS của `injectStyles` được chuyển thành class Tailwind, **không** chèn `<style>`.

- [ ] **Step 1: Viết test fail** (fake timers):
  - `expectPolling(pollAlarms, 15000)` sau đăng nhập;
  - `showToast`:
    - không làm gì khi `dashcam_setting_aiToasts` là `'0'` hoặc `'false'`;
    - phát âm thanh mixkit với volume 0,6 trừ khi `dashcam_setting_aiToastSound` là `'0'` hoặc `'false'`;
    - nhãn lấy theo `SAFETY_ALARM_TYPES`, fallback `'Cảnh báo AI: ' + code`;
    - biển số fallback `'Biển số chưa xác định'`;
  - toast tự gỡ theo thời gian của `removeToast`.
- [ ] **Step 2–4:** FAIL → viết code → PASS, `pnpm build`.
- [ ] **Step 5:** Ghi ánh xạ. **Step 6: Commit** `feat(event-server)`.

### Task 16: Đối chiếu toàn bộ và hoàn tất

**Files:** Create `scripts/check-parity.mjs`; Modify `MIGRATION_NOTES.md`, `README.md`.

- [ ] **Step 1:** `rg -n "TODO\(type\)|\bany\b" src` để rà kiểu dữ liệu. Chỗ nào xác định được kiểu thì thêm, phần còn lại liệt kê trong `MIGRATION_NOTES.md`.
- [ ] **Step 2:** Viết `scripts/check-parity.mjs` (chỉ đọc `../frontend`). Script trích:
  - mọi chuỗi action API, gồm tham số đầu của `fetchApi(` và các literal `fetch(\`${…}xxx\`)`;
  - mọi key `localStorage` / `sessionStorage`;
  - mọi số mili-giây trong `setInterval` / `setTimeout`.

  Sau đó kiểm tra từng giá trị có xuất hiện trong `src/`. Chạy `node scripts/check-parity.mjs`, kỳ vọng in `0 missing`.
- [ ] **Step 3:** `pnpm test && pnpm lint && pnpm build && pnpm preview`. Mở bản gốc (cổng 3000) và bản build (4173) song song nếu backend local chạy được. Đi qua 9 màn, ghi kết quả "đã đối chiếu chạy thật / đối chiếu theo code" vào `MIGRATION_NOTES.md`.
- [ ] **Step 4:** Thêm vào `README.md` cách chạy: `pnpm install`, `pnpm dev` (5173), `pnpm build && pnpm preview`. Ghi rõ backend phải chạy ở 4000 với `NODE_ENV=development`.
- [ ] **Step 5: Commit** `docs: migration notes, parity check`.
