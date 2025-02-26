import html, { useEffect, useMemo, useRef } from '../html.js';

import { Checkbox } from '../components/Checkbox.js';
import { isIncludedIn, isNotStrictEqual, stopPropagation } from '../utils.js';

import {
  DownloadImageButton,
  ImageUrlTextbox,
  OpenImageButton,
} from './ImageActions.js';

export const Images = ({
  options,
  visibleImages,
  selectedImages,
  imagesToDownload,
  setSelectedImages,
  imagesCacheRef,
  style,
  ...props
}) => {
  const containerStyle = useMemo(() => {
    const columns = parseInt(options.columns, 10);
    return {
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      width: `calc(2 * var(--images-container-padding) + ${columns} * ${options.image_max_width}px + ${columns - 1} * var(--images-container-gap))`,
      ...style,
    };
  }, [options.columns, options.image_max_width, style]);

  // Fix weird flexbox bug where the parent does not respect the child's width
  // https://github.com/PactInteractive/image-downloader/issues/114#issuecomment-1715716846
  useEffect(() => {
    // Set min width instead of width to allow for other content like header or footer to render properly
    document.querySelector('main').style.minWidth = containerStyle.width;
  }, [containerStyle]);

  const showImageUrl = useMemo(() => options.show_image_url === 'true', [
    options.show_image_url,
  ]);

  const showOpenImageButton = useMemo(
    () => options.show_open_image_button === 'true',
    [options.show_open_image_button]
  );

  const showDownloadImageButton = useMemo(
    () => options.show_download_image_button === 'true',
    [options.show_download_image_button]
  );

  const someImagesAreSelected = useMemo(
    () =>
      visibleImages.length > 0 &&
      visibleImages.some(isIncludedIn(selectedImages)),
    [visibleImages, selectedImages]
  );

  const allImagesAreSelected = useMemo(
    () =>
      visibleImages.length > 0 &&
      visibleImages.every(isIncludedIn(selectedImages)),
    [visibleImages, selectedImages]
  );

  return html`
    <div id="images_container" style=${containerStyle} ...${props}>
      ${visibleImages.map(
        (imageUrl, index) => html`
          <div
            id=${`card_${index}`}
            class="card ${selectedImages.includes(imageUrl) ? 'checked' : ''}"
            style=${{ minHeight: `${options.image_max_width}px` }}
            onClick=${() => {
              setSelectedImages((selectedImages) =>
                selectedImages.includes(imageUrl)
                  ? selectedImages.filter(isNotStrictEqual(imageUrl))
                  : [...selectedImages, imageUrl]
              );
            }}
          >
            ${imageUrl.startsWith('data:image/svg+xml') ? 
              // SVG画像の場合は専用の表示方法を使用
              html`
                <div
                  class="svg-container"
                  style=${{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: `${options.image_min_width}px`,
                  }}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V9M13 2L20 9M13 2V9H20" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <text x="12" y="16" text-anchor="middle" font-size="6" fill="#999">SVG</text>
                  </svg>
                  <div 
                    class="size_info" 
                    id=${`size_info_${index}`} 
                    style=${{ position: 'absolute', bottom: '5px', fontSize: '10px', color: '#999' }}
                  >
                    ${(() => {
                      // SVG画像のサイズ情報を取得
                      const img = imagesCacheRef?.current?.get(imageUrl);
                      if (img && img.naturalWidth && img.naturalHeight) {
                        return `${img.naturalWidth}×${img.naturalHeight}`;
                      }
                      return 'SVG画像';
                    })()}
                  </div>
                </div>
              ` :
              // 通常の画像表示
              html`
                <img
                  src=${imageUrl}
                  ${!imageUrl.startsWith('data:') ? 'crossOrigin="anonymous"' : ''}
                  style=${{
                    minWidth: `${options.image_min_width}px`,
                    maxWidth: `${options.image_max_width}px`,
                    maxHeight: `${options.image_max_width}px`,
                    objectFit: 'contain',
                  }}
                  onError=${(e) => {
                    if (imageUrl.includes('googlesyndication.com') || 
                        imageUrl.includes('google.com/pagead') || 
                        imageUrl.includes('doubleclick.net')) {
                      // 広告関連URLの場合は特別な処理
                      console.error(`広告画像の読み込みに失敗しました: ${imageUrl}`);
                      
                      // 広告画像用のプレースホルダーを表示
                      const adContainer = document.createElement('div');
                      adContainer.style.width = '100%';
                      adContainer.style.height = '100%';
                      adContainer.style.display = 'flex';
                      adContainer.style.alignItems = 'center';
                      adContainer.style.justifyContent = 'center';
                      adContainer.style.backgroundColor = '#f0f0f0';
                      adContainer.style.color = '#999';
                      adContainer.style.fontSize = '12px';
                      adContainer.textContent = '広告コンテンツ';
                      
                      e.target.parentNode.appendChild(adContainer);
                      e.target.style.display = 'none';
                    } else {
                      console.error(`画像の読み込みに失敗しました: ${imageUrl}`);
                      e.target.style.display = 'none';
                    }
                  }}
                  onLoad=${(e) => {
                    const img = e.target;
                    const sizeInfo = document.getElementById(`size_info_${index}`);
                    if (sizeInfo) {
                      sizeInfo.textContent = `${img.naturalWidth}×${img.naturalHeight}`;
                    }
                  }}
                />
                <div class="size_info" id=${`size_info_${index}`}></div>
              `
            }

            <div class="checkbox"></div>

            ${showImageUrl &&
            html`
              <div class="image_url_container" onClick=${stopPropagation}>
                <${ImageUrlTextbox} imageUrl=${imageUrl} onClick=${stopPropagation} />
              </div>
            `}

            ${(showOpenImageButton || showDownloadImageButton) &&
            html`
              <div class="actions" onClick=${stopPropagation}>
                ${showOpenImageButton &&
                html`<${OpenImageButton} imageUrl=${imageUrl} />`}
                ${showDownloadImageButton &&
                html`<${DownloadImageButton} imageUrl=${imageUrl} />`}
              </div>
            `}
          </div>
        `
      )}
    </div>
  `;
};
