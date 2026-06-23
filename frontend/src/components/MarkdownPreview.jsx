/**
 * @file src/components/MarkdownPreview.jsx
 * @description Renders a live message preview inside the input composer.
 */

import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';

const MarkdownPreview = ({ content }) => {
  return (
    <div className="markdown-preview-container">
      <div className="markdown-preview-header">
        <span>Live Preview</span>
      </div>
      <div className="markdown-preview-body">
        {content?.trim() ? (
          <MarkdownRenderer content={content} />
        ) : (
          <span className="markdown-preview-empty">Type something in the editor to see preview...</span>
        )}
      </div>
    </div>
  );
};

export default React.memo(MarkdownPreview);
