# MIGRATION_NOTES

Ánh xạ `file gốc:hàm → file mới:hàm` và các bug của bản gốc được giữ nguyên.

## Ánh xạ

- `frontend/css/styles2.css:root` → `src/styles/index.css:@theme`
- `frontend/js/api.js:BASE_URL IIFE` → `src/shared/api/client.ts:resolveBaseUrl / BASE_URL`
- `frontend/js/api.js:getStoredToken` → `src/shared/api/client.ts:getStoredToken`
- `frontend/js/api.js:buildQueryString` → `src/shared/api/client.ts:buildQueryString`
- `frontend/js/api.js:fetchCsrfToken` → `src/shared/api/client.ts:fetchCsrfToken`
- `frontend/js/api.js:ensureCsrfToken` → `src/shared/api/client.ts:ensureCsrfToken`
- `frontend/js/api.js:refreshCsrfToken` → `src/shared/api/client.ts:refreshCsrfToken`
- `frontend/js/api.js:clearSecurityContext` → `src/shared/api/client.ts:clearSecurityContext`
- `frontend/js/api.js:fetchApi` → `src/shared/api/client.ts:fetchApi (+ handleSessionExpired, registerAuthBridge replaces AuthModule/#login-container check)`
- `frontend/js/api.js:login … uninstallDevice (all 58 endpoint functions, lines 175-604) + return {}` → `src/shared/api/endpoints.ts:<same names> + api` (api keys == original return block at api.js:606; no `fetch` direct calls exist in the original endpoints, so none ported; `getSecurityContext` intentionally absent)

### Task 4 — router, khung ứng dụng, màn đăng nhập

- `frontend/js/main.js:VALID_ROUTES/APP_ROUTES/DEFAULT_ROUTE/Router.currentRoute` → `src/app/useActiveSection.ts:VALID_ROUTES/APP_ROUTES/DEFAULT_ROUTE/currentRoute`
- `frontend/js/main.js:Router.navigate/Router.init (hashchange)` → `src/app/legacyHashHistory.ts:createLegacyHashHistory` + `src/app/router.tsx:createAppRouter` (beforeLoad: requireAuth/redirectToLogin; guard ở rootRoute cho hash không hợp lệ)
- `frontend/js/main.js:checkAuthState` + `frontend/js/auth.js:init (dòng 486-490)` → `src/app/RootLayout.tsx:RootLayout` (effect một lần cho mỗi router)
- `frontend/js/main.js:showApp (điều hướng, PlaybackModule.init, loadDashboardData)` → `src/app/RootLayout.tsx` (effect khi view → 'app': playbackInit, navigate('/dashboard'), refetchQueries(['dashboard']))
- `frontend/js/main.js:showApp (init LiveView/Events/Map/EventServer/Vehicle khi chưa init)` → `src/app/useModuleEnabled.ts:useModuleEnabled`
- `frontend/js/main.js:showLogin (URL)` → `src/app/RootLayout.tsx` (navigate('/login', replace)); `showLogin (giao diện: lỗi, reset form, nút)` → `src/features/auth/LoginScreen.tsx` (subscribe useAuthStore)
- `frontend/js/main.js:switchSection` → `src/app/useActiveSection.ts:useActiveSection` (+ `onSectionShown`/`notifySectionShown` thay cho MapModule.handleResize, PlaybackModule.handleResize, EventsModule.resizeCharts, SettingsModule.refresh)
- `frontend/js/main.js:sidebar mouseenter/mouseleave/transitionend (triggerMapResize)` → `src/app/Sidebar.tsx:triggerMapResize` (notifySectionShown('map'))
- `frontend/js/main.js:navItems click/keydown` → `src/app/Sidebar.tsx` (button onClick → navigate)
- `frontend/js/main.js:logoutBtn click, hideLogoutConfirm, logout-confirm-yes/no/close, overlay click` → `src/app/Sidebar.tsx` + `src/app/AppShell.tsx` + `src/app/LogoutConfirmModal.tsx`
- `frontend/js/main.js:btnOpenSettingsPassword click` → `src/features/settings/SettingsSection.tsx` → `src/features/auth/store.ts:openChangePasswordModal`
- `frontend/js/main.js:loadDashboardData` → `queryClient.refetchQueries({ queryKey: ['dashboard'] })` trong `src/app/RootLayout.tsx`
- `frontend/js/main.js:AppHelpers.showToast` → `src/shared/ui/toastStore.ts:showToast/removeToast` + `src/shared/ui/ToastContainer.tsx`
- `frontend/js/auth.js:handleLogin (giao diện)` → `src/features/auth/LoginScreen.tsx:handleLogin` (+ `mutations.ts:useLoginMutation`, `schemas.ts:loginSchema`)
- `frontend/js/auth.js:init (toggle hiện/ẩn mật khẩu, khôi phục remember-me)` → `src/features/auth/LoginScreen.tsx`
- `frontend/js/auth.js:setResetModalVisible/clearResetRequestForm/handleResetRequest` → `src/features/auth/ResetRequestModal.tsx` + `mutations.ts:handleResetRequest/useResetRequestMutation` (clear = remount bằng `key`)
- `frontend/js/auth.js:setChangePasswordModalVisible/clearChangePasswordForm/handleChangePasswordAuth` → `src/features/auth/store.ts` + `ChangePasswordModal.tsx` + `mutations.ts:handleChangePasswordAuth/useChangePasswordMutation` + `schemas.ts:changePasswordSchema`
- `frontend/js/auth.js:setForgotModalVisible/clearForgotPasswordForm/handleForgotPasswordSubmit` → `src/features/auth/ForgotPasswordModal.tsx` + `mutations.ts:handleForgotPasswordSubmit/useForgotPasswordMutation` + `schemas.ts:forgotPasswordSchema` (không mount — xem bên dưới)
- `frontend/js/playback.js:1955 (auth-success once → PlaybackModule.init)` → `src/features/auth/LoginScreen.tsx:playbackInitOnFirstLogin`
- `frontend/index.html:55-163` → `src/features/auth/LoginScreen.tsx`; `166-238` → `ResetRequestModal.tsx`; `240-326` → `ChangePasswordModal.tsx`; `326-433` → `src/app/LogoutConfirmModal.tsx`; `558-627` → `src/app/AppShell.tsx` + `Sidebar.tsx`; `1294-1331` → `src/features/settings/SettingsSection.tsx`
- `frontend/css/styles2.css (.btn*, .content-section, .section-header, .toast*, body/h1-h6/scrollbar)` → `src/shared/ui/{Button,Section,ToastContainer}.tsx` + `toast.css` + `src/styles/index.css @layer base`; `statistics.css:.modal-overlay/.modal-content` → `src/shared/ui/Modal.tsx`

## Bug bản gốc giữ nguyên

- `auth.js:260` gọi `ApiModule.getSecurityContext?.()` nhưng `api.js` không có hàm này, nên header X-CSRF-Token gửi đi luôn là `""`. `client.ts` cố ý KHÔNG export `getSecurityContext`; bản port auth phải giữ hành vi gửi `""`.
- `fetchApi` thay đổi object `params` của caller (thêm `jsession`, `_t`) như bản gốc.
- Retry 403 chỉ một lần; nếu `fetchCsrfToken` ném lỗi trong lúc retry thì bị catch thành `result:99` như bản gốc.
- `frontend/js/auth.js:parseJwt/isTokenExpired/hasPersistentSession/getToken/getStoredUsername/clearAuthStorage/saveAuthSession/isAuthenticated/getUsername` → `src/shared/auth/session.ts:<same>`
- `frontend/js/auth.js:sanitizeHTML` → `src/shared/lib/sanitize.ts:sanitizeHTML`
- `frontend/js/auth.js:getInactivityTimeout/resetActivityTimer/setupActivityListeners/teardownActivityListeners` → `src/shared/auth/inactivity.ts:<same>` (timeout callback registered by authStore via registerInactivityHandler)
- `frontend/js/auth.js:handleLogin (logic only)/logout` → `src/shared/auth/authStore.ts:authActions.login/logout`
- `frontend/js/main.js:showApp/showLogin (state only)` → `src/shared/auth/authStore.ts:authActions.showApp/showLogin` (navigation/refetch done by RootLayout)
- `auth.js:teardownActivityListeners` chỉ clear timer, không gỡ listener (giữ nguyên bản gốc).

### Task 4

- `index.html` gốc KHÔNG có `#forgot-password-modal`: `setForgotModalVisible` không làm gì. Link "Quên mật khẩu?" (`#reset-request-link`, cũng có class `.forgot-pwd`) gắn cả hai handler nhưng chỉ `#reset-request-modal` hiện. `ForgotPasswordModal` được port + test nhưng không mount. Nhãn/tiêu đề của modal này do bản port tự đặt (không có markup gốc).
- `showLogin` (main.js:126-130) luôn đặt nhãn nút đăng nhập là `'Đăng nhập'` (chữ thường), còn HTML ban đầu và nhánh lỗi của `handleLogin` dùng `'ĐĂNG NHẬP'`. Khi đăng nhập thành công nút giữ trạng thái disable `'Đang xác thực…'` tới lần showLogin sau. Giữ nguyên.
- `showLogin` khi màn đăng nhập đã hiển thị và `reason` rỗng thì KHÔNG xóa thông báo lỗi cũ; chỉ lần hiển thị đầu (từ app hoặc lúc tải trang) mới reset form (`form.reset()` → bỏ chọn "Ghi nhớ đăng nhập") và đặt lỗi = reason.
- Username ở sidebar: khi đăng nhập bằng form là chuỗi đã `sanitizeHTML` (entity như `&amp;` hiện nguyên văn vì gán bằng textContent); khi tải lại trang là username thô trong storage. Bản port render chuỗi y nguyên như textContent.
- Mở modal đổi mật khẩu từ trang Cài đặt (main.js:214-220) KHÔNG xóa form/thông báo lỗi cũ. Đổi mật khẩu thành công không đóng modal; sau 1500 ms `logout()` chạy và modal (nằm ngoài app-container) vẫn hiện đè lên màn đăng nhập. Giữ nguyên: modal mount ở RootLayout.
- Timer tự đóng 3000 ms của modal yêu cầu khôi phục không bị hủy: mở lại modal trong 3 giây sẽ bị đóng.
- `handleResetRequest` dùng `fetch('/api/reset-password-request')` đường dẫn tương đối (không qua BASE_URL/fetchApi), header `X-CSRF-Token: ""` (Ruling R7).
- `handleForgotPasswordSubmit` không kiểm tra độ mạnh mật khẩu mới (khác modal đổi mật khẩu).
- Route `#event-server` hợp lệ nhưng bản gốc không có `#event-server-section` và không có mục sidebar: vùng nội dung trống. Bản port render placeholder rỗng (Task 15).
- `showApp` gọi `PlaybackModule.init()` mỗi lần, listener `auth-success` `{ once: true }` gọi thêm ở lần đăng nhập đầu; init có guard `_isInitialized` nên vô hại (Ruling R4).

