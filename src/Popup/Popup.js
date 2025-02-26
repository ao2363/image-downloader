import './setReferrer.js';

import html, {
  render,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from '../html.js';

import { useRunAfterUpdate } from '../hooks/useRunAfterUpdate.js';
import { isIncludedIn, removeSpecialCharacters, unique } from '../utils.js';

import * as actions from './actions.js';
import { AdvancedFilters } from './AdvancedFilters.js';
import { DownloadButton } from './DownloadButton.js';
import { DownloadConfirmation } from './DownloadConfirmation.js';
import { Images } from './Images.js';

const initialOptions = localStorage;

const Popup = () => {
  const [options, setOptions] = useState(initialOptions);

  useEffect(() => {
    Object.assign(localStorage, options);
  }, [options]);

  const [allImages, setAllImages] = useState([]);
  const [linkedImages, setLinkedImages] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [visibleImages, setVisibleImages] = useState([]);
  useEffect(() => {
    const updatePopupData = (message) => {
      if (message.type !== 'sendImages') return;

      setAllImages((allImages) => unique([...allImages, ...message.allImages]));

      setLinkedImages((linkedImages) =>
        unique([...linkedImages, ...message.linkedImages])
      );

      localStorage.active_tab_origin = message.origin;
    };

    // スクロール後に画像を再読み込みするためのリスナー
    const handleReloadImages = (message) => {
      if (message.type !== 'reloadImages') return;
      
      // 現在のタブで画像を再取得
      chrome.windows.getCurrent((currentWindow) => {
        chrome.tabs.query(
          { active: true, windowId: currentWindow.id },
          (activeTabs) => {
            chrome.scripting.executeScript({
              target: { tabId: activeTabs[0].id, allFrames: true },
              files: ['/src/Popup/sendImages.js']
            }).catch(error => {
              console.error('スクリプト実行エラー:', error);
            });
          }
        );
      });
    };

    // Add images to state and trigger filtration.
    // `sendImages.js` is injected into all frames of the active tab, so this listener may be called multiple times.
    chrome.runtime.onMessage.addListener(updatePopupData);
    chrome.runtime.onMessage.addListener(handleReloadImages);

    // Get images on the page
    chrome.windows.getCurrent((currentWindow) => {
      chrome.tabs.query(
        { active: true, windowId: currentWindow.id },
        (activeTabs) => {
          chrome.scripting.executeScript({
            target: { tabId: activeTabs[0].id, allFrames: true },
            files: ['/src/Popup/sendImages.js']
          }).catch(error => {
            console.error('スクリプト実行エラー:', error);
          });
        }
      );
    });

    return () => {
      chrome.runtime.onMessage.removeListener(updatePopupData);
      chrome.runtime.onMessage.removeListener(handleReloadImages);
    };
  }, []);

  const imagesCacheRef = useRef(new Map()); // 画像のキャッシュをMap形式で保持

  // クロスオリジン画像の読み込みを処理する関数
  const loadImage = useCallback((url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // SVG画像の場合、naturalWidthとnaturalHeightが0になる場合があるため、
        // デフォルトのサイズを設定する
        if (url.startsWith('data:image/svg+xml') || url.endsWith('.svg')) {
          if (!img.naturalWidth || !img.naturalHeight) {
            // SVG画像にデフォルトサイズを設定
            img.naturalWidth = img.naturalWidth || 100;
            img.naturalHeight = img.naturalHeight || 100;
          }
        }
        imagesCacheRef.current.set(url, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }, []);

  const filterImages = useCallback(async () => {
    let visibleImages = allImages;

    try {
      const filteredImages = await Promise.all(
        visibleImages.map(async (url) => {
          try {
            // キャッシュから画像を取得または新しく読み込む
            let image = imagesCacheRef.current.get(url);
            
            if (!image || !image.naturalWidth) {
              try {
                image = await loadImage(url);
              } catch (error) {
                // SVG画像の特別処理
                if (url.startsWith('data:image/svg+xml') || url.endsWith('.svg')) {
                  console.info(`SVG画像として処理: ${url}`);
                  // SVG画像用のダミーイメージオブジェクトを作成
                  const svgImage = new Image();
                  svgImage.naturalWidth = 100;  // デフォルト値
                  svgImage.naturalHeight = 100; // デフォルト値
                  imagesCacheRef.current.set(url, svgImage);
                  image = svgImage;
                } else if (url.includes('googlesyndication.com') || 
                    url.includes('google.com/pagead') || 
                    url.includes('doubleclick.net')) {
                  console.info(`広告画像として処理: ${url}`);
                  return false; // 広告画像は除外
                } else if (url.includes('google.com/maps') || url.startsWith('data:image')) {
                  console.info(`外部リソース画像として処理: ${url}`);
                  return true;
                } else {
                  console.error(`画像の読み込みに失敗しました: ${url}`, error);
                  return false;
                }
              }
            }

            // サイズフィルタの適用
            return (
              (options.filter_min_width_enabled !== 'true' ||
                options.filter_min_width <= image.naturalWidth) &&
              (options.filter_max_width_enabled !== 'true' ||
                image.naturalWidth <= options.filter_max_width) &&
              (options.filter_min_height_enabled !== 'true' ||
                options.filter_min_height <= image.naturalHeight) &&
              (options.filter_max_height_enabled !== 'true' ||
                image.naturalHeight <= options.filter_max_height)
            );
          } catch (error) {
            console.error(`画像処理中にエラーが発生しました: ${url}`, error);
            return false;
          }
        })
      );

      setVisibleImages(visibleImages.filter((_, index) => filteredImages[index]));
    } catch (error) {
      console.error('フィルタリング処理中にエラーが発生しました:', error);
    }
  }, [allImages, options, loadImage]);

  useEffect(() => {
    filterImages();
  }, [allImages, options]);

  const [downloadIsInProgress, setDownloadIsInProgress] = useState(false);
  const imagesToDownload = useMemo(
    () => visibleImages.filter(isIncludedIn(selectedImages)),
    [visibleImages, selectedImages]
  );

  const [
    downloadConfirmationIsShown,
    setDownloadConfirmationIsShown,
  ] = useState(false);

  function maybeDownloadImages() {
    if (options.show_download_confirmation === 'true') {
      setDownloadConfirmationIsShown(true);
    } else {
      downloadImages();
    }
  }

  async function downloadImages() {
    setDownloadIsInProgress(true);

    const downloadOptions = {};
    // ファイル名変更オプションの設定
    // show_file_renamingの値に関わらず、常にフォルダ名とファイル名を設定する
    downloadOptions.folder_name = removeSpecialCharacters(
      options.folder_name
    );
    downloadOptions.new_file_name = removeSpecialCharacters(
      options.new_file_name
    );

    chrome.runtime.sendMessage(
      {
        type: 'downloadImages',
        imagesToDownload,
        options: downloadOptions,
      },
      () => {
        setDownloadIsInProgress(false);
      }
    );
  }

  const runAfterUpdate = useRunAfterUpdate();

  return html`
    <main>
      <div id="filters_container">
        <${AdvancedFilters} 
          options=${options} 
          setOptions=${setOptions} 
          visibleImages=${visibleImages}
          selectedImages=${selectedImages}
          setSelectedImages=${setSelectedImages}
          imagesToDownload=${imagesToDownload}
        />
      </div>

      <div
        ref=${(imagesCache) => {
          if (imagesCache && !imagesCacheRef.current) {
            imagesCacheRef.current = imagesCache;
            runAfterUpdate(filterImages);
          }
        }}
        style=${{ display: 'none' }}
      >
        ${allImages.map(
          (url) => html`<img src=${url} crossorigin="anonymous" />`
        )}
      </div>

      <${Images}
        options=${options}
        visibleImages=${visibleImages}
        selectedImages=${selectedImages}
        imagesToDownload=${imagesToDownload}
        setSelectedImages=${setSelectedImages}
        imagesCacheRef=${imagesCacheRef}
      />

      <div id="downloads_container">
        <div
          style=${{
            display: 'grid',
            gridTemplateColumns: `${
              options.show_file_renaming === 'true' ? 'minmax(100px, 1fr)' : ''
            } minmax(100px, 1fr) auto`,
            gap: '8px',
            padding: '12px',
            alignItems: 'center'
          }}
        >
          <input
            type="text"
            placeholder="Save to subfolder"
            title="サブフォルダに保存する場合はフォルダ名を入力してください"
            value=${options.folder_name}
            onChange=${({ currentTarget: input }) => {
              const savedSelectionStart = removeSpecialCharacters(
                input.value.slice(0, input.selectionStart)
              ).length;

              runAfterUpdate(() => {
                input.selectionStart = input.selectionEnd = savedSelectionStart;
              });

              setOptions((options) => ({
                ...options,
                folder_name: removeSpecialCharacters(input.value),
              }));
            }}
            style=${{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          />

          ${options.show_file_renaming === 'true' && html`
            <input
              type="text"
              placeholder="Rename files"
              title="ダウンロードするファイル名を変更する場合は入力してください"
              value=${options.new_file_name}
              onChange=${({ currentTarget: input }) => {
                const savedSelectionStart = removeSpecialCharacters(
                  input.value.slice(0, input.selectionStart)
                ).length;

                runAfterUpdate(() => {
                  input.selectionStart = input.selectionEnd = savedSelectionStart;
                });

                setOptions((options) => ({
                  ...options,
                  new_file_name: removeSpecialCharacters(input.value),
                }));
              }}
              style=${{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            />
          `}

          <${DownloadButton}
            disabled=${imagesToDownload.length === 0 || downloadIsInProgress}
            loading=${downloadIsInProgress}
            onClick=${maybeDownloadImages}
          />
        </div>
      </div>

      ${downloadConfirmationIsShown &&
      html`
        <${DownloadConfirmation}
          onCheckboxChange=${({ currentTarget: { checked } }) => {
            setOptions((options) => ({
              ...options,
              show_download_confirmation: (!checked).toString(),
            }));
          }}
          onClose=${() => {
            setDownloadConfirmationIsShown(false);
          }}
          onConfirm=${downloadImages}
        />
      `}
    </main>
  `;
};

render(html`<${Popup} />`, document.body);
