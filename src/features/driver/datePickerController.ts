import flatpickr from 'flatpickr'
import { Vietnamese } from 'flatpickr/dist/l10n/vn'
import type { Instance } from 'flatpickr/dist/types/instance'
import type { Options } from 'flatpickr/dist/types/options'
import { formatDateForInput } from './lib'

// driver.js:1522-1529 fpConfig ('vn' = locale Vietnamese)
export const FP_CONFIG: Partial<Options> = {
  locale: Vietnamese,
  enableTime: true,
  time_24hr: false,
  dateFormat: 'd/m/Y h:i K',
  allowInput: true,
  monthSelectorType: 'static',
}

/**
 * driver.js:1518-1542: Flatpickr cho #face-start-time (mặc định 00:00 hôm nay) và #face-end-time (mặc định "bây giờ").
 * Bản gốc khởi tạo một lần lúc DOMContentLoaded; ở đây khởi tạo khi tab sự kiện mount (cũng lúc tải trang).
 */
export class DatePickerController {
  start: Instance | null = null
  end: Instance | null = null
  private startEl: HTMLInputElement | null
  private endEl: HTMLInputElement | null

  constructor(startEl: HTMLInputElement | null, endEl: HTMLInputElement | null, now: Date = new Date()) {
    this.startEl = startEl
    this.endEl = endEl
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    if (startEl) {
      this.start = flatpickr(startEl, {
        ...FP_CONFIG,
        defaultDate: startDay,
      })
    }
    if (endEl) {
      this.end = flatpickr(endEl, {
        ...FP_CONFIG,
        defaultDate: now,
      })
    }
  }

  /** driver.js:1187-1197 toApiDateTime (trong loadFaceEvents) */
  toApiDateTime(which: 'start' | 'end', fallbackDate: Date): string {
    const fp = which === 'start' ? this.start : this.end
    const inputEl = which === 'start' ? this.startEl : this.endEl
    // Nếu có Flatpickr instance, sử dụng phương thức format của nó
    if (fp) {
      return fp.formatDate(fp.selectedDates[0] || fallbackDate, 'Y-m-d H:i:S')
    }
    // Fallback nếu không dùng Flatpickr (ví dụ input type="datetime-local" gốc)
    if (inputEl?.value && inputEl.value.includes('T')) {
      return inputEl.value.replace('T', ' ') + ':00'
    }
    return formatDateForInput(fallbackDate).replace('T', ' ') + ':00'
  }

  destroy(): void {
    this.start?.destroy()
    this.end?.destroy()
    this.start = null
    this.end = null
  }
}
