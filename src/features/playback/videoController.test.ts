import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hlsMock = vi.hoisted(() => {
  type Handler = (event: string, data: unknown) => void;
  const instances: FakeHls[] = [];
  class FakeHls {
    static isSupported = vi.fn(() => true);
    static Events = { MANIFEST_PARSED: "hlsManifestParsed", ERROR: "hlsError" };
    config: unknown;
    handlers: Record<string, Handler> = {};
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
    on = vi.fn((ev: string, fn: Handler) => {
      this.handlers[ev] = fn;
    });
    constructor(config: unknown) {
      this.config = config;
      instances.push(this);
    }
  }
  return { FakeHls, instances };
});

vi.mock("hls.js", () => ({ default: hlsMock.FakeHls }));
vi.mock("../../shared/api/endpoints", () => ({
  api: {
    BASE_URL: "http://localhost:4000/api/",
    getUpstreamSession: vi.fn(),
    getUpstreamLoginServer: vi.fn(),
    getPlaybackVideoHtml: vi.fn(),
    getPlaybackVideoH5: vi.fn(),
    sendRecordVideo: vi.fn(),
    getPlaybackVideoAddress: vi.fn(),
    queryRecVideo: vi.fn(),
    queryRecVideoHistory: vi.fn(),
  },
}));

import { api } from "../../shared/api/endpoints";
import { resetPlaybackStore, usePlaybackStore } from "./store";
import {
  attachVideoSource,
  detectCodecHint,
  handleResize,
  loadVideoFiles,
  onChannelTabClick,
  setTrackMap,
  showPlaybackIframe,
  showUnifiedPlaybackPlayer,
  switchRightTab,
} from "./videoController";

const VEHICLE = { nm: "29A-123", dl: [{ id: "DEV1" }] };
const B = "2026-10-19 00:00:00";
const E = "2026-10-19 23:59:00";
const PROXY = "http://localhost:4000/api/fleet-media-proxy?u=";

const player = () => usePlaybackStore.getState().player;
const calls = () =>
  [
    "getUpstreamSession",
    "getPlaybackVideoHtml",
    "getPlaybackVideoH5",
    "sendRecordVideo",
    "getPlaybackVideoAddress",
    "getUpstreamLoginServer",
  ].flatMap((name) =>
    vi
      .mocked(api[name as "getUpstreamSession"])
      .mock.invocationCallOrder.map((order) => ({ name, order })),
  );
const callOrder = () =>
  calls()
    .sort((a, b) => a.order - b.order)
    .map((c) => c.name);

/** fetch giả: treo cho tới khi signal bị abort (rồi reject AbortError) */
function hangingFetch() {
  return vi.fn((_url: string, init: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () =>
        reject(new DOMException("aborted", "AbortError")),
      );
    });
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  localStorage.clear();
  sessionStorage.setItem("dashcam_auth_token", "tok");
  resetPlaybackStore();
  hlsMock.instances.length = 0;
  for (const fn of Object.values(api))
    if (typeof fn === "function") vi.mocked(fn).mockReset();
  vi.mocked(api.getUpstreamSession).mockResolvedValue({
    result: 0,
    upstreamJsession: "JSESS",
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setTrackMap(null);
});

