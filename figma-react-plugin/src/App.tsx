import { useCallback, useState } from 'react'
import { CreateRectanglesForm } from './components/CreateRectanglesForm'
import { postToPlugin, useFigmaMessages } from './hooks/useFigmaMessages'
import type { HexColor } from './shared/messages'

type PluginView = 'home' | 'about'

function Nav({
  view,
  onChange,
}: {
  view: PluginView
  onChange: (view: PluginView) => void
}) {
  return (
    <nav className="mb-4 flex gap-1 border-b border-(--figma-color-border) pb-2">
      {(['home', 'about'] as const).map((item) => (
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
        Demo UI state is handled with <code>useState</code>. Redux Toolkit is
        installed and wired in <code>src/store/</code> for when the UI grows.
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
  const [view, setView] = useState<PluginView>('home')
  const [count, setCount] = useState(5)
  const [color, setColor] = useState<HexColor>('#ff8c00')
  const [selectionCount, setSelectionCount] = useState(0)
  const [selectionNames, setSelectionNames] = useState<string[]>([])
  const [trackedCount, setTrackedCount] = useState(0)
  const [status, setStatus] = useState('Ready')

  const onSelectionChange = useCallback(
    (nextCount: number, nextNames: string[], nextTracked: number) => {
      setSelectionCount(nextCount)
      setSelectionNames(nextNames)
      setTrackedCount(nextTracked)
    },
    [],
  )

  const onCreated = useCallback((createdCount: number, nextTracked: number) => {
    setTrackedCount(nextTracked)
    setStatus(`Created ${createdCount} rectangle(s)`)
  }, [])

  const onDeleted = useCallback(
    (deletedCount: number, nextTracked: number, scope: 'created' | 'selection') => {
      setTrackedCount(nextTracked)
      setStatus(
        scope === 'created'
          ? `Deleted ${deletedCount} created rectangle(s)`
          : `Deleted ${deletedCount} selected node(s)`,
      )
    },
    [],
  )

  useFigmaMessages({ onSelectionChange, onCreated, onDeleted })

  return (
    <div className="h-full overflow-y-auto bg-(--figma-color-bg) p-4 text-(--figma-color-text)">
      <header className="mb-3">
        <h1 className="text-base font-semibold">Figma React Plugin</h1>
        <p className="text-xs text-(--figma-color-text-secondary)">
          Vite · React · Tailwind · useState (+ Redux ready)
        </p>
      </header>

      <Nav view={view} onChange={setView} />

      {view === 'home' ? (
        <CreateRectanglesForm
          count={count}
          color={color}
          selectionCount={selectionCount}
          selectionNames={selectionNames}
          trackedCount={trackedCount}
          status={status}
          onCountChange={setCount}
          onColorChange={setColor}
        />
      ) : (
        <AboutView />
      )}
    </div>
  )
}
