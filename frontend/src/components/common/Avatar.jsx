import React from 'react';
import './Avatar.css';

export const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Map hash to HSL space for premium look
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 60%, 50%)`;
};

const Avatar = ({ name = '', size = 'md', className = '' }) => {
  const initials = getInitials(name);
  const bgColor = getAvatarColor(name);

  return (
    <div
      className={`avatar-circle avatar-${size} ${className}`}
      style={{ backgroundColor: bgColor }}
      title={name}
    >
      <span className="avatar-text">{initials}</span>
    </div>
  );
};

export default Avatar;
