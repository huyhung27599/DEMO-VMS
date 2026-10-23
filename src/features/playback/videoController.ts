import Hls from "hls.js";
import { api } from "../../shared/api/endpoints";
import {
  extractPlaybackHtmlUrl,
  getVehicleDeviceId,
  hasAsciiToken,
  injectUpstreamSessionIntoUrl,
  isDateTimeString,
  normalizeFileTime,
  parseYmdHms,
  rewriteVendorPlaybackRangeInUrl,
  toApiChannelId,
  toPlayerChannelParam,
  toUiChannelId,
  toVendorTimeParam,
  type Loose,
} from "./lib";
import {
  usePlaybackStore,
  type PlaybackFile,
  type PlayerView,
  type VideoFailureHandler,
} from "./store";

// Phần trình phát video của window.PlaybackModule (playback.js:114-399, 439-474, 558-1087, 1814-1823).
// "area" (#pb-player-area) được thay bằng usePlaybackStore.player; React (components/VideoPanel.tsx) render.
// `#pb-player-badge` không có trong index.html nên mọi lệnh cập nhật badge của bản gốc là no-op — bỏ.

const set = usePlaybackStore.setState;
const get = usePlaybackStore.getState;

let playerSeq = 0;
const setPlayer = (view: PlayerView): void => set({ player: view });
const loading = (text: string): PlayerView => ({ kind: "loading", text });

// ─── Bản đồ hành trình (Task 13 gắn instance Leaflet vào đây) ──────────────
type ResizableMap = { invalidateSize: () => unknown };
let trackMap: ResizableMap | null = null;

/** Điểm mở rộng cho Task 13: biến `_map` của playback.js (bản đồ #pb-track-map). */
export function setTrackMap(map: ResizableMap | null): void {
  trackMap = map;
}
export function getTrackMap(): ResizableMap | null {
  return trackMap;
}

/** `try { _map?.invalidateSize() } catch {}` */
function invalidateTrackMap(): void {
  try {
    trackMap?.invalidateSize();
  } catch {
    /* ignore */
  }
}

/** playback.js:1821-1823 */
export function handleResize(): void {
  invalidateTrackMap();
}

/** playback.js:1814-1819 (#pb-track-status-stats không có trong index.html) */
export function setTrackStatus(text: string, active: boolean): void {
  set({ trackStatus: { text, active: !!active } });
}

/** playback.js:439-455 — index.html không có .pb-right-tab/.pb-right-pane: chỉ còn hẹn invalidateSize. */
export function switchRightTab(tab: string): void {
  set({ rightTab: tab });
  // Leaflet map needs resize when becoming visible
  if (tab === "map") {
    setTimeout(invalidateTrackMap, 300);
  }
}

/** playback.js:457-474 — #pb-toggle-right-panel không có trong index.html nên bản gốc không bao giờ gắn listener. */
export function toggleRightPanel(): void {
  const collapsed = !get().rightCollapsed;
  set({ rightCollapsed: collapsed });
  // if expanding and current tab is map, ensure map gets correct size
  if (!collapsed && get().rightTab === "map") {
    setTimeout(invalidateTrackMap, 350);
  }
}

// ─── Inject ──────────────────────────────────────────────────────────────

/** playback.js:217-234 — build and inject an iframe into `area` */
export function injectIframe(url: string, referrer?: string): void {
  // Nếu URL là một link media thô (DownType=5 hoặc chứa :16611), hãy dùng thẻ video
  if (
    url.includes("DownType=5") ||
    url.includes(":16611") ||
    url.includes("DownType=3")
  ) {
    const proxyUrl = buildFleetProxyUrl(url);
    if (proxyUrl) {
      injectVideo(proxyUrl);
      return;
    }
  }
  setPlayer({
    kind: "iframe",
    id: ++playerSeq,
    src: url,
    ...(referrer ? { referrer } : {}),
  });
}

/** playback.js:243-304 (phần DOM: components/PlayerVideo.tsx) */
export function injectVideo(
  url: string,
  onFailure: VideoFailureHandler = null,
  codecWarning: string | null = null,
): void {
  setPlayer({ kind: "video", id: ++playerSeq, url, onFailure, codecWarning });
}

/**
 * playback.js:306-331 — gắn nguồn cho thẻ <video> vừa chèn. Instance Hls không bao giờ bị destroy
 * (bản gốc chỉ `area.innerHTML = ''`).
 */
