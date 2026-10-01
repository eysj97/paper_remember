import { useEffect, useRef, useState } from 'react'
import BottomNav from '../components/BottomNav.jsx'
import UploadHeader from '../components/UploadHeader.jsx'
import { Example, canSpeak, speak } from '../components/WordText.jsx'
import { enrichWords } from '../services/dictionary.js'
import './ResultPage.css'

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
  const onRegisterRef = useRef(onRegister)
  onRegisterRef.current = onRegister

  // arriving here registers the words
  useEffect(() => {
    onRegisterRef.current?.(words)
  }, [words])

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

  return (
    <div className="page result-page" data-name="단어등록 결과">
      <div className="result-page__scroll">
        <div className="result-page__inner">
          <UploadHeader studyMode={studyMode} />

          <div className="result-page__contents">
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
              {/* the words are already saved, so this just closes the step */}
              <button type="button" className="result-confirm" onClick={() => onNavigate?.('book')}>
                확인
              </button>
            </section>
          </div>
        </div>
      </div>

      <BottomNav active="upload" onNavigate={onNavigate} />
    </div>
  )
}
