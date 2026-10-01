import React from 'react';
import { Trophy, Flame, Zap, ArrowLeft, Medal, Crown } from 'lucide-react';
import { storage } from '../services/storage';

export default function RankingView({ onBack }) {
  const rankings = storage.getRankings();
  const myRank = rankings.find(r => r.isCurrentUser);

  return (
    <div className="ranking-view-container">
      {/* ヘッダー */}
      <div className="ranking-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>ホームへ戻る</span>
        </button>

        <div className="ranking-title-group">
          <div className="ranking-trophy-badge">
            <Trophy size={22} />
          </div>
          <div>
            <h2 className="ranking-main-title">週間 EXP ランキング</h2>
            <p className="ranking-subtitle">毎週日曜日に集計・リセットされます（上位入賞者に称号付与）</p>
          </div>
        </div>
      </div>

      {/* 自分の現在順位ハイライトバナー */}
      {myRank && (
        <div className="my-rank-banner">
          <div className="my-rank-left">
            <div className="my-rank-number">#{myRank.rank}</div>
            <div className="my-rank-avatar">{myRank.avatar}</div>
            <div className="my-rank-info">
              <span className="my-rank-name">{myRank.name}</span>
              <span className="my-rank-streak">
                <Flame size={14} className="text-warning" /> {myRank.streak}日連続
              </span>
            </div>
          </div>
          <div className="my-rank-exp">
            <Zap size={18} className="text-primary" />
            <span>{myRank.exp} EXP</span>
          </div>
        </div>
      )}

      {/* ランキングリスト */}
      <div className="ranking-list-card">
        <div className="ranking-list-header">
          <span className="col-rank">順位</span>
          <span className="col-user">学習者</span>
          <span className="col-streak">連続記録</span>
          <span className="col-exp">獲得 EXP</span>
        </div>

        <div className="ranking-items">
          {rankings.map((user) => {
            let rankIcon = null;
            let rankClass = `rank-badge rank-${user.rank}`;
            if (user.rank === 1) rankIcon = <Crown size={18} className="crown-gold" />;
            else if (user.rank === 2) rankIcon = <Medal size={18} className="crown-silver" />;
            else if (user.rank === 3) rankIcon = <Medal size={18} className="crown-bronze" />;

            return (
              <div
                key={user.id}
                className={`ranking-item-row ${user.isCurrentUser ? 'current-user-row' : ''}`}
              >
                <div className="col-rank">
                  <div className={rankClass}>
                    {rankIcon || user.rank}
                  </div>
                </div>

                <div className="col-user">
                  <span className="user-avatar-small">{user.avatar}</span>
                  <span className="user-name-text">{user.name}</span>
                </div>

                <div className="col-streak">
                  <span className="streak-pill">
                    <Flame size={13} /> {user.streak}日
                  </span>
                </div>

                <div className="col-exp">
                  <span className="exp-highlight">{user.exp}</span>
                  <span className="exp-label">EXP</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