export function attachVideoSource(
  v: HTMLVideoElement,
  url: string,
  onFailure: VideoFailureHandler,
): void {
  // Xử lý luồng HLS nếu có
  if (url.includes(".m3u8")) {
    if (typeof Hls !== "undefined" && Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true });
      hls.loadSource(url);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        v.play().catch((e) => console.warn("Auto-play prevented", e));
      });
      hls.on(Hls.Events.ERROR, function (_event, data) {
        if (data.fatal) {
          console.error("HLS fatal error in Playback:", data);
          if (typeof onFailure === "function") onFailure(data);
        }
      });
    } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = url;
      v.addEventListener("loadedmetadata", function () {
        v.play().catch((e) => console.warn("Auto-play prevented", e));
      });
    } else {
      console.warn("Browser does not support HLS");
    }
  } else {
    v.src = url;
  }
}

/** playback.js:273-300 — v.onerror */
export function onVideoError(
  v: HTMLVideoElement,
  url: string,
  onFailure: VideoFailureHandler,
): void {
  const errCode = v.error ? v.error.code : "?";
  const errMsg = v.error ? v.error.message : "Unknown";
  console.error(
    `[VideoPlayer] Playback error code=${errCode}: ${errMsg} | src=${url.slice(0, 120)}`,
  );

  if (typeof onFailure === "function") {
    onFailure(v.error);
    return;
  }

  // Hiển thị UI lỗi thông minh theo error code
  let hint = "Lỗi khi tải video.";
  if (errCode === 3)
    hint = "Lỗi giải mã video — có thể do codec không tương thích (H.265?).";
  else if (errCode === 4)
    hint = "Định dạng video không được hỗ trợ trên trình duyệt này.";
  else if (errCode === 2) hint = "Lỗi mạng khi tải video.";
  else if (errCode === 1) hint = "Tải video bị huỷ.";
  setPlayer({ kind: "mediaError", errCode, hint });
}

/** playback.js:334 */
const getAuthToken = (): string =>
  sessionStorage.getItem("dashcam_auth_token") ||
  localStorage.getItem("dashcam_auth_token") ||
  "";

/** playback.js:336-340 */
export function buildFleetProxyUrl(remoteUrl: string): string {
  const token = getAuthToken();
  if (!remoteUrl || !token) return "";
  return `${api.BASE_URL}fleet-media-proxy?u=${encodeURIComponent(remoteUrl)}&jsession=${encodeURIComponent(token)}`;
}

/** playback.js:342-363 */
export function buildDirectUrlFromFileMeta(
  meta: Loose,
  upstreamJsession: string,
): string {
  if (!meta || typeof meta !== "object" || !upstreamJsession) return "";
  const clientIp = meta.clientIp || meta.clientip || "fleetscontrol.com";
  const clientPort = meta.clientPort || meta.clientport || 16611;
  const dev = meta.devIdno || meta.DevIDNO || get().currentDevice || "";
  const filePath = meta.file || meta.FILE || "";
  const fileLoc = meta.loc ?? meta.FILELOC ?? 2;
  const fileLen = meta.len ?? meta.FLENGTH ?? 0;
  const fileOff = meta.off ?? meta.FOFFSET ?? 0;
  const mType = meta.mediaType ?? meta.MTYPE ?? 1;
  if (!dev || !filePath) return "";
  // DownType=5 = Standard H5 playback
  return (
    `http://${clientIp}:${clientPort}/3/5?DownType=5` +
    `&jsession=${encodeURIComponent(upstreamJsession)}` +
    `&DevIDNO=${encodeURIComponent(dev)}` +
    `&FILELOC=${encodeURIComponent(fileLoc)}` +
    `&FLENGTH=${encodeURIComponent(fileLen)}` +
    `&FOFFSET=${encodeURIComponent(fileOff)}` +
    `&MTYPE=${encodeURIComponent(mType)}` +
    `&FPATH=${encodeURIComponent(filePath)}` +
    `&SAVENAME=`
  );
}

/**
 * playback.js:378-399 — phát hiện codec từ 256KB đầu: 'h265' | 'h264' | null.
 * Bản gốc không gọi hàm này ở đâu (code chết) — giữ nguyên.
 */
export async function detectCodecHint(
  proxyUrl: string,
): Promise<"h265" | "h264" | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(proxyUrl, {
      headers: { Range: "bytes=0-262143" },
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const hasHvc1 = hasAsciiToken(buf, "hvc1") || hasAsciiToken(buf, "hev1");
    const hasAvc1 = hasAsciiToken(buf, "avc1");
    if (hasHvc1 && !hasAvc1) return "h265";
    if (hasAvc1) return "h264";
    return null;
  } catch {
    return null;
  }
}

