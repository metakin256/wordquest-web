import { cloudDB } from './database';
import { isFirebaseConfigured } from './firebase';
import { cloudSync } from './cloudSync';
import { cryptoService } from './crypto';

const STORAGE_KEYS = {
  USER: 'wordquest_user',
  PROGRESS: 'wordquest_progress',
  WORD_STATS: 'wordquest_word_stats', // 単語ごとの統計 (asked, correct, streak)
  HISTORY: 'wordquest_history',
  THEME: 'wordquest_theme',
};

// 初期ユーザー状態
const DEFAULT_USER = {
  id: 'user_' + Math.random().toString(36).substring(2, 9),
  name: '高校生学習者',
  email: '',
  isLoggedIn: false,
  avatar: '🎓',
  smartphoneOs: null,
  createdAt: new Date().toISOString(),
};

// 初期進捗データ（初回は連続0日）
const DEFAULT_PROGRESS = {
  totalExp: 0,
  streak: 0,
  lastStudyDate: null,
  masteredCount: 0,
  reviewCount: 0,
  quizzesCompleted: 0,
  correctAnswersCount: 0,
};

// 週間ランキングのモックユーザー（ユーザー指定の自然なニックネーム）
const MOCK_RANKING_USERS = [
  { id: 'm1', name: 'レオ', exp: 1680, streak: 21, avatar: '🦁', rank: 1 },
  { id: 'm2', name: 'きなこ', exp: 1420, streak: 18, avatar: '🐱', rank: 2 },
  { id: 'm3', name: 'ソラ', exp: 1180, streak: 14, avatar: '🚀', rank: 3 },
  { id: 'm4', name: 'さくら', exp: 950, streak: 11, avatar: '🌸', rank: 4 },
  { id: 'm5', name: 'カイ', exp: 780, streak: 9, avatar: '⚡', rank: 5 },
  { id: 'm6', name: 'ぷりん', exp: 620, streak: 7, avatar: '🍮', rank: 6 },
  { id: 'm7', name: 'ルイ', exp: 490, streak: 5, avatar: '✨', rank: 7 },
  { id: 'm8', name: 'くるみ', exp: 380, streak: 4, avatar: '🐿️', rank: 8 },
  { id: 'm9', name: 'ひなた', exp: 270, streak: 3, avatar: '☀️', rank: 9 },
  { id: 'm10', name: 'レン', exp: 160, streak: 2, avatar: '🎯', rank: 10 },
  { id: 'm11', name: 'おもち', exp: 110, streak: 2, avatar: '🍡', rank: 11 },
  { id: 'm12', name: 'ニコ', exp: 60, streak: 1, avatar: '😄', rank: 12 },
];

