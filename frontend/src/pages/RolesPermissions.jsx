import React, { useState } from 'react';
import './RolesPermissions.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Skeleton from '../components/common/Skeleton';
import { Key, ShieldCheck, Save, Users } from 'lucide-react';

const RolesPermissions = () => {
  const isLoading = usePageLoading(600);
  const { roles, updatePermissions } = useApp();

  const [selectedRoleId, setSelectedRoleId] = useState('super_admin');
  
  // Working local permission state to allow modifying and saving
  const [localPermissions, setLocalPermissions] = useState(null);
  const [activeRoleObj, setActiveRoleObj] = useState(null);

  // Sync state when role changes or on initial load
  React.useEffect(() => {
    const roleObj = roles.find(r => r.id === selectedRoleId);
    if (roleObj) {
      // Create deep clone of permissions to prevent direct mutation
      setLocalPermissions(JSON.parse(JSON.stringify(roleObj.permissions)));
      setActiveRoleObj(roleObj);
    }
  }, [selectedRoleId, roles]);

  const handleCheckboxToggle = (module, operation) => {
    if (selectedRoleId === 'super_admin') return; // Super admin has locked full access

    setLocalPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [operation]: !prev[module][operation]
      }
    }));
  };

  const handleSave = () => {
    updatePermissions(selectedRoleId, localPermissions);
  };

  const modules = [
    { key: 'dashboard', label: 'Dashboard Overview' },
    { key: 'employees', label: 'Employee Profiles' },
    { key: 'attendance', label: 'Attendance Records' },
    { key: 'leaves', label: 'Leave Approvals' },
    { key: 'tasks', label: 'Kanban Tasks' },
    { key: 'payroll', label: 'Payroll & Disbursal' },
    { key: 'permissions', label: 'Role Management' },
    { key: 'settings', label: 'System Settings' }
  ];

  const operations = [
    { key: 'create', label: 'Create' },
    { key: 'read', label: 'Read' },
    { key: 'update', label: 'Update' },
    { key: 'delete', label: 'Delete' }
  ];

  if (isLoading || !localPermissions) {
    return (
      <div className="permissions-page grid-gap">
        <div className="card" style={{ height: '80px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="permissions-split-grid">
          <div className="card" style={{ height: '360px' }}><Skeleton variant="rect" height="100%" /></div>
          <div className="card" style={{ height: '360px' }}><Skeleton variant="rect" height="100%" /></div>
        </div>
      </div>
    );
  }

  const isSuperAdmin = selectedRoleId === 'super_admin';

  return (
    <div className="permissions-page flex-column grid-gap">
      
      {/* Title */}
      <div className="page-header-row">
        <div>
          <h2>System User Access & Roles</h2>
          <p className="page-desc-text">Configure module access controls and operations for different user groups</p>
        </div>
      </div>

      {/* Grid split */}
      <div className="permissions-split-grid">
        
        {/* Left Side: Role List Cards */}
        <div className="roles-list-column">
          <h3 className="section-column-title">System Roles</h3>
          <div className="roles-scroll-container">
            {roles.map((role) => {
              const isActive = role.id === selectedRoleId;
              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`role-select-card card ${isActive ? 'active-role-card' : ''}`}
                  style={{ borderLeft: `4px solid ${role.accentColor}` }}
                >
                  <div className="role-card-header">
                    <h4 className="role-name">{role.name}</h4>
                    <Badge variant={role.id === 'super_admin' ? 'purple' : 'neutral'}>
                      {role.id.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="role-desc">{role.description}</p>
                  
                  <div className="role-user-count">
                    <Users size={14} />
                    <span>{role.userCount} active users</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Matrix Permissions Checkboxes */}
        <div className="matrix-column card">
          <div className="matrix-header-row">
            <div>
              <h3 className="card-title">{activeRoleObj?.name} Permission Matrix</h3>
              <p className="chart-subtitle">
                {isSuperAdmin 
                  ? 'Locked: Super Admin permissions are permanent and cannot be modified.' 
                  : 'Toggle checkboxes below to instantly update permissions for this role.'}
              </p>
            </div>
            
            {!isSuperAdmin && (
              <Button variant="primary" onClick={handleSave} icon={Save}>
                Save Changes
              </Button>
            )}
          </div>

          <div className="matrix-table-wrapper table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Application Module</th>
                  {operations.map(op => (
                    <th key={op.key} className="text-center">{op.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map(mod => (
                  <tr key={mod.key}>
                    <td className="bold-text">{mod.label}</td>
                    {operations.map(op => {
                      const isChecked = localPermissions[mod.key]?.[op.key];
                      return (
                        <td key={op.key} className="text-center">
                          <label className="checkbox-switch-container">
                            <input
                              type="checkbox"
                              checked={!!isChecked}
                              onChange={() => handleCheckboxToggle(mod.key, op.key)}
                              disabled={isSuperAdmin}
                              className="matrix-checkbox"
                            />
                            <span className="checkbox-visual"></span>
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {!isSuperAdmin && (
            <div className="matrix-footer-actions">
              <span className="text-muted text-xs">Unsaved changes will be lost if you select another role.</span>
              <Button variant="primary" onClick={handleSave} icon={Save}>
                Save Permissions
              </Button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default RolesPermissions;