/** playback.js:188-197 — fallback cuối: iframe PlayBackVideo (jsession + devIdno + PlateNum + khung giờ). */
export function embedVendorPlayBackIframe({
  jsession,
  devId,
  plateNum,
  beginFmt,
  endFmt,
  uiChannel,
}: {
  jsession: string;
  devId: string;
  plateNum: string;
  beginFmt: string;
  endFmt: string;
  uiChannel: string;
}): boolean {
  if (!jsession || !devId) return false;
  const plate = (plateNum || "").toString().trim();
  const chUi = toPlayerChannelParam(uiChannel || "1");
  const previewChn = toApiChannelId(chUi);
  const q = `jsession=${encodeURIComponent(jsession)}&devIdno=${encodeURIComponent(devId)}&PlateNum=${encodeURIComponent(plate)}&begintime=${encodeURIComponent(toVendorTimeParam(beginFmt))}&endtime=${encodeURIComponent(toVendorTimeParam(endFmt))}&channel=${encodeURIComponent(chUi)}&previewChn=${encodeURIComponent(previewChn)}&showChnList=false&lang=en`;
  const primary = `http://119.17.211.170:8080/808gps/open/player/PlayBackVideo.html?${q}`;
  injectIframe(primary, "no-referrer-when-downgrade");
  return true;
}

/** playback.js:200-214 — tìm file chứa mốc thời gian */
export function findFileMetaForTime(
  timestamp: string,
  channelId: string = "1",
): PlaybackFile | null {
  const recdFiles = get().recdFiles;
  if (!recdFiles || !recdFiles.length) return null;
  const seekTs = parseYmdHms(timestamp);
  if (!seekTs) return null;

  // Filter by channel first
  const channelFiles = recdFiles.filter((f) => f._channel === channelId);

  // Find the file that contains seekTs
  return (
    channelFiles.find((f) => {
      const start = parseYmdHms(f._beginNorm);
      const end = parseYmdHms(f._endNorm);
      return start && end && seekTs >= start && seekTs <= end;
    }) || null
  );
}

// ─── Unified player / danh sách file (bản gốc: không có nơi gọi) ─────────

/** playback.js:558-586 */
export async function showUnifiedPlaybackPlayer(
  vehicle: Loose,
  channel: string,
  beginFmt: string,
  endFmt: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _streamType: string,
): Promise<void> {
  setPlayer(loading("Đang chuẩn bị trình phát..."));

  const devId = getVehicleDeviceId(vehicle);
  const plateNum = (vehicle.nm || vehicle.vehiIdno || "").toString().trim();

  try {
    const s: Loose = await api.getUpstreamSession();
    const upstreamJsession = s?.upstreamJsession;
    if (!upstreamJsession) throw new Error("Missing upstream session");

    // Tài liệu fleetscontrol: .../player/PlayBackVideo.html (chữ B hoa trong "Back")
    const iframeUrl = `http://119.17.211.170:8080/808gps/open/player/PlayBackVideo.html?jsession=${encodeURIComponent(upstreamJsession)}&devIdno=${encodeURIComponent(devId)}&PlateNum=${encodeURIComponent(plateNum)}&begintime=${encodeURIComponent(toVendorTimeParam(beginFmt))}&endtime=${encodeURIComponent(toVendorTimeParam(endFmt))}&channel=${channel}&showChnList=false&lang=en`;

    // Use shared helper to inject iframe
    injectIframe(iframeUrl, "no-referrer-when-downgrade");
  } catch (e) {
    console.error("Unified playback player failed:", e);
    setPlayer({ kind: "unifiedError", message: (e as Error)?.message });
  }
}

