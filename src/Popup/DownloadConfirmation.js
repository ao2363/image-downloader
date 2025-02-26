import html from '../html.js';
import { Checkbox } from '../components/Checkbox.js';

export const DownloadConfirmation = ({
  onCheckboxChange,
  onClose,
  onConfirm,
  style,
  ...props
}) => {
  return html`
    <div 
      class="download_confirmation"
      style=${{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        ...style
      }} 
      ...${props}
    >
      <div 
        class="confirmation_dialog"
        style=${{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '90%'
        }}
      >
        <h3 style=${{ margin: '0 0 15px 0' }}>ダウンロードの確認</h3>
        <p>ブラウザの設定を確認してください。</p>
        <p class="danger" style=${{ color: 'red' }}>
          <b>ダウンロード前に各ファイルの保存場所を確認する</b>オプションが有効になっている場合、
          多数のポップアップウィンドウが開く可能性があります。ダウンロードを続行しますか？
        </p>

        <div style=${{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '20px' }}>
          <div style=${{ marginRight: 'auto' }}>
            <${Checkbox} onChange=${onCheckboxChange}>
              次回から表示しない
            <//>
          </div>

          <input
            type="button"
            class="neutral ghost"
            value="キャンセル"
            onClick=${onClose}
            style=${{
              padding: '8px 15px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: '#f5f5f5',
              cursor: 'pointer'
            }}
          />

          <input
            type="button"
            class="success"
            value="はい、ダウンロードする"
            onClick=${() => {
              onClose();
              onConfirm();
            }}
            style=${{
              padding: '8px 15px',
              border: 'none',
              borderRadius: '4px',
              background: '#4CAF50',
              color: 'white',
              cursor: 'pointer'
            }}
          />
        </div>
      </div>
    </div>
  `;
};
