import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, ArrowLeft, Check, X, Sparkles, HelpCircle, ArrowRight, RotateCcw, AlertTriangle } from 'lucide-react';
import { sound } from '../services/sound';
import AdBanner from './AdBanner';

export default function QuizView({
  words,
  onComplete,
  onBack,
  onReportWord,
}) {
  // words: 初期の出題単語リスト
  const [quizQueue, setQuizQueue] = useState(words); // 現在の出題キュー
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  
  // 間違えた単語の追跡（ラストにまとめる用）
  const [mistakeWords, setMistakeWords] = useState([]);
  const [isRevengeRound, setIsRevengeRound] = useState(false);
  
  // 全回答履歴
  const [answeredResults, setAnsweredResults] = useState([]); // [{ wordId, isCorrect }]
  
  // 自動送りタイマー
  const autoNextTimerRef = useRef(null);

  const currentWord = quizQueue[currentIndex] || quizQueue[0];

  // 単語切り替え時に自動発音 & 状態リセット
  useEffect(() => {
    if (currentWord) {
      sound.speak(currentWord.word);
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
    return () => {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    };
  }, [currentIndex, currentWord]);

  // 次の問題へ進む処理
  const proceedToNext = useCallback(() => {
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);

    if (currentIndex + 1 < quizQueue.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // 現在のキューが終了
      if (!isRevengeRound && mistakeWords.length > 0) {
        // 通常ラウンド終了 & 間違えた問題がある場合 -> ラストにまとめて再出題！
        setIsRevengeRound(true);
        setQuizQueue([...mistakeWords]);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setIsAnswered(false);
        sound.playCorrect(); // リベンジ突入効果音
      } else {
        // 全問（リベンジ含む）終了
        const earnedExp = score * 20 + 50;
        onComplete({
          total: words.length,
          correctCount: score,
          earnedExp,
          answeredWordResults: answeredResults,
          words,
          mistakes: mistakeWords,
        });
      }
    }
  }, [currentIndex, quizQueue, isRevengeRound, mistakeWords, score, words, answeredResults, onComplete]);

  // 回答処理（選択した瞬間に正誤判定 ＆ すぐ次の問題へ）
  const handleAnswer = useCallback((optionText) => {
    if (isAnswered || !currentWord) return;

    const correct = optionText === currentWord.meaning;
    setSelectedAnswer(optionText);
    setIsAnswered(true);
    setIsCorrect(correct);

    // 履歴に追加
    setAnsweredResults(prev => [...prev, { wordId: currentWord.id, isCorrect: correct }]);

    if (correct) {
      sound.playCorrect();
      if (!isRevengeRound) {
        setScore(prev => prev + 1);
      }
      // 正解時：約0.38秒で超爆速自動送り
      autoNextTimerRef.current = setTimeout(() => {
        proceedToNext();
      }, 380);
    } else {
      sound.playIncorrect();
      // 初回ラウンドで間違えた場合、ラスト復習リストに追加
      if (!isRevengeRound) {
        setMistakeWords(prev => {
          if (prev.some(w => w.id === currentWord.id)) return prev;
          return [...prev, currentWord];
        });
      }
      // 不正解時：約0.95秒（正解の意味を確認できる時間）で自動送り（タップで即スキップ可）
      autoNextTimerRef.current = setTimeout(() => {
        proceedToNext();
      }, 950);
    }
  }, [isAnswered, currentWord, isRevengeRound, proceedToNext]);

  // キーボードショートカット（1〜4キーで解答、Enter/Spaceで即次へ）
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['1', '2', '3', '4'].includes(e.key) && !isAnswered) {
        const optionIndex = parseInt(e.key, 10) - 1;
        if (currentWord?.options && currentWord.options[optionIndex]) {
          handleAnswer(currentWord.options[optionIndex]);
        }
      } else if ((e.key === 'Enter' || e.key === ' ') && isAnswered) {
        e.preventDefault();
        proceedToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, currentWord, handleAnswer, proceedToNext]);

  if (!currentWord) return null;

  const totalQuestions = quizQueue.length;
  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="quiz-view-container">
      {/* リベンジラウンド告知バナー（間違えた問題のラストまとめ出題時） */}
      {isRevengeRound && (
        <div className="revenge-banner">
          <div className="revenge-badge">
            <RotateCcw size={16} className="spin-icon" />
            <span>ラスト復習ラウンド突入！</span>
          </div>
          <p className="revenge-desc">間違えた {mistakeWords.length} 単語をまとめて再出題中。全問正解で完全マスター！</p>
        </div>
      )}

      {/* 上部ヘッダー */}
      <div className="quiz-top-bar">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>中断</span>
        </button>

        <div className="quiz-progress-info">
          <span className="quiz-count">
            {isRevengeRound ? '復習' : 'Question'} <strong>{currentIndex + 1}</strong> / {totalQuestions}
          </span>
          <div className="quiz-track">
            <div
              className={`quiz-fill ${isRevengeRound ? 'revenge-fill' : ''}`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        <div className="quiz-score-badge">
          <Sparkles size={16} className="text-warning" />
          <span>{score * 20} EXP</span>
        </div>
      </div>

      {/* クイズカード本体 */}
      <div
        className={`quiz-main-card ${isAnswered ? (isCorrect ? 'answered-correct' : 'answered-incorrect') : ''}`}
        onClick={() => {
          // 回答済みの時にカードをクリックすると即時スキップして次へ
          if (isAnswered) proceedToNext();
        }}
      >
        <div className="quiz-card-header">
          <div className="card-header-left">
            <span className="quiz-level-badge">{currentWord.level || 'A2'}</span>
            <span className="quiz-pos-badge">{currentWord.partOfSpeech}</span>
            {isRevengeRound && (
              <span className="revenge-pill">要復習単語</span>
            )}
          </div>

          {/* 単語ミス報告クイックボタン */}
          <button
            className="report-typo-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onReportWord) onReportWord(currentWord);
            }}
            title="この単語のスペルや訳ミスを報告"
          >
            <AlertTriangle size={13} />
            <span>単語ミス報告</span>
          </button>
        </div>

        {/* 英単語表示 */}
        <div className="word-hero-display">
          <h2 className="quiz-word-text">{currentWord.word}</h2>
          <div className="phonetic-group">
            <span className="phonetic-text">{currentWord.phonetic}</span>
            <button
              className="speak-btn-large"
              onClick={(e) => {
                e.stopPropagation();
                sound.speak(currentWord.word);
              }}
              title="発音を聞く"
            >
              <Volume2 size={20} />
            </button>
          </div>
        </div>

        {/* 例文（回答後に表示） */}
        {isAnswered && (
          <div className="example-reveal-box">
            <p className="example-en">"{currentWord.exampleEn}"</p>
            <p className="example-ja">{currentWord.exampleJa}</p>
          </div>
        )}

        {/* 4択選択肢リスト */}
        <div className="options-grid">
          {currentWord.options.map((option, idx) => {
            const isThisOption = selectedAnswer === option;
            const isRightOption = option === currentWord.meaning;
            
            let optionClass = 'quiz-option-btn';
            if (isAnswered) {
              if (isRightOption) optionClass += ' correct';
              else if (isThisOption && !isCorrect) optionClass += ' wrong';
              else optionClass += ' disabled';
            }

            return (
              <button
                key={idx}
                className={optionClass}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAnswer(option);
                }}
                disabled={isAnswered}
              >
                <span className="key-shortcut-badge">{idx + 1}</span>
                <span className="option-text">{option}</span>
                {isAnswered && isRightOption && <Check size={20} className="option-status-icon correct" />}
                {isAnswered && isThisOption && !isCorrect && <X size={20} className="option-status-icon wrong" />}
              </button>
            );
          })}
        </div>

        {/* 回答後のクイック通知バー */}
        {isAnswered && (
          <div className="quiz-next-bar">
            <div className="answer-feedback-text">
              {isCorrect ? (
                <span className="feedback-badge correct">
                  <Check size={18} /> 正解！ (+20 EXP)
                </span>
              ) : (
                <span className="feedback-badge wrong">
                  <X size={18} /> 不正解（ラストに再出題されます）
                </span>
              )}
            </div>

            <button
              className="next-question-btn"
              onClick={(e) => {
                e.stopPropagation();
                proceedToNext();
              }}
            >
              <span>すぐ次へ [Enter]</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* キーボード & 操作ガイド */}
      <div className="keyboard-guide">
        <span>⚡ <strong>爆速オート進行中</strong>：解答後すぐ次の問題へ進みます（タップで即スキップ可）</span>
      </div>

      {/* 下部スポンサー広告枠 */}
      <div className="quiz-ad-container">
        <AdBanner slot="quiz-bottom" />
      </div>
    </div>
  );
}