### Task 4 — khác biệt do TanStack Router / a11y (ghi nhận)

- Redirect trong `beforeLoad` của TanStack Router luôn là `replace` (`followRedirect` trong router-core). Khi ĐÃ đăng nhập, hash rỗng / không hợp lệ / `#/dashboard` / `#login` được thay bằng `#dashboard` bằng replace; bản gốc gán `location.hash` (thêm một entry history). Khi chưa đăng nhập hành vi trùng bản gốc (replace `#login`).
- Đã đăng nhập, gõ hash không hợp lệ khi đang dùng app: bản gốc giữ URL và hiện dashboard; bản port đổi URL thành `#dashboard`.
- `#Dashboard` (khác hoa/thường) lúc tải trang: bản gốc đổi thành `#dashboard`; router coi là cùng location nên URL giữ `#Dashboard` (section dashboard vẫn hiện). Route khác (vd. `#DRIVER`) giữ nguyên URL như bản gốc.
- `switchSection` gốc có thể chạy hai lần sau đăng nhập (showApp + hashchange); bản port gọi `onSectionShown` một lần mỗi lần đổi section và hủy timer 150 ms nếu section đổi trước khi timer chạy.
- `legacyHashHistory` ghi `history.pushState/replaceState` đồng bộ (createBrowserHistory gom bằng microtask).
- Sidebar giãn rộng cả khi focus BÀN PHÍM (`:focus-visible`) nằm trong sidebar, ngoài `:hover` như bản gốc (focus do click chuột không giữ sidebar mở — rời chuột là co lại như bản gốc), để nhãn menu và nút "Đăng xuất" nhìn thấy khi dùng bàn phím. Nút ẩn/hiện mật khẩu là `<button aria-label>` thay cho `<svg>` click được. Nút đóng modal có `aria-label="Đóng"`.
- `createQueryClient()` đặt mặc định `refetchIntervalInBackground: true` cho mọi query (setInterval của bản gốc không dừng khi tab bị ẩn); query polling không cần tự đặt cờ này nữa.

### Task 5 — Dashboard

Ánh xạ:

- `frontend/js/dashboard.js:today/todayDatetime/normalizeId/formatTime/getStatusBadge` → `src/features/dashboard/lib.ts:<same>` (`getStatusBadge` trả `{kind,label}` thay cho chuỗi HTML `<span class="veh-status-badge ...">`)
- `frontend/js/dashboard.js:updateLastUpdated` → `lib.ts:lastUpdatedText` + `loaders.ts:updateLastUpdated`
- `frontend/js/dashboard.js:setKpi/setProgress` → `src/features/dashboard/loaders.ts:setKpi/setProgress` (ghi vào `store.ts:useDashboardStore`)
- `frontend/js/dashboard.js:renderVehicleTable/renderAlarmFeed` → `loaders.ts:renderVehicleTable/renderAlarmFeed` (ảnh chụp dữ liệu vào store) + `components/LiveVehiclesPanel.tsx`, `components/AlarmFeed.tsx` (JSX); bảng tra `alarmTypeMap/getSeverity/nameMap` → `lib.ts:ALARM_TYPE_MAP/getSeverity/ALARM_NAME_MAP`
- `frontend/js/dashboard.js:initCharts/updateStatusChart/updateOnlineTrend/updateAlarmDistChart/updateAlarmRankChart/updateMileageRankChart` → `src/features/dashboard/chartsController.ts:DashboardChartsController.<same>`; `resizeAll` → `resize()`; `_onlineTrendData` nằm trong controller
- `frontend/js/dashboard.js:loadDriverMapping/loadVehicleStatus/loadVehicles/loadAlarms/pollRealtimeAlarms/loadMileage/refresh` → `src/features/dashboard/loaders.ts:<same>`; state module `_vehicles/_cachedAlarms/_driverMapping` ở `loaders.ts`
- `frontend/js/dashboard.js:init (setInterval 120_000 / 60_000)` → `src/features/dashboard/queries.ts:dashboardRefreshQueryOptions/realtimeAlarmsQueryOptions` (dùng trong `DashboardSection.tsx`)
- `frontend/js/dashboard.js:init (nút làm mới, refresh-alarm-feed, tìm kiếm, "Xem tất cả")` → `DashboardSection.tsx` / `components/*` (làm mới → `refetchQueries(['dashboard','refresh'])`; nút báo động gọi thẳng `loadAlarms`)
- `frontend/js/dashboard.js:init (nav-item click -> setTimeout 150 resize)` → `DashboardSection.tsx` `onSectionShown('dashboard', resize)` (150 ms nằm trong `useActiveSection`); `window resize` và `.sidebar transitionend` gắn trong `initCharts`
- `frontend/index.html:636-845` → `DashboardSection.tsx` + `components/{KpiCard,ChartCard,LiveVehiclesPanel,AlarmFeed}.tsx`; `styles2.css:2181-2780` → Tailwind + `dashboard.css` (pulse-ring, vòng tròn trang trí KPI)

Bản gốc giữ nguyên / ghi chú:

- Bản gốc KHÔNG gọi API lúc `DOMContentLoaded` khi chưa đăng nhập (chờ `auth-success`), chỉ hai `setInterval` chạy và gọi API không token. Bản port giữ đúng: query có `initialData: null` và `staleTime: Infinity` khi chưa có token nên không fetch lúc mount; `refetchInterval` vẫn chạy. Đã đăng nhập khi tải trang thì fetch ngay (giống `refresh()` ở init) và `RootLayout` refetch thêm (giống `loadDashboardData`).
- `realtimeAlarms` không có lần nạp đầu ở bản gốc, nhưng `RootLayout` `refetchQueries({queryKey:['dashboard']})` khi showApp cũng refetch khóa này: `syncAiEventsLocal` bị gọi thêm một lần khi đăng nhập so với bản gốc (refresh() đã gọi loadAlarms). Chấp nhận (khóa phải bắt đầu bằng `dashboard`).
- `_driverMapping` chỉ được ghi, không được đọc ở đâu. `loadMileage` chạy với `_vehicles` ở thời điểm gọi (khi `loadVehicles` lỗi thì dùng danh sách cũ).
- `renderVehicleTable` của `loadVehicles` hiển thị chưa lọc rồi `loadVehicleStatus` mới áp bộ lọc ô tìm kiếm: giữ nguyên.
- Bản gốc chèn `type`/`plate` của báo động vào `innerHTML` không escape (XSS tiềm ẩn); JSX escape tự động. Biển số bảng xe vốn đã `sanitizeHTML` nên hiển thị như nhau.
- `formatTime` với chuỗi không hợp lệ không ném lỗi nên không bao giờ trả `'--'` (cho ra `NaN/NaN NaN:NaN`): giữ nguyên.
- Test: `echarts` được mock toàn cục trong `src/test/setup.ts` (jsdom không có canvas).

### Task 5 — sửa vòng 1

- Lần nạp đầu của dashboard chạy trực tiếp qua `src/features/dashboard/init.ts:initDashboard` (không qua query): đã đăng nhập khi tải trang -> `refresh()` ngay; chưa đăng nhập -> hook một lần ở lần chuyển sang view `app` đầu tiên (thay cho listener `auth-success` `{once:true}`). Cộng với `refetchQueries(['dashboard','refresh'])` của RootLayout (thay `loadDashboardData`) nên cả hai trường hợp đều chạy `refresh()` hai lần như bản gốc (dashboard.js:747-753 + main.js:253-257). Query có `staleTime: Infinity` nên không tự fetch lúc mount.
- RootLayout chỉ refetch `dashboardKeys.refresh` (không refetch `realtimeAlarms`), tránh gọi thêm `syncAiEventsLocal` lúc đăng nhập.

### Task 6 — Phương tiện

Ánh xạ:

- `frontend/js/vehicle.js:extractDevId/getVehicleTypeLabel/getVehicleTypeClass` → `src/features/vehicle/lib.ts:<same>`
- `vehicle.js:loadVehicles` (chuẩn hóa nm/pid/pnm/dl) → `queries.ts:vehiclesQueryOptions` + `lib.ts:normalizeVehicle`
- `vehicle.js:loadCompanies` → `queries.ts:companiesQueryOptions` + `lib.ts:deriveCompanies`; `populateCompanyDropdown` → `<select>` render từ query (`components/VehicleFormModal.tsx`)
- `vehicle.js:refresh` → `queries.ts:refresh(client)`; `updateTimestamp` → `store.ts:updateTimestamp`
- `vehicle.js:init (isInitialized, hash === '#vehicle') + hashchange` → `VehicleSection.tsx` effect `[enabled(useModuleEnabled('vehicle')), route === 'vehicle']`
- `vehicle.js:renderTable` (lọc ô tìm kiếm, debounce 300 ms) → `lib.ts:filterVehicles` + `components/VehicleTable.tsx`; `showTableLoading` → `isFetching`
- `vehicle.js:openModal/closeModal` → `VehicleSection.tsx:openModal/closeModal` + `components/VehicleFormModal.tsx` (RHF + Zod `schemas.ts`)
- `vehicle.js:handleSave` → `mutations.ts:useSaveVehicleMutation` + `lib.ts:buildSavePayload`
- `vehicle.js:deleteVehicle/closeDeleteModal/confirmDelete` → `VehicleSection.tsx` + `components/DeleteVehicleModal.tsx` + `mutations.ts:useDeleteVehicleMutation`
- `frontend/index.html:1405-1441, 1617-1688`, `css/vehicle.css` → `VehicleSection.tsx`, `components/*` (Tailwind)

Bản gốc giữ nguyên / ghi chú:

