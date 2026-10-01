import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ModeSelect from './components/ModeSelect';
import QuizView from './components/QuizView';
import ResultModal from './components/ResultModal';
import RankingView from './components/RankingView';
import WordListView from './components/WordListView';
import AuthModal from './components/AuthModal';
import ContactModal from './components/ContactModal';
import AdminDashboardModal from './components/AdminDashboardModal';

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

  // モーダル状態
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // お問い合わせの初期値（単語ミス報告用）
  const [contactInitialWord, setContactInitialWord] = useState('');
  const [contactInitialCategory, setContactInitialCategory] = useState('word_typo');

  // 問題数の変更・保存
  const handleSetQuestionCount = (count) => {
    setQuestionCountState(count);
    storage.saveQuestionCount(count);
  };

  // テーマ適用
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

  // 単語ミス報告クイックオープン
  const handleReportWord = (wordObj) => {
    setContactInitialCategory('word_typo');
    setContactInitialWord(wordObj?.word || '');
    setIsContactOpen(true);
  };

  // 一般のお問い合わせオープン
  const handleOpenGeneralContact = () => {
    setContactInitialCategory('word_typo');
    setContactInitialWord('');
    setIsContactOpen(true);
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
        onOpenContact={handleOpenGeneralContact}
        onOpenAdmin={() => setIsAdminOpen(true)}
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
            onOpenContact={handleOpenGeneralContact}
          />
        )}

        {currentView === 'quiz' && (
          <QuizView
            words={sessionWords}
            onComplete={handleSessionComplete}
            onBack={() => setCurrentView('home')}
            onReportWord={handleReportWord}
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
            onReportWord={handleReportWord}
          />
        )}

        {currentView === 'ranking' && (
          <RankingView onBack={() => setCurrentView('home')} />
        )}

        {currentView === 'wordlist' && (
          <WordListView
            progress={progress}
            onBack={() => setCurrentView('home')}
            onReportWord={handleReportWord}
          />
        )}
      </main>

      {/* フッター */}
      <footer className="app-footer">
        <div className="footer-inner">
          <p>© 2026 苦しんで覚える英単語 Web版. 高校生特化 爆速4択英単語暗記</p>
          <div className="footer-links">
            <button className="footer-link contact-link-highlight" onClick={handleOpenGeneralContact}>
              📩 お問い合わせ・ご意見箱
            </button>
            <span className="dot-sep">•</span>
            <button className="footer-link admin-link-highlight" onClick={() => setIsAdminOpen(true)}>
              📊 管理者ダッシュボード（問合せ＆OS確認）
            </button>
            <span className="dot-sep">•</span>
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

      {/* お問い合わせ・ご意見箱モーダル */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        user={user}
        initialCategory={contactInitialCategory}
        initialWord={contactInitialWord}
      />

      {/* 管理者ダッシュボードモーダル（お問い合わせ一覧＆OS比率確認） */}
      <AdminDashboardModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />
    </div>
  );
}
