import { onCompanyChange } from '../actions'
import { useLiveviewStore } from '../store'

// index.html:853-856 #company-select-inner; option do initCompanyDropdown (liveview.js:1014-1023) dựng.
export function CompanyDropdown() {
  const options = useLiveviewStore((s) => s.companyOptions)
  const value = useLiveviewStore((s) => s.companyValue)
  return (
    <select
      id="company-select-inner"
      aria-label="Chọn nhóm quản lý"
      className="liveview-filter-select min-w-[150px]"
      value={value}
      onChange={(e) => onCompanyChange(e.target.value)}
    >
      <option value="">Chọn nhóm quản lý</option>
      {options.map((username) => (
        <option key={username} value={username}>
          {username}
        </option>
      ))}
    </select>
  )
}
