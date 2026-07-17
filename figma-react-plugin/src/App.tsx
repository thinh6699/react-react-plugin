import { useCallback, useState } from 'react'
import { pushSelectionToMyApi } from './api/myApi'
import { CreateRectanglesForm } from './components/CreateRectanglesForm'
import { EditSelectionPanel } from './components/EditSelectionPanel'
import { LabsPanel } from './components/LabsPanel'
import { postToPlugin, useFigmaMessages } from './hooks/useFigmaMessages'
import type { HexColor, SelectionSnapshot } from './shared/messages'
import { PLUGIN_UI } from './shared/uiSizes'

type PluginView = 'create' | 'edit' | 'labs' | 'about'

function Nav({
  view,
  onChange,
}: {
  view: PluginView
  onChange: (view: PluginView) => void
}) {
  return (
    <nav className="mb-4 flex flex-wrap gap-1 border-b border-(--figma-color-border) pb-2">
      {(['create', 'edit', 'labs', 'about'] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`rounded px-3 py-1.5 text-sm capitalize ${
            view === item
              ? 'bg-(--figma-color-bg-selected) text-(--figma-color-text)'
              : 'text-(--figma-color-text-secondary) hover:bg-(--figma-color-bg-hover)'
          }`}
        >
          {item}
        </button>
      ))}
    </nav>
  )
}

function AboutView() {
  return (
    <div className="space-y-3 text-sm text-(--figma-color-text-secondary)">
      <p>
        Create / Edit: thao tác canvas cơ bản. Labs: kết hợp HTTP API + thêm
        Figma Plugin API (clone, group, storage, export…).
      </p>
      <p className="text-xs">
        Đọc comment trong <code>src/api/myApi.ts</code> và phần LABS trong{' '}
        <code>src/code/code.ts</code>.
      </p>
      <button
        type="button"
        onClick={() => postToPlugin({ type: 'close' })}
        className="rounded-lg border border-(--figma-color-border) px-4 py-2 text-sm text-(--figma-color-text)"
      >
        Close plugin
      </button>
    </div>
  )
}

function heightForView(view: PluginView) {
  if (view === 'edit') return PLUGIN_UI.heightEdit
  if (view === 'labs') return PLUGIN_UI.heightLabs
  return PLUGIN_UI.heightDefault
}

