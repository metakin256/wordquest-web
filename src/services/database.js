/**
 * 共通クラウドデータベース層 (Cloud Firestore / Web & 販売用スマホアプリ共通)
 * 
 * コレクション設計:
 * - users: ユーザープロフィール & 登録アカウント (UID, Email, smartphoneOs, EXP, Streak, 登録日時)
 * - inquiries: ユーザーからの問い合わせ・単語ミス報告・要望・質問
 * - user_progress: 学習進捗 (masteredWordIds, reviewWordIds, クイズ履歴)
 * - rankings_weekly: 全体ランキングデータ
 * - survey_stats: 利用端末OS集計
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

export const cloudDB = {
  // 1. 新規アカウント・プロフィールのクラウド同期
  async registerOrUpdateAccount(account) {
    if (!isFirebaseConfigured || !db || !account.email) return false;

    try {
      const emailKey = account.email.trim().toLowerCase();
      const userRef = doc(db, 'users', emailKey);
      
      const payload = {
        email: emailKey,
        name: account.name || '学習者',
        avatar: account.avatar || '🎓',
        smartphoneOs: account.smartphoneOs || 'ios',
        totalExp: account.progress?.totalExp || 0,
        streak: account.progress?.streak || 0,
        enableReminderEmail: account.enableReminderEmail !== false,
        registeredAt: account.registeredAt || new Date().toISOString(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(userRef, payload, { merge: true });

      // OS集計ドキュメントのカウント更新
      const statsRef = doc(db, 'system_stats', 'os_summary');
      const osField = (account.smartphoneOs || 'ios').toLowerCase().includes('android')
        ? 'androidCount'
        : (account.smartphoneOs || 'ios').toLowerCase().includes('ios')
        ? 'iosCount'
        : 'otherCount';

      await setDoc(statsRef, {
        [osField]: increment(1),
        totalUsers: increment(1),
        lastUpdated: serverTimestamp(),
      }, { merge: true });

      console.log('✅ Cloud DB: アカウントをクラウドに同期しました:', emailKey);
      return true;
    } catch (err) {
      console.error('Cloud DB Account Sync Error:', err);
      return false;
    }
  },

  // 2. クラウドに登録された全ユーザーアカウントの取得（管理者画面用）
  async fetchAllAccounts() {
    if (!isFirebaseConfigured || !db) return null;

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('registeredAt', 'desc'), limit(100));
      const snap = await getDocs(q);

      const accountsMap = {};
      snap.forEach((doc) => {
        const d = doc.data();
        accountsMap[doc.id] = {
          email: d.email || doc.id,
          name: d.name || d.displayName || '学習者',
          avatar: d.avatar || '🎓',
          smartphoneOs: d.smartphoneOs || '未設定',
          registeredAt: d.registeredAt || new Date().toISOString(),
          progress: {
            totalExp: d.totalExp || 0,
            streak: d.streak || 0,
          }
        };
      });

      return accountsMap;
    } catch (err) {
      console.error('Cloud DB Fetch All Accounts Error:', err);
      return null;
    }
  },

  // 3. お問い合わせ・単語ミス報告のクラウド保存
  async submitInquiry(inquiry) {
    if (!isFirebaseConfigured || !db) return false;

    try {
      const inqRef = doc(db, 'inquiries', inquiry.id || ('inq_' + Date.now()));
      const payload = {
        ...inquiry,
        createdAt: inquiry.createdAt || new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
      };

      await setDoc(inqRef, payload, { merge: true });
      console.log('✅ Cloud DB: お問い合わせをクラウドに保存しました');
      return true;
    } catch (err) {
      console.error('Cloud DB Submit Inquiry Error:', err);
      return false;
    }
  },

  // 4. クラウドのお問い合わせ一覧取得（管理者画面用）
  async fetchAllInquiries() {
    if (!isFirebaseConfigured || !db) return null;

    try {
      const inqsRef = collection(db, 'inquiries');
      const q = query(inqsRef, orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);

      const list = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          category: d.category || 'other',
          targetWord: d.targetWord || '',
          message: d.message || '',
          email: d.email || '',
          user: d.user || 'ゲスト',
          status: d.status || 'pending',
          createdAt: d.createdAt || new Date().toISOString(),
        });
      });

      return list;
    } catch (err) {
      console.error('Cloud DB Fetch Inquiries Error:', err);
      return null;
    }
  },

  // 5. お問い合わせステータスの更新（未対応 / 完了）
  async updateInquiryStatus(id, status) {
    if (!isFirebaseConfigured || !db || !id) return;

    try {
      const inqRef = doc(db, 'inquiries', id);
      await updateDoc(inqRef, {
        status: status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Cloud DB Update Inquiry Status Error:', err);
    }
  },

  // 6. ユーザー学習進捗の同期
  async syncUserProfile(user, progress) {
    if (!isFirebaseConfigured || !db || !user.email) return;

    try {
      const userRef = doc(db, 'users', user.email.trim().toLowerCase());
      await setDoc(userRef, {
        email: user.email,
        name: user.name,
        avatar: user.avatar || '🎓',
        totalExp: progress.totalExp || 0,
        streak: progress.streak || 0,
        lastStudyDate: progress.lastStudyDate || new Date().toISOString().split('T')[0],
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('Cloud DB Sync User Progress Error:', err);
    }
  },

  // 7. 全体ランキングの取得
  async fetchGlobalRankings(limitCount = 20) {
    if (!isFirebaseConfigured || !db) return null;

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('totalExp', 'desc'), limit(limitCount));
      const snap = await getDocs(q);

      const list = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          name: d.name || d.displayName || '学習者',
          exp: d.totalExp || 0,
          streak: d.streak || 0,
          avatar: d.avatar || '🎓',
        });
      });

      return list.map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
    } catch (err) {
      console.error('Cloud DB Rankings Error:', err);
      return null;
    }
  }
};
