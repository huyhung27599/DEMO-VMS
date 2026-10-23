import {
  BASE_URL,
  clearSecurityContext,
  fetchApi,
  refreshCsrfToken,
} from "./client";
import type { ApiResponse } from "./client";
import { fetchUpstream } from "./upstream";

type Params = Record<string, unknown>;
type Id = string | number;

export async function login(
  account: string,
  password: string,
): Promise<ApiResponse> {
  return fetchApi(
    "StandardApiAction_login.action",
    {
      account: account,
      password: password,
    },
    "POST",
  );
}

export async function logout(): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_logout.action", {}, "POST");
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<ApiResponse> {
  // Đổi mật khẩu dùng phiên đăng nhập hiện tại (requireAuth ở backend)
  return fetchApi(
    "StandardApiAction_changePassword.action",
    {
      oldPassword: oldPassword,
      newPassword: newPassword,
    },
    "POST",
  );
}

export async function getUpstreamSession(): Promise<ApiResponse> {
  return fetchApi("upstream-session");
}
export async function getUpstreamLoginServer(): Promise<ApiResponse> {
  return fetchApi("upstream-login-server");
}

export async function queryUserVehicle(): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_queryUserVehicle.action", {
    language: "en",
  });
}

export async function getDeviceByVehicle(
  vehiIdno: string = "",
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_getDeviceByVehicle.action", { vehiIdno });
}

export async function getDeviceOlStatus(
  devIdno: string = "",
  vehiIdno: string = "",
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_getDeviceOlStatus.action", {
    devIdno: devIdno,
    vehiIdno: vehiIdno,
  });
}

export async function getDeviceStatus(
  devIdno: string = "",
  vehiIdno: string = "",
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_getDeviceStatus.action", {
    devIdno: devIdno,
    vehiIdno: vehiIdno,
    toMap: 1,
  });
}

export async function runMileage(
  vehiIdno: string,
  begintime: string,
  endtime: string,
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_runMileage.action", {
    vehiIdno,
    begintime,
    endtime,
  });
}

export async function queryVehicleParked(
  vehiIdno: string,
  begintime: string,
  endtime: string,
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_queryVehicleParked.action", {
    vehiIdno,
    begintime,
    endtime,
    toMap: 2,
  });
}

export async function queryVehicleLatestLocation(
  devIdno: string = "",
  vehiIdno: string = "",
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_queryVehicleLatestLocation.action", {
    devIdno,
    vehiIdno,
    toMap: 2,
  });
}

// Backend validator currently enforces pageRecords <= 500
export async function queryTrackDetail(
  devIdno: string,
  begintime: string,
  endtime: string,
  currentPage: number = 1,
  pageRecords: number | string = 500,
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_queryTrackDetail.action", {
    devIdno: devIdno,
    begintime: begintime,
    endtime: endtime,
    currentPage: currentPage,
    pageRecords: Math.min(
      500,
      Math.max(1, parseInt(String(pageRecords || 500))),
    ),
    toMap: 1,
  });
}

export async function queryAlarmDetail(
  devIdno: string,
  begintime: string,
  endtime: string,
  armType: Id,
  currentPage: number = 1,
  pageRecords: number = 100,
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_queryAlarmDetail.action", {
    devIdno: devIdno,
    begintime: begintime,
    endtime: endtime,
    armType: armType,
    currentPage: currentPage,
    pageRecords: pageRecords,
    toMap: 1,
  });
}

export async function vehicleAlarm(devIdno: string = ""): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_vehicleAlarm.action", {
    DevIDNO: devIdno,
    toMap: 2,
  });
}

export async function querySafetyAlarm(
  begintime: string,
  endtime: string,
  alarmType: Id,
  devIdno: string = "",
  currentPage: number = 1,
  pageRecords: number = 20,
): Promise<ApiResponse> {
  // Note: The upstream API documentation uses querySafetyAlarm,
  // but some implementations might use queryAlarmDetail or similar.
  // Based on the 404 error, we ensure the backend route matches.
  return fetchApi("StandardApiAction_querySafetyAlarm.action", {
    begintime,
    endtime,
    alarmType,
    devIdno,
    currentPage,
    pageRecords,
    toMap: 2,
  });
}

