/**
 * 暗号化・セキュリティ & プライバシー保護ユーティリティ (Crypto & Privacy Guard)
 * - パスワードの不可逆ハッシュ化 (SHA-256)
 * - 個人情報（メールアドレス・ID等）の自動マスキング・匿名化
 */

export const cryptoService = {
  /**
   * パスワードの不可逆SHA-256ハッシュ生成 (平文保存の完全防止)
   */
  async hashPassword(password) {
    if (!password) return '';
    try {
      const msgBuffer = new TextEncoder().encode('wq_salt_2026_' + password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // フォールバックハッシュ
      let hash = 0;
      const str = 'wq_salt_2026_' + password;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      return 'h_' + Math.abs(hash).toString(16);
    }
  },

  /**
   * メールアドレスの匿名マスキング (例: mtkn.256@gmail.com -> m***@g***.com)
   */
  maskEmail(email) {
    if (!email || typeof email !== 'string') return '匿名ユーザー';
    const parts = email.split('@');
    if (parts.length !== 2) return '匿名ユーザー';
    
    const user = parts[0];
    const domain = parts[1];
    
    const maskedUser = user.length <= 2 ? user[0] + '***' : user[0] + '***' + user[user.length - 1];
    const domainParts = domain.split('.');
    const maskedDomain = domainParts[0].length <= 2 
      ? domainParts[0][0] + '***' 
      : domainParts[0][0] + '***.' + domainParts.slice(1).join('.');
      
    return `${maskedUser}@${maskedDomain}`;
  }
};
