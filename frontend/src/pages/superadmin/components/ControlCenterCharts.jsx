import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, LineChart, Line, AreaChart, Area, 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { Shield, ShieldAlert, Ban, EyeOff } from 'lucide-react';

const ChartCard = ({ title, children, className = '' }) => (
  <div className={`cc-chart-card ${className}`}>
    <h4 className="cc-chart-title">{title}</h4>
    <div className="cc-chart-body">
      {children}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-title">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="tooltip-item">
            <span className="tooltip-dot" style={{ backgroundColor: entry.stroke || entry.fill || '#fff' }} />
            <span>{entry.name}:</span>
            <span className="tooltip-value">
              {typeof entry.value === 'number' && entry.name.toLowerCase().includes('revenue') || entry.name.toLowerCase().includes('mrr')
                ? `$${entry.value.toLocaleString()}`
                : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const ControlCenterCharts = ({ stats = [], realTimeLoad = [], securityStats = {} }) => {
  // ── A. Tenant Growth Data ──
  const tenantGrowthData = [
    { name: 'Jan', registrations: 1, activeTenants: 1 },
    { name: 'Feb', registrations: 2, activeTenants: 3 },
    { name: 'Mar', registrations: 1, activeTenants: 4 },
    { name: 'Apr', registrations: 3, activeTenants: 7 },
    { name: 'May', registrations: 2, activeTenants: 9 },
    { name: 'Jun', registrations: stats.length || 10, activeTenants: stats.filter(c => c.status === 'Active').length || 8 },
  ];

  // ── B. Revenue Analytics Data ──
  const revenueData = [
    { name: 'Jan', mrr: 1200, arr: 14400, subscription: 1000, churn: 50 },
    { name: 'Feb', mrr: 2100, arr: 25200, subscription: 1800, churn: 100 },
    { name: 'Mar', mrr: 3400, arr: 40800, subscription: 3000, churn: 80 },
    { name: 'Apr', mrr: 4500, arr: 54000, subscription: 4200, churn: 120 },
    { name: 'May', mrr: 5800, arr: 69600, subscription: 5400, churn: 150 },
    { name: 'Jun', mrr: (stats.filter(c => c.status === 'Active').length * 250) + 1200, arr: ((stats.filter(c => c.status === 'Active').length * 250) + 1200) * 12, subscription: (stats.filter(c => c.status === 'Active').length * 250) + 900, churn: 90 },
  ];

  // ── C. User Activity Data ──
  const userActivityData = [
    { name: 'Mon', dau: 120, wau: 450, mau: 1200 },
    { name: 'Tue', dau: 145, wau: 480, mau: 1210 },
    { name: 'Wed', dau: 185, wau: 510, mau: 1230 },
    { name: 'Thu', dau: 160, wau: 490, mau: 1220 },
    { name: 'Fri', dau: 195, wau: 540, mau: 1250 },
    { name: 'Sat', dau: 90, wau: 410, mau: 1240 },
    { name: 'Sun', dau: 85, wau: 390, mau: 1240 },
  ];

  // ── D. Tenant Usage Comparison Data ──
  const tenantUsageData = useMemo(() => {
    return stats.map(c => {
      const activePercent = c.totalEmployees > 0 ? (c.activeEmployeesCount / c.totalEmployees) * 100 : 0;
      const taskCompletion = c.totalTasks > 0 ? (c.completedTasksCount / c.totalTasks) * 100 : 0;
      const score = Math.round((activePercent * 0.4) + (taskCompletion * 0.4) + (Math.min(100, c.storageUsedMB * 5) * 0.2));
      
      return {
        name: c.name,
        employees: c.totalEmployees || 0,
        tasks: c.totalTasks || 0,
        storage: parseFloat((c.storageUsedMB || 0).toFixed(1)),
        score: Math.max(10, score || 25)
      };
    }).sort((a, b) => b.score - a.score).slice(0, 5);
  }, [stats]);

  // ── E. Subscription Distribution Data ──
  const subDistributionData = useMemo(() => {
    const counts = { Basic: 0, Pro: 0, Enterprise: 0, Trial: 0 };
    stats.forEach(c => {
      if (c.plan === 'Basic' || c.plan === 'BASIC') counts.Basic += 1;
      else if (c.plan === 'Premium' || c.plan === 'PRO') counts.Pro += 1;
      else if (c.plan === 'Enterprise' || c.plan === 'ENTERPRISE') counts.Enterprise += 1;
      
      if (c.status === 'Pending') counts.Trial += 1;
    });

    // Fallbacks if stats empty
    if (stats.length === 0) {
      return [
        { name: 'Basic Plan', value: 4 },
        { name: 'Pro Plan', value: 3 },
        { name: 'Enterprise Plan', value: 2 },
        { name: 'Trial Users', value: 1 }
      ];
    }

    return [
      { name: 'Basic Plan', value: counts.Basic || 1 },
      { name: 'Pro Plan', value: counts.Pro || 1 },
      { name: 'Enterprise Plan', value: counts.Enterprise || 1 },
      { name: 'Trial Users', value: counts.Trial || 0 }
    ].filter(item => item.value > 0);
  }, [stats]);

  const PIE_COLORS = ['#3b82f6', '#ec4899', '#a855f7', '#fbbf24'];

  // ── G. Storage Consumption Data ──
  const storageConsumingTenants = useMemo(() => {
    return stats.map(c => ({
      name: c.name,
      storage: parseFloat((c.storageUsedMB || 12.5).toFixed(1))
    })).sort((a, b) => b.storage - a.storage).slice(0, 6);
  }, [stats]);

  // ── H. Security Analytics Data ──
  const securityIncidentData = securityStats.chartData && securityStats.chartData.length > 0
    ? securityStats.chartData
    : [
        { name: '08:00', failedLogins: 2, suspiciousActivity: 0, incidents: 0 },
        { name: '10:00', failedLogins: 5, suspiciousActivity: 1, incidents: 0 },
        { name: '12:00', failedLogins: 12, suspiciousActivity: 3, incidents: 1 },
        { name: '14:00', failedLogins: 4, suspiciousActivity: 0, incidents: 0 },
        { name: '16:00', failedLogins: 8, suspiciousActivity: 2, incidents: 0 },
        { name: '18:00', failedLogins: 3, suspiciousActivity: 0, incidents: 0 },
      ];

  return (
    <div className="cc-charts-grid">
      {/* A. Tenant Growth Analytics */}
      <ChartCard title="Tenant Growth Analytics">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={tenantGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Line name="Registrations" type="monotone" dataKey="registrations" stroke="#ec4899" strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} />
            <Line name="Active Tenants" type="monotone" dataKey="activeTenants" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* B. Revenue Analytics */}
      <ChartCard title="Revenue Analytics ($ MRR & ARR)">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMRR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Area name="Monthly Revenue (MRR)" type="monotone" dataKey="mrr" stroke="#10b981" fillOpacity={1} fill="url(#colorMRR)" strokeWidth={2} />
            <Line name="Churn Loss" type="monotone" dataKey="churn" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* C. User Activity Analytics */}
      <ChartCard title="User Activity Analytics (DAU / WAU / MAU)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={userActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Line name="Daily Active (DAU)" type="monotone" dataKey="dau" stroke="#c084fc" strokeWidth={2} dot={false} />
            <Line name="Weekly Active (WAU)" type="monotone" dataKey="wau" stroke="#60a5fa" strokeWidth={2} dot={false} />
            <Line name="Monthly Active (MAU)" type="monotone" dataKey="mau" stroke="#34d399" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* D. Tenant Usage Comparison */}
      <ChartCard title="Tenant Performance Comparison (Activity Score)">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={tenantUsageData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" horizontal={false} />
            <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
            <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} width={80} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Bar name="Employees" dataKey="employees" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={8} />
            <Bar name="Activity Score" dataKey="score" fill="#d946ef" radius={[0, 4, 4, 0]} barSize={8} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* E. Subscription Distribution */}
      <ChartCard title="Subscription Distribution">
        <div className="donut-chart-container">
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie
                data={subDistributionData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {subDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-legend-grid">
            {subDistributionData.map((item, index) => (
              <div key={index} className="donut-legend-item">
                <span className="legend-color-dot" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                <span className="legend-label">{item.name}</span>
                <span className="legend-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>

      {/* F. Platform Load Monitoring (Real-time) */}
      <ChartCard title="Platform Load & Health (Real-time Metrics)">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={realTimeLoad} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
            <XAxis dataKey="timestamp" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Area name="API Requests/min" type="monotone" dataKey="requests" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRequests)" strokeWidth={2} />
            <Area name="Server Load (CPU %)" type="monotone" dataKey="cpu" stroke="#ec4899" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={1.5} />
            <Line name="Response Time (ms)" type="monotone" dataKey="latency" stroke="#fbbf24" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* G. Storage Usage Analytics */}
      <ChartCard title="Top Storage Consuming Tenants (MB)">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={storageConsumingTenants} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Bar name="Storage Used" dataKey="storage" fill="url(#colorStorageGrad)" radius={[4, 4, 0, 0]}>
              {storageConsumingTenants.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : index === 1 ? '#fbbf24' : '#60a5fa'} />
              ))}
            </Bar>
            <defs>
              <linearGradient id="colorStorageGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.15}/>
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* H. Security Analytics */}
      <ChartCard title="Security Incidents & Warnings">
        <div className="security-analytics-flex">
          <div className="security-kpis-row">
            <div className="sec-kpi-subcard border-red">
              <ShieldAlert size={16} className="text-danger" />
              <div className="sec-kpi-text">
                <span className="sec-kpi-val">{securityStats.blockedIps ?? 3}</span>
                <span className="sec-kpi-lbl">Blocked IPs</span>
              </div>
            </div>
            <div className="sec-kpi-subcard border-amber">
              <Shield size={16} className="text-warning" />
              <div className="sec-kpi-text">
                <span className="sec-kpi-val">{securityStats.threatAudits ?? 12}</span>
                <span className="sec-kpi-lbl">Threat Audits</span>
              </div>
            </div>
            <div className="sec-kpi-subcard border-blue">
              <EyeOff size={16} className="text-info" />
              <div className="sec-kpi-text">
                <span className="sec-kpi-val">{securityStats.inactiveTenants ?? 1}</span>
                <span className="sec-kpi-lbl">Inactive Tenants</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={securityIncidentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line name="Failed Logins" type="monotone" dataKey="failedLogins" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              <Line name="Suspicious Activity" type="monotone" dataKey="suspiciousActivity" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
};

export default ControlCenterCharts;
