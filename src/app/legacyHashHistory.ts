import {
  createHistory,
  parseHref,
  type HistoryLocation,
  type NavigationBlocker,
  type RouterHistory,
} from '@tanstack/history'

// Định dạng URL của bản gốc (main.js Router): `#dashboard` (không có `/`).
// Router làm việc với pathname `/dashboard`. Mã dưới đây làm theo
// `createHashHistory`/`createBrowserHistory` của @tanstack/history, chỉ khác:
//   - định dạng hash: `#<route>` <-> `/<route>`;
//   - ghi vào history.pushState/replaceState đồng bộ (không gom bằng microtask)
//     để `location.hash` và `history.length` cập nhật ngay như `location.hash = x`;
//   - lắng nghe cả `hashchange` lẫn `popstate` (bản gốc dựa vào `hashchange`).

const stateIndexKey = '__TSR_index'

function createRandomKey(): string {
  return (Math.random() + 1).toString(36).slice(7)
}

/**
 * `'#dashboard'` -> `'/dashboard'`, `''` -> `'/'`.
 * Hash bắt đầu bằng `/` (vd. `#/dashboard`) không phải route hợp lệ ở bản gốc;
 * giữ nó không khớp route nào bằng cách mã hóa dấu `/` đầu (`/%2Fdashboard`),
 * nếu không `parseHref` sẽ chuẩn hóa `//dashboard` thành `/dashboard`.
 */
export function hashToPath(hashBody: string): string {
  return '/' + hashBody.replace(/^\/+/, (m) => encodeURIComponent(m))
}

/** `'/vehicle'` -> `'vehicle'` (phần sau dấu `#`). */
export function pathToHash(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path
}

export function createLegacyHashHistory(win: Window = window): RouterHistory {
  let blockers: Array<NavigationBlocker> = []

  const parseLocation = (): HistoryLocation => {
    // Giống createHashHistory: phần fragment riêng của router bắt đầu ở dấu '#' thứ hai.
    const hash = win.location.hash
    let hashIndex = hash.indexOf('#', 1)
    if (hashIndex < 0) hashIndex = hash.length
    return parseHref(
      `${hashToPath(hash.slice(1, hashIndex))}${win.location.search}${hash.slice(hashIndex)}`,
      win.history.state,
    )
  }

  const createHref = (path: string): string =>
    `${win.location.pathname}${win.location.search}#${pathToHash(path)}`

  // Giống createBrowserHistory: luôn có key ở entry đầu tiên (không đổi URL).
  if (!win.history.state?.__TSR_key && !win.history.state?.key) {
    const addedKey = createRandomKey()
    win.history.replaceState({ [stateIndexKey]: 0, key: addedKey, __TSR_key: addedKey }, '')
  }

  let currentLocation = parseLocation()

  const onPushPopEvent = () => {
    const nextLocation = parseLocation()
    // hashchange và popstate cùng bắn cho một lần đổi hash: chỉ thông báo một lần.
    if (nextLocation.href === currentLocation.href) return
    const delta = nextLocation.state[stateIndexKey] - currentLocation.state[stateIndexKey]
    currentLocation = nextLocation
    history.notify(
      delta === -1 ? { type: 'BACK' } : delta === 1 ? { type: 'FORWARD' } : { type: 'GO', index: delta },
    )
  }

  const history = createHistory({
    getLocation: () => currentLocation,
    getLength: () => win.history.length,
    pushState: (path, state) => {
      win.history.pushState(state, '', createHref(path))
      currentLocation = parseLocation()
    },
    replaceState: (path, state) => {
      win.history.replaceState(state, '', createHref(path))
      currentLocation = parseLocation()
    },
    back: () => win.history.back(),
    forward: () => win.history.forward(),
    go: (n) => win.history.go(n),
    createHref,
    destroy: () => {
      win.removeEventListener('popstate', onPushPopEvent)
      win.removeEventListener('hashchange', onPushPopEvent)
    },
    getBlockers: () => blockers,
    setBlockers: (next) => {
      blockers = next
    },
    // popstate/hashchange đã thông báo cho back/forward/go
    notifyOnIndexChange: false,
  })

  win.addEventListener('popstate', onPushPopEvent)
  win.addEventListener('hashchange', onPushPopEvent)

  return history
}
