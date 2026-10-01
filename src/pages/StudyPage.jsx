import { useState } from 'react'
import ModeBadge from '../components/ModeBadge.jsx'
import { Example, SpeakButton } from '../components/WordText.jsx'
import {
  BLANK,
  CHIP_TYPES,
  QUESTION_LABELS,
  TYPED_TYPES,
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

const TYPED_PLACEHOLDERS = { meaning: '뜻 입력', makeSentence: '영어 문장 입력' }

// the sentence with the studied word underlined (contextMeaning)
function UnderlinedSentence({ sentence, word }) {
  const parts = sentence.split(new RegExp(`(${wordPattern(word).source})`, 'i'))
  return (
    <p className="study-sentence">
      {parts.map((part, i) => (i % 2 === 1 ? <u key={i}>{part}</u> : part))}
    </p>
  )
}

// a sentence with the word blanked out (cloze, clozeTyped, dialogue)
function BlankedText({ text }) {
  const parts = text.split(BLANK)
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 && <span className="study-blank" />}
    </span>
  ))
}

// the meaning prompt shared by spelling / wordChoice / letterBlank / anagram
function MeaningPrompt({ item, hint, children }) {
  return (
    <div className="study-prompt">
      <p className="study-prompt__meaning">{item.meaning}</p>
      {children}
      <p className="study-prompt__hint">{hint}</p>
    </div>
  )
}

// the word prompt shared by meaning / meaningChoice / synonym / makeSentence
function WordPrompt({ item, hint, showMeaning = false }) {
  return (
    <div className="study-prompt">
      <p className="study-prompt__word">{item.word}</p>
      <div className="study-prompt__pron">
        {item.phonetic && <span>{item.phonetic}</span>}
        <SpeakButton word={item.word} />
      </div>
      {showMeaning && item.meaning && <p className="study-prompt__hint">{item.meaning}</p>}
      <p className="study-prompt__hint">{hint}</p>
    </div>
  )
}

function Prompt({ question }) {
  const { type, item } = question
  const letterCount = item.word.replace(/\s/g, '').length

  switch (type) {
    case 'meaning':
      return <WordPrompt item={item} hint="이 단어의 뜻을 입력해 주세요" />
    case 'meaningChoice':
      return <WordPrompt item={item} hint="알맞은 뜻을 골라 주세요" />
    case 'synonym':
      return <WordPrompt item={item} hint="뜻이 비슷한 단어를 골라 주세요" />
    case 'makeSentence':
      return <WordPrompt item={item} showMeaning hint="이 단어를 넣어 영어 문장을 만들어 주세요 (3단어 이상)" />
    case 'spelling':
      return <MeaningPrompt item={item} hint={`뜻에 맞는 영단어를 입력해 주세요 (글자 수 ${letterCount})`} />
    case 'wordChoice':
      return <MeaningPrompt item={item} hint="뜻에 맞는 영단어를 골라 주세요" />
    case 'letterBlank':
      return (
        <MeaningPrompt item={item} hint="빈칸을 채워 영단어를 입력해 주세요">
          <p className="study-pattern">{question.pattern}</p>
        </MeaningPrompt>
      )
    case 'anagram':
      return <MeaningPrompt item={item} hint="철자를 순서대로 눌러 영단어를 완성해 주세요" />
    case 'matching':
      return (
        <div className="study-prompt">
          <p className="study-prompt__hint">영단어와 뜻을 차례로 눌러 짝을 맞춰 주세요</p>
        </div>
      )
    case 'cloze':
    case 'clozeTyped':
      return (
        <div className="study-prompt">
          <p className="study-sentence">
            <BlankedText text={question.sentence} />
          </p>
          {item.exampleKo && <p className="study-prompt__hint">{item.exampleKo}</p>}
          {type === 'clozeTyped' && (
            <p className="study-prompt__hint">빈칸에 들어갈 영단어를 입력해 주세요 (글자 수 {letterCount})</p>
          )}
        </div>
      )
    case 'contextMeaning':
      return (
        <div className="study-prompt">
          <UnderlinedSentence sentence={question.sentence} word={item.word} />
          <p className="study-prompt__hint">밑줄 친 단어의 뜻은?</p>
        </div>
      )
    case 'translation':
      return (
        <div className="study-prompt">
          <p className="study-sentence">{item.example}</p>
          <p className="study-prompt__hint">알맞은 해석을 골라 주세요</p>
        </div>
      )
    case 'sentenceOrder':
      return (
        <div className="study-prompt">
          <p className="study-prompt__hint">문장을 순서대로 눌러 예문을 완성해 주세요</p>
        </div>
      )
    case 'dialogue':
      return (
        <div className="study-dialogue">
          {question.turns.map((turn, i) => (
            <div key={i} className={`study-dialogue__turn${i % 2 === 1 ? ' study-dialogue__turn--reply' : ''}`}>
              <span className="study-dialogue__speaker">{turn.speaker}</span>
              <p className="study-dialogue__bubble">
                <BlankedText text={turn.text} />
              </p>
            </div>
          ))}
          <p className="study-prompt__hint">빈칸에 알맞은 말을 골라 주세요</p>
        </div>
      )
    default:
      // arrange
      return (
        <div className="study-prompt">
          <p className="study-prompt__meaning">{item.exampleKo}</p>
          <p className="study-prompt__hint">단어를 순서대로 눌러 영어 문장을 완성해 주세요</p>
        </div>
      )
  }
}

