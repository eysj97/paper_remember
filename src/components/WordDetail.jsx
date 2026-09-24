import { useEffect, useState } from 'react'
import { Example, SpeakButton } from './WordText.jsx'
import { searchUrl } from '../services/search.js'
import { normalizeTag } from '../services/tags.js'
import './WordDetail.css'

// word card: word - meaning - example - pronunciation - synonyms - tags (tags can be edited here)
export default function WordDetail({ item, onClose, onUpdate, onDelete }) {
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingExample, setEditingExample] = useState(false)
  const [exampleDraft, setExampleDraft] = useState('')
  const [exampleKoDraft, setExampleKoDraft] = useState('')
  const [addingSynonym, setAddingSynonym] = useState(false)
  const [synonymDraft, setSynonymDraft] = useState('')
  const tags = item.tags ?? []
  const synonyms = item.synonyms ?? []

  useEffect(() => {
    const onKeyDown = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const addTag = () => {
    const tag = normalizeTag(draft)
    setDraft('')
    setAdding(false)
    if (tag && !tags.includes(tag)) onUpdate(item.word, { tags: [...tags, tag] })
  }

  const startExampleEdit = () => {
    setExampleDraft(item.example ?? '')
    setExampleKoDraft(item.exampleKo ?? '')
    setEditingExample(true)
  }

  // emptying the English sentence removes the example (and its translation) again
  const saveExample = () => {
    const example = exampleDraft.trim()
    onUpdate(item.word, { example, exampleKo: example ? exampleKoDraft.trim() : '' })
    setEditingExample(false)
  }

  // several synonyms can be typed at once, separated by commas
  const addSynonyms = () => {
    const typed = synonymDraft.split(',').map((s) => s.trim()).filter(Boolean)
    setSynonymDraft('')
    setAddingSynonym(false)
    const known = new Set(synonyms.map((s) => s.toLowerCase()))
    const fresh = typed.filter((s) => {
      const key = s.toLowerCase()
      if (known.has(key) || key === item.word.toLowerCase()) return false
      known.add(key)
      return true
    })
    if (fresh.length > 0) onUpdate(item.word, { synonyms: [...synonyms, ...fresh] })
  }

  const removeSynonym = (synonym) => onUpdate(item.word, { synonyms: synonyms.filter((s) => s !== synonym) })

  const removeTag = (tag) => onUpdate(item.word, { tags: tags.filter((t) => t !== tag) })

  const handleDelete = () => {
    if (!window.confirm(`'${item.word}' 단어를 삭제할까요?`)) return
    onDelete(item.word)
    onClose()
  }

  return (
    <div className="word-detail" role="dialog" aria-modal="true" aria-label={`${item.word} 단어 카드`}>
      <button type="button" className="word-detail__backdrop" aria-label="닫기" onClick={onClose} />

      <div className="word-detail__sheet">
        <button type="button" className="word-detail__delete" onClick={handleDelete}>
          단어 삭제
        </button>

        <div className="word-detail__head">
          <p className="word-detail__word">{item.word}</p>
          <div className="word-detail__pron">
            {item.phonetic && <span>{item.phonetic}</span>}
            <SpeakButton word={item.word} />
          </div>
        </div>

        {item.meaning && <p className="word-detail__meaning">{item.meaning}</p>}

        <div className="word-detail__block">
          <div className="word-detail__label-row">
            <p className="word-detail__label">예문</p>
            {item.example && !editingExample ? (
              <button type="button" className="word-detail__link" onClick={startExampleEdit}>
                수정
              </button>
            ) : (
              <a
                className="word-detail__link"
                href={searchUrl(item.word, 'example')}
                target="_blank"
                rel="noopener noreferrer"
              >
                네이버 영어사전에서 검색 ↗
              </a>
            )}
          </div>

          {editingExample ? (
            <form
              className="word-detail__example-form"
              onSubmit={(e) => {
                e.preventDefault()
                saveExample()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  setEditingExample(false)
                }
              }}
            >
              <textarea
                autoFocus
                rows={2}
                value={exampleDraft}
                placeholder={`영어 예문 (예: I like ${item.word}.)`}
                aria-label="영어 예문"
                onChange={(e) => setExampleDraft(e.target.value)}
              />
              <input
                value={exampleKoDraft}
                placeholder="한국어 번역 (선택)"
                aria-label="한국어 번역"
                onChange={(e) => setExampleKoDraft(e.target.value)}
              />
              <div className="word-detail__example-actions">
                <button type="button" onClick={() => setEditingExample(false)}>
                  취소
                </button>
                <button type="submit" className="word-detail__save">
                  저장
                </button>
              </div>
            </form>
          ) : item.example ? (
            <div className="word-detail__example">
              <Example sentence={item.example} word={item.word} />
              {item.exampleKo && <p>{item.exampleKo}</p>}
            </div>
          ) : (
            <button type="button" className="word-detail__example-empty" onClick={startExampleEdit}>
              <span>+</span> 검색한 예문을 붙여넣어 보세요
            </button>
          )}
        </div>

        <div className="word-detail__block">
          <div className="word-detail__label-row">
            <p className="word-detail__label">유의어</p>
            {(synonyms.length === 0 || addingSynonym) && (
              <a
                className="word-detail__link"
                href={searchUrl(item.word, 'synonyms')}
                target="_blank"
                rel="noopener noreferrer"
              >
                네이버 영어사전에서 검색 ↗
              </a>
            )}
          </div>
          <div className="word-detail__tags">
            {synonyms.map((synonym) => (
              <span key={synonym} className="word-detail__synonym">
                {synonym}
                <button type="button" aria-label={`${synonym} 유의어 삭제`} onClick={() => removeSynonym(synonym)}>
                  ×
                </button>
              </span>
            ))}
            {addingSynonym ? (
              <input
                className="word-detail__tag-input"
                autoFocus
                value={synonymDraft}
                placeholder="유의어"
                aria-label="새 유의어"
                onChange={(e) => setSynonymDraft(e.target.value)}
                onBlur={addSynonyms}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  if (e.key === 'Escape') {
                    e.stopPropagation()
                    setSynonymDraft('')
                    setAddingSynonym(false)
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className="word-detail__tag-add"
                aria-label="유의어 추가"
                onClick={() => setAddingSynonym(true)}
              >
                +
              </button>
            )}
          </div>
        </div>

        <div className="word-detail__block">
          <p className="word-detail__label">태그</p>
          <div className="word-detail__tags">
            {tags.map((tag) => (
              <span key={tag} className="word-detail__tag">
                {tag}
                <button type="button" aria-label={`${tag} 태그 삭제`} onClick={() => removeTag(tag)}>
                  ×
                </button>
              </span>
            ))}
            {adding ? (
              <input
                className="word-detail__tag-input"
                autoFocus
                value={draft}
                maxLength={12}
                placeholder="#태그"
                aria-label="새 태그"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={addTag}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  if (e.key === 'Escape') {
                    e.stopPropagation()
                    setDraft('')
                    setAdding(false)
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className="word-detail__tag-add"
                aria-label="태그 추가"
                onClick={() => setAdding(true)}
              >
                +
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
