import { useState } from 'react'
import ModeBadge from '../components/ModeBadge.jsx'
import { Example, SpeakButton } from '../components/WordText.jsx'
import {
  BLANK,
  QUESTION_LABELS,
  answerText,
  correctAnswerText,
  gradeAnswer,
  makeQuestions,
} from '../services/quiz.js'
import { buildQueue } from '../services/study.js'
import { wordPattern } from '../services/text.js'
import './StudyPage.css'

const EMPTY_MESSAGES = {
  new: '새로 학습할 단어가 없어요.',
  review: '지금 복습할 단어가 없어요.',
  wrong: '틀린 단어가 없어요.',
}

const TITLES = { new: '새로운 단어 암기', review: '복습하기', wrong: '오답노트' }

// the sentence with the studied word underlined (contextMeaning)
function UnderlinedSentence({ sentence, word }) {
  const parts = sentence.split(new RegExp(`(${wordPattern(word).source})`, 'i'))
  return (
    <p className="study-sentence">
      {parts.map((part, i) => (i % 2 === 1 ? <u key={i}>{part}</u> : part))}
    </p>
  )
}

// the sentence with the word blanked out (cloze)
function BlankedSentence({ sentence }) {
  const parts = sentence.split(BLANK)
  return (
    <p className="study-sentence">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <span className="study-blank" />}
        </span>
      ))}
    </p>
  )
}

function Prompt({ question }) {
  const { type, item } = question

  if (type === 'meaning') {
    return (
      <div className="study-prompt">
        <p className="study-prompt__word">{item.word}</p>
        <div className="study-prompt__pron">
          {item.phonetic && <span>{item.phonetic}</span>}
          <SpeakButton word={item.word} />
        </div>
        <p className="study-prompt__hint">이 단어의 뜻을 입력해 주세요</p>
      </div>
    )
  }

  if (type === 'spelling') {
    return (
      <div className="study-prompt">
        <p className="study-prompt__meaning">{item.meaning}</p>
        <p className="study-prompt__hint">뜻에 맞는 영단어를 입력해 주세요 (글자 수 {item.word.replace(/\s/g, '').length})</p>
      </div>
    )
  }

  if (type === 'cloze') {
    return (
      <div className="study-prompt">
        <BlankedSentence sentence={question.sentence} />
        {item.exampleKo && <p className="study-prompt__hint">{item.exampleKo}</p>}
      </div>
    )
  }

  if (type === 'contextMeaning') {
    return (
      <div className="study-prompt">
        <UnderlinedSentence sentence={question.sentence} word={item.word} />
        <p className="study-prompt__hint">밑줄 친 단어의 뜻은?</p>
      </div>
    )
  }

  return (
    <div className="study-prompt">
      <p className="study-prompt__meaning">{item.exampleKo}</p>
      <p className="study-prompt__hint">단어를 순서대로 눌러 영어 문장을 완성해 주세요</p>
    </div>
  )
}

function Feedback({ question, correct, answer }) {
  const { item } = question
  const given = answer === null || answer === '' ? '(모르겠어요)' : answerText(question, answer)

  return (
    <div className="study-feedback">
      <p className={`study-feedback__title study-feedback__title--${correct ? 'right' : 'wrong'}`}>
        {correct ? '정답이에요!' : '아쉬워요'}
      </p>
      {!correct && (
        <p className="study-feedback__row">
          <span>내 답</span> {given}
        </p>
      )}
      <p className="study-feedback__row">
        <span>정답</span> {correctAnswerText(question)}
      </p>

      <div className="study-card">
        <div className="study-card__head">
          <p className="study-card__word">{item.word}</p>
          {item.phonetic && <p className="study-card__phonetic">{item.phonetic}</p>}
          <SpeakButton word={item.word} />
        </div>
        {item.meaning && <p className="study-card__meaning">{item.meaning}</p>}
        {item.example && (
          <div className="study-card__example">
            <Example sentence={item.example} word={item.word} />
            {item.exampleKo && <p>{item.exampleKo}</p>}
          </div>
        )}
        {item.synonyms?.length > 0 && (
          <p className="study-card__synonyms">
            <span>유의어</span> {item.synonyms.join(', ')}
          </p>
        )}
      </div>
    </div>
  )
}

