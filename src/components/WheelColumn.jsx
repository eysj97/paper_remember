import { useEffect, useRef } from 'react'
import './WheelColumn.css'

const ITEM_HEIGHT = 36
const VISIBLE_COUNT = 5
const PAD_COUNT = Math.floor(VISIBLE_COUNT / 2)

export default function WheelColumn({ options, value, onChange, labelSuffix = '' }) {
  const listRef = useRef(null)
  const scrollTimeout = useRef(null)
  const isProgrammaticScroll = useRef(false)

  useEffect(() => {
    const index = options.indexOf(value)
    if (index === -1 || !listRef.current) return
    isProgrammaticScroll.current = true
    listRef.current.scrollTop = index * ITEM_HEIGHT
    const id = setTimeout(() => {
      isProgrammaticScroll.current = false
    }, 50)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleScroll = () => {
    if (isProgrammaticScroll.current) return
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    scrollTimeout.current = setTimeout(() => {
      const el = listRef.current
      if (!el) return
      const index = Math.round(el.scrollTop / ITEM_HEIGHT)
      const clamped = Math.min(Math.max(index, 0), options.length - 1)
      el.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: 'smooth' })
      const newValue = options[clamped]
      if (newValue !== value) onChange(newValue)
    }, 120)
  }

  const handleClickItem = (index) => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' })
    onChange(options[index])
  }

  return (
    <div className="wheel-column">
      <div className="wheel-column__highlight" style={{ height: ITEM_HEIGHT }} />
      <div className="wheel-column__list" ref={listRef} onScroll={handleScroll}>
        <div style={{ height: ITEM_HEIGHT * PAD_COUNT }} />
        {options.map((option, index) => (
          <button
            type="button"
            key={option}
            className={`wheel-column__item${option === value ? ' wheel-column__item--selected' : ''}`}
            style={{ height: ITEM_HEIGHT }}
            onClick={() => handleClickItem(index)}
          >
            {option}
            {labelSuffix}
          </button>
        ))}
        <div style={{ height: ITEM_HEIGHT * PAD_COUNT }} />
      </div>
    </div>
  )
}
