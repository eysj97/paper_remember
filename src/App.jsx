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
import MyPage from './pages/MyPage.jsx'
import LoginPage, { LoadingPage } from './pages/LoginPage.jsx'
import { applyAnswer } from './services/study.js'
import { dateToTime, goalTitle } from './services/goal.js'
import { loadWordbook, removeWord, saveWordbook, upsertWords } from './services/wordbook.js'
import { defaultProfile, loadProfile, saveProfile } from './services/profile.js'
import { loadStudyLog, logAnswer, saveStudyLog } from './services/studyLog.js'
import { clearAllData, STORAGE_KEYS } from './services/backup.js'
import { loadGuest, saveGuest, serverEnabled, supabase } from './services/supabase.js'
import { clearMeta, hasData } from './services/sync.js'
import useAuth from './hooks/useAuth.js'
import useCloudSync from './hooks/useCloudSync.js'

const ONBOARDING_PAGES = [CoverPage, Onboarding2, Onboarding3, Onboarding4, Onboarding5]

// screens shown once onboarding is finished; the bottom nav reaches home / upload / library ('book') / mypage ('user')
const NAV_SCREENS = ['home', 'upload', 'book', 'user']

// what each onboarding page needs before it lets you go on (pages without a question always can)
const ONBOARDING_REQUIREMENTS = {
  2: (p) => Boolean(p.studyMode), // 학습 목적: 시험 / 회화
  3: (p) => Boolean(goalTitle(p.goal)) && dateToTime(p.goal.endDate) >= dateToTime(p.goal.startDate), // 목표 + 기간
  4: (p) => p.nickname.trim().length > 0, // 닉네임
}

const startScreen = (profile, wordbook) => {
  if (!profile.onboardedAt) return null
  return wordbook.length > 0 ? 'home' : 'upload'
}