- Bản gốc chỉ nạp dữ liệu: lúc `init()` (lần hiển thị app đầu) nếu hash là `#vehicle`, mỗi `hashchange` sang `#vehicle`, và sau lưu/xóa thành công. Không có setInterval, không nạp khi mount. Bản port: query `enabled: false` (chỉ đọc cache), `refresh(client)` dùng `fetchQuery` (gộp lời gọi trùng khi đang nạp, tương đương cờ `isLoading`); effect gọi `refresh` khi `useModuleEnabled('vehicle') && route === 'vehicle'`. `onSuccess` của mutation gọi `refresh()` tuần tự (vehicles rồi companies) thay vì `refetchQueries(['vehicle'])` song song, vì `loadCompanies` suy ra từ danh sách xe.
- Hàm lọc dùng `extractDevId(v)` trả `'--'` khi thiếu thiết bị nên tìm `-` khớp những xe đó: giữ nguyên. `normalizeVehicle` luôn có `devIdno` truthy (`'--'`).
- Sửa xe: form điền `devIdno = extractDevId(v)` nên có thể gửi `'--'` lên API; giữ nguyên. `editVehicle` gọi `editDevice.action` (đã có trong endpoints).
- `<select>` loại xe/đơn vị: giá trị không có trong danh sách thì không chọn gì; FormData bỏ `vehiType` khi không có lựa chọn (`buildSavePayload`), `companyId` luôn gửi (có mục rỗng).
- Bản gốc `onclick="...('${plate}')"` không escape biển số (hỏng/XSS khi có dấu nháy); JSX escape tự động. Nút sửa/xóa với biển số rỗng: sửa mở modal ở chế độ thêm, xóa mở modal nhưng "Xóa xe" không làm gì (như `!state.currentEditId`).
- Validate chỉ có hai trường bắt buộc (không trim) và hiện bằng toast cảnh báo, không có lỗi theo trường. Trường `<input hidden name=vehiIdno>` trùng tên với ô biển số nên giá trị cuối (ô biển số) thắng: bỏ phần tử ẩn.

### Task 7 — tài xế: lib + faceEvents

- `frontend/js/driver.js:formatDateForInput, extractDevIdFromVehicle, extractDevIdFromAny, normalizeUnixSeconds, toDisplayableImageUrl, escapeHtml, toAbsoluteFleetUrl, firstPathFromField, nestedMediaUrl, shallowScanImageField, apiResultOk, pickIdentifyAlarmRows, pickEvidenceRows, parseEvidenceTimeToSt, evidenceItemToFaceEvent, dedupeIdentifyRows, extractSimilarityPct, pickRegisteredFaceUrl, pickCaptureFaceUrl, extractJobNumFromEvent, localRegisteredPhotoFromMapping, eventImageScore, dedupeFaceEventsMerged, formatIdentifyEventTime, mapLocalFaceLogToEvent, identifyAlarmTypeLabel, parseFacePhotoUrlToSlots, formatDateMsToDateInput, parseDateInputToUtcMs, getStoredJwt` + hằng `FLEET_MEDIA_BASE/FACE_EVIDENCE_ALARM_TYPES/EVIDENCE_MEDIA_TYPE/AI_ALARM_TYPE_LABELS/MAX_DRIVER_PHOTOS` → `src/features/driver/lib.ts:<same>` (`parseFacePhotoUrlToSlots`, `formatDateMsToDateInput`, `parseDateInputToUtcMs` nằm ngoài dòng 41-905, ở dòng 1691-1793)
- `frontend/js/driver.js:loadDriverMapping, buildVehicleMap, resolveDeviceForDriver, findAllDevicesForDriver, enrichMissingFaceImagesFromPeers, enrichIdentifyRowPlate, fetchIdentifyAlarmsMerged, checkFaceServiceHealth` → `src/features/driver/faceEvents.ts:<same>`
- Closure state (`vehicleMap, driverDeviceMap, driverMapping, isLoadingDriverMapping, faceServiceOk`) → `faceEvents.ts:faceState` (+ `resetFaceState`). `getApi()` → `api` dùng trực tiếp; `getStoredJwt` đọc thô sessionStorage rồi localStorage như bản gốc (không qua `getToken`, nên không kiểm tra hạn token).
- `localRegisteredPhotoFromMapping(evt, baseUrl, driverMapping = {})`: thêm tham số thứ ba thay cho closure `driverMapping`.
- `checkFaceServiceHealth` bản gốc ghi thẳng vào `#face-service-status`/`#face-db-count`; bản port trả `{ ok, statusText, dbText }` (chuỗi y nguyên, không kèm icon/màu) và cập nhật `faceState.faceServiceOk`. Chuỗi spinner xuất ra là `FACE_HEALTH_CHECKING_TEXT`. UI do Task 8 render.
- `driver.js:updateTimestamp`, `pushFaceAlert` (dòng 41-44, 114-159) chưa port: chạm DOM (`#driver-last-update`, `#ai-alert-list`, `#ai-badge`, event `ai-face-alert`) và không được logic faceEvents gọi; để Task 8.
- Fixture: `ai_events_raw_data_sample.json` là mẫu thô của safety alarm / identify alarm / evidence (dùng làm input mock). `ai_events_raw_output_actual.json` là phản hồi thô `{result, pagination, infos[]}` của API ảnh evidence (performanceReport...), KHÔNG phải output của `fetchIdentifyAlarmsMerged`; test dùng kỳ vọng suy từ code.
- Hành vi gốc giữ nguyên: `buildVehicleMap` luôn gọi `queryUserVehicle` bằng `api` chung (không dùng tham số `a`), nên `fetchIdentifyAlarmsMerged` gọi `queryUserVehicle` hai lần; `enrichIdentifyRowPlate` và bước gán `devIdno` thay đổi trực tiếp object hàng nhận vào; `loadDriverMapping` dùng `fetch` trần, không gửi JWT/CSRF.

### Task 8 — tài xế: giao diện

Ánh xạ:

- `frontend/js/driver.js:updateTimestamp` → `src/features/driver/store.ts:updateTimestamp`; closure `driversData/isLoadingDrivers` + innerHTML của `#driver-grid`, `#face-service-status`, `#face-events-summary`, `#face-events-grid` → `store.ts:useDriverStore` (`gridView`, `faceHealth`, `faceSummary`, `faceGrid`)
- `driver.js:loadDrivers` → `queries.ts:loadDrivers` (phần mạng: `queries.ts:driversQueryOptions`, gọi qua `queryClient.fetchQuery`)
- `driver.js:renderDrivers` → `store.ts:renderDrivers` + `components/DriverGrid.tsx` (+ `lib.ts:driverAvatarUrls`, `nextLocalAvatarSrc`)
- `driver.js:showDeleteDriverConfirm` → `store.ts:showDeleteDriverConfirm/answerDeleteDriverConfirm` + `components/DeleteDriverModal.tsx`; handler `.btn-driver-delete` → `DriverSection.tsx:onDelete` + `mutations.ts:deleteDriver/useDeleteDriverMutation`
- `driver.js:openFaceImageLightbox` → `store.ts:openFaceImageLightbox` + `components/FaceImageLightbox.tsx` (portal vào body)
- `driver.js:checkFaceServiceHealth` (phần DOM) → `queries.ts:faceHealthQueryOptions/showFaceServiceHealth` + `components/FaceServiceBanner.tsx`
- `driver.js:loadFaceEvents` → `queries.ts:faceEventsQueryOptions/loadFaceEvents`; `renderFaceEvents` → `components/FaceEventsTab.tsx` + `components/FaceEventCard.tsx`; `classifyFaceEvent` → `lib.ts:classifyFaceEvent`; phần geo → `lib.ts:faceEventGeoParts`
- `driver.js` Flatpickr (fpConfig, 1518-1542) + `toApiDateTime` → `datePickerController.ts:DatePickerController/FP_CONFIG`
- Tab switching, `#driver-search-input` → `DriverSection.tsx:onTabClick/onSearchInput` (+ `lib.ts:filterDrivers`); `#face-sync-btn` → `FaceServiceBanner.tsx:onSync`
- Auto-init: MutationObserver → `init.ts:onDriverSectionVisibility` (effect `visible` của `DriverSection.tsx`); listener click `.nav-item[data-target=driver]` (+50 ms) → `init.ts:onDriverNavClick` qua `src/app/useActiveSection.ts:onNavItemClick` (Sidebar gọi `notifyNavItemClick` ở mọi lần click, kể cả cùng route); setTimeout 200 → `init.ts:initDriver`
- `parseFacePhotoUrlToSlots/syncCurrentBase64FromPortraitSlots/updateTopPortraitPreview/renderPortraitGrid`, `#driver-photo-upload`, `#driver-portrait-slot-file`, click `#driver-portraitLibrary`, `openDriverModal/closeDriverModal` → `components/DriverFormModal.tsx` + `components/PortraitGrid.tsx` (+ `lib.ts:portraitServerDisplayUrl`), `store.ts:openDriverModal/closeDriverModal`
- Handler `#btn-save-driver` → `mutations.ts:buildSaveDriverInput` (validate, payload) + `saveDriver/useSaveDriverMutation`
- `window.appOpenDriverModal` → `store.ts:appOpenDriverModal` (không gắn lên `window`, không ai khác dùng)
- `driver.js:pushFaceAlert` → `faceAlert.ts:pushFaceAlert`
- `frontend/index.html:1347-1403, 438-555, 1450-1588`, `css/driver.css`, `.header-filter-select/.driver-modal-input` (styles2.css:3762-3801), tùy chỉnh Flatpickr (index.html:31-48) → `DriverSection.tsx`, `components/*` (Tailwind) + `driver.css`

Bản gốc giữ nguyên / ghi chú:

