import React from 'react';
import { Sparkles, Flame, Zap, Trophy, Volume2, VolumeX, Moon, Sun, User } from 'lucide-react';
import { sound } from '../services/sound';

export default function Header({
  user,
  progress,
  theme,
  setTheme,
  isMuted,
  setIsMuted,
  onOpenAuth,
  currentTab,
  setCurrentTab,
}) {
  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
    if (!next) sound.playCorrect();
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <header className="header-container">
      <div className="header-inner">
        {/* ロゴ */}
        <div className="logo-group" onClick={() => setCurrentTab('home')}>
          <div className="logo-badge">
            <Sparkles className="logo-icon" size={20} />
          </div>
          <div className="logo-text">
            <span className="logo-title">WordQuest</span>
            <span className="logo-tag">Web Edition</span>
          </div>
        </div>

        {/* PC向けナビゲーション */}
        <nav className="header-nav pc-only-nav">
          <button
            className={`nav-link ${currentTab === 'home' || currentTab === 'quiz' || currentTab === 'result' ? 'active' : ''}`}
            onClick={() => setCurrentTab('home')}
          >
            4択テスト
          </button>
          <button
            className={`nav-link ${currentTab === 'wordlist' ? 'active' : ''}`}
            onClick={() => setCurrentTab('wordlist')}
          >
            単語帳 (8,114語)
          </button>
          <button
            className={`nav-link ${currentTab === 'ranking' ? 'active' : ''}`}
            onClick={() => setCurrentTab('ranking')}
          >
            <Trophy size={16} className="nav-icon-trophy" />
            週間ランキング
          </button>
        </nav>

        {/* ユーザー進捗ステータス & コントロール */}
        <div className="header-actions">
          {/* ストリーク（連続日数） */}
          <div className="stat-badge streak-badge" title="連続学習日数">
            <Flame size={16} className="flame-icon" />
            <span className="stat-value">{progress.streak || 1}</span>
            <span className="stat-unit">日</span>
          </div>

          {/* 累計EXP */}
          <div className="stat-badge exp-badge" title="累計獲得EXP">
            <Zap size={16} className="exp-icon" />
            <span className="stat-value">{progress.totalExp || 0}</span>
            <span className="stat-unit">EXP</span>
          </div>

          {/* サウンド & テーマ切替 */}
          <button className="icon-btn" onClick={toggleSound} title={isMuted ? '音声オン' : '消音'}>
            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>

          <button className="icon-btn" onClick={toggleTheme} title="テーマ切替">
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* ユーザーアカウント */}
          <button className="user-btn" onClick={onOpenAuth} title="アカウント情報・ログイン">
            <span className="user-avatar">{user.avatar || '🎓'}</span>
            <span className="user-name">{user.isLoggedIn ? user.name : '無料登録 / ログイン'}</span>
          </button>
        </div>
      </div>

      {/* スマホ画面用：上部ナビゲーションタブバー（画面最上部に常時固定表示） */}
      <div className="mobile-top-nav-bar">
        <button
          className={`mobile-nav-btn ${currentTab === 'home' || currentTab === 'quiz' || currentTab === 'result' ? 'active' : ''}`}
          onClick={() => setCurrentTab('home')}
        >
          <span>🎯 4択テスト</span>
        </button>
        <button
          className={`mobile-nav-btn ${currentTab === 'wordlist' ? 'active' : ''}`}
          onClick={() => setCurrentTab('wordlist')}
        >
          <span>📖 単語帳 (8,114語)</span>
        </button>
        <button
          className={`mobile-nav-btn ${currentTab === 'ranking' ? 'active' : ''}`}
          onClick={() => setCurrentTab('ranking')}
        >
          <Trophy size={14} className="mobile-trophy-icon" />
          <span>ランキング</span>
        </button>
      </div>
    </header>
  );
}