export default function App() {
  const [pageIndex, setPageIndex] = useState(0)
  // nickname, picture, study purpose ('exam' | 'conversation' | null), goal and settings —
  // filled in during onboarding and changed later in mypage
  const [profile, setProfile] = useState(loadProfile)
  const [wordbook, setWordbook] = useState(loadWordbook)
  // returning visits skip onboarding: home once there are words, otherwise the upload page to get some
  const [screen, setScreen] = useState(() => startScreen(profile, wordbook))
  const updateProfile = (patch) => setProfile((prev) => ({ ...prev, ...patch }))
  const studyMode = profile.studyMode
  const setStudyMode = (mode) => updateProfile({ studyMode: mode })
  // answers per day, for streaks and the record charts
  const [studyLog, setStudyLog] = useState(loadStudyLog)
  const [pendingWords, setPendingWords] = useState([])
  // words with pronunciation / example / synonyms filled in, shown on the result page
  const [enrichedWords, setEnrichedWords] = useState([])
  // which study button was pressed in the library: 'new' | 'review' | 'wrong'
  const [studyKind, setStudyKind] = useState('new')

  useEffect(() => {
    saveWordbook(wordbook)
  }, [wordbook])
  useEffect(() => {
    saveProfile(profile)
  }, [profile])
  useEffect(() => {
    saveStudyLog(studyLog)
  }, [studyLog])

  // the app open in another tab saved something: pick it up so this tab doesn't overwrite it later
  useEffect(() => {
    const sync = (e) => {
      if (e.key && !STORAGE_KEYS.includes(e.key)) return
      setWordbook(loadWordbook())
      setProfile(loadProfile())
      setStudyLog(loadStudyLog())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  // login (server). Without server keys the app stays local-only and never shows the login screen.
  const auth = useAuth()
  const [guest, setGuest] = useState(loadGuest)
  // "이미 계정이 있어요" on the cover: log in before onboarding (returning user on a new device)
  const [loginFirst, setLoginFirst] = useState(false)
  const chooseGuest = (value) => {
    saveGuest(value)
    setGuest(value)
  }

  // the server copy arrived (sign-in, or another device saved meanwhile)
  const applyRemote = (data) => {
    setWordbook(data.wordbook)
    setProfile(data.profile)
    setStudyLog(data.studyLog)
    setScreen((current) => current ?? startScreen(data.profile, data.wordbook))
  }
  const sync = useCloudSync({ user: auth.user, data: { wordbook, profile, studyLog }, onRemote: applyRemote })

  // signed in from guest mode: the guest data goes into the account (merged by the sync)
  useEffect(() => {
    if (auth.user && guest) chooseGuest(false)
  }, [auth.user, guest])

  // what's on this device belongs to the account, so signing out clears it
  const signOut = async () => {
    await sync.flush()
    await supabase.auth.signOut()
    clearAllData()
    clearMeta()
    setWordbook([])
    setProfile(loadProfile())
    setStudyLog({})
    setPageIndex(0)
    setScreen(null)
    setLoginFirst(false)
  }

  // a backup file was restored (it is already stored; this shows it)
  const applyBackup = (data) => {
    setWordbook(data.wordbook)
    setProfile(data.profile)
    setStudyLog(data.studyLog)
  }

  // 탈퇴: a signed-in account is deleted on the server (its saved row goes with it), then this
  // device is wiped and the app starts over from the cover page
  const withdraw = async () => {
    if (auth.user) {
      const { error } = await supabase.rpc('delete_my_account')
      if (error) throw new Error('탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요.')
      // the account is gone, so only the session kept in this browser needs clearing
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    }
    clearAllData()
    clearMeta()
    chooseGuest(false)
    setWordbook([])
    setProfile(loadProfile())
    setStudyLog({})
    setPageIndex(0)
    setScreen(null)
    setLoginFirst(false)
  }

  const registerWords = (words) => setWordbook((prev) => upsertWords(prev, words))

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
  const recordAnswer = (word, correct) => {
    setWordbook((prev) => prev.map((w) => (w.word === word ? applyAnswer(w, correct, studyMode) : w)))
    setStudyLog((prev) => logAnswer(prev, correct))
  }

  if (!auth.ready) return <LoadingPage />
  if (auth.recovering) return <LoginPage initialMode="recover" onRecovered={auth.finishRecovery} />
  // login comes after onboarding: new users see what the app does first, then sign up to keep their words
  if (serverEnabled && !auth.user && !guest) {
    if (profile.onboardedAt) {
      return <LoginPage key="after-onboarding" initialMode="signup" onGuest={() => chooseGuest(true)} />
    }
    if (loginFirst) return <LoginPage key="from-cover" onCancel={() => setLoginFirst(false)} />
  }
  // first sync on a device with nothing on it yet: wait for the account's data instead of starting onboarding
  if (sync.status === 'loading' && !hasData({ wordbook, profile, studyLog })) {
    return <LoadingPage text="단어장을 불러오는 중이에요…" />
  }

  if (screen) {
    const navigate = (id) => NAV_SCREENS.includes(id) && setScreen(id)

    if (screen === 'home') {
      return <HomePage words={wordbook} profile={profile} studyLog={studyLog} onNavigate={navigate} />
    }
    if (screen === 'user') {
      return (
        <MyPage
          words={wordbook}
          profile={profile}
          studyLog={studyLog}
          onProfileChange={updateProfile}
          onRestore={applyBackup}
          onWithdraw={withdraw}
          account={{
            serverEnabled,
            email: auth.user?.email ?? null,
            syncStatus: sync.status,
            onSignIn: () => chooseGuest(false),
            onSignOut: signOut,
          }}
          onNavigate={navigate}
        />
      )
    }
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
        firstUpload={wordbook.length === 0}
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
  // finishing onboarding opens the upload page first, so the first thing to do is put words in
  const finishOnboarding = () => {
    if (!profile.onboardedAt) updateProfile({ onboardedAt: Date.now() })
    setScreen('upload')
  }
  const canNext = ONBOARDING_REQUIREMENTS[pageIndex]?.(profile) ?? true
  const goNext = () => {
    if (!canNext) return
    // leaving the cover starts onboarding over: answers left from an unfinished earlier try are cleared
    if (pageIndex === 0 && !profile.onboardedAt) setProfile(defaultProfile())
    if (isLast) finishOnboarding()
    else setPageIndex((i) => i + 1)
  }

  const Page = ONBOARDING_PAGES[pageIndex]
  return (
    <Page
      onBack={goBack}
      onNext={goNext}
      canNext={canNext}
      onLogin={
        serverEnabled && !auth.user
          ? () => {
              // an earlier "로그인 없이 시작하기" would otherwise keep the login screen from showing
              chooseGuest(false)
              setLoginFirst(true)
            }
          : undefined
      }
      studyMode={studyMode}
      onStudyModeChange={setStudyMode}
      goal={profile.goal}
      onGoalChange={(goal) => updateProfile({ goal })}
      profile={profile}
      onProfileChange={updateProfile}
    />
  )
}
