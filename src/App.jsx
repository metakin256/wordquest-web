import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ModeSelect from './components/ModeSelect';
import QuizView from './components/QuizView';
import ResultModal from './components/ResultModal';
import RankingView from './components/RankingView';
import WordListView from './components/WordListView';
import AuthModal from './components/AuthModal';

import { WORDS_DATABASE, generateOptionsForWord } from './data/words';
import { storage } from './services/storage';
import './App.css';

export default function App() {
  const [theme, setTheme] = useState(() => storage.getTheme());
  const [user, setUser] = useState(() => storage.getUser());
  const [progress, setProgress] = useState(() => storage.getProgress());
  const [isMuted, setIsMuted] = useState(false);
  const [questionCount, setQuestionCountState] = useState(() => storage.getQuestionCount());

  // 画面状態: 'home' | 'quiz' | 'result' | 'ranking' | 'wordlist'
  const [currentView, setCurrentView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sessionWords, setSessionWords] = useState([]);
  const [lastResult, setLastResult] = useState(null);

  // ログイン・登録モーダル
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // 問題数の変更・保存
  const handleSetQuestionCount = (count) => {
    setQuestionCountState(count);
    storage.saveQuestionCount(count);
  };

  // テーマ適用 & サボり防止リマインダー定期チェック
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    storage.saveTheme(theme);
  }, [theme]);

  // 単語抽出ヘルパー（指定問題数でシャッフル抽出 & 4択選択肢を自動生成）
  const getFilteredWords = (catId, count = questionCount) => {
    let pool = catId === 'all'
      ? [...WORDS_DATABASE]
      : WORDS_DATABASE.filter(w => w.category === catId);
    
    // シャッフル
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
    
    // 各単語に4択選択肢を生成して付与
    return shuffled.map(w => ({
      ...w,
      options: generateOptionsForWord(w, pool),
    }));
  };

  // 4択テスト開始
  const handleStartQuiz = (catId, count = questionCount) => {
    const words = getFilteredWords(catId, count);
    setSessionWords(words);
    setSelectedCategory(catId);
    setCurrentView('quiz');
  };

  // テスト完了処理（オリジナルアプリと完全同一の正誤記録 & 習得計算）
  const handleSessionComplete = (resultData) => {
    const { answeredWordResults, earnedExp } = resultData;
    const updatedProgress = storage.recordQuizAnswers(answeredWordResults || [], earnedExp || 100);
    setProgress(updatedProgress);
    setLastResult(resultData);
    setCurrentView('result');
  };

  return (
    <div className="app-layout">
      <div className="app-bg-glow"></div>

      {/* グローバルヘッダー */}
      <Header
        user={user}
        progress={progress}
        theme={theme}
        setTheme={setTheme}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onOpenAuth={() => setIsAuthOpen(true)}
        currentTab={currentView}
        setCurrentTab={(tab) => setCurrentView(tab)}
      />

      {/* メインコンテンツエリア */}
      <main className="app-main-content">
        {currentView === 'home' && (
          <ModeSelect
            user={user}
            progress={progress}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            questionCount={questionCount}
            setQuestionCount={handleSetQuestionCount}
            onStartQuiz={handleStartQuiz}
            onOpenWordList={() => setCurrentView('wordlist')}
            onOpenRanking={() => setCurrentView('ranking')}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {currentView === 'quiz' && (
          <QuizView
            words={sessionWords}
            onComplete={handleSessionComplete}
            onBack={() => setCurrentView('home')}
          />
        )}

        {currentView === 'result' && lastResult && (
          <ResultModal
            resultData={lastResult}
            onRetry={() => {
              handleStartQuiz(selectedCategory, questionCount);
            }}
            onGoHome={() => setCurrentView('home')}
            onOpenRanking={() => setCurrentView('ranking')}
          />
        )}

        {currentView === 'ranking' && (
          <RankingView onBack={() => setCurrentView('home')} />
        )}

        {currentView === 'wordlist' && (
          <WordListView progress={progress} onBack={() => setCurrentView('home')} />
        )}
      </main>

      {/* フッター */}
      <footer className="app-footer">
        <div className="footer-inner">
          <p>© 2026 苦しんで覚える英単語 Web版. 高校生特化 爆速4択英単語暗記</p>
          <div className="footer-links">
            <button className="footer-link" onClick={() => setIsAuthOpen(true)}>
              {user?.isLoggedIn ? 'マイアカウント' : '無料アカウント作成'}
            </button>
            <span className="dot-sep">•</span>
            <button className="footer-link" onClick={() => setCurrentView('wordlist')}>
              単語帳 (全8,114語)
            </button>
            <span className="dot-sep">•</span>
            <button className="footer-link" onClick={() => setCurrentView('ranking')}>
              週間ランキング
            </button>
          </div>
        </div>
      </footer>

      {/* 認証・ログインモーダル */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onUserUpdated={(newUser) => setUser(newUser)}
      />
    </div>
  );
}
