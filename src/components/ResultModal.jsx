import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Zap, Flame, CheckCircle2, RotateCcw, ArrowRight, Volume2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { sound } from '../services/sound';
import AdBanner from './AdBanner';

export default function ResultModal({
  resultData,
  onRetry,
  onGoHome,
  onOpenRanking,
  onReportWord,
}) {
  const { total, correctCount, earnedExp, words } = resultData;
  const accuracy = Math.round((correctCount / total) * 100);

  useEffect(() => {
    sound.playLevelUp();

    // 紙吹雪アニメーション
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {}
  }, []);

  return (
    <div className="result-container">
      <div className="result-card">
        {/* 上部ヘッダーバッジ */}
        <div className="result-trophy-glow">
          <Trophy size={48} className="trophy-icon-glow" />
        </div>

        <h2 className="result-title">セッション完了！お疲れ様でした</h2>
        <p className="result-subtitle">今日の学習が確実に記憶に定着しています</p>

        {/* スコア・EXPサマリー */}
        <div className="result-stats-row">
          <div className="result-stat-box exp-box">
            <Zap size={24} className="stat-icon-exp" />
            <div className="stat-num">+{earnedExp}</div>
            <div className="stat-name">獲得 EXP</div>
          </div>

          <div className="result-stat-box accuracy-box">
            <CheckCircle2 size={24} className="stat-icon-accuracy" />
            <div className="stat-num">{accuracy}%</div>
            <div className="stat-name">正答率 ({correctCount}/{total})</div>
          </div>

          <div className="result-stat-box streak-box">
            <Flame size={24} className="stat-icon-streak" />
            <div className="stat-num">継続中!</div>
            <div className="stat-name">連続日数</div>
          </div>
        </div>

        {/* 間違えた単語まとめ & 今回の単語一覧 */}
        {words && words.length > 0 && (
          <div className="result-words-summary">
            {resultData.mistakes && resultData.mistakes.length > 0 ? (
              <div className="mistake-summary-banner">
                <h4 className="summary-list-title mistake-title">
                  <RotateCcw size={16} className="text-warning" />
                  <span>今回間違えた単語（{resultData.mistakes.length}語・ラストで復習済み）</span>
                </h4>
                <div className="result-words-list">
                  {resultData.mistakes.map((w) => (
                    <div key={w.id} className="result-word-item review">
                      <div className="item-left">
                        <button
                          className="mini-speak-btn"
                          onClick={() => sound.speak(w.word)}
                          title="発音"
                        >
                          <Volume2 size={14} />
                        </button>
                        <strong className="item-word">{w.word}</strong>
                        <span className="item-meaning">{w.meaning}</span>
                      </div>
                      <div className="item-right-actions">
                        <span className="item-badge review-badge">要復習</span>
                        <button
                          className="item-report-btn"
                          onClick={() => onReportWord && onReportWord(w)}
                          title="この単語の誤字・訳ミスを報告"
                        >
                          <AlertTriangle size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="perfect-badge-banner">
                <CheckCircle2 size={20} className="text-success" />
                <span>全問一発正解！素晴らしい集中力です！</span>
              </div>
            )}

            <h4 className="summary-list-title" style={{ marginTop: '1.25rem' }}>出題単語一覧 ({words.length}語)</h4>
            <div className="result-words-list">
              {words.map((w) => {
                const wasWrong = (resultData.mistakes || []).some(m => m.id === w.id);
                return (
                  <div key={w.id} className={`result-word-item ${!wasWrong ? 'mastered' : 'review'}`}>
                    <div className="item-left">
                      <button
                        className="mini-speak-btn"
                        onClick={() => sound.speak(w.word)}
                        title="発音"
                      >
                        <Volume2 size={14} />
                      </button>
                      <strong className="item-word">{w.word}</strong>
                      <span className="item-meaning">{w.meaning}</span>
                    </div>
                    <div className="item-right-actions">
                      <span className="item-badge">{!wasWrong ? '正解' : '要復習'}</span>
                      <button
                        className="item-report-btn"
                        onClick={() => onReportWord && onReportWord(w)}
                        title="単語ミス報告"
                      >
                        <AlertTriangle size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* スポンサー広告枠 */}
        <div className="result-ad-slot">
          <AdBanner slot="result" />
        </div>

        {/* アクションボタン */}
        <div className="result-actions">
          <button className="primary-action-btn" onClick={onGoHome}>
            <span>ホームへ戻る</span>
            <ArrowRight size={18} />
          </button>
          
          <button className="secondary-action-btn" onClick={onRetry}>
            <RotateCcw size={18} />
            <span>もう一度テスト</span>
          </button>

          <button className="ranking-action-btn" onClick={onOpenRanking}>
            <Trophy size={18} />
            <span>週間ランキング</span>
          </button>
        </div>
      </div>
    </div>
  );
}
