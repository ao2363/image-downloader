// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referer
const referrerHeaderName = 'Referer';

// Manifest V3では、webRequest.onBeforeSendHeadersのblockingオプションは使用できません
// 代わりにdeclarativeNetRequestを使用するか、Service Workerで処理する必要があります
// この機能は現在のバージョンでは無効化し、必要に応じてService Workerで実装します

// 現在のタブのオリジンを保存する処理は維持
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs && tabs[0] && tabs[0].url) {
    try {
      const url = new URL(tabs[0].url);
      localStorage.active_tab_origin = url.origin;
    } catch (e) {
      console.error('URLの解析に失敗しました:', e);
    }
  }
});

// 注: Manifest V3での代替実装方法
// 1. declarativeNetRequest APIを使用する
// 2. Service Workerでフェッチリクエストをインターセプトする
// 3. Content-Securityポリシーの調整を検討する

console.log('Referrer設定は現在のManifest V3では無効化されています。必要に応じてService Workerで実装してください。');
