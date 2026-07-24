import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import CompanyDashboard from './CompanyDashboard';
import EmployeeDashboard from './EmployeeDashboard';

const Dashboard = () => {
  const { currentUserRole, currentUser, hasPermission } = useApp();
  const isLoading = usePageLoading(600);
  const location = useLocation();

  const hasCompany = useMemo(() => hasPermission('dashboard', 'read', 'company'), [hasPermission]);
  const hasSelf = useMemo(() => hasPermission('dashboard', 'read', 'self'), [hasPermission]);

  const isCompanyLevel = useMemo(() => {
    const roleStr = (currentUserRole || '').toLowerCase();
    return ['super_admin', 'company_admin', 'superadmin', 'companyadmin'].includes(roleStr);
  }, [currentUserRole]);

  const companyLabel = isCompanyLevel ? 'Company Info' : 'Branch Info';

  const [perspective, setPerspective] = useState(() => {
    if (currentUserRole === 'employee') return 'self';
    
    if (hasSelf && !hasCompany) return 'self';
    if (hasCompany && !hasSelf) return 'company';
    
    const saved = localStorage.getItem('perspective_dashboard');
    if (saved === 'self' && hasSelf) return 'self';
    if (saved === 'company' && hasCompany) return 'company';
    
    return hasCompany ? 'company' : 'self';
  });

  useEffect(() => {
    if (currentUserRole === 'employee') {
      setPerspective('self');
      return;
    }
    if (hasSelf && !hasCompany) {
      setPerspective('self');
      return;
    }
    if (hasCompany && !hasSelf) {
      setPerspective('company');
      return;
    }
    const saved = localStorage.getItem('perspective_dashboard');
    if (saved === 'self' && hasSelf) {
      setPerspective('self');
    } else if (saved === 'company' && hasCompany) {
      setPerspective('company');
    }
  }, [hasCompany, hasSelf, currentUserRole]);

  const showPerspectiveDropdown = useMemo(() => {
    if (currentUserRole === 'employee') return false;
    return hasCompany && hasSelf;
  }, [currentUserRole, hasCompany, hasSelf]);

  const handlePerspectiveChange = (val) => {
    setPerspective(val);
    if (currentUserRole !== 'employee') {
      localStorage.setItem('perspective_dashboard', val);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-page grid-gap" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {showPerspectiveDropdown && (
        <div 
          className="flex-row justify-end align-center w-full mb-3"
          style={{
            padding: '12px 24px',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>View Mode:</span>
          <select
            value={perspective}
            onChange={(e) => handlePerspectiveChange(e.target.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              outline: 'none',
              transition: 'all 0.2s'
            }}
          >
            <option value="self">Self Info</option>
            <option value="company">{companyLabel}</option>
          </select>
        </div>
      )}

      {perspective === 'self' ? <EmployeeDashboard /> : <CompanyDashboard />}
    </div>
  );
};

export default Dashboard;
