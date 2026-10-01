import React, { useState } from 'react';
import { X, Smartphone, Apple, PlayCircle, Check, Send, Sparkles, TrendingUp, Mail } from 'lucide-react';
import { storage } from '../services/storage';
import { sound } from '../services/sound';

export default function SurveyModal({ isOpen, onClose }) {
  const [stats, setStats] = useState(() => storage.getSurveyStats());
  const [selectedChoice, setSelectedChoice] = useState(stats.userChoice || null);
  const [emailInput, setEmailInput] = useState(stats.userEmail || '');
  const [submitted, setSubmitted] = useState(stats.hasVoted || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const totalVotes = stats.iosVotes + stats.androidVotes + stats.bothVotes;
  const iosPercent = totalVotes > 0 ? Math.round((stats.iosVotes / totalVotes) * 100) : 50;
  const androidPercent = totalVotes > 0 ? Math.round((stats.androidVotes / totalVotes) * 100) : 50;

  const handleVote = (e) => {
    e.preventDefault();
    if (!selectedChoice) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const updated = storage.voteSurvey(selectedChoice, emailInput);
      setStats(updated);
      setSubmitted(true);
      setIsSubmitting(false);
      sound.playLevelUp();
    }, 400);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card survey-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="survey-modal-header">
          <div className="survey-icon-circle">
            <Smartphone size={28} />
          </div>
          <h3 className="modal-title">スマホアプリ版 開発事前アンケート</h3>
          <p className="modal-desc">
            いつもWordQuestをご利用いただきありがとうございます！<br />
            アプリ版の先行リリース優先度を決定するため、あなたが普段お使いのスマートフォンを教えてください。
          </p>
        </div>

        {/* リアルタイム集計結果バー */}
        <div className="survey-live-result-box">
          <div className="live-result-header">
            <div className="live-tag">
              <TrendingUp size={14} />
              <span>現在の投票状況 ({totalVotes}名 回答)</span>
            </div>
          </div>

          <div className="survey-ratio-bar">
            <div className="ratio-segment ios" style={{ width: `${iosPercent}%` }}>
              <span>iOS {iosPercent}%</span>
            </div>
            <div className="ratio-segment android" style={{ width: `${androidPercent}%` }}>
              <span>Android {androidPercent}%</span>
            </div>
          </div>

          <div className="ratio-legend">
            <div className="legend-item ios">
              <span className="dot"></span>
              <span>iOS (iPhone): {stats.iosVotes}票</span>
            </div>
            <div className="legend-item android">
              <span className="dot"></span>
              <span>Android: {stats.androidVotes}票</span>
            </div>
          </div>
        </div>

        {!submitted ? (
          <form onSubmit={handleVote} className="survey-form">
            <label className="form-label">あなたが使っているスマホは？</label>
            
            <div className="survey-choices-grid">
              {/* iPhone / iOS */}
              <div
                className={`choice-card ${selectedChoice === 'ios' ? 'selected' : ''}`}
                onClick={() => setSelectedChoice('ios')}
              >
                <div className="choice-icon ios">
                  <Apple size={28} />
                </div>
                <div className="choice-name">iPhone (iOS)</div>
                <div className="choice-sub">App Store</div>
                {selectedChoice === 'ios' && <Check size={18} className="choice-check" />}
              </div>

              {/* Android */}
              <div
                className={`choice-card ${selectedChoice === 'android' ? 'selected' : ''}`}
                onClick={() => setSelectedChoice('android')}
              >
                <div className="choice-icon android">
                  <PlayCircle size={28} />
                </div>
                <div className="choice-name">Android</div>
                <div className="choice-sub">Google Play</div>
                {selectedChoice === 'android' && <Check size={18} className="choice-check" />}
              </div>
            </div>

            {/* メールアドレス入力（任意） */}
            <div className="survey-email-group">
              <label className="form-label">
                <Mail size={15} />
                <span>アプリ版リリース通知を受け取る（任意）</span>
              </label>
              <input
                type="email"
                className="survey-email-input"
                placeholder="example@gmail.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
              <span className="form-hint">※公開時に優先案内と特典コードをお届けします</span>
            </div>

            <button
              type="submit"
              className="survey-submit-btn"
              disabled={!selectedChoice || isSubmitting}
            >
              {isSubmitting ? '送信中...' : '投票して完了する'}
              <Send size={16} />
            </button>
          </form>
        ) : (
          <div className="survey-thankyou-box">
            <div className="thankyou-badge">
              <Check size={32} />
            </div>
            <h4>ご回答ありがとうございました！</h4>
            <p>
              いただいたご意見を元に、先行開発プラットフォームを決定いたします。<br />
              {emailInput && `「${emailInput}」宛にリリース案内をお届けします。`}
            </p>
            <button className="primary-cta-btn" onClick={onClose}>
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
