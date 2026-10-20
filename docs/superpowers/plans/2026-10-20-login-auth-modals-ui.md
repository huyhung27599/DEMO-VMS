# Login Auth Modals UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish login form panel UI and complete Quên mật khẩu + Đặt lại mật khẩu modals per SRS §3.1 (UI only).

**Architecture:** Polish in place on `LoginScreen` + shared `Modal`. Add `ResetPasswordModal` opened by `?resetToken=`. Update Zod schemas for SRS copy. No new auth APIs.

**Tech Stack:** React 19, Vite, Tailwind 4, Zod, Vitest, Testing Library. Existing `Button` / `Modal`. No new libraries required (`react-hook-form` already present but unused here to match auth patterns).

## Global Constraints

- Keep left hero image/background unchanged.
- UI/UX only — keep login + reset-request mutations; reset-password submit is client-only stub.
- Do not mount `ForgotPasswordModal` on login.
- SRS empty messages and reset complexity (≥8) for new reset schema; leave change-password 12-char rule alone.
- Working directory: `frontend-reactjs/`.

---

## File map

| File | Responsibility |
| --- | --- |
| `src/features/auth/schemas.ts` | SRS validation messages + `resetPasswordSchema` |
| `src/features/auth/ResetRequestModal.tsx` | Account/email field, Xác nhận label |
| `src/features/auth/ResetPasswordModal.tsx` | New reset-password UI |
| `src/features/auth/LoginScreen.tsx` | Form polish + wire reset modal + URL token |
| `src/features/auth/LoginScreen.test.tsx` | Updated empty messages + token open |
| `src/features/auth/modals.test.tsx` | ResetRequest copy + ResetPassword tests |

---

### Task 1: Schemas (SRS messages)

**Files:**
- Modify: `src/features/auth/schemas.ts`
- Test: update assertions in `LoginScreen.test.tsx` and `modals.test.tsx` (Task 4)

**Interfaces:**
- Produces: `loginSchema`, `resetRequestSchema`, `resetPasswordSchema`, `RESET_PASSWORD_COMPLEXITY_REGEX`

- [ ] **Step 1: Update schemas**

```ts
// login: username empty first, then password
// "Vui lòng nhập Tài khoản" / "Vui lòng nhập Mật khẩu"

// resetRequest: empty -> "Vui lòng nhập tài khoản hoặc email"
// if value includes '@' and fails email -> "Email không đúng định dạng"

// resetPasswordSchema: mismatch -> "Mật khẩu xác nhận không khớp"
// complexity >= 8 with upper/lower/digit/special (separate from PASSWORD_COMPLEXITY_REGEX 12-char)
```

- [ ] **Step 2: Commit**

```bash
git add src/features/auth/schemas.ts
git commit -m "feat(auth): align login/reset schemas with SRS messages"
```

---

### Task 2: ResetRequestModal UI

**Files:**
- Modify: `src/features/auth/ResetRequestModal.tsx`

- [ ] **Step 1: Update copy**
  - Label: `Tài khoản hoặc Email`
  - Placeholder: `Nhập tài khoản hoặc email`
  - Helper mentions account or email
  - Submit button: `Xác nhận` / loading `Đang gửi...`

- [ ] **Step 2: Commit**

```bash
git add src/features/auth/ResetRequestModal.tsx
git commit -m "feat(auth): refine ResetRequestModal to SRS copy"
```

---

### Task 3: ResetPasswordModal + LoginScreen polish

**Files:**
- Create: `src/features/auth/ResetPasswordModal.tsx`
- Modify: `src/features/auth/LoginScreen.tsx`

**Interfaces:**
- `ResetPasswordModal({ open, onClose }: { open: boolean; onClose: () => void })`
- LoginScreen: on mount read `resetToken` from `URLSearchParams`; `onClose` strips param via `history.replaceState`

- [ ] **Step 1: Create ResetPasswordModal** — fields + eyes + Hủy bỏ / Xác nhận; UI-only success then `onClose`

- [ ] **Step 2: Polish LoginScreen form** — title `Đăng nhập`; labels; keep left hero; mount ResetPasswordModal

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/ResetPasswordModal.tsx src/features/auth/LoginScreen.tsx
git commit -m "feat(auth): polish login form and add ResetPasswordModal"
```

---

### Task 4: Tests

**Files:**
- Modify: `src/features/auth/LoginScreen.test.tsx`
- Modify: `src/features/auth/modals.test.tsx`

- [ ] **Step 1: Update empty-login expectation to SRS messages (username-first)**
- [ ] **Step 2: Update ResetRequest empty + button label expectations**
- [ ] **Step 3: Add ResetPasswordModal tests (mismatch, open via token on LoginScreen)**
- [ ] **Step 4: Run `npm test -- src/features/auth`
- [ ] **Step 5: Commit**

```bash
git add src/features/auth/LoginScreen.test.tsx src/features/auth/modals.test.tsx
git commit -m "test(auth): cover SRS login and reset password UI"
```
