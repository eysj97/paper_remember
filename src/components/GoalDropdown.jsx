import { useEffect, useRef, useState } from 'react'
import arrowDownIcon from '../../imges/icon-downarrow.png'
import { GOAL_TYPES, goalType } from '../services/goal.js'
import './GoalDropdown.css'

// value: { type, value } of the goal; onChange gets the same shape back
export default function GoalDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  // focus the amount only right after a type is picked, not when a saved goal is shown
  const focusNext = useRef(false)
  const selected = goalType(value)
  const amount = value?.value ?? ''

  useEffect(() => {
    if (focusNext.current) inputRef.current?.focus()
    focusNext.current = false
  }, [selected?.id])

  const selectTemplate = (template) => {
    focusNext.current = true
    setOpen(false)
    onChange?.({ type: template.id, value: '' })
  }

  const handleAmountChange = (raw) => onChange?.({ type: selected.id, value: raw })

  return (
    <div className="goal-dropdown">
      <div className="goal-dropdown__trigger">
        {!selected && (
          <button
            type="button"
            className="goal-dropdown__trigger-btn"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            <span className="goal-dropdown__placeholder">선택하기</span>
          </button>
        )}

        {selected && selected.id === 'custom' && (
          <input
            ref={inputRef}
            type="text"
            className="goal-dropdown__free-input"
            placeholder={selected.placeholder}
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
          />
        )}

        {selected && selected.id !== 'custom' && (
          <div className="goal-dropdown__template">
            <input
              ref={inputRef}
              type={selected.inputType}
              inputMode={selected.inputType === 'number' ? 'numeric' : undefined}
              className={`goal-dropdown__amount-input${selected.inputType === 'text' ? ' goal-dropdown__amount-input--text' : ''}`}
              placeholder={selected.placeholder}
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
            />
            <span className="goal-dropdown__suffix">{selected.suffix}</span>
          </div>
        )}

        <button
          type="button"
          className="goal-dropdown__arrow-btn"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="목표 유형 선택"
        >
          <img className={open ? 'goal-dropdown__arrow goal-dropdown__arrow--open' : 'goal-dropdown__arrow'} src={arrowDownIcon} alt="" />
        </button>
      </div>

      {open && (
        <div className="goal-dropdown__list">
          {GOAL_TYPES.map((template) => (
            <button
              type="button"
              key={template.id}
              className="goal-dropdown__option"
              onClick={() => selectTemplate(template)}
            >
              {template.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
