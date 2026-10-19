import { Button } from '../../shared/ui/Button'
import { ContentSection, SectionHeader } from '../../shared/ui/Section'
import { openChangePasswordModal } from '../auth/store'

// #settings-section (index.html:1294-1331). settings.js không được nạp ở bản gốc nên
// chỉ có thẻ "Đổi mật khẩu" (main.js:214-220) và thẻ "Sắp ra mắt" bị disable.
const cardClass = 'overflow-hidden rounded-[12px] border border-border bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]'
const cardHeaderClass = 'flex items-center gap-3 border-b border-border bg-[#f8fafc] px-6 py-5'

export function SettingsSection({ hidden }: { hidden: boolean }) {
  return (
    <ContentSection id="settings" hidden={hidden}>
      <SectionHeader title="Cài đặt hệ thống" subtitle="Quản lý cấu hình cá nhân và bảo mật tài khoản" />
      <div className="p-8">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-8 max-[480px]:grid-cols-1">
          <div className={cardClass}>
            <div className={cardHeaderClass}>
              <i className="fa-solid fa-key text-xl text-primary" aria-hidden="true"></i>
              <span className="font-bold text-text-main">Bảo mật tài khoản</span>
            </div>
            <div className="p-6">
              <h4 className="m-0 mb-2 text-base">Đổi mật khẩu</h4>
              <p className="m-0 mb-6 text-sm leading-normal text-text-muted">
                Cập nhật mật khẩu định kỳ để bảo vệ tài khoản của bạn khỏi các truy cập trái phép.
              </p>
              <Button
                id="btn-open-settings-password"
                variant="primary"
                className="flex w-full items-center justify-center gap-2"
                onClick={openChangePasswordModal}
              >
                <i className="fa-solid fa-shield-halved" aria-hidden="true"></i> Thay đổi mật khẩu ngay
              </Button>
            </div>
          </div>

          <div className={`${cardClass} opacity-60`}>
            <div className={cardHeaderClass}>
              <i className="fa-solid fa-bell text-xl text-[#64748b]" aria-hidden="true"></i>
              <span className="font-bold text-text-main">Thông báo</span>
            </div>
            <div className="p-6">
              <h4 className="m-0 mb-2 text-base">Cấu hình cảnh báo</h4>
              <p className="m-0 mb-6 text-sm leading-normal text-text-muted">
                Tùy chỉnh các loại thông báo đẩy và email khi có sự kiện vi phạm xảy ra.
              </p>
              <Button variant="muted" className="w-full" disabled>
                Sắp ra mắt
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ContentSection>
  )
}
