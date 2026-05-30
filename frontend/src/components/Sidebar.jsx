import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Sidebar.css';
import { useApp } from '../context/AppContext';
import {
  ChevronDown,
  LayoutDashboard,
  Building2,
  Users,
  Clock,
  CalendarDays,
  GitMerge,
  Network,
  Award,
  Briefcase,
  GitFork,
  KanbanSquare,
  FileText,
  BarChart3,
  DollarSign,
  Megaphone,
  Bell,
  FolderClosed,
  ShieldAlert,
  Key,
  AreaChart,
  Settings,
  Lock,
  Terminal,
  UserSquare2,
  LogOut,
  Sparkles
} from 'lucide-react';

const menuStructure = [
  {
    title: 'Core',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { name: 'Company Overview', icon: Building2, path: '/overview' }
    ]
  },
  {
    title: 'People',
    items: [
      {
        name: 'Employee Management',
        icon: Users,
        subItems: [
          { name: 'Add Employee', path: '/employees/add' },
          { name: 'All Employees', path: '/employees' }
        ]
      },
      {
        name: 'Attendance Management',
        icon: Clock,
        subItems: [
          { name: 'Punch In Out Reports', path: '/attendance' }
        ]
      },
      { name: 'Leave Management', icon: CalendarDays, path: '/leaves' },
      { name: 'Department Management', icon: GitMerge, path: '/departments' },
      { name: 'Agency Branch Management', icon: Network, path: '/branches' },
      {
        name: 'Team Management',
        icon: Award,
        subItems: [
          { name: 'Team Leaders', path: '/teams' }
        ]
      }
    ]
  },
  {
    title: 'Operations',
    items: [
      { name: 'Project Management', icon: Briefcase, path: '/projects' },
      { name: 'Workflow Management', icon: GitFork, path: '/workflows' },
      { name: 'Task Monitoring', icon: KanbanSquare, path: '/tasks' },
      { name: 'Daily Work Reports', icon: FileText, path: '/work-reports' },
      { name: 'Performance Analytics', icon: BarChart3, path: '/performance' },
      { name: 'Payroll Management', icon: DollarSign, path: '/payroll' }
    ]
  },
  {
    title: 'Communication',
    items: [
      { name: 'Announcements', icon: Megaphone, path: '/announcements' },
      { name: 'Notifications', icon: Bell, path: '/notifications', badgeKey: 'notifications' },
      { name: 'Document Management', icon: FolderClosed, path: '/documents' }
    ]
  },
  {
    title: 'Administration',
    items: [
      { name: 'Activity Logs', icon: ShieldAlert, path: '/activity-logs' },
      {
        name: 'Role & Permission',
        icon: Key,
        subItems: [
          { name: 'User Access Control', path: '/permissions' }
        ]
      },
      { name: 'Reports and Analytics', icon: AreaChart, path: '/reports' }
    ]
  },
  {
    title: 'System',
    items: [
      { name: 'System Settings', icon: Settings, path: '/settings' },
      { name: 'Security Settings', icon: Lock, path: '/security' },
      { name: 'Audit Logs', icon: Terminal, path: '/audit-logs' }
    ]
  },
  {
    title: 'Account',
    items: [
      { name: 'Profile Settings', icon: UserSquare2, path: '/profile' },
      { name: 'Logout', icon: LogOut, path: '/logout', isDanger: true }
    ]
  }
];

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const navigate = useNavigate();
  const { sidebarCollapsed, setSidebarCollapsed, notifications, addToast, setCurrentUserRole } = useApp();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleSubmenu = (menuName) => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
    }
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = (e) => {
    e.preventDefault();
    sessionStorage.removeItem('saas_token');
    addToast('warning', 'Logged out successfully. Session cleared.');
    setCurrentUserRole('employee'); // reset role
    setMobileOpen(false);
    navigate('/login');
  };

  const renderItem = (item) => {
    const Icon = item.icon;
    const isSub = !!item.subItems;
    const isExpanded = expandedMenus[item.name];
    const isCurrentActive = !isSub && isActive(item.path);

    // If subitem active, mark parent as active-like
    const isParentActive = isSub && item.subItems.some(sub => isActive(sub.path));

    if (isSub) {
      return (
        <div key={item.name} className={`menu-group ${isParentActive ? 'parent-active' : ''}`}>
          <button
            onClick={() => toggleSubmenu(item.name)}
            className={`menu-link menu-link-toggle ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? item.name : ''}
          >
            <div className="flex-center gap-3">
              <Icon size={18} className="menu-icon" />
              {!sidebarCollapsed && <span className="menu-label-text">{item.name}</span>}
            </div>
            {!sidebarCollapsed && (
              <ChevronDown
                size={16}
                className={`submenu-chevron ${isExpanded ? 'rotated' : ''}`}
              />
            )}
            {sidebarCollapsed && <div className="collapsed-tooltip">{item.name}</div>}
          </button>
          
          {/* Submenu entries */}
          <div className={`submenu-wrapper ${isExpanded && !sidebarCollapsed ? 'expanded' : 'collapsed'}`}>
            {item.subItems.map(sub => {
              const subActive = isActive(sub.path);
              return (
                <Link
                  key={sub.name}
                  to={sub.path}
                  onClick={() => setMobileOpen(false)}
                  className={`submenu-link ${subActive ? 'active' : ''}`}
                >
                  <span className="submenu-bullet"></span>
                  <span className="submenu-label">{sub.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      );
    }

    if (item.isDanger) {
      return (
        <a
          key={item.name}
          href="/logout"
          onClick={handleLogout}
          className={`menu-link menu-link-danger ${sidebarCollapsed ? 'justify-center' : ''}`}
          title={sidebarCollapsed ? item.name : ''}
        >
          <Icon size={18} className="menu-icon" />
          {!sidebarCollapsed && <span className="menu-label-text">{item.name}</span>}
          {sidebarCollapsed && <div className="collapsed-tooltip">{item.name}</div>}
        </a>
      );
    }

    return (
      <Link
        key={item.name}
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={`menu-link ${isCurrentActive ? 'active' : ''} ${sidebarCollapsed ? 'justify-center' : ''}`}
        title={sidebarCollapsed ? item.name : ''}
      >
        <div className="flex-center gap-3">
          <Icon size={18} className="menu-icon" />
          {!sidebarCollapsed && <span className="menu-label-text">{item.name}</span>}
        </div>
        {!sidebarCollapsed && item.badgeKey === 'notifications' && unreadCount > 0 && (
          <span className="sidebar-badge">{unreadCount}</span>
        )}
        {sidebarCollapsed && <div className="collapsed-tooltip">{item.name}</div>}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${
          mobileOpen ? 'mobile-show' : ''
        }`}
      >
        {/* Sidebar Header / Logo */}
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo-link" onClick={() => setMobileOpen(false)}>
            <div className="logo-icon-holder">
              <Sparkles size={18} className="logo-spark" />
            </div>
            {!sidebarCollapsed && <span className="sidebar-brand-name">Sass Admin</span>}
          </Link>
        </div>

        {/* Scrollable menu items */}
        <div className="sidebar-menu-container sidebar-scroll">
          {menuStructure.map((section) => (
            <div key={section.title} className="sidebar-section">
              {!sidebarCollapsed && <h5 className="sidebar-section-title">{section.title}</h5>}
              <div className="sidebar-section-items">
                {section.items.map((item) => renderItem(item))}
              </div>
            </div>
          ))}
        </div>

      </aside>
    </>
  );
};

export default Sidebar;
