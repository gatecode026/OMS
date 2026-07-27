import { useState, useMemo, useRef, useEffect } from 'react';
import './EmployeeDetail.css';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp, normalizeEmployee } from '../context/AppContext';
import { decodeEmployeeId } from '../utils/hashId';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import {
  ArrowLeft, Edit2, Trash2, User, Phone, CheckSquare, Download,
  CheckCircle, FileText, Settings, Shield, Mail, MapPin
} from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (str) => {
  if (!str) return '—';
  const d = new Date(str);
  return `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const fmtTime = (t) => t || '—';

const fmtDob = (dateStr) => {
  if (!dateStr) return '15/08/1996';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

const calculateExpiry = (dateStr) => {
  if (!dateStr) return '31 Dec 2031';
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 5);
  return fmtDate(d.toISOString());
};

const renderName = (fullname) => {
  if (!fullname) return '';
  const parts = fullname.trim().split(' ');
  if (parts.length === 1) return <span className="id-name-dark">{parts[0]}</span>;
  return (
    <>
      <span className="id-name-dark">{parts[0]} </span>
      <span className="id-name-accent">{parts.slice(1).join(' ')}</span>
    </>
  );
};

const getBranchAddress = (branchName, branchesList = []) => {
  const name = (branchName || '').toLowerCase().trim();
  const foundBranch = (branchesList || []).find(b => 
    (b.name || '').toLowerCase().trim() === name ||
    (b.id || '').toLowerCase().trim() === name ||
    (b.code || '').toLowerCase().trim() === name ||
    (b.branchCode || '').toLowerCase().trim() === name
  );
  if (foundBranch) {
    const addr = [foundBranch.address, foundBranch.city, foundBranch.state, foundBranch.zipCode].filter(Boolean).join(', ');
    if (addr) return addr;
  }
  return branchName || '—';
};

const TABS = [
  { id: 'personal', label: 'Personal Details', icon: User },
  { id: 'contact', label: 'Contact & Address', icon: Phone },
];

// ── Status Badge helpers ─────────────────────────────────────────────────────
const taskStatusClass = (s) => {
  const m = { 'Done': 'ts-done', 'In Progress': 'ts-inprog', 'To Do': 'ts-todo', 'Overdue': 'ts-overdue', 'In Review': 'ts-review', 'Cancelled': 'ts-cancelled' };
  return m[s] || 'ts-todo';
};
const leaveStatusClass = (s) => ({ 'Approved': 'ls-approved', 'Rejected': 'ls-rejected', 'Pending': 'ls-pending' }[s] || 'ls-pending');
const attDayClass = (s) => {
  if (!s) return '';
  if (s === 'Present') return 'day-present';
  if (s === 'Absent') return 'day-absent';
  if (s === 'Late') return 'day-late';
  if (s === 'Work From Home') return 'day-wfh';
  if (s === 'On Leave' || s === 'Leave' || s.includes('Leave')) return 'day-leave';
  return '';
};

// ── Mini SVG Line Chart ──────────────────────────────────────────────────────
// Unused charting and calendar components removed

const EmployeeDetail = () => {
  const { id: encodedId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { employees, showConfirm, deactivateEmployee, activateEmployee, addToast, updateEmployee, token, branches, generalSettings } = useApp();

  // Decode the obfuscated URL param back to the real employee ID
  const id = encodedId ? decodeEmployeeId(encodedId) : null;

  const [fullEmp, setFullEmp] = useState(null);

  useEffect(() => {
    if (!id || !token) return;
    fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/employees/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(result => {
        if (result.status === 'success' && result.data) {
          setFullEmp(normalizeEmployee(result.data));
        }
      })
      .catch(err => console.error('Failed to fetch full employee details:', err));
  }, [id, token]);

  const empFromContext = useMemo(() => employees.find(e => e.id === id), [employees, id]);
  const emp = fullEmp || empFromContext;

  const activeTab = new URLSearchParams(location.search).get('tab') || 'personal';

  const [showIdCard, setShowIdCard] = useState(false);
  const idCardRef = useRef(null);
  
  if (!empFromContext) return (
    <div className="ed-not-found">
      <p>Employee not found.</p>
      <Button variant="secondary" onClick={() => navigate('/employees')} icon={ArrowLeft}>Back to Directory</Button>
    </div>
  );
  
  const handleDelete = () => {
    showConfirm('Deactivate Employee', `Are you sure you want to deactivate ${emp.name}?`, () => {
      deactivateEmployee(emp.id);
      navigate('/employees');
    }, 'danger');
  };
  
  const handleActivate = () => {
    showConfirm('Activate Employee', `Are you sure you want to activate ${emp.name}?`, () => {
      activateEmployee(emp.id);
    }, 'primary');
  };

  // Leave handlers removed as leaves tab is no longer active

  const downloadIdCard = async () => {
    if (!idCardRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(idCardRef.current, { scale: 3, backgroundColor: null, allowTaint: false, useCORS: true });
      const link = document.createElement('a');
      link.download = `${emp.id}_ID_Card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to download ID card:', err);
      addToast('error', 'Failed to download ID card.');
    }
  };

  return (
    <div className="employee-detail-page">
      {/* ── Header ── */}
      <div className="ed-header-bar">
        <button className="ed-back-btn" onClick={() => navigate('/employees')}>
          <ArrowLeft size={16} /> Back to Directory
        </button>
      </div>

      <div className="card ed-profile-card">
        <div className="ed-profile-left">
          <Avatar name={emp.name} size="xl" src={emp.avatar || emp.photoUrl || ''} />
          <div className="ed-profile-info">
            <h1 className="ed-name">{emp.name}</h1>
            <p className="ed-designation">{emp.designation || emp.role}</p>
            <div className="ed-badges">
              {emp.roleId !== 'manager' && emp.role !== 'Manager' && (
                <span className="preview-dept-badge">{emp.department}</span>
              )}
              <span className="preview-branch-badge">{emp.branch}</span>
              <span className={`acc-badge ${emp.accountStatus === 'Active' ? 'acc-active' : emp.accountStatus === 'Disabled' ? 'acc-disabled' : 'acc-suspended'}`}>
                {emp.accountStatus || 'Active'}
              </span>
            </div>
          </div>
        </div>
        <div className="ed-profile-actions">
          <Button variant="primary" icon={Edit2} onClick={() => navigate(`/employees?edit=${emp.id}`)}>Edit Profile</Button>
          <Button variant="secondary" icon={Settings} onClick={() => navigate('/my-profile')}>Profile Settings</Button>
          <Button variant="secondary" icon={CheckSquare} onClick={() => navigate('/tasks')}>Assign Task</Button>
          <Button variant="secondary" icon={Download} onClick={() => setShowIdCard(true)}>ID Card</Button>
          <Button variant="secondary" icon={FileText} onClick={() => navigate('/work-reports')}>View Reports</Button>
          {emp.status === 'Inactive' ? (
            <Button variant="success" icon={CheckCircle} onClick={handleActivate}>Activate</Button>
          ) : (
            <Button variant="ghost" icon={Trash2} onClick={handleDelete}>Delete</Button>
          )}
        </div>
      </div>

      {/* ── Tab Strip ── */}
      <div className="ed-tabs-strip">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={`ed-tab-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => navigate(`?tab=${tab.id}`, { replace: true })}>
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="card ed-tab-content" style={{ background: 'transparent', border: 'none', padding: 0 }}>

        {/* ── Personal Details Tab ── */}
        {activeTab === 'personal' && (
          <div className="profile-info-cards-container">
            {/* CARD 1: IDENTITY & DEMOGRAPHICS */}
            <div className="info-display-card">
              <div className="info-card-header">
                <div className="info-card-icon-wrap primary">
                  <User size={18} />
                </div>
                <h3>Identity & Demographics</h3>
              </div>
              <div className="info-card-grid">
                {[
                  ['Full Name', `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name],
                  ['Employee ID', emp.id],
                  ['First Name', emp.firstName || emp.name?.split(' ')[0] || '—'],
                  ['Last Name', emp.lastName || emp.name?.split(' ').slice(1).join(' ') || '—'],
                  ['Gender', emp.gender || '—'],
                  ['Marital Status', emp.maritalStatus || '—'],
                  ['Nationality', emp.nationality || '—'],
                ].map(([label, val]) => (
                  <div key={label} className="info-card-item">
                    <span className="info-item-label">{label}</span>
                    <span className="info-item-value">{val || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CARD 2: NATIONAL IDENTITIES */}
            <div className="info-display-card">
              <div className="info-card-header">
                <div className="info-card-icon-wrap warning">
                  <Shield size={18} />
                </div>
                <h3>National Identities</h3>
              </div>
              <div className="info-card-grid">
                <div className="info-card-item">
                  <span className="info-item-label">Aadhaar Number</span>
                  <span className="info-item-value secured-value">
                    {emp.aadhaarNumber || 'Not Provided'}
                  </span>
                </div>
                <div className="info-card-item">
                  <span className="info-item-label">PAN Number</span>
                  <span className="info-item-value secured-value">
                    {emp.panNumber || 'Not Provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 3: EMERGENCY CONTACTS */}
            <div className="info-display-card">
              <div className="info-card-header">
                <div className="info-card-icon-wrap danger">
                  <Phone size={18} />
                </div>
                <h3>Emergency Contacts</h3>
              </div>
              <div className="info-card-grid">
                {[
                  ['Contact Person', emp.emergencyContactName],
                  ['Relationship', emp.emergencyContactRelation],
                  ['Mobile Number', emp.emergencyContactPhone],
                  ['Alternate Mobile', emp.emergencyContactPhoneAlt],
                ].map(([label, val]) => (
                  <div key={label} className="info-card-item">
                    <span className="info-item-label">{label}</span>
                    <span className="info-item-value">{val || '—'}</span>
                  </div>
                ))}
                <div className="info-card-item full-width">
                  <span className="info-item-label">Address</span>
                  <span className="info-item-value">{emp.emergencyContactAddress || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Contact & Address Tab ── */}
        {activeTab === 'contact' && (
          <div className="profile-info-cards-container">
            {/* CARD 1: CONTACT CHANNELS */}
            <div className="info-display-card">
              <div className="info-card-header">
                <div className="info-card-icon-wrap primary">
                  <Mail size={18} />
                </div>
                <h3>Contact Channels</h3>
              </div>
              <div className="info-card-grid">
                {[
                  ['Phone Number', emp.phone],
                  ['Alternate Phone', emp.alternatePhone],
                ].map(([label, val]) => (
                  <div key={label} className="info-card-item">
                    <span className="info-item-label">{label}</span>
                    <span className="info-item-value">{val || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CARD 2: ADDRESS DETAILS */}
            <div className="info-display-card">
              <div className="info-card-header">
                <div className="info-card-icon-wrap warning">
                  <MapPin size={18} />
                </div>
                <h3>Address Details</h3>
              </div>
              <div className="info-card-grid">
                {[
                  ['City', emp.city || (typeof emp.currentAddress === 'object' ? emp.currentAddress?.city : '')],
                  ['State', emp.state || (typeof emp.currentAddress === 'object' ? emp.currentAddress?.state : '')],
                  ['Country', emp.country || (typeof emp.currentAddress === 'object' ? emp.currentAddress?.country : '') || 'India'],
                  ['ZIP / Postal Code', emp.zipCode || (typeof emp.currentAddress === 'object' ? emp.currentAddress?.pincode : '')],
                ].map(([label, val]) => (
                  <div key={label} className="info-card-item">
                    <span className="info-item-label">{label}</span>
                    <span className="info-item-value">{val || '—'}</span>
                  </div>
                ))}
                <div className="info-card-item full-width">
                  <span className="info-item-label">Current Address</span>
                  <span className="info-item-value">{typeof emp.currentAddress === 'object' && emp.currentAddress ? [emp.currentAddress.line1, emp.currentAddress.city, emp.currentAddress.state, emp.currentAddress.country].filter(Boolean).join(', ') + (emp.currentAddress.pincode ? ` - ${emp.currentAddress.pincode}` : '') : (emp.currentAddress || emp.homeAddress || '—')}</span>
                </div>
                <div className="info-card-item full-width">
                  <span className="info-item-label">Permanent Address</span>
                  <span className="info-item-value">{typeof emp.permanentAddress === 'object' && emp.permanentAddress ? [emp.permanentAddress.line1, emp.permanentAddress.city, emp.permanentAddress.state, emp.permanentAddress.country].filter(Boolean).join(', ') + (emp.permanentAddress.pincode ? ` - ${emp.permanentAddress.pincode}` : '') : (emp.permanentAddress || emp.homeAddress || '—')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── ID Card Modal ── */}
      {showIdCard && (() => {
        // Resolve a dynamic authorized signatory name from the employee's reporting manager or branch manager
        let signatoryName = 'Authorized Signatory';
        if (emp.reportingManager) {
          signatoryName = emp.reportingManager;
        } else if (emp.teamLeader && emp.teamLeader !== 'Unassigned') {
          signatoryName = emp.teamLeader;
        } else {
          const empBranch = (emp.branch || '').toLowerCase().trim();
          if (empBranch && branches) {
            const foundBranch = branches.find(b => (b.name || '').toLowerCase().trim() === empBranch);
            if (foundBranch && foundBranch.manager && foundBranch.manager !== 'Not Assigned') {
              signatoryName = foundBranch.manager;
            }
          }
          if (signatoryName === 'Authorized Signatory' && empBranch && employees) {
            const branchManager = employees.find(e => 
              (e.roleId === 'manager' || e.role === 'Manager') &&
              (e.branch || '').toLowerCase().trim() === empBranch
            );
            if (branchManager) signatoryName = branchManager.name;
          }
        }

        return (
          <div className="id-card-overlay" onClick={() => setShowIdCard(false)}>
            <div className="id-card-modal" onClick={e => e.stopPropagation()}>
              <button className="id-card-close" onClick={() => setShowIdCard(false)}>✕</button>
              <div className="id-card-render-wrapper" ref={idCardRef}>
                <div className="id-card-front">
                  <div className="id-card-front-header-bg"></div>
                  <div className="id-card-front-pink-bg"></div>
                  <div className="id-card-watermark"></div>
                  <div className="id-card-badge">OFFICIAL ID</div>
                  <div className="id-card-chip">
                    <svg viewBox="0 0 40 30" width="30" height="22">
                      <rect width="40" height="30" rx="4" fill="#D97706" opacity="0.9" />
                      <rect x="2" y="2" width="36" height="26" rx="3" fill="#F59E0B" />
                      <path d="M2 10 H38 M2 20 H38 M14 2 V28 M26 2 V28" stroke="#B45309" strokeWidth="1.2" />
                      <rect x="14" y="10" width="12" height="10" rx="2" fill="#FEF3C7" opacity="0.85" />
                    </svg>
                  </div>
                  <div className="id-card-logo-area">
                    <svg viewBox="0 0 100 100" width="22" height="22" className="id-card-logo-svg"><polygon points="50,15 85,50 50,85 15,50" fill="none" stroke="#FFFFFF" strokeWidth="8" /><polygon points="50,28 72,50 50,72 28,50" fill="#FFFFFF" /></svg>
                    <div className="id-card-company-title">{emp.companyName || generalSettings?.companyName || 'Corporate Enterprise'}</div>
                    <div className="id-card-company-subtitle">{emp.branch ? (emp.branch.toLowerCase().includes('branch') ? emp.branch : `${emp.branch} Branch`) : (emp.officeLocation || 'Main Headquarters')}</div>
                  </div>
                  <div className="id-card-photo-wrap"><Avatar name={emp.name} size="xl" className="id-card-photo-img" src={emp.avatar || emp.photoUrl} /></div>
                  <div className="id-card-name-area"><h2 className="id-card-emp-name">{renderName(emp.name)}</h2><p className="id-card-emp-role">{emp.designation || emp.role}</p></div>
                  <div className="id-card-details-grid">
                    <div className="id-detail-label">ID NO</div><div className="id-detail-colon">:</div><div className="id-detail-value">{emp.id}</div>
                    {emp.roleId !== 'manager' && (<><div className="id-detail-label">Dept.</div><div className="id-detail-colon">:</div><div className="id-detail-value">{emp.department}</div></>)}
                    <div className="id-detail-label">Deg.</div><div className="id-detail-colon">:</div><div className="id-detail-value">{emp.designation || emp.role}</div>
                  </div>
                </div>
                <div className="id-card-back">
                  <div className="id-card-back-bottom-bg"></div>
                  <div className="id-card-back-pink-bg"></div>
                  <div className="id-card-back-bullets">
                    <div className="id-card-bullet-row"><span className="id-bullet-dot"></span><p>This card is the official property of {emp.companyName || generalSettings?.companyName || 'Corporate Enterprise'} and must be returned on demand.</p></div>
                    <div className="id-card-bullet-row"><span className="id-bullet-dot"></span><p>If found, please return to the HR Department or dynamic branch address below immediately.</p></div>
                    <div className="id-card-bullet-row"><span className="id-bullet-dot"></span><p style={{ fontWeight: 600 }}>Branch Address: {emp.branchAddress || getBranchAddress(emp.branch, branches)}</p></div>
                  </div>
                  <div className="id-card-back-middle">
                    <div className="id-card-back-dates">
                      <div className="id-date-row"><span className="id-date-label">Join Date:</span><span className="id-date-val">{fmtDate(emp.joinDate)}</span></div>
                      <div className="id-date-row"><span className="id-date-label">Expire Date:</span><span className="id-date-val">{emp.contractEndDate ? fmtDate(emp.contractEndDate) : calculateExpiry(emp.joinDate)}</span></div>
                      <div className="id-card-barcode-area">
                        <svg viewBox="0 0 100 20" className="id-card-barcode-svg"><rect x="0" y="0" width="3" height="20" fill="#0f172a" /><rect x="5" y="0" width="1" height="20" fill="#0f172a" /><rect x="8" y="0" width="2" height="20" fill="#0f172a" /><rect x="12" y="0" width="4" height="20" fill="#0f172a" /><rect x="18" y="0" width="1" height="20" fill="#0f172a" /><rect x="21" y="0" width="2" height="20" fill="#0f172a" /><rect x="25" y="0" width="3" height="20" fill="#0f172a" /><rect x="30" y="0" width="1" height="20" fill="#0f172a" /><rect x="33" y="0" width="2" height="20" fill="#0f172a" /><rect x="37" y="0" width="5" height="20" fill="#0f172a" /><rect x="44" y="0" width="1" height="20" fill="#0f172a" /><rect x="47" y="0" width="3" height="20" fill="#0f172a" /><rect x="52" y="0" width="2" height="20" fill="#0f172a" /><rect x="56" y="0" width="4" height="20" fill="#0f172a" /><rect x="62" y="0" width="1" height="20" fill="#0f172a" /><rect x="65" y="0" width="2" height="20" fill="#0f172a" /><rect x="69" y="0" width="3" height="20" fill="#0f172a" /><rect x="74" y="0" width="1" height="20" fill="#0f172a" /><rect x="77" y="0" width="2" height="20" fill="#0f172a" /><rect x="81" y="0" width="5" height="20" fill="#0f172a" /><rect x="88" y="0" width="1" height="20" fill="#0f172a" /><rect x="91" y="0" width="3" height="20" fill="#0f172a" /><rect x="96" y="0" width="2" height="20" fill="#0f172a" /></svg>
                        <div className="id-card-barcode-text">*{emp.id}*</div>
                      </div>
                    </div>
                    <div className="id-card-back-qr">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify({ employeeId: emp.id, companyId: emp.companyId || 'COMP-A' }))}`} alt="QR Code" width="95" height="95" className="id-card-qr-img" style={{ display: 'block', borderRadius: '4px' }} />
                      <span className="id-qr-label">SCAN ME</span>
                    </div>
                  </div>
                  <div className="id-card-back-signature-area">
                    <div className="id-signature-font">{signatoryName}</div>
                    <div className="id-signature-line"></div>
                    <div className="id-signature-label">Authorized Signatory</div>
                  </div>
                </div>
              </div>
              <button className="id-card-download-btn" onClick={downloadIdCard}><Download size={16} /> Download ID Cards</button>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default EmployeeDetail;