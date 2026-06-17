import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, PlusCircle, Ban, Bell, FileText, 
  Download, RefreshCw, Send, CheckCircle2 
} from 'lucide-react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

const QuickActions = ({ addToast, onExport }) => {
  const navigate = useNavigate();

  // Modals state
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Forms
  const [notifForm, setNotifForm] = useState({ title: '', target: 'all', message: '' });
  const [reportForm, setReportForm] = useState({ type: 'usage', format: 'csv', range: 'month' });

  const handleBroadcast = (e) => {
    e.preventDefault();
    if (!notifForm.title || !notifForm.message) {
      addToast('danger', 'Please enter a notification title and message.');
      return;
    }

    addToast('success', `System notification broadcast sent to target: ${notifForm.target.toUpperCase()}`);
    setBroadcastOpen(false);
    setNotifForm({ title: '', target: 'all', message: '' });
  };

  const handleGenerateReport = (e) => {
    e.preventDefault();
    addToast('success', `Compiling ${reportForm.type.toUpperCase()} analytics dataset for the current ${reportForm.range}...`);
    
    setTimeout(() => {
      addToast('success', `${reportForm.type.toUpperCase()} report compiled. Initiating ${reportForm.format.toUpperCase()} download...`);
      setReportOpen(false);
      if (onExport) onExport(reportForm.format, reportForm.type);
    }, 1500);
  };

  return (
    <div className="cc-actions-card">
      <h3 className="section-title">Global Quick Action Dashboard</h3>
      
      <div className="cc-actions-grid">
        <button 
          onClick={() => navigate('/superadmin/companies/create')} 
          className="cc-action-tile purple"
        >
          <PlusCircle size={20} />
          <div className="tile-info">
            <span className="tile-title">Create Company</span>
            <span className="tile-desc">Register new organization profiles</span>
          </div>
        </button>



        <button 
          onClick={() => setBroadcastOpen(true)} 
          className="cc-action-tile amber"
        >
          <Bell size={20} />
          <div className="tile-info">
            <span className="tile-title">Broadcast Notice</span>
            <span className="tile-desc">Send alert notifications system-wide</span>
          </div>
        </button>

        <button 
          onClick={() => setReportOpen(true)} 
          className="cc-action-tile green"
        >
          <FileText size={20} />
          <div className="tile-info">
            <span className="tile-title">Generate Reports</span>
            <span className="tile-desc">Compile billing, usage, and logs</span>
          </div>
        </button>

        <button 
          onClick={() => {
            addToast('success', 'Building platform analytics database index...');
            if (onExport) onExport('csv', 'analytics');
          }} 
          className="cc-action-tile cyan"
        >
          <Download size={20} />
          <div className="tile-info">
            <span className="tile-title">Export Analytics</span>
            <span className="tile-desc">Download complete usage logs in CSV</span>
          </div>
        </button>
      </div>

      {/* ── BROADCAST NOTICE MODAL ── */}
      <Modal
        isOpen={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        title="Broadcast System Notification"
        size="md"
        footer={
          <div className="modal-footer-sa">
            <Button variant="secondary" onClick={() => setBroadcastOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleBroadcast} icon={Send}>Send Broadcast</Button>
          </div>
        }
      >
        <form onSubmit={handleBroadcast} className="modal-form-sa">
          <div className="form-group-sa">
            <label>Announcement Target</label>
            <select value={notifForm.target} onChange={e => setNotifForm(prev => ({ ...prev, target: e.target.value }))}>
              <option value="all">All Platform Users</option>
              <option value="admins">Tenant Administrators Only</option>
              <option value="billing">Primary Billing Contacts</option>
            </select>
          </div>
          <div className="form-group-sa">
            <label>Alert Title</label>
            <input 
              type="text" 
              placeholder="e.g. Scheduled Maintenance Interruption" 
              value={notifForm.title}
              onChange={e => setNotifForm(prev => ({ ...prev, title: e.target.value }))}
              required 
            />
          </div>
          <div className="form-group-sa">
            <label>Message Content</label>
            <textarea 
              placeholder="Enter message details here..." 
              value={notifForm.message}
              onChange={e => setNotifForm(prev => ({ ...prev, message: e.target.value }))}
              style={{ 
                minHeight: '100px', 
                backgroundColor: 'rgba(17, 24, 39, 0.6)', 
                border: '1px solid rgba(255, 255, 255, 0.07)', 
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-white)',
                padding: '10px 14px'
              }}
              required 
            />
          </div>
        </form>
      </Modal>

      {/* ── GENERATE REPORT MODAL ── */}
      <Modal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Compile Platform Report"
        size="md"
        footer={
          <div className="modal-footer-sa">
            <Button variant="secondary" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button variant="success" onClick={handleGenerateReport}>Compile & Download</Button>
          </div>
        }
      >
        <form onSubmit={handleGenerateReport} className="modal-form-sa">
          <div className="form-row">
            <div className="form-group-sa">
              <label>Report Target Dataset</label>
              <select value={reportForm.type} onChange={e => setReportForm(prev => ({ ...prev, type: e.target.value }))}>
                <option value="usage">Resource & Storage Usage</option>
                <option value="billing">MRR / Financial Audit</option>
                <option value="security">Security & Login Incident Logs</option>
                <option value="tenants">Full Tenant Registry Meta</option>
              </select>
            </div>
            <div className="form-group-sa">
              <label>Export Format</label>
              <select value={reportForm.format} onChange={e => setReportForm(prev => ({ ...prev, format: e.target.value }))}>
                <option value="csv">Comma-separated Values (.CSV)</option>
                <option value="excel">Microsoft Excel (.XLSX)</option>
                <option value="pdf">Document Format (.PDF)</option>
              </select>
            </div>
          </div>
          <div className="form-group-sa">
            <label>Analytics Date Filter Range</label>
            <select value={reportForm.range} onChange={e => setReportForm(prev => ({ ...prev, range: e.target.value }))}>
              <option value="week">Past 7 Days</option>
              <option value="month">Current Billing Cycle (Month)</option>
              <option value="quarter">Past Quarter (90 Days)</option>
              <option value="year">Full Fiscal Year</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default QuickActions;
