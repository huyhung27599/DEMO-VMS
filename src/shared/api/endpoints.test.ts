import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./client', async (orig) => {
  const actual = await orig<typeof import('./client')>()
  return { ...actual, fetchApi: vi.fn(async () => ({ result: 0 })) }
})
vi.mock('./upstream', () => ({ fetchUpstream: vi.fn(async () => ({ result: 0 })) }))

import { fetchApi } from './client'
import { api } from './endpoints'
import { fetchUpstream } from './upstream'

const mocked = vi.mocked(fetchApi)

// Hard-copied from frontend/js/api.js:606 return block
const ORIGINAL_KEYS = [
  'BASE_URL',
  'login',
  'logout',
  'changePassword',
  'getUpstreamSession',
  'getUpstreamLoginServer',
  'queryUserVehicle',
  'getDeviceByVehicle',
  'getDeviceOlStatus',
  'getDeviceStatus',
  'runMileage',
  'queryVehicleParked',
  'queryVehicleLatestLocation',
  'queryTrackDetail',
  'queryAlarmDetail',
  'vehicleAlarm',
  'querySafetyAlarm',
  'queryIdentifyAlarm',
  'queryDriverList',
  'deleteDriver',
  'saveDriver',
  'mergeDriver',
  'registerLocalDriver',
  'uploadDriverImagesUpstream',
  'uploadDriverImageDirect',
  'deleteLocalDriver',
  'findDriverInfoByDeviceId',
  'findVehicleInfoByDeviceJn',
  'findVehicleInfoByDeviceId',
  'realTimeVideo',
  'getLiveVideoHtml',
  'getLiveVideoAddress',
  'getVideoInitH5',
  'getPlaybackVideoHtml',
  'getPlaybackVideoH5',
  'queryRecVideo',
  'queryRecVideoHistory',
  'sendRecordVideo',
  'getPlaybackVideoAddress',
  'sendImgCapture',
  'queryImgCapture',
  'queryPhoto',
  'performanceReportPhotoListSafe',
  'fetchAiEvidenceFlow',
  'queryAlarmEvidence',
  'getLoadDeviceInfo',
  'syncAiEventsLocal',
  'refreshCsrfToken',
  'clearSecurityContext',
  'faceHealth',
  'faceKnownFaces',
  'faceRecognizeFromUrl',
  'faceCaptureAndRecognize',
  'faceSyncDrivers',
  'faceReloadDatabase',
  'saveFaceRecognitionLog',
  'listFaceRecognitionLogs',
  'bindDriver',
  'queryVehicleDeviceInfo',
  'addVehicle',
  'deleteVehicle',
  'editVehicle',
  'installVehicle',
  'uninstallDevice',
]

const UPSTREAM_KEYS = [
  'findCompany',
  'mergeCompany',
  'deleteCompany',
  'findUserAccount',
  'mergeUserAccount',
  'deleteUserAccount',
  'findUserRole',
  'mergeUserRole',
  'deleteUserRole',
  'addDevice',
  'deleteDevice',
  'loadSIMInfos',
  'parkDetail',
]

type Case = [string, () => Promise<unknown>, string, Record<string, unknown> | undefined, string?]

const B = '2024-01-01 00:00:00'
const E = '2024-01-02 00:00:00'

