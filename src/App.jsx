import { useEffect, useState } from 'react'
import CoverPage from './pages/CoverPage.jsx'
import Onboarding2 from './pages/Onboarding2.jsx'
import Onboarding3 from './pages/Onboarding3.jsx'
import Onboarding4 from './pages/Onboarding4.jsx'
import Onboarding5 from './pages/Onboarding5.jsx'
import HomePage from './pages/HomePage.jsx'
import UploadPage from './pages/UploadPage.jsx'
import ProcessingPage from './pages/ProcessingPage.jsx'
import ResultPage from './pages/ResultPage.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import StudyPage from './pages/StudyPage.jsx'
import { applyAnswer } from './services/study.js'
import { loadWordbook, removeWord, saveWordbook, upsertWords } from './services/wordbook.js'

const ONBOARDING_PAGES = [CoverPage, Onboarding2, Onboarding3, Onboarding4, Onboarding5]

// screens shown once onboarding is finished; the bottom nav reaches home / upload / library ('book')
const NAV_SCREENS = ['home', 'upload', 'book']

export default function App() {
  const [pageIndex, setPageIndex] = useState(0)
  const [screen, setScreen] = useState(null)
  // study purpose picked in onboarding: 'exam' | 'conversation' | null (not chosen yet)
  const [studyMode, setStudyMode] = useState(null)
  const [pendingWords, setPendingWords] = useState([])
  // words with pronunciation / example / synonyms filled in, shown on the result page
  const [enrichedWords, setEnrichedWords] = useState([])
  const [wordbook, setWordbook] = useState(loadWordbook)
  // which study button was pressed in the library: 'new' | 'review' | 'wrong'
  const [studyKind, setStudyKind] = useState('new')

  useEffect(() => {
    saveWordbook(wordbook)
  }, [wordbook])

  const registerWords = (words, tags) => setWordbook((prev) => upsertWords(prev, words, tags))

  // a misspelled word is swapped for the corrected one (or dropped if that one is already listed)
  const replaceWord = (oldWord, next) => {
    setEnrichedWords((prev) => {
      const listed = prev.some((w) => w.word.toLowerCase() === next.word.toLowerCase())
      return listed ? prev.filter((w) => w.word !== oldWord) : prev.map((w) => (w.word === oldWord ? next : w))
    })
    setWordbook((prev) => removeWord(prev, oldWord))
  }

  // edits made from a word card in the library
  const updateWord = (word, patch) =>
    setWordbook((prev) => prev.map((w) => (w.word === word ? { ...w, ...patch } : w)))
  const deleteWord = (word) => setWordbook((prev) => removeWord(prev, word))

  // every answer in a study session moves that word along its review schedule
  const recordAnswer = (word, correct) =>
    setWordbook((prev) => prev.map((w) => (w.word === word ? applyAnswer(w, correct) : w)))

  if (screen) {
    const navigate = (id) => NAV_SCREENS.includes(id) && setScreen(id)

    if (screen === 'home') return <HomePage words={wordbook} studyMode={studyMode} onNavigate={navigate} />
    if (screen === 'study') {
      // full screen: no bottom nav while studying
      return (
        <StudyPage
          key={studyKind}
          kind={studyKind}
          words={wordbook}
          studyMode={studyMode}
          onAnswer={recordAnswer}
          onExit={() => setScreen('book')}
        />
      )
    }
    if (screen === 'book') {
      return (
        <LibraryPage
          words={wordbook}
          studyMode={studyMode}
          onNavigate={navigate}
          onStartStudy={(kind) => {
            setStudyKind(kind)
            setScreen('study')
          }}
          onUpdateWord={updateWord}
          onDeleteWord={deleteWord}
        />
      )
    }
    if (screen === 'processing') {
      return (
        <ProcessingPage
          words={pendingWords}
          studyMode={studyMode}
          onNavigate={navigate}
          onComplete={(results) => {
            setEnrichedWords(results)
            setScreen('result')
          }}
        />
      )
    }
    if (screen === 'result') {
      return (
        <ResultPage
          words={enrichedWords}
          studyMode={studyMode}
          onRegister={registerWords}
          onReplaceWord={replaceWord}
          onNavigate={navigate}
        />
      )
    }
    return (
      <UploadPage
        studyMode={studyMode}
        onNavigate={navigate}
        onAddWords={(words) => {
          setPendingWords(words)
          setScreen('processing')
        }}
      />
    )
  }

  const isLast = pageIndex === ONBOARDING_PAGES.length - 1
  const goBack = pageIndex > 0 ? () => setPageIndex((i) => i - 1) : undefined
  const goNext = isLast ? () => setScreen('home') : () => setPageIndex((i) => i + 1)

  const Page = ONBOARDING_PAGES[pageIndex]
  return (
    <Page onBack={goBack} onNext={goNext} studyMode={studyMode} onStudyModeChange={setStudyMode} />
  )
}
