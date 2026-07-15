import { useEffect, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import type { HexColor } from '../shared/messages'
import { PLUGIN_UI } from '../shared/uiSizes'
import { postToPlugin } from '../hooks/useFigmaMessages'

type Props = {
  count: number
  color: HexColor
  selectionCount: number
  selectionNames: string[]
  trackedCount: number
  status: string
  onCountChange: (count: number) => void
  onColorChange: (color: HexColor) => void
}

function normalizeHex(value: string): HexColor | null {
  const raw = value.trim()
  const withHash = raw.startsWith('#') ? raw : `#${raw}`
  if (!/^#[0-9a-fA-F]{6}$/.test(withHash)) return null
  return withHash.toLowerCase() as HexColor
}

function ColorField({
  color,
  onColorChange,
}: {
  color: HexColor
  onColorChange: (color: HexColor) => void
}) {
  const [open, setOpen] = useState(false)
  const [hexDraft, setHexDraft] = useState<string>(color)

  useEffect(() => {
    postToPlugin({
      type: 'resize',
      width: PLUGIN_UI.width,
      height: open ? PLUGIN_UI.heightWithPicker : PLUGIN_UI.heightDefault,
    })

    return () => {
      postToPlugin({
        type: 'resize',
        width: PLUGIN_UI.width,
        height: PLUGIN_UI.heightDefault,
      })
    }
  }, [open])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Toggle color picker"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="h-10 w-10 shrink-0 rounded border border-(--figma-color-border) shadow-inner"
          style={{ backgroundColor: color }}
        />
        <input
          type="text"
          value={hexDraft}
          spellCheck={false}
          onChange={(event) => {
            const next = event.target.value
            setHexDraft(next)
            const normalized = normalizeHex(next)
            if (normalized) onColorChange(normalized)
          }}
          onBlur={() => {
            const normalized = normalizeHex(hexDraft)
            if (normalized) {
              setHexDraft(normalized)
              onColorChange(normalized)
            } else {
              setHexDraft(color)
            }
          }}
          className="min-w-0 flex-1 rounded border border-(--figma-color-border) bg-(--figma-color-bg) px-3 py-2 font-mono text-sm text-(--figma-color-text) outline-none focus:border-(--figma-color-border-selected)"
        />
      </div>

      {open && (
        <div className="rounded-lg border border-(--figma-color-border) bg-(--figma-color-bg-secondary) p-3">
          <HexColorPicker
            color={color}
            onChange={(next) => {
              const normalized = next.toLowerCase() as HexColor
              setHexDraft(normalized)
              onColorChange(normalized)
            }}
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>
  )
}

export function CreateRectanglesForm({
  count,
  color,
  selectionCount,
  selectionNames,
  trackedCount,
  status,
  onCountChange,
  onColorChange,
}: Props) {
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        postToPlugin({ type: 'create-rectangles', count, color })
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-(--figma-color-text)">
          Number of rectangles
        </span>
        <input
          type="number"
          min={1}
          max={50}
          value={count}
          onChange={(event) => onCountChange(Number(event.target.value) || 1)}
          className="rounded border border-(--figma-color-border) bg-(--figma-color-bg) px-3 py-2 text-(--figma-color-text) outline-none focus:border-(--figma-color-border-selected)"
        />
      </label>

      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-(--figma-color-text)">Color</span>
        <ColorField color={color} onColorChange={onColorChange} />
      </div>

      <div className="rounded-lg bg-(--figma-color-bg-secondary) p-3 text-xs text-(--figma-color-text-secondary)">
        <p>
          Selection: <strong>{selectionCount}</strong>
        </p>
        {selectionNames.length > 0 && (
          <p className="mt-1 truncate">{selectionNames.join(', ')}</p>
        )}
        <p className="mt-1">
          Tracked (this session): <strong>{trackedCount}</strong>
        </p>
        <p className="mt-2">{status}</p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-(--figma-color-bg-brand) px-4 py-2 text-sm font-medium text-(--figma-color-text-onbrand) hover:opacity-90"
        >
          Create
        </button>
        <button
          type="button"
          onClick={() => postToPlugin({ type: 'close' })}
          className="rounded-lg border border-(--figma-color-border) px-4 py-2 text-sm text-(--figma-color-text) hover:bg-(--figma-color-bg-hover)"
        >
          Close
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={trackedCount === 0}
          onClick={() => postToPlugin({ type: 'delete-created' })}
          className={
            trackedCount > 0
              ? 'rounded-lg bg-(--figma-color-bg-danger) px-4 py-2 text-sm font-medium text-(--figma-color-text-ondanger) hover:opacity-90'
              : 'rounded-lg border border-(--figma-color-border) px-4 py-2 text-sm text-(--figma-color-text) opacity-40'
          }
        >
          Delete all created ({trackedCount})
        </button>
        <button
          type="button"
          disabled={selectionCount === 0}
          onClick={() => postToPlugin({ type: 'delete-selection' })}
          className={
            selectionCount > 0
              ? 'rounded-lg border border-(--figma-color-border-strong) bg-(--figma-color-bg-secondary) px-4 py-2 text-sm font-medium text-(--figma-color-text) hover:bg-(--figma-color-bg-hover)'
              : 'rounded-lg border border-(--figma-color-border) px-4 py-2 text-sm text-(--figma-color-text) opacity-40'
          }
        >
          Delete selection ({selectionCount})
        </button>
        <p className="text-[11px] leading-snug text-(--figma-color-text-secondary)">
          Tip: you can also select layers on the canvas and press Delete /
          Backspace in Figma — no plugin needed.
        </p>
      </div>
    </form>
  )
}
