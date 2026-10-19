import { usePlaybackStore } from '../store'
import { onChannelTabClick } from '../videoController'

// #pb-channel-tabs (index.html:1012) — renderChannelTabs (playback.js:1065-1087).
// .pb-ctrl-btn: styles2.css:2985-3004 (+ responsive-desktop.css:225-228). Không có CSS cho `.active`.
export function ChannelTabs() {
  const tabs = usePlaybackStore((s) => s.channelTabs)
  return (
    <div className="pb-channel-tabs" id="pb-channel-tabs" style={{ display: tabs ? 'flex' : 'none' }}>
      {tabs
        ? tabs.channels.map((ch) => (
            <button
              key={ch}
              type="button"
              className={`pb-ctrl-btn pb-channel-tab-btn flex size-[34px] cursor-pointer items-center justify-center rounded-full border border-solid border-white/20 bg-white/10 text-white transition-all duration-200 hover:scale-110 hover:border-primary hover:bg-primary focus-visible:outline-2 focus-visible:outline-primary min-[1025px]:max-[1919px]:size-[31px] ${
                tabs.active === ch ? 'active' : ''
              }`}
              data-ch={ch}
              aria-pressed={tabs.active === ch}
              onClick={() => onChannelTabClick(ch)}
            >
              Kênh {ch}
            </button>
          ))
        : null}
    </div>
  )
}
