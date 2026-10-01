import React, { useState, useEffect, useRef } from 'react';
import { Volume2, ArrowLeft, Check, X, Sparkles, HelpCircle, ArrowRight, CornerDownLeft } from 'lucide-react';
import { sound } from '../services/sound';

export default function TypingView({
  words,
  onComplete,
  onBack,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [masteredIds, setMasteredIds] = useState([]);
  const [reviewIds, setReviewIds] = useState([]);
  const inputRef = useRef(null);

  const currentWord = words[currentIndex] || words[0];

  useEffect(() => {
    setInputVal('');
    setIsAnswered(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, currentWord]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isAnswered) {
      handleNext();
      return;
    }

    const trimmed = inputVal.trim().toLowerCase();
    const correct = trimmed === currentWord.word.toLowerCase();

    setIsAnswered(true);
    setIsCorrect(correct);
    sound.speak(currentWord.word);

    if (correct) {
      sound.playCorrect();
      setScore(prev => prev + 1);
      setMasteredIds(prev => [...prev, currentWord.id]);
    } else {
      sound.playIncorrect();
      setReviewIds(prev => [...prev, currentWord.id]);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < words.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      const earnedExp = score * 25 + 40;
      onComplete({
        total: words.length,
        correctCount: score,
        earnedExp,
        masteredIds,
        reviewIds,
        words,
      });
    }
  };

  const progressPercent = ((currentIndex + 1) / words.length) * 100;

  return (
    <div className="quiz-view-container">
      <div className="quiz-top-bar">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>中断する</span>
        </button>

        <div className="quiz-progress-info">
          <span className="quiz-count">
            Typing <strong>{currentIndex + 1}</strong> / {words.length}
          </span>
          <div className="quiz-track">
            <div className="quiz-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className="quiz-score-badge">
          <Sparkles size={16} className="text-warning" />
          <span>{score * 25} EXP</span>
        </div>
      </div>

      <div className={`quiz-main-card ${isAnswered ? (isCorrect ? 'answered-correct' : 'answered-incorrect') : ''}`}>
        <div className="quiz-card-header">
          <span className="quiz-level-badge">{currentWord.level}</span>
          <span className="quiz-pos-badge">{currentWord.partOfSpeech}</span>
        </div>

        <div className="word-hero-display">
          <span className="typing-instruction-tag">この日本語に対応する英単語をタイピング：</span>
          <h2 className="quiz-meaning-text">{currentWord.meaning}</h2>
          
          {/* ヒント文字数 */}
          <div className="typing-hint-letters">
            {currentWord.word.split('').map((char, i) => (
              <span key={i} className="hint-letter-slot">
                {isAnswered ? char : (i === 0 ? char : '_')}
              </span>
            ))}
          </div>
        </div>

        {/* 入力フォーム */}
        <form onSubmit={handleSubmit} className="typing-form-wrapper">
          <div className="typing-input-box">
            <input
              ref={inputRef}
              type="text"
              className={`typing-input ${isAnswered ? (isCorrect ? 'correct' : 'wrong') : ''}`}
              placeholder="英単語を入力して Enter"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={isAnswered}
              autoComplete="off"
              autoFocus
            />
            <button type="submit" className="typing-submit-btn">
              <CornerDownLeft size={18} />
            </button>
          </div>
        </form>

        {isAnswered && (
          <div className="example-reveal-box">
            <div className="phonetic-group">
              <strong className="correct-word-label">正解: {currentWord.word}</strong>
              <span className="phonetic-text">{currentWord.phonetic}</span>
              <button
                className="speak-btn-large"
                onClick={() => sound.speak(currentWord.word)}
              >
                <Volume2 size={18} />
              </button>
            </div>
            <p className="example-en">"{currentWord.exampleEn}"</p>
            <p className="example-ja">{currentWord.exampleJa}</p>
          </div>
        )}

        {isAnswered && (
          <div className="quiz-next-bar">
            <div className="answer-feedback-text">
              {isCorrect ? (
                <span className="feedback-badge correct">
                  <Check size={18} /> 正解！ (+25 EXP)
                </span>
              ) : (
                <span className="feedback-badge wrong">
                  <X size={18} /> 不正解
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
    </div>
  );
}
