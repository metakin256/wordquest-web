// Vercel Serverless Function: Multi-device Cloud Sync API
// スマホやPCから登録されたアカウント、OS比率、お問い合わせを一括集約・同期するエンドポイント

// インメモリ / サーバーレス共有キャッシュ
let globalStore = {
  accounts: {},
  inquiries: [],
  lastUpdated: new Date().toISOString()
};

export default async function handler(req, res) {
  // CORSヘッダーの設定
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: 全ユーザーアカウント・お問い合わせ・OS統計の取得
  if (req.method === 'GET') {
    // 既存データの正規化（登録初日の過剰streakの補正）
    const todayStr = new Date().toISOString().split('T')[0];
    Object.keys(globalStore.accounts).forEach(key => {
      const acc = globalStore.accounts[key];
      if (acc && acc.progress) {
        const regDate = acc.registeredAt ? acc.registeredAt.split('T')[0] : todayStr;
        if (regDate === todayStr && acc.progress.streak > 1) {
          acc.progress.streak = 1;
        }
      }
    });

    return res.status(200).json({
      success: true,
      accounts: globalStore.accounts,
      inquiries: globalStore.inquiries,
      lastUpdated: globalStore.lastUpdated
    });
  }

  // POST: 新規アカウント登録 または お問い合わせ送信
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { type, payload } = body;

      if (type === 'account' && payload && payload.email) {
        const emailKey = payload.email.trim().toLowerCase();
        const rawProgress = payload.progress || {};
        const todayStr = new Date().toISOString().split('T')[0];
        const regDate = payload.registeredAt ? payload.registeredAt.split('T')[0] : todayStr;
        
        // 登録初日は最大1日
        const normalizedStreak = regDate === todayStr 
          ? Math.min(rawProgress.streak || 1, 1)
          : (rawProgress.streak || 0);

        globalStore.accounts[emailKey] = {
          ...payload,
          email: emailKey,
          progress: {
            ...rawProgress,
            streak: normalizedStreak,
          },
          registeredAt: payload.registeredAt || new Date().toISOString()
        };
        globalStore.lastUpdated = new Date().toISOString();
        return res.status(200).json({ success: true, message: 'Account synced' });
      }

      if (type === 'inquiry' && payload && payload.message) {
        globalStore.inquiries.unshift({
          ...payload,
          id: payload.id || ('inq_' + Date.now()),
          createdAt: payload.createdAt || new Date().toISOString()
        });
        globalStore.lastUpdated = new Date().toISOString();
        return res.status(200).json({ success: true, message: 'Inquiry saved' });
      }

      if (type === 'update_inquiry_status' && payload) {
        globalStore.inquiries = globalStore.inquiries.map(item => {
          if (item.id === payload.id) {
            return { ...item, status: payload.status };
          }
          return item;
        });
        globalStore.lastUpdated = new Date().toISOString();
        return res.status(200).json({ success: true, message: 'Status updated' });
      }

      return res.status(400).json({ success: false, error: 'Invalid payload' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
