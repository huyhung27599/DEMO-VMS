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
