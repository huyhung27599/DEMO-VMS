import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, within } from "@testing-library/react";

vi.mock("leaflet", () => import("../../test/leafletMock"));
vi.mock("../../shared/map/territorial", () => ({
  addTerritorialOverlays: vi.fn(),
}));
vi.mock("hls.js", () => ({ default: class {} }));
vi.mock("../../shared/api/endpoints", () => ({
  api: {
    BASE_URL: "http://localhost:4000/api/",
    getDeviceStatus: vi.fn(),
    queryUserVehicle: vi.fn(),
    getUpstreamSession: vi.fn(),
    getLiveVideoHtml: vi.fn(),
    realTimeVideo: vi.fn(),
    getLiveVideoAddress: vi.fn(),
  },
}));

import { renderWithProviders } from "../../test/renderWithProviders";
import { api } from "../../shared/api/endpoints";
import type { ApiResponse } from "../../shared/api/types";
import { useAuthStore } from "../../shared/auth/authStore";
import { queryClient } from "../../shared/query/queryClient";
import { mapController, resetMapController } from "../map/mapController";
import { resetLeafletMock } from "../../test/leafletMock";
import { resetLiveviewInit } from "./actions";
import { LiveviewSection } from "./LiveviewSection";
import { resetLiveviewStore } from "./store";
import { getKeepaliveState, resetStreamController } from "./streamController";

const PLAYER =
  "http://119.17.211.170:8080/808gps/open/player/RealPlayVideo.html?jsession=J";
const VEHICLES = {
  result: 0,
  vehicles: [
    { nm: "51A-001", vehiIdno: "51A001", dl: [{ id: "DEV1" }] },
    { nm: "<b>52B</b>", dl: [] },
    { nm: "", vehiIdno: "53C", dl: [{ id: "DEV3" }] },
  ],
};

let fetchMock: ReturnType<typeof vi.fn>;

async function settle(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function render(strict = false) {
  return renderWithProviders(<LiveviewSection hidden={false} />, { strict });
}

async function showApp() {
  act(() => useAuthStore.setState({ view: "app", hasShownApp: true }));
  await settle();
}

const companySelect = () =>
  document.getElementById("company-select-inner") as HTMLSelectElement;
const vehicleSelect = () =>
  document.getElementById("liveview-vehicle-select") as HTMLSelectElement;
const grid = () => document.getElementById("video-grid") as HTMLElement;
const optionTexts = (s: HTMLSelectElement) =>
  Array.from(s.options).map((o) => o.textContent);

async function chooseCompanyAndLoad() {
  fireEvent.change(companySelect(), { target: { value: "hung" } });
  await settle();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  sessionStorage.clear();
  localStorage.clear();
  sessionStorage.setItem("dashcam_auth_token", "tok");
  sessionStorage.setItem("dashcam_auth_user", "hung");
  queryClient.clear();
  resetLeafletMock();
  resetMapController();
  resetLiveviewInit();
  resetLiveviewStore();
  resetStreamController();
  fetchMock = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ "8899": "Nguyễn A" }),
    });
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(api.getDeviceStatus)
    .mockReset()
    .mockResolvedValue({ result: 0, status: [] });
  vi.mocked(api.queryUserVehicle).mockReset().mockResolvedValue(VEHICLES);
  vi.mocked(api.getUpstreamSession)
    .mockReset()
    .mockResolvedValue({ result: 0, upstreamJsession: "J" });
  vi.mocked(api.getLiveVideoHtml)
    .mockReset()
    .mockResolvedValue({ result: 0, url: PLAYER });
  vi.mocked(api.realTimeVideo).mockReset().mockResolvedValue({ result: 0 });
  vi.spyOn(mapController, "focusOnVehicle");
  vi.spyOn(mapController, "handleResize");
  useAuthStore.setState({ view: "login", hasShownApp: false });
});
afterEach(() => {
  resetStreamController();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("LiveviewSection — init", () => {
  it("markup ban đầu (index.html) và không gọi gì trước lần showApp đầu", async () => {
    render();
    await settle(1000);
    expect(screen.getByText("Giám sát trực tuyến")).toBeInTheDocument();
    expect(optionTexts(companySelect())).toEqual(["Chọn nhóm quản lý"]);
    expect(optionTexts(vehicleSelect())).toEqual(["Chọn phương tiện"]);
    expect(grid()).toBeEmptyDOMElement();
    expect(
      screen.getByRole("tab", { name: /Bản đồ giám sát/ }),
    ).toHaveAttribute("aria-selected", "true");
    expect(document.getElementById("rtab-map-view")).toContainElement(
      document.getElementById("liveview-map"),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(api.queryUserVehicle).not.toHaveBeenCalled();
  });

  it("showApp: fetch driver/mapping (một lần, kể cả StrictMode) rồi mới dựng dropdown nhóm quản lý", async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((r) => (resolveFetch = r)));
    render(true);
    await showApp();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/driver/mapping",
    );
    // chưa xong loadDriverMapping: listener chưa gắn, dropdown chưa có username
    expect(optionTexts(companySelect())).toEqual(["Chọn nhóm quản lý"]);
    fireEvent.click(screen.getByRole("tab", { name: /Bản đồ giám sát/ }));
    await settle(200);
    expect(mapController.handleResize).not.toHaveBeenCalled();

    resolveFetch({ ok: true, json: () => Promise.resolve({}) });
    await settle();
    expect(optionTexts(companySelect())).toEqual(["Chọn nhóm quản lý", "hung"]);
    expect(companySelect().value).toBe("");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // init không tự tải danh sách xe
    expect(api.queryUserVehicle).not.toHaveBeenCalled();
    expect(document.getElementById("liveview-camera-panel")).toHaveClass(
      "active",
    );
  });

  it('driver/mapping lỗi vẫn hoàn tất init; username rỗng -> "admin"', async () => {
    sessionStorage.removeItem("dashcam_auth_user");
    fetchMock.mockRejectedValue(new Error("net"));
    render();
    await showApp();
    expect(optionTexts(companySelect())).toEqual([
      "Chọn nhóm quản lý",
      "admin",
    ]);
  });
});

