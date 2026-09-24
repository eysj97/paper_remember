import './ModeBadge.css'

// ids match the purpose options picked in onboarding (Onboarding3)
const MODE_LABELS = { exam: '시험대비모드', conversation: '회화모드' }

// small pill pinned to the top-right corner of a header; renders nothing until a mode is chosen
export default function ModeBadge({ studyMode }) {
  const label = MODE_LABELS[studyMode]
  return label ? <span className="mode-badge">{label}</span> : null
}
