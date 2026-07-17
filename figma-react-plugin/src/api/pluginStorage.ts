/**
 * Lưu key/value qua figma.clientStorage (main thread).
 *
 * UI iframe của Figma KHÔNG dùng được localStorage (data: URL).
 * Dùng postMessage request/response thay thế.
 */

import { postToPlugin } from '../hooks/useFigmaMessages'

type Pending = {
  resolve: (value: string | undefined) => void
  reject: (error: Error) => void
}

const pending = new Map<string, Pending>()
let listenerReady = false
let requestCounter = 0

/** ID duy nhất — không dùng crypto.randomUUID (không có trong iframe Figma). */
function nextRequestId() {
  requestCounter += 1
  return `req-${Date.now()}-${requestCounter}-${Math.random().toString(36).slice(2, 9)}`
}

function ensureListener() {
  if (listenerReady) return
  listenerReady = true

  window.addEventListener('message', (event: MessageEvent) => {
    const message = event.data?.pluginMessage as
      | { type: 'sync-storage-result'; requestId: string; value?: string }
      | undefined
    if (!message || message.type !== 'sync-storage-result') return

    const entry = pending.get(message.requestId)
    if (!entry) return
    pending.delete(message.requestId)
    entry.resolve(message.value)
  })
}

function requestStorage(
  message:
    | { type: 'sync-storage-get'; key: string; requestId: string }
    | { type: 'sync-storage-set'; key: string; value: string; requestId: string },
): Promise<string | undefined> {
  ensureListener()
  const requestId = nextRequestId()

  return new Promise((resolve, reject) => {
    pending.set(requestId, { resolve, reject })
    postToPlugin({ ...message, requestId })

    window.setTimeout(() => {
      if (!pending.has(requestId)) return
      pending.delete(requestId)
      reject(new Error('clientStorage request timed out'))
    }, 10_000)
  })
}

export function getPluginStorage(key: string): Promise<string | undefined> {
  return requestStorage({ type: 'sync-storage-get', key, requestId: '' })
}

export async function setPluginStorage(key: string, value: string) {
  await requestStorage({
    type: 'sync-storage-set',
    key,
    value,
    requestId: '',
  })
}