export default function App() {
  const [view, setView] = useState<PluginView>('create')
  const [count, setCount] = useState(1)
  const [color, setColor] = useState<HexColor>('#ff8c00')
  const [labelText, setLabelText] = useState('')
  const [labelFontSize, setLabelFontSize] = useState(12)
  const [selectionCount, setSelectionCount] = useState(0)
  const [selectionNames, setSelectionNames] = useState<string[]>([])
  const [selectionWidth, setSelectionWidth] = useState<number | null>(null)
  const [selectionHeight, setSelectionHeight] = useState<number | null>(null)
  const [selectionFill, setSelectionFill] = useState<HexColor | null>(null)
  const [selectionCharacters, setSelectionCharacters] = useState<string | null>(
    null,
  )
  const [selectionFontSize, setSelectionFontSize] = useState<number | null>(
    null,
  )
  const [selectionIsText, setSelectionIsText] = useState(false)
  const [trackedCount, setTrackedCount] = useState(0)
  const [status, setStatus] = useState('Ready')
  const [labsLog, setLabsLog] = useState('Ready')
  const [storageValue, setStorageValue] = useState<string | undefined>()
  const [pluginDataValue, setPluginDataValue] = useState('')
  const [pngPreview, setPngPreview] = useState<string | null>(null)

  const onSelectionChange = useCallback((payload: SelectionSnapshot) => {
    setSelectionCount(payload.selectionCount)
    setSelectionNames(payload.selectionNames)
    setTrackedCount(payload.trackedCount)
    setSelectionWidth(payload.width)
    setSelectionHeight(payload.height)
    setSelectionFill(payload.fill)
    setSelectionCharacters(payload.characters)
    setSelectionFontSize(payload.fontSize)
    setSelectionIsText(payload.isText)
  }, [])

  const onCreated = useCallback((countCreated: number, nextTracked: number) => {
    setTrackedCount(nextTracked)
    setStatus(`Created ${countCreated}`)
  }, [])

  const onDeleted = useCallback((countDeleted: number, nextTracked: number) => {
    setTrackedCount(nextTracked)
    setStatus(`Deleted ${countDeleted}`)
  }, [])

  const onActionDone = useCallback((message: string, nextTracked: number) => {
    setTrackedCount(nextTracked)
    setStatus(message)
    setLabsLog(message)
  }, [])

  /**
   * Main đã collect selection → UI POST lên "My API".
   * Đây là nửa còn lại của luồng: Figma → API.
   */
  const onSelectionExportPayload = useCallback(
    async (payload: {
      fileName: string
      pageName: string
      nodes: Array<{
        id: string
        name: string
        type: string
        width: number | null
        height: number | null
      }>
    }) => {
      setLabsLog(
        `Posting ${payload.nodes.length} node(s) from "${payload.pageName}"…`,
      )
      try {
        const result = await pushSelectionToMyApi(payload)
        setLabsLog(
          result.ok
            ? `API push OK · merged ${result.mergedCount ?? payload.nodes.length} node(s) (id: ${result.echoId ?? 'n/a'})`
            : 'API push failed',
        )
      } catch (error) {
        setLabsLog(error instanceof Error ? error.message : 'API push failed')
      }
    },
    [],
  )

  const onStorageValue = useCallback((key: string, value: string | undefined) => {
    setStorageValue(value)
    setLabsLog(
      value === undefined
        ? `clientStorage["${key}"] empty`
        : `Loaded clientStorage["${key}"]`,
    )
  }, [])

  const onPluginDataValue = useCallback((key: string, value: string) => {
    setPluginDataValue(value)
    setLabsLog(
      value
        ? `pluginData["${key}"] = ${value}`
        : `pluginData["${key}"] empty`,
    )
  }, [])

  const onExportPng = useCallback((bytesBase64: string, nodeName: string) => {
    setPngPreview(bytesBase64)
    setLabsLog(`PNG preview · ${nodeName}`)
  }, [])

  useFigmaMessages({
    onSelectionChange,
    onCreated,
    onDeleted,
    onActionDone,
    onSelectionExportPayload,
    onStorageValue,
    onPluginDataValue,
    onExportPng,
  })

  const handleViewChange = useCallback((next: PluginView) => {
    setView(next)
    postToPlugin({
      type: 'resize',
      width: PLUGIN_UI.width,
      height: heightForView(next),
    })
  }, [])

  return (
    <div className="h-full overflow-y-auto bg-(--figma-color-bg) p-4 text-(--figma-color-text)">
      <header className="mb-3">
        <h1 className="text-base font-semibold">Figma React Plugin</h1>
        <p className="text-xs text-(--figma-color-text-secondary)">
          Create · Edit · Labs (API + Plugin API)
        </p>
      </header>

      <Nav view={view} onChange={handleViewChange} />

      {view === 'create' && (
        <CreateRectanglesForm
          count={count}
          color={color}
          labelText={labelText}
          labelFontSize={labelFontSize}
          selectionCount={selectionCount}
          selectionNames={selectionNames}
          trackedCount={trackedCount}
          status={status}
          onCountChange={setCount}
          onColorChange={setColor}
          onLabelTextChange={setLabelText}
          onLabelFontSizeChange={setLabelFontSize}
        />
      )}

      {view === 'edit' && (
        <EditSelectionPanel
          selectionCount={selectionCount}
          selectionNames={selectionNames}
          selectionWidth={selectionWidth}
          selectionHeight={selectionHeight}
          selectionFill={selectionFill}
          selectionCharacters={selectionCharacters}
          selectionFontSize={selectionFontSize}
          selectionIsText={selectionIsText}
        />
      )}

      {view === 'labs' && (
        <LabsPanel
          selectionCount={selectionCount}
          log={labsLog}
          onLog={setLabsLog}
          storageValue={storageValue}
          pluginDataValue={pluginDataValue}
          pngPreview={pngPreview}
        />
      )}

      {view === 'about' && <AboutView />}
    </div>
  )
}