const cases: Case[] = [
  ['login', () => api.login('a', 'p'), 'StandardApiAction_login.action', { account: 'a', password: 'p' }, 'POST'],
  ['logout', () => api.logout(), 'StandardApiAction_logout.action', {}, 'POST'],
  [
    'changePassword',
    () => api.changePassword('o', 'n'),
    'StandardApiAction_changePassword.action',
    { oldPassword: 'o', newPassword: 'n' },
    'POST',
  ],
  ['getUpstreamSession', () => api.getUpstreamSession(), 'upstream-session', undefined],
  ['getUpstreamLoginServer', () => api.getUpstreamLoginServer(), 'upstream-login-server', undefined],
  ['queryUserVehicle', () => api.queryUserVehicle(), 'StandardApiAction_queryUserVehicle.action', { language: 'en' }],
  [
    'getDeviceByVehicle',
    () => api.getDeviceByVehicle(),
    'StandardApiAction_getDeviceByVehicle.action',
    { vehiIdno: '' },
  ],
  [
    'getDeviceOlStatus',
    () => api.getDeviceOlStatus('d'),
    'StandardApiAction_getDeviceOlStatus.action',
    { devIdno: 'd', vehiIdno: '' },
  ],
  [
    'getDeviceStatus',
    () => api.getDeviceStatus('d', 'v'),
    'StandardApiAction_getDeviceStatus.action',
    { devIdno: 'd', vehiIdno: 'v', toMap: 1 },
  ],
  [
    'runMileage',
    () => api.runMileage('v', B, E),
    'StandardApiAction_runMileage.action',
    { vehiIdno: 'v', begintime: B, endtime: E },
  ],
  [
    'queryVehicleParked',
    () => api.queryVehicleParked('v', B, E),
    'StandardApiAction_queryVehicleParked.action',
    { vehiIdno: 'v', begintime: B, endtime: E, toMap: 2 },
  ],
  [
    'queryVehicleLatestLocation',
    () => api.queryVehicleLatestLocation('d'),
    'StandardApiAction_queryVehicleLatestLocation.action',
    { devIdno: 'd', vehiIdno: '', toMap: 2 },
  ],
  [
    'queryTrackDetail defaults',
    () => api.queryTrackDetail('d', B, E),
    'StandardApiAction_queryTrackDetail.action',
    { devIdno: 'd', begintime: B, endtime: E, currentPage: 1, pageRecords: 500, toMap: 1 },
  ],
  [
    'queryTrackDetail clamps high',
    () => api.queryTrackDetail('d', B, E, 2, 9999),
    'StandardApiAction_queryTrackDetail.action',
    { devIdno: 'd', begintime: B, endtime: E, currentPage: 2, pageRecords: 500, toMap: 1 },
  ],
  [
    'queryTrackDetail clamps low',
    () => api.queryTrackDetail('d', B, E, 1, -5),
    'StandardApiAction_queryTrackDetail.action',
    { devIdno: 'd', begintime: B, endtime: E, currentPage: 1, pageRecords: 1, toMap: 1 },
  ],
  [
    'queryTrackDetail zero -> 500',
    () => api.queryTrackDetail('d', B, E, 1, 0),
    'StandardApiAction_queryTrackDetail.action',
    { devIdno: 'd', begintime: B, endtime: E, currentPage: 1, pageRecords: 500, toMap: 1 },
  ],
  [
    'queryAlarmDetail',
    () => api.queryAlarmDetail('d', B, E, 7),
    'StandardApiAction_queryAlarmDetail.action',
    { devIdno: 'd', begintime: B, endtime: E, armType: 7, currentPage: 1, pageRecords: 100, toMap: 1 },
  ],
  ['vehicleAlarm', () => api.vehicleAlarm(), 'StandardApiAction_vehicleAlarm.action', { DevIDNO: '', toMap: 2 }],
  [
    'querySafetyAlarm',
    () => api.querySafetyAlarm(B, E, 9),
    'StandardApiAction_querySafetyAlarm.action',
    { begintime: B, endtime: E, alarmType: 9, devIdno: '', currentPage: 1, pageRecords: 20, toMap: 2 },
  ],
  [
    'queryIdentifyAlarm',
    () => api.queryIdentifyAlarm(B, E),
    'StandardApiAction_queryIdentifyAlarm.action',
    { begintime: B, endtime: E, devIdno: '', currentPage: 1, pageRecords: 50, toMap: 2 },
  ],
  [
    'findDriverInfoByDeviceId',
    () => api.findDriverInfoByDeviceId(),
    'StandardApiAction_findDriverInfoByDeviceId.action',
    { devIdno: '' },
  ],
  [
    'findVehicleInfoByDeviceJn',
    () => api.findVehicleInfoByDeviceJn(),
    'StandardApiAction_findVehicleInfoByDeviceJn.action',
    { type: 2, content: '' },
  ],
  [
    'findVehicleInfoByDeviceId',
    () => api.findVehicleInfoByDeviceId('d'),
    'StandardApiAction_findVehicleInfoByDeviceId.action',
    { devIdno: 'd' },
  ],
  [
    'realTimeVideo',
    () => api.realTimeVideo('d', 1),
    'StandardApiAction_sendRealTimeVideo.action',
    { DevIDNO: 'd', Chn: 1, type: 1, streamType: 1, Sec: 300, closeTime: '' },
  ],
  [
    'getLiveVideoHtml',
    () => api.getLiveVideoHtml('d', 1),
    'StandardApiAction_getLiveVideoHtml.action',
    { devIdno: 'd', channelId: 1, language: 'en' },
  ],
  [
    'getLiveVideoAddress',
    () => api.getLiveVideoAddress('d', 1),
    'StandardApiAction_getLiveVideoAddress.action',
    { devIdno: 'd', channelId: 1, streamType: 1 },
  ],
  [
    'getVideoInitH5',
    () => api.getVideoInitH5('d', 1),
    'StandardApiAction_getVideoInitH5.action',
    { DevIDNO: 'd', channelId: 1, streamType: 1, playType: 0 },
  ],
  [
    'getPlaybackVideoHtml no streamType',
    () => api.getPlaybackVideoHtml('d', 1, B, E),
    'StandardApiAction_getPlaybackVideoHtml.action',
    { devIdno: 'd', channelId: 1, begintime: B, endtime: E, language: 'en' },
  ],
  [
    'getPlaybackVideoHtml streamType',
    () => api.getPlaybackVideoHtml('d', 1, B, E, 'vi', 0),
    'StandardApiAction_getPlaybackVideoHtml.action',
    { devIdno: 'd', channelId: 1, begintime: B, endtime: E, language: 'vi', streamType: 0 },
  ],
  [
    'getPlaybackVideoH5 no streamType',
    () => api.getPlaybackVideoH5('d', 1, B, E),
    'StandardApiAction_getPlaybackVideoH5.action',
    { devIdno: 'd', channelId: 1, begintime: B, endtime: E, dataType: 1 },
  ],
  [
    'getPlaybackVideoH5 streamType',
    () => api.getPlaybackVideoH5('d', 1, B, E, 1, 2),
    'StandardApiAction_getPlaybackVideoH5.action',
    { devIdno: 'd', channelId: 1, begintime: B, endtime: E, dataType: 2, streamType: 1 },
  ],
  [
    'queryRecVideo no streamType',
    () => api.queryRecVideo('d', 1, B, E),
    'StandardApiAction_queryRecVideo.action',
    { devIdno: 'd', channelId: 1, begintime: B, endtime: E },
  ],
  [
    'queryRecVideo streamType',
    () => api.queryRecVideo('d', 1, B, E, 0),
    'StandardApiAction_queryRecVideo.action',
    { devIdno: 'd', channelId: 1, begintime: B, endtime: E, streamType: 0 },
  ],
  [
    'sendRecordVideo',
    () => api.sendRecordVideo('d', 1, B, E),
    'StandardApiAction_sendRecordVedio.action',
    { DevIDNO: 'd', Chn: 1, begintime: B, endtime: E, type: 1, streamType: 1, playType: 0, LOC: 2 },
  ],
  [
    'getPlaybackVideoAddress',
    () => api.getPlaybackVideoAddress('d', 1, B, E),
    'StandardApiAction_getPlaybackVideoAddress.action',
    { devIdno: 'd', channelId: 1, begintime: B, endtime: E, streamType: 1, dataType: 1, playType: 0 },
  ],
  [
    'queryRecVideoHistory bare',
    () => api.queryRecVideoHistory('d', B, E),
    'StandardApiAction_queryRecVideoHistory.action',
    { devIdno: 'd', begintime: B, endtime: E },
  ],
  [
    'queryRecVideoHistory full',
    () => api.queryRecVideoHistory('d', B, E, 2, 1),
    'StandardApiAction_queryRecVideoHistory.action',
    { devIdno: 'd', begintime: B, endtime: E, channelId: 2, streamType: 1 },
  ],
  [
    'queryAlarmEvidence bare',
    () => api.queryAlarmEvidence(B, E),
    'StandardApiAction_queryAlarmEvidence.action',
    { begintime: B, endtime: E, currentPage: 1, pageRecords: 20, toMap: 2 },
  ],
  [
    'queryAlarmEvidence full',
    () => api.queryAlarmEvidence(B, E, 0, 'd', 'g', 3, 5, 'v'),
    'StandardApiAction_queryAlarmEvidence.action',
    {
      begintime: B,
      endtime: E,
      currentPage: 3,
      pageRecords: 5,
      toMap: 2,
      alarmType: 0,
      devIdno: 'd',
      vehiIdno: 'v',
      guid: 'g',
    },
  ],
  [
    'sendImgCapture',
    () => api.sendImgCapture('d', 1),
    'StandardApiAction_sendImgCapture.action',
    { DevIDNO: 'd', Chn: 1 },
  ],
  [
    'queryImgCapture',
    () => api.queryImgCapture('d', B, E),
    'StandardApiAction_queryImgCapture.action',
    { devIdno: 'd', begintime: B, endtime: E, channelId: '' },
  ],
  [
    'queryPhoto',
    () => api.queryPhoto('d', B, E, 1),
    'StandardApiAction_queryPhoto.action',
    { devIdno: 'd', begintime: B, endtime: E, channelId: 1 },
  ],
  [
    'performanceReportPhotoListSafe bare',
    () => api.performanceReportPhotoListSafe(B, E, 605, 0),
    'StandardApiAction_querySafetyEvidence.action',
    { begintime: B, endtime: E, alarmType: 605, mediaType: 0, vehiIdno: '', toMap: 2 },
  ],
  [
    'performanceReportPhotoListSafe devIdno',
    () => api.performanceReportPhotoListSafe(B, E, 605, 0, 'v', 'd'),
    'StandardApiAction_querySafetyEvidence.action',
    { begintime: B, endtime: E, alarmType: 605, mediaType: 0, vehiIdno: 'v', toMap: 2, devIdno: 'd' },
  ],
  [
    'fetchAiEvidenceFlow',
    () => api.fetchAiEvidenceFlow('v', B, E, 605, 1),
    'StandardApiAction_querySafetyEvidence.action',
    { begintime: B, endtime: E, alarmType: 605, mediaType: 1, vehiIdno: 'v', toMap: 2 },
  ],
  ['syncAiEventsLocal', () => api.syncAiEventsLocal('d', 'v'), 'syncAiEventsLocal', { devIdno: 'd', vehiIdno: 'v' }],
  [
    'getLoadDeviceInfo',
    () => api.getLoadDeviceInfo(),
    'StandardApiAction_getLoadDeviceInfo.action',
    { devIdno: '' },
  ],
  ['queryDriverList', () => api.queryDriverList(), 'StandardApiAction_queryDriverList.action', { dName: '' }],
  [
    'registerLocalDriver none',
    () => api.registerLocalDriver('j', 'n'),
    'register-local-driver',
    { jobNum: 'j', name: 'n' },
    'POST',
  ],
  [
    'registerLocalDriver string',
    () => api.registerLocalDriver('j', 'n', 'img'),
    'register-local-driver',
    { jobNum: 'j', name: 'n', base64Image: 'img' },
    'POST',
  ],
  [
    'registerLocalDriver empty string',
    () => api.registerLocalDriver('j', 'n', ''),
    'register-local-driver',
    { jobNum: 'j', name: 'n' },
    'POST',
  ],
  [
    'registerLocalDriver array',
    () => api.registerLocalDriver('j', 'n', ['a', 'b']),
    'register-local-driver',
    { jobNum: 'j', name: 'n', base64Images: ['a', 'b'] },
    'POST',
  ],
  [
    'uploadDriverImagesUpstream defaults',
    () => api.uploadDriverImagesUpstream(),
    'upload-driver-images',
    { id: '', jobNum: '', name: '', base64Images: [] },
    'POST',
  ],
  [
    'uploadDriverImagesUpstream args',
    () => api.uploadDriverImagesUpstream({ id: '1', jobNum: 'j', name: 'n', base64Images: ['x'] }),
    'upload-driver-images',
    { id: '1', jobNum: 'j', name: 'n', base64Images: ['x'] },
    'POST',
  ],
  [
    'uploadDriverImageDirect strips data URL prefix',
    () => api.uploadDriverImageDirect(5, 'data:image/png;base64,AAA'),
    'StandardApiAction_uploadDriverImage.action',
    { id: 5, img: 'AAA' },
    'POST',
  ],
  [
    'deleteLocalDriver',
    () => api.deleteLocalDriver('j'),
    'delete-local-driver',
    { jobNum: 'j', name: '' },
    'POST',
  ],
  ['deleteDriver no jn', () => api.deleteDriver(3), 'delete-driver', { id: 3 }, 'POST'],
  ['deleteDriver jn', () => api.deleteDriver(3, 'J'), 'delete-driver', { id: 3, jn: 'J' }, 'POST'],
  ['faceHealth', () => api.faceHealth(), 'face/health', {}, 'GET'],
  ['faceKnownFaces', () => api.faceKnownFaces(), 'face/known-faces', {}, 'GET'],
  [
    'faceRecognizeFromUrl',
    () => api.faceRecognizeFromUrl('u'),
    'face/recognize',
    { imageUrl: 'u', strict: false },
    'POST',
  ],
  [
    'faceCaptureAndRecognize',
    () => api.faceCaptureAndRecognize('d'),
    'face/capture-and-recognize',
    { devIdno: 'd', channelId: 0 },
    'POST',
  ],
  ['faceSyncDrivers', () => api.faceSyncDrivers(), 'face/sync-drivers', {}, 'POST'],
  ['faceReloadDatabase', () => api.faceReloadDatabase(), 'face/reload-database', {}, 'POST'],
  [
    'saveFaceRecognitionLog',
    () => api.saveFaceRecognitionLog({ a: 1 }),
    'face-recognition-log',
    { a: 1 },
    'POST',
  ],
  [
    'listFaceRecognitionLogs',
    () => api.listFaceRecognitionLogs(B, E, { limit: 10 }),
    'face-recognition-log',
    { begintime: B, endtime: E, limit: 10 },
    'GET',
  ],
  [
    'bindDriver',
    () => api.bindDriver('d', 0),
    'StandardApiAction_bindDriver.action',
    { devIdno: 'd', driverId: 0, driverID: 0, cardNum: '' },
    'POST',
  ],
  [
    'queryVehicleDeviceInfo',
    () => api.queryVehicleDeviceInfo({ a: 1, language: 'vi' }),
    'StandardApiAction_queryUserVehicle.action',
    { a: 1, language: 'en' },
  ],
  ['addVehicle', () => api.addVehicle({ x: 1 }), 'StandardApiAction_addVehicle.action', { x: 1 }, 'POST'],
  [
    'deleteVehicle',
    () => api.deleteVehicle('v'),
    'StandardApiAction_delVehicle.action',
    { vehiIdno: 'v' },
    'POST',
  ],
  ['editVehicle', () => api.editVehicle({ x: 1 }), 'StandardApiAction_editDevice.action', { x: 1 }, 'POST'],
  [
    'installVehicle',
    () => api.installVehicle({ x: 1 }),
    'StandardApiAction_installVehicle.action',
    { x: 1 },
    'POST',
  ],
  [
    'uninstallDevice',
    () => api.uninstallDevice('d'),
    'StandardApiAction_uninstallDevice.action',
    { devIdno: 'd' },
    'POST',
  ],
  [
    'uninstallDevice vehiIdno',
    () => api.uninstallDevice('d', 'v'),
    'StandardApiAction_uninstallDevice.action',
    { devIdno: 'd', vehiIdno: 'v' },
    'POST',
  ],
]