describe("showPlaybackIframe — luồng chính (playback.js:668-1063)", () => {
  it("ưu tiên getPlaybackVideoHtml: iframe vendor với jsession mới và khung giờ chuẩn hoá", async () => {
    vi.mocked(api.getPlaybackVideoHtml).mockResolvedValue({
      result: 0,
      url: "http://119.17.211.170:8080/808gps/open/player/PlayBackVideo.html?jsession=OLD&begintime=x",
    });
    await showPlaybackIframe(VEHICLE, "1", B, E, "1");
    expect(callOrder()).toEqual(["getUpstreamSession", "getPlaybackVideoHtml"]);
    expect(api.getPlaybackVideoHtml).toHaveBeenCalledWith(
      "DEV1",
      "0",
      B,
      E,
      "en",
      "1",
    );
    expect(player()).toMatchObject({
      kind: "iframe",
      src: "http://119.17.211.170:8080/808gps/open/player/PlayBackVideo.html?jsession=JSESS&begintime=2026-10-19T00%3A00%3A00&endtime=2026-10-19T23%3A59%3A00",
      referrer: "no-referrer-when-downgrade",
    });
  });

  it("Html không có URL (result 0) -> thử lại với kênh UI; vẫn không có -> HLS: H5 -> sendRecordVideo -> chờ 800 ms -> getPlaybackVideoAddress", async () => {
    vi.mocked(api.getPlaybackVideoHtml).mockResolvedValue({ result: 0 });
    vi.mocked(api.getPlaybackVideoH5).mockResolvedValue({ result: 1 });
    vi.mocked(api.sendRecordVideo).mockResolvedValue({ result: 0 });
    vi.mocked(api.getPlaybackVideoAddress).mockResolvedValue({
      result: 0,
      url: "https://m/x.m3u8",
    });

    const done = showPlaybackIframe(VEHICLE, "2", B, E, "1");
    await vi.advanceTimersByTimeAsync(0);
    expect(api.getPlaybackVideoHtml).toHaveBeenNthCalledWith(
      1,
      "DEV1",
      "1",
      B,
      E,
      "en",
      "1",
    );
    expect(api.getPlaybackVideoHtml).toHaveBeenNthCalledWith(
      2,
      "DEV1",
      "2",
      B,
      E,
      "en",
      "1",
    );
    expect(api.getPlaybackVideoH5).toHaveBeenCalledWith(
      "DEV1",
      "2",
      B,
      E,
      "1",
      1,
    );
    expect(api.sendRecordVideo).toHaveBeenCalledWith(
      "DEV1",
      "2",
      B,
      E,
      1,
      "1",
      0,
      2,
    );
    await vi.advanceTimersByTimeAsync(799);
    expect(api.getPlaybackVideoAddress).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(api.getPlaybackVideoAddress).toHaveBeenCalledWith(
      "DEV1",
      "2",
      B,
      E,
      "1",
    );
    expect(callOrder()).toEqual([
      "getUpstreamSession",
      "getPlaybackVideoHtml",
      "getPlaybackVideoHtml",
      "getPlaybackVideoH5",
      "sendRecordVideo",
      "getPlaybackVideoAddress",
    ]);
    expect(player()).toMatchObject({
      kind: "video",
      url: "https://m/x.m3u8",
      onFailure: null,
      codecWarning: null,
    });
  });

  it("sendRecordVideo lỗi -> không chờ 800 ms; fallback chain -> iframe vendor cuối cùng (embedVendorPlayBackIframe)", async () => {
    vi.mocked(api.getPlaybackVideoHtml).mockResolvedValue({ result: 1 });
    vi.mocked(api.getPlaybackVideoH5).mockResolvedValue({ result: 1 });
    vi.mocked(api.sendRecordVideo).mockResolvedValue({ result: 1 });
    await showPlaybackIframe(VEHICLE, "1", B, E, "1");
    expect(api.getPlaybackVideoAddress).not.toHaveBeenCalled();
    expect(callOrder()).toEqual([
      "getUpstreamSession",
      "getPlaybackVideoHtml", // ưu tiên (result 1 -> không thử kênh UI)
      "getPlaybackVideoH5", // Step 0a
      "sendRecordVideo", // Step 0b
      "getUpstreamSession", // Step 1
      "getPlaybackVideoH5", // 3a
      "getPlaybackVideoH5", // 3b
      "getPlaybackVideoHtml", // 3c
      "getPlaybackVideoHtml", // kênh streamChannel ('1' !== '0')
    ]);
    expect(player()).toMatchObject({
      kind: "iframe",
      src: "http://119.17.211.170:8080/808gps/open/player/PlayBackVideo.html?jsession=JSESS&devIdno=DEV1&PlateNum=29A-123&begintime=2026-10-19T00%3A00%3A00&endtime=2026-10-19T23%3A59%3A00&channel=1&previewChn=0&showChnList=false&lang=en",
      referrer: "no-referrer-when-downgrade",
    });
  });

  it('không có session -> thông báo "Không mở được trình phát phát lại."', async () => {
    vi.mocked(api.getUpstreamSession).mockResolvedValue({ result: 0 });
    vi.mocked(api.getPlaybackVideoH5).mockResolvedValue({ result: 1 });
    vi.mocked(api.sendRecordVideo).mockResolvedValue({ result: 1 });
    vi.mocked(api.getPlaybackVideoHtml).mockResolvedValue({ result: 1 });
    await showPlaybackIframe(VEHICLE, "3", B, E, "1");
    expect(player()).toEqual({
      kind: "unsupported",
      devId: "DEV1",
      channel: "3",
      begin: B,
    });
  });
});

