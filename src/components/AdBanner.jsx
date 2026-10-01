import React, { useEffect } from 'react';
import { ExternalLink, Sparkles, Smartphone, BookOpen } from 'lucide-react';

/**
 * 広告表示コンポーネント (AdBanner)
 * - Google AdSense の自動広告 / レスポンシブ広告スロットに対応
 * - AdSense のクライアントIDがない場合は、美しく洗練された自社広告・アプリ告知・参考書アフィリエイト風バナーを代替表示
 */
export default function AdBanner({
  slot = 'default',
  format = 'auto',
  className = '',
  adClient = '', // 例: 'ca-pub-XXXXXXXXXXXXXXXX'
  adSlot = '',   // 例: '1234567890'
}) {
  const isAdSenseConfigured = Boolean(adClient && adSlot);

  useEffect(() => {
    if (isAdSenseConfigured) {
      try {
        if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
          window.adsbygoogle.push({});
        }
      } catch (e) {
        console.warn('AdSense load error:', e);
      }
    }
  }, [isAdSenseConfigured]);

  if (isAdSenseConfigured) {
    return (
      <div className={`ad-banner-container adsense-container ${className}`}>
        <div className="ad-label-pill">スポンサー広告</div>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // スロットに応じたデフォルト告知・アフィリエイト風広告バナー
  return (
    <div className={`ad-banner-container custom-promo-banner slot-${slot} ${className}`}>
      <div className="ad-label-pill">広告 / スポンサー</div>
      
      {slot === 'result' ? (
        <div className="promo-banner-content result-promo">
          <div className="promo-icon-wrap">
            <Smartphone size={28} className="promo-icon" />
          </div>
          <div className="promo-text-wrap">
            <div className="promo-headline">
              <span className="promo-tag">📱 スマホ完全版</span>
              <strong>苦しんで覚える英単語 アプリ版 (Android / iOS)</strong>
            </div>
            <p className="promo-desc">
              YouTubeやSNSをロックして英単語を解かないと解除できない！強制暗記モード搭載アプリを準備中。
            </p>
          </div>
          <div className="promo-action">
            <span className="promo-btn-sample">
              事前登録受付中 <Sparkles size={14} />
            </span>
          </div>
        </div>
      ) : slot === 'quiz-bottom' ? (
        <div className="promo-banner-content quiz-compact-promo">
          <BookOpen size={18} className="text-primary" />
          <span className="compact-text">
            <strong>大学受験 共通テスト〜東大レベル完全制覇</strong> 8,114語完全無料公開中
          </span>
        </div>
      ) : (
        <div className="promo-banner-content home-promo">
          <div className="promo-left">
            <div className="promo-badge-line">
              <span className="promo-badge-hot">PR</span>
              <span className="promo-sub">高校生・大学受験生応援</span>
            </div>
            <h4 className="promo-title">
              『苦しんで覚える英単語』ネイティブ音声 ＆ 難関大単語8,114語
            </h4>
            <p className="promo-detail">
              スマホのブラウザで毎日の通学・スキマ時間に即アクセス。サボり防止リマインダーで習慣化！
            </p>
          </div>
          <div className="promo-right">
            <div className="promo-demo-badge">
              <span>Google AdSense / アフィリエイト枠</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
