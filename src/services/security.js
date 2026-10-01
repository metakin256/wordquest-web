import { cryptoService } from './crypto';

/**
 * 包括的セキュリティユーティリティ (Security & Protection Suite)
 * - XSS攻撃対策（入力サニタイズ・HTMLエスケープ）
 * - 総当たり攻撃（ブルートフォース）防止・レートリミット
 * - 管理者セッション自動タイムアウト管理
 * - 入力値バリデーション
 */

const LOCKOUT_KEY = 'wordquest_admin_lockout';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5分間ロック
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15分間無操作で自動ログアウト

export const securityService = {
  /**
   * XSS対策: 文字列のHTMLエスケープ・サニタイズ
   */
  sanitizeText(input, maxLength = 500) {
    if (typeof input !== 'string') return '';
    let sanitized = input
      .trim()
      .slice(0, maxLength)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '');
    return sanitized;
  },

  /**
   * プレーンテキストへの安全な復元（表示時エスケープ解除が必要な場合）
   */
  decodeHtmlEntities(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");
  },

  /**
   * メールアドレス形式の厳格チェック
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return email.length <= 100 && emailRegex.test(email.trim());
  },

  /**
   * パスワード強度チェック (最低6文字)
   */
  isValidPassword(password) {
    if (!password || typeof password !== 'string') return false;
    return password.length >= 6 && password.length <= 64;
  },

  /**
   * ブルートフォース防止: 試行回数とロック状態の確認
   */
  getLockoutStatus() {
    try {
      const data = JSON.parse(sessionStorage.getItem(LOCKOUT_KEY) || '{}');
      const now = Date.now();

      if (data.lockedUntil && now < data.lockedUntil) {
        const remainingSeconds = Math.ceil((data.lockedUntil - now) / 1000);
        return {
          isLocked: true,
          remainingSeconds,
          attempts: data.attempts || MAX_ATTEMPTS,
        };
      }

      // ロック期間が過ぎていればリセット
      if (data.lockedUntil && now >= data.lockedUntil) {
        sessionStorage.removeItem(LOCKOUT_KEY);
        return { isLocked: false, remainingSeconds: 0, attempts: 0 };
      }

      return {
        isLocked: false,
        remainingSeconds: 0,
        attempts: data.attempts || 0,
      };
    } catch {
      return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    }
  },

  /**
   * 認証失敗を記録
   */
  recordFailedAttempt() {
    try {
      const status = this.getLockoutStatus();
      const newAttempts = (status.attempts || 0) + 1;
      const now = Date.now();

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockData = {
          attempts: newAttempts,
          lockedUntil: now + LOCKOUT_DURATION_MS,
        };
        sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(lockData));
        return { isLocked: true, remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
      }

      const lockData = {
        attempts: newAttempts,
        lockedUntil: null,
      };
      sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(lockData));
      return { isLocked: false, attemptsRemaining: MAX_ATTEMPTS - newAttempts };
    } catch {
      return { isLocked: false, attemptsRemaining: 1 };
    }
  },

  /**
   * 認証成功時のロックリセット
   */
  resetFailedAttempts() {
    try {
      sessionStorage.removeItem(LOCKOUT_KEY);
      this.touchSessionActivity();
    } catch {}
  },

  /**
   * セッションアクティビティ更新
   */
  touchSessionActivity() {
    try {
      sessionStorage.setItem('wordquest_admin_last_activity', Date.now().toString());
    } catch {}
  },

  /**
   * セッションが有効期限切れか確認
   */
  isSessionExpired() {
    try {
      const lastActivity = sessionStorage.getItem('wordquest_admin_last_activity');
      if (!lastActivity) return true;
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      return elapsed > SESSION_TIMEOUT_MS;
    } catch {
      return true;
    }
  },

  /**
   * 管理者認証トークンの生成 (リクエスト検証用)
   */
  async generateAdminAuthToken(password) {
    return await cryptoService.hashPassword('admin_token_salt_' + password);
  }
};
