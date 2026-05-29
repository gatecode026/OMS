import React, { useState } from 'react';
import './Announcements.css';
import { useApp } from '../context/AppContext';
import Badge from '../components/common/Badge';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import {
  Megaphone, Plus, Pin, Globe, Users, Building2, Clock,
  Edit2, Trash2, Eye, ChevronDown
} from 'lucide-react';

const mockAnnouncements = [
  {
    id: 'ANN-001',
    title: 'CEO Townhall – June 5th, 2026',
    body: 'We are excited to invite all team members across all branches to our quarterly CEO Townhall. This will be held on June 5th at 10:00 AM EST via Zoom. The agenda includes Q2 financial results, roadmap updates for H2, and an open Q&A session. Please mark your calendars and prepare your questions!',
    author: 'Sarah Connor',
    authorRole: 'Super Admin',
    date: '2026-05-28',
    priority: 'High',
    pinned: true,
    audience: 'All Company',
    audienceIcon: Globe,
    views: 47,
    tags: ['Townhall', 'Leadership', 'Q2']
  },
  {
    id: 'ANN-002',
    title: 'New Remote Work Policy Effective June 1st',
    body: 'Starting June 1st, 2026, employees may work remotely up to 3 days per week with manager approval. A formal request must be submitted through the Attendance module at least 48 hours in advance. Full-time remote arrangements require separate approval from HR and Branch Admin. Please review the updated Remote Work Policy document in the Document Vault.',
    author: 'Sophia Laurent',
    authorRole: 'HR',
    date: '2026-05-26',
    priority: 'Medium',
    pinned: false,
    audience: 'All Company',
    audienceIcon: Globe,
    views: 38,
    tags: ['Policy', 'Remote Work', 'HR']
  },
  {
    id: 'ANN-003',
    title: 'Engineering Sprint Review – May 30th',
    body: 'The bi-weekly sprint review for the SaaS Platform project is scheduled for May 30th at 2:00 PM GMT. All Engineering team members are required to attend. Please have your demos prepared and your blockers documented in the Task Monitoring board before the session.',
    author: 'Elena Rostova',
    authorRole: 'Team Leader',
    date: '2026-05-25',
    priority: 'Low',
    pinned: false,
    audience: 'Engineering',
    audienceIcon: Building2,
    views: 12,
    tags: ['Engineering', 'Sprint', 'Review']
  },
  {
    id: 'ANN-004',
    title: 'Q2 Sales Targets – Final Push',
    body: 'As we approach the end of Q2, Sales team members are reminded to submit all deal closures by May 31st. Deals submitted after this date will be counted in Q3. The top performer this quarter will receive a bonus recognition at the Townhall. Keep pushing!',
    author: 'Marcus Vance',
    authorRole: 'Team Leader',
    date: '2026-05-24',
    priority: 'High',
    pinned: false,
    audience: 'Sales',
    audienceIcon: Users,
    views: 8,
    tags: ['Sales', 'Q2', 'Targets']
  }
];

const priorityVariant = {
  High: 'danger',
  Medium: 'warning',
  Low: 'neutral'
};

