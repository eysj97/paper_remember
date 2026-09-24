import volumeIcon from '../../imges/icon-volume.png'
import './WordText.css'

// small pieces shared by every screen that shows a saved word (result page, library, word card)

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// bolds the studied word wherever it shows up in the example sentence
export function Example({ sentence, word }) {
  const parts = sentence.split(new RegExp(`(\\b${escapeRegExp(word)}\\b)`, 'i'))
  return (
    <p>
      {parts.map((part, i) =>
        part.toLowerCase() === word.toLowerCase() ? <strong key={i}>{part}</strong> : part,
      )}
    </p>
  )
}

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

// the browser's own text-to-speech reads the word aloud, so no audio files are needed
export function speak(word) {
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = 'en-US'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

// volume icon that reads the word aloud; renders nothing where the browser has no speech support
export function SpeakButton({ word }) {
  if (!canSpeak) return null
  return (
    <button type="button" className="speak-button" aria-label={`${word} 발음 듣기`} onClick={() => speak(word)}>
      <img src={volumeIcon} alt="" />
    </button>
  )
}
