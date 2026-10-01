import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, ArrowLeft, Check, X, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';
import { sound } from '../services/sound';

export default function QuizView({
  words,
  onComplete,
  onBack,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredResults, setAnsweredResults] = useState([]); // [{ wordId, isCorrect }]
  const [showTip, setShowTip] = useState(false);

  const currentWord = words[currentIndex] || words[0];

  // 単語切り替え時に自動発音（オプション）
  useEffect(() => {
    if (currentWord) {
      sound.speak(currentWord.word);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setShowTip(false);
    }
  }, [currentIndex, currentWord]);

  // 回答処理
  const handleAnswer = useCallback((optionText) => {
    if (isAnswered) return;

    const correct = optionText === currentWord.meaning;
    setSelectedAnswer(optionText);
    setIsAnswered(true);
    setIsCorrect(correct);

    setAnsweredResults(prev => [...prev, { wordId: currentWord.id, isCorrect: correct }]);

    if (correct) {
      sound.playCorrect();
      setScore(prev => prev + 1);
    } else {
      sound.playIncorrect();
    }
  }, [isAnswered, currentWord]);

  // 次の問題へ
  const handleNext = useCallback(() => {
    if (currentIndex + 1 < words.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // 終了
      const earnedExp = score * 20 + 30; // 基本EXP + ボーナス
      onComplete({
        total: words.length,
        correctCount: score,
        earnedExp,
        answeredWordResults: answeredResults,
        words,
      });
    }
  }, [currentIndex, words, score, answeredResults, onComplete]);


  // キーボードショートカット（1〜4キーで解答、Enter/Spaceで次へ）
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['1', '2', '3', '4'].includes(e.key) && !isAnswered) {
        const optionIndex = parseInt(e.key, 10) - 1;
        if (currentWord.options && currentWord.options[optionIndex]) {
          handleAnswer(currentWord.options[optionIndex]);
        }
      } else if ((e.key === 'Enter' || e.key === ' ') && isAnswered) {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, currentWord, handleAnswer, handleNext]);

  const progressPercent = ((currentIndex + 1) / words.length) * 100;

  return (
    <div className="quiz-view-container">
      {/* 上部ヘッダー */}
      <div className="quiz-top-bar">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>中断する</span>
        </button>

        <div className="quiz-progress-info">
          <span className="quiz-count">
            Question <strong>{currentIndex + 1}</strong> / {words.length}
          </span>
          <div className="quiz-track">
            <div className="quiz-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className="quiz-score-badge">
          <Sparkles size={16} className="text-warning" />
          <span>{score * 20} EXP</span>
        </div>
      </div>

      {/* クイズカード本体 */}
      <div className={`quiz-main-card ${isAnswered ? (isCorrect ? 'answered-correct' : 'answered-incorrect') : ''}`}>
        <div className="quiz-card-header">
          <span className="quiz-level-badge">{currentWord.level || 'A2'}</span>
          <span className="quiz-pos-badge">{currentWord.partOfSpeech}</span>
        </div>

        {/* 英単語表示 */}
        <div className="word-hero-display">
          <h2 className="quiz-word-text">{currentWord.word}</h2>
          <div className="phonetic-group">
            <span className="phonetic-text">{currentWord.phonetic}</span>
            <button
              className="speak-btn-large"
              onClick={() => sound.speak(currentWord.word)}
              title="発音を聞く"
            >
              <Volume2 size={20} />
            </button>
          </div>
        </div>

        {/* 例文（回答後にハイライト表示） */}
        {isAnswered && (
          <div className="example-reveal-box">
            <p className="example-en">"{currentWord.exampleEn}"</p>
            <p className="example-ja">{currentWord.exampleJa}</p>
            {currentWord.tip && (
              <p className="example-tip">
                <HelpCircle size={14} />
                {currentWord.tip}
              </p>
            )}
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
                onClick={() => handleAnswer(option)}
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

        {/* 回答後の次へ進むフッターバー */}
        {isAnswered && (
          <div className="quiz-next-bar">
            <div className="answer-feedback-text">
              {isCorrect ? (
                <span className="feedback-badge correct">
                  <Check size={18} /> 正解！ (+20 EXP)
                </span>
              ) : (
                <span className="feedback-badge wrong">
                  <X size={18} /> 不正解（復習リストに追加）
                </span>
              )}
            </div>

            <button className="next-question-btn" onClick={handleNext}>
              <span>{currentIndex + 1 === words.length ? '結果を見る' : '次の問題へ [Enter]'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* キーボードガイド */}
      <div className="keyboard-guide">
        <span>💡 キーボードの <strong>[1〜4]</strong> キーで解答、<strong>[Enter]</strong> または <strong>[Space]</strong> で次へ進めます</span>
      </div>
    </div>
  );
}
