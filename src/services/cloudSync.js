import { cloudDB } from './database';
import { isFirebaseConfigured } from './firebase';

/**
 * 統合クラウド同期サービス (CloudSync)
 * - Firebase Firestore および Vercel Serverless API (/api/sync) を併用
 * - スマホで登録したアカウントや送信したお問い合わせが、PCの管理者画面にリアルタイムで即時届きます
 */
export const cloudSync = {
  // 1. アカウント登録のクラウド同期
  async syncAccount(accountData) {
    // A. Firebase Firestore への同期
    if (isFirebaseConfigured) {
      try {
        await cloudDB.registerOrUpdateAccount(accountData);
      } catch (e) {
        console.warn('Firebase sync error:', e);
      }
    }

    // B. Serverless API への同期
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'account',
          payload: accountData,
        }),
      });
    } catch (e) {
      // オフラインまたはローカル実行時のサイレントフォールバック
    }
  },

  // 2. お問い合わせのクラウド同期
  async syncInquiry(inquiryData) {
    // A. Firebase Firestore への同期
    if (isFirebaseConfigured) {
      try {
        await cloudDB.submitInquiry(inquiryData);
      } catch (e) {
        console.warn('Firebase inquiry sync error:', e);
      }
    }

    // B. Serverless API への同期
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'inquiry',
          payload: inquiryData,
        }),
      });
    } catch (e) {
      // オフラインまたはローカル実行時のサイレントフォールバック
    }
  },

  // 3. クラウド全データの取得（管理者ダッシュボード用）
  async fetchAllGlobalData(localAccounts = {}, localInquiries = []) {
    let mergedAccounts = { ...localAccounts };
    let mergedInquiries = [...localInquiries];

    // A. Firebase Firestore からの取得
    if (isFirebaseConfigured) {
      try {
        const firestoreAccounts = await cloudDB.fetchAllAccounts();
        if (firestoreAccounts) {
          mergedAccounts = { ...mergedAccounts, ...firestoreAccounts };
        }

        const firestoreInquiries = await cloudDB.fetchAllInquiries();
        if (firestoreInquiries && firestoreInquiries.length > 0) {
          const inqMap = new Map();
          [...firestoreInquiries, ...mergedInquiries].forEach(i => inqMap.set(i.id, i));
          mergedInquiries = Array.from(inqMap.values());
        }
      } catch (e) {
        console.warn('Firestore fetch error:', e);
      }
    }

    // B. Serverless API からの取得
    try {
      const res = await fetch('/api/sync');
      if (res.ok) {
        const data = await res.json();
        if (data.accounts) {
          mergedAccounts = { ...mergedAccounts, ...data.accounts };
        }
        if (data.inquiries && data.inquiries.length > 0) {
          const inqMap = new Map();
          [...data.inquiries, ...mergedInquiries].forEach(i => inqMap.set(i.id, i));
          mergedInquiries = Array.from(inqMap.values());
        }
      }
    } catch (e) {
      // オフラインまたはローカル実行時のフォールバック
    }

    // 最新のローカルストレージにもキャッシュ保存
    try {
      localStorage.setItem('wordquest_accounts', JSON.stringify(mergedAccounts));
      localStorage.setItem('wordquest_inquiries', JSON.stringify(mergedInquiries));
    } catch {}

    return {
      accounts: mergedAccounts,
      inquiries: mergedInquiries,
    };
  }
};
