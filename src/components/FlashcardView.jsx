import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, ArrowLeft, RotateCw, Check, X, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';
import { sound } from '../services/sound';

export default function FlashcardView({
  words,
  onComplete,
  onBack,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredList, setMasteredList] = useState([]);
  const [reviewList, setReviewList] = useState([]);

  const currentWord = words[currentIndex] || words[0];

  useEffect(() => {
    setIsFlipped(false);
    if (currentWord) {
      sound.speak(currentWord.word);
    }
  }, [currentIndex, currentWord]);

  const handleFlip = () => {
    setIsFlipped(prev => !prev);
  };

  const handleKnow = useCallback(() => {
    sound.playCorrect();
    setMasteredList(prev => [...prev, currentWord.id]);
    goToNext(true);
  }, [currentWord, currentIndex]);

  const handleDontKnow = useCallback(() => {
    sound.playIncorrect();
    setReviewList(prev => [...prev, currentWord.id]);
    goToNext(false);
  }, [currentWord, currentIndex]);

  const goToNext = (isMastered) => {
    if (currentIndex + 1 < words.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      const finalMastered = isMastered ? [...masteredList, currentWord.id] : masteredList;
      const finalReview = !isMastered ? [...reviewList, currentWord.id] : reviewList;
      const earnedExp = finalMastered.length * 15 + 20;

      onComplete({
        total: words.length,
        correctCount: finalMastered.length,
        earnedExp,
        masteredIds: finalMastered,
        reviewIds: finalReview,
        words,
      });
    }
  };

  // キーボード操作（Spaceで裏返し、左右矢印または 1/2 で振り分け）
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowRight' || e.key === '2') {
        e.preventDefault();
        handleKnow();
      } else if (e.key === 'ArrowLeft' || e.key === '1') {
        e.preventDefault();
        handleDontKnow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKnow, handleDontKnow]);

  const progressPercent = ((currentIndex + 1) / words.length) * 100;

  return (
    <div className="flashcard-view-container">
      {/* 上部ヘッダー */}
      <div className="quiz-top-bar">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>中断する</span>
        </button>

        <div className="quiz-progress-info">
          <span className="quiz-count">
            Card <strong>{currentIndex + 1}</strong> / {words.length}
          </span>
          <div className="quiz-track">
            <div className="quiz-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className="card-counts-pill">
          <span className="count-known">覚えた: {masteredList.length}</span>
          <span className="count-review">要復習: {reviewList.length}</span>
        </div>
      </div>

      {/* 3Dフリップカード */}
      <div className="flashcard-wrapper" onClick={handleFlip}>
        <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
          {/* 表面 (英語) */}
          <div className="flashcard-face flashcard-front">
            <div className="card-top-tags">
              <span className="quiz-level-badge">{currentWord.level}</span>
              <span className="quiz-pos-badge">{currentWord.partOfSpeech}</span>
            </div>

            <div className="card-center-content">
              <h2 className="card-word-title">{currentWord.word}</h2>
              <div className="phonetic-group" onClick={(e) => e.stopPropagation()}>
                <span className="phonetic-text">{currentWord.phonetic}</span>
                <button
                  className="speak-btn-large"
                  onClick={() => sound.speak(currentWord.word)}
                >
                  <Volume2 size={20} />
                </button>
              </div>
            </div>

            <div className="card-bottom-hint">
              <RotateCw size={16} />
              <span>クリック または [Space] で日本語訳を表示</span>
            </div>
          </div>

          {/* 裏面 (日本語訳・解説) */}
          <div className="flashcard-face flashcard-back">
            <div className="card-top-tags">
              <span className="quiz-pos-badge">{currentWord.partOfSpeech}</span>
              <span className="quiz-word-small">{currentWord.word}</span>
            </div>

            <div className="card-center-content">
              <h3 className="card-meaning-title">{currentWord.meaning}</h3>
              <div className="card-example-box">
                <p className="example-en">"{currentWord.exampleEn}"</p>
                <p className="example-ja">{currentWord.exampleJa}</p>
                {currentWord.tip && (
                  <p className="example-tip">
                    <HelpCircle size={14} />
                    {currentWord.tip}
                  </p>
                )}
              </div>
            </div>

            <div className="card-bottom-hint">
              <span>下のボタンで仕分けしてください</span>
            </div>
          </div>
        </div>
      </div>

      {/* アクションボタン（知っている / 要復習） */}
      <div className="flashcard-action-bar">
        <button className="card-btn review" onClick={handleDontKnow}>
          <X size={20} />
          <span>要復習 [← / 1]</span>
        </button>

        <button className="card-btn flip" onClick={handleFlip}>
          <RotateCw size={20} />
          <span>裏返す [Space]</span>
        </button>

        <button className="card-btn know" onClick={handleKnow}>
          <Check size={20} />
          <span>覚えた！ [→ / 2]</span>
        </button>
      </div>
    </div>
  );
}