const AnnouncementCard = ({ ann, onView, onDelete, onPin }) => {
  const AudienceIcon = ann.audienceIcon;
  return (
    <div className={`ann-card card animate-fade-in ${ann.pinned ? 'ann-pinned' : ''}`}>
      {ann.pinned && (
        <div className="ann-pin-badge">
          <Pin size={12} />
          <span>Pinned</span>
        </div>
      )}

      <div className="ann-card-header">
        <Badge variant={priorityVariant[ann.priority]}>{ann.priority} Priority</Badge>
        <div className="ann-audience-chip">
          <AudienceIcon size={12} />
          <span>{ann.audience}</span>
        </div>
      </div>

      <h3 className="ann-card-title">{ann.title}</h3>
      <p className="ann-card-preview">{ann.body.substring(0, 140)}...</p>

      <div className="ann-tags">
        {ann.tags.map(t => (
          <span key={t} className="ann-tag">#{t}</span>
        ))}
      </div>

      <div className="ann-card-footer">
        <div className="ann-author">
          <Avatar name={ann.author} size="xs" />
          <div>
            <span className="ann-author-name">{ann.author}</span>
            <span className="ann-date"><Clock size={11} /> {ann.date}</span>
          </div>
        </div>

        <div className="ann-footer-actions">
          <span className="ann-views"><Eye size={12} /> {ann.views}</span>
          <button className="icon-action-btn" onClick={() => onView(ann)}>
            <Eye size={14} />
          </button>
          <button
            className={`icon-action-btn ${ann.pinned ? 'icon-action-active' : ''}`}
            onClick={() => onPin(ann.id)}
            title="Toggle Pin"
          >
            <Pin size={14} />
          </button>
          <button
            className="icon-action-btn icon-action-danger"
            onClick={() => onDelete(ann.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

const Announcements = () => {
  const { addToast, showConfirm } = useApp();
  const [announcements, setAnnouncements] = useState(mockAnnouncements);
  const [viewAnn, setViewAnn] = useState(null);
  const [filter, setFilter] = useState('All');

  const handleDelete = (id) => {
    const ann = announcements.find(a => a.id === id);
    showConfirm(
      'Delete Announcement',
      `Delete "${ann?.title}"? This cannot be undone.`,
      () => {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
        addToast('warning', 'Announcement deleted.');
      },
      'danger'
    );
  };

  const handlePin = (id) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a));
    addToast('success', 'Announcement pin status updated.');
  };

  const filtered = filter === 'All'
    ? announcements
    : filter === 'Pinned'
    ? announcements.filter(a => a.pinned)
    : announcements.filter(a => a.priority === filter);

  return (
    <div className="announcements-page">

      {/* Header */}
      <div className="ann-page-header card">
        <div className="ann-header-content">
          <div className="ann-header-icon">
            <Megaphone size={22} />
          </div>
          <div>
            <h2 className="ann-page-title">Announcements</h2>
            <p className="ann-page-sub">
              {announcements.length} active announcements • {announcements.filter(a => a.pinned).length} pinned
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => addToast('info', 'Announcement creator coming soon!')}
        >
          New Announcement
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="ann-filter-bar card">
        {['All', 'Pinned', 'High', 'Medium', 'Low'].map(f => (
          <button
            key={f}
            className={`notif-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Announcement Cards */}
      <div className="ann-grid">
        {filtered.length > 0 ? filtered.map(ann => (
          <AnnouncementCard
            key={ann.id}
            ann={ann}
            onView={setViewAnn}
            onDelete={handleDelete}
            onPin={handlePin}
          />
        )) : (
          <div className="card ann-empty">
            <Megaphone size={48} className="text-muted" style={{ opacity: 0.3 }} />
            <h3>No Announcements</h3>
            <p>No announcements match your current filter.</p>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewAnn && (
        <Modal isOpen={!!viewAnn} onClose={() => setViewAnn(null)} title={viewAnn.title} size="md">
          <div className="ann-modal-body">
            <div className="ann-modal-meta">
              <Badge variant={priorityVariant[viewAnn.priority]}>{viewAnn.priority} Priority</Badge>
              <div className="ann-audience-chip">
                <viewAnn.audienceIcon size={12} />
                <span>{viewAnn.audience}</span>
              </div>
            </div>
            <p className="ann-modal-body-text">{viewAnn.body}</p>
            <div className="ann-tags">
              {viewAnn.tags.map(t => <span key={t} className="ann-tag">#{t}</span>)}
            </div>
            <div className="ann-modal-footer">
              <div className="ann-author">
                <Avatar name={viewAnn.author} size="sm" />
                <div>
                  <span className="ann-author-name">{viewAnn.author}</span>
                  <span className="ann-date">{viewAnn.authorRole} • {viewAnn.date}</span>
                </div>
              </div>
              <span className="ann-views"><Eye size={12} /> {viewAnn.views} views</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Announcements;
