// @ts-check
/// <reference types="chrome"/>

/** @typedef {{ numberOfProcessedImages: number, imagesToDownload: string[], options: any, next: () => void }} Task */

/** @type {Set<Task>} */
const tasks = new Set();

// イベントリスナーの登録
chrome.runtime.onMessage.addListener(startDownload);
chrome.downloads.onDeterminingFilename.addListener(suggestNewFilename);
chrome.runtime.onInstalled.addListener(handleInstallAndUpdate);

// インストールと更新の処理
/**
 * @param {chrome.runtime.InstalledDetails} details
 */
function handleInstallAndUpdate(details) {
  // Service WorkerではlocalStorageが使用できないため、chrome.storage.localを使用
  chrome.storage.local.clear();
}

// ダウンロード開始処理
/**
 * @param {any} message
 * @param {chrome.runtime.MessageSender} sender
 * @param {(response?: any) => void} sendResponse
 * @returns {boolean}
 */
function startDownload(message, sender, sendResponse) {
  if (!(message && message.type === 'downloadImages')) return false;

  downloadImages({
    numberOfProcessedImages: 0,
    imagesToDownload: message.imagesToDownload,
    options: message.options,
    next() {
      this.numberOfProcessedImages += 1;
      if (this.numberOfProcessedImages === this.imagesToDownload.length) {
        tasks.delete(this);
      }
    },
  }).then(sendResponse);

  return true; // メッセージチャネルを開いたままにする
}

// 画像ダウンロード処理
/**
 * @param {Task} task
 * @returns {Promise<void>}
 */
async function downloadImages(task) {
  tasks.add(task);
  for (const image of task.imagesToDownload) {
    await new Promise((resolve) => {
      chrome.downloads.download({ url: image }, (downloadId) => {
        if (downloadId == null) {
          if (chrome.runtime.lastError) {
            console.error(`${image}:`, chrome.runtime.lastError.message);
          }
          task.next();
        }
        resolve();
      });
    });
  }
}

// ファイル名の提案処理
/**
 * @param {chrome.downloads.DownloadItem} item
 * @param {(suggestion?: chrome.downloads.DownloadFilenameSuggestion) => void} suggest
 */
function suggestNewFilename(item, suggest) {
  const task = [...tasks][0];
  if (!task) {
    suggest();
    return;
  }

  // タスクにオプションがない場合は処理しない
  if (!task.options) {
    suggest();
    return;
  }

  let newFilename = '';
  // フォルダ名の設定
  if (task.options.folder_name) {
    newFilename += `${task.options.folder_name}/`;
  }
  
  // ファイル名の設定
  if (task.options.new_file_name) {
    const regex = /(?:\.([^.]+))?$/;
    const extension = regex.exec(item.filename)?.[1] || '';
    const numberOfDigits = task.imagesToDownload.length.toString().length;
    const formattedImageNumber = `${task.numberOfProcessedImages + 1}`.padStart(
      numberOfDigits,
      '0'
    );
    newFilename += `${task.options.new_file_name}${formattedImageNumber}.${extension}`;
  } else {
    newFilename += item.filename;
  }

  // デバッグ情報
  console.log('変更後のファイル名:', newFilename);
  console.log('オプション:', task.options);

  suggest({ filename: normalizeSlashes(newFilename) });
  task.next();
}

// スラッシュの正規化
/**
 * @param {string} filename
 * @returns {string}
 */
function normalizeSlashes(filename) {
  return filename.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
} 