beforeEach(() => {
  mocked.mockReset()
  mocked.mockResolvedValue({ result: 0 })
})

describe('api surface', () => {
  it('has exactly the keys of the original return block', () => {
    expect(Object.keys(api).sort()).toEqual([...ORIGINAL_KEYS, ...UPSTREAM_KEYS].sort())
  })
  it('does not expose getSecurityContext', () => {
    expect('getSecurityContext' in api).toBe(false)
  })
})

describe('api endpoints call fetchApi like the original', () => {
  it.each(cases)('%s', async (_name, call, action, params, method) => {
    await call()
    expect(mocked).toHaveBeenCalledTimes(1)
    const args = mocked.mock.calls[0]
    expect(args[0]).toBe(action)
    expect(args[1]).toEqual(params)
    expect(args[2]).toBe(method)
  })
})

describe('808gps direct endpoints call fetchUpstream', () => {
  const up = vi.mocked(fetchUpstream)
  it.each<[string, () => Promise<unknown>, string, Record<string, unknown>]>([
    ['findCompany', () => api.findCompany({ id: 1 }), 'StandardApiAction_findCompany.action', { id: 1 }],
    ['mergeCompany', () => api.mergeCompany({ name: 'n' }), 'StandardApiAction_mergeCompany.action', { name: 'n' }],
    ['deleteCompany', () => api.deleteCompany(1), 'StandardApiAction_deleteCompany.action', { id: 1 }],
    ['findUserAccount', () => api.findUserAccount(), 'StandardApiAction_findUserAccount.action', {}],
    ['mergeUserAccount', () => api.mergeUserAccount({ account: 'a' }), 'StandardApiAction_mergeUserAccount.action', { account: 'a' }],
    ['deleteUserAccount', () => api.deleteUserAccount(2), 'StandardApiAction_deleteUserAccount.action', { id: 2 }],
    ['findUserRole', () => api.findUserRole(), 'StandardApiAction_findUserRole.action', {}],
    ['mergeUserRole', () => api.mergeUserRole({ name: 'r' }), 'StandardApiAction_mergeUserRole.action', { name: 'r' }],
    ['deleteUserRole', () => api.deleteUserRole(3), 'StandardApiAction_deleteUserRole.action', { id: 3 }],
    ['addDevice', () => api.addDevice({ devIdno: 'd' }), 'StandardApiAction_addDevice.action', { devIdno: 'd' }],
    ['deleteDevice', () => api.deleteDevice('d'), 'StandardApiAction_deleteDevice.action', { devIdno: 'd' }],
    ['loadSIMInfos', () => api.loadSIMInfos(), 'StandardApiAction_loadSIMInfos.action', {}],
    [
      'parkDetail',
      () => api.parkDetail('v', 'b', 'e'),
      'StandardApiAction_parkDetail.action',
      { vehiIdno: 'v', begintime: 'b', endtime: 'e', parkTime: 0, toMap: 2, currentPage: 1, pageRecords: 200 },
    ],
  ])('%s', async (_n, call, action, params) => {
    up.mockClear()
    await call()
    expect(up).toHaveBeenCalledWith(action, params)
    expect(mocked).not.toHaveBeenCalled()
  })
})

