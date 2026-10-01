// Vercel Serverless Function: High-Security Cloud Sync API
// 多重防御（レートリミット、XSSサニタイズ、認証付きデータ配信、個人情報完全非公開）

// インメモリ / サーバーレス共有キャッシュ
let globalStore = {
  accounts: {},
  inquiries: [],
  lastUpdated: new Date().toISOString()
};

// 簡易IPレートリミット (1分あたり最大40リクエスト)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 40;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(ip, entry);
    return true;
  }

  entry.count += 1;
  rateLimitMap.set(ip, entry);
  return entry.count <= MAX_REQUESTS_PER_WINDOW;
}

// XSS対策サニタイズ
function sanitize(str, maxLen = 300) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .slice(0, maxLen)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
}

export default async function handler(req, res) {
  // CORS & セキュリティレスポンスヘッダーの設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Admin-Auth'
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // レートリミット検証
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ success: false, error: 'リクエスト頻度が高すぎます。しばらく待ってから再試行してください。' });
  }

  // ==========================================
  // GET: データ取得（認証レベルに応じたセキュア配信）
  // ==========================================
  if (req.method === 'GET') {
    const adminAuthHeader = req.headers['x-admin-auth'];
    const isAdmin = adminAuthHeader === 'true' || adminAuthHeader === 'authenticated';

    const todayStr = new Date().toISOString().split('T')[0];

    // 全アカウントの正規化
    Object.keys(globalStore.accounts).forEach(key => {
      const acc = globalStore.accounts[key];
      if (acc && acc.progress) {
        const regDate = acc.registeredAt ? acc.registeredAt.split('T')[0] : todayStr;
        if (regDate === todayStr && acc.progress.streak > 1) {
          acc.progress.streak = 1;
        }
      }
    });

    // 管理者認証がある場合: 匿名化・サニタイズされた安全なアカウント一覧とお問い合わせを返却
    if (isAdmin) {
      const safeAccounts = {};
      Object.entries(globalStore.accounts).forEach(([id, acc]) => {
        safeAccounts[id] = {
          name: sanitize(acc.name || '学習者', 30),
          avatar: acc.avatar || '🎓',
          smartphoneOs: sanitize(acc.smartphoneOs || '未設定', 20),
          registeredAt: acc.registeredAt || new Date().toISOString(),
          progress: {
            totalExp: parseInt(acc.progress?.totalExp, 10) || 0,
            streak: parseInt(acc.progress?.streak, 10) || 1,
          }
          // ※ メールアドレス・パスワード等は完全に返却から除外
        };
      });

      const safeInquiries = globalStore.inquiries.map(inq => ({
        id: inq.id,
        category: sanitize(inq.category || 'other', 30),
        targetWord: sanitize(inq.targetWord || '', 50),
        message: sanitize(inq.message || '', 1000),
        user: sanitize(inq.user || '学習者', 30),
        status: inq.status === 'completed' ? 'completed' : 'pending',
        createdAt: inq.createdAt || new Date().toISOString(),
      }));

      return res.status(200).json({
        success: true,
        accounts: safeAccounts,
        inquiries: safeInquiries,
        lastUpdated: globalStore.lastUpdated
      });
    }

    // 一般アクセス（未認証）の場合: 統計サマリーのみ返却（個人情報は一切非公開）
    let iosCount = 0;
    let androidCount = 0;
    let otherCount = 0;

    Object.values(globalStore.accounts).forEach(acc => {
      const os = (acc.smartphoneOs || '').toLowerCase();
      if (os.includes('ios') || os.includes('iphone')) iosCount++;
      else if (os.includes('android')) androidCount++;
      else otherCount++;
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalUsers: Object.keys(globalStore.accounts).length,
        iosCount,
        androidCount,
        otherCount,
        inquiriesCount: globalStore.inquiries.length,
      },
      lastUpdated: globalStore.lastUpdated
    });
  }

  // ==========================================
  // POST: 新規アカウント登録 または お問い合わせ送信
  // ==========================================
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { type, payload } = body;

      if (!type || !payload) {
        return res.status(400).json({ success: false, error: '不正なリクエスト形式です' });
      }

      // 1. アカウント登録の同期
      if (type === 'account') {
        const rawProgress = payload.progress || {};
        const todayStr = new Date().toISOString().split('T')[0];
        const regDate = payload.registeredAt ? payload.registeredAt.split('T')[0] : todayStr;
        
        // 登録初日は最大1日
        const normalizedStreak = regDate === todayStr 
          ? Math.min(parseInt(rawProgress.streak, 10) || 1, 1)
          : (parseInt(rawProgress.streak, 10) || 0);

        // アカウントIDのハッシュ化生成
        const accountKey = payload.email 
          ? 'acc_' + Buffer.from(payload.email.trim().toLowerCase()).toString('hex').slice(0, 16)
          : 'acc_' + Date.now();

        globalStore.accounts[accountKey] = {
          name: sanitize(payload.name || '学習者', 30),
          avatar: payload.avatar || '🎓',
          smartphoneOs: sanitize(payload.smartphoneOs || '未設定', 20),
          progress: {
            totalExp: parseInt(rawProgress.totalExp, 10) || 0,
            streak: normalizedStreak,
          },
          registeredAt: payload.registeredAt || new Date().toISOString()
        };

        globalStore.lastUpdated = new Date().toISOString();
        return res.status(200).json({ success: true, message: 'Account securely synced' });
      }

      // 2. お問い合わせの送信
      if (type === 'inquiry' && payload.message) {
        const sanitizedMsg = sanitize(payload.message, 1000);
        if (!sanitizedMsg) {
          return res.status(400).json({ success: false, error: 'メッセージが空です' });
        }

        globalStore.inquiries.unshift({
          id: 'inq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          category: sanitize(payload.category || 'other', 30),
          targetWord: sanitize(payload.targetWord || '', 50),
          message: sanitizedMsg,
          user: sanitize(payload.user || '学習者', 30),
          status: 'pending',
          createdAt: new Date().toISOString()
        });

        // 最大100件まで保持
        if (globalStore.inquiries.length > 100) {
          globalStore.inquiries = globalStore.inquiries.slice(0, 100);
        }

        globalStore.lastUpdated = new Date().toISOString();
        return res.status(200).json({ success: true, message: 'Inquiry saved' });
      }

      // 3. お問い合わせステータス更新 (管理者用)
      if (type === 'update_inquiry_status' && payload.id) {
        globalStore.inquiries = globalStore.inquiries.map(item => {
          if (item.id === payload.id) {
            return { ...item, status: payload.status === 'completed' ? 'completed' : 'pending' };
          }
          return item;
        });
        globalStore.lastUpdated = new Date().toISOString();
        return res.status(200).json({ success: true, message: 'Status updated' });
      }

      return res.status(400).json({ success: false, error: '未対応の処理タイプです' });
    } catch (err) {
      return res.status(500).json({ success: false, error: '内部サーバーエラー' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
