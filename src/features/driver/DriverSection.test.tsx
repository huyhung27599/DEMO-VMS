import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";

vi.mock("../../shared/api/endpoints", () => ({
  api: {
    BASE_URL: "/api/",
    queryDriverList: vi.fn(),
    queryUserVehicle: vi.fn(),
    faceHealth: vi.fn(),
    faceSyncDrivers: vi.fn(),
    mergeDriver: vi.fn(),
    registerLocalDriver: vi.fn(),
    uploadDriverImagesUpstream: vi.fn(),
    deleteDriver: vi.fn(),
    deleteLocalDriver: vi.fn(),
    bindDriver: vi.fn(),
    listFaceRecognitionLogs: vi.fn(),
    queryIdentifyAlarm: vi.fn(),
    performanceReportPhotoListSafe: vi.fn(),
    findVehicleInfoByDeviceJn: vi.fn(),
  },
}));

vi.mock("flatpickr", () => ({
  default: vi.fn(() => ({
    selectedDates: [],
    formatDate: vi.fn((_d: Date, fmt: string) => `FMT(${fmt})`),
    destroy: vi.fn(),
  })),
}));

import flatpickr from "flatpickr";
import { Vietnamese } from "flatpickr/dist/l10n/vn";
import { api } from "../../shared/api/endpoints";
import { queryClient } from "../../shared/query/queryClient";
import { useToastStore } from "../../shared/ui/toastStore";
import { create } from "zustand";
import { notifyNavItemClick } from "../../app/useActiveSection";
import { useAuthStore } from "../../shared/auth/authStore";
import { resetFaceState } from "./faceEvents";
import { resetDriverInit } from "./init";
import { resetDriverStore } from "./store";
import { DriverSection } from "./DriverSection";

const NV1 = { id: 1, jn: "NV1", dn: "Nguyễn Văn A", dt: "0901", sx: 1 };
const NV2 = { id: 2, jn: "NV2", dn: "Trần Thị B", dt: "0902", sx: 2 };

function toasts() {
  return useToastStore.getState().toasts.map((t) => [t.type, t.message]);
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetDriverStore();
  resetDriverInit();
  resetFaceState();
  queryClient.clear();
  useToastStore.setState({ toasts: [] });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  vi.mocked(flatpickr).mockClear();
  useAuthStore.setState({ view: "app", hasShownApp: true });
  vi.mocked(api.queryDriverList)
    .mockReset()
    .mockResolvedValue({ result: 0, infos: [NV1, NV2] });
  vi.mocked(api.queryUserVehicle)
    .mockReset()
    .mockResolvedValue({ result: 0, vehicles: [] });
  vi.mocked(api.faceHealth)
    .mockReset()
    .mockResolvedValue({ status: "ok", known_drivers: 3 } as never);
  vi.mocked(api.mergeDriver)
    .mockReset()
    .mockResolvedValue({ result: 0, id: 99 });
  vi.mocked(api.registerLocalDriver)
    .mockReset()
    .mockResolvedValue({ result: 0 });
  vi.mocked(api.uploadDriverImagesUpstream)
    .mockReset()
    .mockResolvedValue({ result: 0, facePhotoUrl: "/img/a.jpg" });
  vi.mocked(api.deleteDriver).mockReset().mockResolvedValue({ result: 0 });
  vi.mocked(api.deleteLocalDriver).mockReset().mockResolvedValue({ result: 0 });
  vi.mocked(api.bindDriver).mockReset().mockResolvedValue({ result: 0 });
  vi.mocked(api.listFaceRecognitionLogs)
    .mockReset()
    .mockResolvedValue({ result: 0, events: [] });
  vi.mocked(api.queryIdentifyAlarm)
    .mockReset()
    .mockResolvedValue({ result: 0, alarms: [] });
  vi.mocked(api.performanceReportPhotoListSafe)
    .mockReset()
    .mockResolvedValue({ result: 0, photos: [] });
});
afterEach(() => {
  vi.unstubAllGlobals();
  useAuthStore.setState({ view: "login", hasShownApp: false });
});

