import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLogOut, FiBell, FiUser, FiMenu, FiX, FiSun, FiDroplet } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import useLayoutStore from '../../store/LayoutStore';

const BRAND_RGB = 'rgb(77, 52, 144)';
const LOGO_LIGHT = '/assets/images/logo-dash.png';
const LOGO_BRAND = '/assets/images/logo-white.png';

const Navbar = (props) => {
  const navigate = useNavigate();

  // Auth
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Store fallbacks
  const storeSidebarOpen   = useLayoutStore((s) => s.sidebarOpen);
  const storeToggleSidebar = useLayoutStore((s) => s.toggleSidebar);

  // Theme
  const uiTheme = useLayoutStore((s) => s.uiTheme); // 'light' | 'brand'
  const toggleTheme = useLayoutStore((s) => s.toggleTheme);
  const isBrand = uiTheme === 'brand';

  // --- Prop compatibility layer (supports both prop name sets) ---
  const propOpen =
    typeof props?.isSidebarOpen === 'boolean'
      ? props.isSidebarOpen
      : typeof props?.mobileSidebarOpen === 'boolean'
      ? props.mobileSidebarOpen
      : undefined;

  const propToggle =
    typeof props?.toggleSidebar === 'function'
      ? props.toggleSidebar
      : typeof props?.onToggleSidebar === 'function'
      ? props.onToggleSidebar
      : undefined;

  const isSidebarOpen = typeof propOpen === 'boolean' ? propOpen : storeSidebarOpen;
  const toggleSidebar = propToggle || storeToggleSidebar;

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const avatarInitials = (firstName, lastName) => {
    const f = (firstName || '').trim();
    const l = (lastName || '').trim();
    if (!f && !l) return 'NN';
    return `${(f[0] || 'N').toUpperCase()}${(l[0] || 'N').toUpperCase()}`;
  };

  const iconBtnClass = [
    'inline-flex items-center justify-center w-10 h-10 rounded-md border transition',
    isBrand
      ? 'border-white/25 hover:bg-white/10 text-white'
      : 'border-gray-300 hover:bg-gray-100 text-gray-700',
  ].join(' ');

  const logoSrc = isBrand ? LOGO_BRAND : LOGO_LIGHT;

  return (
    <div className="header">
      <nav
        className="fixed top-0 right-0 left-0 lg:left-64 h-14 z-40 border-b shadow-sm
                   flex items-center justify-between pl-5 lg:pl-8 xl:pl-10 pr-4 sm:pr-6"
        style={{
          backgroundColor: isBrand ? BRAND_RGB : '#ffffff',
          borderColor: isBrand ? 'rgba(255,255,255,0.2)' : '#E5E7EB',
          color: isBrand ? '#ffffff' : '#111827',
          transform: 'translateZ(0)',
        }}
      >
        {/* Mobile hamburger / X */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation(); // avoid outside-click handlers
            toggleSidebar();
          }}
          className={[
            'lg:hidden',
            'inline-flex items-center justify-center w-10 h-10 rounded-md border',
            isBrand
              ? 'border-white/25 hover:bg-white/10 text-white'
              : 'border-gray-300 hover:bg-gray-100 text-gray-700',
          ].join(' ')}
          aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
          aria-controls="mobile-sidebar"
          aria-expanded={!!isSidebarOpen}
        >
          {isSidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>

        {/* Brand area: hidden on mobile (logo lives in drawer), visible on desktop */}
        <div className="flex-1 min-w-0 flex items-center">
          <Link
            to="/dashboard"
            aria-label="Soundhive"
            className="hidden lg:flex items-center leading-[0]"
          >
            <img
              src={logoSrc}
              alt="Soundhive"
              className={['block w-auto object-contain shrink-0', isBrand ? 'h-12' : 'h-9'].join(' ')}
              style={{ aspectRatio: 'auto', imageRendering: 'auto' }}
            />
          </Link>
        </div>

        {/* Right cluster */}
        <ul className="flex ml-auto items-center">
          <li className="dropdown stopevent mr-2 relative">
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a
              className={isBrand ? 'text-white' : 'text-gray-600'}
              href="#"
              role="button"
              id="dropdownNotification"
              data-bs-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false"
              title="Notifications"
            >
              <span className={iconBtnClass}>
                <FiBell className="w-5 h-5" />
              </span>
            </a>
            <div
              className="dropdown-menu dropdown-menu-lg lg:left-auto lg:right-0 absolute z-50"
              aria-labelledby="dropdownNotification"
            >
              <div className="border-b px-3 pt-2 pb-3 flex justify-between items-center">
                <span className="text-lg text-gray-800 font-semibold">Notifications</span>
                {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                <a href="#"><span className="text-gray-800 font-semibold">View all</span></a>
              </div>
              <ul className="h-56" data-simplebar="">
                <li className="bg-gray-100 px-3 py-2 border-b">
                  {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                  <a href="#">
                    <h5 className="mb-1">New Comment</h5>
                    <p>You have a new comment on your post.</p>
                  </a>
                </li>
              </ul>
            </div>
          </li>

          <li className="ml-2">
            <button
              type="button"
              role="switch"
              aria-checked={isBrand}
              onClick={toggleTheme}
              className={iconBtnClass}
              title={isBrand ? 'Switch to Light' : 'Switch to Brand'}
            >
              {isBrand ? <FiSun className="w-5 h-5" /> : <FiDroplet className="w-5 h-5" />}
            </button>
          </li>

          <li className="dropdown ml-2 relative">
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a
              className="flex items-center cursor-pointer"
              href="#"
              role="button"
              id="dropdownUser"
              data-bs-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false"
            >
              <div className="w-10 h-10 relative">
                {user?.profile_image ? (
                  <img alt="avatar" src={user.profile_image} className="rounded-full w-10 h-10 object-cover" />
                ) : (
                  <div
                    className={[
                      'flex justify-center items-center w-10 h-10 rounded-full',
                      isBrand ? 'bg-white/20 text-white' : 'bg-gray-400 text-white',
                    ].join(' ')}
                  >
                    {avatarInitials(user?.first_name, user?.last_name)}
                  </div>
                )}
                <div className="absolute border-gray-200 border-2 rounded-full right-0 bottom-0 bg-green-600 h-3 w-3" />
              </div>
              <div className="ml-2 flex flex-col">
                <span className={['font-semibold', isBrand ? 'text-white' : 'text-gray-800'].join(' ')}>
                  {user?.first_name} {user?.last_name}
                </span>
                <span className={isBrand ? 'text-white/80 text-sm' : 'text-gray-500 text-sm'}>{user?.email}</span>
              </div>
            </a>
            <div className="dropdown-menu dropdown-menu-end p-2 absolute z-50" aria-labelledby="dropdownUser">
              <div className="px-4 pb-0 pt-2">
                <div className="border-b mt-3 mb-2" />
              </div>
              <ul>
                <li>
                  <Link className="dropdown-item" to="/profile">
                    <FiUser className="mr-2" /> Profile
                  </Link>
                </li>
                <li>
                  {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                  <a className="dropdown-item" href="#" onClick={handleLogout}>
                    <FiLogOut className="mr-2" /> Logout
                  </a>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Navbar;