/** playback.js:589-665 — lấy danh sách video (giữ lại để tham khảo) */
export async function loadVideoFiles(
  devId: string,
  channel: string,
  beginFmt: string,
  endFmt: string,
  streamType: string,
  vehicle: Loose,
): Promise<void> {
  set({ fileList: { kind: "loading" } });

  try {
    const channels = channel === "0" ? ["1", "2", "3", "4"] : [channel];
    const files: PlaybackFile[] = [];
    set({ recdFiles: [] }); // Reset global cache

    const isCrossDay =
      String(beginFmt || "").slice(0, 10) !== String(endFmt || "").slice(0, 10);
    for (const chn of channels) {
      try {
        const res: Loose = isCrossDay
          ? await api.queryRecVideoHistory(
              devId,
              beginFmt,
              endFmt,
              toApiChannelId(chn),
              streamType as Loose,
            )
          : await api.queryRecVideo(
              devId,
              toApiChannelId(chn),
              beginFmt,
              endFmt,
              streamType as Loose,
            );
        if (res?.result === 0) {
          (res.recdFiles || res.recofiles || res.files || []).forEach(
            (f: Loose) => {
              const rawChannel =
                f.channelId ?? f.channel ?? f.Chn ?? f.chn ?? chn;
              const beginRaw =
                f.begintime ?? f.begin ?? f.BEG ?? f.beg ?? f.st ?? "";
              const endRaw = f.endtime ?? f.end ?? f.END ?? f.ed ?? f.et ?? "";
              const beginNorm = normalizeFileTime(beginRaw, beginFmt);
              const endNorm =
                normalizeFileTime(endRaw, beginFmt) ||
                normalizeFileTime(endRaw, endFmt);
              files.push({
                ...f,
                _channel: toUiChannelId(rawChannel),
                _beginNorm: beginNorm || beginFmt,
                _endNorm: endNorm || endFmt,
                _downUrl: f.DownUrl || f.downUrl || "",
                _playbackUrl:
                  f.PlaybackUrl || f.playbackUrl || f.PlaybackURL || "",
                _streamUrl:
                  f.PlaybackUrl ||
                  f.playbackUrl ||
                  f.PlaybackURL ||
                  f.DownUrl ||
                  f.downUrl ||
                  "",
              });
            },
          );
        }
      } catch (e) {
        console.warn(`[Playback] queryRecVideo ch${chn} failed:`, e);
      }
    }

    files.sort((a, b) =>
      String(a._beginNorm || "").localeCompare(String(b._beginNorm || "")),
    );
    set({ fileListCount: `${files.length} file` });

    if (!files.length) {
      set({ fileList: { kind: "empty" } });
      renderChannelTabs(vehicle, files, channel, streamType);
      void showPlaybackIframe(
        vehicle,
        channel === "0" ? "1" : channel,
        beginFmt,
        endFmt,
        streamType,
      );
      return;
    }

    set({
      fileList: { kind: "table", files, vehicle, beginFmt, endFmt, streamType },
    });
    set({ recdFiles: files }); // Store in module cache
    renderChannelTabs(vehicle, files, channel, streamType);
    if (files.length)
      void showPlaybackIframe(
        vehicle,
        files[0]._channel || "1",
        files[0]._beginNorm || beginFmt,
        files[0]._endNorm || endFmt,
        streamType,
        files[0]._streamUrl || "",
        files[0],
      );
  } catch (e) {
    console.error("[Playback] loadVideoFiles error:", e);
    set({ fileList: { kind: "error", message: (e as Error)?.message } });
  }
}

/** playback.js:651-655 — nút "Phát" của một dòng trong bảng file */
export function onFilePlayClick(idx: number): void {
  const view = get().fileList;
  if (view.kind !== "table") return;
  const f = view.files[idx];
  if (f)
    void showPlaybackIframe(
      view.vehicle,
      f._channel || "1",
      f._beginNorm || view.beginFmt,
      f._endNorm || view.endFmt,
      view.streamType,
      f._streamUrl || "",
      f,
    );
}

/** playback.js:1065-1087 */
export function renderChannelTabs(
  vehicle: Loose,
  files: PlaybackFile[],
  selectedChannel: string,
  streamType: string,
): void {
  const channels = Array.from(
    new Set(
      (files || [])
        .map((f) => String(f._channel || ""))
        .filter((c) => ["1", "2", "3", "4"].includes(c)),
    ),
  );
  if (!channels.length) {
    set({ channelTabs: null });
    return;
  }
  set({
    channelTabs: {
      channels,
      active: String(selectedChannel),
      vehicle,
      files,
      streamType,
    },
  });
}

/** playback.js:1076-1086 — click .pb-channel-tab-btn */
export function onChannelTabClick(ch: string): void {
  const tabs = get().channelTabs;
  if (!tabs) return;
  const { vehicle, files, streamType } = tabs;
  const firstFile = (files || []).find((f) => String(f._channel) === ch);
  const { lastSearchRange } = get();
  const begin = firstFile?._beginNorm || lastSearchRange.beginFmt;
  const end = firstFile?._endNorm || lastSearchRange.endFmt;
  void showPlaybackIframe(
    vehicle,
    ch,
    begin,
    end,
    streamType,
    firstFile?._streamUrl || "",
    firstFile || null,
  );
  set((s) =>
    s.channelTabs ? { channelTabs: { ...s.channelTabs, active: ch } } : {},
  );
}

// ─── Playback Core ────────────────────────────────────────────────────────

