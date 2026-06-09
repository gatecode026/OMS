import React from 'react';
import './Avatar.css';
import { useApp } from '../../context/AppContext';

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

const Avatar = ({ name = '', size = 'md', className = '', src = '' }) => {
  let appState = {};
  try {
    appState = useApp() || {};
  } catch (e) {
    // Context might not be available
  }
  const { currentUser, employees } = appState;

  const initials = getInitials(name);
  const bgColor = getAvatarColor(name);

  // Look up matching employee/user to see if they have uploaded a profile photo
  const emp = employees?.find(e => e.name === name) || (currentUser?.name === name ? currentUser : null);
  const imageUrl = src || emp?.photoUrl || emp?.avatar;

  return (
    <div
      className={`avatar-circle avatar-${size} ${className}`}
      style={{ 
        backgroundColor: imageUrl ? 'transparent' : bgColor,
        overflow: 'hidden'
      }}
      title={name}
    >
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={name} 
          className="avatar-img"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
        />
      ) : (
        <span className="avatar-text">{initials}</span>
      )}
    </div>
  );
};

export default Avatar;
