import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, CheckSquare, Briefcase, FileText, Bell, FolderClosed } from 'lucide-react';

const GlobalSearch = ({
  isOpen,
  onClose,
  tasks = [],
  projects = [],
  reports = [],
  notifications = [],
  currentUser = {}
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const modalRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  // Real-time search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    const matches = [];

    // 1. Search Tasks
    tasks.forEach(t => {
      if (t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q) || (t.project || '').toLowerCase().includes(q)) {
        matches.push({
          id: t.id,
          category: 'Tasks',
          title: t.title,
          sub: `Project: ${t.project} | Status: ${t.status}`,
          icon: CheckSquare,
          path: '/tasks'
        });
      }
    });

    // 2. Search Projects
    projects.forEach(p => {
      if (p.name.toLowerCase().includes(q)) {
        matches.push({
          id: p.id,
          category: 'Projects',
          title: p.name,
          sub: `Status: ${p.status} | Dept: ${p.department}`,
          icon: Briefcase,
          path: '/projects'
        });
      }
    });

    // 3. Search Reports
    reports.forEach(r => {
      if (r.date.includes(q) || (r.summary || '').toLowerCase().includes(q)) {
        matches.push({
          id: r.id,
          category: 'Reports',
          title: `Work Report: ${r.date}`,
          sub: `Status: ${r.status} | Summary: ${r.summary}`,
          icon: FileText,
          path: '/work-reports'
        });
      }
    });

    // 4. Search Notifications
    notifications.forEach(n => {
      if (n.message.toLowerCase().includes(q)) {
        matches.push({
          id: n.id,
          category: 'Notifications',
          title: n.message,
          sub: n.timestamp,
          icon: Bell,
          path: '/notifications'
        });
      }
    });

    // 5. Search Documents
    if (currentUser.documents) {
      currentUser.documents.forEach(d => {
        if (d.fileName.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)) {
          matches.push({
            id: d.id,
            category: 'Documents',
            title: d.fileName,
            sub: `Category: ${d.category} | Type: ${d.fileType}`,
            icon: FolderClosed,
            path: '/documents'
          });
        }
      });
    }

    setResults(matches);
  }, [query, tasks, projects, reports, notifications, currentUser]);

  if (!isOpen) return null;

  const handleItemClick = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="search-overlay animate-fade-in">
      <div className="search-modal" ref={modalRef}>
        {/* Search Input */}
        <div className="search-input-container">
          <Search className="text-text-muted" size={20} />
          <input
            type="text"
            className="search-field"
            placeholder="Search tasks, projects, reports, docs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X className="text-text-muted hover:text-white transition-all" size={20} />
          </button>
        </div>

        {/* Search Results */}
        <div className="search-results">
          {results.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="search-result-item"
                onClick={() => handleItemClick(item.path)}
              >
                <div className="flex-row align-center gap-2">
                  <Icon size={16} className="text-primary-500" />
                  <span className="bold-text text-sm" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                  <span className="text-xs uppercase px-2 py-0.5 rounded bg-surface border-border font-semibold text-text-muted">
                    {item.category}
                  </span>
                </div>
                <span className="text-xs text-text-muted mt-1" style={{ paddingLeft: '24px' }}>{item.sub}</span>
              </div>
            );
          })}
          {query && results.length === 0 && (
            <div className="text-center text-text-muted py-6">No matching results found</div>
          )}
          {!query && (
            <div className="text-center text-text-muted py-6">Type to search the workspace...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
