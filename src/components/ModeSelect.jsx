import React, { useState } from 'react';
import { Play, CheckCircle2, RotateCcw, Trophy, ArrowRight, Sparkles, Bell, BellRing, Settings2, Sliders, Check } from 'lucide-react';
import { WORD_CATEGORIES, WORDS_DATABASE } from '../data/words';
import { notificationService } from '../services/notification';

export default function ModeSelect({
  user,
  progress,
  selectedCategory,
  setSelectedCategory,
  questionCount,
  setQuestionCount,
  onStartQuiz,
  onOpenWordList,
  onOpenRanking,
  onOpenAuth,
}) {
  const [notifPermission, setNotifPermission] = useState(() => notificationService.getPermission());
  const [testNotifSent, setTestNotifSent] = useState(false);

  const totalWordsCount = WORDS_DATABASE.length;
  const masteredCount = (progress.masteredWordIds || []).length;
  const reviewCount = (progress.reviewWordIds || []).length;
  const progressPercent = Math.min(100, Math.round((masteredCount / totalWordsCount) * 100));

  const questionCountOptions = [
    { count: 5, label: '5問', desc: '1分超爆速' },
    { count: 10, label: '10問', desc: '標準' },
    { count: 20, label: '20問', desc: 'おすすめ' },
    { count: 30, label: '30問', desc: '集中特訓' },
    { count: 50, label: '50問', desc: 'ガチ暗記' },
  ];

  const handleEnableNotification = async () => {
    const granted = await notificationService.requestPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
  };

  const handleSendTestNotification = () => {
    if (notifPermission !== 'granted') {
      handleEnableNotification();
      return;
    }
    notificationService.sendTestReminder();
    setTestNotifSent(true);
    setTimeout(() => setTestNotifSent(false), 3000);
  };

  return (
    <div className="mode-select-container">
      {/* ヒーローバナー */}
      <section className="hero-banner">
        <div className="hero-content">
          <div className="hero-tag">
            <Sparkles size={14} />
            <span>高校生・大学受験特化 8,114語完全収録</span>
          </div>
          <h1 className="hero-title">
            苦しんで覚える英単語<br />
            <span className="text-gradient">爆速 4択テスト</span>
          </h1>
          <p className="hero-desc">
            3回連続正解するまで終わらない！高校基礎から共通テスト・難関私大・東大京大まで全8,114語を徹底的に頭に叩き込む。
          </p>

          <div className="hero-actions">
            <button className="primary-cta-btn large" onClick={() => onStartQuiz('all', questionCount)}>
              <Play size={22} fill="currentColor" />
              <span>全範囲から {questionCount}問 テスト開始</span>
            </button>
          </div>
        </div>

        {/* リアルタイム学習進捗ステータスカード */}
        <div className="progress-overview-card">
          <div className="overview-header">
            <span className="overview-title">現在の暗記達成度</span>
            <span className="overview-percent">{progressPercent}%</span>
          </div>

          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>

          <div className="overview-stats-grid">
            <div className="mini-stat-item">
              <div className="mini-stat-label">
                <CheckCircle2 size={16} className="text-success" />
                <span>マスター</span>
              </div>
              <div className="mini-stat-value">{masteredCount} <span className="stat-max">/ {totalWordsCount}</span></div>
            </div>

            <div className="mini-stat-item">
              <div className="mini-stat-label">
                <RotateCcw size={16} className="text-warning" />
                <span>要復習</span>
              </div>
              <div className="mini-stat-value">{reviewCount} <span className="stat-max">単語</span></div>
            </div>

            <div className="mini-stat-item">
              <div className="mini-stat-label">
                <Trophy size={16} className="text-primary" />
                <span>獲得EXP</span>
              </div>
              <div className="mini-stat-value">{progress.totalExp || 0}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 🎯 出題問題数カスタム設定バー */}
      <section className="question-count-section">
        <div className="question-count-card">
          <div className="q-count-header">
            <div className="q-count-title-group">
              <Sliders size={18} className="text-primary" />
              <span className="q-count-title">出題問題数のカスタム設定</span>
            </div>
            <span className="q-count-current">現在: <strong>{questionCount}問</strong> ずつ出題</span>
          </div>

          <div className="q-count-options-grid">
            {questionCountOptions.map((opt) => (
              <button
                key={opt.count}
                className={`q-count-btn ${questionCount === opt.count ? 'active' : ''}`}
                onClick={() => setQuestionCount(opt.count)}
              >
                <span className="q-count-num">{opt.label}</span>
                <span className="q-count-desc">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 🔔 さぼり防止 Webプッシュ通知（ブラウザ通知）設定カード */}
      <section className="notification-control-section">
        <div className="notif-control-card">
          <div className="notif-card-left">
            <div className="notif-icon-wrap">
              <BellRing size={24} className="bell-glow" />
            </div>
            <div className="notif-text-wrap">
              <h3 className="notif-title">🔥 スマホ/PC さぼり防止通知（ブラウザ通知）</h3>
              <p className="notif-desc">
                LINEを使わずに、ブラウザから直接スマホの画面やデスクトップへ「さぼり警告リマインダー」をお届けします。
              </p>
            </div>
          </div>

          <div className="notif-card-actions">
            {notifPermission === 'granted' ? (
              <div className="notif-status-badge">
                <Check size={16} className="text-success" />
                <span>通知許可済み</span>
              </div>
            ) : (
              <button className="enable-notif-btn" onClick={handleEnableNotification}>
                <Bell size={16} />
                <span>通知を有効にする</span>
              </button>
            )}

            <button
              className="test-notif-btn"
              onClick={handleSendTestNotification}
              title="実際にさぼり通知が届くかテストします"
            >
              <span>{testNotifSent ? '通知を送信しました！' : '🧪 テスト通知を送る'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* レベル・カテゴリー選択 */}
      <section className="category-section">
        <div className="section-title-group">
          <h2 className="section-title">レベルを選んで4択テスト（{questionCount}問）</h2>
          <p className="section-subtitle">各レベル約1,200語。間違えた問題はラストにまとめて再出題されます！</p>
        </div>

        <div className="categories-grid">
          {WORD_CATEGORIES.map((cat) => {
            const count = cat.id === 'all'
              ? WORDS_DATABASE.length
              : WORDS_DATABASE.filter(w => w.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <div
                key={cat.id}
                className={`category-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onStartQuiz(cat.id, questionCount)}
              >
                <div className="cat-card-top">
                  <span className="cat-level-pill" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                    {cat.level}
                  </span>
                  <span className="cat-badge">{count} 単語</span>
                </div>
                <h3 className="cat-name">{cat.name}</h3>
                {cat.desc && <p className="cat-desc-text">{cat.desc}</p>}

                <button
                  className="cat-action-btn-single"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartQuiz(cat.id, questionCount);
                  }}
                >
                  <Play size={15} fill="currentColor" />
                  <span>このレベルで {questionCount}問テスト</span>
                  <ArrowRight size={14} className="cat-btn-arrow" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* アカウント登録促進バナー（未ログイン時） */}
      {!user?.isLoggedIn && (
        <section className="app-survey-banner" onClick={onOpenAuth}>
          <div className="survey-banner-glow"></div>
          <div className="survey-banner-content">
            <div className="survey-banner-left">
              <span className="survey-badge">☁️ 学習データをクラウド保存</span>
              <h3 className="survey-banner-title">
                無料アカウントを作成して、暗記データ ＆ ランキングを同期しよう
              </h3>
              <p className="survey-banner-desc">
                メールアドレスと普段お使いのスマホ（iOS / Android）を登録すると、アプリ版リリース時にそのままデータを引き継げます。
              </p>
            </div>
            <button className="survey-cta-btn">
              無料登録する
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
