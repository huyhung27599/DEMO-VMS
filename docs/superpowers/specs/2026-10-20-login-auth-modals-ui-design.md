# Login form & auth modals UI — Design Spec

**Date:** 2026-10-20  
**Scope:** UI/UX only for VMS login (SRS §3.1)  
**Source:** `docs/SRS/SPCN_SPCAM_SRS_Dashcam_v0_3` §3.1 Đăng nhập / Đăng xuất / Quên mật khẩu  
**Status:** Approved for planning

## Goal

Refine the login **form panel** (keep left hero image) and complete modal UI for **Quên mật khẩu** + **Đặt lại mật khẩu**, aligned with SRS field copy and states. No backend/auth API changes in this pass.

## Decisions

| Topic | Choice |
| --- | --- |
| Modal scope | Quên mật khẩu + Đặt lại mật khẩu (not in-app Đổi mật khẩu) |
| Visual direction | Refined industrial VMS — existing blue/slate palette, tighter form UX |
| Reset entry | URL query `?resetToken=<non-empty>` opens reset modal |
| Implementation approach | Polish in place on existing `LoginScreen` + `Modal` primitives |

## Out of scope

- Left hero image, headline, and background
- Real email delivery, token validation API, password update API
- `ChangePasswordModal` / logged-in change-password flow
- VN/EN language switching behavior (chip remains visual-only)
- App shell / Sidebar redesign

## Architecture

```
LoginScreen (split layout)
├── Left: existing hero (unchanged)
└── Right: refined login card
    ├── Login form
    ├── ResetRequestModal  (opened by "Quên mật khẩu?")
    └── ResetPasswordModal (opened when URL has resetToken)
```

- Reuse `shared/ui/Modal`, `ModalHeader` / `ModalBody` / `ModalFooter`, and `Button`.
- Add `ResetPasswordModal.tsx` under `features/auth/`.
- Update `ResetRequestModal` labels/actions to match SRS.
- `LoginScreen` reads `resetToken` from `URLSearchParams` on mount / URL change; closing the reset modal removes the query param via `history.replaceState` (or equivalent) without a full navigation.

## Login form (right panel)

### Visual

- Keep centered white card, light `#f8fafc` panel background, existing primary focus ring.
- Title: **Đăng nhập** (sentence case, not all-caps).
- Tighten spacing/labels; keep username/password leading icons and password eye toggle.
- VN/EN chip remains top-right of the form panel.

### Fields (SRS)

| Control | Required | UI behavior |
| --- | --- | --- |
| Tên đăng nhập | Y | Empty → `Vui lòng nhập Tài khoản` |
| Mật khẩu | Y | Masked + eye; empty → `Vui lòng nhập Mật khẩu` |
| Ghi nhớ đăng nhập | N | Checkbox; default unchecked (unless existing persistent-session restore) |
| Nút Đăng nhập | Y | Full-width; loading label `Đang xác thực…`; disable while pending |
| Quên mật khẩu? | N | Opens ResetRequestModal |

### Errors

- Client validation: prefer SRS per-field empty messages (update `loginSchema` messages only as needed for UI).
- Server/auth errors continue to show in the existing banner (`#login-error`, `aria-live`).
- Existing login mutation wiring stays; UI states only.

## ResetRequestModal (Quên mật khẩu)

| Control | Required | UI behavior |
| --- | --- | --- |
| Title | — | `Yêu cầu khôi phục mật khẩu` |
| Tài khoản hoặc Email | Y | Placeholder e.g. `Nhập tài khoản hoặc email`; empty → `Vui lòng nhập tài khoản hoặc email`; email-shaped but invalid → `Email không đúng định dạng` |
| Hủy bỏ | N | Closes modal, no submit |
| Xác nhận | Y | Primary submit; loading `Đang gửi…`; disable while pending |

- Helper copy updated to mention account **or** email.
- Success: keep stub success message + auto-close pattern already used; no new API.
- Button label changes from `Gửi yêu cầu` → **Xác nhận** per SRS.

## ResetPasswordModal (new)

Opened when `resetToken` query is non-empty (e.g. `?resetToken=demo`). Any non-empty token opens the modal in this UI-only pass (no expiry check).

| Control | Required | UI behavior |
| --- | --- | --- |
| Title | — | `Đặt lại mật khẩu` |
| Mật khẩu mới | Y | Eye toggle; hint: min 8 chars, upper/lower/number/special (SRS BR-15) |
| Xác nhận mật khẩu mới | Y | Eye toggle; mismatch → `Mật khẩu xác nhận không khớp` |
| Hủy bỏ | N | Close modal; clear `resetToken` from URL |
| Xác nhận | Y | UI-only submit: client validate → brief success → close → clear token → remain on login |

### Token / close rules

- Empty or missing `resetToken` → modal closed.
- Overlay / X / Hủy bỏ → close and strip `resetToken` from the URL.
- Do not mount `ForgotPasswordModal` on login (legacy; out of scope).

## Validation notes

- **New reset schema** for UI: complexity per SRS (≥8, upper, lower, digit, special). Message for mismatch: `Mật khẩu xác nhận không khớp`.
- Existing `ChangePasswordModal` complexity (12 chars) is unchanged in this pass.
- `resetRequestSchema`: accept account or email; empty and email-format messages per SRS.

## Testing (UI)

- Login form renders refined title/labels; left hero unchanged.
- Empty submit shows SRS empty messages.
- Quên mật khẩu opens ResetRequestModal with account/email field and Hủy bỏ / Xác nhận.
- `?resetToken=demo` opens ResetPasswordModal; close clears query.
- Mismatch confirm password shows SRS mismatch message.
- Existing login/reset-request mutation tests updated only where copy/labels change.

## Success criteria

1. Login right panel matches refined VMS look and SRS field copy.
2. Both modals are complete and usable for UI review without backend changes.
3. Reset flow is demoable via `?resetToken=demo`.
4. Left hero image and auth API contracts remain intact.
