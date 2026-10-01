import { cloudDB } from './database';
import { isFirebaseConfigured } from './firebase';

const STORAGE_KEYS = {
  USER: 'wordquest_user',
  PROGRESS: 'wordquest_progress',
  HISTORY: 'wordquest_history',
  SURVEY: 'wordquest_survey_votes',
  THEME: 'wordquest_theme',
};


// 初期ユーザー状態
const DEFAULT_USER = {
  id: 'user_' + Math.random().toString(36).substring(2, 9),
  name: 'ゲスト学習者',
  email: '',
  isLoggedIn: false,
  avatar: '🎓',
  createdAt: new Date().toISOString(),
};

// 初期進捗データ
const DEFAULT_PROGRESS = {
  totalExp: 140,
  streak: 3,
  lastStudyDate: new Date().toISOString().split('T')[0],
  masteredWordIds: [1, 4],
  reviewWordIds: [2],
  quizzesCompleted: 4,
  correctAnswersCount: 18,
};

// モックのランキング上位陣（リアルな競争体験）
const MOCK_RANKING_USERS = [
  { id: 'm1', name: 'Yuki.T (TOEIC850目指す)', exp: 1250, streak: 18, avatar: '🦁', rank: 1 },
  { id: 'm2', name: 'Kenji / 毎日30単語', exp: 980, streak: 12, avatar: '🚀', rank: 2 },
  { id: 'm3', name: 'Sara_Eng', exp: 820, streak: 9, avatar: '🌸', rank: 3 },
  { id: 'm4', name: 'Daiki (留学準備)', exp: 670, streak: 7, avatar: '⚡', rank: 4 },
  { id: 'm5', name: 'Emi.K', exp: 530, streak: 5, avatar: '🎯', rank: 5 },
  { id: 'm6', name: 'Taro_Study', exp: 410, streak: 4, avatar: '📚', rank: 6 },
  { id: 'm7', name: 'Aoi.M', exp: 320, streak: 3, avatar: '✨', rank: 7 },
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
    // クラウド同期
    if (user.isLoggedIn) {
      cloudDB.syncUserProfile(user, this.getProgress());
    }
  },

  // 学習進捗
  getProgress() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      return data ? JSON.parse(data) : DEFAULT_PROGRESS;
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

  // EXP加算とストリーク更新
  addExpAndRecordQuiz(earnedExp, correctCount, totalCount, masteredIds = [], reviewIds = []) {
    const progress = this.getProgress();
    const today = new Date().toISOString().split('T')[0];

    // ストリーク計算
    let newStreak = progress.streak || 1;
    if (progress.lastStudyDate) {
      const lastDate = new Date(progress.lastStudyDate);
      const currentDate = new Date(today);
      const diffTime = currentDate - lastDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    }

    const uniqueMastered = Array.from(new Set([...(progress.masteredWordIds || []), ...masteredIds]));
    // 暗記済みのものは復習リストから除外
    const uniqueReview = Array.from(new Set([...(progress.reviewWordIds || []), ...reviewIds]))
      .filter(id => !uniqueMastered.includes(id));

    const updated = {
      ...progress,
      totalExp: (progress.totalExp || 0) + earnedExp,
      streak: newStreak,
      lastStudyDate: today,
      masteredWordIds: uniqueMastered,
      reviewWordIds: uniqueReview,
      quizzesCompleted: (progress.quizzesCompleted || 0) + 1,
      correctAnswersCount: (progress.correctAnswersCount || 0) + correctCount,
    };

    this.saveProgress(updated);
    return updated;
  },

  // ランキング生成（モック＋自分）
  getRankings() {
    const user = this.getUser();
    const progress = this.getProgress();

    const currentUserEntry = {
      id: user.id,
      name: user.name + ' (あなた)',
      exp: progress.totalExp || 0,
      streak: progress.streak || 1,
      avatar: user.avatar || '🎓',
      isCurrentUser: true,
    };

    // リスト結合＆ソート
    const all = [...MOCK_RANKING_USERS, currentUserEntry].sort((a, b) => b.exp - a.exp);

    return all.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  },

  // OSアンケート集計機能
  getSurveyStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SURVEY);
      if (raw) return JSON.parse(raw);
    } catch {}

    // 初期サンプル統計データ
    const defaultStats = {
      iosVotes: 142,
      androidVotes: 89,
      bothVotes: 23,
      hasVoted: false,
      userChoice: null,
      emailsRegistered: 86,
    };
    localStorage.setItem(STORAGE_KEYS.SURVEY, JSON.stringify(defaultStats));
    return defaultStats;
  },

  voteSurvey(choice, email = '') {
    const stats = this.getSurveyStats();
    if (choice === 'ios') stats.iosVotes += 1;
    if (choice === 'android') stats.androidVotes += 1;
    if (choice === 'both') stats.bothVotes += 1;
    if (email) stats.emailsRegistered += 1;

    stats.hasVoted = true;
    stats.userChoice = choice;
    stats.userEmail = email;

    localStorage.setItem(STORAGE_KEYS.SURVEY, JSON.stringify(stats));

    // クラウドにも非同期送信
    cloudDB.submitSurveyVote(choice, email);

    return stats;
  },


  // テーマ設定
  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  },

  saveTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }
};
