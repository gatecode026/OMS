/**
 * @file src/components/FormattingToolbar.jsx
 * @description Rich Text formatting toolbar containing formatting tools and composition preview toggles.
 */
import React from 'react';
import {
  Bold, Italic, Strikethrough, Code, Terminal,
  List, ListOrdered, Quote, Eye, EyeOff, X
} from 'lucide-react';

const FormattingToolbar = ({
  onFormat,
  onTogglePreview,
  isPreviewMode,
  visibleMode = false,
  onClose
}) => {
  // Config for markdown actions
  const tools = [
    {
      label: 'Bold',
      icon: <Bold size={15} />,
      prefix: '**',
      suffix: '**',
      title: 'Bold (Ctrl+B)'
    },
    {
      label: 'Italic',
      icon: <Italic size={15} />,
      prefix: '*',
      suffix: '*',
      title: 'Italic (Ctrl+I)'
    },
    {
      label: 'Strikethrough',
      icon: <Strikethrough size={15} />,
      prefix: '~',
      suffix: '~',
      title: 'Strikethrough (Ctrl+Shift+X)'
    },
    {
      label: 'Inline Code',
      icon: <Code size={15} />,
      prefix: '`',
      suffix: '`',
      title: 'Inline Code (Ctrl+E)'
    },
    {
      label: 'Code Block',
      icon: <Terminal size={15} />,
      prefix: '```\n',
      suffix: '\n```',
      title: 'Code Block (Ctrl+Shift+C)'
    },
    {
      label: 'Bullet List',
      icon: <List size={15} />,
      prefix: '* ',
      suffix: '',
      title: 'Bullet List'
    },
    {
      label: 'Numbered List',
      icon: <ListOrdered size={15} />,
      prefix: '1. ',
      suffix: '',
      title: 'Numbered List'
    },
    {
      label: 'Quote',
      icon: <Quote size={15} />,
      prefix: '> ',
      suffix: '',
      title: 'Block Quote'
    }
  ];

  return (
    <div className={`formatting-toolbar ${visibleMode ? 'active' : ''}`}>
      {/* Scrollable toolbar items */}
      <div className="formatting-toolbar-scroll">
        {tools.map((t) => (
          <button
            key={t.label}
            className="formatting-tool-btn"
            onClick={(e) => {
              e.preventDefault();
              if (!isPreviewMode) {
                onFormat(t.prefix, t.suffix);
              }
            }}
            disabled={isPreviewMode}
            title={t.title}
            type="button"
          >
            {t.icon}
          </button>
        ))}
      </div>



      {/* Close button */}
      {onClose && (
        <button
          className="formatting-tool-close-btn"
          onClick={(e) => {
            e.preventDefault();
            onClose();
          }}
          title="Close Formatting Toolbar"
          type="button"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};

export default React.memo(FormattingToolbar);
