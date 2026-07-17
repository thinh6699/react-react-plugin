import { useCallback, useState } from 'react'
import { fetchCardsFromMyApi } from '../api/myApi'
import { postToPlugin } from '../hooks/useFigmaMessages'

type Props = {
  selectionCount: number
  log: string
  onLog: (message: string) => void
  storageValue: string | undefined
  pluginDataValue: string
  pngPreview: string | null
}

const STORAGE_KEY = 'labs-note'
const PLUGIN_DATA_KEY = 'labs-stamp'

/**
 * Tab Labs — học 2 luồng chính:
 * 1) UI ↔ HTTP API (myApi.ts) ↔ main thread (Figma API)
 * 2) Các hàm Figma Plugin API thường dùng (clone, group, storage, …)
 */
export function LabsPanel({
  selectionCount,
  log,
  onLog,
  storageValue,
  pluginDataValue,
  pngPreview,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [renamePrefix, setRenamePrefix] = useState('Renamed')
  const [note, setNote] = useState('hello from plugin')

  const runImportFromApi = useCallback(async () => {
    setBusy(true)
    onLog('Fetching sync object from restful-api.dev…')
    try {
      // Bước 1: UI gọi HTTP (cần domain trong manifest.networkAccess)
      const items = await fetchCardsFromMyApi(3)
      onLog(`API OK · ${items.length} cards (synced dimensions)`)
      // Bước 2: gửi data đã map sang main thread
      postToPlugin({ type: 'import-from-api', items })
    } catch (error) {
      onLog(error instanceof Error ? error.message : 'API fetch failed')
    } finally {
      setBusy(false)
    }
  }, [onLog])

  const runPushSelection = useCallback(() => {
    // Main sẽ collect selection rồi trả message 'selection-export-payload'
    // → App.tsx nhận và gọi pushSelectionToMyApi()
    onLog('Collecting selection from main thread…')
    postToPlugin({ type: 'collect-selection-for-api' })
  }, [onLog])

  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-xs leading-snug text-(--figma-color-text-secondary)">
        Demo kết hợp <strong>HTTP API</strong> (UI) +{' '}
        <strong>Figma Plugin API</strong> (main). Xem comment trong{' '}
        <code className="text-[11px]">src/api/myApi.ts</code> và handlers trong{' '}
        <code className="text-[11px]">code.ts</code>.
      </p>

      <div className="rounded-lg bg-(--figma-color-bg-secondary) p-3 text-xs text-(--figma-color-text-secondary)">
        <p>
          Selection: <strong>{selectionCount}</strong>
        </p>
        <p className="mt-2 wrap-break-word">{log || 'Ready'}</p>
      </div>

      {/* ---------- API flow ---------- */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">1 · My API</h2>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runImportFromApi()}
          className="rounded-lg bg-(--figma-color-bg-brand) px-3 py-2 text-sm font-medium text-(--figma-color-text-onbrand) hover:opacity-90 disabled:opacity-40"
        >
          Fetch API → create cards
        </button>
        <button
          type="button"
          disabled={selectionCount === 0}
          onClick={runPushSelection}
          className="rounded-lg border border-(--figma-color-border) px-3 py-2 text-sm hover:bg-(--figma-color-bg-hover) disabled:opacity-40"
        >
          Push selection → API
        </button>
      </section>

      {/* ---------- Canvas ops ---------- */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">2 · Selection helpers</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={selectionCount === 0}
            onClick={() => postToPlugin({ type: 'clone-selection' })}
            className={btnClass(selectionCount > 0)}
          >
            Clone
          </button>
          <button
            type="button"
            disabled={selectionCount < 2}
            onClick={() => postToPlugin({ type: 'group-selection' })}
            className={btnClass(selectionCount >= 2)}
          >
            Group
          </button>
          <button
            type="button"
            disabled={selectionCount === 0}
            onClick={() => postToPlugin({ type: 'zoom-to-selection' })}
            className={btnClass(selectionCount > 0)}
          >
            Zoom
          </button>
          <button
            type="button"
            disabled={selectionCount === 0}
            onClick={() => postToPlugin({ type: 'toggle-selection-visible' })}
            className={btnClass(selectionCount > 0)}
          >
            Toggle visible
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={renamePrefix}
            onChange={(e) => setRenamePrefix(e.target.value)}
            className="min-w-0 flex-1 rounded border border-(--figma-color-border) bg-(--figma-color-bg) px-2 py-1.5 text-xs outline-none"
            placeholder="Prefix"
          />
          <button
            type="button"
            disabled={selectionCount === 0}
            onClick={() =>
              postToPlugin({
                type: 'rename-selection',
                prefix: renamePrefix.trim() || 'Renamed',
              })
            }
            className={btnClass(selectionCount > 0)}
          >
            Rename
          </button>
        </div>
      </section>

      {/* ---------- Persistence ---------- */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">3 · Storage & pluginData</h2>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded border border-(--figma-color-border) bg-(--figma-color-bg) px-2 py-1.5 text-xs outline-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              postToPlugin({
                type: 'storage-set',
                key: STORAGE_KEY,
                value: note,
              })
            }
            className={btnClass(true)}
          >
            Save clientStorage
          </button>
          <button
            type="button"
            onClick={() =>
              postToPlugin({ type: 'storage-get', key: STORAGE_KEY })
            }
            className={btnClass(true)}
          >
            Load clientStorage
          </button>
          <button
            type="button"
            disabled={selectionCount === 0}
            onClick={() =>
              postToPlugin({
                type: 'stamp-plugin-data',
                key: PLUGIN_DATA_KEY,
                value: note,
              })
            }
            className={btnClass(selectionCount > 0)}
          >
            Stamp pluginData
          </button>
          <button
            type="button"
            disabled={selectionCount === 0}
            onClick={() =>
              postToPlugin({ type: 'read-plugin-data', key: PLUGIN_DATA_KEY })
            }
            className={btnClass(selectionCount > 0)}
          >
            Read pluginData
          </button>
        </div>
        <p className="text-[11px] text-(--figma-color-text-secondary)">
          clientStorage: <strong>{storageValue ?? '(empty)'}</strong>
        </p>
        <p className="text-[11px] text-(--figma-color-text-secondary)">
          pluginData: <strong>{pluginDataValue || '(empty)'}</strong>
        </p>
      </section>

      {/* ---------- Export ---------- */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">4 · exportAsync (PNG)</h2>
        <button
          type="button"
          disabled={selectionCount === 0}
          onClick={() => postToPlugin({ type: 'export-selection-png' })}
          className={btnClass(selectionCount > 0)}
        >
          Export first selection as PNG
        </button>
        {pngPreview && (
          <img
            src={`data:image/png;base64,${pngPreview}`}
            alt="Exported selection"
            className="max-h-32 rounded border border-(--figma-color-border) object-contain"
          />
        )}
      </section>

      <button
        type="button"
        onClick={() => postToPlugin({ type: 'close' })}
        className="rounded-lg border border-(--figma-color-border) px-4 py-2 text-sm hover:bg-(--figma-color-bg-hover)"
      >
        Close
      </button>
    </div>
  )
}

function btnClass(enabled: boolean) {
  return enabled
    ? 'rounded-lg border border-(--figma-color-border) px-2 py-2 text-xs hover:bg-(--figma-color-bg-hover)'
    : 'rounded-lg border border-(--figma-color-border) px-2 py-2 text-xs opacity-40'
}
