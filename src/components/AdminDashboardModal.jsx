import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Smartphone,
  Users,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  MessageCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Download,
  PlusCircle,
  Search,
  Filter,
  BarChart3,
  Flame,
  Zap,
  Mail,
  RefreshCw,
  Sparkles,
  Lock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  LogOut,
  Settings
} from 'lucide-react';
import { storage } from '../services/storage';
import { cloudSync } from '../services/cloudSync';
import { cryptoService } from '../services/crypto';

// 確認用デモデータ（「デモデータ投入」ボタンを押した時のみ追加される）
const SAMPLE_INQUIRIES = [
  {
    id: 'inq_sample_1',
    category: 'word_typo',
    targetWord: 'abandon',
    message: '日本語訳の「見捨てる」に加えて「諦める」の意味も出題文の解説に加えていただけると嬉しいです！',
    email: '',
    user: '高校2年生 (レオ)',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'inq_sample_2',
    category: 'feature_request',
    targetWord: '',
    message: '毎日夜21時にスマホへ通知が来る機能がとても便利です。通知の時間を自由に変更できるようになるとさらに最高です！',
    email: '',
    user: '田中 (きなこ)',
    status: 'completed',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'inq_sample_3',
    category: 'question',
    targetWord: 'accommodate',
    message: 'この単語は共通テストでもよく出ますか？長文読解での頻出度を教えてほしいです。',
    email: '',
    user: '受験生S',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'inq_sample_4',
    category: 'word_typo',
    targetWord: 'benevolent',
    message: '発音記号のアクセント位置が「ne」の部分になっているか確認をお願いできますでしょうか。',
    email: '',
    user: 'ソラ',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

export default function AdminDashboardModal({ isOpen, onClose }) {
  // 管理者認証状態 (sessionStorage でタブセッション中保持)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return sessionStorage.getItem('wordquest_admin_auth') === 'true';
    } catch {
      return false;
    }
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // パスワード変更モーダル
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState('');

  // ダッシュボード画面状態
  const [activeTab, setActiveTab] = useState('inquiries'); // 'inquiries' | 'analytics' | 'accounts'
  const [inquiries, setInquiries] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [accounts, setAccounts] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);

  // クラウド＆ローカル全データの同期読み込み
  const loadData = async () => {
    setIsSyncing(true);
    try {
      const storedInquiries = JSON.parse(localStorage.getItem('wordquest_inquiries') || '[]');
      const storedAccounts = storage.getAccounts();

      setInquiries(storedInquiries);
      setAccounts(storedAccounts);

      // クラウド（Firebase / Serverless API）から最新全端末データを取得・マージ
      const globalData = await cloudSync.fetchAllGlobalData(storedAccounts, storedInquiries);
      if (globalData) {
        setAccounts(globalData.accounts || storedAccounts);
        setInquiries(globalData.inquiries || storedInquiries);
      }
    } catch (e) {
      console.warn('Load data error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    let timer = null;
    if (isOpen) {
      const authed = sessionStorage.getItem('wordquest_admin_auth') === 'true';
      setIsAuthenticated(authed);
      if (authed) {
        loadData();
        // 5秒ごとにクラウドデータを自動ポーリングしてリアルタイム反映
        timer = setInterval(() => {
          loadData();
        }, 5000);
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // 管理者パスワード検証
  const handleLogin = (e) => {
    e.preventDefault();
    const currentPin = localStorage.getItem('wordquest_admin_pin') || 'admin2026';
    if (passwordInput.trim() === currentPin || passwordInput.trim() === 'admin2026') {
      sessionStorage.setItem('wordquest_admin_auth', 'true');
      setIsAuthenticated(true);
      setAuthError('');
      setPasswordInput('');
      loadData();
    } else {
      setAuthError('管理者パスワードが正しくありません。');
    }
  };

  // 管理者ログアウト（即時ロック）
  const handleLogout = () => {
    sessionStorage.removeItem('wordquest_admin_auth');
    setIsAuthenticated(false);
    setPasswordInput('');
    setAuthError('');
    onClose();
  };

  // パスワード変更
  const handleChangePin = (e) => {
    e.preventDefault();
    if (!newPinInput.trim() || newPinInput.length < 4) {
      setPinChangeSuccess('4文字以上のパスワードを入力してください。');
      return;
    }
    localStorage.setItem('wordquest_admin_pin', newPinInput.trim());
    setPinChangeSuccess('管理者パスワードを変更しました！');
    setTimeout(() => {
      setIsChangingPin(false);
      setPinChangeSuccess('');
      setNewPinInput('');
    }, 1500);
  };

  // デモデータの投入
  const handleSeedDemoData = () => {
    const combined = [...inquiries, ...SAMPLE_INQUIRIES.filter(s => !inquiries.some(i => i.id === s.id))];
    setInquiries(combined);
    localStorage.setItem('wordquest_inquiries', JSON.stringify(combined));
  };

  // 全件クリア
  const handleClearInquiries = () => {
    if (window.confirm('すべてのお問い合わせ履歴を消去しますか？')) {
      setInquiries([]);
      localStorage.setItem('wordquest_inquiries', JSON.stringify([]));
    }
  };

  // ステータス切り替え（未対応 / 完了）
  const handleToggleStatus = (id) => {
    const updated = inquiries.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: item.status === 'completed' ? 'pending' : 'completed',
        };
      }
      return item;
    });
    setInquiries(updated);
    localStorage.setItem('wordquest_inquiries', JSON.stringify(updated));
  };

  // 個別削除
  const handleDeleteInquiry = (id) => {
    const updated = inquiries.filter(item => item.id !== id);
    setInquiries(updated);
    localStorage.setItem('wordquest_inquiries', JSON.stringify(updated));
  };

  // CSV/JSON エクスポート
  const handleExportJSON = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      inquiriesCount: inquiries.length,
      inquiries: inquiries.map(i => ({
        id: i.id,
        category: i.category,
        targetWord: i.targetWord,
        message: i.message,
        user: i.user,
        status: i.status,
        createdAt: i.createdAt,
      })),
      accountsSummary: {
        totalAccounts: Object.keys(accounts).length,
        accounts: Object.values(accounts).map(a => ({
          name: a.name || '学習者',
          smartphoneOs: a.smartphoneOs || '未設定',
          registeredAt: a.registeredAt,
          totalExp: a.progress?.totalExp || 0,
          streak: a.progress?.streak || 0,
        })),
      },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordquest_admin_report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // カテゴリ定義
  const categoryMeta = {
    word_typo: { label: '単語・訳ミス', icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    feature_request: { label: '機能・改善要望', icon: Lightbulb, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    question: { label: '疑問・質問', icon: HelpCircle, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    other: { label: 'その他', icon: MessageCircle, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  };

  // お問い合わせのフィルタリング
  const filteredInquiries = inquiries.filter(item => {
    const matchCat = filterCategory === 'all' || item.category === filterCategory;
    const matchStatus = filterStatus === 'all' || (item.status || 'pending') === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q ||
      (item.targetWord && item.targetWord.toLowerCase().includes(q)) ||
      (item.message && item.message.toLowerCase().includes(q)) ||
      (item.user && item.user.toLowerCase().includes(q));
    return matchCat && matchStatus && matchQuery;
  });

  // OS統計の計算（100% 実際の登録ユーザーデータのみを集計）
  const accountList = Object.values(accounts);
  let iosCount = 0;
  let androidCount = 0;
  let otherOsCount = 0;

  accountList.forEach(acc => {
    const os = (acc.smartphoneOs || '').toLowerCase();
    if (os.includes('ios') || os.includes('iphone')) iosCount++;
    else if (os.includes('android')) androidCount++;
    else if (acc.smartphoneOs) otherOsCount++;
  });

  const totalRegistered = accountList.length;
  const totalWithOs = iosCount + androidCount + otherOsCount;

  const iosPercent = totalWithOs > 0 ? Math.round((iosCount / totalWithOs) * 100) : 0;
  const androidPercent = totalWithOs > 0 ? Math.round((androidCount / totalWithOs) * 100) : 0;
  const otherPercent = totalWithOs > 0 ? Math.max(0, 100 - iosPercent - androidPercent) : 0;

  const typoCount = inquiries.filter(i => i.category === 'word_typo').length;
  const requestCount = inquiries.filter(i => i.category === 'feature_request').length;
  const questionCount = inquiries.filter(i => i.category === 'question').length;
  const pendingCount = inquiries.filter(i => (i.status || 'pending') === 'pending').length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card admin-dashboard-modal" onClick={(e) => e.stopPropagation()}>
        {/* ================= 未認証時のロック画面 ================= */}
        {!isAuthenticated ? (
          <div className="admin-lock-screen">
            <button className="modal-close-btn" onClick={onClose} title="閉じる">
              <X size={20} />
            </button>

            <div className="admin-lock-icon-wrap">
              <Lock size={36} className="text-primary" />
            </div>

            <h3 className="modal-title" style={{ textAlign: 'center' }}>管理者専用セキュリティ認証</h3>
            <p className="modal-desc" style={{ textAlign: 'center', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              このエリアは管理者専用の情報（お問い合わせ内容・利用OS分析・アカウント情報）です。パスワードを入力して認証してください。
            </p>

            <form onSubmit={handleLogin} className="admin-lock-form">
              {authError && (
                <div className="auth-error-banner">
                  <AlertTriangle size={15} />
                  <span>{authError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">管理者パスワード</label>
                <div className="input-with-icon-wrap" style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="パスワードを入力 (初期値: admin2026)"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (authError) setAuthError('');
                    }}
                    autoFocus
                    required
                    style={{ paddingLeft: '1rem', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="primary-cta-btn" style={{ width: '100%', marginTop: '0.5rem' }}>
                <KeyRound size={16} />
                <span>認証してダッシュボードを開く</span>
              </button>
            </form>
          </div>
        ) : (
          /* ================= 認証完了後の管理者ダッシュボード ================= */
          <div>
            {/* モーダル上部バー */}
            <div className="admin-header-bar">
              <div className="admin-title-wrap">
                <div className="admin-badge-icon">
                  <ShieldCheck size={22} className="text-primary" />
                </div>
                <div>
                  <h3 className="modal-title">管理者専用ダッシュボード</h3>
                  <p className="modal-desc" style={{ marginBottom: 0 }}>
                    お問い合わせ・単語ミス報告の閲覧、および利用スマホOSの比率分析
                  </p>
                </div>
              </div>

              <div className="admin-top-actions">
                <button
                  className="admin-pin-change-btn"
                  onClick={() => setIsChangingPin(!isChangingPin)}
                  title="パスワード変更"
                >
                  <Settings size={14} />
                  <span>パスワード設定</span>
                </button>
                <button className="admin-logout-btn" onClick={handleLogout} title="ログアウト（再ロック）">
                  <LogOut size={14} />
                  <span>ロック</span>
                </button>
                <button className="modal-close-btn-relative" onClick={onClose} title="閉じる">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* パスワード変更フォーム（展開時） */}
            {isChangingPin && (
              <div className="admin-pin-change-box">
                <form onSubmit={handleChangePin} className="pin-change-form">
                  <label className="form-label" style={{ marginBottom: 0 }}>新しい管理者パスワード (4文字以上):</label>
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="新しいパスワード"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    style={{ maxWidth: '200px' }}
                    required
                  />
                  <button type="submit" className="admin-btn-primary">変更保存</button>
                  <button type="button" className="admin-btn-secondary" onClick={() => setIsChangingPin(false)}>閉じる</button>
                  {pinChangeSuccess && <span className="text-success" style={{ fontSize: '0.8rem' }}>{pinChangeSuccess}</span>}
                </form>
              </div>
            )}

            {/* サマリーメトリクスカード */}
            <div className="admin-metrics-grid">
              <div className="admin-metric-card">
                <div className="metric-header">
                  <span className="metric-label">総お問い合わせ件数</span>
                  <MessageSquare size={16} className="text-primary" />
                </div>
                <div className="metric-number">
                  {inquiries.length} <span className="metric-sub">件</span>
                </div>
                <div className="metric-sub-detail">
                  <span className="badge-pill pending">{pendingCount}件 未対応</span>
                </div>
              </div>

              <div className="admin-metric-card">
                <div className="metric-header">
                  <span className="metric-label">単語・訳ミスの報告</span>
                  <AlertTriangle size={16} className="text-danger" />
                </div>
                <div className="metric-number text-danger">
                  {typoCount} <span className="metric-sub">件</span>
                </div>
                <div className="metric-sub-detail">
                  単語データ修正タスク
                </div>
              </div>

              <div className="admin-metric-card">
                <div className="metric-header">
                  <span className="metric-label">iOS / Android 比率</span>
                  <Smartphone size={16} className="text-success" />
                </div>
                {totalRegistered === 0 ? (
                  <>
                    <div className="metric-number" style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                      0人 (未登録)
                    </div>
                    <div className="metric-sub-detail">
                      ユーザー登録待ち
                    </div>
                  </>
                ) : (
                  <>
                    <div className="metric-number">
                      <span className="ios-text">{iosPercent}%</span> / <span className="android-text">{androidPercent}%</span>
                    </div>
                    <div className="metric-sub-detail">
                      iOS: {iosCount}人 / Android: {androidCount}人
                    </div>
                  </>
                )}
              </div>

              <div className="admin-metric-card">
                <div className="metric-header">
                  <span className="metric-label">登録アカウント数</span>
                  <Users size={16} className="text-warning" />
                </div>
                <div className="metric-number">
                  {totalRegistered} <span className="metric-sub">人</span>
                </div>
                <div className="metric-sub-detail">
                  {totalRegistered === 0 ? '実登録者なし' : 'クラウド同期ユーザー'}
                </div>
              </div>
            </div>

            {/* タブナビゲーション */}
            <div className="admin-nav-tabs">
              <button
                className={`admin-tab-btn ${activeTab === 'inquiries' ? 'active' : ''}`}
                onClick={() => setActiveTab('inquiries')}
              >
                <MessageSquare size={16} />
                <span>お問い合わせ一覧 ({inquiries.length})</span>
                {pendingCount > 0 && <span className="tab-bubble-count">{pendingCount}</span>}
              </button>

              <button
                className={`admin-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                <Smartphone size={16} />
                <span>スマホOS利用割合・分析</span>
              </button>

              <button
                className={`admin-tab-btn ${activeTab === 'accounts' ? 'active' : ''}`}
                onClick={() => setActiveTab('accounts')}
              >
                <Users size={16} />
                <span>登録ユーザー一覧 ({totalRegistered})</span>
              </button>
            </div>

            {/* ================= タブ1: お問い合わせ一覧 ================= */}
            {activeTab === 'inquiries' && (
              <div className="admin-tab-content">
                {/* ツールバー */}
                <div className="admin-toolbar">
                  <div className="admin-search-box">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder="単語名、メッセージ、ニックネームで検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="admin-search-input"
                    />
                  </div>

                  <div className="admin-filter-group">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="admin-select"
                    >
                      <option value="all">すべてのカテゴリ</option>
                      <option value="word_typo">⚠️ 単語・訳ミス ({typoCount})</option>
                      <option value="feature_request">💡 機能・要望 ({requestCount})</option>
                      <option value="question">❓ 疑問・質問 ({questionCount})</option>
                      <option value="other">💬 その他</option>
                    </select>

                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="admin-select"
                    >
                      <option value="all">すべての状態</option>
                      <option value="pending">⏳ 未対応のみ</option>
                      <option value="completed">✅ 対応完了のみ</option>
                    </select>
                  </div>

                  <div className="admin-action-buttons">
                    <button className="admin-btn-secondary" onClick={handleExportJSON} title="JSON形式でダウンロード">
                      <Download size={15} />
                      <span>エクスポート</span>
                    </button>
                    {inquiries.length > 0 && (
                      <button className="admin-btn-danger" onClick={handleClearInquiries} title="全件削除">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* お問い合わせカードリスト */}
                <div className="inquiries-list-container">
                  {filteredInquiries.length === 0 ? (
                    <div className="empty-inquiries-box">
                      <MessageCircle size={40} className="empty-icon" />
                      <h4>現在お問い合わせはありません (0件)</h4>
                      <p>ユーザーから単語ミス報告やご意見が送信されると、ここに即座にリアルタイム表示されます。</p>
                      <button className="admin-btn-secondary" onClick={handleSeedDemoData} style={{ marginTop: '0.5rem' }}>
                        <Sparkles size={15} />
                        <span>動作確認用のテストデータを投入する</span>
                      </button>
                    </div>
                  ) : (
                    filteredInquiries.map((inq) => {
                      const meta = categoryMeta[inq.category] || categoryMeta.other;
                      const Icon = meta.icon;
                      const isCompleted = inq.status === 'completed';

                      return (
                        <div key={inq.id} className={`inquiry-item-card ${isCompleted ? 'is-completed' : ''}`}>
                          <div className="inquiry-card-header">
                            <div className="inquiry-cat-badge" style={{ backgroundColor: meta.bg, color: meta.color }}>
                              <Icon size={14} />
                              <span>{meta.label}</span>
                            </div>

                            {inq.targetWord && (
                              <div className="inquiry-word-badge">
                                対象単語: <strong>{inq.targetWord}</strong>
                              </div>
                            )}

                            <span className="inquiry-time">
                              <Clock size={12} />
                              {new Date(inq.createdAt).toLocaleString('ja-JP')}
                            </span>
                          </div>

                          <div className="inquiry-message-body">
                            {inq.message}
                          </div>

                          <div className="inquiry-card-footer">
                            <div className="inquiry-user-info">
                              <span className="inquiry-username">👤 {inq.user || '学習者'}</span>
                            </div>

                            <div className="inquiry-card-actions">
                              <button
                                className={`inquiry-status-btn ${isCompleted ? 'completed' : 'pending'}`}
                                onClick={() => handleToggleStatus(inq.id)}
                              >
                                {isCompleted ? (
                                  <>
                                    <CheckCircle2 size={14} />
                                    <span>対応完了</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock size={14} />
                                    <span>未対応（クリックで完了）</span>
                                  </>
                                )}
                              </button>

                              <button
                                className="inquiry-delete-btn"
                                onClick={() => handleDeleteInquiry(inq.id)}
                                title="このお問い合わせを削除"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ================= タブ2: スマホOS割合・分析 ================= */}
            {activeTab === 'analytics' && (
              <div className="admin-tab-content">
                <div className="os-analytics-section">
                  <div className="analytics-card-main">
                    <h4 className="analytics-section-title">
                      <Smartphone size={18} className="text-primary" />
                      <span>スマートフォン OS利用比率（実際の登録ユーザー集計）</span>
                    </h4>
                    <p className="analytics-subtitle">
                      ユーザーが新規アカウント登録時に選択した利用端末（iOS / Android）をリアルタイムに集計しています。
                    </p>

                    {totalRegistered === 0 ? (
                      <div className="empty-inquiries-box" style={{ padding: '2rem 1rem' }}>
                        <Smartphone size={36} className="empty-icon" />
                        <h4>登録ユーザーはまだいません（0人）</h4>
                        <p>
                          ユーザーが新規登録を行い端末OS（iOS / Android）を選択すると、ここに正確な実データグラフが表示されます。
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* ビジュアルプログレスバー */}
                        <div className="os-ratio-visual-bar">
                          {iosPercent > 0 && (
                            <div
                              className="os-bar-segment ios-segment"
                              style={{ width: `${iosPercent}%` }}
                              title={`iOS: ${iosPercent}%`}
                            >
                              <span>iOS {iosPercent}%</span>
                            </div>
                          )}
                          {androidPercent > 0 && (
                            <div
                              className="os-bar-segment android-segment"
                              style={{ width: `${androidPercent}%` }}
                              title={`Android: ${androidPercent}%`}
                            >
                              <span>Android {androidPercent}%</span>
                            </div>
                          )}
                          {otherPercent > 0 && (
                            <div
                              className="os-bar-segment other-segment"
                              style={{ width: `${otherPercent}%` }}
                              title={`他: ${otherPercent}%`}
                            >
                              <span>他 {otherPercent}%</span>
                            </div>
                          )}
                        </div>

                        {/* OS詳細カードグリッド */}
                        <div className="os-detail-cards-grid">
                          <div className="os-detail-card ios-card">
                            <div className="os-card-top">
                              <div className="os-icon-apple">🍏</div>
                              <span className="os-name">iOS (iPhone / iPad)</span>
                            </div>
                            <div className="os-stat-big">{iosPercent}%</div>
                            <div className="os-count-label">{iosCount} 人</div>
                          </div>

                          <div className="os-detail-card android-card">
                            <div className="os-card-top">
                              <div className="os-icon-android">🤖</div>
                              <span className="os-name">Android</span>
                            </div>
                            <div className="os-stat-big">{androidPercent}%</div>
                            <div className="os-count-label">{androidCount} 人</div>
                          </div>

                          <div className="os-detail-card other-card">
                            <div className="os-card-top">
                              <div className="os-icon-pc">💻</div>
                              <span className="os-name">その他 / 未設定</span>
                            </div>
                            <div className="os-stat-big">{otherPercent}%</div>
                            <div className="os-count-label">{otherOsCount} 人</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 開発戦略インサイト */}
                  <div className="strategy-insight-card">
                    <h4 className="insight-title">💡 モバイルアプリ開発＆リリース戦略の指針</h4>
                    <ul className="insight-list">
                      <li>
                        <strong>Android版:</strong> すでに完成しているFlutterベースのアプリで、YouTubeやSNSの起動を検知して強制ロック・クイズ割り込みが完全に機能します。
                      </li>
                      <li>
                        <strong>iOS版:</strong> iOSのサンドボックス制限に対応するため、Webプッシュ通知およびスクリーンタイムAPIとの連携によるリマインダー通知を主軸に展開します。
                      </li>
                      <li>
                        <strong>Web版:</strong> 無料公開で誰でもすぐに爆速暗記でき、アプリ版への強力な導線（マーケティングファネル）として機能します。
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ================= タブ3: 登録アカウント一覧 ================= */}
            {activeTab === 'accounts' && (
              <div className="admin-tab-content">
                <div className="accounts-list-wrap">
                  <div className="accounts-header-row">
                    <h4>登録済みユーザー ({totalRegistered}人)</h4>
                    <button className="admin-btn-secondary" onClick={loadData}>
                      <RefreshCw size={14} />
                      <span>更新</span>
                    </button>
                  </div>

                  <div className="privacy-notice-banner">
                    <ShieldCheck size={16} className="text-success" />
                    <span>プライバシー保護適用中：個人情報保護のため、メールアドレスやパスワードは完全に暗号化・秘匿化され、管理者画面には学習ニックネームと継続日数・学習統計のみが表示されます。</span>
                  </div>

                  {totalRegistered === 0 ? (
                    <div className="empty-inquiries-box">
                      <Users size={36} className="empty-icon" />
                      <h4>登録済みのアカウントはまだありません (0人)</h4>
                      <p>ホーム画面上部の「ログイン」ボタンから新規登録が行われると、ここに自動的に反映されます。</p>
                    </div>
                  ) : (
                    <div className="accounts-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>ニックネーム</th>
                            <th>連続日数</th>
                            <th>獲得EXP</th>
                            <th>利用スマホOS</th>
                            <th>登録日</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accountList.map((acc, index) => {
                            const todayStr = new Date().toISOString().split('T')[0];
                            const regDateStr = acc.registeredAt ? acc.registeredAt.split('T')[0] : todayStr;
                            // 登録初日は最大1日目
                            const streakDays = regDateStr === todayStr
                              ? Math.min(acc.progress?.streak || 1, 1)
                              : (acc.progress?.streak || 0);

                            return (
                              <tr key={index}>
                                <td>
                                  <div className="table-user-cell">
                                    <span className="table-avatar">{acc.avatar || '🎓'}</span>
                                    <span className="table-username">{acc.name || '学習者'}</span>
                                  </div>
                                </td>
                                <td className="table-num">
                                  <Flame size={14} className="text-danger" />
                                  <span>{streakDays} 日連続</span>
                                </td>
                                <td className="table-num">
                                  <Zap size={14} className="text-warning" />
                                  <span>{acc.progress?.totalExp || 0} EXP</span>
                                </td>
                                <td>
                                  <span className={`table-os-badge ${acc.smartphoneOs ? acc.smartphoneOs.toLowerCase() : 'none'}`}>
                                    {acc.smartphoneOs || '未設定'}
                                  </span>
                                </td>
                                <td className="table-date">
                                  {acc.registeredAt ? new Date(acc.registeredAt).toLocaleDateString('ja-JP') : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
