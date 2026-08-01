import React, { useRef } from 'react';
import { BsCalendar2Date } from 'react-icons/bs';

const YearFixedDateInput = ({
  value,
  onChange,
  disabled = false,
  required = false,
  style = {},
  min,
  max,
  placeholder = ''
}) => {
  const currentYear = new Date().getFullYear();
  const inputRef = useRef(null);

  let formattedDisplay = placeholder || `dd-mm-${currentYear}`;
  let isPlaceholder = true;

  if (value && typeof value === 'string' && value.includes('-')) {
    const parts = value.split('-');
    if (parts.length === 3 && parts[1] && parts[2]) {
      const [, m, d] = parts;
      formattedDisplay = `${d}-${m}-${currentYear}`;
      isPlaceholder = false;
    }
  }

  const handleClick = () => {
    if (disabled) return;
    if (inputRef.current) {
      try {
        if (typeof inputRef.current.showPicker === 'function') {
          inputRef.current.showPicker();
        } else {
          inputRef.current.focus();
        }
      } catch (err) {
        inputRef.current.focus();
      }
    }
  };

  const minVal = min || `${currentYear}-01-01`;
  const maxVal = max || `${currentYear}-12-31`;

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '100%',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: '8px',
          background: style.background || 'var(--bg-card, #1a1d2c)',
          border: style.border || '1px solid var(--border-color, #282F3E)',
          fontSize: style.fontSize || '0.84rem',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: isPlaceholder ? 'var(--text-muted, #707E94)' : 'var(--text-primary, #E2E8F0)',
          userSelect: 'none',
          pointerEvents: 'none',
          height: style.height || 'auto',
          ...style,
        }}
      >
        <span style={{ fontWeight: isPlaceholder ? 500 : 600 }}>{formattedDisplay}</span>
        <BsCalendar2Date size={15} style={{ opacity: 0.9, color: '#ffffff', flexShrink: 0 }} />
      </div>

      <input
        ref={inputRef}
        type="date"
        value={value || ''}
        min={minVal}
        max={maxVal}
        disabled={disabled}
        required={required}
        onChange={(e) => {
          let val = e.target.value;
          if (val) {
            const parts = val.split('-');
            if (parts.length === 3 && parts[0]) {
              val = `${currentYear}-${parts[1]}-${parts[2]}`;
            }
          }
          onChange(val);
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
          zIndex: 2,
        }}
      />
    </div>
  );
};

export default YearFixedDateInput;
