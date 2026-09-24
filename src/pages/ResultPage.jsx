import { useEffect, useMemo, useRef, useState } from 'react'
import BottomNav from '../components/BottomNav.jsx'
import UploadHeader from '../components/UploadHeader.jsx'
import { Example, canSpeak, speak } from '../components/WordText.jsx'
import { enrichWords } from '../services/dictionary.js'
import { normalizeTag } from '../services/tags.js'
import './ResultPage.css'

// suggested tags come from the dictionary's part of speech (no AI backend yet)
const POS_TAGS = { noun: '#명사', verb: '#동사', adjective: '#형용사', adverb: '#부사' }

function suggestTags(words) {
  return [...new Set(words.map((w) => POS_TAGS[w.partOfSpeech]).filter(Boolean))]
}

function WordCard({ item, checking, onPickSuggestion }) {
  return (
    <div className="result-card">
      <div className="result-card__head">
        <button
          type="button"
          className="result-card__word"
          disabled={!canSpeak}
          aria-label={`${item.word} 발음 듣기`}
          onClick={() => speak(item.word)}
        >
          <span className="result-card__spelling">{item.word}</span>
          {item.phonetic && <span className="result-card__phonetic">{item.phonetic}</span>}
        </button>
        {item.meaning && <p className="result-card__meaning">{item.meaning}</p>}
      </div>
      {item.suggestions?.length > 0 && (
        <div className="result-card__suggest">
          <span>{checking ? '확인하는 중...' : '이 단어가 맞나요?'}</span>
          {item.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={checking}
              onClick={() => onPickSuggestion(item, suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      {item.example && (
        <div className="result-card__example">
          <Example sentence={item.example} word={item.word} />
          {item.exampleKo && <p>{item.exampleKo}</p>}
        </div>
      )}
      {item.synonyms?.length > 0 && (
        <p className="result-card__synonyms">
          <span>유의어</span> {item.synonyms.join(', ')}
        </p>
      )}
    </div>
  )
}

export default function ResultPage({ words = [], studyMode, onRegister, onReplaceWord, onNavigate }) {
  const [checking, setChecking] = useState('')
  const suggested = useMemo(() => suggestTags(words), [words])
  const [customTags, setCustomTags] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const onRegisterRef = useRef(onRegister)
  onRegisterRef.current = onRegister

  // arriving here registers the words; picking tags updates the saved entries
  useEffect(() => {
    onRegisterRef.current?.(words, [...selected])
  }, [words, selected])

  // picking a suggested spelling looks that word up and swaps it in for the misspelled one,
  // keeping the meaning the user typed themselves
  const pickSuggestion = async (item, suggestion) => {
    setChecking(item.word)
    try {
      const [next] = await enrichWords([{ word: suggestion, meaning: item.userMeaning }])
      onReplaceWord?.(item.word, next)
    } finally {
      setChecking('')
    }
  }

  const toggleTag = (tag) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })

  const commitDraft = () => {
    const tag = normalizeTag(draft)
    if (tag && !suggested.includes(tag) && !customTags.includes(tag)) {
      setCustomTags((prev) => [...prev, tag])
    }
    if (tag) setSelected((prev) => new Set(prev).add(tag))
    setDraft('')
    setAdding(false)
  }

  const tags = [...suggested, ...customTags]

  return (
    <div className="page result-page" data-name="단어등록 결과">
      <div className="result-page__scroll">
        <div className="result-page__inner">
          <UploadHeader studyMode={studyMode} />

          <div className="result-page__contents">
            <section className="result-section">
              <div className="result-section__intro">
                <h2 className="result-section__title">AI 예상태그</h2>
                <p className="result-section__hint">
                  AI가 생성한 태그 중 선택하거나 직접 태그를 생성해보세요
                </p>
              </div>
              <div className="result-tags">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`result-tag${selected.has(tag) ? ' result-tag--selected' : ''}`}
                    aria-pressed={selected.has(tag)}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
                {adding ? (
                  <input
                    className="result-tag result-tag--input"
                    autoFocus
                    value={draft}
                    maxLength={12}
                    placeholder="#태그"
                    aria-label="새 태그"
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitDraft}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                      if (e.key === 'Escape') {
                        setDraft('')
                        setAdding(false)
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="result-tag result-tag--add"
                    aria-label="태그 직접 추가"
                    onClick={() => setAdding(true)}
                  >
                    +
                  </button>
                )}
              </div>
            </section>

            <section className="result-section">
              <h2 className="result-section__title">단어등록 결과</h2>
              {words.map((item) => (
                <WordCard
                  key={item.word}
                  item={item}
                  checking={checking === item.word}
                  onPickSuggestion={pickSuggestion}
                />
              ))}
            </section>
          </div>
        </div>
      </div>

      <BottomNav active="upload" onNavigate={onNavigate} />
    </div>
  )
}
