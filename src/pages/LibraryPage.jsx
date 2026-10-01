import { useEffect, useMemo, useState } from 'react'
import BottomNav from '../components/BottomNav.jsx'
import UploadHeader from '../components/UploadHeader.jsx'
import WordDetail from '../components/WordDetail.jsx'
import { studyCounts } from '../services/study.js'
import './LibraryPage.css'

const NOTICE_MS = 3000

export default function LibraryPage({ words = [], studyMode, onNavigate, onStartStudy, onUpdateWord, onDeleteWord }) {
  const [openWord, setOpenWord] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(''), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [notice])

  // the word list reads A to Z
  const visible = useMemo(
    () => [...words].sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' })),
    [words],
  )

  // how many words each 학습 button has waiting (rules live in services/study.js)
  const stats = useMemo(() => studyCounts(words, studyMode), [words, studyMode])

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
            <h2 className="library-section__title">
              단어 목록 <span>{visible.length}개</span>
            </h2>

            {visible.length === 0 ? (
              <p className="library-empty">아직 담은 단어가 없어요.</p>
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
                </button>
              ))
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
          onUpdate={(word, patch) => {
            onUpdateWord?.(word, patch)
            // a corrected spelling is the word's new key, so the open card follows it
            if (patch.word) setOpenWord(patch.word)
          }}
          onDelete={onDeleteWord}
          isTaken={(word) => words.some((w) => w.word.toLowerCase() === word.toLowerCase())}
        />
      )}
    </div>
  )
}
