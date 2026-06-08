import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, History } from 'lucide-react';

const LeaveBalanceWidget = ({
  myLeaves = [],
  onOpenLeaveModal
}) => {
  const navigate = useNavigate();

  // Seed defaults as per user requirements
  const leaveData = [
    { type: 'Casual Leave', available: 8, used: 4, remaining: 4 },
    { type: 'Sick Leave', available: 5, used: 2, remaining: 3 },
    { type: 'Earned Leave', available: 12, used: 6, remaining: 6 }
  ];

  // Request statuses count based on user's actual leaves
  const pendingRequests = myLeaves.filter(l => l.status === 'Pending').length;
  const approvedRequests = myLeaves.filter(l => l.status === 'Approved').length;
  const rejectedRequests = myLeaves.filter(l => l.status === 'Rejected').length;

  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3>Leave Balance</h3>
        <button
          onClick={() => navigate('/leaves')}
          className="text-xs text-primary-500 hover:text-primary-400 font-semibold"
        >
          View Leave History
        </button>
      </div>
      <div className="widget-content flex-column gap-4">
        {/* Leave Overview Table */}
        <div className="overflow-x-auto">
          <table className="dash-mini-table">
            <thead>
              <tr className="border-b-border">
                <th style={{ padding: '6px 12px' }}>Leave Type</th>
                <th style={{ padding: '6px 12px' }}>Available</th>
                <th style={{ padding: '6px 12px' }}>Used</th>
                <th style={{ padding: '6px 12px', textAlign: 'right' }}>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {leaveData.map((leave, idx) => (
                <tr key={idx} className="border-b-border">
                  <td style={{ padding: '6px 12px', fontWeight: 600 }}>{leave.type}</td>
                  <td style={{ padding: '6px 12px' }}>{leave.available}</td>
                  <td style={{ padding: '6px 12px' }}>{leave.used}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700 }} className="text-primary-500">
                    {leave.remaining}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Leave Status counts */}
        <div className="summary-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Pending</span>
            <span className="bold-text text-sm block mt-1 text-warning">{pendingRequests}</span>
          </div>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Approved</span>
            <span className="bold-text text-sm block mt-1 text-success">{approvedRequests}</span>
          </div>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Rejected</span>
            <span className="bold-text text-sm block mt-1 text-danger">{rejectedRequests}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex-row gap-3 mt-1 flex-wrap">
          <button
            onClick={onOpenLeaveModal}
            className="flex-1 padding-2 text-xs bold-text bg-primary-500 hover:bg-primary-hover text-white rounded flex-center gap-1 transition-all"
            style={{ border: 'none', cursor: 'pointer', background: 'var(--color-primary)' }}
          >
            <Plus size={14} /> Apply Leave
          </button>
          <button
            onClick={() => navigate('/leaves')}
            className="flex-1 padding-2 text-xs bold-text bg-surface border-border text-primary-500 hover:text-primary-400 rounded flex-center gap-1 transition-all"
            style={{ cursor: 'pointer' }}
          >
            <History size={14} /> Leave History
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveBalanceWidget;
