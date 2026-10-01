import React, { useState } from 'react';
import { X, Mail, Lock, User, Check, ArrowRight, ShieldCheck, Smartphone, Apple, PlayCircle, HelpCircle, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { storage } from '../services/storage';
import { sound } from '../services/sound';
import { securityService } from '../services/security';

export default function AuthModal({ isOpen, onClose, onUserUpdated }) {
  // デフォルトは「ログイン」タブ（登録済みユーザーがすぐログインできるように）
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('🎓');
  
  // スマホOSの質問ステート
  const [selectedOs, setSelectedOs] = useState('ios'); // 'ios' | 'android' | 'other'
  const [otherOsText, setOtherOsText] = useState('');
  
  // さぼり防止通知・メルマガ設定
  const [enableReminderEmail, setEnableReminderEmail] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const currentUser = storage.getUser();
  const avatarOptions = ['🎓', '🦁', '🚀', '🌸', '⚡', '🎯', '📚', '✨', '🦊', '🐱'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg('メールアドレスとパスワードを入力してください。');
      return;
    }

    if (!securityService.isValidEmail(trimmedEmail)) {
      setErrorMsg('有効なメールアドレス形式を入力してください。');
      return;
    }

    if (isSignUp && !securityService.isValidPassword(password)) {
      setErrorMsg('パスワードは安全のため6文字以上で入力してください。');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // 新規アカウント作成
        const finalOs = selectedOs === 'other' ? (securityService.sanitizeText(otherOsText.trim(), 20) || 'その他') : selectedOs;
        const sanitizedName = securityService.sanitizeText(name.trim(), 30) || trimmedEmail.split('@')[0];

        const userData = {
          name: sanitizedName,
          email: trimmedEmail,
          avatar: avatar,
          smartphoneOs: finalOs,
          enableReminderEmail: enableReminderEmail,
        };

        const result = await storage.registerAccount(userData, password);
        if (result.success) {
          onUserUpdated(result.user);
          setSuccessMsg('アカウントを作成しました！');
          sound.playCorrect();
          setTimeout(() => {
            setSuccessMsg('');
            onClose();
          }, 800);
        } else {
          setErrorMsg(result.error || '登録に失敗しました。');
        }
      } else {
        // ログイン処理
        const result = await storage.loginAccount(email, password);
        if (result.success) {
          onUserUpdated(result.user);
          setSuccessMsg('ログインしました！学習データを復元しました。');
          sound.playCorrect();
          setTimeout(() => {
            setSuccessMsg('');
            onClose();
          }, 800);
        } else {
          setErrorMsg(result.error || 'ログインに失敗しました。');
        }
      }
    } catch (e) {
      setErrorMsg('エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const guestUser = {
      id: 'guest_' + Math.random().toString(36).substring(2, 9),
      name: 'ゲスト学習者',
      email: '',
      isLoggedIn: false,
      avatar: '🎓',
      smartphoneOs: null,
    };
    storage.saveUser(guestUser);
    onUserUpdated(guestUser);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} title="閉じる">
          <X size={20} />
        </button>

        {currentUser.isLoggedIn ? (
          <div className="auth-profile-box">
            <div className="profile-avatar-large">{currentUser.avatar}</div>
            <h3 className="modal-title">{currentUser.name}</h3>
            <p className="modal-desc">{currentUser.email}</p>

            {currentUser.smartphoneOs && (
              <div className="profile-os-badge">
                <Smartphone size={15} />
                <span>ご利用端末: <strong>{currentUser.smartphoneOs.toUpperCase()}</strong></span>
              </div>
            )}

            <div className="profile-sync-badge">
              <ShieldCheck size={16} className="text-success" />
              <span>学習進捗・連続記録・さぼり通知はクラウド連携中</span>
            </div>

            <button className="logout-btn" onClick={handleLogout}>
              ログアウト
            </button>
          </div>
        ) : (
          <div>
            {/* 🔑 ログイン / 🎓 新規登録 切り替えタブ */}
            <div className="auth-tabs-header">
              <button
                type="button"
                className={`auth-tab-btn ${!isSignUp ? 'active' : ''}`}
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg('');
                }}
              >
                <LogIn size={16} />
                <span>ログイン</span>
              </button>

              <button
                type="button"
                className={`auth-tab-btn ${isSignUp ? 'active' : ''}`}
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMsg('');
                }}
              >
                <UserPlus size={16} />
                <span>新規登録 (無料)</span>
              </button>
            </div>

            <div className="auth-modal-header">
              <h3 className="modal-title">
                {isSignUp ? '無料アカウント作成' : 'メールアドレスでログイン'}
              </h3>
              <p className="modal-desc">
                {isSignUp
                  ? '登録すると暗記進捗が保存され、さぼり防止リマインダーやアプリ版へのデータ引き継ぎが利用できます。'
                  : '登録済みのメールアドレスとパスワードで学習データを復元します。'}
              </p>
            </div>

            {/* エラーメッセージ */}
            {errorMsg && (
              <div className="auth-error-banner">
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 成功メッセージ */}
            {successMsg && (
              <div className="success-banner">
                <Check size={18} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              {isSignUp && (
                <>
                  <div className="form-group">
                    <label className="form-label">ニックネーム（ランキング表示用）</label>
                    <div className="input-with-icon">
                      <User size={18} className="input-icon" />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="例: 高3_英語マスター"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={isSignUp}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">アイコン選択</label>
                    <div className="avatar-picker">
                      {avatarOptions.map((av) => (
                        <button
                          key={av}
                          type="button"
                          className={`avatar-option ${avatar === av ? 'selected' : ''}`}
                          onClick={() => setAvatar(av)}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* スマホOSの質問 */}
                  <div className="form-group os-question-group">
                    <label className="form-label">
                      <Smartphone size={16} className="text-primary" />
                      <span>普段使っているスマホのOSは何ですか？</span>
                    </label>
                    
                    <div className="os-choice-buttons">
                      <button
                        type="button"
                        className={`os-btn ${selectedOs === 'ios' ? 'active ios' : ''}`}
                        onClick={() => setSelectedOs('ios')}
                      >
                        <Apple size={18} />
                        <span>iOS (iPhone)</span>
                      </button>

                      <button
                        type="button"
                        className={`os-btn ${selectedOs === 'android' ? 'active android' : ''}`}
                        onClick={() => setSelectedOs('android')}
                      >
                        <PlayCircle size={18} />
                        <span>Android</span>
                      </button>

                      <button
                        type="button"
                        className={`os-btn ${selectedOs === 'other' ? 'active other' : ''}`}
                        onClick={() => setSelectedOs('other')}
                      >
                        <HelpCircle size={18} />
                        <span>その他</span>
                      </button>
                    </div>

                    {/* その他の場合の自由記述欄 */}
                    {selectedOs === 'other' && (
                      <div className="other-os-input-wrap">
                        <input
                          type="text"
                          className="form-input"
                          placeholder="お使いの端末・OS名を入力（例: iPadOS, ガラケー等）"
                          value={otherOsText}
                          onChange={(e) => setOtherOsText(e.target.value)}
                          required={selectedOs === 'other'}
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">メールアドレス</label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="example@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">パスワード</label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {isSignUp && (
                <div className="form-group reminder-opt-in-box">
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={enableReminderEmail}
                      onChange={(e) => setEnableReminderEmail(e.target.checked)}
                      style={{ marginTop: '0.15rem', accentColor: 'var(--primary)' }}
                    />
                    <span>
                      🔥 <strong>さぼり防止通知を受け取る</strong>（1日学習がない時にリマインドメールを受信して継続をサポート）
                    </span>
                  </label>
                </div>
              )}

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? '処理中...' : isSignUp ? '登録して暗記をスタート' : 'ログインしてデータを復元'}
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="auth-switch-row">
              {isSignUp ? (
                <p>
                  既にアカウントをお持ちですか？{' '}
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => {
                      setIsSignUp(false);
                      setErrorMsg('');
                    }}
                  >
                    ログインへ切り替え
                  </button>
                </p>
              ) : (
                <p>
                  アカウントをお持ちでないですか？{' '}
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => {
                      setIsSignUp(true);
                      setErrorMsg('');
                    }}
                  >
                    新規登録（無料）へ切り替え
                  </button>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
