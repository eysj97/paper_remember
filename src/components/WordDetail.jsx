import { useEffect, useState } from 'react'
import { Example, SpeakButton } from './WordText.jsx'
import { searchUrl } from '../services/search.js'
import './WordDetail.css'

// several synonyms are typed in one field, separated by commas; repeats and the word itself are dropped
function parseSynonyms(text, word) {
  const seen = new Set([word.toLowerCase()])
  return text
    .split(',')
    .map((s) => s.trim())
    .filter((s) => {
      const key = s.toLowerCase()
      if (!s || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

// word card: word - meaning - example - pronunciation - synonyms. Everything is edited from one 수정.
// isTaken(word): whether another saved word already has that spelling
export default function WordDetail({ item, onClose, onUpdate, onDelete, isTaken }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const synonyms = item.synonyms ?? []

  useEffect(() => {
    const onKeyDown = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const startEdit = () => {
    setDraft({
      word: item.word,
      meaning: item.meaning ?? '',
      example: item.example ?? '',
      exampleKo: item.exampleKo ?? '',
      synonyms: synonyms.join(', '),
    })
    setError('')
    setEditing(true)
  }
  const change = (field) => (e) => setDraft((prev) => ({ ...prev, [field]: e.target.value }))

  // the spelling is the word's key, so it must stay filled in and not clash with another saved word;
  // emptying the English example removes its translation too
  const save = () => {
    const word = draft.word.trim().replace(/\s+/g, ' ')
    if (!word) return setError('영단어를 입력해 주세요.')
    if (word.toLowerCase() !== item.word.toLowerCase() && isTaken?.(word)) return setError('이미 있는 단어예요.')
    const example = draft.example.trim()
    onUpdate(item.word, {
      word,
      meaning: draft.meaning.trim(),
      example,
      exampleKo: example ? draft.exampleKo.trim() : '',
      synonyms: parseSynonyms(draft.synonyms, word),
    })
    setEditing(false)
    return undefined
  }

  const handleDelete = () => {
    if (!window.confirm(`'${item.word}' 단어를 삭제할까요?`)) return
    onDelete(item.word)
    onClose()
  }

  const searchLink = (kind) => (
    <a className="word-detail__link" href={searchUrl(item.word, kind)} target="_blank" rel="noopener noreferrer">
      네이버 영어사전에서 검색 ↗
    </a>
  )

  return (
    <div className="word-detail" role="dialog" aria-modal="true" aria-label={`${item.word} 단어 카드`}>
      <button type="button" className="word-detail__backdrop" aria-label="닫기" onClick={onClose} />

      <div className="word-detail__sheet">
        <button type="button" className="word-detail__delete" onClick={handleDelete}>
          단어 삭제
        </button>

        {editing ? (
          <form
            className="word-detail__edit"
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                setEditing(false)
              }
            }}
          >
            <div className="word-detail__example-form word-detail__word-form">
              <input
                autoFocus
                value={draft.word}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-label="영단어"
                onChange={change('word')}
              />
              <input value={draft.meaning} aria-label="뜻" onChange={change('meaning')} />
            </div>

            <div className="word-detail__block">
              <div className="word-detail__label-row">
                <p className="word-detail__label">예문</p>
                {searchLink('example')}
              </div>
              <div className="word-detail__example-form">
                <textarea
                  rows={2}
                  value={draft.example}
                  placeholder={`영어 예문 (예: I like ${item.word}.)`}
                  aria-label="영어 예문"
                  onChange={change('example')}
                />
                <input
                  value={draft.exampleKo}
                  placeholder="한국어 번역 (선택)"
                  aria-label="한국어 번역"
                  onChange={change('exampleKo')}
                />
              </div>
            </div>

            <div className="word-detail__block">
              <div className="word-detail__label-row">
                <p className="word-detail__label">유의어</p>
                {searchLink('synonyms')}
              </div>
              <div className="word-detail__example-form">
                <input
                  value={draft.synonyms}
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="쉼표로 구분 (예: nervous, worried)"
                  aria-label="유의어"
                  onChange={change('synonyms')}
                />
              </div>
            </div>

            {error && <p className="word-detail__error">{error}</p>}
            <div className="word-detail__example-actions">
              <button type="button" onClick={() => setEditing(false)}>
                취소
              </button>
              <button type="submit" className="word-detail__save">
                저장
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="word-detail__head">
              <p className="word-detail__word">{item.word}</p>
              <div className="word-detail__pron">
                {item.phonetic && <span>{item.phonetic}</span>}
                <SpeakButton word={item.word} />
              </div>
            </div>

            <div className="word-detail__label-row">
              <p className="word-detail__meaning">{item.meaning}</p>
              <button type="button" className="word-detail__link" onClick={startEdit}>
                수정
              </button>
            </div>

            <div className="word-detail__block">
              <div className="word-detail__label-row">
                <p className="word-detail__label">예문</p>
                {!item.example && searchLink('example')}
              </div>
              {item.example ? (
                <div className="word-detail__example">
                  <Example sentence={item.example} word={item.word} />
                  {item.exampleKo && <p>{item.exampleKo}</p>}
                </div>
              ) : (
                <p className="word-detail__example-empty">검색한 예문을 붙여넣어 보세요</p>
              )}
            </div>

            <div className="word-detail__block">
              <div className="word-detail__label-row">
                <p className="word-detail__label">유의어</p>
                {synonyms.length === 0 && searchLink('synonyms')}
              </div>
              {synonyms.length > 0 && (
                <div className="word-detail__tags">
                  {synonyms.map((synonym) => (
                    <span key={synonym} className="word-detail__synonym">
                      {synonym}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
