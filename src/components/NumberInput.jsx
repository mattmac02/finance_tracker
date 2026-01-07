import { useEffect, useRef, useState } from 'react'
import { parseNum } from '../lib/format'

/**
 * Uncontrolled-ish numeric textbox:
 * - Keeps cursor stable while typing (we do NOT control value per keystroke)
 * - Commits on blur or Enter
 * - Accepts commas
 */
export function NumberInput({ value, onCommit, width=110, ariaLabel }){
  const ref = useRef(null)
  const [draft, setDraft] = useState(String(value ?? 0))

  // When value changes due to month change/import/etc, refresh draft
  useEffect(() => {
    setDraft(String(value ?? 0))
  }, [value])

  const commit = () => {
    const n = parseNum(draft)
    onCommit?.(n)
    // normalize display
    setDraft(String(n))
  }

  return (
    <input
      ref={ref}
      className="input"
      style={{ width }}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      aria-label={ariaLabel}
      value={draft}
      onChange={(e)=> setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e)=>{
        if(e.key === 'Enter'){
          e.currentTarget.blur()
        }
        if(e.key === 'Escape'){
          setDraft(String(value ?? 0))
          e.currentTarget.blur()
        }
      }}
    />
  )
}