/** Section ẩn/hiện như AppShell (hidden = route khác driver). */
const useHarness = create<{ hidden: boolean }>(() => ({ hidden: true }));
function Harness() {
  const hidden = useHarness((s) => s.hidden);
  return <DriverSection hidden={hidden} />;
}

async function renderDriver({ strict = false, hidden = true } = {}) {
  useHarness.setState({ hidden });
  const r = renderWithProviders(<Harness />, { route: "/driver", strict });
  await screen.findByText("Quản lý tài xế");
  return r;
}

/** Đổi route sang #driver (MutationObserver của bản gốc). */
async function showSection() {
  act(() => useHarness.setState({ hidden: false }));
}
function hideSection() {
  act(() => useHarness.setState({ hidden: true }));
}
async function wait(ms: number) {
  await act(() => new Promise((r) => setTimeout(r, ms)));
}

describe("thời điểm nạp (driver.js:1622-1665)", () => {
  it("không gọi API khi mount (section ẩn), kể cả sau kiểm tra 200 ms; nạp khi section hiển thị", async () => {
    await renderDriver();
    await wait(250);
    expect(api.queryDriverList).not.toHaveBeenCalled();
    expect(api.faceHealth).not.toHaveBeenCalled();
    expect(screen.getByText(/Đang kiểm tra AI Service/)).toBeInTheDocument();

    await showSection();
    expect(await screen.findByText("Nguyễn Văn A")).toBeInTheDocument();
    expect(api.queryDriverList).toHaveBeenCalledTimes(1);
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1); // buildVehicleMap
    expect(await screen.findByText("AI Service đang chạy")).toBeInTheDocument();
    expect(screen.getByText("Database: 3 tài xế")).toBeInTheDocument();
  });

  it("tải trang khi đang ở #driver: đúng một bộ (vehicle map + health + danh sách)", async () => {
    await renderDriver({ hidden: false });
    await screen.findByText("Nguyễn Văn A");
    await wait(300); // qua mốc kiểm tra 200 ms
    expect(api.queryDriverList).toHaveBeenCalledTimes(1);
    expect(api.faceHealth).toHaveBeenCalledTimes(1);
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1);
  });

  it("StrictMode: đăng ký một lần, nạp một lần", async () => {
    await renderDriver({ strict: true, hidden: false });
    await screen.findByText("Nguyễn Văn A");
    await wait(300);
    expect(api.queryDriverList).toHaveBeenCalledTimes(1);
    expect(api.faceHealth).toHaveBeenCalledTimes(1);
  });

  it("hiển thị lại (đổi hash bằng tay) khi đã có dữ liệu: không gọi gì (observer có guard)", async () => {
    await renderDriver({ hidden: false });
    await screen.findByText("Nguyễn Văn A");
    await waitFor(() => expect(api.faceHealth).toHaveBeenCalledTimes(1));
    hideSection();
    await showSection();
    await wait(100);
    expect(api.faceHealth).toHaveBeenCalledTimes(1);
    expect(api.queryDriverList).toHaveBeenCalledTimes(1);
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1);
  });

  it("đăng nhập lại khi đang ở #driver và đã có dữ liệu: không kiểm tra health", async () => {
    await renderDriver({ hidden: false });
    await screen.findByText("Nguyễn Văn A");
    await waitFor(() => expect(api.faceHealth).toHaveBeenCalledTimes(1));
    act(() => useAuthStore.setState({ view: "login" }));
    act(() => useAuthStore.setState({ view: "app" }));
    await wait(100);
    expect(api.faceHealth).toHaveBeenCalledTimes(1);
    expect(api.queryDriverList).toHaveBeenCalledTimes(1);
  });

  it("click nav driver khi đang ở #driver (không có hashchange): sau 50 ms render lại + kiểm tra health", async () => {
    await renderDriver({ hidden: false });
    await screen.findByText("Nguyễn Văn A");
    await waitFor(() => expect(api.faceHealth).toHaveBeenCalledTimes(1));
    act(() => notifyNavItemClick("driver"));
    expect(api.faceHealth).toHaveBeenCalledTimes(1);
    await wait(60);
    expect(api.faceHealth).toHaveBeenCalledTimes(2);
    expect(api.queryDriverList).toHaveBeenCalledTimes(1);
  });

  it("click nav driver khi danh sách rỗng và không đang nạp: sau 50 ms chạy đủ bộ", async () => {
    await renderDriver();
    act(() => notifyNavItemClick("driver"));
    await wait(60);
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1);
    expect(api.faceHealth).toHaveBeenCalledTimes(1);
    expect(api.queryDriverList).toHaveBeenCalledTimes(1);
  });
});

