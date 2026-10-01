// Web Push / Browser Notification Service for 苦しんで覚える英単語

export const notificationService = {
  // ブラウザが通知をサポートしているか
  isSupported() {
    return 'Notification' in window;
  },

  // 現在の通知許可状態 ('default' | 'granted' | 'denied')
  getPermission() {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  // 通知許可をリクエスト
  async requestPermission() {
    if (!this.isSupported()) {
      alert('お使いのブラウザはWeb通知に対応していません。');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        localStorage.setItem('wordquest_notification_enabled', 'true');
        this.sendNotification(
          '🔥 苦しんで覚える英単語',
          'サボり防止通知が有効になりました！毎日の学習リマインダーをお届けします。'
        );
        return true;
      } else {
        localStorage.setItem('wordquest_notification_enabled', 'false');
        return false;
      }
    } catch (e) {
      console.error('Notification error:', e);
      return false;
    }
  },

  // 通知を送信
  sendNotification(title, body, icon = '🎓') {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const notif = new Notification(title, {
        body: body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'wordquest-reminder',
        renotify: true,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };

      return true;
    } catch (e) {
      console.error('Failed to trigger notification:', e);
      return false;
    }
  },

  // サボり防止テスト通知
  sendTestReminder() {
    return this.sendNotification(
      '🚨 苦しんで覚える英単語：さぼり警告！',
      '今日の英単語4択テストがまだ完了していません！ストリーク（連続記録）が途切れる前に8問解きましょう！'
    );
  },

  // 定期的なサボりチェック（学習記録が今日ない場合に通知）
  checkAndSendDailyReminder(lastPlayedDate) {
    if (!this.isSupported() || Notification.permission !== 'granted') return;
    const isEnabled = localStorage.getItem('wordquest_notification_enabled') === 'true';
    if (!isEnabled) return;

    const todayStr = new Date().toISOString().split('T')[0];
    if (lastPlayedDate !== todayStr) {
      // 今日まだプレイしていない
      const lastNotif = localStorage.getItem('wordquest_last_notif_date');
      if (lastNotif !== todayStr) {
        this.sendNotification(
          '🔥 苦しんで覚える英単語：今日のノルマ',
          '今日の英単語テストはお済みですか？スキマ時間の3分で爆速暗記しましょう！'
        );
        localStorage.setItem('wordquest_last_notif_date', todayStr);
      }
    }
  }
};
