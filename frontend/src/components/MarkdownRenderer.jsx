/**
 * @file src/components/MarkdownRenderer.jsx
 * @description Secure Markdown rendering component using markdown-it,
 *   DOMPurify, and highlight.js. Supports syntax-highlighted code blocks,
 *   custom quote boxes, and task lists.
 */

import React, { useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

// Initialize MarkdownIt parser
const md = new MarkdownIt({
  html: false, // Strict safety: escape raw HTML in user input
  linkify: true, // Auto-convert URL-like text to links
  breaks: true,  // Convert \n in paragraphs into <br>
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
      } catch (__) {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  }
});

// Customize code block rendering to inject a copy button
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const code = token.content;
  const lang = token.info.trim() || 'code';
  const highlighted = options.highlight(token.content, lang);

  return `
    <div class="markdown-code-block-wrap">
      <div class="markdown-code-header">
        <span class="markdown-code-lang">${lang}</span>
        <button class="markdown-code-copy-btn" data-code="${encodeURIComponent(code)}">
          📋 Copy
        </button>
      </div>
      <div class="markdown-code-body">
        ${highlighted}
      </div>
    </div>
  `;
};

const MarkdownRenderer = ({ content, className = '' }) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // Render markdown to HTML string
    const rawHtml = md.render(content);

    // Sanitize generated HTML to guarantee safety
    const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'del', 's', 'code', 'pre', 'span', 'div', 'button',
        'blockquote', 'ul', 'ol', 'li', 'a', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
      ],
      ALLOWED_ATTR: ['class', 'href', 'target', 'rel', 'data-code', 'disabled', 'checked', 'type']
    });

    // Post-process task lists & mentions
    const processedHtml = sanitizedHtml
      .replace(/<li>\[ \]\s*/g, '<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" disabled /> ')
      .replace(/<li>\[x\]\s*/gi, '<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" checked disabled /> ')
      .replace(/(^|\s)(@[A-Za-z0-9_.\-]+(?:\s+[A-Za-z0-9_.\-]+)?)/g, (match, prefix, mention) => {
        return `${prefix}<span class="msg-mention-tag">${mention}</span>`;
      });

    return processedHtml;
  }, [content]);

  // Handle click events (delegated for code copy buttons)
  const handleContainerClick = (e) => {
    const copyBtn = e.target.closest('.markdown-code-copy-btn');
    if (copyBtn) {
      e.stopPropagation();
      const code = decodeURIComponent(copyBtn.getAttribute('data-code'));
      navigator.clipboard.writeText(code)
        .then(() => {
          copyBtn.innerText = '✅ Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.innerText = '📋 Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        })
        .catch(err => {
          console.warn('[MarkdownRenderer] Failed to copy code:', err);
        });
    }
  };

  return (
    <div
      className={`markdown-renderer ${className}`}
      onClick={handleContainerClick}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

export default React.memo(MarkdownRenderer);
