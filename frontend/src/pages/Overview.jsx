import React, { useState } from 'react';
import './Overview.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import { Building2, Network, Users, DollarSign, MapPin, Globe2, Clock, CheckCircle } from 'lucide-react';

const mockBranches = [
  {
    id: 'BR-01',
    name: 'Jaipur HQ',
    country: 'India',
    manager: 'Aarav Sharma',
    employeesCount: 45,
    activeProjects: 12,
    timezone: 'IST (UTC+5:30)',
    status: 'Optimal',
    lat: '26.9124° N',
    lng: '75.7873° E',
    address: 'Malviya Nagar, Jaipur, Rajasthan 302017, India',
  },
  {
    id: 'BR-02',
    name: 'London Agency',
    country: 'United Kingdom',
    manager: 'John Doe',
    employeesCount: 28,
    activeProjects: 8,
    timezone: 'GMT (UTC+0)',
    status: 'High Load',
    lat: '51.5074° N',
    lng: '0.1278° W',
    address: '30 St Mary Axe (The Gherkin)',
  },
  {
    id: 'BR-03',
    name: 'Tokyo DevHub',
    country: 'Japan',
    manager: 'Kenji Sato',
    employeesCount: 34,
    activeProjects: 14,
    timezone: 'JST (UTC+9)',
    status: 'Optimal',
    lat: '35.6762° N',
    lng: '139.6503° E',
    address: 'Shibuya Scramble Square, Floor 28',
  },
  {
    id: 'BR-04',
    name: 'Sydney Office',
    country: 'Australia',
    manager: 'Emma Watson',
    employeesCount: 18,
    activeProjects: 5,
    timezone: 'AEST (UTC+10)',
    status: 'Optimal',
    lat: '33.8688° S',
    lng: '151.2093° E',
    address: 'Circular Quay Tower, Level 15',
  },
  {
    id: 'BR-05',
    name: 'Munich Sales',
    country: 'Germany',
    manager: 'Hans Meier',
    employeesCount: 12,
    activeProjects: 4,
    timezone: 'CET (UTC+1)',
    status: 'Optimal',
    lat: '48.1351° N',
    lng: '11.5820° E',
    address: 'Balanstraße 73, Haus 10',
  }
];

const mockDepts = [
  { name: 'Engineering', count: 52, budget: '$1.4M', color: 'var(--color-primary)' },
  { name: 'Product Management', count: 18, budget: '$650K', color: '#10b981' },
  { name: 'Design', count: 15, budget: '$400K', color: '#ec4899' },
  { name: 'Marketing & Sales', count: 25, budget: '$850K', color: '#f59e0b' },
  { name: 'Operations', count: 12, budget: '$300K', color: '#8b5cf6' },
  { name: 'Finance & HR', count: 8, budget: '$200K', color: '#6b7280' },
];

