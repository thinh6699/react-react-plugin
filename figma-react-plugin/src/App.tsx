import { useCallback, useState } from 'react'
import { CreateRectanglesForm } from './components/CreateRectanglesForm'
import { EditSelectionPanel } from './components/EditSelectionPanel'
import { postToPlugin, useFigmaMessages } from './hooks/useFigmaMessages'
import type { HexColor, SelectionSnapshot } from './shared/messages'
import { PLUGIN_UI } from './shared/uiSizes'

type PluginView = 'create' | 'edit' | 'about'

function Nav({
  view,
  onChange,
}: {
  view: PluginView
  onChange: (view: PluginView) => void
}) {
  return (
    <nav className="mb-4 flex gap-1 border-b border-(--figma-color-border) pb-2">
      {(['create', 'edit', 'about'] as const).map((item) => (
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
        Create rectangles, or select layers and edit fill, size, and text from
        the Edit tab.
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

  const onCreated = useCallback((nextTracked: number) => {
    setTrackedCount(nextTracked)
  }, [])

  const onDeleted = useCallback(
    (
      nextTracked: number,
    ) => {
      setTrackedCount(nextTracked)
    },
    [],
  )

  const onActionDone = useCallback((nextTracked: number) => {
    setTrackedCount(nextTracked)
  }, [])

  useFigmaMessages({ onSelectionChange, onCreated, onDeleted, onActionDone })

  const handleViewChange = useCallback((next: PluginView) => {
    setView(next)
    postToPlugin({
      type: 'resize',
      width: PLUGIN_UI.width,
      height: next === 'edit' ? PLUGIN_UI.heightEdit : PLUGIN_UI.heightDefault,
    })
  }, [])

  return (
    <div className="h-full overflow-y-auto bg-(--figma-color-bg) p-4 text-(--figma-color-text)">
      <header className="mb-3">
        <h1 className="text-base font-semibold">Figma React Plugin</h1>
        <p className="text-xs text-(--figma-color-text-secondary)">
          Create · Edit selection · useState
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

      {view === 'about' && <AboutView />}
    </div>
  )
}
