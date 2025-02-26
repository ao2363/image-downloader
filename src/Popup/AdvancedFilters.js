import html, { useEffect, useRef } from '../html.js';
import { Checkbox } from '../components/Checkbox.js';

// Currently a singleton. Should rewrite once we switch to a full-fledged rendering library
export const AdvancedFilters = ({ options, setOptions, visibleImages, selectedImages, setSelectedImages, imagesToDownload }) => {
  const widthSliderRef = useSlider('width', options, setOptions);
  const heightSliderRef = useSlider('height', options, setOptions);

  // TODO: Extract and reuse in `Options.js` and other components
  const setCheckboxOption = (key) => ({ currentTarget: { checked } }) => {
    setOptions((options) => ({ ...options, [key]: checked.toString() }));
  };

  // スクロール機能を実装
  const handleScroll = () => {
    // 現在のタブを取得
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      
      // スクロールスクリプトを実行
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: () => {
          // 高速スクロール処理
          const scrollStep = window.innerHeight;
          const scrollInterval = 200; // ミリ秒（少し遅くして安定性を向上）
          const maxScrolls = 50; // 最大スクロール回数
          
          let scrollCount = 0;
          const scrollTimer = setInterval(() => {
            window.scrollBy(0, scrollStep);
            scrollCount++;
            
            if (scrollCount >= maxScrolls) {
              clearInterval(scrollTimer);
              // スクロール完了後、画像を再取得するためにメッセージを送信
              setTimeout(() => {
                window.scrollTo(0, 0); // 一番上に戻る
                // 画像の読み込みが完了するまで少し待機
                setTimeout(() => {
                  chrome.runtime.sendMessage({ type: 'reloadImages' });
                }, 1000);
              }, 500);
            }
          }, scrollInterval);
        }
      });
    });
  };

  return html`
    <div>
      <!-- フィルターテーブル -->
      <table class="grid">
        <colgroup>
          <col style=${{ width: '45px' }} />
          <col style=${{ width: '80px' }} />
          <col />
          <col style=${{ width: '80px' }} />
        </colgroup>

        <tr id="image_width_filter">
          <td>横幅:</td>

          <td>
            <label
              class=${options.filter_min_width_enabled === 'true'
                ? ''
                : 'light'}
              style=${{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
              title=${getSliderCheckboxTooltip(
                options.filter_min_width_enabled
              )}
            >
              <small>${options.filter_min_width}px ≤ </small>
              <${SliderCheckbox}
                options=${options}
                optionKey="filter_min_width_enabled"
                setCheckboxOption=${setCheckboxOption}
              />
            </label>
          </td>

          <td style=${{ padding: '1px 8px 0 8px' }}>
            <div ref=${widthSliderRef}></div>
          </td>

          <td>
            <label
              class=${options.filter_max_width_enabled === 'true'
                ? ''
                : 'light'}
              style=${{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              title=${getSliderCheckboxTooltip(
                options.filter_max_width_enabled
              )}
            >
              <${SliderCheckbox}
                options=${options}
                optionKey="filter_max_width_enabled"
                setCheckboxOption=${setCheckboxOption}
              />
              <small>≤ ${options.filter_max_width}px</small>
            </label>
          </td>
        </tr>

        <tr id="image_height_filter">
          <td>縦幅:</td>

          <td>
            <label
              class=${options.filter_min_height_enabled === 'true'
                ? ''
                : 'light'}
              style=${{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
              title=${getSliderCheckboxTooltip(
                options.filter_min_height_enabled
              )}
            >
              <small>${options.filter_min_height}px ≤ </small>
              <${SliderCheckbox}
                options=${options}
                optionKey="filter_min_height_enabled"
                setCheckboxOption=${setCheckboxOption}
              />
            </label>
          </td>

          <td style=${{ padding: '1px 8px 0 8px' }}>
            <div ref=${heightSliderRef}></div>
          </td>

          <td>
            <label
              class=${options.filter_max_height_enabled === 'true'
                ? ''
                : 'light'}
              style=${{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              title=${getSliderCheckboxTooltip(
                options.filter_max_height_enabled
              )}
            >
              <${SliderCheckbox}
                options=${options}
                optionKey="filter_max_height_enabled"
                setCheckboxOption=${setCheckboxOption}
              />
              <small>≤ ${options.filter_max_height}px</small>
            </label>
          </td>
        </tr>
      </table>

      <!-- ボタンと選択カウンター用の別テーブル -->
      <div class="controls-container" style=${{ marginTop: '10px' }}>
        <div style=${{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div class="button-group" style=${{ 
            display: 'flex', 
            gap: '8px',
            flex: '1'
          }}>
            <button 
              class="select_all_button"
              onClick=${() => setSelectedImages(visibleImages)}
              style=${{ flex: '1' }}
            >
              全選択
            </button>
            <button 
              class="deselect_button"
              onClick=${() => setSelectedImages([])}
              style=${{ flex: '1' }}
            >
              選択解除
            </button>
            <button 
              class="scroll_button"
              onClick=${handleScroll}
              title="ページをスクロールして新しい画像を読み込みます"
              style=${{ flex: '1' }}
            >
              スクロール
            </button>
          </div>
          <div class="selection_count" style=${{ 
            marginLeft: '10px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}>
            ${imagesToDownload.length} / ${visibleImages.length}
          </div>
        </div>
      </div>
    </div>
  `;
};

