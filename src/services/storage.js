import { cloudDB } from './database';
import { isFirebaseConfigured } from './firebase';

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

// 初期進捗データ
const DEFAULT_PROGRESS = {
  totalExp: 0,
  streak: 1,
  lastStudyDate: new Date().toISOString().split('T')[0],
  masteredCount: 0,
  reviewCount: 0,
  quizzesCompleted: 0,
  correctAnswersCount: 0,
};

// モックのランキング上位陣
const MOCK_RANKING_USERS = [
  { id: 'm1', name: '東大志望_高3', exp: 1680, streak: 21, avatar: '🦁', rank: 1 },
  { id: 'm2', name: '共通テスト9割目標', exp: 1250, streak: 15, avatar: '🚀', rank: 2 },
  { id: 'm3', name: 'Sara / 早慶志望', exp: 980, streak: 12, avatar: '🌸', rank: 3 },
  { id: 'm4', name: 'MARCH絶対合格', exp: 740, streak: 8, avatar: '⚡', rank: 4 },
  { id: 'm5', name: '高2_毎日20問', exp: 560, streak: 6, avatar: '🎯', rank: 5 },
  { id: 'm6', name: 'Yuki_英語特訓中', exp: 420, streak: 4, avatar: '📚', rank: 6 },
  { id: 'm7', name: 'Ken_高1', exp: 310, streak: 3, avatar: '✨', rank: 7 },
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
    }
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

  // 学習進捗
  getProgress() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      const progress = data ? JSON.parse(data) : DEFAULT_PROGRESS;
      
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

  // クイズ回答結果の反映（オリジナルアプリと完全同一ロジック）
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
    const today = new Date().toISOString().split('T')[0];

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
      streak: progress.streak || 1,
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