export async function queryIdentifyAlarm(
  begintime: string,
  endtime: string,
  devIdno: string = "",
  currentPage: number = 1,
  pageRecords: number = 50,
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_queryIdentifyAlarm.action", {
    begintime,
    endtime,
    devIdno,
    currentPage,
    pageRecords,
    toMap: 2,
  });
}

// Doc ref only: http://119.17.211.170:8080/808gps/open/webApi.html#sec-findDriverInfoByDeviceId
export async function findDriverInfoByDeviceId(
  devIdno: string = "",
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_findDriverInfoByDeviceId.action", {
    devIdno,
  });
}

export async function findVehicleInfoByDeviceJn(
  type: Id = 2,
  content: string = "",
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_findVehicleInfoByDeviceJn.action", {
    type,
    content,
  });
}

export async function findVehicleInfoByDeviceId(
  devIdno: string = "",
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_findVehicleInfoByDeviceId.action", {
    devIdno,
  });
}

// Start/Stop realtime video stream on device (required before getting HLS address on many devices)
// type: 1=start, 0=stop
export async function realTimeVideo(
  devIdno: string,
  channelId: Id,
  type: number = 1,
  streamType: number = 1,
  Sec: number = 300,
  closeTime: string = "",
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_sendRealTimeVideo.action", {
    DevIDNO: devIdno,
    Chn: channelId,
    type,
    streamType,
    Sec,
    closeTime,
  });
}

export async function getLiveVideoHtml(
  devIdno: string,
  channelId: Id,
  language: string = "en",
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_getLiveVideoHtml.action", {
    devIdno,
    channelId,
    language,
  });
}

export async function getLiveVideoAddress(
  devIdno: string,
  channelId: Id,
  streamType: number = 1,
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_getLiveVideoAddress.action", {
    devIdno,
    channelId,
    streamType,
  });
}

export async function getVideoInitH5(
  devIdno: string,
  channelId: Id,
  streamType: number = 1,
  playType: number = 0,
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_getVideoInitH5.action", {
    DevIDNO: devIdno,
    channelId,
    streamType,
    playType,
  });
}

export async function getPlaybackVideoHtml(
  devIdno: string,
  channelId: Id,
  begintime: string,
  endtime: string,
  language: string = "en",
  streamType: number | undefined = undefined,
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_getPlaybackVideoHtml.action", {
    devIdno,
    channelId,
    begintime,
    endtime,
    language,
    ...(streamType !== undefined ? { streamType } : {}),
  });
}

export async function getPlaybackVideoH5(
  devIdno: string,
  channelId: Id,
  begintime: string,
  endtime: string,
  streamType: number | undefined = undefined,
  dataType: number = 1,
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_getPlaybackVideoH5.action", {
    devIdno,
    channelId,
    begintime,
    endtime,
    dataType,
    ...(streamType !== undefined ? { streamType } : {}),
  });
}

export async function queryRecVideo(
  devIdno: string,
  channelId: Id,
  begintime: string,
  endtime: string,
  streamType: number | undefined = undefined,
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_queryRecVideo.action", {
    devIdno,
    channelId,
    begintime,
    endtime,
    ...(streamType !== undefined ? { streamType } : {}),
  });
}

export async function sendRecordVideo(
  devIdno: string,
  channelId: Id,
  begintime: string,
  endtime: string,
  type: number = 1,
  streamType: number = 1,
  playType: number = 0,
  LOC: number = 2,
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_sendRecordVedio.action", {
    DevIDNO: devIdno,
    Chn: channelId,
    begintime,
    endtime,
    type,
    streamType,
    playType,
    LOC,
  });
}

export async function getPlaybackVideoAddress(
  devIdno: string,
  channelId: Id,
  begintime: string,
  endtime: string,
  streamType: number = 1,
  dataType: number = 1,
  playType: number = 0,
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_getPlaybackVideoAddress.action", {
    devIdno,
    channelId,
    begintime,
    endtime,
    streamType,
    dataType,
    playType,
  });
}