describe("LiveviewSection — dropdown nhóm quản lý / phương tiện", () => {
  it("chọn nhóm -> queryUserVehicle một lần, dựng option theo chỉ số cache; thông báo chọn xe", async () => {
    render();
    await showApp();
    await chooseCompanyAndLoad();
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1);
    expect(optionTexts(vehicleSelect())).toEqual([
      "Chọn phương tiện...",
      "51A-001",
      "<b>52B</b>",
      "Unknown Vehicle",
    ]);
    expect(Array.from(vehicleSelect().options).map((o) => o.value)).toEqual([
      "",
      "0",
      "1",
      "2",
    ]);
    expect(grid()).toHaveTextContent(
      "Vui lòng chọn phương tiện từ danh sách để xem camera.",
    );
    expect(grid()).not.toHaveClass("is-unified");
  });

  it('bỏ chọn nhóm -> reset dropdown xe + "Vui lòng chọn nhóm quản lý trước." (không gọi API)', async () => {
    render();
    await showApp();
    await chooseCompanyAndLoad();
    fireEvent.change(companySelect(), { target: { value: "" } });
    await settle();
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1);
    expect(optionTexts(vehicleSelect())).toEqual(["Chọn phương tiện"]);
    expect(grid()).toHaveTextContent("Vui lòng chọn nhóm quản lý trước.");
  });

  it('API lỗi -> "Lỗi tải danh sách"', async () => {
    vi.mocked(api.queryUserVehicle).mockResolvedValue({ result: 1 });
    render();
    await showApp();
    await chooseCompanyAndLoad();
    expect(optionTexts(vehicleSelect())).toEqual(["Lỗi tải danh sách"]);
  });

  it('"Làm mới" khi chưa chọn nhóm: chỉ hiện thông báo, không gọi API', async () => {
    render();
    await showApp();
    fireEvent.click(document.getElementById("refresh-liveview") as HTMLElement);
    await settle();
    expect(api.queryUserVehicle).not.toHaveBeenCalled();
    expect(grid()).toHaveTextContent(
      "Vui lòng chọn phương tiện từ danh sách để xem camera.",
    );
  });
});