describe("drivers_cache (driver.js:906-951)", () => {
  it("hiện dữ liệu cache trước khi API trả về, sau đó cập nhật và ghi lại cache", async () => {
    localStorage.setItem("drivers_cache", JSON.stringify([NV1]));
    const d = deferred<unknown>();
    vi.mocked(api.queryDriverList).mockReturnValue(d.promise as never);
    await renderDriver();
    await showSection();

    expect(await screen.findByText("Nguyễn Văn A")).toBeInTheDocument();
    expect(screen.queryByText("Trần Thị B")).toBeNull();
    expect(screen.getByText(/Cập nhật lúc:/).textContent).not.toContain("--");

    await act(async () => d.resolve({ result: 0, infos: [NV2] }));
    expect(await screen.findByText("Trần Thị B")).toBeInTheDocument();
    expect(screen.queryByText("Nguyễn Văn A")).toBeNull();
    expect(JSON.parse(localStorage.getItem("drivers_cache")!)).toEqual([NV2]);
  });

  it("không có cache: hiện spinner rồi danh sách", async () => {
    const d = deferred<unknown>();
    vi.mocked(api.queryDriverList).mockReturnValue(d.promise as never);
    await renderDriver();
    await showSection();
    expect(
      await screen.findByText("Đang tải danh sách tài xế..."),
    ).toBeInTheDocument();
    await act(async () => d.resolve({ result: 0, infos: [NV1] }));
    expect(await screen.findByText("Nguyễn Văn A")).toBeInTheDocument();
  });

  it("API lỗi: thay lưới bằng thông báo, cache giữ nguyên", async () => {
    localStorage.setItem("drivers_cache", JSON.stringify([NV1]));
    vi.mocked(api.queryDriverList).mockResolvedValue({
      result: 1,
      msg: "Hết phiên",
    });
    await renderDriver();
    await showSection();
    expect(await screen.findByText("Lỗi: Hết phiên")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("drivers_cache")!)).toEqual([NV1]);
  });
});

describe("tìm kiếm + tab", () => {
  it("ô tìm kiếm lọc theo dn/jn/cn", async () => {
    await renderDriver();
    await showSection();
    await screen.findByText("Nguyễn Văn A");
    fireEvent.change(screen.getByLabelText("Tìm tài xế"), {
      target: { value: "nv2" },
    });
    expect(screen.queryByText("Nguyễn Văn A")).toBeNull();
    expect(screen.getByText("Trần Thị B")).toBeInTheDocument();
  });

  it("chuyển tab .dtab-btn đổi nội dung; quay lại tab danh sách khi chưa có dữ liệu thì nạp", async () => {
    const { container } = await renderDriver();
    const list = container.querySelector("#dtab-driver-list")!;
    const faces = container.querySelector("#dtab-ai-faces")!;
    expect(list).toHaveClass("active");
    expect(faces).not.toHaveClass("active");

    fireEvent.click(
      container.querySelector('.dtab-btn[data-dtab="ai-faces"]')!,
    );
    expect(faces).toHaveClass("active");
    expect(list).not.toHaveClass("active");
    expect(
      container.querySelector('.dtab-btn[data-dtab="ai-faces"]'),
    ).toHaveClass("active");
    expect(api.queryDriverList).not.toHaveBeenCalled();

    fireEvent.click(
      container.querySelector('.dtab-btn[data-dtab="driver-list"]')!,
    );
    expect(list).toHaveClass("active");
    await screen.findByText("Nguyễn Văn A");
    expect(api.queryDriverList).toHaveBeenCalledTimes(1);
  });
});

