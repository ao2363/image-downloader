import html from '../html.js';
import * as actions from './actions.js';

export const ImageUrlTextbox = ({ imageUrl, onClick, ...props }) => html`
  <input
    type="text"
    readonly
    value=${imageUrl}
    onClick=${(e) => {
      e.currentTarget.select();
      if (onClick) {
        onClick(e);
      }
    }}
    ...${props}
  />
`;

export const OpenImageButton = ({ imageUrl, onClick, ...props }) => {
  return html`
    <button
      type="button"
      title="Open in new tab"
      style=${{ backgroundImage: `url("/images/open.svg")` }}
      onClick=${(e) => {
        chrome.tabs.create({ url: imageUrl, active: false });
        if (onClick) {
          onClick(e);
        }
      }}
      ...${props}
    />
  `;
};

export const DownloadImageButton = ({
  imageUrl,
  options,
  onClick,
  ...props
}) => {
  return html`
    <button
      type="button"
      title="Download"
      style=${{ backgroundImage: `url("/images/download.svg")` }}
      onClick=${(e) => {
        actions.downloadImages([imageUrl], options);
        if (onClick) {
          onClick(e);
        }
      }}
      ...${props}
    />
  `;
};
