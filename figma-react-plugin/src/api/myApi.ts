/**
 * =============================================================================
 * "My API" client — chạy TRONG UI iframe (React), KHÔNG chạy trên main thread.
 * =============================================================================
 *
 * Vì sao fetch ở UI?
 * - Main thread (code.ts) bị hạn chế network; muốn gọi HTTP phải khai báo
 *   networkAccess trong manifest.json.
 * - Pattern phổ biến: UI gọi API → postMessage sang main → main dùng Figma API
 *   để tạo/sửa layer trên canvas.
 *
 * Đổi sang API thật của bạn:
 * 1. Sửa BASE_URL + path bên dưới.
 * 2. Thêm domain vào manifest.json → networkAccess.allowedDomains.
 * 3. Map response JSON sang ApiCardItem (hoặc type riêng của bạn).
 */

import { getPluginStorage, setPluginStorage } from './pluginStorage'

/**
 * API public có DB thật:
 * https://api.restful-api.dev
 * - POST /objects   -> tạo record, trả id
 * - GET /objects/:id -> đọc record theo id
 * - PUT /objects/:id -> update record theo id
 */
const BASE_URL = 'https://api.restful-api.dev'
const RESOURCE_PATH = '/objects'
/** Key lưu restful-api object id — qua figma.clientStorage, không localStorage. */
export const SYNC_OBJECT_ID_KEY = 'labs-sync-object-id'

/** Dữ liệu đã chuẩn hoá để main thread vẽ lên Figma. */
export type ApiCardItem = {
  id: number
  syncKey: string
  title: string
  subtitle: string
  /** Màu fill gợi ý (hex). API demo không có màu → UI tự gán. */
  color: HexColorLike
  width: number
  height: number
}

type HexColorLike = `#${string}`

/** Palette đơn giản để demo tô màu từng card từ API. */
const DEMO_COLORS: HexColorLike[] = [
  '#0d99ff',
  '#ff8c00',
  '#14ae5c',
  '#e05a5a',
  '#7b61ff',
]

type SyncNode = {
  id: string
  /** Khóa merge — giữ cố định qua fetch/push (card-1, card-2, …). */
  syncKey: string
  name: string
  type: string
  width: number | null
  height: number | null
}

type SyncPayload = {
  fileName: string
  pageName: string
  nodes: SyncNode[]
  updatedAt: string
}

type RemoteObjectResponse = {
  id: string
  name: string
  data?: SyncPayload
}

async function getSyncObjectId(): Promise<string | null> {
  const value = await getPluginStorage(SYNC_OBJECT_ID_KEY)
  return value ?? null
}

async function setSyncObjectId(id: string) {
  await setPluginStorage(SYNC_OBJECT_ID_KEY, id)
}

function toCards(payload: SyncPayload, limit: number): ApiCardItem[] {
  return payload.nodes.slice(0, limit).map((node, index) => ({
    id: index + 1,
    syncKey: node.syncKey || `card-${index + 1}`,
    title: node.name || `Node ${index + 1}`,
    subtitle: `${node.type} · ${payload.pageName}`,
    color: DEMO_COLORS[index % DEMO_COLORS.length],
    width: Math.max(40, Math.round(node.width ?? 160)),
    height: Math.max(30, Math.round(node.height ?? 72)),
  }))
}

function defaultSyncPayload(): SyncPayload {
  return {
    fileName: 'Demo file',
    pageName: 'Demo page',
    nodes: [
      {
        id: 'card-1',
        syncKey: 'card-1',
        name: 'Card A',
        type: 'FRAME',
        width: 160,
        height: 72,
      },
      {
        id: 'card-2',
        syncKey: 'card-2',
        name: 'Card B',
        type: 'FRAME',
        width: 220,
        height: 90,
      },
      {
        id: 'card-3',
        syncKey: 'card-3',
        name: 'Card C',
        type: 'FRAME',
        width: 120,
        height: 60,
      },
    ],
    updatedAt: new Date().toISOString(),
  }
}

