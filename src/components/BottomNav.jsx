import React from 'react';
import { PlayCircle, BookOpen, Trophy, User } from 'lucide-react';

export default function BottomNav({ currentTab, setCurrentTab, onOpenAuth, user }) {
  return (
    <div className="mobile-bottom-nav">
      <button
        className={`bottom-nav-item ${currentTab === 'home' || currentTab === 'quiz' ? 'active' : ''}`}
        onClick={() => setCurrentTab('home')}
      >
        <PlayCircle size={22} />
        <span>テスト</span>
      </button>

      <button
        className={`bottom-nav-item ${currentTab === 'wordlist' ? 'active' : ''}`}
        onClick={() => setCurrentTab('wordlist')}
      >
        <BookOpen size={22} />
        <span>単語帳</span>
      </button>

      <button
        className={`bottom-nav-item ${currentTab === 'ranking' ? 'active' : ''}`}
        onClick={() => setCurrentTab('ranking')}
      >
        <Trophy size={22} />
        <span>ランキング</span>
      </button>

      <button
        className="bottom-nav-item"
        onClick={onOpenAuth}
      >
        <span className="bottom-nav-avatar">{user.avatar || '🎓'}</span>
        <span>{user.isLoggedIn ? 'マイページ' : 'ログイン'}</span>
      </button>
    </div>
  );
}
