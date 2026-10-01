import React, { useState, useMemo, useEffect } from 'react';
import { Search, Volume2, CheckCircle2, RotateCcw, ArrowLeft, BookOpen, ChevronDown, Sparkles, Flame, AlertTriangle } from 'lucide-react';
import { WORDS_DATABASE, WORD_CATEGORIES } from '../data/words';
import { storage } from '../services/storage';
import { sound } from '../services/sound';

const PAGE_SIZE = 40; // 1回あたりの表示件数（超高速レンダリング）

export default function WordListView({ progress, onBack, onReportWord }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  const statsMap = storage.getWordStatsMap();

  // 検索・フィルターの高速メモ化
  const filteredWords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return WORDS_DATABASE.filter((w) => {
      // 検索語
      if (term) {
        const matchesWord = w.word.toLowerCase().includes(term);
        const matchesMeaning = w.meaning.includes(term);
        const matchesExample = w.exampleJa.includes(term) || w.exampleEn.toLowerCase().includes(term);
        if (!matchesWord && !matchesMeaning && !matchesExample) return false;
      }

      // カテゴリ
      if (categoryFilter !== 'all' && w.category !== categoryFilter) {
        return false;
      }

      // ステータス判定（オリジナルアプリと完全同一）
      const stat = statsMap[w.id];
      const asked = stat?.asked || 0;
      const streak = stat?.streak || 0;
      const isMastered = streak >= 3;
      const isWeak = asked > 0 && (streak === 0 || (stat.correct / asked < 0.5));
      const isLearning = asked > 0 && !isMastered && !isWeak;
      const isUnlearned = asked === 0;

      if (statusFilter === 'mastered') return isMastered;
      if (statusFilter === 'review') return isWeak;
      if (statusFilter === 'learning') return isLearning;
      if (statusFilter === 'unlearned') return isUnlearned;

      return true;
    });
  }, [searchTerm, categoryFilter, statusFilter, statsMap]);

  // 検索条件が変わったら表示件数を先頭にリセット
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [searchTerm, categoryFilter, statusFilter]);

  // 表示対象の単語（先頭からdisplayCount件のみ）
  const visibleWords = useMemo(() => {
    return filteredWords.slice(0, displayCount);
  }, [filteredWords, displayCount]);

  const handleLoadMore = () => {
    setDisplayCount(prev => Math.min(prev + PAGE_SIZE, filteredWords.length));
  };

  return (
    <div className="wordlist-view-container">
      <div className="wordlist-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>ホームへ戻る</span>
        </button>

        <div className="wordlist-title-group">
          <h2 className="wordlist-main-title">収録英単語一覧帳</h2>
          <p className="wordlist-subtitle">全 {WORDS_DATABASE.length} 単語の暗記状況を確認・発音練習</p>
        </div>
      </div>

      {/* 検索・フィルターバー */}
      <div className="wordlist-controls">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="英単語・日本語訳・例文で瞬時に検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-select-group">
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">すべてのレベル</option>
            {WORD_CATEGORIES.filter(c => c.id !== 'all').map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">すべてのステータス</option>
            <option value="mastered">習得済 (3回連続正解)</option>
            <option value="review">苦手・要復習 (直近ミス)</option>
            <option value="learning">学習中 (1-2回正解)</option>
            <option value="unlearned">未出題</option>
          </select>
        </div>
      </div>

      {/* 検索結果件数表示 */}
      <div className="wordlist-meta-bar">
        <span>該当: <strong>{filteredWords.length}</strong> 件中 <strong>{visibleWords.length}</strong> 件表示中</span>
      </div>

      {/* 単語グリッド（高速描画） */}
      <div className="words-cards-grid">
        {visibleWords.map((word) => {
          const stat = statsMap[word.id];
          const asked = stat?.asked || 0;
          const streak = stat?.streak || 0;
          const isMastered = streak >= 3;
          const isWeak = asked > 0 && (streak === 0 || (stat.correct / asked < 0.5));
          const isLearning = asked > 0 && !isMastered && !isWeak;

          return (
            <div key={word.id} className="word-card-item">
              <div className="word-card-header">
                <div className="card-header-left">
                  <span className="quiz-level-badge">{word.level}</span>
                  <span className="quiz-pos-badge">{word.partOfSpeech}</span>
                </div>

                <div className="card-header-right">
                  {isMastered && (
                    <span className="status-pill mastered" title="3回以上連続正解">
                      <CheckCircle2 size={13} /> 習得済 (🔥{streak})
                    </span>
                  )}
                  {isWeak && (
                    <span className="status-pill review" title="直近で不正解">
                      <RotateCcw size={13} /> 要復習
                    </span>
                  )}
                  {isLearning && (
                    <span className="status-pill learning" title="定着中">
                      <Flame size={13} /> 習得中 ({streak}/3)
                    </span>
                  )}
                  <button
                    className="report-typo-btn-icon"
                    onClick={() => onReportWord && onReportWord(word)}
                    title="この単語の誤字・訳ミスを報告"
                  >
                    <AlertTriangle size={13} />
                  </button>
                </div>
              </div>

              <div className="word-card-body">
                <div className="word-title-row">
                  <h3 className="word-title-text">{word.word}</h3>
                  <button
                    className="speak-btn-card"
                    onClick={() => sound.speak(word.word)}
                    title="発音を聞く"
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
                <div className="word-phonetic-text">{word.phonetic}</div>
                <div className="word-meaning-text">{word.meaning}</div>
              </div>

              <div className="word-card-example">
                <p className="example-en-text">"{word.exampleEn}"</p>
                <p className="example-ja-text">{word.exampleJa}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* もっと見るボタン（件数が残っている場合） */}
      {visibleWords.length < filteredWords.length && (
        <div className="load-more-box">
          <button className="load-more-btn" onClick={handleLoadMore}>
            <span>さらに単語を表示（残り {filteredWords.length - visibleWords.length} 語）</span>
            <ChevronDown size={18} />
          </button>
        </div>
      )}

      {filteredWords.length === 0 && (
        <div className="empty-search-box">
          <BookOpen size={36} className="text-muted" />
          <p>該当する英単語が見つかりませんでした。</p>
        </div>
      )}
    </div>
  );
}