describe('saveDriver', () => {
  const ok = { result: 0 }
  it('normalizes fields and returns primary on success', async () => {
    mocked.mockResolvedValueOnce(ok)
    const r = await api.saveDriver({
      name: 'N',
      jobNum: 'J',
      contact: 'C',
      cardNumber: 'K',
      sex: 0,
      birth: 'B',
      licenseNum: 'L',
    })
    expect(r).toBe(ok)
    expect(mocked).toHaveBeenCalledTimes(1)
    expect(mocked.mock.calls[0][0]).toBe('StandardApiAction_addDriverInfo.action')
    expect(mocked.mock.calls[0][1]).toEqual({
      name: 'N',
      jobNum: 'J',
      contact: 'C',
      cardNumber: 'K',
      sex: 0,
      birth: 'B',
      licenseNum: 'L',
      dn: 'N',
      jn: 'J',
      tp: 'C',
      dt: 'C',
      ic: 'K',
      cn: 'K',
      sx: 0,
      bt: 'B',
      ln: 'L',
      drivelNum: 'L',
    })
    expect(mocked.mock.calls[0][2]).toBe('POST')
  })
  it('does not overwrite existing alias fields', async () => {
    mocked.mockResolvedValueOnce(ok)
    await api.saveDriver({ name: 'N', dn: 'X', sex: 1, sx: 2 })
    expect(mocked.mock.calls[0][1]).toEqual({ name: 'N', dn: 'X', sex: 1, sx: 2 })
  })
  it('accepts session-expired result 5 from primary without fallback', async () => {
    const exp = { result: '5' }
    mocked.mockResolvedValueOnce(exp)
    expect(await api.saveDriver({})).toBe(exp)
    expect(mocked).toHaveBeenCalledTimes(1)
  })
  it('falls back to mergeDriver and returns fallback on success', async () => {
    const fb = { result: '0' }
    mocked.mockResolvedValueOnce({ result: 1 }).mockResolvedValueOnce(fb)
    expect(await api.saveDriver({ a: 1 })).toBe(fb)
    expect(mocked.mock.calls[1][0]).toBe('DriverAction_mergeDriver.action')
    expect(mocked.mock.calls[1][2]).toBe('POST')
  })
  it('returns fallback when it has a non-404 failure result', async () => {
    const fb = { result: 7 }
    mocked.mockResolvedValueOnce({ result: 1 }).mockResolvedValueOnce(fb)
    expect(await api.saveDriver({})).toBe(fb)
  })
  it('returns primary when fallback is 404 and primary has a result', async () => {
    const pr = { result: 1 }
    mocked.mockResolvedValueOnce(pr).mockResolvedValueOnce({ result: 404 })
    expect(await api.saveDriver({})).toBe(pr)
  })
  it('returns fallback when fallback is 404 and primary has no result', async () => {
    const fb = { result: '404' }
    mocked.mockResolvedValueOnce({} as never).mockResolvedValueOnce(fb)
    expect(await api.saveDriver({})).toBe(fb)
  })
  it('mergeDriver delegates to saveDriver', async () => {
    mocked.mockResolvedValueOnce(ok)
    await api.mergeDriver({ name: 'N' })
    expect(mocked.mock.calls[0][0]).toBe('StandardApiAction_addDriverInfo.action')
  })
})

describe('no direct fetch calls', () => {
  it('endpoints never call global fetch itself (original has none)', async () => {
    const f = vi.spyOn(globalThis, 'fetch')
    await api.login('a', 'b')
    expect(f).not.toHaveBeenCalled()
    f.mockRestore()
  })
})
