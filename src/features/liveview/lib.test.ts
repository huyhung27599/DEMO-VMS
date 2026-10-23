import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDriverInfoFromListRow,
  extractDriverCode,
  extractUrlFromLiveHtmlResponse,
  formatDriverName,
  getDurationString,
  normalizeDriverInfo,
  pickFirst,
} from "./lib";

const PLAYER =
  "http://119.17.211.170:8080/808gps/open/player/RealPlayVideo.html?jsession=abc&PlateNum=51A";

describe("extractUrlFromLiveHtmlResponse", () => {
  it.each([
    ["rỗng / null", null, ""],
    ["chuỗi chính là URL hợp lệ (trim)", `  ${PLAYER}  `, PLAYER],
    [
      "HTML chứa URL player: cả chuỗi HTML hợp lệ theo isValidExternalUrl -> trả nguyên HTML (bug gốc)",
      `<iframe src="${PLAYER}"></iframe>`,
      `<iframe src="${PLAYER}"></iframe>`,
    ],
    [
      "nhánh regex: HTML có chữ localhost (cả chuỗi bị loại) -> URL player đầu tiên",
      `<!-- localhost --><script src="https://cdn.example.com/a.js"></script><iframe src="${PLAYER}"></iframe>`,
      PLAYER,
    ],
    [
      'nhánh regex: HTML bắt đầu bằng "/" -> URL player',
      `/x <a href='${PLAYER}'>`,
      PLAYER,
    ],
    [
      "HTML chỉ có URL localhost -> rỗng",
      '<a href="http://localhost:4000/808gps/x">x</a>',
      "",
    ],
    ["HTML không có URL", "<div>no url</div>", ""],
    ["object: res.url hợp lệ", { result: 0, url: PLAYER }, PLAYER],
    [
      "object: bỏ url cùng origin (bắt đầu bằng /), lấy res.playUrl",
      { url: "/808gps/x", playUrl: PLAYER },
      PLAYER,
    ],
    [
      "object: res.html chứa iframe -> trả nguyên HTML (bug gốc)",
      { result: 0, html: `<iframe src='${PLAYER}'></iframe>` },
      `<iframe src='${PLAYER}'></iframe>`,
    ],
    [
      "object: res.html có localhost -> nhánh regex lấy URL player",
      { html: `localhost <iframe src='${PLAYER}'>` },
      PLAYER,
    ],
    [
      "object: domain 808gps khác",
      { file: "http://video.808gps.net/play" },
      "http://video.808gps.net/play",
    ],
    [
      "object: URL ngoài nhưng không phải player -> rỗng",
      { url: "https://example.com/live" },
      "",
    ],
    [
      "object: 127.0.0.1 -> rỗng",
      { url: "http://127.0.0.1/RealPlayVideo.html" },
      "",
    ],
  ])("%s", (_name, input, expected) => {
    expect(extractUrlFromLiveHtmlResponse(input)).toBe(expected);
  });

  it("bỏ URL cùng origin với trang (tránh iframe lồng chính dashboard)", () => {
    expect(
      extractUrlFromLiveHtmlResponse(
        `${window.location.origin}/808gps/RealPlayVideo.html`,
      ),
    ).toBe("");
  });
});

describe("pickFirst", () => {
  it.each([
    [null, ["a"], ""],
    [{}, ["a"], ""],
    [{ a: "  x " }, ["a"], "x"],
    [
      { a: "", b: "   ", c: null, d: undefined, e: 0 },
      ["a", "b", "c", "d", "e"],
      "0",
    ],
    [{ a: "first", b: "second" }, ["b", "a"], "second"],
    [{ a: 12 }, ["a"], "12"],
  ])("pickFirst(%j, %j) = %j", (obj, keys, expected) => {
    expect(pickFirst(obj, keys)).toBe(expected);
  });
});

