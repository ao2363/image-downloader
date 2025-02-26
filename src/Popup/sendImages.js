// Manifest V3のchrome.scripting.executeScriptに対応するために、
// 関数をエクスポートして実行結果を返すようにする
function sendImages() {
  // Source: https://support.google.com/webmasters/answer/2598805?hl=en
  const imageUrlRegex = /(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*\.(?:bmp|gif|ico|jfif|jpe?g|png|svg|tiff?|webp))(?:\?([^#]*))?(?:#(.*))?/i;

  function extractImagesFromSelector(selector) {
    return unique(
      toArray(document.querySelectorAll(selector))
        .map(extractImageFromElement)
        .filter(isTruthy)
        .map(relativeUrlToAbsolute)
    );
  }

  function extractImageFromElement(element) {
    if (element.tagName.toLowerCase() === 'img') {
      try {
        const src = element.src;
        const hashIndex = src.indexOf('#');
        return hashIndex >= 0 ? src.substr(0, hashIndex) : src;
      } catch (error) {
        console.error('画像のsrc取得中にエラーが発生しました', error);
        // クロスオリジンエラーが発生した場合はsrc属性から直接取得を試みる
        try {
          const srcAttr = element.getAttribute('src');
          if (srcAttr) {
            const hashIndex = srcAttr.indexOf('#');
            return hashIndex >= 0 ? srcAttr.substr(0, hashIndex) : srcAttr;
          }
        } catch (e) {
          console.error('src属性からの取得にも失敗しました', e);
        }
        return null;
      }
    }

    if (element.tagName.toLowerCase() === 'image') {
      try {
        const src = element.getAttribute('xlink:href');
        if (!src) return null;
        const hashIndex = src.indexOf('#');
        return hashIndex >= 0 ? src.substr(0, hashIndex) : src;
      } catch (error) {
        console.error('SVG画像のxlink:href取得中にエラーが発生しました', error);
        return null;
      }
    }

    if (element.tagName.toLowerCase() === 'a') {
      try {
        const href = element.href;
        if (isImageURL(href)) {
          return href;
        }
      } catch (error) {
        console.error('リンクのhref取得中にエラーが発生しました', error);
        // hrefプロパティでエラーが発生した場合は属性から直接取得を試みる
        try {
          const hrefAttr = element.getAttribute('href');
          if (hrefAttr && isImageURL(hrefAttr)) {
            return hrefAttr;
          }
        } catch (e) {
          console.error('href属性からの取得にも失敗しました', e);
        }
      }
    }

    try {
      const backgroundImage = window.getComputedStyle(element).backgroundImage;
      if (backgroundImage) {
        const parsedURL = extractURLFromStyle(backgroundImage);
        if (isImageURL(parsedURL)) {
          return parsedURL;
        }
      }
    } catch (error) {
      console.error('背景画像の取得中にエラーが発生しました', error);
    }

    return null;
  }

  function isImageURL(url) {
    return url.indexOf('data:image') === 0 || imageUrlRegex.test(url);
  }

  function extractURLFromStyle(style) {
    return style.replace(/^.*url\(["']?/, '').replace(/["']?\).*$/, '');
  }

  function relativeUrlToAbsolute(url) {
    return url.indexOf('/') === 0 ? `${window.location.origin}${url}` : url;
  }

  function unique(values) {
    return toArray(new Set(values));
  }

  function toArray(values) {
    return [...values];
  }

  function isTruthy(value) {
    return !!value;
  }

  // メッセージを送信
  chrome.runtime.sendMessage({
    type: 'sendImages',
    allImages: extractImagesFromSelector('img, image, a, [class], [style]'),
    linkedImages: extractImagesFromSelector('a'),
    origin: window.location.origin,
  });

  // 実行結果を返す（必要に応じて）
  return {
    success: true,
    message: "Images sent to extension"
  };
}

// 関数を実行
sendImages();