const Overview = () => {
  const { employees, branches, roles } = useApp();
  const [selectedBranch, setSelectedBranch] = useState(mockBranches[0]);
  const loading = usePageLoading();

  if (loading) {
    return (
      <div className="page-loading-wrapper">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const totalHeadcount = employees.length || 130;
  const activeBranches = mockBranches.length;
  const totalDepts = mockDepts.length;

  return (
    <div className="overview-page animate-fade-in">
      {/* Welcome Header */}
      <div className="overview-header">
        <div className="overview-title-section">
          <h1>Company Overview</h1>
          <p className="subtitle">High-level enterprise statistics, branch operations, and department distribution.</p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="overview-stats-grid">
        <StatCard
          title="Total Branches"
          value={activeBranches}
          icon={Building2}
          description="Global operational hubs"
          trend="+1 in last 6 months"
          trendType="success"
        />
        <StatCard
          title="Global Headcount"
          value={totalHeadcount}
          icon={Users}
          description="Active workforce members"
          trend="+8% this quarter"
          trendType="success"
        />
        <StatCard
          title="Total Departments"
          value={totalDepts}
          icon={Network}
          description="Functional business units"
          trend="Fully staffed"
          trendType="info"
        />
        <StatCard
          title="Annual Run Rate (ARR)"
          value="$3.8M"
          icon={DollarSign}
          description="Estimated gross run rate"
          trend="+12% growth"
          trendType="success"
        />
      </div>

      {/* Overview Main Dashboard Split */}
      <div className="overview-main-grid">
        
        {/* Left Side: Department Distribution */}
        <div className="overview-depts card">
          <div className="card-header">
            <h3>Department Breakdown</h3>
            <span className="card-subtitle">Headcount and annual budget allocation</span>
          </div>
          <div className="depts-list">
            {mockDepts.map((dept) => {
              const percentage = Math.round((dept.count / totalHeadcount) * 100);
              return (
                <div key={dept.name} className="dept-progress-item">
                  <div className="dept-progress-info">
                    <span className="dept-name">{dept.name}</span>
                    <span className="dept-metrics">
                      <strong>{dept.count}</strong> employees ({percentage}%) • <strong>{dept.budget}</strong>
                    </span>
                  </div>
                  <div className="dept-progress-bar-wrapper">
                    <div
                      className="dept-progress-bar"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: dept.color,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Interactive Branch Explorer */}
        <div className="overview-branches card">
          <div className="card-header">
            <h3>Global Office Explorer</h3>
            <span className="card-subtitle">Select a branch to view detailed operational metrics</span>
          </div>

          <div className="branches-split">
            {/* Branches Quick Select List */}
            <div className="branches-list-selector">
              {mockBranches.map((b) => {
                const isSelected = selectedBranch.id === b.id;
                return (
                  <button
                    key={b.id}
                    className={`branch-select-row ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedBranch(b)}
                  >
                    <div className="branch-select-main">
                      <MapPin size={16} className="pin-icon" />
                      <span className="branch-select-name">{b.name}</span>
                    </div>
                    <Badge variant={b.status === 'Optimal' ? 'success' : 'warning'}>
                      {b.status}
                    </Badge>
                  </button>
                );
              })}
            </div>

            {/* Selected Branch Detail Panel */}
            <div className="branch-detail-panel">
              <div className="branch-detail-header">
                <div className="branch-title-wrap">
                  <Globe2 size={24} className="globe-icon" />
                  <div>
                    <h4>{selectedBranch.name}</h4>
                    <span className="country-sub">{selectedBranch.country}</span>
                  </div>
                </div>
                <Badge variant={selectedBranch.status === 'Optimal' ? 'success' : 'warning'}>
                  {selectedBranch.status}
                </Badge>
              </div>

              <div className="branch-meta-grid">
                <div className="branch-meta-item">
                  <span className="meta-label">Branch Manager</span>
                  <span className="meta-val">{selectedBranch.manager}</span>
                </div>
                <div className="branch-meta-item">
                  <span className="meta-label">Local Timezone</span>
                  <span className="meta-val flex-center gap-1">
                    <Clock size={12} /> {selectedBranch.timezone}
                  </span>
                </div>
                <div className="branch-meta-item">
                  <span className="meta-label">Active Headcount</span>
                  <span className="meta-val">{selectedBranch.employeesCount} Employees</span>
                </div>
                <div className="branch-meta-item">
                  <span className="meta-label">Running Projects</span>
                  <span className="meta-val">{selectedBranch.activeProjects} Projects</span>
                </div>
                <div className="branch-meta-item span-all">
                  <span className="meta-label">Coordinates</span>
                  <span className="meta-val code-val">
                    {selectedBranch.lat}, {selectedBranch.lng}
                  </span>
                </div>
                <div className="branch-meta-item span-all">
                  <span className="meta-label">Physical Address</span>
                  <span className="meta-val address-val">
                    {selectedBranch.address}
                  </span>
                </div>
              </div>

              <div className="branch-status-box">
                <CheckCircle size={16} className="status-box-icon" />
                <p>
                  Branch is operational with high connectivity. Automated payroll, leave sync, and timesheet reports are fully integrated.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Overview;
