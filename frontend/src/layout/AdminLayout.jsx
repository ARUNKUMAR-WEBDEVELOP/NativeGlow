import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    // Check for admin token on mount
    const adminToken = localStorage.getItem('admin_token');
    const adminInfo = localStorage.getItem('admin_info');

    if (!adminToken) {
      navigate('/admin/login', { replace: true });
      return;
    }

    // Parse admin info if available
    if (adminInfo) {
      try {
        setAdmin(JSON.parse(adminInfo));
      } catch (err) {
        console.error('Failed to parse admin info:', err);
      }
    }

    setIsLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    // Clear admin tokens and info
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_info');
    navigate('/admin/login', { replace: true });
  };

  const navItems = [
    { icon: '📊', label: 'Dashboard', path: '/admin/dashboard' },
    { icon: '🏪', label: 'Vendors', path: '/admin/vendors' },
    { icon: '📦', label: 'Products', path: '/admin/products' },
    { icon: '🛒', label: 'Orders', path: '/admin/orders' },
    { icon: '💰', label: 'Maintenance Fees', path: '/admin/maintenance' },
    { icon: '👤', label: 'Profile', path: '/admin/profile' },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="animate-spin">
              <svg className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          </div>
          <p className="text-slate-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } border-r border-slate-700 bg-[#1a1a2e] transition-all duration-300 flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${!isSidebarOpen && 'justify-center w-full'}`}>
              <span className="text-2xl">🌿</span>
              {isSidebarOpen && (
                <div>
                  <h1 className="text-lg font-bold text-white">NativeGlow</h1>
                  <p className="text-xs text-slate-400">Admin</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              {isSidebarOpen ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                isActive(item.path)
                  ? 'bg-[#e8b86d] text-[#1a1a2e] font-semibold'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
              title={!isSidebarOpen ? item.label : ''}
            >
              <span className="text-lg">{item.icon}</span>
              {isSidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="border-t border-slate-700 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-all"
            title="Logout"
          >
            <span className="text-lg">🚪</span>
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">
              🌿 NativeGlow Admin
            </h2>
          </div>
          {admin && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{admin.full_name}</p>
                <p className="text-xs text-slate-400">{admin.email}</p>
                {admin.is_superadmin && (
                  <p className="text-xs text-[#e8b86d] font-semibold">Superadmin</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#e8b86d] to-yellow-600 flex items-center justify-center text-sm font-bold text-[#1a1a2e]">
                {admin.full_name?.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-950">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