describe("probe fleet-media-proxy (playback.js:763-879) — AbortController 10 000 ms", () => {
  const META = {
    file: "/a.mp4",
    devIdno: "DEV1",
    _channel: "1",
    _beginNorm: B,
    _endNorm: E,
  };

  it("fileMeta có sẵn -> bỏ qua HTML/HLS, probe proxy với Range/no-store/include; timeout 10 s -> fallback chain", async () => {
    const fetchMock = hangingFetch();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(api.getPlaybackVideoH5).mockResolvedValue({ result: 1 });
    vi.mocked(api.getPlaybackVideoHtml).mockResolvedValue({ result: 1 });

    const done = showPlaybackIframe(VEHICLE, "1", B, E, "1", "", META);
    await vi.advanceTimersByTimeAsync(0);
    expect(callOrder()).toEqual(["getUpstreamSession"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    const direct =
      "http://fleetscontrol.com:16611/3/5?DownType=5&jsession=JSESS&DevIDNO=DEV1&FILELOC=2&FLENGTH=0&FOFFSET=0&MTYPE=1&FPATH=%2Fa.mp4&SAVENAME=";
    expect(url).toBe(`${PROXY}${encodeURIComponent(direct)}&jsession=tok`);
    expect(init).toMatchObject({
      method: "GET",
      headers: { Range: "bytes=0-262143" },
      cache: "no-store",
      credentials: "include",
    });
    expect(player()).toEqual({
      kind: "loading",
      text: "Đang kiểm tra kết nối media...",
    });

    await vi.advanceTimersByTimeAsync(9999);
    expect(init.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(init.signal?.aborted).toBe(true);
    await done;
    // timeout + onErr -> fallback chain (getPlaybackVideoH5 3a, 3b, Html 3c, Html kênh UI)
    await vi.advanceTimersByTimeAsync(0);
    expect(callOrder()).toEqual([
      "getUpstreamSession",
      "getPlaybackVideoH5",
      "getPlaybackVideoH5",
      "getPlaybackVideoHtml",
      "getPlaybackVideoHtml",
    ]);
    expect(player()).toMatchObject({ kind: "playError", code: "timeout" });
  });

  it("probe 206 + avc1 -> video H.264 với onFailure", async () => {
    const bytes = new TextEncoder().encode("....avc1....");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(bytes, {
            status: 206,
            headers: { "content-type": "video/mp4" },
          }),
      ),
    );
    await showPlaybackIframe(VEHICLE, "1", B, E, "1", "", META);
    expect(player()).toMatchObject({ kind: "video", codecWarning: "h264" });
    expect(typeof (player() as { onFailure: unknown }).onFailure).toBe(
      "function",
    );
  });
});

describe("detectCodecHint (playback.js:378-399) — AbortController 8 000 ms", () => {
  it("abort sau đúng 8 000 ms và trả null", async () => {
    const fetchMock = hangingFetch();
    vi.stubGlobal("fetch", fetchMock);
    const p = detectCodecHint("http://proxy/x");
    const init = fetchMock.mock.calls[0][1];
    expect(fetchMock.mock.calls[0][0]).toBe("http://proxy/x");
    expect(init).toMatchObject({
      headers: { Range: "bytes=0-262143" },
      cache: "no-store",
      credentials: "include",
    });
    await vi.advanceTimersByTimeAsync(7999);
    expect(init.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(init.signal?.aborted).toBe(true);
    await expect(p).resolves.toBeNull();
  });

  it("hvc1 không có avc1 -> h265", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new TextEncoder().encode("xxhev1xx"), { status: 200 }),
      ),
    );
    await expect(detectCodecHint("u")).resolves.toBe("h265");
  });
});

describe("attachVideoSource (injectVideo playback.js:306-331)", () => {
  it("m3u8 + Hls.isSupported -> new Hls({lowLatencyMode}), loadSource, attachMedia; lỗi fatal -> onFailure; không destroy", () => {
    const v = document.createElement("video");
    const onFailure = vi.fn();
    attachVideoSource(v, "https://m/x.m3u8", onFailure);
    expect(hlsMock.instances).toHaveLength(1);
    const hls = hlsMock.instances[0];
    expect(hls.config).toEqual({ lowLatencyMode: true });
    expect(hls.loadSource).toHaveBeenCalledWith("https://m/x.m3u8");
    expect(hls.attachMedia).toHaveBeenCalledWith(v);
    hls.handlers.hlsError("hlsError", { fatal: false });
    expect(onFailure).not.toHaveBeenCalled();
    hls.handlers.hlsError("hlsError", { fatal: true });
    expect(onFailure).toHaveBeenCalledWith({ fatal: true });
    expect(hls.destroy).not.toHaveBeenCalled();
  });

  it("không phải m3u8 -> gán src trực tiếp", () => {
    const v = document.createElement("video");
    attachVideoSource(v, "http://proxy/file", null);
    expect(v.getAttribute("src")).toBe("http://proxy/file");
    expect(hlsMock.instances).toHaveLength(0);
  });
});

