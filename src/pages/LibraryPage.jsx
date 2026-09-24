import { useEffect, useMemo, useState } from 'react'
import BottomNav from '../components/BottomNav.jsx'
import UploadHeader from '../components/UploadHeader.jsx'
import WordDetail from '../components/WordDetail.jsx'
import slidersIcon from '../../imges/icon-sliders.png'
import { studyCounts } from '../services/study.js'
import './LibraryPage.css'

const NOTICE_MS = 3000

// 걸러 보기: all / user tags / alphabet / book & paragraph
const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'tag', label: '태그' },
  { id: 'alpha', label: '알파벳' },
  { id: 'book', label: '책·단락' },
]

const firstLetter = (word) => word.trim().charAt(0).toUpperCase()

function countBy(items, getKeys) {
  const counts = new Map()
  for (const item of items) {
    for (const key of getKeys(item)) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

export default function LibraryPage({ words = [], studyMode, onNavigate, onStartStudy, onUpdateWord, onDeleteWord }) {
  const [filter, setFilter] = useState('all')
  const [value, setValue] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [openWord, setOpenWord] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(''), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [notice])

  const newestFirst = useMemo(() => [...words].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0)), [words])

  // how many words each 학습 button has waiting (rules live in services/study.js)
  const stats = useMemo(() => studyCounts(words, studyMode), [words, studyMode])

  const chips = useMemo(() => {
    if (filter === 'tag') return countBy(words, (w) => w.tags ?? [])
    if (filter === 'alpha') return countBy(words, (w) => [firstLetter(w.word)])
    return new Map()
  }, [filter, words])

  const visible = useMemo(() => {
    if (filter === 'tag') return value ? newestFirst.filter((w) => (w.tags ?? []).includes(value)) : newestFirst
    if (filter === 'alpha') {
      const list = value ? words.filter((w) => firstLetter(w.word) === value) : words
      return [...list].sort((a, b) => a.word.localeCompare(b.word))
    }
    if (filter === 'book') return []
    return newestFirst
  }, [filter, value, words, newestFirst])

  const chooseFilter = (id) => {
    setFilter(id)
    setValue(null)
  }

  // the panel can be closed while a filter is still applied, so the icon gets a dot
  const filtering = filter !== 'all'
  const chipEntries = [...chips.entries()].sort(([a], [b]) => a.localeCompare(b))
  const opened = words.find((w) => w.word === openWord)
  // starts a study session for one of the 학습하기 circles; kind matches buildQueue ('new' | 'review' | 'wrong')
  const startStudy = (kind, count) => {
    if (count === 0) {
      setNotice('지금 학습할 단어가 없어요.')
      return
    }
    onStartStudy?.(kind)
  }

  return (
    <div className="page library-page" data-name="라이브러리">
      <div className="library-page__scroll">
        <div className="library-page__inner">
          <UploadHeader studyMode={studyMode} title="라이브러리" subtitle="저장한 단어로 학습해요" fitBox />

          <section className="library-section">
            <h2 className="library-section__title">학습하기</h2>
            <div className="library-study">
              <button type="button" className="library-study__tile" onClick={() => startStudy('new', stats.fresh)}>
                <span className="library-study__circle">
                  <span className="library-study__count">{stats.fresh}</span>
                </span>
                <span className="library-study__label">새로운 단어 암기</span>
              </button>
              <button type="button" className="library-study__tile" onClick={() => startStudy('review', stats.review)}>
                <span className="library-study__circle">
                  <span className="library-study__count">{stats.review}</span>
                </span>
                <span className="library-study__label">복습하기</span>
              </button>
              <button type="button" className="library-study__tile" onClick={() => startStudy('wrong', stats.wrong)}>
                <span className="library-study__circle">
                  <span className="library-study__count">{stats.wrong}</span>
                </span>
                <span className="library-study__label">오답노트</span>
              </button>
            </div>
          </section>

          <section className="library-section">
            <div className="library-section__head">
              <h2 className="library-section__title">
                단어 목록 <span>{visible.length}개</span>
              </h2>
              <button
                type="button"
                className={`library-sliders${filterOpen ? ' library-sliders--open' : ''}`}
                aria-label="걸러 보기"
                aria-expanded={filterOpen}
                onClick={() => setFilterOpen((open) => !open)}
              >
                <img src={slidersIcon} alt="" />
                {filtering && <span className="library-sliders__dot" />}
              </button>
            </div>

            {filterOpen && (
              <div className="library-filter-panel">
                <div className="library-filters" role="tablist" aria-label="걸러 보기">
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      role="tab"
                      aria-selected={filter === f.id}
                      className={`library-filters__tab${filter === f.id ? ' library-filters__tab--active' : ''}`}
                      onClick={() => chooseFilter(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {chipEntries.length > 0 && (
                  <div className="library-chips">
                    {chipEntries.map(([key, count]) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={value === key}
                        className={`library-chip${value === key ? ' library-chip--active' : ''}`}
                        onClick={() => setValue(value === key ? null : key)}
                      >
                        {key} <span>{count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {visible.length === 0 ? (
              <p className="library-empty">
                {words.length === 0 && '아직 담은 단어가 없어요.'}
                {words.length > 0 && filter === 'book' && '원서를 촬영해 담은 단어가 책·단락별로 모여요.'}
                {words.length > 0 && filter === 'tag' && chips.size === 0 && '태그를 붙인 단어가 아직 없어요.'}
                {words.length > 0 && filter !== 'book' && !(filter === 'tag' && chips.size === 0) && '조건에 맞는 단어가 없어요.'}
              </p>
            ) : (
              visible.map((item) => (
                <button
                  key={item.word}
                  type="button"
                  className="library-word"
                  onClick={() => setOpenWord(item.word)}
                >
                  <span className="library-word__head">
                    <span className="library-word__spelling">{item.word}</span>
                    <span className="library-word__meaning">{item.meaning}</span>
                  </span>
                  {item.phonetic && <span className="library-word__phonetic">{item.phonetic}</span>}
                  {item.tags?.length > 0 && (
                    <span className="library-word__tags">{item.tags.join(' ')}</span>
                  )}
                </button>
              ))
            )}

            {words.length === 0 && (
              <button type="button" className="library-add" onClick={() => onNavigate?.('upload')}>
                단어 추가하기
              </button>
            )}
          </section>
        </div>
      </div>

      <BottomNav active="book" onNavigate={onNavigate} />

      {notice && (
        <p className="library-page__notice" role="status">
          {notice}
        </p>
      )}

      {opened && (
        <WordDetail
          item={opened}
          onClose={() => setOpenWord(null)}
          onUpdate={onUpdateWord}
          onDelete={onDeleteWord}
        />
      )}
    </div>
  )
}