describe("LiveviewSection — luồng video", () => {
  async function selectVehicle(value: string) {
    fireEvent.change(vehicleSelect(), { target: { value } });
    await settle();
  }

  it("chọn xe có thiết bị: video wall, focusOnVehicle, upstream-session -> getLiveVideoHtml -> iframe, keepalive 60 s", async () => {
    let resolveSession: (v: ApiResponse) => void = () => {};
    vi.mocked(api.getUpstreamSession).mockReturnValue(
      new Promise((r) => (resolveSession = r)),
    );
    render();
    await showApp();
    await chooseCompanyAndLoad();
    fireEvent.change(vehicleSelect(), { target: { value: "0" } });
    expect(api.getUpstreamSession).toHaveBeenCalledTimes(1);
    expect(mapController.focusOnVehicle).toHaveBeenCalledTimes(1);
    expect(mapController.focusOnVehicle).toHaveBeenCalledWith("DEV1");
    await settle();
    expect(grid()).toHaveClass("is-unified");
    expect(within(grid()).getByText("51A-001")).toBeInTheDocument();
    expect(within(grid()).getByText("Thiết bị: DEV1")).toBeInTheDocument();
    expect(within(grid()).getByText("Connecting...")).toBeInTheDocument();

    resolveSession({ result: 0, upstreamJsession: "J" });
    await settle();
    expect(api.getLiveVideoHtml).toHaveBeenCalledWith("DEV1", 0, "en");
    const iframe = grid().querySelector(
      ".video-tile iframe",
    ) as HTMLIFrameElement;
    expect(iframe.getAttribute("src")).toBe(PLAYER);
    expect(iframe.allow).toBe("autoplay; fullscreen");
    expect(iframe.referrerPolicy).toBe("no-referrer-when-downgrade");
    expect(screen.queryByText("Connecting...")).not.toBeInTheDocument();
    expect(getKeepaliveState()).toEqual({
      deviceId: "DEV1",
      iframe,
      running: true,
    });

    await settle(60_000);
    expect(api.realTimeVideo).toHaveBeenCalledTimes(1);
    expect(api.realTimeVideo).toHaveBeenCalledWith("DEV1", 0, 1, 1, 300);
  });

  it("StrictMode: một lần upstream-session / một iframe cho mỗi lần chọn xe", async () => {
    render(true);
    await showApp();
    await chooseCompanyAndLoad();
    await selectVehicle("0");
    expect(api.getUpstreamSession).toHaveBeenCalledTimes(1);
    expect(api.getLiveVideoHtml).toHaveBeenCalledTimes(1);
    expect(grid().querySelectorAll("iframe")).toHaveLength(1);
  });

  it('thiếu upstreamJsession -> "Stream Not Available", không keepalive', async () => {
    vi.mocked(api.getUpstreamSession).mockResolvedValue({ result: 0 });
    render();
    await showApp();
    await chooseCompanyAndLoad();
    await selectVehicle("0");
    expect(
      within(grid()).getByText("Stream Not Available"),
    ).toBeInTheDocument();
    expect(getKeepaliveState().running).toBe(false);
  });

  it("xe không có thiết bị video / bỏ chọn xe -> thông báo trong video wall", async () => {
    render();
    await showApp();
    await chooseCompanyAndLoad();
    await selectVehicle("1");
    expect(grid()).toHaveTextContent(
      "Phương tiện này không có thiết bị video nào được kết nối.",
    );
    expect(grid()).toHaveClass("is-unified");
    await selectVehicle("");
    expect(grid()).toHaveTextContent(
      "Vui lòng chọn phương tiện từ danh sách để xem camera.",
    );
    expect(api.getUpstreamSession).not.toHaveBeenCalled();
    expect(mapController.focusOnVehicle).not.toHaveBeenCalled();
  });

  it("nm rỗng -> tiêu đề là deviceId; đổi xe dừng keepalive cũ", async () => {
    render();
    await showApp();
    await chooseCompanyAndLoad();
    await selectVehicle("0");
    expect(getKeepaliveState().deviceId).toBe("DEV1");
    await selectVehicle("2");
    expect(within(grid()).getByText("DEV3")).toBeInTheDocument();
    expect(getKeepaliveState().deviceId).toBe("DEV3");
    expect(grid().querySelectorAll("iframe")).toHaveLength(1);
  });

  it('"Làm mới" khi đã chọn xe: tải lại danh sách và dựng lại luồng', async () => {
    render();
    await showApp();
    await chooseCompanyAndLoad();
    await selectVehicle("0");
    fireEvent.click(document.getElementById("refresh-liveview") as HTMLElement);
    await settle();
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(2);
    expect(api.getUpstreamSession).toHaveBeenCalledTimes(2);
    expect(vehicleSelect().value).toBe("0");
  });

  it("bug gốc giữ nguyên: player cũ trả về sau player mới vẫn chiếm keepalive", async () => {
    const resolvers: ((v: ApiResponse) => void)[] = [];
    vi.mocked(api.getUpstreamSession).mockImplementation(
      () => new Promise((r) => resolvers.push(r)),
    );
    render();
    await showApp();
    await chooseCompanyAndLoad();
    await selectVehicle("0");
    await selectVehicle("2");
    resolvers[1]({ result: 0, upstreamJsession: "J" });
    await settle();
    expect(getKeepaliveState().deviceId).toBe("DEV3");
    resolvers[0]({ result: 0, upstreamJsession: "J" });
    await settle();
    expect(getKeepaliveState().deviceId).toBe("DEV1");
    // iframe của player cũ không nằm trong DOM
    expect(getKeepaliveState().iframe?.isConnected).toBe(false);
    expect(grid().querySelectorAll("iframe")).toHaveLength(1);
  });

  it("click video tile: focusOnVehicle; màn hình <= 1024px thì chuyển tab trái sang Bản đồ (+ handleResize)", async () => {
    render();
    await showApp();
    await chooseCompanyAndLoad();
    await selectVehicle("0");
    vi.mocked(mapController.focusOnVehicle).mockClear();
    const tile = grid().querySelector(".video-tile") as HTMLElement;
    expect(tile).toHaveAttribute("title", "Focus map: DEV1");
    const width = vi.spyOn(window, "innerWidth", "get").mockReturnValue(1280);
    fireEvent.click(tile);
    expect(mapController.focusOnVehicle).toHaveBeenCalledWith("DEV1");
    expect(mapController.handleResize).not.toHaveBeenCalled();

    width.mockReturnValue(1024);
    fireEvent.click(tile);
    expect(mapController.handleResize).toHaveBeenCalledTimes(1);
    expect(document.getElementById("liveview-map-panel")).toHaveClass("active");
    expect(document.getElementById("liveview-camera-panel")).not.toHaveClass(
      "active",
    );
  });
});

