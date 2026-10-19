// Đối chiếu bản gốc (../frontend/js, chỉ đọc) với src/: action API, key storage, số ms của timer.
// Chạy: node scripts/check-parity.mjs   (exit 1 nếu còn mục thiếu)
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const origDir = join(root, '..', 'frontend', 'js')
const srcDir = join(root, 'src')

// Chỉ các file thật sự được nạp bởi frontend/index.html
// (settings.js, mapme-poi.js, map-style.js là code chết nên không xét).
const FILES = ['api', 'auth', 'dashboard', 'main', 'liveview', 'events', 'map', 'event-server', 'playback', 'driver', 'vehicle']

// Mục hợp lệ nhưng không có trong src/ — mỗi mục phải có lý do (xem MIGRATION_NOTES.md).
const ALLOWLIST = {
  // Dạng: 'setTimeout:123': 'lý do (MIGRATION_NOTES.md, mục ...)'. Hiện không có mục nào cần miễn trừ.
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|css)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) && !p.includes(`${join('src', 'test')}`)) out.push(p)
  }
  return out
}

const srcText = walk(srcDir).map((p) => readFileSync(p, 'utf8')).join('\n')
const srcNormalized = srcText.replace(/(\d)_(?=\d)/g, '$1')

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length
}

// Lấy đối số cuối (cấp ngoài cùng) của lời gọi bắt đầu ngay sau dấu '(' tại `open`.
function lastArg(text, open) {
  let depth = 0
  let argStart = open + 1
  let inStr = null
  for (let i = open; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (c === '\\') i++
      else if (c === inStr) inStr = null
      continue
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue }
    if (c === '/' && text[i + 1] === '/') { i = text.indexOf('\n', i); if (i < 0) break; continue }
    if (c === '/' && text[i + 1] === '*') { i = text.indexOf('*/', i) + 1; continue }
    if ('([{'.includes(c)) depth++
    else if (')]}'.includes(c)) {
      depth--
      if (depth === 0) return text.slice(argStart, i).trim()
    } else if (c === ',' && depth === 1) argStart = i + 1
  }
  return ''
}

const items = [] // { kind, value, file, line }
function add(kind, value, file, line) {
  items.push({ kind, value: String(value), file, line })
}

for (const f of FILES) {
  const file = `${f}.js`
  const text = readFileSync(join(origDir, file), 'utf8')
  const consts = {}
  for (const m of text.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(["'])([^"']*)\2\s*[;,\n]/g)) consts[m[1]] = m[3]
  const numConsts = {}
  for (const m of text.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*([\d_]+(?:\s*\*\s*[\d_]+)*)\s*[;,\n]/g)) {
    numConsts[m[1]] = m[2].replace(/_/g, '').split('*').reduce((a, b) => a * Number(b), 1)
  }

  // 1. fetchApi('...') và các literal `${...}xxx` / '/api/xxx' trong fetch(
  if (f === 'api') {
    for (const m of text.matchAll(/fetchApi\(\s*(["'])([^"']+)\1/g)) add('api', m[2], file, lineOf(text, m.index))
    for (const m of text.matchAll(/fetch\(\s*`\$\{[^}]+\}([^`$]+)`/g)) add('api', m[1], file, lineOf(text, m.index))
  } else {
    for (const m of text.matchAll(/fetch\(\s*`\$\{[^}]+\}([^`$]+)`/g)) add('api', m[1], file, lineOf(text, m.index))
    for (const m of text.matchAll(/fetch\(\s*(["'])\/api\/([^"']+)\1/g)) add('api', m[2], file, lineOf(text, m.index))
    for (const m of text.matchAll(/fetchApi\(\s*(["'])([^"']+)\1/g)) add('api', m[2], file, lineOf(text, m.index))
    for (const m of text.matchAll(/fleet-media-proxy/g)) add('api', 'fleet-media-proxy', file, lineOf(text, m.index))
  }

  // 2. storage keys
  for (const m of text.matchAll(/(?:local|session)Storage\.(?:get|set|remove)Item\(\s*([^,)]+)/g)) {
    const arg = m[1].trim()
    const lit = arg.match(/^(["'])(.*)\1$/)
    if (lit) add('storage', lit[2], file, lineOf(text, m.index))
    else if (consts[arg]) add('storage', consts[arg], file, lineOf(text, m.index))
    else add('storage', `<unresolved ${arg}>`, file, lineOf(text, m.index))
  }

  // 3. timers
  for (const m of text.matchAll(/\b(setInterval|setTimeout)\s*\(/g)) {
    const open = m.index + m[0].length - 1
    const arg = lastArg(text, open).replace(/_/g, '')
    let ms = null
    if (/^\d+$/.test(arg)) ms = Number(arg)
    else if (/^\d+(\s*\*\s*\d+)+$/.test(arg)) ms = arg.split('*').reduce((a, b) => a * Number(b), 1)
    else if (numConsts[arg] != null) ms = numConsts[arg]
    if (ms != null) add(m[1], ms, file, lineOf(text, m.index))
  }
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function present(item) {
  if (item.kind === 'api' || item.kind === 'storage') return srcText.includes(item.value)
  if (item.value === '0') return true // setTimeout(fn, 0) — không có giá trị để đối chiếu
  return new RegExp(`(?<![\\d.])${escapeRe(item.value)}(?![\\d])`).test(srcNormalized)
}

const seen = new Set()
let missing = 0
let allowed = 0
let total = 0
for (const it of items) {
  const key = `${it.kind}:${it.value}`
  total++
  if (present(it)) continue
  const allow = ALLOWLIST[key]
  if (allow) {
    if (!seen.has(`a${key}`)) { console.log(`ALLOWED  ${key}  (${it.file}:${it.line}) — ${allow}`); seen.add(`a${key}`) }
    allowed++
    continue
  }
  console.log(`MISSING  ${key}  (${it.file}:${it.line})`)
  missing++
}
const unique = new Set(items.map((i) => `${i.kind}:${i.value}`)).size
console.log(`\nchecked ${total} occurrences (${unique} unique values), ${allowed} allowlisted`)
console.log(`${missing} missing`)
process.exit(missing > 0 ? 1 : 0)
