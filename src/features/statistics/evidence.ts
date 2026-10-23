import { api } from "../../shared/api/endpoints";
import { BASE_URL } from "../../shared/api/client";
import {
  findClosestAlarmRow,
  formatDt,
  getAlarmCode,
  getEventTimeSec,
  getViolationDisplayName,
  mergeRowIntoEvent,
  type AnyRow,
} from "./lib";

// Port events.js:953-1118 — thu thập ảnh/video bằng chứng khi mở modal sự kiện.

export type EvidenceDetail = {
  url: string;
  time?: unknown;
  type?: unknown;
  position?: unknown;
  speed?: unknown;
  row?: AnyRow;
  _src: string;
};

export type EvidenceBundle = {
  freshEvent: AnyRow;
  allMediaUrls: string[];
  evidenceDetails: EvidenceDetail[];
};

/** URL ảnh/video một dòng bằng chứng (querySafetyEvidence / queryAlarmEvidence). */
export function pickEvidenceRowUrl(m: unknown): string {
  if (!m || typeof m !== "object") return "";
  const r = m as AnyRow;
  const u =
    r.fileUrl ||
    r.file ||
    r.url ||
    r.path ||
    r.picPath ||
    r.imgUrl ||
    r.mediaUrl ||
    r.imageUrl ||
    r.armUrl ||
    r.downloadUrl ||
    r.pic ||
    "";
  if (u) return String(u).trim();
  const rel =
    r.filePath || r.imgPath || r.imagePath || r.evidencePath || r.FPath || "";
  if (rel && typeof rel === "string") {
    const t = rel.trim();
    if (t.startsWith("http")) return t;
    if (t.startsWith("/")) return `http://119.17.211.170:8080${t}`;
  }
  return "";
}

export function collectEvidenceArray(res: AnyRow | null | undefined): AnyRow[] {
  if (!res || (res.result !== 0 && res.result !== "0")) return [];
  const raw =
    res.photos ||
    res.medias ||
    res.infos ||
    res.media ||
    res.rows ||
    res.list ||
    res.data ||
    res.lst ||
    res.records ||
    res.evidence ||
    res.alarmInfolist ||
    [];
  return Array.isArray(raw) ? raw : [];
}

export async function pushEvidenceFromQuery(
  allMediaUrls: string[],
  evidenceDetails: EvidenceDetail[],
  fetcher: () => Promise<AnyRow>,
  label: string,
  onRow?: (m: AnyRow) => void,
): Promise<void> {
  try {
    const res = await fetcher();
    const rows = collectEvidenceArray(res);
    rows.forEach((m) => {
      const url = pickEvidenceRowUrl(m);
      if (url && !allMediaUrls.includes(url)) {
        allMediaUrls.push(url);
        evidenceDetails.push({
          url,
          time: m.fileTimeStr || m.fileTime || m.time || m.begintime || "",
          type: m.alarmType || m.ty || "",
          position: m.position || "",
          speed: m.speed || m.sp || "",
          row: m,
          _src: label,
        });
      }
      if (typeof onRow === "function") onRow(m);
    });
  } catch (e) {
    console.warn(`[Events] ${label}:`, e);
  }
}

// Đọc thẳng storage như bản gốc (sessionStorage trước, rồi localStorage), không qua session.getToken.
export const getAuthToken = (): string =>
  sessionStorage.getItem("dashcam_auth_token") ||
  localStorage.getItem("dashcam_auth_token") ||
  "";

export const proxyFleetMediaUrl = (rawUrl: string): string => {
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;
  const u = rawUrl.trim();
  if (u.startsWith("data:") || u.startsWith("blob:")) return u;
  if (
    u.includes("fleetscontrol.com") ||
    u.includes("808gps") ||
    u.startsWith("http")
  ) {
    const token = getAuthToken();
    if (token) {
      return `${BASE_URL}fleet-media-proxy?u=${encodeURIComponent(u)}&jsession=${encodeURIComponent(token)}`;
    }
  }
  return u;
};