- Thời điểm nạp: bản gốc không nạp gì lúc tải trang ngoài Flatpickr. Ba đường kích hoạt được tái tạo riêng: (1) section hiển thị (đổi route sang driver, hoặc hiện lại app khi đang ở #driver — thay MutationObserver): chỉ chạy `buildVehicleMap + checkFaceServiceHealth + loadDrivers` khi `driversData` rỗng và không đang nạp, ngoài ra không làm gì (đăng nhập lại / đổi hash bằng tay khi đã có dữ liệu: 0 lần health); (2) click nav driver, kể cả khi đang ở #driver: sau 50 ms chạy đủ bộ nếu rỗng và không đang nạp, ngược lại nếu có dữ liệu thì `renderDrivers + checkFaceServiceHealth`; (3) kiểm tra một lần 200 ms sau khi init, nếu section đang hiển thị. Lần click nav đầu tiên: observer nạp ngay, bộ hẹn 50 ms thấy đang nạp nên bỏ qua — nếu nạp xong trước 50 ms thì chạy thêm render + health, đúng như race của bản gốc. Không có setInterval.
- `driversQueryOptions` có `initialData` = `drivers_cache`, `initialDataUpdatedAt: 0` theo brief, nhưng không dùng với `useQuery` (sẽ tự fetch lúc mount khi chưa có cache, bản gốc không làm). `loadDrivers()` đọc lại `drivers_cache` mỗi lần chạy (như bản gốc, kể cả sau khi sửa), hiện ngay, rồi `fetchQuery` (dữ liệu cache luôn "cũ" nên luôn gọi API) và ghi lại cache khi thành công. Cache không phải mảng: bỏ qua (bản gốc ném lỗi trong `renderDrivers` rồi bị catch).
- Lỗi API thay cả lưới bằng thông báo (`Lỗi: …` / `Lỗi kết nối API: …`) dù đang hiện cache; `driversData` vẫn là cache nên không tự nạp lại.
- Xóa tài xế: brief ghi "rồi refetch", nhưng bản gốc KHÔNG gọi lại API: chỉ lọc `driversData`, ghi `drivers_cache`, render lại. Bản port theo code gốc. Thứ tự: `queryUserVehicle` (findAllDevicesForDriver) → `bindDriver(devId, 0, '')` cho từng xe + chờ 1,5 s (nếu có xe gán) → `deleteDriver(id, jn)` → `deleteLocalDriver(jn, name)`. `id`/`jn` là chuỗi nội suy từ data-attribute (`'undefined'` nếu thiếu).
- Sau khi xóa/thêm, lưới hiện toàn bộ `driversData` dù ô tìm kiếm còn chữ (bản gốc không áp lại bộ lọc). Bộ lọc `(d.jn || '').toLowerCase()` ném lỗi nếu `jn` là số: giữ nguyên.
- Thêm mới: chèn tài xế dựng từ form lên đầu danh sách (id lấy từ phản hồi hoặc `_tmp_<ms>`), không nạp lại. Sửa: `loadDrivers()` (fire-and-forget). `mergeDriver` trả `res` null -> `res.msg` ném TypeError -> toast "Lỗi sự cố khi lưu: …" như bản gốc.
- `currentBase64Photos` được suy ra từ các ô ảnh khi render. Bản gốc đặt `currentBase64Photos = []` ngay khi chọn file rồi mới đọc base64 (vài ms); nếu bấm Lưu trong khoảng đó bản gốc gửi không ảnh, bản port gửi ảnh cũ của các ô — bỏ qua.
- Modal thêm/sửa: tiêu đề đặt bằng `textContent` nên mất icon `fa-user-plus` của markup — giữ (không icon). Modal không đóng khi click nền/Esc (bản gốc không có). Form mount lại mỗi lần mở (thay `form.reset()`).
- Modal xác nhận xóa: Có / Hủy / nút X / click nền / Esc như bản gốc.
- Nút `#driver-refresh-btn` không tồn tại trong index.html nên handler "Làm mới" (faceReloadDatabase + health + loadFaceEvents) của bản gốc là code chết: không port. Nút `#face-reload-db-mini` có trong markup nhưng không có handler: render nút không làm gì.
- `#face-sync-btn`: sau lần đồng bộ đầu chữ đổi thành "Đồng bộ ảnh tài xế" (khác chữ ban đầu "Đồng bộ & Cập nhật AI"). Không try/catch: API reject thì nút kẹt ở "Đang đồng bộ...". Giữ nguyên.
- Sự kiện khuôn mặt chỉ nạp khi bấm "Tìm kiếm" (không nạp khi đổi tab). `fetchQuery` gộp hai lần bấm trùng khoảng thời gian khi lần đầu chưa xong (bản gốc chạy hai lần); tương tự `faceHealthQueryOptions` gộp lời gọi health đồng thời.
- `classifyFaceEvent` với nguồn localDb đọc `evt.match`, nhưng `mapLocalFaceLogToEvent` chỉ gán `faceMatch` → nhánh match/mismatch của localDb không bao giờ chạy (luôn "❓ Không xác định" hoặc "✅ Khớp tài xế" theo tên). `badge/badgeClass`, `srcLabel`, `localCount/upstreamCount/totalRecognitionCount` được tính nhưng không hiển thị. Giữ nguyên.
- URL ảnh nhật ký cục bộ: `${BASE_URL}face/capture/…`; khi BASE_URL là đường dẫn tương đối, `firstPathFromField` ghép thành `https://fleetscontrol.com/api/face/capture/…` (hành vi gốc).
- R13: tên tài xế / SĐT / mã NV trong thẻ, `dn` trong sự kiện… bản gốc chèn bằng innerHTML (một số không escape), bản port render qua JSX (escape). `escapeHtml` trong `src`/`data-image` của bản gốc chỉ là escape thuộc tính (trình duyệt giải mã lại) nên JSX dùng URL thô là tương đương.
- `pushFaceAlert` không được gọi ở đâu trong bản gốc (code chết). Bản port giữ phần tạo alert + `window.dispatchEvent('ai-face-alert')`; phần chèn trực tiếp `<li>` vào `#ai-alert-list` và tăng `#ai-badge` của liveview không port (liveview chưa có; nếu cần thì lắng nghe event).
- Flatpickr khởi tạo trong effect của tab sự kiện (mount lúc tải trang, như DOMContentLoaded); `now`/`startDay` tính lúc đó. `DatePickerController.toApiDateTime` dùng instance Flatpickr, fallback như bản gốc khi không có instance.
- Các nút xóa: bản gốc render lại cả lưới sau khi xóa thành công (reset trạng thái spinner của các nút khác đang xóa); bản port chỉ bỏ trạng thái của thẻ vừa xóa.

### Task 9 — bản đồ

Ánh xạ:

- `frontend/js/map.js:addTerritorialOverlays` → `src/shared/map/territorial.ts:addTerritorialOverlays` (+ CSS nhãn `styles2.css:3624-3718` → `src/shared/map/map.css`)
- `map.js:_addTileLayerWithFallback` + `CUSTOM_TILE_URL/FALLBACK_TILE_URL/*_ATTR` → `src/shared/map/tiles.ts:addTileLayerWithFallback` (trả về lớp tile riêng)
- `map.js` `<style>` `.custom-nav-icon` chèn vào `<head>` → `src/features/map/map.css`
- `map.js:init` → `src/features/map/mapController.ts:init` (+ `createMap`, `attach`); gọi từ effect của `MapSection.tsx` khi `useModuleEnabled('map')` (main.js:57-59)
- `map.js:_updateFollowBtn` → không port (nút `#map-follow-btn` không có trong index.html); `_disableFollow` → `mapController.ts:disableFollow`
- `map.js:startTracking/stopTracking/_fetchOnce` → `mapController.ts:startTracking/stopTracking/fetchOnce` + `src/features/map/queries.ts:vehiclePositionsQueryOptions` (refetchInterval 1500, `enabled: useModuleEnabled('map') && trackingActive`)
- `map.js:_panToFollowTarget` → `mapController.ts:panToFollowTarget`; `_animateMarker` → `animateMarker`; `updateMapMarkers`, `centerMapOnAllMarkers`, `focusOnVehicle`, `handleResize`, `toggleIconSettings`, `saveIcon` → `mapController.ts:<cùng tên>` (+ object `mapController`)
- `map.js:_lerp/_ease/ANIM_DURATION/_getCustomIcon/_setCustomIcon/getTrackingIconSvg/_darkenColor/_lightenColor` → `src/features/map/lib.ts:lerp/ease/ANIM_DURATION/getCustomIcon/setCustomIcon/getTrackingIconSvg/darkenColor/lightenColor`
- Biến module `followMode/selectedVehicleId/_pollTimer/isInitialized` → phản chiếu ở `src/features/map/store.ts:useMapStore` (`followMode`, `followTarget`, `trackingActive`, `isInitialized`, `iconSettingsOpen`)
- `frontend/index.html:1333-1344` (#map-section) → `src/features/map/MapSection.tsx`; `#liveview-map` (index.html:927-931) + `.map-container/.map-placeholder` (styles2.css:1737-1754, 1205-1211) → `src/features/map/MapContainer.tsx` (đặt tạm trong `LiveviewSection.tsx`, task liveview chuyển vào `#rtab-map-view`)
- `main.js:84-97` (sidebar) và `main.js:160-163` (switchSection map/liveview) gọi `MapModule.handleResize` → `onSectionShown('map' | 'liveview', mapController.handleResize)` trong `MapSection.tsx` (Sidebar gọi `notifySectionShown('map')`)

Bản gốc giữ nguyên / ghi chú:

- Đăng xuất: lần `_fetchOnce` kế tiếp thấy chưa đăng nhập -> `stopTracking()` (xóa interval). Đăng nhập lại KHÔNG chạy lại vì `init()` có guard `isInitialized`: vị trí xe trên cả hai bản đồ đứng yên tới khi tải lại trang. Bản port: `trackingActive = false` mãi mãi -> query tắt. (Khác "Review Focus 5" chung — đây là hành vi riêng của map.js.)
- `#map-follow-btn` không tồn tại: follow mặc định bật, `dragstart` trên một trong hai bản đồ tắt follow vĩnh viễn (không có cách bật lại); `_panToFollowTarget` là code chết.
- `MapModule.focusOnLocation` KHÔNG tồn tại trong bản gốc (liveview.js:802 kiểm tra rồi bỏ qua). `mapController.focusOnLocation(lat, lng)` là hàm rỗng để giữ hành vi đó.
- `addTerritorialOverlays` fetch đường dẫn TUYỆT ĐỐI `'/hoangsa.geojson'`, `'/truongsa.geojson'`, `'/biendong.geojson'` như map.js:18-20 (brief ghi "tương đối" — theo code gốc). Ảnh marker dùng đường dẫn tương đối `img/markers/*.png` như bản gốc. Thuộc tính `color` của từng overlay không được dùng.
- Tile fallback: sau lỗi tile thứ 3, MỖI lỗi tiếp theo của lớp tile riêng lại thêm một lớp CartoDB nữa (không có cờ "đã chuyển").
- `getTrackingIconSvg`: `car`/`truck`/`navigation` luôn trả ảnh PNG, nên SVG sedan/xe tải không bao giờ dùng; mặc định `navigation` -> PNG. `defColor` tính nhưng không dùng (bỏ). `darkenColor/lightenColor` với chuỗi không phải hex trả `NaN` trong chuỗi màu.
- `updateMapMarkers` chỉ vẽ xe online; `focusOnVehicle`/`saveIcon` vẽ lại từ `lastValidStatuses` (chỉ `fetchOnce` cập nhật). Khi đã chọn xe, các xe khác bị gỡ khỏi cả hai bản đồ. Nhãn popup `id="icon-settings-<uid>"` trùng nhau nếu popup cùng xe mở trên cả hai bản đồ — `getElementById` lấy cái đầu, như bản gốc.
- Popup marker vẫn là chuỗi HTML (Leaflet) như bản gốc. `onclick="MapModule.toggleIconSettings('uid')"` / `saveIcon` (cần `window.MapModule`) được thay bằng `data-map-action` + `data-uid` (escape) và một listener `click` (capture) trên container mỗi bản đồ. Biểu tượng bảng màu là `<i>` không focus được bằng bàn phím (như bản gốc).
- Lần gọi tức thì của `startTracking` là lần fetch khi query được bật (sau render kế tiếp, không đồng bộ trong `init`). `refetchInterval` của TanStack không chạy chồng một lần fetch đang dở (setInterval gốc có thể chạy chồng nếu API chậm > 1,5 s).
- Bản gốc xóa `innerHTML` của container rồi tạo bản đồ; bản port để React gỡ `.map-placeholder` khi `isInitialized` (Leaflet gắn vào chính container React render, className giữ cố định).

### Task 10 — liveview (luồng video, danh sách xe, tab)

Ánh xạ:

- `frontend/js/liveview.js:init` → `src/features/liveview/actions.ts:initLiveview` (gọi từ effect của `LiveviewSection.tsx` khi `useModuleEnabled('liveview')`, main.js:51-53)
- `liveview.js:loadDriverMapping` → `src/features/liveview/queries.ts:liveviewDriverMappingQueryOptions` (key `['liveview','driverMapping']`) + `loadDriverMapping` (fetchQuery trên `queryClient`) + `getDriverMapping` (biến `driverMapping` cho Task 11)
- `liveview.js:startKeepalive/stopKeepalive/reloadActiveIframe/KEEPALIVE_INTERVAL_MS` + listener `visibilitychange` (166-171) → `src/features/liveview/streamController.ts:startKeepalive/stopKeepalive/reloadActiveIframe/onVisibilityChange`, `lib.ts:KEEPALIVE_INTERVAL_MS`
- `liveview.js:initRightPanelTabs` (phần tab) → `actions.ts:onRightTabClick` + nút `.right-tab-btn` trong `LiveviewSection.tsx`; phần `#refresh-ai-events` / `#ai-event-search` → Task 11 (`components/AiEventsPanel.tsx` đang là markup tĩnh)
- `liveview.js:initDropdownToggles` → `actions.ts:onDropdownButtonClick/closeDropdown` + `components/SosDropdown.tsx`
- listener `#refresh-liveview` / `#liveview-vehicle-select` / `#company-select-inner` (init 187-219) → `actions.ts:onRefreshClick/onVehicleChange/onCompanyChange`
- `liveview.js:initTabs` → `actions.ts:onLeftTabClick` + `initLiveview` (đặt `leftTab = 'camera'`)
- `liveview.js:initCompanyDropdown` → `actions.ts:initCompanyDropdown` + `components/CompanyDropdown.tsx`
- `liveview.js:loadVehicleDropdown` → `actions.ts:loadVehicleDropdown` (API qua `queries.ts:liveviewVehiclesQueryOptions`) + `components/VehicleList.tsx`
- `liveview.js:renderVehicleStreams` → `actions.ts:renderVehicleStreams` + `components/StreamWall.tsx`
- `liveview.js:renderUnifiedPlayer` → `actions.ts:renderUnifiedPlayer/onTileClick` (DOM: `components/UnifiedPlayer.tsx`; tạo iframe: `streamController.ts:createUnifiedPlayerIframe`)
- `liveview.js:pickFirst/normalizeDriverInfo/extractUrlFromLiveHtmlResponse` → `src/features/liveview/lib.ts:<cùng tên>`
- `liveview.js:resolveUnifiedPlayerUrl/playHlsStream` → `streamController.ts:<cùng tên>`
- biến module `vehiclesCache`, DOM `#video-grid` (+ class `is-unified`), option/giá trị hai select, class `active` của tab/panel → `src/features/liveview/store.ts:useLiveviewStore` (`vehiclesCache`, `grid`, `gridUnified`, `companyOptions/companyValue`, `vehicleOptions/vehicleValue`, `leftTab`, `rightTab`, `openDropdown`)
- Điểm nối Task 11 (đúng chỗ gọi của bản gốc): `startAiAlertPolling` (init), `pollAiAlerts` (sau loadVehicleDropdown thành công), `loadApiAiEvents` (click tab `ai-events`), `loadDriverInfoForWall` (renderUnifiedPlayer), `stopDriverInfoTimers` (cuối stopKeepalive) → `src/features/liveview/task11Hooks.ts` (Task 11 đã thay bằng `aiQueries.ts` / `driverInfo.ts` và xóa file này)
- `index.html:844-957` (#liveview-section) + `styles2.css:693-695, 836-1211, 1529-1630, 1941-1968, 2084, 2127, 3762-3801` + `responsive-desktop.css:141-148` → `LiveviewSection.tsx`, `components/*`, `liveview.css`; `#liveview-map` (MapContainer) chuyển vào `#rtab-map-view`, luôn mount, tab ẩn bằng class `hidden`

Bản gốc giữ nguyên / ghi chú:

- `init()` của bản gốc chỉ đặt `isInitialized = true` ở cuối (sau `await loadDriverMapping()`); bản port chặn tái nhập ngay đầu hàm (StrictMode). Khác biệt chỉ lộ ra nếu showApp chạy hai lần trong lúc fetch mapping. Trước khi init xong, mọi click/change trong section không làm gì (listener chưa gắn), như bản gốc.
- `loadDriverMapping` fetch thẳng `${BASE_URL}driver/mapping` (không header). Không có `useQuery` tự fetch: thời điểm "enabled" chính là lúc init chạy (một lần). Danh sách xe cũng không có `useQuery` mount — chỉ `loadVehicleDropdown()` (đổi nhóm / "Làm mới") gọi `fetchQuery` (staleTime 0). Hai lần gọi chồng nhau trong cùng một RTT bị TanStack gộp làm một (bản gốc gọi hai lần) — chỉ xảy ra khi người dùng thao tác hai lần trước khi API trả về.
- `extractUrlFromLiveHtmlResponse`: kiểm tra `isValidExternalUrl` trên CẢ chuỗi trước khi tìm URL bằng regex, nên một chuỗi HTML có chứa `fleetscontrol.com` / `808gps` / `RealPlayVideo.html` bị trả nguyên văn (không phải URL); `resolveUnifiedPlayerUrl` thấy không bắt đầu bằng `http` nên dùng URL RealPlay dự phòng. Nhánh regex chỉ chạy khi cả chuỗi bị loại (bắt đầu bằng `/`, chứa `localhost`...). Giữ nguyên.
- `playHlsStream` và `normalizeDriverInfo` là code chết trong bản gốc (không ai gọi). `playHlsStream` giữ chữ ký gốc `(deviceId, channel, videoId, vehicleName)` (tìm `#videoId`, `#videoId-loader`, `#videoId-status`) thay vì `(video, url)` ghi trong brief, để giữ cả phần gọi API/fallback. Instance `Hls` không bao giờ `destroy()` (bản gốc khai báo `_activeHlsPlayers` nhưng không dùng).
- `renderVehicleStreams` gọi `AppHelpers.showLoader()`/`hideLoader()` bao quanh phần đồng bộ (renderUnifiedPlayer không được await) → loader không bao giờ kịp hiển thị; không port (không có `#global-loader`).
- Đổi xe khi player trước chưa xong: lời gọi cũ vẫn chạy tiếp, khi xong vẫn `startKeepalive` cho iframe của nó (không nằm trong DOM) và chiếm keepalive của xe mới. Bỏ chọn nhóm quản lý / đổi nội dung grid không dừng keepalive: iframe đã gỡ vẫn được ping và reload. Giữ nguyên.
- Iframe player vẫn được tạo bằng `document.createElement('iframe')` (src, style, allow, referrerPolicy như bản gốc) rồi gắn vào một `<div class="contents">` trong `.video-tile`; "Connecting..." / "Stream Not Available" do React render.
- `≤1024px`: `.liveview-right-panel` luôn `display:flex`, `.liveview-left-panel` không active vẫn hiển thị (block) → tab "Camera / Bản đồ" chỉ đổi trạng thái nút/class, không ẩn panel nào. Click video tile ở `innerWidth <= 1024` chuyển tab sang "Bản đồ" (+ `handleResize`). Giữ nguyên.
- Tab trái "Bản đồ" gọi `handleResize` ngay; tab phải "Bản đồ giám sát" gọi sau `setTimeout(100)`; click lại tab đang active vẫn gọi.
- `.video-wall-hint` chữ trắng 75% trên nền `#eeeeee` (gần như không đọc được) — giữ nguyên màu.
- SOS: chỉ có bật/tắt dropdown; danh sách, badge (`display:none`, "0") và nút "Xóa tất cả" không có JS xử lý → tĩnh. `#ai-alert-list`, `#ai-badge`, `#clear-ai-btn` KHÔNG có trong index.html nên `pollAiAlerts` của bản gốc luôn thoát sớm (Task 11 lưu ý).
- Dropdown nhóm quản lý dựng một lần lúc init với username lúc đó (`|| 'admin'`); đăng nhập lại bằng tài khoản khác vẫn giữ username cũ.
- Tên xe (`sanitizeHTML(nm)` chèn qua innerHTML) và tên/ID thiết bị hiển thị qua JSX — cùng chuỗi hiển thị (R13).
- `useLiveviewStore.leftTab` có thêm giá trị `null` (trước `initTabs`, chưa panel nào `active`; nút Camera vẫn active theo index.html). Brief ghi `selectedDeviceIds`: thay bằng selector `selectSelectedDeviceIds` suy ra từ `grid` (dùng với `useShallow`).
- `.video-tile` là `div` có `onClick` (không focus được bằng bàn phím) như bản gốc; tile chứa iframe nên không đổi thành `<button>`.

### Task 11 — liveview: cảnh báo AI, sự kiện AI, thông tin tài xế

Ánh xạ:

- `liveview.js:SAFETY_ALARM_TYPES/AI_ALERT_CRITICAL_ARM_TYPES/AI_ALERT_CRITICAL_ALARM_IDS/formatDt` → `src/features/liveview/lib.ts:<cùng tên>`
- `liveview.js:formatDriverName/extractDriverCode/getDurationString/buildDriverInfoFromListRow` → `lib.ts:<cùng tên>`
- `liveview.js:getAiAlertListEl/renderAiAlertsDropdown/updateAiAlertBadge/clearAiAlerts/pollAiAlerts` → `src/features/liveview/aiQueries.ts:<cùng tên>`
- `liveview.js:startAiAlertPolling` (setInterval 15 s + gọi ngay) → `aiQueries.ts:startAiAlertPolling` (cờ `alertPollingStarted`) + `aiAlertsQueryOptions` (key `['liveview','aiAlerts']`, `refetchInterval: 15_000`, `useQuery` trong `LiveviewSection.tsx`)
- `liveview.js:startAiEventsPolling` (guard "already running") → `aiQueries.ts:startAiEventsPolling` (cờ `pollingStarted`) + `aiEventsQueryOptions` (key `['liveview','aiEvents']`, `refetchInterval: 3000`, `useQuery` trong `components/AiEventsPanel.tsx`, `enabled: pollingStarted && rightTab === 'ai-events'`)
- `liveview.js:loadApiAiEvents/renderAiEvents (window.renderAiEvents)/loadAiEventThumbnail` → `aiQueries.ts:<cùng tên>` (DOM: `components/AiEventsPanel.tsx`), biến `aiEventsCache/aiAlertsCache/aiAlertsAckTime` → biến module của `aiQueries.ts`; DOM `#ai-events-list` / `#ai-thumb-main-${idx}` / giá trị `#ai-event-search` → `useAiEventsStore` (`list`, `thumbs`, `search`)
- listener `#refresh-ai-events` / `#ai-event-search` (initRightPanelTabs) → `aiQueries.ts:onRefreshAiEventsClick/onAiSearchInput`
- `window.openAiEventModal/navModalImg/closeAiEventModal` + `getModalImageUrl/onEscModal` → `aiQueries.ts:<cùng tên>` + `components/AiEventModal.tsx`
- `liveview.js:loadDriverInfoForWall` (+ closure `refreshDriverCard`) → `src/features/liveview/driverInfo.ts:loadDriverInfoForWall/createRefreshDriverCard`; interval 10 s → `driverInfoQueryOptions(deviceId, token)` (key `['liveview','driverInfo',deviceId,token]`, `useQuery` trong `components/DriverInfoCard.tsx`)
- `liveview.js:renderDriverInfo/findDriverInList/getLatestIdentifyEvent` → `driverInfo.ts:<cùng tên>` (DOM: `components/DriverInfoCard.tsx`, gắn vào `[data-driver-content]` của `UnifiedPlayer.tsx`)
- `liveview.js:startDrivingDurationTicker/stopDrivingDurationTicker` → `driverInfo.ts:<cùng tên>` + `tickDrivingDuration` + hook `useDrivingDuration(deviceId, token)` (setInterval 1 000 ms trong effect)
- biến `_faceCheckPolls/_drivingDurationTimers/_drivingSessions/_lastDriverIsStranger` + phần cuối `stopKeepalive` → `driverInfo.ts` (`useDriverInfoStore.faceCheckPolls/runningPolls/drivingDurationTimers`, biến module `drivingSessions/lastDriverIsStranger`) + `stopDriverInfoTimers`
- `styles2.css:1334-1527` + `responsive-desktop.css:158-160` (.ai-events-*, .ai-event-card, .ai-card-*) → Tailwind trong `components/AiEventsPanel.tsx`

Bản gốc giữ nguyên / ghi chú:

- `#ai-alert-list`, `#ai-badge`, `#clear-ai-btn` không có trong index.html: `pollAiAlerts` thoát ngay ở dòng đầu (trước mọi lời gọi API) cả ở lần gọi ngay của init, mỗi 15 s, lẫn sau `loadVehicleDropdown`. Query 15 s vẫn chạy (không gọi API). Phần render dropdown/badge được port bằng DOM API (`textContent`, không innerHTML) và chỉ chạy nếu phần tử đó tồn tại; không tạo `AiAlertsDropdown.tsx` vì không có markup để render.
- Polling sự kiện AI: bản gốc tạo một `setInterval(3000)` chạy mãi từ lần tải thành công đầu tiên và mỗi nhịp kiểm tra tab `ai-events` có `active` không. Bản port: query chỉ `enabled` khi tab đang active, nên nhịp 3 s được đếm lại từ lúc bật tab (sai lệch thời điểm đã chấp nhận). Lần tải khi click tab vẫn gọi trực tiếp (không silent), không qua query (`initialData` + `staleTime: Infinity` để bật query không fetch thêm). Nếu một lần tải mất hơn 3 s, bản gốc chồng thêm lời gọi; TanStack bỏ qua nhịp khi query đang fetch.
- `startAiEventsPolling` chỉ được gọi sau khi tải thành công: lỗi ở lần đầu ("Lỗi tải dữ liệu. Hãy thử lại sau.") hoặc chưa có xe ("Chưa có phương tiện...") thì không polling. Lỗi khi polling (silent) giữ nguyên danh sách cũ.
- Sự kiện an toàn từ `syncAiEventsLocal` không có trường `stm` (chỉ `stmStr/timeMs`) nên `loadAiEventThumbnail` luôn ghi icon `fa-image-slash` mà không gọi `performanceReportPhotoListSafe` — vẫn port đủ thân hàm. Thời gian card dùng `ev.fileTime` (không được gán) → luôn hiển thị `stmStr`.
- `openAiEventModal(idx)` dùng chỉ số trong danh sách ĐÃ LỌC để tra `aiEventsCache` (chưa lọc): khi đang tìm kiếm, modal có thể mở sai sự kiện. Giữ nguyên.
- Modal: bản gốc không có CSS nào cho `.ai-modal-*` (không có trong `css/*.css` hay index.html) — overlay được chèn cuối `<body>` như khối không định dạng (chỉ có style inline) và `body.style.overflow = 'hidden'`. Giữ nguyên: `createPortal` vào `document.body`, chỉ style inline gốc. Đóng: gỡ class `active`, 300 ms sau mới xóa overlay, trả `overflow` và gỡ listener Esc (timer của overlay cũ vẫn trả `overflow` / gỡ listener dù đã mở overlay mới — như bản gốc).
- Ảnh thumbnail có sẵn (`ev.images`) lỗi → `src = '/img/placeholder.jpg'`; file này không có trong `frontend/img` nên ảnh lỗi lặp lại như bản gốc.
- Thẻ tài xế: `loadDriverInfoForWall` chạy trước khi React commit wall nên mọi thứ ghi vào `useDriverInfoStore` theo `token` của wall; "contentEl không còn trong document" ⇔ `grid.token` không còn là token đó / thẻ unmount (query 10 s và ticker 1 s dừng theo). Lần làm mới đầu gọi trực tiếp, interval 10 s chỉ bắt đầu sau khi lần đầu xong (như bản gốc: `await refreshDriverCard()` rồi mới `setInterval`).
- `startKeepalive` gọi `stopKeepalive`, mà `stopKeepalive` xóa luôn `_faceCheckPolls`, ticker và `_drivingSessions`: nếu lần nhận diện đầu xong TRƯỚC khi iframe/keepalive sẵn sàng thì thẻ tài xế không bao giờ được làm mới nữa và đồng hồ thời gian lái đứng yên. Giữ nguyên (có test).
- Mỗi nhịp 10 s gọi `face/capture-and-recognize`, `queryDriverList` (khi nhận ra tài xế) và `face-recognition-log` như bản gốc. `_presencePolls` không bao giờ được gán (chỉ bị xóa) — bỏ. `_lastDriverIsStranger` không bị `stopKeepalive` xóa.
- **Khác biệt thời refactor — race ghi đè interval 10 s KHÔNG được tái hiện (ruling R25).** Bản gốc (liveview.js:1653-1658) gán `_faceCheckPolls[deviceId] = setInterval(...)` sau `await refreshDriverCard()` mà không xóa interval đang giữ khóa đó. Kích hoạt: dựng lại wall cho cùng thiết bị (vd. bấm "Làm mới" hoặc chọn lại xe) trong lúc lần nhận diện đầu của wall cũ chưa xong; wall mới xóa khóa (chưa có gì), rồi lần nhận diện đầu của wall cũ (hoặc mới) xong sau và ghi đè khóa. Hậu quả: interval của wall cũ (contentEl đã bị gỡ) ở nhịp kế tiếp gọi `clearInterval(_faceCheckPolls[deviceId])` — tức xóa interval của wall MỚI — nên thẻ tài xế trên wall đang hiển thị đứng yên (không làm mới, đồng hồ có thể dừng); còn interval mồ côi bị ghi đè (không còn tham chiếu nào) không bao giờ bị xóa, `stopKeepalive` cũng không với tới, và cứ 10 s lại thấy contentEl của nó không còn trong document và gọi `stopDrivingDurationTicker(deviceId)` mãi mãi (dừng ticker của bất kỳ wall nào cùng thiết bị). Bản port cố ý không tái hiện: poll 10 s và ticker gắn với `token` của từng wall (query trong `DriverInfoCard`, dừng khi thẻ unmount), wall cũ không thể dừng poll/ticker của wall mới, và `stopDriverInfoTimers` dừng mọi poll đang chạy.
- Tên tài xế, mã, thông báo (`sanitizeHTML` rồi innerHTML) và nội dung card/modal sự kiện AI (`typeName`, `vehicleName`, `position` chèn thẳng qua innerHTML) hiển thị qua JSX — chuỗi được escape (R13). Mỗi lần `renderDriverInfo` / `renderAiEvents` dựng lại nội dung (key theo `rev`) nên ảnh tải lại và `onerror` chạy lại như innerHTML gốc. Hover phóng to ảnh tài xế (`onmouseenter/onmouseleave`) → `hover:scale-*` + `peer-hover:opacity-0` cho chấm trạng thái.

### Task 12 — playback: tìm kiếm, trình phát video, danh sách file, panel phải

Ánh xạ:

- `playback.js:PAD/toVendorTimeParam/formatDt/localDt/secondsToHms/haversineKm/parseTrackTime/formatTrackTime/formatTrackDateTime/formatFullDt/escapeHtml/toApiChannelId/toUiChannelId/toPlayerChannelParam/getVehicleDeviceId/isDateTimeString/toSecNumber/secToDateTime/parseYmdHms/addSecondsToYmdHms/normalizeFileTime/injectUpstreamSessionIntoUrl/rewriteVendorPlaybackRangeInUrl/extractPlaybackHtmlUrl/hasAsciiToken` → `src/features/playback/lib.ts:<cùng tên>`
- `playback.js:1090-1195` (hằng số GPS, `formatDurationSec/detectParkStops/buildGpsJournalEntries/extractTrackAddrFromRaw/normalizeTrackRow`) → `lib.ts:<cùng tên>` (dùng ở Task 13)
- biến module `_vehiclesCache/_currentDevice/_currentVehicleName/_currentVehicleObj/_recdFiles/_lastSearchRange` + DOM `#pb-vehicle-select/#pb-begin-time/#pb-end-time/#pb-player-plate/#pb-player-time/#pb-player-area/#pb-channel-tabs/#pb-filelist-*/#pb-track-status*` → `src/features/playback/store.ts:usePlaybackStore`
- `playback.js:init` (guard `_isInitialized`) → `src/features/playback/init.ts:playbackInit` (gọi từ `RootLayout` mỗi lần showApp và `LoginScreen` lần đăng nhập đầu — đã có từ Task 4, không thêm lời gọi); `bindEvents` → cờ `initialized` (onClick của `#pb-search-btn` chỉ có sau init)
- `playback.js:loadVehicleDropdown` → `src/features/playback/queries.ts:loadVehicleDropdown` + `playbackVehiclesQueryOptions(enabled)` (key `['playback','vehicles']`, `enabled` = `store.vehicleDropdownEnabled`, `staleTime: Infinity`, không polling); option render trong `components/SearchForm.tsx`
- `playback.js:onSearch` → `src/features/playback/mutations.ts:onSearch` + `useSearchPlaybackMutation` (mutationFn = onSearch)
- `playback.js:injectIframe/injectVideo/getAuthToken/buildFleetProxyUrl/buildDirectUrlFromFileMeta/detectCodecHint/embedVendorPlayBackIframe/findFileMetaForTime/showUnifiedPlaybackPlayer/loadVideoFiles/showPlaybackIframe/renderChannelTabs/switchRightTab/toggleRightPanel/setTrackStatus/handleResize` → `src/features/playback/videoController.ts:<cùng tên>`; phần hls.js của `injectVideo` → `attachVideoSource`, `v.onerror` → `onVideoError`, listener nút "Phát" của bảng file → `onFilePlayClick`, listener tab kênh → `onChannelTabClick`
- DOM do `injectIframe/injectVideo` và các placeholder/thông báo lỗi chèn vào `#pb-player-area` → `components/PlayerArea.tsx` (`PlayerView` trong store)
- `index.html:958-1091` + `styles2.css:2785-3622` + `responsive-desktop.css:209-228` → `PlaybackSection.tsx`, `components/{SearchForm,VideoPanel,PlayerArea,ChannelTabs,RightPanel}.tsx` (Tailwind) + `playback.css` (`.header-filter-select` có `!important` → `.pb-filter-select`)
- `main.js:164-166` (switchSection → handleResize +300/+800 ms trong setTimeout 150) → `PlaybackSection.tsx:onPlaybackSectionShown` qua `onSectionShown('playback')`
- `playback.js:1957-1959` (click `.nav-item[data-target=playback]` → handleResize +220 ms) → `PlaybackSection.tsx:onPlaybackNavClick` qua `onNavItemClick('playback')`
- `playback.js:loadGpsTrack` → `src/features/playback/track.ts:loadGpsTrack` (chỗ giữ — Task 13); `_map` → `videoController.ts:setTrackMap/getTrackMap`

Bản gốc giữ nguyên / ghi chú:

- Mốc `handleResize` khi click nav playback từ section khác: +220 ms (listener click), +450 ms và +950 ms (main.js lồng `setTimeout(…, 300/800)` bên trong `setTimeout(…, 150)` của switchSection). Click lại khi đang ở playback: chỉ +220 ms. Có test tích hợp (`PlaybackSection.app.test.tsx`).
- `showUnifiedPlaybackPlayer`, `loadVideoFiles`, `detectCodecHint` (và vì thế bảng file, tab kênh) không có nơi gọi trong bản gốc — port đủ nhưng không kích hoạt được từ UI. `#pb-filelist-card` luôn `display:none`.
- `#pb-player-badge`, `.pb-right-tab`, `.pb-right-pane`, `#pb-toggle-right-panel`, `#pb-track-status-stats` không có trong index.html: cập nhật badge bị bỏ (no-op), `switchRightTab` chỉ còn hẹn `invalidateSize` sau 300 ms, `toggleRightPanel` không bao giờ được gắn (port vào store, không có nút).
- `.pb-channel-tab-btn.active` không có CSS; nút tab kênh dùng `.pb-ctrl-btn` (tròn 34 px) với chữ "Kênh n" như bản gốc.
- `.pb-filelist-header span` / `.pb-map-header span` / `.pb-timeline-header span` có độ ưu tiên cao hơn `.pb-filelist-count` / `.pb-track-status` / `.pb-timeline-count`, nên các badge đếm/trạng thái mang cỡ chữ, độ đậm và màu của tiêu đề — giữ nguyên.
- Instance Hls không bao giờ bị `destroy()` (bản gốc chỉ `area.innerHTML = ''`), kể cả khi đổi video. Khác biệt nhỏ: thẻ video đã gỡ khỏi DOM không còn listener `error` (React gỡ cùng phần tử), nên lỗi muộn của video cũ không ghi đè nội dung mới như bản gốc có thể.
- Probe `fleet-media-proxy`: `clearTimeout` chỉ chạy khi `fetch` trả về; khi `fetch` lỗi, timer abort 10 s / 8 s vẫn chạy (vô hại) — giữ nguyên.
- Nút "Tìm kiếm" không bị disable khi đang tìm (bấm nhiều lần chạy song song; lần xong đầu tiên trả nút về "Tìm kiếm") — `searching` là boolean như class `loading` gốc. Class `.loading` không có CSS.
- Thông báo lỗi động (`e.message`, `errTitle/errDetail`, `devId`, `pUrl`) và tên xe (`sanitizeHTML` → innerHTML) hiển thị qua JSX — chuỗi được escape (R13).
- (Task 12) `loadGpsTrack` là chỗ giữ — đã được Task 13 thay bằng bản port đầy đủ.

### Task 13 — playback: hành trình GPS, địa điểm, bản đồ, nhật ký, thống kê, fullscreen

Ánh xạ:

- `playback.js:fetchAllTrackRows/loadGpsTrack/renderTimeline/renderTimelineEmpty/computeStats` → `src/features/playback/track.ts:<cùng tên>`; listener click `.pb-timeline-item` → `track.ts:onTimelineItemClick`
- `playback.js:_timelinePlaceSeq/_geocodeCache/reverseGeocodeCached/enrichTimelinePlaces` → `src/features/playback/geocode.ts:nextTimelinePlaceSeq/reverseGeocodeCached/enrichTimelinePlaces` (cache = `queryClient.fetchQuery`, key `['playback','geocode', lat.toFixed(4), lng.toFixed(4)]`, `staleTime`/`gcTime: Infinity`)
- `playback.js:_map/_trackLayer/_markerLayer/_startMarker/_endMarker/_parkMarkers/_mapJournalFocused/_highlightedMarker/_animMarker/_animTimer/_animIndex/_trackPoints/_trackMapOverlayFs` → biến module của `src/features/playback/trackMapController.ts` (`_map` còn được đăng ký qua `videoController.setTrackMap` để `handleResize`/`switchRightTab`/onSearch invalidate)
- `playback.js:TRACK_POPUP_OPTS/buildSpeedTimePopup/openMarkerPopupSoon/dotIcon/clearMarkerHighlight/highlightMarker/getJournalEntryLatLng/focusMapOnJournalEntry/movingDotIcon/renderMapLegend/getOsrmMatchedRoute/renderTrackOnMap/_addTileLayerWithFallback/initMap/clearTrack/fitMapTrack/toggleTrackAnimation/startTrackAnimation/stopTrackAnimation/handleResize/toggleFullscreen/getTrackMapFullscreenEl/getNativeFullscreenElement/isTrackMapFullscreenActive/requestNativeFullscreen/exitNativeFullscreen/enterTrackMapOverlayFullscreen/exitTrackMapOverlayFullscreen/refreshTrackMapAfterFullscreen/updateTrackMapFullscreenBtn/onTrackMapFullscreenChange/toggleTrackMapFullscreen` → `trackMapController.ts:<cùng tên>` (`_addTileLayerWithFallback` → `addTileLayerWithFallback`)
- `playback.js:addTerritorialOverlays` (giống hệt map.js) → dùng chung `src/shared/map/territorial.ts:addTerritorialOverlays`; `_addTileLayerWithFallback` khác map.js (log `[Playback]`) → port riêng trong `trackMapController.ts`, URL/attribution dùng chung hằng số của `shared/map/tiles.ts`
- `bindEvents` phần nút bản đồ (`#pb-map-fullscreen-btn`, `#pb-track-play-btn` — onClick chỉ có khi `store.initialized`) → `components/RightPanel.tsx`; phần document (`fullscreenchange`×4, `keydown` Escape) → `trackMapController.ts:bindTrackMapEvents` gọi trong `init.ts:playbackInit`
- DOM `#pb-track-legend`, `.pb-map-placeholder-text`, `#pb-timeline-body`, `#pb-timeline-count`, `#pb-stat-*`, icon/title nút bản đồ, class `pb-track-fs-mode` → `store.ts` (`trackLegend/trackMapInitialized/timeline/timelineCount/stats/trackAnimating/trackMapFsActive/trackFsMode`) + `components/{TrackMap,Timeline,TrackStats}.tsx`
- `styles2.css:3148-3207` (fullscreen, popup) → `playback.css`; `styles2.css:3341-3392, 3486-3569` (legend, nhật ký) → Tailwind trong `TrackMap.tsx` / `Timeline.tsx`

Bản gốc giữ nguyên / ghi chú:

- `toggleFullscreen` (fullscreen `#pb-player-card`) không được gắn và không export ở bản gốc → port vào `trackMapController.ts` nhưng không nối UI.
- `fitMapTrack` không có nơi gọi ở bản gốc → port, không nối UI.
- Không có `useLoadGpsTrackMutation`: bản gốc chỉ gọi `loadGpsTrack` từ `onSearch` (await trực tiếp, giữ thứ tự), không có trigger riêng.
- `initMap` chỉ chạy khi có track (`renderTrackOnMap`) hoặc click nhật ký — bản đồ không tạo khi mở section.
- `renderTrackOnMap` không được await trong `loadGpsTrack` (OSRM chạy nền, timeline/thống kê/trạng thái cập nhật ngay). Nếu một lần tìm kiếm mới `clearTrack` trong lúc OSRM của lần trước đang chờ, phần sau `await` vẫn dùng `_trackLayer/_markerLayer` hiện tại (có thể null → lỗi promise không bắt) — giữ nguyên.
- OSRM: lỗi ở một chunk → chèn điểm thô của chunk đó, nên đường "thô nét đậm" (`setStyle`) chỉ xảy ra khi < 2 điểm. Các chunk gọi tuần tự (50 điểm, gối đầu 1).
- `clearTrack` gọi `stopTrackAnimation` trước khi xoá `_trackPoints`, nên ở lần tìm kiếm thứ hai trạng thái nhảy từ "Đang tải..." sang "`N` điểm GPS" (số điểm cũ, không kèm nhãn đỗ xe) trong lúc tải — giữ nguyên. `stopTrackAnimation` cũng luôn đặt lại "`N` điểm GPS" (mất nhãn " · k lần đỗ ≥30p").
- `computeStats`: tốc độ tối đa bỏ qua điểm đầu tiên (vòng lặp từ i = 1) — giữ nguyên.
- Geocode: lỗi (HTTP !ok, throw) cũng được cache với giá trị `''` như `_geocodeCache.set(key, '')`; key làm tròn 4 chữ số nhưng URL dùng tọa độ gốc của lần gọi đầu. Khác biệt nhỏ: `fetchQuery` gộp hai lời gọi đồng thời cùng key (bản gốc gọi `fetch` hai lần nếu lần đầu chưa xong — chỉ có thể xảy ra khi hai lần tải GPS chồng nhau).
- `enrichTimelinePlaces`: tra cứu tuần tự, chờ `GEO_REQUEST_DELAY_MS` (140 ms) sau mỗi lần tra cứu (kể cả khi trúng cache); tối đa `MAX_GEO_ENRICH_ROWS` (35) lần, phần còn lại hiện tọa độ "(mở bản đồ để xem)". "Hàng `.pb-tl-place` còn tồn tại" ⇔ `store.timeline.entries` vẫn là mảng đang tra cứu.
- Click nhật ký: `#pb-channel-select` / `#pb-stream-type` không có trong index.html → kênh '1', stream '1'; `showPlaybackIframe` không await.
- Vòng `forEach` vô dụng trên `window.PlaybackModule[k]` trong `clearTrack` bị bỏ (không có tác dụng).
- `#pb-track-status-stats` không tồn tại (đã ghi ở Task 12).
- Địa chỉ (`p.addr`), tiêu đề nhật ký render bằng JSX (bản gốc `escapeHtml` → innerHTML) — tương đương; popup Leaflet (`buildSpeedTimePopup`) vẫn là chuỗi HTML như bản gốc (R13).
- a11y: `.pb-timeline-item` thêm `role="button"`, `tabIndex=0`, Enter/Space; nút fullscreen cập nhật cả `aria-label` theo `title`.
- CSS `:fullscreen` / `:-webkit-full-screen` tách thành hai rule (bản gốc gộp một selector list).

### Task 14 — thống kê (events.js)

Ánh xạ:

- `events.js:ALARM_TYPES/ALARM_IDS/FILTER_TYPE_GROUPS/FILTER_TYPE_NAME_HINTS/VIOLATION_DISPLAY_NAMES/itemsPerPage` → `src/features/statistics/lib.ts:<cùng tên>` (`itemsPerPage` → `ITEMS_PER_PAGE`); `KNOWN_ALARM_CODES` là code chết (không ai dùng) → không port
- `events.js:formatDt/toNum/normalizeCoord/normalizeSpeed/parseGpsStatusSpeed/parsePositionString/getViolationDisplayName/getEventSpeed/formatSpeedDisplay/mergeRowIntoEvent/findClosestAlarmRow/isSbacString/isBlobTypeString/pickRowField/isPlausibleAlarmCode/parseAlarmCodeFromSbacString/parseAlarmCodeValue/inferAlarmCodeFromName/getAlarmCode/getEventTimeSec/getApiSeverity/normalizeAlarmEvent/extractSafetyAlarmRows/evidenceInfoToAlarmRow/extractEvidenceAlarmRows/dedupeAlarmRows/needsEvidenceSupplement/alarmTypeMatchesFilter` → `src/features/statistics/lib.ts:<cùng tên>`
- `events.js:getFilteredEvents` → `lib.ts:getFilteredEvents(allEvents, filterVal, term)` (thuần) + `loaders.ts:getFilteredEvents()` (đọc store như đọc DOM); `readTableFilterValue/readTableSearchValue` → `store.filterType` / `lib.ts:readTableSearchValue`; biến `currentFilter/searchTerm` chỉ là giá trị dự phòng khi thiếu DOM → không port
- `events.js:exportCSV` → `lib.ts:exportCSV(events): string` (chuỗi CSV) + `loaders.ts:downloadCSV` (Blob `"\uFEFF" + csv`, `text/csv;charset=utf-8;`, `BaoCao_AI_PhuongTien_<yyyy-mm-dd>.csv`) + `loaders.ts:onExportClick` (toast "Không có dữ liệu để xuất")
- `events.js:fetchSafetyAlarmRange/fetchMileageStats/loadStatistics/updateKPIs/updateLeaderboard/generateInsights/renderTable/applyTableFilters/init` → `src/features/statistics/loaders.ts:<cùng tên>` (`init` → `initStatistics`, guard `isInitialized` cấp module); listener trong `init` → `loaders.ts:onDateBtnClick/onCustomBtnClick/onCustomApplyClick/onPrevClick/onNextClick/onLeaderboardTypeChange/onFilterTypeChange/onSearchInput/closeEventModal`, gắn bằng JSX trong `components/*`
- `events.js:openEventModal` → `loaders.ts:openEventModal` (ghi `store.modal`) + `components/EventModal.tsx` (`useQuery(eventEvidenceQueryOptions(event))`, chỉ bật khi modal mở); `renderEventModalMeta/renderEvidenceMediaHtml` → `EventModal.tsx:EventModalMeta/EvidenceMedia/EvidenceItem`
- `events.js:pickEvidenceRowUrl/collectEvidenceArray/pushEvidenceFromQuery/getAuthToken/proxyFleetMediaUrl/fetchEventEvidenceBundle` → `src/features/statistics/evidence.ts:<cùng tên>`; phần chọn thẻ video → `evidence.ts:isVideoEvidenceUrl`
- `events.js:initCharts/resizeCharts/updateCharts` + biến `trendChart/pieChart/barChart` → `src/features/statistics/chartsController.ts:StatisticsChartsController` (instance `statisticsCharts`); `main.js:168-170` (resizeCharts trong timer 150 ms của switchSection) → `onSectionShown('statistics', …)` trong `StatisticsSection.tsx`
- Biến module `allEvents/currentPage/currentPeriod/isCustomDate/customStartDate/customEndDate` + nội dung DOM do các hàm render ghi (`#stat-last-update`, KPI, `#stat-leaderboard-list`, `#stat-events-tbody`, phân trang) → `src/features/statistics/store.ts:useStatisticsStore` (ảnh chụp chỉ đổi khi hàm gốc tương ứng chạy)
- `main.js:AppHelpers.showLoader/hideLoader` + `#global-loader` → `src/shared/ui/loaderStore.ts:showLoader/hideLoader` + `src/shared/ui/GlobalLoader.tsx` (mount trong `AppShell` `<main>`)
- `index.html:1090-1292` → `StatisticsSection.tsx` + `components/{DateFilter,KpiGrid,ChartsGrid,EventsTable,EventModal}.tsx`; `css/statistics.css` → Tailwind + `statistics.css` (`.stat-filter-select` = `.header-filter-select` có !important, `.stat-events-row`, `.stat-events-table` = `.live-vehicles-table`)

Bản gốc giữ nguyên / ghi chú:

- `loadStatistics` được gọi trực tiếp (không qua TanStack Query): chỉ chạy ở `init` (lần showApp đầu) và khi người dùng bấm nút ngày / "Áp dụng" / làm mới — không polling. Bấm nhiều lần chạy song song nhiều lần tải như bản gốc (không gộp/hủy); `allEvents` ghi giữa chừng nên `kmPer100` và bảng có thể dùng dữ liệu của lần tải khác — giữ nguyên.
- `#stat-ai-insights` không có trong index.html → `generateInsights` luôn return ngay; port thành no-op.
- `#stat-leaderboard-type` không có option `selected` → mặc định "Ít lỗi nhất" (`best`), dù code có fallback `'worst'`. Với `worst` mũi tên `fa-arrow-trend-up` màu xanh lá (`.lb-trend.up`), `best` mũi tên xuống màu đỏ — giữ nguyên.
- "Áp dụng" tùy chọn ngày: `customStartDate/customEndDate` bị ghi TRƯỚC khi kiểm tra bắt đầu < kết thúc; nếu sai thì báo lỗi nhưng `isCustomDate` cũ vẫn giữ, lần làm mới sau dùng khoảng ngày sai — giữ nguyên.
- Thanh phân trang/bảng chỉ cập nhật khi `renderTable` chạy (sau tải xong, đổi lọc/tìm kiếm, bấm Trước/Sau). Trước lần tải đầu: "Đang tải dữ liệu...", "Trang 1", nút Trước disabled, Sau enabled. `onNextClick` tính số trang từ `allEvents` hiện tại (có thể mới hơn bảng đang hiển thị).
- `getAuthToken` đọc thẳng `sessionStorage` rồi `localStorage` key `dashcam_auth_token` (không qua `session.getToken`, không kiểm tra hạn "ghi nhớ").
- `typeof ApiModule.queryAlarmEvidence === 'function'` luôn đúng → gọi không điều kiện.
- `EventsModule` gắn listener `resize` lên window ở `init` và không bao giờ gỡ; controller gắn passive và gỡ khi unmount (StrictMode).
- Modal bằng chứng: bản gốc không đóng khi click nền — giữ (không dùng `shared/ui/Modal`). Khác biệt nhỏ do dùng query: (1) mở A, đóng, mở B khi A chưa xong — bản gốc để kết quả A ghi đè modal B một lúc; bản mới chỉ hiển thị kết quả của sự kiện đang mở; (2) đóng rồi mở lại CÙNG sự kiện khi lần tải trước chưa xong → query gộp, chỉ một chuỗi lời gọi.
- Tên xe, tên vi phạm, mức độ, vị trí, thời gian trong bảng/modal/xếp hạng hiển thị qua JSX (bản gốc `sanitizeHTML` → innerHTML) — tương đương; thông báo lỗi `err.message` cũng được escape (R13). `onerror` của ảnh (thay nội dung khung bằng "Không tải được ảnh") → state `imgFailed`.
- `AppHelpers.showLoader/hideLoader` không đếm: lần tải xong đầu tiên ẩn loader dù lần khác còn chạy — giữ nguyên.
