import { useEffect, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import type { HexColor } from '../shared/messages'
import { PLUGIN_UI } from '../shared/uiSizes'
import { postToPlugin } from '../hooks/useFigmaMessages'

function normalizeHex(value: string): HexColor | null {
  const raw = value.trim()
  const withHash = raw.startsWith('#') ? raw : `#${raw}`
  if (!/^#[0-9a-fA-F]{6}$/.test(withHash)) return null
  return withHash.toLowerCase() as HexColor
}

type ColorFieldProps = {
  color: HexColor
  onColorChange: (color: HexColor) => void
  /** Extra height when the picker is open (beyond default UI height). */
  expandedHeight?: number
}

export function ColorField({
  color,
  onColorChange,
  expandedHeight = PLUGIN_UI.heightWithPicker,
}: ColorFieldProps) {
  const [open, setOpen] = useState(false)
  const [hexDraft, setHexDraft] = useState<string>(color)

  useEffect(() => {
    setHexDraft(color)
  }, [color])

  useEffect(() => {
    postToPlugin({
      type: 'resize',
      width: PLUGIN_UI.width,
      height: open ? expandedHeight : PLUGIN_UI.heightDefault,
    })

    return () => {
      postToPlugin({
        type: 'resize',
        width: PLUGIN_UI.width,
        height: PLUGIN_UI.heightDefault,
      })
    }
  }, [open, expandedHeight])

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
