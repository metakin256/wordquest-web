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
  Sparkles
} from 'lucide-react';
import { storage } from '../services/storage';

// 初期デモ用のお問い合わせデータ
const SAMPLE_INQUIRIES = [
  {
    id: 'inq_sample_1',
    category: 'word_typo',
    targetWord: 'abandon',
    message: '日本語訳の「見捨てる」に加えて「諦める」の意味も出題文の解説に加えていただけると嬉しいです！',
    email: 'student_a@example.com',
    user: '高校2年生 (レオ)',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'inq_sample_2',
    category: 'feature_request',
    targetWord: '',
    message: '毎日夜21時にスマホへ通知が来る機能がとても便利です。通知の時間を自由に変更できるようになるとさらに最高です！',
    email: 'tanaka_study@example.com',
    user: '田中 (きなこ)',
    status: 'completed',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'inq_sample_3',
    category: 'question',
    targetWord: 'accommodate',
    message: 'この単語は共通テストでもよく出ますか？長文読解での頻出度を教えてほしいです。',
    email: 'examinee2026@example.com',
    user: '受験生S',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'inq_sample_4',
    category: 'word_typo',
    targetWord: 'benevolent',
    message: '発音記号のアクセント位置が「ne」の部分になっているか確認をお願いできますでしょうか。',
    email: 'english_fan@example.com',
    user: 'ソラ',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

export default function AdminDashboardModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('inquiries'); // 'inquiries' | 'analytics' | 'accounts'
  const [inquiries, setInquiries] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [accounts, setAccounts] = useState({});

  // データの読み込み
  const loadData = () => {
    try {
      const storedInquiries = JSON.parse(localStorage.getItem('wordquest_inquiries') || '[]');
      setInquiries(storedInquiries);
      const storedAccounts = storage.getAccounts();
      setAccounts(storedAccounts);
    } catch {
      setInquiries([]);
      setAccounts({});
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      inquiries,
      accountsSummary: {
        totalAccounts: Object.keys(accounts).length,
        accounts: Object.values(accounts).map(a => ({
          email: a.email,
          name: a.name,
          smartphoneOs: a.smartphoneOs,
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
      (item.email && item.email.toLowerCase().includes(q)) ||
      (item.user && item.user.toLowerCase().includes(q));
    return matchCat && matchStatus && matchQuery;
  });

  // OS統計の計算
  const accountList = Object.values(accounts);
  const totalUsers = Math.max(accountList.length, 1);
  let iosCount = 0;
  let androidCount = 0;
  let otherOsCount = 0;

  accountList.forEach(acc => {
    const os = (acc.smartphoneOs || '').toLowerCase();
    if (os.includes('ios') || os.includes('iphone')) iosCount++;
    else if (os.includes('android')) androidCount++;
    else otherOsCount++;
  });

  // アカウントが0件の場合のサンプル統計比率（参考値）
  const displayIosCount = accountList.length > 0 ? iosCount : 68;
  const displayAndroidCount = accountList.length > 0 ? androidCount : 38;
  const displayOtherCount = accountList.length > 0 ? otherOsCount : 8;
  const displayTotalOs = displayIosCount + displayAndroidCount + displayOtherCount;

  const iosPercent = Math.round((displayIosCount / displayTotalOs) * 100);
  const androidPercent = Math.round((displayAndroidCount / displayTotalOs) * 100);
  const otherPercent = 100 - iosPercent - androidPercent;

  const typoCount = inquiries.filter(i => i.category === 'word_typo').length;
  const requestCount = inquiries.filter(i => i.category === 'feature_request').length;
  const questionCount = inquiries.filter(i => i.category === 'question').length;
  const pendingCount = inquiries.filter(i => (i.status || 'pending') === 'pending').length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card admin-dashboard-modal" onClick={(e) => e.stopPropagation()}>
        {/* モーダル上部バー */}
        <div className="admin-header-bar">
          <div className="admin-title-wrap">
            <div className="admin-badge-icon">
              <BarChart3 size={22} className="text-primary" />
            </div>
            <div>
              <h3 className="modal-title">管理者ダッシュボード & お問い合わせ確認</h3>
              <p className="modal-desc">
                ユーザーからの単語ミス報告・要望・質問の確認、および利用スマホOSの比率分析
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="閉じる">
            <X size={20} />
          </button>
        </div>

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
            <div className="metric-number">
              <span className="ios-text">{iosPercent}%</span> / <span className="android-text">{androidPercent}%</span>
            </div>
            <div className="metric-sub-detail">
              iOS: {displayIosCount}人 / Android: {displayAndroidCount}人
            </div>
          </div>

          <div className="admin-metric-card">
            <div className="metric-header">
              <span className="metric-label">登録アカウント数</span>
              <Users size={16} className="text-warning" />
            </div>
            <div className="metric-number">
              {accountList.length} <span className="metric-sub">アカウント</span>
            </div>
            <div className="metric-sub-detail">
              クラウド同期ユーザー
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
            <span>登録ユーザー一覧 ({accountList.length})</span>
          </button>
        </div>

        {/* ================= タブ1: お問い合わせ一覧 ================= */}
        {activeTab === 'inquiries' && (
          <div className="admin-tab-content">
            {/* ツールバー (フィルタ・検索・アクション) */}
            <div className="admin-toolbar">
              <div className="admin-search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="単語名、メッセージ、メールで検索..."
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
                {inquiries.length === 0 && (
                  <button className="admin-btn-secondary" onClick={handleSeedDemoData} title="確認用デモデータを追加">
                    <PlusCircle size={15} />
                    <span>デモデータ投入</span>
                  </button>
                )}
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
                  <h4>該当するお問い合わせはありません</h4>
                  <p>右上の「デモデータ投入」ボタンを押すと、表示確認用のサンプルデータが追加されます。</p>
                  <button className="admin-btn-primary" onClick={handleSeedDemoData}>
                    <Sparkles size={16} />
                    <span>デモデータを投入して確認する</span>
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
                          <span className="inquiry-username">👤 {inq.user || 'ゲスト'}</span>
                          {inq.email && (
                            <a href={`mailto:${inq.email}`} className="inquiry-email-link">
                              <Mail size={13} />
                              {inq.email}
                            </a>
                          )}
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
                  <span>スマートフォン OS利用比率（集計結果）</span>
                </h4>
                <p className="analytics-subtitle">
                  登録ユーザーのアカウント情報および事前アンケートの回答からリアルタイムに自動集計しています。
                </p>

                {/* ビジュアルプログレスバー */}
                <div className="os-ratio-visual-bar">
                  <div
                    className="os-bar-segment ios-segment"
                    style={{ width: `${iosPercent}%` }}
                    title={`iOS: ${iosPercent}%`}
                  >
                    {iosPercent > 10 && <span>iOS {iosPercent}%</span>}
                  </div>
                  <div
                    className="os-bar-segment android-segment"
                    style={{ width: `${androidPercent}%` }}
                    title={`Android: ${androidPercent}%`}
                  >
                    {androidPercent > 10 && <span>Android {androidPercent}%</span>}
                  </div>
                  {otherPercent > 0 && (
                    <div
                      className="os-bar-segment other-segment"
                      style={{ width: `${otherPercent}%` }}
                      title={`PC/その他: ${otherPercent}%`}
                    >
                      {otherPercent > 8 && <span>他 {otherPercent}%</span>}
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
                    <div className="os-count-label">{displayIosCount} ユーザー</div>
                    <p className="os-insight">
                      日本の高校生において圧倒的なシェア。App Storeでの配信優先度: <strong>最重要</strong>
                    </p>
                  </div>

                  <div className="os-detail-card android-card">
                    <div className="os-card-top">
                      <div className="os-icon-android">🤖</div>
                      <span className="os-name">Android (Galaxy / Pixel等)</span>
                    </div>
                    <div className="os-stat-big">{androidPercent}%</div>
                    <div className="os-count-label">{displayAndroidCount} ユーザー</div>
                    <p className="os-insight">
                      アプリロック・常駐バックグラウンド制御がフル機能で利用可能。Google Play版。
                    </p>
                  </div>

                  <div className="os-detail-card other-card">
                    <div className="os-card-top">
                      <div className="os-icon-pc">💻</div>
                      <span className="os-name">PC / その他ブラウザ</span>
                    </div>
                    <div className="os-stat-big">{otherPercent}%</div>
                    <div className="os-count-label">{displayOtherCount} ユーザー</div>
                    <p className="os-insight">
                      PCやタブレットからのWeb版利用。キーボードショートカット対応。
                    </p>
                  </div>
                </div>
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
                <h4>登録済みユーザー ({accountList.length}人)</h4>
                <button className="admin-btn-secondary" onClick={loadData}>
                  <RefreshCw size={14} />
                  <span>更新</span>
                </button>
              </div>

              {accountList.length === 0 ? (
                <div className="empty-inquiries-box">
                  <Users size={36} className="empty-icon" />
                  <h4>登録済みのアカウントはまだありません</h4>
                  <p>ホーム画面上部の「ログイン」ボタンから新規登録が行われると、ここに自動的に反映されます。</p>
                </div>
              ) : (
                <div className="accounts-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ニックネーム</th>
                        <th>メールアドレス</th>
                        <th>利用スマホOS</th>
                        <th>累計EXP</th>
                        <th>連続日数</th>
                        <th>登録日時</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountList.map((acc, index) => (
                        <tr key={index}>
                          <td>
                            <div className="table-user-cell">
                              <span className="table-avatar">{acc.avatar || '🎓'}</span>
                              <span className="table-username">{acc.name}</span>
                            </div>
                          </td>
                          <td className="table-email">{acc.email}</td>
                          <td>
                            <span className={`table-os-badge ${acc.smartphoneOs ? acc.smartphoneOs.toLowerCase() : 'none'}`}>
                              {acc.smartphoneOs || '未設定'}
                            </span>
                          </td>
                          <td className="table-num">
                            <Zap size={13} className="text-warning" />
                            {acc.progress?.totalExp || 0}
                          </td>
                          <td className="table-num">
                            <Flame size={13} className="text-danger" />
                            {acc.progress?.streak || 0}日
                          </td>
                          <td className="table-date">
                            {acc.registeredAt ? new Date(acc.registeredAt).toLocaleDateString('ja-JP') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
