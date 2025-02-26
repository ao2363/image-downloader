import html from '../html.js';

// TODO: Implement loading animation
export const DownloadButton = ({ disabled, loading, onClick, ...props }) => {
  const tooltipText = disabled
    ? '最初に画像を選択してください'
    : loading
    ? 'ダウンロード中は拡張機能のポップアップを閉じても大丈夫です！'
    : '';

  return html`
    <input
      type="button"
      class="accent ${loading ? 'loading' : ''}"
      value=${loading ? '•••' : 'ダウンロード'}
      disabled=${disabled || loading}
      title=${tooltipText}
      onClick=${onClick}
      style=${{
        padding: '8px 15px',
        border: 'none',
        borderRadius: '4px',
        background: disabled ? '#cccccc' : '#4CAF50',
        color: 'white',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        width: '100%',
        minWidth: '120px'
      }}
      ...${props}
    />
  `;
};
