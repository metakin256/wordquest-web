import React, { useState } from 'react';
import { X, Send, MessageSquare, Check, HelpCircle, AlertTriangle, Lightbulb, MessageCircle } from 'lucide-react';
import { sound } from '../services/sound';

export default function ContactModal({ isOpen, onClose, user }) {
  const [category, setCategory] = useState('word_typo'); // 'word_typo' | 'feature_request' | 'question' | 'other'
  const [targetWord, setTargetWord] = useState('');
  const [message, setMessage] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const categories = [
    { id: 'word_typo', label: '単語・訳ミスの報告', icon: AlertTriangle, color: '#ef4444' },
    { id: 'feature_request', label: '新機能・改善の要望', icon: Lightbulb, color: '#f59e0b' },
    { id: 'question', label: '疑問・質問', icon: HelpCircle, color: '#3b82f6' },
    { id: 'other', label: 'その他のご意見', icon: MessageCircle, color: '#10b981' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);

    setTimeout(() => {
      // ローカルストレージにお問い合わせログを保存（サーバー連携可能）
      const inquiries = JSON.parse(localStorage.getItem('wordquest_inquiries') || '[]');
      const newInquiry = {
        id: 'inq_' + Date.now(),
        category,
        targetWord: targetWord.trim(),
        message: message.trim(),
        email: contactEmail.trim(),
        user: user?.name || 'ゲスト',
        createdAt: new Date().toISOString(),
      };
      inquiries.push(newInquiry);
      localStorage.setItem('wordquest_inquiries', JSON.stringify(inquiries));

      setLoading(false);
      setIsSuccess(true);
      sound.playCorrect();

      setTimeout(() => {
        setIsSuccess(false);
        setMessage('');
        setTargetWord('');
        onClose();
      }, 2000);
    }, 500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card contact-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} title="閉じる">
          <X size={20} />
        </button>

        {isSuccess ? (
          <div className="contact-success-box">
            <div className="thankyou-badge">
              <Check size={32} />
            </div>
            <h3 className="modal-title" style={{ textAlign: 'center' }}>ご意見ありがとうございます！</h3>
            <p className="modal-desc" style={{ textAlign: 'center', marginBottom: 0 }}>
              送信された内容は開発者がすべて確認し、単語データの修正や機能改善に役立てさせていただきます。
            </p>
          </div>
        ) : (
          <div>
            <div className="contact-modal-header">
              <div className="contact-icon-badge">
                <MessageSquare size={22} />
              </div>
              <div>
                <h3 className="modal-title">お問い合わせ・ご意見箱</h3>
                <p className="modal-desc">
                  単語の誤字・訳ミス報告、機能のご要望、疑問などをお気軽にお寄せください。
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="contact-form">
              {/* カテゴリ選択 */}
              <div className="form-group">
                <label className="form-label">お問い合わせの種類</label>
                <div className="contact-cat-grid">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`contact-cat-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => setCategory(cat.id)}
                      >
                        <Icon size={16} style={{ color: cat.color }} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 対象単語（単語ミスの報告時のみ表示） */}
              {category === 'word_typo' && (
                <div className="form-group">
                  <label className="form-label">対象の英単語（任意）</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="例: abandon"
                    value={targetWord}
                    onChange={(e) => setTargetWord(e.target.value)}
                    style={{ paddingLeft: '1rem' }}
                  />
                </div>
              )}

              {/* メッセージ本文 */}
              <div className="form-group">
                <label className="form-label">詳細・内容 <span className="required-badge">*必須</span></label>
                <textarea
                  className="form-textarea"
                  placeholder={
                    category === 'word_typo'
                      ? '例: 単語「xxx」の日本語訳が間違っているようです。正しくは〇〇ではないでしょうか？'
                      : category === 'feature_request'
                      ? '例: こういう機能が欲しい、デザインをこうしてほしいなど'
                      : 'ご自由にご記入ください。'
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  required
                ></textarea>
              </div>

              {/* 返信用メールアドレス（任意） */}
              <div className="form-group">
                <label className="form-label">返信先メールアドレス（任意）</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="返信をご希望の場合は入力してください"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  style={{ paddingLeft: '1rem' }}
                />
              </div>

              <button type="submit" className="contact-submit-btn" disabled={loading || !message.trim()}>
                <Send size={16} />
                <span>{loading ? '送信中...' : 'ご意見を送信する'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