export async function queryRecVideoHistory(
  devIdno: string,
  begintime: string,
  endtime: string,
  channelId: Id | undefined = undefined,
  streamType: number | undefined = undefined,
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_queryRecVideoHistory.action", {
    devIdno,
    begintime,
    endtime,
    ...(channelId !== undefined ? { channelId } : {}),
    ...(streamType !== undefined ? { streamType } : {}),
  });
}

// Truy vấn bằng chứng sự kiện vi phạm (hình ảnh/video gốc)
// Doc ref: http://119.17.211.170:8080/808gps/open/webApi.html#sec-query-alarmEvidence
export async function queryAlarmEvidence(
  begintime: string,
  endtime: string,
  alarmType: Id | null = "",
  devIdno: string = "",
  guid: string = "",
  currentPage: number = 1,
  pageRecords: number = 20,
  vehiIdno: string = "",
): Promise<ApiResponse> {
  const payload: Params = {
    begintime,
    endtime,
    currentPage,
    pageRecords,
    toMap: 2,
  };
  if (alarmType !== undefined && alarmType !== null && String(alarmType) !== "")
    payload.alarmType = alarmType;
  if (devIdno) payload.devIdno = devIdno;
  if (vehiIdno) payload.vehiIdno = vehiIdno;
  if (guid) payload.guid = guid;
  return fetchApi("StandardApiAction_queryAlarmEvidence.action", payload);
}

export async function sendImgCapture(
  devIdno: string,
  channelId: Id,
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_sendImgCapture.action", {
    DevIDNO: devIdno,
    Chn: channelId,
  });
}

export async function queryImgCapture(
  devIdno: string,
  begintime: string,
  endtime: string,
  channelId: Id = "",
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_queryImgCapture.action", {
    devIdno,
    begintime,
    endtime,
    channelId,
  });
}

export async function queryPhoto(
  devIdno: string,
  begintime: string,
  endtime: string,
  channelId: Id = "",
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_queryPhoto.action", {
    devIdno,
    begintime,
    endtime,
    channelId,
  });
}

// API #43: Security Evidence Inquiry (querySafetyEvidence)
// Route backend: StandardApiAction_querySafetyEvidence.action
// Sample: ?begintime=...&endtime=...&alarmType=605&mediaType=0&toMap=2&vehiIdno=30009
export async function performanceReportPhotoListSafe(
  begintime: string,
  endtime: string,
  alarmType: Id,
  mediaType: Id,
  vehiIdno: string = "",
  devIdno: string = "",
): Promise<ApiResponse> {
  const payload: Params = {
    begintime,
    endtime,
    alarmType,
    mediaType,
    vehiIdno,
    toMap: 2,
  };
  if (devIdno) payload.devIdno = devIdno;
  return fetchApi("StandardApiAction_querySafetyEvidence.action", payload);
}

/* Helper function: AI Evidence retrieval flow
 * Gọi querySafetyEvidence (API #43) trực tiếp bằng vehiIdno (biển số xe)
 */
export async function fetchAiEvidenceFlow(
  vehiIdno: string,
  begintime: string,
  endtime: string,
  alarmType: Id,
  mediaType: Id,
): Promise<ApiResponse> {
  return performanceReportPhotoListSafe(
    begintime,
    endtime,
    alarmType,
    mediaType,
    vehiIdno,
  );
}

// API Đồng bộ sự kiện AI nội bộ
export async function syncAiEventsLocal(
  devIdno: string = "",
  vehiIdno: string = "",
): Promise<ApiResponse> {
  return fetchApi("syncAiEventsLocal", { devIdno, vehiIdno });
}

export async function getLoadDeviceInfo(
  devIdno: string = "",
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_getLoadDeviceInfo.action", {
    devIdno,
  });
}

