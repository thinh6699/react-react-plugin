import { useEffect, useState } from 'react'
import type { HexColor } from '../shared/messages'
import { postToPlugin } from '../hooks/useFigmaMessages'
import { ColorField } from './ColorField'
import { NumberField } from './NumberField'
import { TextFields } from './TextFields'

type Props = {
  count: number
  color: HexColor
  labelText: string
  labelFontSize: number
  selectionCount: number
  selectionNames: string[]
  trackedCount: number
  status: string
  onCountChange: (count: number) => void
  onColorChange: (color: HexColor) => void
  onLabelTextChange: (value: string) => void
  onLabelFontSizeChange: (value: number) => void
}

export function CreateRectanglesForm({
  count,
  color,
  labelText,
  labelFontSize,
  selectionCount,
  selectionNames,
  trackedCount,
  status,
  onCountChange,
  onColorChange,
  onLabelTextChange,
  onLabelFontSizeChange,
}: Props) {
  const [localCount, setLocalCount] = useState(count)

  useEffect(() => {
    setLocalCount(count)
  }, [count])

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        const next = Math.max(1, Math.min(50, localCount))
        onCountChange(next)
        setLocalCount(next)
        postToPlugin({
          type: 'create-rectangles',
          count: next,
          color,
          labelText,
          labelFontSize,
        })
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-(--figma-color-text)">
          Number of rectangles
        </span>
        <NumberField
          aria-label="Number of rectangles"
          value={localCount}
          min={1}
          max={50}
          onChange={(next) => {
            setLocalCount(next)
            onCountChange(next)
          }}
          className="rounded border border-(--figma-color-border) bg-(--figma-color-bg) px-3 py-2 text-(--figma-color-text) outline-none focus:border-(--figma-color-border-selected)"
        />
      </label>

      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-(--figma-color-text)">Fill color</span>
        <ColorField color={color} onColorChange={onColorChange} />
      </div>

      <TextFields
        characters={labelText}
        fontSize={labelFontSize}
        onCharactersChange={onLabelTextChange}
        onFontSizeChange={onLabelFontSizeChange}
        hint="Optional. Centered text label on each new rectangle (Inter)."
      />

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
      </div>
    </form>
  )
}
