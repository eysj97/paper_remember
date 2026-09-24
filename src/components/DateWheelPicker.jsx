import WheelColumn from './WheelColumn.jsx'
import './DateWheelPicker.css'

const YEARS = Array.from({ length: 21 }, (_, i) => 2020 + i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

export default function DateWheelPicker({ value, onChange, onConfirm }) {
  const { year, month, day } = value
  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1)

  const update = (patch) => {
    const next = { ...value, ...patch }
    const maxDay = daysInMonth(next.year, next.month)
    if (next.day > maxDay) next.day = maxDay
    onChange(next)
  }

  return (
    <div className="date-wheel-picker">
      <div className="date-wheel-picker__columns">
        <WheelColumn options={YEARS} value={year} onChange={(v) => update({ year: v })} labelSuffix="년" />
        <WheelColumn options={MONTHS} value={month} onChange={(v) => update({ month: v })} labelSuffix="월" />
        <WheelColumn options={days} value={day} onChange={(v) => update({ day: v })} labelSuffix="일" />
      </div>
      <button type="button" className="date-wheel-picker__confirm" onClick={onConfirm}>
        완료
      </button>
    </div>
  )
}