// ─── Driver Management APIs ────────────────────────────
export async function queryDriverList(
  dName: string = "",
): Promise<ApiResponse> {
  // Note: upstream API has typo "qurey" but we also register the correct spelling
  return fetchApi("StandardApiAction_queryDriverList.action", { dName });
}

export type DriverData = Record<string, unknown>;

const isOkOrExpired = (r: unknown): boolean =>
  r === 0 || r === "0" || r === 5 || r === "5";

export async function saveDriver(data: DriverData): Promise<ApiResponse> {
  // Standardize parameters for multiple upstream versions
  const normalizedData: DriverData = { ...data };
  if (data.name && !data.dn) normalizedData.dn = data.name;
  if (data.jobNum && !data.jn) normalizedData.jn = data.jobNum;
  if (data.contact) {
    if (!data.tp) normalizedData.tp = data.contact;
    if (!data.dt) normalizedData.dt = data.contact;
  }
  if (data.cardNumber) {
    if (!data.ic) normalizedData.ic = data.cardNumber;
    if (!data.cn) normalizedData.cn = data.cardNumber;
  }
  if (data.sex !== undefined && data.sx === undefined)
    normalizedData.sx = data.sex;
  if (data.birth && !data.bt) normalizedData.bt = data.birth;
  if (data.licenseNum) {
    if (!data.ln) normalizedData.ln = data.licenseNum;
    if (!data.drivelNum) normalizedData.drivelNum = data.licenseNum;
  }
  // Portrait Library (facePhotoUrl) should come from upload image interface return value.

  const primary = await fetchApi(
    "StandardApiAction_addDriverInfo.action",
    normalizedData,
    "POST",
  );
  if (primary && isOkOrExpired(primary.result)) {
    return primary;
  }

  const fallback = await fetchApi(
    "DriverAction_mergeDriver.action",
    normalizedData,
    "POST",
  );
  if (fallback && isOkOrExpired(fallback.result)) {
    return fallback;
  }

  if (
    fallback &&
    fallback.result !== undefined &&
    fallback.result !== null &&
    fallback.result !== 404 &&
    fallback.result !== "404"
  ) {
    return fallback;
  }
  return primary?.result !== undefined ? primary : fallback;
}

export async function mergeDriver(data: DriverData): Promise<ApiResponse> {
  return saveDriver(data);
}

export async function registerLocalDriver(
  jobNum: string,
  name: string,
  base64ImageOrImages: string | string[] | null = null,
): Promise<ApiResponse> {
  // Backward-compatible: có thể truyền base64Image (string) hoặc base64Images (string[])
  const payload: Params = { jobNum, name };
  if (Array.isArray(base64ImageOrImages)) {
    payload.base64Images = base64ImageOrImages;
  } else if (typeof base64ImageOrImages === "string" && base64ImageOrImages) {
    payload.base64Image = base64ImageOrImages;
  }
  return fetchApi("register-local-driver", payload, "POST");
}

export async function uploadDriverImagesUpstream({
  id = "",
  jobNum = "",
  name = "",
  base64Images = [],
}: {
  id?: Id;
  jobNum?: string;
  name?: string;
  base64Images?: string[];
} = {}): Promise<ApiResponse> {
  return fetchApi(
    "upload-driver-images",
    { id, jobNum, name, base64Images },
    "POST",
  );
}

export async function uploadDriverImageDirect(
  driverId: Id,
  base64Image: string,
): Promise<ApiResponse> {
  // Direct call to StandardApiAction_uploadDriverImage via proxy
  return fetchApi(
    "StandardApiAction_uploadDriverImage.action",
    {
      id: driverId,
      img: base64Image.replace(/^data:image\/\w+;base64,/, ""),
    },
    "POST",
  );
}

export async function deleteLocalDriver(
  jobNum: string,
  name: string = "",
): Promise<ApiResponse> {
  return fetchApi("delete-local-driver", { jobNum, name }, "POST");
}

// Xóa tài xế trên máy chủ GPS qua backend (thử lần lượt delDriverInfo / deleteDriverInfo / …)
export async function deleteDriver(
  id: Id,
  jn: string = "",
): Promise<ApiResponse> {
  const payload: Params = { id };
  if (jn) payload.jn = jn;
  return fetchApi("delete-driver", payload, "POST");
}