/** playback.js:668-1063 */
export async function showPlaybackIframe(
  vehicle: Loose,
  channel: string,
  beginFmt: string,
  endFmt: string,
  streamType: Loose,
  directPlaybackUrl: string = "",
  fileMeta: Loose = null,
): Promise<void> {
  setPlayer(loading("Đang chuẩn bị trình phát..."));

  const devId = getVehicleDeviceId(vehicle);
  const apiChn = toApiChannelId(channel);
  const streamChannel =
    !channel || String(channel) === "0" ? "1" : String(channel);
  const { lastSearchRange } = get();
  const normalizedBegin = isDateTimeString(beginFmt)
    ? beginFmt
    : lastSearchRange.beginFmt || "";
  const normalizedEnd = isDateTimeString(endFmt)
    ? endFmt
    : lastSearchRange.endFmt || "";

  // ─── Step 0: Try HLS Streaming (V7 Native H5 & Modern HHL) ─────────────
  const tryHlsStreaming = async (): Promise<boolean> => {
    try {
      console.log(
        `[Playback] [Step 0] Khởi tạo luồng V7 H5: devId=${devId} ch=${streamChannel}...`,
      );

      // 0a: Ưu tiên StandardApiAction_getPlaybackVideoH5.action (Hỗ trợ Seeking linh hoạt nhất trên V7)
      // dataType=1 thường trả về luồng .m3u8 trực tiếp
      const h5Res: Loose = await api.getPlaybackVideoH5(
        devId,
        streamChannel,
        normalizedBegin,
        normalizedEnd,
        streamType || 1,
        1,
      );

      let streamUrl = "";
      if (h5Res && h5Res.result === 0) {
        streamUrl =
          h5Res.url ||
          h5Res.PlaybackUrl ||
          h5Res.playbackUrl ||
          h5Res.address ||
          "";
      }

      // 0b: Nếu H5 không trả về URL, thử cơ chế v7 Record Streaming thủ công (giống Liveview)
      if (!streamUrl || !streamUrl.includes(".m3u8")) {
        console.log(
          "[Playback] [Step 0b] H5 native không trả về luồng, thử khởi động luồng ghi hình thủ công...",
        );
        const sendRes: Loose = await api.sendRecordVideo(
          devId,
          streamChannel,
          normalizedBegin,
          normalizedEnd,
          1,
          streamType || 1,
          0,
          2,
        );

        if (sendRes?.result === 0 || sendRes?.result === "0") {
          // Chờ media server warmup (800ms cho v7)
          await new Promise((r) => setTimeout(r, 800));
          const addrRes: Loose = await api.getPlaybackVideoAddress(
            devId,
            streamChannel,
            normalizedBegin,
            normalizedEnd,
            streamType || 1,
          );
          if (addrRes && addrRes.result === 0) {
            streamUrl =
              addrRes.url ||
              addrRes.PlaybackUrl ||
              addrRes.playbackUrl ||
              addrRes.address ||
              "";
          }
        }
      }

      if (streamUrl && streamUrl.includes(".m3u8")) {
        console.log(
          `[Playback] [Step 0] ✓ Đã tìm thấy luồng HLS: ${streamUrl.slice(0, 100)}`,
        );
        injectVideo(streamUrl);
        return true;
      }

      console.warn(
        "[Playback] [Step 0] Luồng HLS/V7 không khả dụng, chuyển sang cơ chế proxy file.",
      );
      return false;
    } catch (err) {
      console.error(
        "[Playback] [Step 0] Lỗi khi khởi động luồng streaming:",
        err,
      );
      return false;
    }
  };

  // ─── Step 1: Lấy session mới nhất từ backend (không dùng cache) ─────────
  const getFreshSession = async (): Promise<string | null> => {
    try {
      console.log("[Playback] [Step 1] Lấy upstream session mới...");
      const sessionInfo: Loose = await api.getUpstreamSession();
      const jsession = sessionInfo?.upstreamJsession;
      if (!jsession) {
        console.warn(
          "[Playback] [Step 1] ⚠ getUpstreamSession trả về rỗng — session có thể hết hạn",
        );
        return null;
      }
      console.log(`[Playback] [Step 1] ✓ Session: ${jsession.slice(0, 12)}...`);
      return jsession;
    } catch (err) {
      console.error("[Playback] [Step 1] ✗ Lỗi lấy session:", err);
      return null;
    }
  };

  // ─── Refresh session bên trong URL (thay jsession cũ bằng mới) ──────────
  const injectSession = injectUpstreamSessionIntoUrl;

  // ─── Step 2: Probe proxy → Codec detection → Inject video ───────────────
  const tryVideoWithCodecCheck = async (
    proxyUrl: string,
    onErr: ((err: { code: Loose; message: string }) => unknown) | null,
  ): Promise<void> => {
    console.log("[Playback] [Step 2] Probe proxy URL...");
    setPlayer(loading("Đang kiểm tra kết nối media..."));

    // ── 2a: Probe bằng GET Range nhỏ để kiểm tra cả status lẫn codec ────────
    let probeStatus: Loose;
    let probeJson: Loose = null;
    let codecHint: string | null = null;
    let probeOk = false;

    try {
      const ctrl = new AbortController();
      const tId = setTimeout(() => ctrl.abort(), 10000);
      const probe = await fetch(proxyUrl, {
        method: "GET",
        headers: { Range: "bytes=0-262143" },
        cache: "no-store",
        credentials: "include",
        signal: ctrl.signal,
      });
      clearTimeout(tId);
      probeStatus = probe.status;

      if (probe.ok || probeStatus === 206) {
        // Response thành công — đọc bytes để phát hiện codec
        probeOk = true;
        const ct = probe.headers.get("content-type") || "";
        if (
          ct.startsWith("video/") ||
          ct.includes("octet-stream") ||
          ct === ""
        ) {
          const buf = new Uint8Array(await probe.arrayBuffer());
          const hasHvc1 =
            hasAsciiToken(buf, "hvc1") || hasAsciiToken(buf, "hev1");
          const hasAvc1 = hasAsciiToken(buf, "avc1");
          if (hasHvc1 && !hasAvc1) codecHint = "h265";
          else if (hasAvc1) codecHint = "h264";
        }
      } else {
        // Status code lỗi → thử đọc body JSON từ proxy
        try {
          const txt = await probe.text();
          probeJson = JSON.parse(txt);
        } catch {
          /* ignore */
        }
      }
    } catch (fetchErr) {
      if ((fetchErr as Error)?.name === "AbortError") {
        probeStatus = "timeout";
      } else {
        probeStatus = "network_error";
        console.warn(
          "[Playback] [Step 2] Probe network error:",
          (fetchErr as Error)?.message,
        );
      }
    }

    console.log(
      `[Playback] [Step 2] Probe status=${probeStatus}, codec=${codecHint || "unknown"}`,
    );

    // ── 2b: Xử lý kết quả probe ───────────────────────────────────────────
    if (!probeOk) {
      // Xây dựng thông báo lỗi theo status code
      let errTitle = "Không thể phát video";
      let errDetail = `Mã lỗi proxy: ${probeStatus}`;
      let showFallback = false;

      if (probeStatus === 401) {
        errTitle = "Phiên đăng nhập hết hạn";
        errDetail = "Session đã hết hạn. Vui lòng đăng xuất và đăng nhập lại.";
      } else if (probeStatus === 502) {
        const hint = probeJson?.hint || "";
        errTitle = "File video không khả dụng";
        errDetail =
          probeJson?.msg || "Media server không trả về dữ liệu video hợp lệ.";
        if (hint) errDetail += ` (${hint})`;
        showFallback = true; // Có thể thử fallback API
      } else if (probeStatus === 404) {
        errTitle = "File không tìm thấy";
        errDetail = "File video không tồn tại trên thiết bị hoặc đã bị xóa.";
        showFallback = true;
      } else if (probeStatus === "timeout") {
        errTitle = "Timeout kết nối";
        errDetail =
          "Media server không phản hồi sau 10 giây. Kiểm tra kết nối mạng đến thiết bị.";
        showFallback = true;
      } else if (probeStatus === "network_error") {
        errTitle = "Lỗi mạng";
        errDetail =
          "Không thể kết nối đến media server. Kiểm tra firewall hoặc VPN.";
        showFallback = true;
      } else if (probeStatus >= 400) {
        errTitle = `Lỗi HTTP ${probeStatus}`;
        errDetail = probeJson?.msg || `Proxy trả về mã lỗi ${probeStatus}.`;
        showFallback = true;
      }

      console.warn(`[Playback] [Step 2] ✗ ${errTitle}: ${errDetail}`);

      // Nếu có callback onErr → để fallback chain xử lý tiếp
      if (typeof onErr === "function" && showFallback) {
        onErr({ code: probeStatus, message: errDetail });
        return;
      }

      // Không có fallback → hiển thị lỗi cụ thể
      setPlayer({ kind: "probeError", title: errTitle, detail: errDetail });
      return;
    }

    // ── 2c: Probe thành công → inject video ───────────────────────────────
    if (codecHint === "h265") {
      console.warn(
        "[Playback] [Step 2] ⚠ H.265 (HEVC) — Chrome/Firefox có thể không phát được",
      );
    } else if (codecHint === "h264") {
      console.log("[Playback] [Step 2] ✓ Codec H.264 — tương thích tốt");
    } else {
      console.log(
        "[Playback] [Step 2] Codec không xác định — thử phát bình thường",
      );
    }

    injectVideo(proxyUrl, onErr, codecHint);
  };

  // ─── Step 3: Fallback chain (getPlaybackVideoH5 → getPlaybackVideoHtml) ──
  const tryFallback = async (freshSession: string | null): Promise<boolean> => {
    console.log("[Playback] [Step 3] Bắt đầu fallback chain...");
    setPlayer(loading("Đang gọi trình phát dự phòng..."));

    // 3a: getPlaybackVideoH5 với apiChn (0-based)
    console.log(
      `[Playback] [Step 3a] getPlaybackVideoH5 devId=${devId} ch=${apiChn}`,
    );
    let res: Loose = await api.getPlaybackVideoH5(
      devId,
      apiChn,
      normalizedBegin,
      normalizedEnd,
      streamType,
    );
    console.log(
      `[Playback] [Step 3a] result=${res?.result}`,
      res?.url ? `url=${res.url.slice(0, 80)}` : "(no url)",
    );

    // 3b: retry với channel UI (1-based) nếu 3a fail
    if (!res || (res.result !== 0 && res.result !== "0")) {
      console.log(
        `[Playback] [Step 3b] getPlaybackVideoH5 retry ch=${channel}`,
      );
      res = await api.getPlaybackVideoH5(
        devId,
        channel,
        normalizedBegin,
        normalizedEnd,
        streamType,
      );
      console.log(
        `[Playback] [Step 3b] result=${res?.result}`,
        res?.url ? `url=${res.url.slice(0, 80)}` : "(no url)",
      );
    }

    // 3c: getPlaybackVideoHtml (sec-video-playback — có thể trả URL trong html thay vì url)
    if (
      !res ||
      (res.result !== 0 && res.result !== "0") ||
      !(res.url || res.PlaybackUrl || res.playbackUrl)
    ) {
      console.log(
        `[Playback] [Step 3c] getPlaybackVideoHtml devId=${devId} ch=${apiChn}`,
      );
      res = await api.getPlaybackVideoHtml(
        devId,
        apiChn,
        normalizedBegin,
        normalizedEnd,
        "en",
        streamType,
      );
      console.log(
        `[Playback] [Step 3c] result=${res?.result}`,
        res?.url ? `url=${res.url.slice(0, 80)}` : "(no url)",
      );
    }
    if (
      (!res || (res.result !== 0 && res.result !== "0")) &&
      apiChn !== streamChannel
    ) {
      const resAlt: Loose = await api.getPlaybackVideoHtml(
        devId,
        streamChannel,
        normalizedBegin,
        normalizedEnd,
        "en",
        streamType,
      );
      if (resAlt && (resAlt.result === 0 || resAlt.result === "0"))
        res = resAlt;
    }

    let pUrl2 = "";
    if (res && (res.result === 0 || res.result === "0")) {
      pUrl2 = res.url || res.PlaybackUrl || res.playbackUrl || "";
      if (!pUrl2) pUrl2 = extractPlaybackHtmlUrl(res);
    }
    if (pUrl2) {
      console.log(`[Playback] [Step 3] ✓ Fallback URL: ${pUrl2.slice(0, 100)}`);

      // Xử lý relative URL
      if (pUrl2.startsWith("/")) {
        const srv: Loose = await api.getUpstreamLoginServer();
        pUrl2 = (srv.playbackOrigin || "http://119.17.211.170:8080") + pUrl2;
      }

      // Inject session mới vào URL
      if (freshSession) pUrl2 = injectSession(pUrl2, freshSession);

      const isRawMedia =
        pUrl2.includes("DownType=5") ||
        pUrl2.includes(":16611") ||
        pUrl2.includes("DownType=3");
      if (isRawMedia) {
        const proxyUrl = buildFleetProxyUrl(pUrl2);
        if (proxyUrl) {
          console.log("[Playback] [Step 3] Phát qua proxy...");
          await tryVideoWithCodecCheck(proxyUrl, null);
          return true;
        }
      } else {
        console.log("[Playback] [Step 3] Phát qua iframe...");
        injectIframe(pUrl2);
        return true;
      }
    }

    console.warn("[Playback] [Step 3] ✗ Tất cả fallback đều thất bại");
    return false;
  };

  // ─── Main flow ────────────────────────────────────────────────────────

  // Ưu tiên API sec-video-playback (getPlaybackVideoHtml) — cùng hướng LiveView
  if (!directPlaybackUrl && !fileMeta) {
    try {
      const sessEarly = await getFreshSession();
      if (sessEarly) {
        let htmlRes: Loose = await api.getPlaybackVideoHtml(
          devId,
          apiChn,
          normalizedBegin,
          normalizedEnd,
          "en",
          streamType,
        );
        let ext = extractPlaybackHtmlUrl(htmlRes);
        if (
          !ext &&
          htmlRes &&
          (htmlRes.result === 0 || htmlRes.result === "0")
        ) {
          htmlRes = await api.getPlaybackVideoHtml(
            devId,
            streamChannel,
            normalizedBegin,
            normalizedEnd,
            "en",
            streamType,
          );
          ext = extractPlaybackHtmlUrl(htmlRes);
        }
        if (ext) {
          const withSess = injectUpstreamSessionIntoUrl(ext, sessEarly);
          const withRange = rewriteVendorPlaybackRangeInUrl(
            withSess,
            normalizedBegin,
            normalizedEnd,
          );
          injectIframe(withRange, "no-referrer-when-downgrade");
          return;
        }
      }
    } catch (e) {
      console.warn("[Playback] getPlaybackVideoHtml (ưu tiên):", e);
    }
  }

  // Bước 0: Quyết định chiến lược phát
  // Nếu ĐÃ CÓ fileMeta, ưu tiên phát trực tiếp để tránh delay do thăm dò HLS bị 404.
  if (fileMeta && !directPlaybackUrl) {
    console.log(
      "[Playback] Ưu tiên phát file (Legacy/Proxy) vì đã có fileMeta...",
    );
  } else {
    // Chỉ thử HLS v7 nếu chưa có fileMeta hoặc được yêu cầu cụ thể (Universal Seeking)
    if (await tryHlsStreaming()) return;
  }

  // Bước 0b: Tự động tìm file tương ứng nếu chưa có fileMeta và HLS thất bại
  if (!directPlaybackUrl && !fileMeta) {
    fileMeta = findFileMetaForTime(normalizedBegin, channel);
    if (fileMeta)
      console.log(
        "[Playback] Auto-matched file for requested time:",
        fileMeta._beginNorm,
      );
  }

  // Bước 1: Lấy session mới nhất
  const freshSession = await getFreshSession();

  // Bước 2: Xây dựng URL phát
  let pUrl =
    typeof directPlaybackUrl === "string" && directPlaybackUrl.trim()
      ? directPlaybackUrl.trim()
      : "";

  if (!pUrl && fileMeta) {
    console.log("[Playback] Xây dựng URL trực tiếp từ file metadata...");
    pUrl = buildDirectUrlFromFileMeta(fileMeta, freshSession || "");
    if (pUrl) console.log(`[Playback] Direct URL: ${pUrl.slice(0, 100)}`);
  }

  // Inject session mới vào URL nếu có
  if (pUrl && freshSession) {
    pUrl = injectSession(pUrl, freshSession);
  }

  if (pUrl) {
    const isRawMedia =
      pUrl.includes("DownType=5") ||
      pUrl.includes(":16611") ||
      pUrl.includes("DownType=3");

    if (!isRawMedia) {
      // URL là HTML player → dùng iframe
      console.log("[Playback] URL là HTML player → iframe");
      injectIframe(pUrl);
      return;
    }

    // URL là raw media → qua proxy + codec check
    const proxyUrl = buildFleetProxyUrl(pUrl);
    if (proxyUrl) {
      console.log(`[Playback] Proxy URL: ${proxyUrl.slice(0, 120)}`);
      const rawUrl = pUrl;
      await tryVideoWithCodecCheck(proxyUrl, async (videoErr) => {
        // Callback khi video lỗi → thử fallback chain
        console.warn("[Playback] Video phát thất bại, chạy fallback chain...");
        if (!(await tryFallback(freshSession))) {
          setPlayer({
            kind: "playError",
            code: videoErr?.code || "?",
            pUrl: rawUrl,
          });
        }
      });
      return;
    }
  }

  // Không có URL → vào fallback chain ngay
  console.log("[Playback] Không có URL trực tiếp → vào fallback chain...");
  if (!(await tryFallback(freshSession))) {
    const plateNum = vehicle
      ? String(vehicle.nm || vehicle.vehiIdno || "").trim()
      : "";
    if (
      freshSession &&
      embedVendorPlayBackIframe({
        jsession: freshSession,
        devId,
        plateNum,
        beginFmt: normalizedBegin,
        endFmt: normalizedEnd,
        uiChannel: streamChannel,
      })
    ) {
      return;
    }
    setPlayer({ kind: "unsupported", devId, channel, begin: normalizedBegin });
  }
}

export const videoController = {
  showUnifiedPlaybackPlayer,
  loadVideoFiles,
  showPlaybackIframe,
  handleResize,
};

/** Chỉ dùng trong test. */
export function resetVideoController(): void {
  playerSeq = 0;
  trackMap = null;
}