const SliderCheckbox = ({
  options,
  optionKey,
  setCheckboxOption,
  ...props
}) => {
  const enabled = options[optionKey] === 'true';
  return html`
    <input
      type="checkbox"
      checked=${enabled}
      onChange=${setCheckboxOption(optionKey, setCheckboxOption)}
      ...${props}
    />
  `;
};

const useSlider = (dimension, options, setOptions) => {
  const sliderRef = useRef(null);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    noUiSlider.create(slider, {
      behaviour: 'extend-tap',
      connect: true,
      format: {
        from: (value) => parseInt(value, 10),
        to: (value) => parseInt(value, 10).toString(),
      },
      range: {
        min: parseInt(options[`filter_min_${dimension}_default`], 10),
        max: parseInt(options[`filter_max_${dimension}_default`], 10),
      },
      step: 10,
      start: [
        options[`filter_min_${dimension}`],
        options[`filter_max_${dimension}`],
      ],
    });

    slider.noUiSlider.on('update', ([min, max]) => {
      setOptions((options) => ({
        ...options,
        [`filter_min_${dimension}`]: min,
        [`filter_max_${dimension}`]: max,
      }));
    });

    return () => {
      if (slider.noUiSlider) {
        slider.noUiSlider.destroy();
      }
    };
  }, []);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    if (
      options[`filter_min_${dimension}_enabled`] === 'true' ||
      options[`filter_max_${dimension}_enabled`] === 'true'
    ) {
      slider.removeAttribute('disabled');
    } else {
      slider.setAttribute('disabled', true);
    }
  }, [
    options[`filter_min_${dimension}_enabled`],
    options[`filter_max_${dimension}_enabled`],
  ]);

  useDisableSliderHandle(
    () =>
      sliderRef.current
        ? sliderRef.current.querySelectorAll('.noUi-origin')[0]
        : undefined,
    options[`filter_min_${dimension}_enabled`]
  );

  useDisableSliderHandle(
    () =>
      sliderRef.current
        ? sliderRef.current.querySelectorAll('.noUi-origin')[1]
        : undefined,
    options[`filter_max_${dimension}_enabled`]
  );

  return sliderRef;
};

const useDisableSliderHandle = (
  getHandle,
  option,
  tooltipText = 'Click the checkbox next to this slider to enable it'
) => {
  useEffect(() => {
    const handle = getHandle();
    if (!handle) return;

    if (option === 'true') {
      handle.removeAttribute('disabled');
      handle.removeAttribute('title');
    } else {
      handle.setAttribute('disabled', true);
      handle.setAttribute('title', tooltipText);
    }
  }, [option]);
};

const getSliderCheckboxTooltip = (option) =>
  `Click this checkbox to ${
    option === 'true' ? 'disable' : 'enable'
  } filtering by this value`;
