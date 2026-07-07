import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Calendar, AlertCircle, FileText } from 'lucide-react';
import Modal from '../common/Modal';
import { useApp } from '../../context/AppContext';

const CompanyUpdates = () => {
  const navigate = useNavigate();
  const { addToast, announcementsList = [], holidaysList = [], currentUser } = useApp();
  const [activeTab, setActiveTab] = useState('hr');
  const [selectedUpdate, setSelectedUpdate] = useState(null);

  // Filter announcements for the current employee
  const publishedAnnouncements = announcementsList.filter(ann => {
    if (ann.status !== 'Published') return false;

    if (ann.audienceType === 'All') return true;

    if (currentUser) {
      if (ann.audienceType === 'Department') {
        return ann.targetAudience === currentUser.department;
      }
      if (ann.audienceType === 'Branch') {
        return ann.targetAudience === currentUser.branch;
      }
    }

    return false;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Map to categorized updates
  const hrUpdates = publishedAnnouncements
    .filter(ann => (ann.category === 'HR' || ann.category === 'Company' || ann.category === 'Emergency') && ann.audienceType !== 'Department')
    .map(ann => ({
      id: ann.id,
      title: ann.title,
      date: formatDate(ann.publishDate),
      body: ann.description,
      category: 'HR Announcement'
    }));

  const deptUpdates = publishedAnnouncements
    .filter(ann => ann.audienceType === 'Department' && currentUser && ann.targetAudience === currentUser.department)
    .map(ann => ({
      id: ann.id,
      title: ann.title,
      date: formatDate(ann.publishDate),
      body: ann.description,
      category: 'Department Notice'
    }));

  const teamUpdates = publishedAnnouncements
    .filter(ann => (ann.category === 'Project' || ann.category === 'Event') && ann.audienceType !== 'Department')
    .map(ann => ({
      id: ann.id,
      title: ann.title,
      date: formatDate(ann.publishDate),
      body: ann.description,
      category: 'Team Update'
    }));

  const holidayUpdates = (holidaysList || []).map(h => ({
    id: h.id || h._id,
    title: `Upcoming Holiday: ${h.name}`,
    date: formatDate(h.date),
    body: h.description || `Enjoy your ${h.name} holiday!`,
    category: 'Holiday Notification'
  }));

  const updatesData = {
    hr: hrUpdates,
    dept: deptUpdates,
    team: teamUpdates,
    holidays: holidayUpdates
  };

  const getTabLabel = (tab) => {
    if (tab === 'hr') return 'HR Announcements';
    if (tab === 'dept') return 'Department Notices';
    if (tab === 'team') return 'Team Updates';
    return 'Holiday Notifications';
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const currentList = updatesData[activeTab] || [];

  return (
    <div className="dashboard-widget flex-1">
      <div className="widget-header">
        <h3>Company Updates</h3>
        <button
          onClick={() => navigate('/announcements')}
          className="text-xs text-primary-500 hover:text-primary-400 font-semibold"
        >
          View All
        </button>
      </div>
      <div className="widget-content flex-column gap-3">
        {/* Tabs */}
        <div className="flex-row gap-2 flex-wrap pb-2 border-b border-border">
          {['hr', 'dept', 'team', 'holidays'].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`notif-filter-btn ${activeTab === tab ? 'active' : ''}`}
              style={{ fontSize: '0.72rem', padding: '4px 8px' }}
            >
              {getTabLabel(tab)}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-column">
          {currentList.map((item) => (
            <div
              key={item.id}
              className="flex-column py-3 border-b border-border"
              style={{ borderBottom: '1px solid var(--border-color)' }}
            >
              <div className="flex-row justify-between align-center">
                <span className="bold-text text-sm" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                <span className="text-xs text-text-muted">{item.date}</span>
              </div>
              <p className="text-xs text-text-muted mt-2" style={{ lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {item.body}
              </p>
              <button
                onClick={() => setSelectedUpdate(item)}
                className="text-xs text-primary-500 hover:text-primary-400 font-semibold mt-2 align-self-start"
                style={{ textAlign: 'left', cursor: 'pointer' }}
              >
                Read more
              </button>
            </div>
          ))}

          {currentList.length === 0 && (
            <div className="text-center text-text-muted py-6">No updates logged.</div>
          )}
        </div>
      </div>

      {/* Modal for Read More */}
      {selectedUpdate && (
        <Modal
          isOpen={!!selectedUpdate}
          onClose={() => setSelectedUpdate(null)}
          title={selectedUpdate.category}
        >
          <div className="flex-column gap-3 padding-3">
            <h3 className="bold-text text-lg">{selectedUpdate.title}</h3>
            <span className="text-xs text-text-muted">{selectedUpdate.date}</span>
            <p className="text-sm mt-2" style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
              {selectedUpdate.body}
            </p>
            <div className="flex-row justify-end mt-4">
              <button
                onClick={() => setSelectedUpdate(null)}
                className="padding-2 text-xs bold-text bg-surface border-border rounded px-4 transition-all"
                style={{ cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CompanyUpdates;