describe("normalizeDriverInfo", () => {
  it.each([
    ["null", null, null],
    ["result khác 0", { result: 1, driver: { name: "A" } }, null],
    [
      'result "0" (chuỗi) -> null (so sánh ===)',
      { result: "0", driver: { name: "A" } },
      null,
    ],
    [
      "driver object",
      {
        result: 0,
        driver: {
          name: " Nguyễn A ",
          driverJn: "8899",
          phone: "0901",
          companyName: "GEIC",
        },
      },
      {
        name: "Nguyễn A",
        license: "8899",
        phone: "0901",
        company: "GEIC",
        avatar: "",
      },
    ],
    [
      'data là mảng -> phần tử đầu; avatar tương đối có "/"',
      {
        result: 0,
        data: [{ dName: "B", facePhotoUrl: "/img/a.jpg;/img/b.jpg" }],
      },
      {
        name: "B",
        license: "",
        phone: "",
        company: "",
        avatar: "http://119.17.211.170:8080/img/a.jpg",
      },
    ],
    [
      'avatar tương đối không "/"',
      { result: 0, info: { realName: "C", photoUrl: " ; img/c.jpg" } },
      {
        name: "C",
        license: "",
        phone: "",
        company: "",
        avatar: "http://119.17.211.170:8080/img/c.jpg",
      },
    ],
    [
      "avatar tuyệt đối giữ nguyên; dùng chính apiRes khi không có driver/info/data",
      { result: 0, mobile: "0912", avatar: "http://x/y.jpg" },
      {
        name: "",
        license: "",
        phone: "0912",
        company: "",
        avatar: "http://x/y.jpg",
      },
    ],
    [
      "chỉ có avatar -> null",
      { result: 0, driver: { avatar: "http://x/y.jpg" } },
      null,
    ],
    ["data là mảng rỗng -> null", { result: 0, data: [] }, null],
  ])("%s", (_name, input, expected) => {
    expect(normalizeDriverInfo(input)).toEqual(expected);
  });
});

describe("getDurationString", () => {
  afterEach(() => vi.useRealTimers());
  it.each([
    ["0 ms", 0, "00:00:00"],
    ["999 ms", 999, "00:00:00"],
    ["1 s", 1000, "00:00:01"],
    ["59 s", 59_000, "00:00:59"],
    ["1 phút 5 s", 65_000, "00:01:05"],
    ["1 giờ", 3_600_000, "01:00:00"],
    ["25 giờ 1 phút 1 s", 90_061_000, "25:01:01"],
    ["startTime ở tương lai -> 0", -5000, "00:00:00"],
  ])("%s", (_label, elapsed, expected) => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000_000);
    expect(getDurationString(1_000_000_000 - elapsed)).toBe(expected);
  });
});

describe("formatDriverName", () => {
  it.each([
    [null, "Chưa nhận dạng"],
    ["", "Chưa nhận dạng"],
    ["8899_Nguyễn_Văn_Trường", "Nguyễn Văn Trường (8899)"],
    ["8899__Nguyen_A", "Nguyen A (8899)"],
    ["Nguyen_Van_A", "Nguyen Van A"],
    ["  Tran B  ", "Tran B"],
    ["8899", "8899"],
  ])("%s -> %s", (raw, expected) => {
    expect(formatDriverName(raw)).toBe(expected);
  });
});

describe("extractDriverCode", () => {
  it.each([
    [undefined, ""],
    ["", ""],
    ["Nguyễn Văn Trường (8899)", "8899"],
    ["Nguyen A ( 77 )  ", "77"],
    ["8899_Nguyen_A", "8899"],
    ["8899", "8899"],
    ["Unknown", ""],
    ["Ignored", ""],
  ])("%s -> %s", (raw, expected) => {
    expect(extractDriverCode(raw)).toBe(expected);
  });
});

describe("buildDriverInfoFromListRow", () => {
  it.each([
    ["null", null, null],
    [
      'dn/jn/dt + facePhotoUrl tương đối (";" phân tách)',
      {
        dn: "Nguyen A",
        jn: "8899",
        dt: "0901",
        facePhotoUrl: "/img/a.jpg; /img/b.jpg",
      },
      {
        name: "Nguyen A",
        license: "8899",
        phone: "0901",
        avatar: "http://119.17.211.170:8080/img/a.jpg",
      },
    ],
    [
      'tên dự phòng + đường dẫn không có "/"',
      { name: "B", driverJn: "J1", mobile: "09", facePhoto: "x/y.png" },
      {
        name: "B",
        license: "J1",
        phone: "09",
        avatar: "http://119.17.211.170:8080/x/y.png",
      },
    ],
    [
      "URL tuyệt đối giữ nguyên; license lấy id",
      { driverName: "C", id: 5, photoUrl: "https://cdn/x.jpg" },
      { name: "C", license: 5, phone: "", avatar: "https://cdn/x.jpg" },
    ],
    ["object rỗng", {}, { name: "", license: "", phone: "", avatar: "" }],
  ])("%s", (_label, row, expected) => {
    expect(buildDriverInfoFromListRow(row)).toEqual(expected);
  });
});