// ─── Face Recognition AI Service ───────────────────────
export async function faceHealth(): Promise<ApiResponse> {
  return fetchApi("face/health", {}, "GET");
}

export async function faceKnownFaces(): Promise<ApiResponse> {
  return fetchApi("face/known-faces", {}, "GET");
}

export async function faceRecognizeFromUrl(
  imageUrl: string,
  strict: boolean = false,
): Promise<ApiResponse> {
  return fetchApi("face/recognize", { imageUrl, strict }, "POST");
}

export async function faceCaptureAndRecognize(
  devIdno: string,
  channelId: Id = 0,
): Promise<ApiResponse> {
  return fetchApi("face/capture-and-recognize", { devIdno, channelId }, "POST");
}

export async function faceSyncDrivers(): Promise<ApiResponse> {
  return fetchApi("face/sync-drivers", {}, "POST");
}

export async function faceReloadDatabase(): Promise<ApiResponse> {
  return fetchApi("face/reload-database", {}, "POST");
}

/** Lưu một lần nhận diện (gọi sau mỗi chu kỳ ~10s từ LiveView) */
export async function saveFaceRecognitionLog(
  payload: Params,
): Promise<ApiResponse> {
  return fetchApi("face-recognition-log", payload, "POST");
}

/** Truy vấn nhật ký đã lưu (tab Sự kiện Face AI) */
export async function listFaceRecognitionLogs(
  begintime: string,
  endtime: string,
  opts: Params = {},
): Promise<ApiResponse> {
  return fetchApi(
    "face-recognition-log",
    { begintime, endtime, ...opts },
    "GET",
  );
}

// Bind/Unbind driver to vehicle
// Set driverId = 0 and cardNum = '' to unbind thoroughly
export async function bindDriver(
  devIdno: string,
  driverId: Id,
  cardNum: string = "",
): Promise<ApiResponse> {
  return fetchApi(
    "StandardApiAction_bindDriver.action",
    {
      devIdno,
      driverId,
      driverID: driverId,
      cardNum,
    },
    "POST",
  );
}

// ─── Vehicle Management APIs ────────────────────────────
export async function queryVehicleDeviceInfo(
  params: Params = {},
): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_queryUserVehicle.action", {
    ...params,
    language: "en",
  });
}

export async function addVehicle(data: Params): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_addVehicle.action", data, "POST");
}

export async function deleteVehicle(vehiIdno: string): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_delVehicle.action", { vehiIdno }, "POST");
}

export async function editVehicle(data: Params): Promise<ApiResponse> {
  // editDevice is used for vehicle editing in many 808gps implementations
  return fetchApi("StandardApiAction_editDevice.action", data, "POST");
}

export async function installVehicle(data: Params): Promise<ApiResponse> {
  return fetchApi("StandardApiAction_installVehicle.action", data, "POST");
}

export async function uninstallDevice(
  devIdno: string,
  vehiIdno?: string,
): Promise<ApiResponse> {
  return fetchApi(
    "StandardApiAction_uninstallDevice.action",
    vehiIdno ? { devIdno, vehiIdno } : { devIdno },
    "POST",
  );
}

// ─── Gọi thẳng 808gps (backend :4000 chưa có route) ─────
// Doc: http://119.17.211.170:8080/808gps/open/webApi.html
export async function findCompany(params: Params = {}): Promise<ApiResponse> {
  return fetchUpstream("StandardApiAction_findCompany.action", params);
}

export async function mergeCompany(params: Params): Promise<ApiResponse> {
  return fetchUpstream("StandardApiAction_mergeCompany.action", params);
}

export async function deleteCompany(id: Id): Promise<ApiResponse> {
  return fetchUpstream("StandardApiAction_deleteCompany.action", { id });
}

export async function findUserAccount(params: Params = {}): Promise<ApiResponse> {
  return fetchUpstream("StandardApiAction_findUserAccount.action", params);
}

