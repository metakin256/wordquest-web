/**
 * 共通データベース層 (Cloud Firestore / Web & 販売用スマホアプリ共通)
 * 
 * コレクション設計:
 * - users: ユーザープロフィール (UID, Email, isPremium, EXP, Streak, 最終学習日)
 * - user_progress: 学習進捗 (masteredWordIds, reviewWordIds, クイズ履歴)
 * - words_master: 英単語マスターデータ (全単語・販売用単語フラグ)
 * - rankings_weekly: 全体ランキングデータ
 * - survey_votes: アプリ版OSアンケート投票データ
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
import { WORDS_DATABASE } from '../data/words';

export const cloudDB = {
  // 1. ユーザープロファイル・購入ステータスの同期
  async syncUserProfile(user, progress) {
    if (!isFirebaseConfigured || !db || !user.email) return;

    try {
      const userRef = doc(db, 'users', user.id || user.email);
      const data = {
        email: user.email,
        displayName: user.name,
        avatar: user.avatar || '🎓',
        isPremium: user.isPremium || false,
        purchasePlatform: user.purchasePlatform || 'none', // 'google_play' | 'app_store'
        totalExp: progress.totalExp || 0,
        streak: progress.streak || 1,
        lastStudyDate: progress.lastStudyDate || new Date().toISOString().split('T')[0],
        updatedAt: serverTimestamp(),
      };

      await setDoc(userRef, data, { merge: true });

      // 進捗データ（暗記単語リスト）の保存
      const progressRef = doc(db, 'user_progress', user.id || user.email);
      await setDoc(progressRef, {
        masteredWordIds: progress.masteredWordIds || [],
        reviewWordIds: progress.reviewWordIds || [],
        quizzesCompleted: progress.quizzesCompleted || 0,
        correctAnswersCount: progress.correctAnswersCount || 0,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      console.log('✅ Cloud DB: ユーザー進捗をクラウドに同期しました');
    } catch (err) {
      console.error('Cloud DB Sync Error:', err);
    }
  },

  // 2. クラウドから進捗データの読み込み
  async fetchUserProfile(userIdOrEmail) {
    if (!isFirebaseConfigured || !db || !userIdOrEmail) return null;

    try {
      const userRef = doc(db, 'users', userIdOrEmail);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) return null;

      const userData = userSnap.data();
      const progressRef = doc(db, 'user_progress', userIdOrEmail);
      const progressSnap = await getDoc(progressRef);
      const progressData = progressSnap.exists() ? progressSnap.data() : {};

      return {
        user: {
          id: userIdOrEmail,
          email: userData.email,
          name: userData.displayName,
          avatar: userData.avatar,
          isPremium: userData.isPremium,
          purchasePlatform: userData.purchasePlatform,
          isLoggedIn: true,
        },
        progress: {
          totalExp: userData.totalExp || 0,
          streak: userData.streak || 1,
          lastStudyDate: userData.lastStudyDate,
          masteredWordIds: progressData.masteredWordIds || [],
          reviewWordIds: progressData.reviewWordIds || [],
          quizzesCompleted: progressData.quizzesCompleted || 0,
          correctAnswersCount: progressData.correctAnswersCount || 0,
        }
      };
    } catch (err) {
      console.error('Cloud DB Fetch Error:', err);
      return null;
    }
  },

  // 3. 全体ランキングの取得（Web & アプリ共通）
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
          name: d.displayName || '学習者',
          exp: d.totalExp || 0,
          streak: d.streak || 1,
          avatar: d.avatar || '🎓',
          isPremium: d.isPremium || false,
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
  },

  // 4. OSアンケートのクラウド投票
  async submitSurveyVote(choice, email = '') {
    if (!isFirebaseConfigured || !db) return;

    try {
      const statsRef = doc(db, 'survey_stats', 'summary');
      const field = choice === 'ios' ? 'iosVotes' : choice === 'android' ? 'androidVotes' : 'bothVotes';

      await setDoc(statsRef, {
        [field]: increment(1),
        totalVotes: increment(1),
        lastUpdated: serverTimestamp(),
      }, { merge: true });

      if (email) {
        const emailsRef = collection(db, 'survey_emails');
        await setDoc(doc(emailsRef), {
          email,
          choice,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Cloud DB Survey Error:', err);
    }
  },

  // 5. 単語マスターデータ初期同期（管理用）
  async seedWordsToCloud() {
    if (!isFirebaseConfigured || !db) return;

    try {
      for (const word of WORDS_DATABASE) {
        const wordRef = doc(db, 'words_master', String(word.id));
        await setDoc(wordRef, {
          ...word,
          isPremiumOnly: word.id > 20, // 20単語以降を有料販売用とする例
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      console.log('✅ 単語マスターデータをクラウドDBに投入完了');
    } catch (err) {
      console.error('Seed Words Error:', err);
    }
  }
};