export const storage = {
  // ユーザー情報
  getUser() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      return data ? JSON.parse(data) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  },

  saveUser(user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    if (user.isLoggedIn) {
      cloudDB.syncUserProfile(user, this.getProgress());
      cloudSync.syncAccount(user);
    }
  },

  // 登録済みアカウント一覧の取得
  getAccounts() {
    try {
      const data = localStorage.getItem('wordquest_accounts');
      const accounts = data ? JSON.parse(data) : {};
      
      // データ整合性チェック: 登録初日のアカウントが過剰なstreak(3日等)になっている場合、1日に正規化
      const today = this.getTodayString();
      let modified = false;
      Object.keys(accounts).forEach(key => {
        const acc = accounts[key];
        if (acc && acc.progress) {
          const regDate = acc.registeredAt ? acc.registeredAt.split('T')[0] : today;
          // 登録日が今日（初日）のアカウントは最大1日
          if (regDate === today && (acc.progress.streak > 1 || !acc.progress.streak)) {
            acc.progress.streak = 1;
            modified = true;
          }
        }
      });
      if (modified) {
        localStorage.setItem('wordquest_accounts', JSON.stringify(accounts));
      }
      return accounts;
    } catch {
      return {};
    }
  },

  // アカウント新規作成（パスワードの暗号化・不可逆ハッシュ化 & 初日ストリーク初期化）
  async registerAccount(userData, password) {
    const accounts = this.getAccounts();
    const emailKey = userData.email.trim().toLowerCase();
    const passwordHash = await cryptoService.hashPassword(password);
    const currentProgress = this.getProgress();

    // 新規登録時は初日として連続日数1日（学習済み）または0日からスタート
    const initialStreak = (currentProgress.quizzesCompleted > 0 || currentProgress.totalExp > 0) ? 1 : 0;
    const initialProgress = {
      ...currentProgress,
      streak: initialStreak,
    };

    const newAccount = {
      ...userData,
      email: emailKey,
      passwordHash: passwordHash,
      isLoggedIn: true,
      progress: initialProgress,
      wordStats: this.getWordStatsMap(),
      registeredAt: new Date().toISOString(),
    };

    accounts[emailKey] = newAccount;
    localStorage.setItem('wordquest_accounts', JSON.stringify(accounts));
    this.saveUser(newAccount);
    this.saveProgress(initialProgress);
    
    // クラウドへ安全に同期 (パスワードを除外して同期)
    const safeAccount = { ...newAccount };
    delete safeAccount.password;
    cloudSync.syncAccount(safeAccount);

    return { success: true, user: newAccount };
  },

  // アカウントログイン（パスワードハッシュ照合）
  async loginAccount(email, password) {
    const accounts = this.getAccounts();
    const emailKey = email.trim().toLowerCase();
    const account = accounts[emailKey];

    // もしアカウントが見つからない場合
    if (!account) {
      const currentUser = this.getUser();
      if (currentUser?.email && currentUser.email.toLowerCase() === emailKey) {
        const restored = { ...currentUser, isLoggedIn: true };
        this.saveUser(restored);
        return { success: true, user: restored };
      }
      return {
        success: false,
        error: 'アカウントが見つかりません。上の「新規登録」タブからアカウントを作成してください。'
      };
    }

    // パスワード確認（ハッシュ照合 ＆ 互換性チェック）
    const inputHash = await cryptoService.hashPassword(password);
    const isMatched = account.passwordHash 
      ? (account.passwordHash === inputHash)
      : (account.password === password);

    if (!isMatched) {
      return {
        success: false,
        error: 'パスワードが間違っています。'
      };
    }

    // 進捗データと単語統計を復元
    if (account.progress) {
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(account.progress));
    }
    if (account.wordStats) {
      localStorage.setItem(STORAGE_KEYS.WORD_STATS, JSON.stringify(account.wordStats));
    }

    const updatedUser = {
      ...account,
      isLoggedIn: true,
    };
    this.saveUser(updatedUser);
    return { success: true, user: updatedUser };
  },

  // 単語ごとの統計 (asked, correct, streak)
  // ※オリジナルアプリ版と完全一致: streak >= 3 で「習得済み（mastered）」
  getWordStatsMap() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WORD_STATS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveWordStatsMap(map) {
    localStorage.setItem(STORAGE_KEYS.WORD_STATS, JSON.stringify(map));
  },

  // 単語の習得レベル判定 ('mastered' | 'weak' | 'learning' | 'unlearned')
  getWordMastery(wordId) {
    const map = this.getWordStatsMap();
    const stat = map[wordId];
    if (!stat || stat.asked === 0) return 'unlearned'; // 未出題
    if (stat.streak >= 3) return 'mastered'; // 3回連続正解で習得済み
    if (stat.streak === 0 || (stat.correct / stat.asked < 0.5)) return 'weak'; // 直近不正解または正答率50%未満
    return 'learning'; // 1〜2回連続正解中
  },

  // 今日のローカル日付 (YYYY-MM-DD)
  getTodayString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 学習進捗
  getProgress() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      const progress = data ? JSON.parse(data) : DEFAULT_PROGRESS;
      
      const today = this.getTodayString();
      let activeStreak = progress.streak || 0;

      // 最後の学習日から2日以上経過している場合は連続記録が途切れる
      if (progress.lastStudyDate) {
        const lastDate = new Date(progress.lastStudyDate);
        const currentDate = new Date(today);
        const diffTime = currentDate - lastDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 1) {
          activeStreak = 0; // 2日以上空いたのでストリーク途切れ
        }
      } else {
        activeStreak = 0;
      }
      
      // 統計マップから最新の習得済・要復習件数を再集計
      const statsMap = this.getWordStatsMap();
      let mastered = 0;
      let weak = 0;

      Object.keys(statsMap).forEach((id) => {
        const s = statsMap[id];
        if (s.streak >= 3) mastered++;
        else if (s.asked > 0 && (s.streak === 0 || s.correct / s.asked < 0.5)) weak++;
      });

      return {
        ...progress,
        streak: activeStreak,
        masteredCount: mastered,
        reviewCount: weak,
      };
    } catch {
      return DEFAULT_PROGRESS;
    }
  },

  saveProgress(progress) {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
    const user = this.getUser();
    if (user.isLoggedIn) {
      cloudDB.syncUserProfile(user, progress);
    }
  },

  // クイズ回答結果の反映（連続日数の厳密な加算ロジック）
  recordQuizAnswers(answeredWordResults, earnedExp) {
    // answeredWordResults: [{ wordId: 1, isCorrect: true }, ...]
    const statsMap = this.getWordStatsMap();
    let quizCorrectCount = 0;

    answeredWordResults.forEach(({ wordId, isCorrect }) => {
      const current = statsMap[wordId] || { asked: 0, correct: 0, streak: 0 };
      const newAsked = current.asked + 1;
      const newCorrect = isCorrect ? current.correct + 1 : current.correct;
      // 正解ならstreak+1、不正解ならstreakリセット(0)
      const newStreak = isCorrect ? current.streak + 1 : 0;

      if (isCorrect) quizCorrectCount++;

      statsMap[wordId] = {
        asked: newAsked,
        correct: newCorrect,
        streak: newStreak,
        lastAnswered: new Date().toISOString(),
      };
    });

    this.saveWordStatsMap(statsMap);

    // 総合進捗とストリークの更新
    const progress = this.getProgress();
    const today = this.getTodayString();

    let newStreak = progress.streak || 0;
    if (!progress.lastStudyDate) {
      // 初回クリア -> 1日連続！
      newStreak = 1;
    } else {
      const lastDate = new Date(progress.lastStudyDate);
      const currentDate = new Date(today);
      const diffTime = currentDate - lastDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // 昨日学習していて今日学習 -> 連続日数 + 1！
        newStreak += 1;
      } else if (diffDays === 0) {
        // 今日すでに学習済み -> 今日の連続日数を維持
        newStreak = Math.max(1, newStreak);
      } else if (diffDays > 1) {
        // 2日以上空いて再開 -> 1日連続から再スタート
        newStreak = 1;
      }
    }

    // 習得済み数と要復習数の最新カウント
    let masteredCount = 0;
    let reviewCount = 0;
    Object.keys(statsMap).forEach((id) => {
      const s = statsMap[id];
      if (s.streak >= 3) masteredCount++;
      else if (s.asked > 0 && (s.streak === 0 || s.correct / s.asked < 0.5)) reviewCount++;
    });

    const updated = {
      ...progress,
      totalExp: (progress.totalExp || 0) + earnedExp,
      streak: newStreak,
      lastStudyDate: today,
      masteredCount,
      reviewCount,
      quizzesCompleted: (progress.quizzesCompleted || 0) + 1,
      correctAnswersCount: (progress.correctAnswersCount || 0) + quizCorrectCount,
    };

    this.saveProgress(updated);
    return updated;
  },

  // ランキング生成
  getRankings() {
    const user = this.getUser();
    const progress = this.getProgress();

    const currentUserEntry = {
      id: user.id,
      name: user.name + ' (あなた)',
      exp: progress.totalExp || 0,
      streak: progress.streak || 0,
      avatar: user.avatar || '🎓',
      isCurrentUser: true,
    };

    const all = [...MOCK_RANKING_USERS, currentUserEntry].sort((a, b) => b.exp - a.exp);

    return all.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  },

  // テーマ設定
  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  },

  saveTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  // 問題数カスタム設定
  getQuestionCount() {
    try {
      const val = localStorage.getItem('wordquest_question_count');
      return val ? parseInt(val, 10) : 10;
    } catch {
      return 10;
    }
  },

  saveQuestionCount(count) {
    localStorage.setItem('wordquest_question_count', count.toString());
  }
};