function Result({ results, onExit, onRetry }) {
  const right = results.filter((r) => r.correct).length
  const wrong = results.filter((r) => !r.correct)

  return (
    <div className="study-result">
      <div className="study-result__circle">
        <span>
          {right}
          <small>/{results.length}</small>
        </span>
      </div>
      <p className="study-result__title">학습 완료!</p>
      <p className="study-result__sub">{wrong.length === 0 ? '모두 맞혔어요' : `${wrong.length}개를 틀렸어요`}</p>

      {wrong.length > 0 && (
        <ul className="study-result__wrong">
          {wrong.map(({ item }) => (
            <li key={item.word}>
              <span>{item.word}</span>
              <span>{item.meaning}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="study-result__actions">
        {wrong.length > 0 && (
          <button type="button" className="study-button study-button--ghost" onClick={() => onRetry(wrong.map((r) => r.item))}>
            틀린 단어 다시 풀기
          </button>
        )}
        <button type="button" className="study-button" onClick={onExit}>
          라이브러리로
        </button>
      </div>
    </div>
  )
}

// kind: 'new' | 'review' | 'wrong' (see buildQueue). One session = up to SESSION_SIZE questions.
export default function StudyPage({ kind, words, studyMode, onAnswer, onExit }) {
  const [questions, setQuestions] = useState(() =>
    makeQuestions(buildQueue(kind, words, { mode: studyMode }), studyMode, words),
  )
  // the "wrong words again" round is practice only, so it does not change the review schedule
  const [record, setRecord] = useState(true)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState('answer') // 'answer' | 'feedback' | 'done'
  const [answer, setAnswer] = useState(null)
  const [correct, setCorrect] = useState(false)
  const [results, setResults] = useState([])
  const [typed, setTyped] = useState('')
  const [placed, setPlaced] = useState([])

  const question = questions[index]
  const total = questions.length
  const answered = phase === 'feedback' ? index + 1 : index
  const percent = total ? Math.round((phase === 'done' ? total : answered) / total * 100) : 0

  const finish = (given, ok) => {
    setAnswer(given)
    setCorrect(ok)
    setPhase('feedback')
    setResults((prev) => [...prev, { item: question.item, correct: ok }])
    if (record) onAnswer?.(question.item.word, ok)
  }

  const submit = (given) => finish(given, gradeAnswer(question, given))
  const skip = () => finish(null, false)

  const next = () => {
    if (index + 1 >= total) {
      setPhase('done')
      return
    }
    setIndex(index + 1)
    setPhase('answer')
    setAnswer(null)
    setTyped('')
    setPlaced([])
  }

  const retry = (items) => {
    const fresh = items.map((item) => words.find((w) => w.word === item.word) ?? item)
    setQuestions(makeQuestions(fresh, studyMode, words))
    setRecord(false)
    setIndex(0)
    setPhase('answer')
    setAnswer(null)
    setResults([])
    setTyped('')
    setPlaced([])
  }

  const header = (
    <>
      <div className="study-top">
        <button type="button" className="study-top__close" aria-label="학습 그만하기" onClick={onExit}>
          ×
        </button>
        <p className="study-top__title">{TITLES[kind]}</p>
        {total > 0 && phase !== 'done' && (
          <p className="study-top__count">
            {Math.min(index + 1, total)} / {total}
          </p>
        )}
      </div>
      <ModeBadge studyMode={studyMode} />
      {total > 0 && (
        <div className="study-progress" aria-hidden="true">
          <div className="study-progress__fill" style={{ width: `${percent}%` }} />
        </div>
      )}
    </>
  )

  if (total === 0) {
    return (
      <div className="page study-page" data-name="학습">
        {header}
        <div className="study-empty">
          <p className="study-empty__title">{EMPTY_MESSAGES[kind]}</p>
          {studyMode === 'conversation' && (
            <p className="study-empty__hint">회화 모드에서는 예문이 있는 단어만 문제로 나와요.</p>
          )}
          <button type="button" className="study-button" onClick={onExit}>
            라이브러리로
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="page study-page" data-name="학습 결과">
        {header}
        <Result results={results} onExit={onExit} onRetry={retry} />
      </div>
    )
  }

  const inFeedback = phase === 'feedback'
  const typedType = question.type === 'meaning' || question.type === 'spelling' || (!question.choices && question.type !== 'arrange')
  const chipById = (id) => question.chips?.find((chip) => chip.id === id)
  const pool = question.chips?.filter((chip) => !placed.includes(chip.id)) ?? []

  return (
    <div className="page study-page" data-name="학습">
      {header}

      <div className="study-body">
        <span className="study-type">{QUESTION_LABELS[question.type]}</span>
        <Prompt question={question} />

        {question.choices && (
          <div className="study-choices">
            {question.choices.map((choice) => {
              const isRight = choice === correctAnswerText(question)
              const isPicked = choice === answer
              let state = ''
              if (inFeedback && isRight) state = ' study-choice--right'
              else if (inFeedback && isPicked) state = ' study-choice--wrong'
              return (
                <button
                  key={choice}
                  type="button"
                  className={`study-choice${state}`}
                  disabled={inFeedback}
                  onClick={() => submit(choice)}
                >
                  {choice}
                </button>
              )
            })}
          </div>
        )}

        {typedType && (
          <form
            className="study-typed"
            onSubmit={(e) => {
              e.preventDefault()
              if (!inFeedback && typed.trim()) submit(typed)
            }}
          >
            <input
              autoFocus
              value={inFeedback ? answer ?? '' : typed}
              disabled={inFeedback}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={question.type === 'spelling' || question.type === 'cloze' ? '영단어 입력' : '뜻 입력'}
              aria-label="정답 입력"
              onChange={(e) => setTyped(e.target.value)}
            />
          </form>
        )}

        {question.type === 'arrange' && (
          <div className="study-arrange">
            <div className="study-arrange__built">
              {(inFeedback ? answer ?? [] : placed).map((id) => (
                <button
                  key={id}
                  type="button"
                  className="study-token study-token--placed"
                  disabled={inFeedback}
                  onClick={() => setPlaced(placed.filter((p) => p !== id))}
                >
                  {chipById(id).text}
                </button>
              ))}
              {!inFeedback && placed.length === 0 && <span className="study-arrange__empty">여기에 문장이 만들어져요</span>}
            </div>
            {!inFeedback && (
              <div className="study-arrange__pool">
                {pool.map((chip) => (
                  <button key={chip.id} type="button" className="study-token" onClick={() => setPlaced([...placed, chip.id])}>
                    {chip.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {inFeedback && <Feedback question={question} correct={correct} answer={answer} />}
      </div>

      <div className="study-footer">
        {inFeedback ? (
          <button type="button" className="study-button" onClick={next}>
            {index + 1 >= total ? '결과 보기' : '다음'}
          </button>
        ) : (
          <>
            {(typedType || question.type === 'arrange') && (
              <button
                type="button"
                className="study-button"
                disabled={typedType ? !typed.trim() : placed.length === 0}
                onClick={() => submit(typedType ? typed : placed)}
              >
                확인
              </button>
            )}
            <button type="button" className="study-skip" onClick={skip}>
              모르겠어요
            </button>
          </>
        )}
      </div>
    </div>
  )
}
