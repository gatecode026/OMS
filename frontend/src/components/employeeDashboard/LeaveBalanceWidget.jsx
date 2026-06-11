import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, History } from 'lucide-react';

const LeaveBalanceWidget = ({
  myLeaves = [],
  currentUser = {},
  onOpenLeaveModal
}) => {
  const navigate = useNavigate();

  // Calculate used days per leave type from approved requests
  const getUsedDays = (typeKeys) => {
    return myLeaves
      .filter(l => l.status === 'Approved' && typeKeys.includes(l.type))
      .reduce((sum, l) => sum + (Number(l.days) || 0), 0);
  };

  const clUsed = getUsedDays(['Casual Leave', 'CL']);
  const slUsed = getUsedDays(['Sick Leave', 'SL']);
  const elUsed = getUsedDays(['Earned Leave', 'PL', 'Paid Leave', 'Annual Leave']);

  // Fetch balances from database or default to DB/policy schemas
  const clAvailable = currentUser.clBalance !== undefined ? currentUser.clBalance : 8;
  const slAvailable = currentUser.slBalance !== undefined ? currentUser.slBalance : 12;
  const elAvailable = currentUser.plBalance !== undefined ? currentUser.plBalance : 15;

  const clRemaining = Math.max(0, clAvailable - clUsed);
  const slRemaining = Math.max(0, slAvailable - slUsed);
  const elRemaining = Math.max(0, elAvailable - elUsed);

  const leaveData = [
    { type: 'Casual Leave', available: clAvailable, used: clUsed, remaining: clRemaining },
    { type: 'Sick Leave', available: slAvailable, used: slUsed, remaining: slRemaining },
    { type: 'Earned Leave', available: elAvailable, used: elUsed, remaining: elRemaining }
  ];

  // Request statuses count based on user's actual leaves
  const pendingRequests = myLeaves.filter(l => l.status === 'Pending').length;
  const approvedRequests = myLeaves.filter(l => l.status === 'Approved').length;
  const rejectedRequests = myLeaves.filter(l => l.status === 'Rejected').length;

  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>Leave Balance</h3>
        <button
          onClick={() => navigate('/leaves')}
          style={{ 
            fontSize: '0.75rem', 
            color: 'var(--color-primary, #d946ef)', 
            fontWeight: '600',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
        >
          View History
        </button>
      </div>

      <div className="widget-content flex-column gap-4">
        {/* Leave Overview Table */}
        <div className="overflow-x-auto">
          <table className="dash-mini-table">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))' }}>
                <th style={{ padding: '8px 10px', fontSize: '0.72rem' }}>Leave Type</th>
                <th style={{ padding: '8px 10px', fontSize: '0.72rem', textAlign: 'center' }}>Available</th>
                <th style={{ padding: '8px 10px', fontSize: '0.72rem', textAlign: 'center' }}>Used</th>
                <th style={{ padding: '8px 10px', fontSize: '0.72rem', textAlign: 'right' }}>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {leaveData.map((leave, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.05))' }}>
                  <td style={{ padding: '10px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>{leave.type}</td>
                  <td style={{ padding: '10px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>{leave.available}</td>
                  <td style={{ padding: '10px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>{leave.used}</td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700 }} className="text-primary-500">
                    {leave.remaining}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Leave Status counts with tinted cards */}
        <div className="summary-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '4px' }}>
          <div className="mini-stat-card" style={{ 
            background: 'rgba(245, 158, 11, 0.04)', 
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 8px',
            borderRadius: '8px',
            border: '1px solid var(--color-warning-light, rgba(245, 158, 11, 0.15))'
          }}>
            <span className="text-xs text-text-muted block font-semibold" style={{ fontSize: '0.72rem' }}>Pending</span>
            <span className="bold-text text-sm block mt-1 text-warning" style={{ fontSize: '1.1rem', fontWeight: '700' }}>{pendingRequests}</span>
          </div>

          <div className="mini-stat-card" style={{ 
            background: 'rgba(16, 185, 129, 0.04)', 
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 8px',
            borderRadius: '8px',
            border: '1px solid var(--color-success-light, rgba(16, 185, 129, 0.15))'
          }}>
            <span className="text-xs text-text-muted block font-semibold" style={{ fontSize: '0.72rem' }}>Approved</span>
            <span className="bold-text text-sm block mt-1 text-success" style={{ fontSize: '1.1rem', fontWeight: '700' }}>{approvedRequests}</span>
          </div>

          <div className="mini-stat-card" style={{ 
            background: 'rgba(239, 68, 68, 0.04)', 
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 8px',
            borderRadius: '8px',
            border: '1px solid var(--color-danger-light, rgba(239, 68, 68, 0.15))'
          }}>
            <span className="text-xs text-text-muted block font-semibold" style={{ fontSize: '0.72rem' }}>Rejected</span>
            <span className="bold-text text-sm block mt-1 text-danger" style={{ fontSize: '1.1rem', fontWeight: '700' }}>{rejectedRequests}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex-row gap-3 mt-1 flex-wrap">
          <button
            onClick={onOpenLeaveModal}
            className="flex-1 padding-2 text-xs bold-text rounded flex-center gap-2 transition-all"
            style={{ 
              border: 'none', 
              cursor: 'pointer', 
              background: 'var(--color-primary, #d946ef)', 
              color: '#ffffff',
              fontWeight: '700',
              padding: '10px 14px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-primary-hover, #e879f9)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-primary, #d946ef)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <Plus size={14} /> Apply Leave
          </button>
          <button
            onClick={() => navigate('/leaves')}
            className="flex-1 padding-2 text-xs bold-text rounded flex-center gap-2 transition-all"
            style={{ 
              cursor: 'pointer',
              background: 'var(--bg-elevated, rgba(255, 255, 255, 0.02))',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
              color: 'var(--text-primary)',
              fontWeight: '600',
              padding: '10px 14px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = 'var(--color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-elevated, rgba(255, 255, 255, 0.02))';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
          >
            <History size={14} /> Leave History
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveBalanceWidget;
