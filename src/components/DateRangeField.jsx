import { useState } from 'react'
import DateWheelPicker from './DateWheelPicker.jsx'
import arrowDownIcon from '../../imges/icon-downarrow.png'
import './DateRangeField.css'

const pad2 = (n) => String(n).padStart(2, '0')
const formatDate = ({ year, month, day }) => `${String(year).slice(2)}/${pad2(month)}/${pad2(day)}`

// start ~ end date buttons; tapping one opens the wheel picker underneath.
// locked: the dates are worked out by the app (연속 학습), so they're shown but can't be picked
export default function DateRangeField({ startDate, endDate, onStartChange, onEndChange, locked = false }) {
  const [openPicker, setOpenPicker] = useState(null) // null | 'start' | 'end'

  const dateButton = (id, date) => (
    <button
      type="button"
      className="date-range__select"
      onClick={() => setOpenPicker((p) => (p === id ? null : id))}
      aria-expanded={openPicker === id}
      disabled={locked}
    >
      <span>{formatDate(date)}</span>
      {!locked && (
        <img
          className={openPicker === id ? 'date-range__arrow date-range__arrow--open' : 'date-range__arrow'}
          src={arrowDownIcon}
          alt=""
        />
      )}
    </button>
  )

  return (
    <>
      <div className="date-range">
        {dateButton('start', startDate)}
        <span className="date-range__tilde">~</span>
        {dateButton('end', endDate)}
      </div>

      {!locked && openPicker === 'start' && (
        <DateWheelPicker value={startDate} onChange={onStartChange} onConfirm={() => setOpenPicker(null)} />
      )}
      {!locked && openPicker === 'end' && (
        <DateWheelPicker value={endDate} onChange={onEndChange} onConfirm={() => setOpenPicker(null)} />
      )}
    </>
  )
}
