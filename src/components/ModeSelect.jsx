import React from 'react';
import { Play, CheckCircle2, RotateCcw, Trophy, ArrowRight, Sparkles, UserPlus, ShieldCheck } from 'lucide-react';
import { WORD_CATEGORIES, WORDS_DATABASE } from '../data/words';

export default function ModeSelect({
  user,
  progress,
  selectedCategory,
  setSelectedCategory,
  onStartQuiz,
  onOpenWordList,
  onOpenRanking,
  onOpenAuth,
}) {
  const totalWordsCount = WORDS_DATABASE.length;
  const masteredCount = (progress.masteredWordIds || []).length;
  const reviewCount = (progress.reviewWordIds || []).length;
  const progressPercent = Math.min(100, Math.round((masteredCount / totalWordsCount) * 100));

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
            <button className="primary-cta-btn large" onClick={() => onStartQuiz('all')}>
              <Play size={22} fill="currentColor" />
              <span>全範囲からテスト開始（4択）</span>
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

      {/* レベル・カテゴリー選択 */}
      <section className="category-section">
        <div className="section-title-group">
          <h2 className="section-title">レベルを選んで4択テスト</h2>
          <p className="section-subtitle">各レベル約1,200語。自分の志望校や目標に合わせてステップアップ！</p>
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
                onClick={() => onStartQuiz(cat.id)}
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
                    onStartQuiz(cat.id);
                  }}
                >
                  <Play size={15} fill="currentColor" />
                  <span>このレベルでテスト</span>
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
