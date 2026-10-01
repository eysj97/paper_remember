import { useEffect, useRef, useState } from 'react'
import BottomNav from '../components/BottomNav.jsx'
import CameraCapture from '../components/CameraCapture.jsx'
import UploadHeader from '../components/UploadHeader.jsx'
import cameraIcon from '../assets/upload/camera.svg'
import fileUploadIcon from '../assets/upload/file-upload.svg'
import pencilIcon from '../assets/upload/pencil.svg'
import moreIcon from '../assets/upload/icon-more.svg'
import { readWordsFromImage } from '../services/ocr.js'
import { readWordFile } from '../services/wordFile.js'
import { findMeanings } from '../services/translate.js'
import './UploadPage.css'

// example words shown as placeholders in the manual-entry rows (Figma 84:313)
const PLACEHOLDERS = [
  { word: 'anxious', meaning: '불안한' },
  { word: 'empathy', meaning: '공감' },
]

let nextRowId = 0

// the example hint belongs to the row itself, so removing a row never makes its neighbour
// inherit the removed row's hint (which would look like nothing was deleted)
const createRow = (word = '', meaning = '') => {
  const id = nextRowId++
  return { id, word, meaning, placeholder: PLACEHOLDERS[id % PLACEHOLDERS.length] }
}

function WordRow({ row, canAdd, onChange, onAdd, onRemove }) {
  const { placeholder } = row

  return (
    <div className="upload-row">
      <div className="upload-row__fields">
        <label className="upload-row__field upload-row__field--word">
          <input
            type="text"
            aria-label="영단어"
            value={row.word}
            placeholder={`영단어 : ${placeholder.word}`}
            onChange={(e) => onChange(row.id, 'word', e.target.value)}
          />
        </label>
        <label className="upload-row__field upload-row__field--meaning">
          <input
            type="text"
            aria-label="뜻"
            value={row.meaning}
            // once a word is in (typed, or read from a file / photo with no meaning found), the example
            // meaning of another word would look like an answer, so only "뜻" is shown
            placeholder={row.word.trim() ? '뜻' : `뜻 : ${placeholder.meaning}`}
            onChange={(e) => onChange(row.id, 'meaning', e.target.value)}
          />
        </label>
      </div>
      {canAdd ? (
        <button type="button" className="upload-row__action" aria-label="단어 추가" onClick={onAdd}>
          +
        </button>
      ) : (
        <button
          type="button"
          className="upload-row__action"
          aria-label="단어 삭제"
          onClick={() => onRemove(row.id)}
        >
          -
        </button>
      )}
    </div>
  )
}

const NOTICE_MS = 4000
const FILE_ACCEPT = '.csv,.tsv,.txt,text/*,image/*'

