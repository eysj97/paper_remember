import { useEffect, useRef, useState } from 'react'
import BottomNav from '../components/BottomNav.jsx'
import UploadHeader from '../components/UploadHeader.jsx'
import craftBg from '../../imges/craft-page-sm.png'
import ringTrack from '../assets/processing/ring-track.svg'
import { enrichWords } from '../services/dictionary.js'
import './ProcessingPage.css'

// geometry of the Figma ring (node 84:438): 207x206 box, 12.2px thick
const VIEW_W = 207
const VIEW_H = 206
const STROKE = 12.2
const RX = VIEW_W / 2 - STROKE / 2
const RY = VIEW_H / 2 - STROKE / 2

// words: [{ word, meaning }] from the upload page. Each one is looked up in the dictionary
// (pronunciation, example, synonyms); progress follows how many are done, and onComplete
// receives the finished list.
export default function ProcessingPage({ words = [], studyMode, onComplete, onNavigate }) {
  const [done, setDone] = useState(0)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const controller = new AbortController()
    setDone(0)

    enrichWords(words, { signal: controller.signal, onProgress: setDone })
      .then((results) => onCompleteRef.current?.(results))
      .catch((err) => {
        if (err.name !== 'AbortError') throw err
      })

    return () => controller.abort()
  }, [words])

  const percent = words.length === 0 ? 0 : Math.round((done / words.length) * 100)

  return (
    <div className="page processing-page" data-name="단어 정리중">
      <UploadHeader studyMode={studyMode} />

      <div className="processing-page__contents">
        <div
          className="processing-page__ring"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <img src={ringTrack} alt="" />
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width={VIEW_W} height={VIEW_H} aria-hidden="true">
            <defs>
              <pattern id="processing-ring-fill" patternUnits="userSpaceOnUse" width={VIEW_W} height={VIEW_H}>
                <image href={craftBg} width={VIEW_W} height={VIEW_H} preserveAspectRatio="xMidYMid slice" />
              </pattern>
            </defs>
            {percent > 0 && (
              <ellipse
                className="processing-page__arc"
                cx={VIEW_W / 2}
                cy={VIEW_H / 2}
                rx={RX}
                ry={RY}
                fill="none"
                stroke="url(#processing-ring-fill)"
                strokeWidth={STROKE}
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray={`${percent} 100`}
                transform={`rotate(-90 ${VIEW_W / 2} ${VIEW_H / 2})`}
              />
            )}
          </svg>
          <span className="processing-page__percent">{percent}%</span>
        </div>

        <p className="processing-page__title">단어 정리중 ...</p>
        <p className="processing-page__desc">AI가 단어의 예문, 유의어, 발음을 찾고 있습니다.</p>
      </div>

      <BottomNav active="upload" onNavigate={onNavigate} />
    </div>
  )
}
