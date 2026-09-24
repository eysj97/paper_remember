import { useEffect, useRef, useState } from 'react'
import arrowDownIcon from '../../imges/icon-downarrow.png'
import './GoalDropdown.css'

const TEMPLATES = [
  { id: 'streak', label: '연속학습', suffix: '일 연속학습하기', inputType: 'number', placeholder: '7' },
  { id: 'book', label: '한권 끝내기', suffix: ' 한권 끝내기', inputType: 'text', placeholder: '예: Harry Potter' },
  { id: 'words', label: '단어수', suffix: '단어 외우기', inputType: 'number', placeholder: '100' },
  { id: 'accuracy', label: '정답률', suffix: '% 정답률 달성하기', inputType: 'number', placeholder: '90' },
  { id: 'custom', label: '직접 입력', inputType: 'text', placeholder: '나만의 목표를 입력해보세요' },
]

export default function GoalDropdown({ onChange }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null) // template object | null
  const [amount, setAmount] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (selected) inputRef.current?.focus()
  }, [selected])

  const selectTemplate = (template) => {
    setSelected(template)
    setAmount('')
    setOpen(false)
    onChange?.('')
  }

  const handleAmountChange = (raw) => {
    setAmount(raw)
    if (!selected) return
    if (selected.id === 'custom') {
      onChange?.(raw)
    } else {
      onChange?.(raw ? `${raw}${selected.suffix}` : '')
    }
  }

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
          {TEMPLATES.map((template) => (
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