// firstUpload: the wordbook is still empty (right after onboarding), so the page invites the first words
export default function UploadPage({ studyMode, firstUpload = false, onNavigate, onAddWords }) {
  const cameraInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [rows, setRows] = useState(() => [createRow()])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const manualRef = useRef(null)

  // messages fade out on their own, except while a scan is still running
  useEffect(() => {
    if (!notice || notice.persistent) return undefined
    const timer = setTimeout(() => setNotice(null), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [notice])

  const changeRow = (id, field, value) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  const addRow = () => setRows((prev) => [...prev, createRow()])
  // always keep at least one row
  const removeRow = (id) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))

  // phones/tablets: hand off to the device's own camera app (also works over plain http);
  // desktops: in-page live preview, falling back to the file picker if the browser has no camera API
  const openCamera = () => {
    if (busy) return
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
    if (!isTouchDevice && navigator.mediaDevices?.getUserMedia) setCameraOpen(true)
    else cameraInputRef.current?.click()
  }

  // scanned / imported words land in the manual-entry rows so they can be reviewed before registering
  const applyWords = (found) => {
    setRows((prev) => {
      const kept = prev.filter((r) => r.word.trim() || r.meaning.trim())
      const have = new Set(kept.map((r) => r.word.trim().toLowerCase()))
      const added = found
        .filter((w) => !have.has(w.word.toLowerCase()))
        .map((w) => createRow(w.word, w.meaning))
      const next = [...kept, ...added]
      return next.length ? next : [createRow()]
    })
    setManualOpen(true)
    requestAnimationFrame(() =>
      manualRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  // words that came without a meaning get one looked up right away, so the rows show it before
  // registering; anything typed in meanwhile is left alone
  const fillMeanings = async (words) => {
    const missing = words.filter((w) => !w.meaning.trim()).map((w) => w.word)
    if (missing.length === 0) return
    const progress = (done) => setNotice({ text: `뜻을 찾는 중이에요... (${done}/${missing.length})`, persistent: true })
    progress(0)
    const found = await findMeanings(missing, {
      onFound: (word, meaning) =>
        setRows((prev) =>
          prev.map((r) =>
            r.word.trim().toLowerCase() === word.toLowerCase() && !r.meaning.trim() ? { ...r, meaning } : r,
          ),
        ),
      onProgress: progress,
    })
    setNotice({
      text:
        found === missing.length
          ? `뜻을 채웠어요. 틀린 뜻은 고쳐 주세요.`
          : `뜻 ${found}개를 채웠어요. 빈 칸은 등록할 때 채워요.`,
    })
  }

  const handleImage = async (image) => {
    setBusy(true)
    setNotice({ text: '사진에서 글자를 읽는 중이에요...', persistent: true })
    try {
      const words = await readWordsFromImage(image)
      if (words.length === 0) {
        setNotice({ text: '단어를 못 찾았어요. 더 밝게 다시 찍어 주세요.' })
      } else {
        const found = words.map((word) => ({ word, meaning: '' }))
        applyWords(found)
        await fillMeanings(found)
      }
    } catch {
      setNotice({ text: '글자를 읽지 못했어요. 다시 시도해 주세요.' })
    } finally {
      setBusy(false)
    }
  }

  const handleFile = async (file) => {
    if (file.type.startsWith('image/')) return handleImage(file)
    if (!/\.(csv|tsv|txt)$/i.test(file.name) && !file.type.startsWith('text/')) {
      setNotice({ text: '.csv, .txt 파일이나 사진만 올릴 수 있어요.' })
      return undefined
    }
    try {
      const words = await readWordFile(file)
      if (words.length === 0) {
        setNotice({ text: "'영단어,뜻' 형식의 줄을 찾지 못했어요." })
      } else {
        applyWords(words)
        if (words.every((w) => w.meaning.trim())) {
          setNotice({ text: `단어 ${words.length}개를 불러왔어요.` })
        } else {
          setBusy(true)
          await fillMeanings(words)
        }
      }
    } catch {
      setNotice({ text: '파일을 읽지 못했어요.' })
    } finally {
      setBusy(false)
    }
    return undefined
  }

  const pickFrom = (handler) => (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) handler(file)
  }

  // the meaning is optional: the dictionary's English definition fills in when it is left empty
  const registerWords = () => {
    const filled = rows.filter((r) => r.word.trim())
    if (filled.length === 0) {
      setNotice({ text: '등록할 영단어를 입력해 주세요.' })
      return
    }
    onAddWords?.(filled.map(({ word, meaning }) => ({ word: word.trim(), meaning: meaning.trim() })))
    setRows([createRow()])
  }

  return (
    <div className="page upload-page" data-name="업로드">
      <div className="upload-page__scroll">
        <div className="upload-page__inner">
          <UploadHeader
            studyMode={studyMode}
            fitBox={firstUpload}
            {...(firstUpload && { title: '첫 단어를 담아 볼까요?', subtitle: '단어를 담으면 학습이 시작돼요' })}
          />

          <div className="upload-cards">
            {firstUpload && (
              <div className="upload-welcome" role="note">
                <p className="upload-welcome__title">단어장이 아직 비어 있어요</p>
                <p className="upload-welcome__body">
                  아래 세 가지 방법 중 편한 걸로 외우고 싶은 단어를 담아 주세요.
                  <br />
                  담은 단어로 홈의 오늘의 학습이 만들어져요.
                </p>
              </div>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="upload-card__file-input"
              onChange={pickFrom(handleImage)}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept={FILE_ACCEPT}
              className="upload-card__file-input"
              onChange={pickFrom(handleFile)}
            />

            <button type="button" className="upload-card" onClick={openCamera}>
              <span className="upload-card__head">
                <span className="upload-card__icon">
                  <img src={cameraIcon} alt="" />
                </span>
                <span className="upload-card__label upload-card__label--semibold">단어 촬영하기</span>
              </span>
              <span className="upload-card__desc">
                <span>단어가 있는 어떤 사진이든지 촬영하면</span>
                <span>스캔을 통해 단어를 파악하고</span>
                <span>뜻과 예문, 발음, 유의어까지 자동생성되어요</span>
              </span>
            </button>

            <button type="button" className="upload-card" onClick={() => !busy && fileInputRef.current?.click()}>
              <span className="upload-card__head">
                <span className="upload-card__icon upload-card__icon--file">
                  <img src={fileUploadIcon} alt="" />
                </span>
                <span className="upload-card__label upload-card__label--semibold">파일 업로드</span>
              </span>
              <span className="upload-card__desc">
                <span>단어 뜻이 담긴 파일을 넣으면</span>
                <span>예문, 발음, 유의어까지 자동으로 채워요.</span>
              </span>
            </button>

            <div ref={manualRef} className="upload-card upload-card--manual">
              <button
                type="button"
                className="upload-card__toggle"
                aria-expanded={manualOpen}
                onClick={() => setManualOpen((open) => !open)}
              >
                <span className="upload-card__head">
                  <span className="upload-card__icon">
                    <img src={pencilIcon} alt="" />
                  </span>
                  <span className="upload-card__label upload-card__label--bold">직접추가하기</span>
                </span>
                <span className="upload-card__more-row">
                  <span className="upload-card__desc">
                    <span>직접 영단어와 뜻을 입력하면</span>
                    <span>예문, 발음, 유의어가 자동으로 채워져요.</span>
                  </span>
                  <img
                    className={`upload-card__more${manualOpen ? ' upload-card__more--open' : ''}`}
                    src={moreIcon}
                    alt=""
                  />
                </span>
              </button>

              {manualOpen && (
                <>
                  {rows.map((row, index) => (
                    <WordRow
                      key={row.id}
                      row={row}
                      canAdd={index === rows.length - 1}
                      onChange={changeRow}
                      onAdd={addRow}
                      onRemove={removeRow}
                    />
                  ))}
                  <button type="button" className="upload-card__register" onClick={registerWords}>
                    단어등록
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <BottomNav active="upload" onNavigate={onNavigate} />

      {notice && (
        <p className="upload-page__notice" role="status">
          {notice.text}
        </p>
      )}

      {cameraOpen && <CameraCapture onCapture={handleImage} onClose={() => setCameraOpen(false)} />}
    </div>
  )
}