describe("Flatpickr (driver.js:1518-1542)", () => {
  it("khởi tạo hai ô ngày với đúng option", async () => {
    const { container } = await renderDriver();
    const start = container.querySelector("#face-start-time");
    const end = container.querySelector("#face-end-time");
    const now = new Date();
    const startDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
    );
    const base = {
      locale: Vietnamese,
      enableTime: true,
      time_24hr: false,
      dateFormat: "d/m/Y h:i K",
      allowInput: true,
      monthSelectorType: "static",
    };
    expect(flatpickr).toHaveBeenCalledWith(start, {
      ...base,
      defaultDate: startDay,
    });
    expect(flatpickr).toHaveBeenCalledWith(end, {
      ...base,
      defaultDate: expect.any(Date),
    });
  });
});

describe("sự kiện nhận diện + lightbox", () => {
  it("Tìm kiếm: gọi nhật ký cục bộ với khoảng thời gian từ Flatpickr, render thẻ, mở/đóng lightbox", async () => {
    vi.mocked(api.listFaceRecognitionLogs).mockResolvedValue({
      result: 0,
      events: [
        {
          id: 7,
          devIdno: "DEV7",
          vehiIdno: "29A-777",
          driverName: "Lê Văn C",
          faceCount: 1,
          eventTime: "2026-10-19T08:00:00Z",
          captureFile: "cap7.jpg",
        },
      ],
    });
    const { container } = await renderDriver({ hidden: false });
    fireEvent.click(
      container.querySelector('.dtab-btn[data-dtab="ai-faces"]')!,
    );
    fireEvent.change(screen.getByLabelText("Lọc theo biển số"), {
      target: { value: "29a" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Tìm kiếm/ }));

    expect(await screen.findByText("Lê Văn C")).toBeInTheDocument();
    expect(api.listFaceRecognitionLogs).toHaveBeenCalledWith(
      "FMT(Y-m-d H:i:S)",
      "FMT(Y-m-d H:i:S)",
      { limit: 2000 },
    );
    const summary = container.querySelector("#face-events-summary")!;
    expect(summary.textContent).toContain(
      "Lấy dữ liệu thành công. Tổng cộng: 1 sự kiện",
    );
    expect(screen.getByText("29A-777")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Bấm để phóng to ảnh sự kiện"));
    const lightbox = document.getElementById("face-image-lightbox")!;
    expect(within(lightbox).getByAltText("Ảnh sự kiện")).toHaveAttribute(
      "src",
      // BASE_URL tương đối -> firstPathFromField ghép FLEET_MEDIA_BASE (hành vi gốc)
      "http://119.17.211.170:8080/api/face/capture/cap7.jpg",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.getElementById("face-image-lightbox")).toBeNull();
  });
});

describe("lưu tài xế (driver.js:1957-2084)", () => {
  it("thêm mới có ảnh: upload ảnh -> mergeDriver -> registerLocalDriver, chèn đầu danh sách + ghi cache", async () => {
    const { container } = await renderDriver();
    await showSection();
    await screen.findByText("Nguyễn Văn A");

    fireEvent.click(screen.getByRole("button", { name: /Thêm tài xế/ }));
    const modal = container.querySelector("#driver-modal") as HTMLElement;
    expect(modal.style.display).toBe("flex");
    expect(within(modal).getByText("Thêm tài xế")).toBeInTheDocument();

    fireEvent.change(within(modal).getByLabelText(/Mã tài xế/), {
      target: { value: " NV9 " },
    });
    fireEvent.change(within(modal).getByLabelText(/Họ và tên/), {
      target: { value: "Phạm D" },
    });
    fireEvent.change(within(modal).getByLabelText(/Hạng GPLX/), {
      target: { value: "B2" },
    });
    const file = new File(["abc"], "a.png", { type: "image/png" });
    fireEvent.change(container.querySelector("#driver-photo-upload")!, {
      target: { files: [file] },
    });
    await waitFor(() =>
      expect(container.querySelector("#driver-photo-preview")).not.toBeNull(),
    );
    const dataUrl = container
      .querySelector("#driver-photo-preview")!
      .getAttribute("src")!;
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);

    fireEvent.click(screen.getByRole("button", { name: /Tạo tài xế/ }));
    await waitFor(() => expect(api.registerLocalDriver).toHaveBeenCalled());

    const upload = vi.mocked(api.uploadDriverImagesUpstream).mock;
    const merge = vi.mocked(api.mergeDriver).mock;
    const register = vi.mocked(api.registerLocalDriver).mock;
    expect(upload.invocationCallOrder[0]).toBeLessThan(
      merge.invocationCallOrder[0],
    );
    expect(merge.invocationCallOrder[0]).toBeLessThan(
      register.invocationCallOrder[0],
    );
    expect(upload.calls[0][0]).toEqual({ base64Images: [dataUrl] });
    expect(merge.calls[0][0]).toMatchObject({
      jobNum: "NV9",
      name: "Phạm D",
      sex: 1,
      birth: "1990-01-01",
      licenseType: "B2",
      reminderDays: 7,
      companyName: "GEIC",
      facePhotoUrl: "/img/a.jpg",
    });
    expect(merge.calls[0][0]).not.toHaveProperty("id");
    expect(register.calls[0]).toEqual(["NV9", "Phạm D", [dataUrl]]);

    await waitFor(() => expect(modal.style.display).toBe("none"));
    const names = [...container.querySelectorAll(".driver-name")].map(
      (n) => n.textContent,
    );
    expect(names).toEqual(["Phạm D", "Nguyễn Văn A", "Trần Thị B"]);
    expect(JSON.parse(localStorage.getItem("drivers_cache")!)[0]).toMatchObject(
      { id: 99, jn: "NV9", dn: "Phạm D" },
    );
    expect(toasts()).toContainEqual([
      "success",
      '✅ Đã thêm tài xế "Phạm D" thành công!',
    ]);
    expect(api.queryDriverList).toHaveBeenCalledTimes(1);
  });

  it("sửa: không ảnh mới -> không upload, mergeDriver có id, sau đó nạp lại danh sách", async () => {
    const { container } = await renderDriver();
    await showSection();
    await screen.findByText("Nguyễn Văn A");

    fireEvent.click(screen.getAllByRole("button", { name: "Sửa tài xế" })[0]);
    const modal = container.querySelector("#driver-modal") as HTMLElement;
    expect(within(modal).getByText("Sửa tài xế")).toBeInTheDocument();
    expect(within(modal).getByLabelText(/Mã tài xế/)).toHaveValue("NV1");
    expect(within(modal).getByLabelText(/Số điện thoại/)).toHaveValue("0901");
    fireEvent.change(within(modal).getByLabelText(/Hạng GPLX/), {
      target: { value: "C" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Lưu thay đổi/ }));

    await waitFor(() => expect(api.queryDriverList).toHaveBeenCalledTimes(2));
    expect(api.uploadDriverImagesUpstream).not.toHaveBeenCalled();
    expect(vi.mocked(api.mergeDriver).mock.calls[0][0]).toMatchObject({
      id: 1,
      jobNum: "NV1",
      licenseType: "C",
    });
    expect(api.registerLocalDriver).toHaveBeenCalledWith(
      "NV1",
      "Nguyễn Văn A",
      null,
    );
    expect(toasts()).toContainEqual([
      "success",
      '✅ Đã cập nhật tài xế "Nguyễn Văn A" thành công!',
    ]);
  });

  it("thiếu Hạng GPLX: toast lỗi, không gọi API", async () => {
    await renderDriver({ hidden: false });
    fireEvent.click(screen.getByRole("button", { name: /Thêm tài xế/ }));
    fireEvent.change(screen.getByLabelText(/Mã tài xế/), {
      target: { value: "NV9" },
    });
    fireEvent.change(screen.getByLabelText(/Họ và tên/), {
      target: { value: "Phạm D" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Tạo tài xế/ }));
    expect(toasts()).toEqual([
      ["error", "Hạng GPLX (licenseType) không được bỏ trống!"],
    ]);
    expect(api.mergeDriver).not.toHaveBeenCalled();
  });
});