// 짝 맞추기: tap a word, then its meaning. Tapping a paired word (or meaning) undoes that pair.
function Matching({ question, pairs, picked, onPick, onPair, onUnpair, done }) {
  const pairNumber = (word) => question.words.indexOf(word) + 1
  const wordOfMeaning = (meaning) => Object.keys(pairs).find((w) => pairs[w] === meaning)
  const stateOf = (word) => {
    if (!done || !pairs[word]) return ''
    return question.pairs.find((p) => p.word === word).meaning === pairs[word] ? ' study-match__item--right' : ' study-match__item--wrong'
  }

  return (
    <div className="study-match">
      <div className="study-match__column">
        {question.words.map((word) => (
          <button
            key={word}
            type="button"
            disabled={done}
            className={`study-match__item${picked === word ? ' study-match__item--picked' : ''}${pairs[word] ? ' study-match__item--paired' : ''}${stateOf(word)}`}
            onClick={() => (pairs[word] ? onUnpair(word) : onPick(picked === word ? null : word))}
          >
            {pairs[word] && <span className="study-match__badge">{pairNumber(word)}</span>}
            {word}
          </button>
        ))}
      </div>
      <div className="study-match__column">
        {question.meanings.map((meaning) => {
          const owner = wordOfMeaning(meaning)
          return (
            <button
              key={meaning}
              type="button"
              disabled={done}
              className={`study-match__item${owner ? ' study-match__item--paired' : ''}${owner ? stateOf(owner) : ''}`}
              onClick={() => {
                if (picked) onPair(picked, meaning)
                else if (owner) onUnpair(owner)
              }}
            >
              {owner && <span className="study-match__badge">{pairNumber(owner)}</span>}
              {meaning}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Feedback({ question, correct, answer }) {
  const { item, type } = question
  const empty = answer === null || answer === '' || (type === 'matching' && Object.keys(answer ?? {}).length === 0)
  const given = empty ? '(모르겠어요)' : answerText(question, answer)

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
        <span>{type === 'makeSentence' ? '예시' : '정답'}</span> {correctAnswerText(question)}
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
  // matching: { word: meaning } so far, and the word waiting for its meaning
  const [pairs, setPairs] = useState({})
  const [pickedWord, setPickedWord] = useState(null)

  const question = questions[index]
  const total = questions.length
  const answered = phase === 'feedback' ? index + 1 : index
  const percent = total ? Math.round((phase === 'done' ? total : answered) / total * 100) : 0

  const clearAnswer = () => {
    setAnswer(null)
    setTyped('')
    setPlaced([])
    setPairs({})
    setPickedWord(null)
  }

  const finish = (given, ok) => {
    setAnswer(given)
    setCorrect(ok)
    setPhase('feedback')
    setResults((prev) => [...prev, { item: question.item, correct: ok }])
    if (record) onAnswer?.(question.item.word, ok)
  }

  const submit = (given) => finish(given, gradeAnswer(question, given))
  const skip = () => finish(question.type === 'matching' ? {} : null, false)

  const next = () => {
    if (index + 1 >= total) {
      setPhase('done')
      return
    }
    setIndex(index + 1)
    setPhase('answer')
    clearAnswer()
  }

  const retry = (items) => {
    const fresh = items.map((item) => words.find((w) => w.word === item.word) ?? item)
    setQuestions(makeQuestions(fresh, studyMode, words))
    setRecord(false)
    setIndex(0)
    setPhase('answer')
    setResults([])
    clearAnswer()
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
  const { type } = question
  const typedType = TYPED_TYPES.has(type)
  const chipType = CHIP_TYPES.has(type)
  const chipById = (id) => question.chips?.find((chip) => chip.id === id)
  const pool = question.chips?.filter((chip) => !placed.includes(chip.id)) ?? []
  const allPaired = type === 'matching' && Object.keys(pairs).length === question.pairs.length

  const pair = (word, meaning) => {
    setPairs((prev) => {
      const nextPairs = Object.fromEntries(Object.entries(prev).filter(([, m]) => m !== meaning))
      return { ...nextPairs, [word]: meaning }
    })
    setPickedWord(null)
  }
  const unpair = (word) => {
    setPairs((prev) => Object.fromEntries(Object.entries(prev).filter(([w]) => w !== word)))
    setPickedWord(word)
  }

  return (
    <div className="page study-page" data-name="학습">
      {header}

      <div className="study-body">
        <span className="study-type">{QUESTION_LABELS[type]}</span>
        <Prompt question={question} />

        {question.choices && (
          <div className="study-choices">
            {question.choices.map((choice) => {
              const isRight = choice === question.answer
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
              placeholder={TYPED_PLACEHOLDERS[type] ?? '영단어 입력'}
              aria-label="정답 입력"
              onChange={(e) => setTyped(e.target.value)}
            />
          </form>
        )}

        {chipType && (
          <div className={`study-arrange${type === 'sentenceOrder' ? ' study-arrange--stack' : ''}`}>
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
              {!inFeedback && placed.length === 0 && (
                <span className="study-arrange__empty">
                  {type === 'anagram' ? '여기에 단어가 만들어져요' : '여기에 문장이 만들어져요'}
                </span>
              )}
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

        {type === 'matching' && (
          <Matching
            question={question}
            pairs={inFeedback ? answer ?? {} : pairs}
            picked={pickedWord}
            onPick={setPickedWord}
            onPair={pair}
            onUnpair={unpair}
            done={inFeedback}
          />
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
            {(typedType || chipType || type === 'matching') && (
              <button
                type="button"
                className="study-button"
                disabled={typedType ? !typed.trim() : chipType ? placed.length === 0 : !allPaired}
                onClick={() => submit(typedType ? typed : chipType ? placed : pairs)}
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