export async function mergeUserAccount(params: Params): Promise<ApiResponse> {
  return fetchUpstream("StandardApiAction_mergeUserAccount.action", params);
}

export async function deleteUserAccount(id: Id): Promise<ApiResponse> {
  return fetchUpstream("StandardApiAction_deleteUserAccount.action", { id });
}

export async function findUserRole(params: Params = {}): Promise<ApiResponse> {
  return fetchUpstream("StandardApiAction_findUserRole.action", params);
}

export async function mergeUserRole(params: Params): Promise<ApiResponse> {
  return fetchUpstream("StandardApiAction_mergeUserRole.action", params);
}

export async function deleteUserRole(id: Id): Promise<ApiResponse> {
  return fetchUpstream("StandardApiAction_deleteUserRole.action", { id });
}

export async function addDevice(params: Params): Promise<ApiResponse> {
  return fetchUpstream("StandardApiAction_addDevice.action", params);
}

export async function deleteDevice(devIdno: string): Promise<ApiResponse> {
  return fetchUpstream("StandardApiAction_deleteDevice.action", { devIdno });
}

export async function parkDetail(
  vehiIdno: string,
  begintime: string,
  endtime: string,
  parkTime: number = 0,
): Promise<ApiResponse> {
  return fetchUpstream("StandardApiAction_parkDetail.action", {
    vehiIdno,
    begintime,
    endtime,
    parkTime,
    toMap: 2,
    currentPage: 1,
    pageRecords: 200,
  });
}

export async function loadSIMInfos(params: Params = {}): Promise<ApiResponse> {
  return fetchUpstream("StandardApiAction_loadSIMInfos.action", params);
}

export const api = {
  BASE_URL,
  login,
  logout,
  changePassword,
  getUpstreamSession,
  getUpstreamLoginServer,
  queryUserVehicle,
  getDeviceByVehicle,
  getDeviceOlStatus,
  getDeviceStatus,
  runMileage,
  queryVehicleParked,
  queryVehicleLatestLocation,
  queryTrackDetail,
  queryAlarmDetail,
  vehicleAlarm,
  querySafetyAlarm,
  queryIdentifyAlarm,
  queryDriverList,
  deleteDriver,
  saveDriver,
  mergeDriver,
  registerLocalDriver,
  uploadDriverImagesUpstream,
  uploadDriverImageDirect,
  deleteLocalDriver,
  findDriverInfoByDeviceId,
  findVehicleInfoByDeviceJn,
  findVehicleInfoByDeviceId,
  realTimeVideo,
  getLiveVideoHtml,
  getLiveVideoAddress,
  getVideoInitH5,
  getPlaybackVideoHtml,
  getPlaybackVideoH5,
  queryRecVideo,
  queryRecVideoHistory,
  sendRecordVideo,
  getPlaybackVideoAddress,
  sendImgCapture,
  queryImgCapture,
  queryPhoto,
  performanceReportPhotoListSafe,
  fetchAiEvidenceFlow,
  queryAlarmEvidence,
  getLoadDeviceInfo,
  syncAiEventsLocal,
  // Security
  refreshCsrfToken,
  clearSecurityContext,
  // Face Recognition AI
  faceHealth,
  faceKnownFaces,
  faceRecognizeFromUrl,
  faceCaptureAndRecognize,
  faceSyncDrivers,
  faceReloadDatabase,
  saveFaceRecognitionLog,
  listFaceRecognitionLogs,
  bindDriver,
  // Vehicle Management
  queryVehicleDeviceInfo,
  addVehicle,
  deleteVehicle,
  editVehicle,
  installVehicle,
  uninstallDevice,
  // 808gps trực tiếp
  findCompany,
  mergeCompany,
  deleteCompany,
  findUserAccount,
  mergeUserAccount,
  deleteUserAccount,
  findUserRole,
  mergeUserRole,
  deleteUserRole,
  addDevice,
  deleteDevice,
  loadSIMInfos,
  parkDetail,
};
