import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Sidebar.css';
import { useApp } from '../context/AppContext';
import { useChat } from '../context/ChatContext';
import Avatar from './common/Avatar';
import { filterMenuByRole, isMenuItemAccessible } from '../permissions/permissions';
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
  MessageSquare,
  FolderClosed,
  ShieldAlert,
  Key,
  AreaChart,
  Settings,
  Lock,
  Terminal,
  UserSquare2,
  LogOut,
  Sparkles,
  UserCog
} from 'lucide-react';

const menuStructure = [
  {
    title: 'Core',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { name: 'Employee Dashboard', icon: LayoutDashboard, path: '/employee-dashboard' },
      { name: 'Company Overview', icon: Building2, path: '/overview' }
    ]
  },
  {
    title: 'People',
    items: [
      {
        name: 'Employee Management',
        icon: Users,
        path: '/employees',
        subItems: [
          { name: 'Active Employees', path: '/employees' },
          { name: 'Past Employees', path: '/employees/inactive' }
        ]
      },
      { name: 'Agency Branch Management', icon: Network, path: '/branches' },
      { name: 'Department Management', icon: GitMerge, path: '/departments' },
      {
        name: 'Team Management',
        icon: Award,

        path: '/teams',
        subItems: [
          { name: 'Managers', path: '/managers' },
          { name: 'Team Leaders', path: '/teams/leaders' }
        ]
      },
      {
        name: 'Attendance Management',
        icon: Clock,
        subItems: [
          { name: 'Punch In Out Reports', path: '/attendance' },
          { name: 'Web Portal Punch', path: '/attendance/webportal' }
        ]
      },
      { name: 'Leave Management', icon: CalendarDays, path: '/leaves' }
    ]
  },
  {
    title: 'Operations',
    items: [
      { name: 'Project Management', icon: Briefcase, path: '/projects' },
      { name: 'Task Monitoring', icon: KanbanSquare, path: '/tasks' },
      { name: 'Work Reports', icon: FileText, path: '/work-reports' },
      { name: 'Performance Analytics', icon: BarChart3, path: '/performance' },
      { name: 'Payroll Management', icon: DollarSign, path: '/payroll' },
      { name: 'Meetings & Calendar', icon: CalendarDays, path: '/calendar' }
    ]
  },
  {
    title: 'Communication',
    items: [
      { name: 'Announcements', icon: Megaphone, path: '/announcements' },
      { name: 'Notifications', icon: Bell, path: '/notifications', badgeKey: 'notifications' },
      { name: 'Chat', icon: MessageSquare, path: '/chat', badgeKey: 'chat' },
      { name: 'Document Management', icon: FolderClosed, path: '/documents' }
    ]
  },
  {
    title: 'Administration',
    items: [
      {
        name: 'Role & Permission',
        icon: Key,
        subItems: [
          { name: 'User Access Control', path: '/permissions' }
        ]
      }
    ]
  },
  {
    title: 'System',
    items: [
      { name: 'System Settings', icon: Settings, path: '/settings' },
      { name: 'Security & Audit Logs', icon: Lock, path: '/security' }
    ]
  },
  {
    title: 'Account',
    items: [
      { name: 'Profile Settings', icon: UserSquare2, path: '/my-profile' }
    ]
  }
];

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const navigate = useNavigate();
  const { sidebarCollapsed, setSidebarCollapsed, notifications, currentUserRole, logout, sidebarDense, generalSettings, hasPermission, currentUser } = useApp();
  const { getTotalUnread } = useChat();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [isHovered, setIsHovered] = useState(false);

  // When compact sidebar setting is ON, keep the sidebar collapsed, but expand on hover
  const isCollapsedConfig = sidebarCollapsed || sidebarDense;
  const effectiveCollapsed = isCollapsedConfig && !isHovered;
  const rawCompanyName = generalSettings?.companyName || 'SaaS Admin';
  const companyName = (rawCompanyName === 'Office Management Pvt. Ltd.' || rawCompanyName === 'Office Management') ? 'Gatecode OMS' : rawCompanyName;

  const unreadCount = notifications.filter(n => !n.read).length;

  const getPerfScore = () => {
    if (!currentUser?.performanceScore) return '92%';
    if (typeof currentUser.performanceScore === 'object') {
      return `${currentUser.performanceScore.score || currentUser.performanceScore.value || 92}%`;
    }
    return `${currentUser.performanceScore}%`;
  };

  const getUserInitials = () => {
    if (!currentUser?.name) return 'UR';
    return currentUser.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const toggleSubmenu = (menuName) => {
    if (effectiveCollapsed) {
      if (!sidebarDense) setSidebarCollapsed(false);
    }
    setExpandedMenus(prev => {
      const isCurrentlyExpanded = !!prev[menuName];
      return {
        [menuName]: !isCurrentlyExpanded
      };
    });
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    if (location.pathname === path) {
      return true;
    }
    if (location.pathname.startsWith(path + '/')) {
      const hasCloserMatch = menuStructure.some(section =>
        section.items.some(item => {
          if (item.path && item.path !== path && (location.pathname === item.path || location.pathname.startsWith(item.path + '/'))) {
            return true;
          }
          if (item.subItems) {
            return item.subItems.some(sub => sub.path !== path && (location.pathname === sub.path || location.pathname.startsWith(sub.path + '/')));
          }
          return false;
        })
      );
      return !hasCloserMatch;
    }
    return false;
  };

  useEffect(() => {
    // Automatically expand ONLY the active sub-menu group and collapse all others
    const newExpanded = {};
    menuStructure.forEach(section => {
      section.items.forEach(item => {
        if (item.subItems) {
          const isSubitemActive = item.subItems.some(sub => isActive(sub.path));
          const isParentActive = item.path && isActive(item.path);
          if (isSubitemActive || isParentActive) {
            newExpanded[item.name] = true;
          }
        }
      });
    });
    setExpandedMenus(newExpanded);
  }, [location.pathname]);

  const handleLogout = (e) => {
    e.preventDefault();
    setMobileOpen(false);
    logout(); // logout() itself does window.location.href = '/login'
  };

  const renderItem = (item) => {
    const Icon = item.icon;

    if (item.disabled) {
      return (
        <div
          key={item.name}
          className="menu-link menu-link-disabled"
          title={`${item.name} (Temporarily Disabled)`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="menu-item-content">
            <Icon size={18} className="menu-icon" />
            {!effectiveCollapsed && <span className="menu-label-text">{item.name}</span>}
          </div>
          {effectiveCollapsed && <div className="collapsed-tooltip">{item.name} (Disabled)</div>}
        </div>
      );
    }
    const isSub = !!item.subItems;
    const isExpanded = expandedMenus[item.name];
    const isCurrentActive = isActive(item.path);

    // If subitem active, mark parent as active-like
    const isParentActive = isSub && item.subItems.some(sub => isActive(sub.path));
    const isMainActive = isCurrentActive || isParentActive;

    if (isSub) {
      const triggerContent = (
        <>
          <div className="menu-item-content">
            <Icon size={18} className="menu-icon" />
            {!effectiveCollapsed && <span className="menu-label-text">{item.name}</span>}
          </div>
          {!effectiveCollapsed && (
            <ChevronDown
              size={16}
              className={`submenu-chevron ${isExpanded ? 'rotated' : ''}`}
              onClick={(e) => {
                if (item.path) {
                  e.stopPropagation();
                  e.preventDefault();
                }
                toggleSubmenu(item.name);
              }}
            />
          )}
          {effectiveCollapsed && <div className="collapsed-tooltip">{item.name}</div>}
        </>
      );

      return (
        <div key={item.name} className={`menu-group ${isMainActive ? 'parent-active' : ''}`}>
          {item.path ? (
            <Link
              to={item.path}
              onClick={() => {
                toggleSubmenu(item.name);
                setMobileOpen(false);
              }}
              className={`menu-link menu-link-toggle ${isCurrentActive ? 'active' : ''} ${effectiveCollapsed ? 'justify-center' : ''}`}
              title={effectiveCollapsed ? item.name : ''}
            >
              {triggerContent}
            </Link>
          ) : (
            <button
              onClick={() => toggleSubmenu(item.name)}
              className={`menu-link menu-link-toggle ${effectiveCollapsed ? 'justify-center' : ''}`}
              title={effectiveCollapsed ? item.name : ''}
            >
              {triggerContent}
            </button>
          )}

          {/* Submenu entries */}
          <div className={`submenu-wrapper ${isExpanded && !effectiveCollapsed ? 'expanded' : 'collapsed'}`}>
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
          className={`menu-link menu-link-danger ${effectiveCollapsed ? 'justify-center' : ''}`}
          title={effectiveCollapsed ? item.name : ''}
        >
          <Icon size={18} className="menu-icon" />
          {!effectiveCollapsed && <span className="menu-label-text">{item.name}</span>}
          {effectiveCollapsed && <div className="collapsed-tooltip">{item.name}</div>}
        </a>
      );
    }

    return (
      <Link
        key={item.name}
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={`menu-link ${isCurrentActive ? 'active' : ''} ${effectiveCollapsed ? 'justify-center' : ''}`}
        title={effectiveCollapsed ? item.name : ''}
      >
        <div className="menu-item-content">
          <Icon size={18} className="menu-icon" />
          {!effectiveCollapsed && <span className="menu-label-text">{item.name}</span>}
        </div>
        {!effectiveCollapsed && item.badgeKey === 'notifications' && unreadCount > 0 && (
          <span className="sidebar-badge">{unreadCount}</span>
        )}
        {!effectiveCollapsed && item.badgeKey === 'chat' && getTotalUnread() > 0 && (
          <span className="sidebar-badge sidebar-badge-chat">{getTotalUnread() > 99 ? '99+' : getTotalUnread()}</span>
        )}
        {effectiveCollapsed && <div className="collapsed-tooltip">{item.name}</div>}
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
        className={`app-sidebar ${effectiveCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-show' : ''
          }`}
        onMouseEnter={() => {
          if (isCollapsedConfig) {
            setIsHovered(true);
          }
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
      >
        {/* Sidebar Header / Logo */}
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo-link" onClick={() => setMobileOpen(false)}>
            <div className="logo-icon-holder">
              <Sparkles size={18} className="logo-spark" />
            </div>
            {!effectiveCollapsed && <span className="sidebar-brand-name">{companyName}</span>}
          </Link>
        </div>

        {/* Scrollable menu items */}
        <div className="sidebar-menu-container sidebar-scroll">
          {currentUserRole === 'employee' ? (
            <div className="sidebar-section">
              {!effectiveCollapsed && <h5 className="sidebar-section-title">Workplace</h5>}
              <div className="sidebar-section-items">
                {[
                  { name: 'Dashboard', icon: LayoutDashboard, path: '/employee-dashboard' },
                  { name: 'Attendance', icon: Clock, path: '/attendance' },
                  { name: 'Leave Management', icon: CalendarDays, path: '/leaves' },
                  { name: 'My Tasks', icon: KanbanSquare, path: '/tasks' },
                  { name: 'My Projects', icon: Briefcase, path: '/projects' },
                  { name: 'Daily Work Reports', icon: FileText, path: '/work-reports' },
                  { name: 'Announcements', icon: Megaphone, path: '/announcements' },
                  { name: 'Notifications', icon: Bell, path: '/notifications', badgeKey: 'notifications' },
                  { name: 'Chat', icon: MessageSquare, path: '/chat', badgeKey: 'chat' },
                  { name: 'Payroll', icon: DollarSign, path: '/payroll' },
                  { name: 'Documents', icon: FolderClosed, path: '/documents' },
                  { name: 'Meetings & Calendar', icon: CalendarDays, path: '/calendar' }
                ]
                  .filter(item => isMenuItemAccessible(item, currentUserRole, hasPermission))
                  .map(item => renderItem(item))}
              </div>
            </div>
          ) : (
            (() => {
              const isBranchScoped = currentUserRole !== 'super_admin' && currentUserRole !== 'company_admin' && currentUserRole !== 'SuperAdmin' && currentUser?.branch;
              return filterMenuByRole(
                menuStructure.map(sec => ({
                  ...sec,
                  items: sec.items
                    .filter(item => item.name !== 'Employee Dashboard')
                    .map(item => {
                      if (item.name === 'Company Overview' && isBranchScoped) {
                        return { ...item, name: 'Branch Overview' };
                      }
                      return item;
                    })
                })),
                currentUserRole,
                hasPermission
              ).map((section) => (
                <div key={section.title} className="sidebar-section">
                  {!effectiveCollapsed && <h5 className="sidebar-section-title">{section.title}</h5>}
                  <div className="sidebar-section-items">
                    {section.items.map((item) => renderItem(item))}
                  </div>
                </div>
              ));
            })()
          )}

          {/* Quick Actions (Employee only) */}
          {currentUserRole === 'employee' && !effectiveCollapsed && (
            <div className="sidebar-quick-actions">
              <span className="quick-actions-title">Quick Actions</span>
              <div className="quick-actions-grid-layout">
                {isMenuItemAccessible({ path: '/attendance' }, currentUserRole, hasPermission) && (
                  <Link to="/employee-dashboard" onClick={() => setMobileOpen(false)} className="quick-action-tile">
                    <Clock size={14} className="tile-icon text-primary-c" />
                    <span className="tile-label">Punch In/Out</span>
                  </Link>
                )}
                {isMenuItemAccessible({ path: '/attendance' }, currentUserRole, hasPermission) && (
                  <Link to="/attendance" onClick={() => setMobileOpen(false)} className="quick-action-tile">
                    <Clock size={14} className="tile-icon text-info" />
                    <span className="tile-label">History</span>
                  </Link>
                )}
                {isMenuItemAccessible({ path: '/tasks' }, currentUserRole, hasPermission) && (
                  <Link to="/tasks" onClick={() => setMobileOpen(false)} className="quick-action-tile">
                    <KanbanSquare size={14} className="tile-icon text-warning" />
                    <span className="tile-label">Tasks</span>
                  </Link>
                )}
                {isMenuItemAccessible({ path: '/work-reports' }, currentUserRole, hasPermission) && (
                  <Link to="/work-reports" onClick={() => setMobileOpen(false)} className="quick-action-tile">
                    <FileText size={14} className="tile-icon text-success" />
                    <span className="tile-label">Submit DWR</span>
                  </Link>
                )}
                {isMenuItemAccessible({ path: '/leaves' }, currentUserRole, hasPermission) && (
                  <Link to="/leaves" onClick={() => setMobileOpen(false)} className="quick-action-tile">
                    <CalendarDays size={14} className="tile-icon text-danger" />
                    <span className="tile-label">Apply Leave</span>
                  </Link>
                )}
                {isMenuItemAccessible({ path: '/documents' }, currentUserRole, hasPermission) && (
                  <Link to="/documents" onClick={() => setMobileOpen(false)} className="quick-action-tile">
                    <FolderClosed size={14} className="tile-icon text-primary-c" />
                    <span className="tile-label">Documents</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {currentUser && !effectiveCollapsed && (
          <div className="sidebar-employee-footer-row">
            <Link to="/my-profile" className="sidebar-footer-avatar-wrapper" title="View Profile">
              <Avatar name={currentUser?.name} className="emp-footer-avatar" size="md" src={currentUser?.avatar || currentUser?.photoUrl} />
            </Link>
            <button className="sidebar-footer-logout-btn" onClick={handleLogout} title="Logout">
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
