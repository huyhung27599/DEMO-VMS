import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../shared/api/endpoints", () => ({
  api: {
    queryAlarmDetail: vi.fn(),
    performanceReportPhotoListSafe: vi.fn(),
    queryAlarmEvidence: vi.fn(),
  },
}));

import { api } from "../../shared/api/endpoints";
import { BASE_URL } from "../../shared/api/client";
import {
  fetchEventEvidenceBundle,
  pickEvidenceRowUrl,
  proxyFleetMediaUrl,
} from "./evidence";
import { formatDt } from "./lib";

const detail = vi.mocked(api.queryAlarmDetail);
const safe = vi.mocked(api.performanceReportPhotoListSafe);
const alarmEv = vi.mocked(api.queryAlarmEvidence);

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  detail.mockReset().mockResolvedValue({ result: 0 });
  safe.mockReset().mockResolvedValue({ result: 0 });
  alarmEv.mockReset().mockResolvedValue({ result: 0 });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("proxyFleetMediaUrl", () => {
  it("URL http + token -> BASE_URL + fleet-media-proxy?u=…&jsession=…", () => {
    localStorage.setItem("dashcam_auth_token", "tok/1");
    const u = "http://119.17.211.170:8080/a b.jpg";
    expect(proxyFleetMediaUrl(u)).toBe(
      `${BASE_URL}fleet-media-proxy?u=${encodeURIComponent(u)}&jsession=tok%2F1`,
    );
  });
  it("ưu tiên token trong sessionStorage", () => {
    localStorage.setItem("dashcam_auth_token", "local");
    sessionStorage.setItem("dashcam_auth_token", "sess");
    expect(proxyFleetMediaUrl(" http://x/1.mp4 ")).toBe(
      `${BASE_URL}fleet-media-proxy?u=${encodeURIComponent("http://x/1.mp4")}&jsession=sess`,
    );
  });
  it("không có token / data: / blob: / đường dẫn tương đối -> giữ nguyên (đã trim)", () => {
    expect(proxyFleetMediaUrl("http://119.17.211.170:8080/a.jpg")).toBe(
      "http://119.17.211.170:8080/a.jpg",
    );
    localStorage.setItem("dashcam_auth_token", "t");
    expect(proxyFleetMediaUrl("data:image/png;base64,AA")).toBe(
      "data:image/png;base64,AA",
    );
    expect(proxyFleetMediaUrl("blob:abc")).toBe("blob:abc");
    expect(proxyFleetMediaUrl(" /x.jpg ")).toBe("/x.jpg");
    expect(proxyFleetMediaUrl("")).toBe("");
  });
});

describe("pickEvidenceRowUrl", () => {
  it.each([
    [null, ""],
    [{ fileUrl: " http://a " }, "http://a"],
    [{ downloadUrl: "http://d", pic: "p" }, "http://d"],
    [{ filePath: "/abc.jpg" }, "http://119.17.211.170:8080/abc.jpg"],
    [{ FPath: "http://f" }, "http://f"],
    [{ filePath: "rel/abc.jpg" }, ""],
  ])("%j -> %s", (m, out) => expect(pickEvidenceRowUrl(m)).toBe(out));
});

describe("fetchEventEvidenceBundle", () => {
  const stm = 1700000000;
  const event = {
    did: "D1",
    vehiIdno: "29A",
    stm,
    atp: 620,
    guid: "G1",
    vehicleName: "29A",
  };
  const w = (min: number) => [
    formatDt(new Date((stm - min * 60) * 1000)),
    formatDt(new Date((stm + min * 60) * 1000)),
  ];

  it("không có media: đủ 3 cửa sổ tight/mid/wide, đúng thứ tự gọi", async () => {
    const r = await fetchEventEvidenceBundle(event);
    expect(r.allMediaUrls).toEqual([]);
    const [t0, t1] = w(2);
    const [m0, m1] = w(10);
    const [x0, x1] = w(30);
    expect(detail.mock.calls).toEqual([
      ["D1", t0, t1, "620", 1, 80],
      ["D1", m0, m1, "620", 1, 80],
      ["D1", x0, x1, "620", 1, 80],
    ]);
    expect(safe.mock.calls).toEqual([
      [t0, t1, "620", "0", "29A", "D1"],
      [t0, t1, "620", "1", "29A", "D1"],
      [t0, t1, "620", "0", "29A", ""],
      [m0, m1, "620", "0", "29A", "D1"],
      [m0, m1, "620", "1", "29A", "D1"],
      [m0, m1, "620", "0", "29A", ""],
      [x0, x1, "620", "0", "29A", "D1"],
      [x0, x1, "620", "1", "29A", "D1"],
      [x0, x1, "620", "0", "29A", ""],
    ]);
    expect(alarmEv.mock.calls).toEqual([
      [t0, t1, "620", "D1", "G1", 1, 80, "29A"],
      [t0, t1, "620", "D1", "", 1, 80, "29A"],
      [m0, m1, "620", "D1", "G1", 1, 80, "29A"],
      [m0, m1, "620", "D1", "", 1, 80, "29A"],
      [x0, x1, "620", "D1", "G1", 1, 80, "29A"],
      [x0, x1, "620", "D1", "", 1, 80, "29A"],
    ]);
    expect(r.freshEvent.displayName).toBe("Nghe điện thoại");
  });

  it("có media ở cửa sổ tight -> dừng; gộp dòng gần thời điểm nhất vào freshEvent", async () => {
    detail.mockResolvedValueOnce({
      result: 0,
      alarms: [
        {
          fileUrl: "http://a.jpg",
          stm: stm + 5,
          sp: 450,
          alarmType: 621,
          position: "21.1,105.2",
        },
      ],
    });
    safe.mockResolvedValueOnce({
      result: 0,
      photos: [{ fileUrl: "http://a.jpg" }, { url: "http://b.mp4", stm }],
    });
    const r = await fetchEventEvidenceBundle(event);
    expect(r.allMediaUrls).toEqual(["http://a.jpg", "http://b.mp4"]);
    expect(r.evidenceDetails.map((d) => d._src)).toEqual([
      "alarmDetail_tight",
      "safetyEvidence_img_tight",
    ]);
    expect(detail).toHaveBeenCalledTimes(1);
    expect(safe).toHaveBeenCalledTimes(3);
    // có URL rồi -> không gọi queryAlarmEvidence lần 2 (guid rỗng)
    expect(alarmEv).toHaveBeenCalledTimes(1);
    expect(r.freshEvent).toMatchObject({ sp: 45, lat: 21.1, lng: 105.2 });
  });

  it("URL trực tiếp trên sự kiện (alarm_direct)", async () => {
    const r = await fetchEventEvidenceBundle({
      ...event,
      armUrl: "http://direct.jpg",
      begintime: "bt",
    });
    expect(r.evidenceDetails[0]).toMatchObject({
      url: "http://direct.jpg",
      time: "bt",
      _src: "alarm_direct",
    });
  });
});
