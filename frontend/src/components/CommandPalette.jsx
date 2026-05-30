import React, { useState, useEffect, useRef } from 'react';
import './CommandPalette.css';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Building2,
  UserPlus,
  Users,
  Clock,
  CalendarDays,
  GitMerge,
  Network,
  Award,
  Briefcase,
  GitFork,
  KanbanSquare,
  FileText,
  BarChart3,
  DollarSign,
  Megaphone,
  Bell,
  FolderClosed,
  ShieldAlert,
  Key,
  AreaChart,
  Settings,
  Lock,
  Terminal,
  UserSquare2,
  LogOut
} from 'lucide-react';

const navigationItems = [
  { name: 'Dashboard', path: '/', section: 'Core', icon: LayoutDashboard },
  { name: 'Company Overview', path: '/overview', section: 'Core', icon: Building2 },
  { name: 'Add Employee', path: '/employees/add', section: 'People', icon: UserPlus },
  { name: 'All Employees', path: '/employees', section: 'People', icon: Users },
  { name: 'Punch In Out Reports', path: '/attendance', section: 'People', icon: Clock },
  { name: 'Leave Management', path: '/leaves', section: 'People', icon: CalendarDays },
  { name: 'Department Management', path: '/departments', section: 'People', icon: GitMerge },
  { name: 'Agency Branch Management', path: '/branches', section: 'People', icon: Network },
  { name: 'Team Leaders', path: '/teams', section: 'People', icon: Award },
  { name: 'Project Management', path: '/projects', section: 'Operations', icon: Briefcase },
  { name: 'Workflow Management', path: '/workflows', section: 'Operations', icon: GitFork },
  { name: 'Task Monitoring', path: '/tasks', section: 'Operations', icon: KanbanSquare },
  { name: 'Daily Work Reports', path: '/work-reports', section: 'Operations', icon: FileText },
  { name: 'Performance Analytics', path: '/performance', section: 'Operations', icon: BarChart3 },
  { name: 'Payroll Management', path: '/payroll', section: 'Operations', icon: DollarSign },
  { name: 'Announcements', path: '/announcements', section: 'Communication', icon: Megaphone },
  { name: 'Notifications', path: '/notifications', section: 'Communication', icon: Bell },
  { name: 'Document Management', path: '/documents', section: 'Communication', icon: FolderClosed },
  { name: 'Activity Logs', path: '/activity-logs', section: 'Administration', icon: ShieldAlert },
  { name: 'User Access Control', path: '/permissions', section: 'Administration', icon: Key },
  { name: 'Reports and Analytics', path: '/reports', section: 'Administration', icon: AreaChart },
  { name: 'System Settings', path: '/settings', section: 'System', icon: Settings },
  { name: 'Security Settings', path: '/security', section: 'System', icon: Lock },
  { name: 'Audit Logs', path: '/audit-logs', section: 'System', icon: Terminal },
  { name: 'Profile Settings', path: '/profile', section: 'Account', icon: UserSquare2 },
  { name: 'Logout', path: '/logout', section: 'Account', icon: LogOut, isDanger: true }
];

const CommandPalette = () => {
  const { commandPaletteOpen, setCommandPaletteOpen, addToast, setCurrentUserRole } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  
  const paletteRef = useRef(null);
  const inputRef = useRef(null);

  // Monitor keyboard triggers: Ctrl+K / Cmd+K and Esc
  useEffect(() => {
    const handleGlobalKeys = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Focus input on mount
  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  // Filter matching results
  const filtered = navigationItems.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase()) ||
    item.section.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item) => {
    setCommandPaletteOpen(false);
    if (item.path === '/logout') {
      sessionStorage.removeItem('saas_token');
      addToast('warning', 'Logged out successfully. Session cleared.');
      setCurrentUserRole('employee'); // reset role
      navigate('/login');
    } else {
      navigate(item.path);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    }
  };

  const handleBackdropClick = (e) => {
    if (paletteRef.current && !paletteRef.current.contains(e.target)) {
      setCommandPaletteOpen(false);
    }
  };

  return (
    <div className="palette-backdrop animate-fade-in" onClick={handleBackdropClick}>
      <div ref={paletteRef} className="palette-container animate-slide-up">
        <div className="palette-search-wrapper">
          <Search size={18} className="palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            placeholder="Type a command or search page..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <span className="palette-shortcut-hint">ESC</span>
        </div>

        <div className="palette-results">
          {filtered.length > 0 ? (
            filtered.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.path + item.name}
                  className={`palette-item ${index === selectedIndex ? 'active' : ''} ${item.isDanger ? 'item-danger' : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="palette-item-left">
                    <Icon size={16} className="palette-item-icon" />
                    <span className="palette-item-name">{item.name}</span>
                  </div>
                  <span className="palette-item-section">{item.section}</span>
                </div>
              );
            })
          ) : (
            <div className="palette-no-results">No results found for "{query}"</div>
          )}
        </div>
        
        <div className="palette-footer">
          <span>Use <kbd>↑</kbd> <kbd>↓</kbd> to navigate, <kbd>Enter</kbd> to select, and <kbd>Esc</kbd> to close.</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
