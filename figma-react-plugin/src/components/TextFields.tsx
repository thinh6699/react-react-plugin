import { NumberField } from './NumberField'

const inputClassName =
  'rounded border border-(--figma-color-border) bg-(--figma-color-bg) px-3 py-2 text-sm text-(--figma-color-text) outline-none focus:border-(--figma-color-border-selected)'

type Props = {
  characters: string
  fontSize: number
  onCharactersChange: (value: string) => void
  onFontSizeChange: (value: number) => void
  hint?: string
}

export function TextFields({
  characters,
  fontSize,
  onCharactersChange,
  onFontSizeChange,
  hint,
}: Props) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-(--figma-color-text)">Label text</h2>
      {hint && (
        <p className="text-[11px] leading-snug text-(--figma-color-text-secondary)">
          {hint}
        </p>
      )}
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-(--figma-color-text-secondary)">Content</span>
        <input
          type="text"
          value={characters}
          onChange={(event) => onCharactersChange(event.target.value)}
          placeholder="Leave empty to skip"
          className={inputClassName}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-(--figma-color-text-secondary)">Font size</span>
        <NumberField
          aria-label="Font size"
          value={fontSize}
          min={1}
          max={400}
          onChange={onFontSizeChange}
          className={inputClassName}
        />
      </label>
    </section>
  )
}