/** Làm giàu sự kiện + thu thập ảnh/video từ Fleetcontrol (real-time khi mở modal). */
export async function fetchEventEvidenceBundle(
  event: AnyRow,
): Promise<EvidenceBundle> {
  const targetSec = getEventTimeSec(event);
  const baseMs = targetSec > 0 ? targetSec * 1000 : Date.now();
  const devId = String(event.did || event.devIdno || event.devId || "").trim();
  const vehiIdno = String(
    event.vehiIdno || event.vi || event.vehicleName || "",
  ).trim();
  const boxId = vehiIdno || devId;
  const alarmType = getAlarmCode(event);
  const evidenceGuid = String(
    event.guid || event.GUID || event.strGuid || event.alarmGuid || "",
  ).trim();

  let freshEvent = mergeRowIntoEvent({ ...event }, event);
  const allMediaUrls: string[] = [];
  const evidenceDetails: EvidenceDetail[] = [];

  const directUrl = pickEvidenceRowUrl(event);
  if (directUrl && !allMediaUrls.includes(directUrl)) {
    allMediaUrls.push(directUrl);
    evidenceDetails.push({
      url: directUrl,
      time: event.fileTimeStr || event.begintime || "",
      row: event,
      _src: "alarm_direct",
    });
  }

  const windows = [
    {
      start: new Date(baseMs - 2 * 60 * 1000),
      end: new Date(baseMs + 2 * 60 * 1000),
      label: "tight",
    },
    {
      start: new Date(baseMs - 10 * 60 * 1000),
      end: new Date(baseMs + 10 * 60 * 1000),
      label: "mid",
    },
    {
      start: new Date(baseMs - 30 * 60 * 1000),
      end: new Date(baseMs + 30 * 60 * 1000),
      label: "wide",
    },
  ];

  const onEvidenceRow = (m: AnyRow) => {
    const merged = mergeRowIntoEvent(freshEvent, m);
    if (targetSec > 0) {
      const t = getEventTimeSec(m);
      if (t && Math.abs(t - targetSec) <= 600) freshEvent = merged;
    } else {
      freshEvent = merged;
    }
  };

  for (const w of windows) {
    if (allMediaUrls.length > 0 && w.label !== "tight") break;
    const beginStr = formatDt(w.start);
    const endStr = formatDt(w.end);

    if (devId && alarmType) {
      try {
        const detailRes = (await api.queryAlarmDetail(
          devId,
          beginStr,
          endStr,
          alarmType,
          1,
          80,
        )) as AnyRow;
        const detailRows =
          detailRes?.alarms ||
          detailRes?.alarmsInfos ||
          detailRes?.alarmInfos ||
          detailRes?.datas ||
          [];
        if (Array.isArray(detailRows)) {
          detailRows.forEach((m: AnyRow) => {
            const url = pickEvidenceRowUrl(m);
            if (url && !allMediaUrls.includes(url)) {
              allMediaUrls.push(url);
              evidenceDetails.push({
                url,
                time: m.fileTimeStr || m.begintime || m.alarmTime || "",
                type: m.alarmType || m.ty || "",
                position: m.position || "",
                speed: m.speed || m.sp || "",
                row: m,
                _src: `alarmDetail_${w.label}`,
              });
            }
            onEvidenceRow(m);
          });
          const closest = findClosestAlarmRow(detailRows, targetSec);
          if (closest) freshEvent = mergeRowIntoEvent(freshEvent, closest);
        }
      } catch (e) {
        console.warn(`[Events] alarmDetail_${w.label}:`, e);
      }
    }

    await pushEvidenceFromQuery(
      allMediaUrls,
      evidenceDetails,
      () =>
        api.performanceReportPhotoListSafe(
          beginStr,
          endStr,
          alarmType,
          "0",
          boxId,
          devId,
        ),
      `safetyEvidence_img_${w.label}`,
      onEvidenceRow,
    );
    await pushEvidenceFromQuery(
      allMediaUrls,
      evidenceDetails,
      () =>
        api.performanceReportPhotoListSafe(
          beginStr,
          endStr,
          alarmType,
          "1",
          boxId,
          devId,
        ),
      `safetyEvidence_vid_${w.label}`,
      onEvidenceRow,
    );

    // Bản gốc kiểm tra `typeof ApiModule.queryAlarmEvidence === 'function'` — luôn đúng.
    await pushEvidenceFromQuery(
      allMediaUrls,
      evidenceDetails,
      () =>
        api.queryAlarmEvidence(
          beginStr,
          endStr,
          alarmType,
          devId,
          evidenceGuid,
          1,
          80,
          boxId,
        ),
      `alarmEvidence_${w.label}`,
      onEvidenceRow,
    );
    if (!allMediaUrls.length) {
      await pushEvidenceFromQuery(
        allMediaUrls,
        evidenceDetails,
        () =>
          api.queryAlarmEvidence(
            beginStr,
            endStr,
            alarmType,
            devId,
            "",
            1,
            80,
            boxId,
          ),
        `alarmEvidence_all_${w.label}`,
        onEvidenceRow,
      );
    }

    if (vehiIdno && boxId !== devId) {
      await pushEvidenceFromQuery(
        allMediaUrls,
        evidenceDetails,
        () =>
          api.performanceReportPhotoListSafe(
            beginStr,
            endStr,
            alarmType,
            "0",
            vehiIdno,
            "",
          ),
        `safetyEvidence_vehi_${w.label}`,
        onEvidenceRow,
      );
    }
  }

  if (targetSec > 0 && evidenceDetails.length) {
    let best = evidenceDetails[0];
    let bestDiff = Infinity;
    evidenceDetails.forEach((d) => {
      const t = getEventTimeSec(d.row || {});
      if (!t) return;
      const diff = Math.abs(t - targetSec);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = d;
      }
    });
    if (best.row) freshEvent = mergeRowIntoEvent(freshEvent, best.row);
  }

  freshEvent.displayName = getViolationDisplayName(freshEvent);
  return { freshEvent, allMediaUrls, evidenceDetails };
}

/** Phần phân loại video của renderEvidenceMediaHtml. */
export function isVideoEvidenceUrl(url: string): boolean {
  const rawU = String(url).toLowerCase();
  return (
    rawU.endsWith(".mp4") ||
    rawU.endsWith(".avi") ||
    rawU.endsWith(".mov") ||
    rawU.endsWith(".webm") ||
    rawU.includes("mediatype=2")
  );
}