describe("xóa tài xế (driver.js:1040-1148)", () => {
  it("xác nhận -> deleteDriver rồi deleteLocalDriver, bỏ khỏi danh sách + cache", async () => {
    const { container } = await renderDriver();
    await showSection();
    await screen.findByText("Nguyễn Văn A");

    fireEvent.click(
      container.querySelector('.btn-driver-delete[data-id="1"]')!,
    );
    const confirm = container.querySelector(
      "#delete-driver-confirm-modal",
    ) as HTMLElement;
    expect(confirm.style.display).toBe("flex");
    expect(
      container.querySelector("#delete-driver-confirm-name")!.textContent,
    ).toBe('"Nguyễn Văn A"');
    fireEvent.click(container.querySelector("#delete-driver-confirm-yes")!);
    expect(confirm.style.display).toBe("none");

    await waitFor(() => expect(screen.queryByText("Nguyễn Văn A")).toBeNull());
    expect(api.deleteDriver).toHaveBeenCalledWith("1", "NV1");
    expect(api.deleteLocalDriver).toHaveBeenCalledWith("NV1", "Nguyễn Văn A");
    expect(
      vi.mocked(api.deleteDriver).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(api.deleteLocalDriver).mock.invocationCallOrder[0],
    );
    expect(JSON.parse(localStorage.getItem("drivers_cache")!)).toEqual([NV2]);
    expect(toasts()).toContainEqual([
      "success",
      '✅ Đã xóa tài xế "Nguyễn Văn A" thành công!',
    ]);
    // bản gốc không nạp lại danh sách từ API sau khi xóa
    expect(api.queryDriverList).toHaveBeenCalledTimes(1);
  });

  it("hủy (Esc) -> không gọi API", async () => {
    const { container } = await renderDriver();
    await showSection();
    await screen.findByText("Nguyễn Văn A");
    fireEvent.click(
      container.querySelector('.btn-driver-delete[data-id="1"]')!,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      (container.querySelector("#delete-driver-confirm-modal") as HTMLElement)
        .style.display,
    ).toBe("none");
    await act(async () => {});
    expect(api.deleteDriver).not.toHaveBeenCalled();
  });

  it("deleteDriver thất bại -> toast lỗi, thẻ còn nguyên", async () => {
    vi.mocked(api.deleteDriver).mockResolvedValue({
      result: 3,
      msg: "Không cho phép",
    });
    const { container } = await renderDriver();
    await showSection();
    await screen.findByText("Nguyễn Văn A");
    fireEvent.click(
      container.querySelector('.btn-driver-delete[data-id="1"]')!,
    );
    fireEvent.click(container.querySelector("#delete-driver-confirm-yes")!);
    await waitFor(() =>
      expect(toasts()).toContainEqual([
        "error",
        "Xóa tài xế thất bại: Không cho phép",
      ]),
    );
    expect(api.deleteLocalDriver).not.toHaveBeenCalled();
    expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
    expect(
      container.querySelector('.btn-driver-delete[data-id="1"]'),
    ).not.toBeDisabled();
  });
});