describe("LiveviewSection — tab", () => {
  it('tab phải "Bản đồ giám sát" -> handleResize sau 100 ms (liveview.js:271-275); #liveview-map không bị remount', async () => {
    render();
    await showApp();
    const mapEl = document.getElementById("liveview-map");
    fireEvent.click(screen.getByRole("tab", { name: /Sự kiện AI/ }));
    expect(document.getElementById("rtab-ai-events")).toHaveClass("active");
    expect(document.getElementById("rtab-map-view")).toHaveClass("hidden");
    expect(mapController.handleResize).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("tab", { name: /Bản đồ giám sát/ }));
    await settle(99);
    expect(mapController.handleResize).not.toHaveBeenCalled();
    await settle(1);
    expect(mapController.handleResize).toHaveBeenCalledTimes(1);
    expect(document.getElementById("liveview-map")).toBe(mapEl);
    expect(document.getElementById("rtab-map-view")).not.toHaveClass("hidden");
  });

  it('tab trái "Bản đồ" -> handleResize ngay (liveview.js:1002); "Camera" không resize', async () => {
    render();
    await showApp();
    fireEvent.click(screen.getByRole("tab", { name: "Bản đồ" }));
    expect(mapController.handleResize).toHaveBeenCalledTimes(1);
    expect(document.getElementById("liveview-map-panel")).toHaveClass("active");
    fireEvent.click(screen.getByRole("tab", { name: "Camera" }));
    expect(mapController.handleResize).toHaveBeenCalledTimes(1);
    expect(document.getElementById("liveview-camera-panel")).toHaveClass(
      "active",
    );
  });

  it("SOS: click nút mở/đóng, click ra ngoài thì đóng", async () => {
    render();
    await showApp();
    const btn = screen.getByRole("button", { name: "Cảnh báo SOS" });
    const dropdown = document.getElementById("sos-dropdown") as HTMLElement;
    expect(dropdown).toHaveClass("hidden");
    fireEvent.click(btn);
    expect(dropdown).not.toHaveClass("hidden");
    expect(screen.getByText("Không có cảnh báo SOS mới")).toBeInTheDocument();
    fireEvent.click(dropdown);
    expect(dropdown).not.toHaveClass("hidden");
    fireEvent.click(document.body);
    expect(dropdown).toHaveClass("hidden");
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(dropdown).toHaveClass("hidden");
  });
});