async function createRemoteObject(payload: SyncPayload): Promise<string> {
  const response = await fetch(`${BASE_URL}${RESOURCE_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'figma-sync-demo',
      data: payload,
    }),
  })
  if (!response.ok) {
    throw new Error(`API create failed: ${response.status}`)
  }
  const data = (await response.json()) as { id?: string }
  if (!data.id) {
    throw new Error('API create failed: missing id')
  }
  return data.id
}

async function fetchRemotePayload(objectId: string): Promise<SyncPayload | null> {
  const response = await fetch(`${BASE_URL}${RESOURCE_PATH}/${objectId}`)
  if (!response.ok) {
    throw new Error(`API fetch failed: ${response.status}`)
  }
  const remote = (await response.json()) as RemoteObjectResponse
  return remote.data ?? null
}

/** Gộp selection vào list hiện có — chỉ update node có cùng syncKey. */
function mergeNodes(existing: SyncNode[], updates: SyncNode[]): SyncNode[] {
  const merged = existing.map((node) => ({ ...node }))

  for (const update of updates) {
    const key = update.syncKey || update.id
    const index = merged.findIndex((node) => (node.syncKey || node.id) === key)

    if (index >= 0) {
      merged[index] = {
        ...merged[index],
        ...update,
        syncKey: merged[index].syncKey || key,
      }
    } else {
      merged.push({ ...update, syncKey: key })
    }
  }

  return merged
}

function toSyncNodes(
  nodes: Array<{
    id: string
    syncKey?: string
    name: string
    type: string
    width: number | null
    height: number | null
  }>,
): SyncNode[] {
  return nodes.map((node) => ({
    id: node.id,
    syncKey: node.syncKey || node.id,
    name: node.name,
    type: node.type,
    width: node.width,
    height: node.height,
  }))
}

/**
 * Fetch object sync hiện tại.
 * - Nếu chưa có id: seed 1 object mới rồi đọc luôn.
 * - Lần sau fetch lại cùng object => thấy dimensions đã push trước đó.
 */
export async function fetchCardsFromMyApi(limit = 3): Promise<ApiCardItem[]> {
  let objectId = await getSyncObjectId()

  if (!objectId) {
    objectId = await createRemoteObject(defaultSyncPayload())
    await setSyncObjectId(objectId)
  }

  const response = await fetch(`${BASE_URL}${RESOURCE_PATH}/${objectId}`)
  if (!response.ok) {
    throw new Error(`API fetch failed: ${response.status}`)
  }

  const remote = (await response.json()) as RemoteObjectResponse
  if (!remote.data) {
    return toCards(defaultSyncPayload(), limit)
  }
  return toCards(remote.data, limit)
}

/**
 * Push selection lên object sync.
 * - Đọc payload hiện có trên API.
 * - Chỉ merge/update node có cùng syncKey — không ghi đè cả danh sách.
 */
export async function pushSelectionToMyApi(payload: {
  fileName: string
  pageName: string
  nodes: Array<{
    id: string
    syncKey?: string
    name: string
    type: string
    width: number | null
    height: number | null
  }>
}): Promise<{ ok: boolean; echoId?: string; mergedCount?: number }> {
  const updates = toSyncNodes(payload.nodes)

  let objectId = await getSyncObjectId()
  if (!objectId) {
    const created: SyncPayload = {
      fileName: payload.fileName,
      pageName: payload.pageName,
      nodes: updates,
      updatedAt: new Date().toISOString(),
    }
    objectId = await createRemoteObject(created)
    await setSyncObjectId(objectId)
    return { ok: true, echoId: objectId, mergedCount: updates.length }
  }

  const existing =
    (await fetchRemotePayload(objectId)) ?? defaultSyncPayload()
  const nextPayload: SyncPayload = {
    fileName: payload.fileName,
    pageName: payload.pageName,
    nodes: mergeNodes(existing.nodes, updates),
    updatedAt: new Date().toISOString(),
  }

  const response = await fetch(`${BASE_URL}${RESOURCE_PATH}/${objectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'figma-sync-demo',
      data: nextPayload,
    }),
  })

  if (!response.ok) {
    throw new Error(`API push failed: ${response.status}`)
  }
  return { ok: true, echoId: objectId, mergedCount: updates.length }
}
