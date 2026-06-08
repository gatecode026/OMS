import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Calendar, AlertCircle, FileText } from 'lucide-react';
import Modal from '../common/Modal';
import { useApp } from '../../context/AppContext';

const CompanyUpdates = () => {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [activeTab, setActiveTab] = useState('hr');
  const [selectedUpdate, setSelectedUpdate] = useState(null);

  const updatesData = {
    hr: [
      { id: 'u1', title: 'CEO Townhall Meeting', date: '02 Jun 2026', body: 'The quarterly CEO Townhall meeting is scheduled for June 5th at 3:00 PM IST. Please submit your questions in advance through the portal. Link will be shared via email.', category: 'HR Announcement' },
      { id: 'u2', title: 'Health Insurance Renewals', date: '30 May 2026', body: 'The window for updating family details for health insurance coverage is now open until June 10th. Please make sure to verify all details under the profile documents.', category: 'HR Announcement' }
    ],
    dept: [
      { id: 'u3', title: 'Engineering Coding Standards v2', date: '01 Jun 2026', body: 'We have updated the coding standard guidelines for frontend project repositories. Please review the PR configurations and rules uploaded in the Document Vault.', category: 'Department Notice' },
      { id: 'u4', title: 'Database Maintenance Alert', date: '28 May 2026', body: 'Vite staging database will undergo scheduled maintenance this Saturday between 2:00 AM and 6:00 AM. Staging build access may be intermittent during this time.', category: 'Department Notice' }
    ],
    team: [
      { id: 'u5', title: 'Sprint UI Polishing Sync', date: '03 Jun 2026', body: 'Frontend team will meet today at 4:30 PM to align on design tokens and Custom CSS gradients across dashboard widgets. Participation is mandatory for all UI developers.', category: 'Team Update' }
    ],
    holidays: [
      { id: 'u6', title: 'Upcoming Holiday: Kabir Jayanti', date: '03 Jun 2026', body: 'Please note that our offices will remain closed on June 15th on account of Kabir Jayanti. Have a wonderful long weekend!', category: 'Holiday Notification' }
    ]
  };

  const getTabLabel = (tab) => {
    if (tab === 'hr') return 'HR Announcements';
    if (tab === 'dept') return 'Department Notices';
    if (tab === 'team') return 'Team Updates';
    return 'Holiday Notifications';
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    addToast('info', `Filtered updates by: ${getTabLabel(tab)}`);
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
