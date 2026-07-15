import { useEffect, useState } from 'react'

type Props = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  integer?: boolean
  className?: string
  'aria-label'?: string
}

function parseNumber(
  raw: string,
  min: number,
  max: number | undefined,
  integer: boolean,
): number {
  const cleaned = raw.trim()
  let n = Number(cleaned)
  if (!Number.isFinite(n) || cleaned === '') n = min
  if (integer) n = Math.round(n)
  n = Math.max(min, n)
  if (max != null) n = Math.min(max, n)
  return n
}

/**
 * Text input that only accepts numeric characters.
 * Empty while typing is allowed; value is committed on blur / Enter.
 */
export function NumberField({
  value,
  onChange,
  min = 1,
  max,
  integer = true,
  className,
  'aria-label': ariaLabel,
}: Props) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  function commit(raw: string = draft) {
    const next = parseNumber(raw, min, max, integer)
    onChange(next)
    setDraft(String(next))
    return next
  }

  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      aria-label={ariaLabel}
      value={draft}
      onChange={(event) => {
        const next = event.target.value
        if (next === '' || (integer ? /^\d*$/ : /^\d*\.?\d*$/).test(next)) {
          setDraft(next)
        }
      }}
      onBlur={() => {
        commit()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
          event.currentTarget.blur()
        }
      }}
      className={className}
    />
  )
}
