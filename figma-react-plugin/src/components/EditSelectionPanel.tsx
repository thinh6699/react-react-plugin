import { useEffect, useState } from 'react'
import type { HexColor } from '../shared/messages'
import { PLUGIN_UI } from '../shared/uiSizes'
import { postToPlugin } from '../hooks/useFigmaMessages'
import { ColorField } from './ColorField'
import { NumberField } from './NumberField'
import { TextFields } from './TextFields'

type Props = {
  selectionCount: number
  selectionNames: string[]
  selectionWidth: number | null
  selectionHeight: number | null
  selectionFill: HexColor | null
  selectionCharacters: string | null
  selectionFontSize: number | null
  selectionIsText: boolean
}

const inputClassName =
  'rounded border border-(--figma-color-border) bg-(--figma-color-bg) px-3 py-2 text-sm text-(--figma-color-text) outline-none focus:border-(--figma-color-border-selected)'

export function EditSelectionPanel({
  selectionCount,
  selectionNames,
  selectionWidth,
  selectionHeight,
  selectionFill,
  selectionCharacters,
  selectionFontSize,
  selectionIsText,
}: Props) {
  const [fillColor, setFillColor] = useState<HexColor>('#0d99ff')
  const [width, setWidth] = useState(100)
  const [height, setHeight] = useState(100)
  const [characters, setCharacters] = useState('');
  const [fontSize, setFontSize] = useState(12)
  const hasSelection = selectionCount > 0

  useEffect(() => {
    if (selectionWidth != null) setWidth(Math.round(selectionWidth))
    if (selectionHeight != null) setHeight(Math.round(selectionHeight))
    if (selectionFill != null) setFillColor(selectionFill)
    if (selectionCharacters != null) setCharacters(selectionCharacters)
    if (selectionFontSize != null) setFontSize(Math.round(selectionFontSize))
  }, [
    selectionWidth,
    selectionHeight,
    selectionFill,
    selectionCharacters,
    selectionFontSize,
    selectionCount,
    selectionNames.join('|'),
  ])

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg bg-(--figma-color-bg-secondary) p-3 text-xs text-(--figma-color-text-secondary)">
        <p>
          Selection: <strong>{selectionCount}</strong>
          {selectionIsText ? ' · text' : ''}
        </p>
        {selectionNames.length > 0 && (
          <p className="mt-1 truncate">{selectionNames.join(', ')}</p>
        )}
        <p className="mt-2 text-[11px] leading-snug">
          Prefills from the first selected layer. Rectangles load their centered
          label when present.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-(--figma-color-text)">Fill</h2>
        <ColorField
          color={fillColor}
          onColorChange={setFillColor}
          expandedHeight={PLUGIN_UI.heightEditWithPicker}
        />
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => postToPlugin({ type: 'apply-fill', color: fillColor })}
          className={
            hasSelection
              ? 'rounded-lg bg-(--figma-color-bg-brand) px-4 py-2 text-sm font-medium text-(--figma-color-text-onbrand) hover:opacity-90'
              : 'rounded-lg border border-(--figma-color-border) px-4 py-2 text-sm opacity-40'
          }
        >
          Apply fill
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-(--figma-color-text)">Size</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-(--figma-color-text-secondary)">Width</span>
            <NumberField
              aria-label="Width"
              value={width}
              min={1}
              onChange={setWidth}
              className={inputClassName}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-(--figma-color-text-secondary)">Height</span>
            <NumberField
              aria-label="Height"
              value={height}
              min={1}
              onChange={setHeight}
              className={inputClassName}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => postToPlugin({ type: 'apply-size', width, height })}
          className={
            hasSelection
              ? 'rounded-lg bg-(--figma-color-bg-brand) px-4 py-2 text-sm font-medium text-(--figma-color-text-onbrand) hover:opacity-90'
              : 'rounded-lg border border-(--figma-color-border) px-4 py-2 text-sm opacity-40'
          }
        >
          Apply size
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <TextFields
          characters={characters}
          fontSize={fontSize}
          onCharactersChange={setCharacters}
          onFontSizeChange={setFontSize}
          hint="On shapes: updates existing label or creates a centered text layer."
        />
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() =>
            postToPlugin({ type: 'apply-text', characters, fontSize })
          }
          className={
            hasSelection
              ? 'rounded-lg bg-(--figma-color-bg-brand) px-4 py-2 text-sm font-medium text-(--figma-color-text-onbrand) hover:opacity-90'
              : 'rounded-lg border border-(--figma-color-border) px-4 py-2 text-sm opacity-40'
          }
        >
          Apply text
        </button>
      </section>

      <button
        type="button"
        onClick={() => postToPlugin({ type: 'close' })}
        className="rounded-lg border border-(--figma-color-border) px-4 py-2 text-sm text-(--figma-color-text) hover:bg-(--figma-color-bg-hover)"
      >
        Close
      </button>
    </div>
  )
}