describe("showUnifiedPlaybackPlayer / loadVideoFiles / channel tabs", () => {
  it("showUnifiedPlaybackPlayer: iframe PlayBackVideo; thiếu session -> lỗi", async () => {
    await showUnifiedPlaybackPlayer(VEHICLE, "1", B, E, "1");
    expect(player()).toMatchObject({
      kind: "iframe",
      src: "http://119.17.211.170:8080/808gps/open/player/PlayBackVideo.html?jsession=JSESS&devIdno=DEV1&PlateNum=29A-123&begintime=2026-10-19T00%3A00%3A00&endtime=2026-10-19T23%3A59%3A00&channel=1&showChnList=false&lang=en",
    });
    vi.mocked(api.getUpstreamSession).mockResolvedValue({ result: 0 });
    await showUnifiedPlaybackPlayer(VEHICLE, "1", B, E, "1");
    expect(player()).toEqual({
      kind: "unifiedError",
      message: "Missing upstream session",
    });
  });

  it("loadVideoFiles: kênh 0 -> 4 lần queryRecVideo (kênh API 0..3), sắp xếp, tab kênh, phát file đầu", async () => {
    vi.mocked(api.queryRecVideo).mockImplementation(async (_d, chn) =>
      chn === "1"
        ? { result: 0, files: [{ chn: 2, beg: 7200, end: 7300, file: "/b" }] }
        : chn === "0"
          ? {
              result: 0,
              recdFiles: [
                {
                  channelId: 0,
                  begintime: "2026-10-19 00:30:00",
                  endtime: 3600,
                  file: "/a",
                },
              ],
            }
          : { result: 1 },
    );
    vi.mocked(api.getPlaybackVideoH5).mockResolvedValue({ result: 1 });
    vi.mocked(api.getPlaybackVideoHtml).mockResolvedValue({ result: 1 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 })),
    );
    await loadVideoFiles("DEV1", "0", B, E, "1", VEHICLE);
    expect(vi.mocked(api.queryRecVideo).mock.calls.map((c) => c[1])).toEqual([
      "0",
      "1",
      "2",
      "3",
    ]);
    expect(api.queryRecVideoHistory).not.toHaveBeenCalled();
    const s = usePlaybackStore.getState();
    expect(s.fileListCount).toBe("2 file");
    expect(s.fileList.kind).toBe("table");
    expect(
      s.recdFiles.map((f) => [f._channel, f._beginNorm, f._endNorm]),
    ).toEqual([
      ["1", "2026-10-19 00:30:00", "2026-10-19 01:00:00"],
      ["2", "2026-10-19 02:00:00", "2026-10-19 02:01:40"],
    ]);
    expect(s.channelTabs).toMatchObject({ channels: ["1", "2"], active: "0" });

    // click tab kênh 2 -> phát file đầu của kênh 2, tab active
    onChannelTabClick("2");
    expect(usePlaybackStore.getState().channelTabs?.active).toBe("2");
    await vi.advanceTimersByTimeAsync(0);
  });

  it("loadVideoFiles: khác ngày -> queryRecVideoHistory; không có file -> trạng thái rỗng, ẩn tab kênh", async () => {
    vi.mocked(api.queryRecVideoHistory).mockResolvedValue({
      result: 0,
      files: [],
    });
    vi.mocked(api.getPlaybackVideoHtml).mockResolvedValue({
      result: 0,
      url: "http://119.17.211.170:8080/808gps/p.html",
    });
    await loadVideoFiles("DEV1", "2", B, "2026-10-20 01:00:00", "1", VEHICLE);
    expect(api.queryRecVideoHistory).toHaveBeenCalledWith(
      "DEV1",
      B,
      "2026-10-20 01:00:00",
      "1",
      "1",
    );
    const s = usePlaybackStore.getState();
    expect(s.fileList).toEqual({ kind: "empty" });
    expect(s.fileListCount).toBe("0 file");
    expect(s.channelTabs).toBeNull();
    await vi.advanceTimersByTimeAsync(0);
  });
});

describe("switchRightTab / handleResize", () => {
  it("switchRightTab('map') -> invalidateSize sau 300 ms; handleResize gọi ngay", () => {
    const map = { invalidateSize: vi.fn() };
    setTrackMap(map);
    switchRightTab("map");
    expect(usePlaybackStore.getState().rightTab).toBe("map");
    vi.advanceTimersByTime(299);
    expect(map.invalidateSize).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(map.invalidateSize).toHaveBeenCalledTimes(1);
    handleResize();
    expect(map.invalidateSize).toHaveBeenCalledTimes(2);
  });

  it("handleResize khi chưa có bản đồ: không lỗi", () => {
    expect(() => handleResize()).not.toThrow();
  });
});
