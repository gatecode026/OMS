import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { Folder, Database, Archive, Clock, Eye, Download, HardDrive } from 'lucide-react';
import Badge from '../../components/common/Badge';

const COLORS = ['#ec4899', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const DocumentDashboard = ({ onNavigateToSection }) => {
  const { getDocumentAnalytics } = useApp();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getDocumentAnalytics();
        if (data) setStats(data);
      } catch (err) {
        console.error(err);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-row justify-center align-center" style={{ minHeight: '300px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Loading vault statistics...</span>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex-column gap-5">
      {/* Metric Cards Grid */}
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        
        <div className="card dashboard-metric-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', borderLeft: '4px solid var(--accent-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>TOTAL DOCUMENTS</span>
            <div style={{ background: 'rgba(219,39,119,0.12)', color: 'var(--accent-color)', padding: '6px', borderRadius: '8px' }}>
              <Folder size={18} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: '700' }}>{stats.totalDocuments}</h2>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-secondary)' }}>
              <span>{stats.projectDocuments} Project</span>
              <span>•</span>
              <span>{stats.generalDocuments} General</span>
            </div>
          </div>
        </div>

        <div className="card dashboard-metric-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', borderLeft: '4px solid #a855f7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>VAULT STORAGE USED</span>
            <div style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7', padding: '6px', borderRadius: '8px' }}>
              <Database size={18} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: '700' }}>{stats.storageUsed}</h2>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
              <div style={{ width: '38%', height: '100%', background: '#a855f7', borderRadius: '3px' }}></div>
            </div>
          </div>
        </div>

        <div className="card dashboard-metric-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', borderLeft: '4px solid #3b82f6', cursor: 'pointer' }} onClick={() => onNavigateToSection('PROJECT')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>PROJECT DOCUMENT FOLDERS</span>
            <div style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6', padding: '6px', borderRadius: '8px' }}>
              <HardDrive size={18} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: '700' }}>{stats.projectDocuments}</h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', display: 'block' }}>Grouped inside dynamic folders</span>
          </div>
        </div>

        <div className="card dashboard-metric-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', borderLeft: '4px solid #10b981', cursor: 'pointer' }} onClick={() => onNavigateToSection('ARCHIVES')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>ARCHIVED DOCUMENTS</span>
            <div style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '6px', borderRadius: '8px' }}>
              <Archive size={18} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: '700' }}>{stats.archivedDocuments}</h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', display: 'block' }}>Stored in system archives</span>
          </div>
        </div>

      </div>

      {/* Recharts Analytics Panel */}
      <div className="flex-row gap-4" style={{ display: 'flex', width: '100%' }}>
        
        {/* Project Storage Bar Chart */}
        <div className="card" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Project Storage Share (MB)</h4>
          <div style={{ width: '100%', height: '240px' }}>
            {stats.storageByProject && stats.storageByProject.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.storageByProject}>
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="var(--accent-color)" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex-row align-center justify-center" style={{ height: '100%', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                No project documents uploaded yet
              </div>
            )}
          </div>
        </div>

        {/* Department Share Pie Chart */}
        <div className="card" style={{ width: '380px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Department Share (MB)</h4>
          <div style={{ width: '100%', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {stats.storageByDepartment && stats.storageByDepartment.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Pie
                    data={stats.storageByDepartment}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.storageByDepartment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex-row align-center justify-center" style={{ height: '100%', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                No general documents uploaded yet
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Recents and Highlights Grid */}
      <div className="flex-row gap-4" style={{ display: 'flex', width: '100%' }}>
        
        {/* Recent Uploads */}
        <div className="card" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} /> Recent Activity Timeline
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats.recentUploads && stats.recentUploads.length > 0 ? (
              stats.recentUploads.map(doc => (
                <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{doc.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Uploaded by {doc.uploadedBy} • {doc.uploadDate}
                    </span>
                  </div>
                  <Badge variant={doc.documentScope === 'PROJECT' ? 'primary' : 'neutral'}>
                    {doc.documentScope}
                  </Badge>
                </div>
              ))
            ) : (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No recent activities</span>
            )}
          </div>
        </div>

        {/* Most Downloaded */}
        <div className="card" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> Popular Resources
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats.mostDownloaded && stats.mostDownloaded.length > 0 ? (
              stats.mostDownloaded.map(doc => (
                <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{doc.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Size: {doc.size} | Version {doc.version}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <Download size={12} />
                    <span>{doc.downloads || 0} downloads</span>
                  </div>
                </div>
              ))
            ) : (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No download logs recorded yet</span>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default DocumentDashboard;
