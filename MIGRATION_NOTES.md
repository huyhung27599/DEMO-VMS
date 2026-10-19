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

## Bug bản gốc giữ nguyên

- `auth.js:260` gọi `ApiModule.getSecurityContext?.()` nhưng `api.js` không có hàm này, nên header X-CSRF-Token gửi đi luôn là `""`. `client.ts` cố ý KHÔNG export `getSecurityContext`; bản port auth phải giữ hành vi gửi `""`.
- `fetchApi` thay đổi object `params` của caller (thêm `jsession`, `_t`) như bản gốc.
- Retry 403 chỉ một lần; nếu `fetchCsrfToken` ném lỗi trong lúc retry thì bị catch thành `result:99` như bản gốc.
