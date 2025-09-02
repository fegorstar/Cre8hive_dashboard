// src/components/layout/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLogOut, FiBell, FiUser, FiMenu, FiX, FiSun, FiDroplet } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import useLayoutStore from '../../store/LayoutStore';

const BRAND_RGB = 'rgb(77, 52, 144)';

const Navbar = (props) => {
  const navigate = useNavigate();

  // Auth (pick only what we need)
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Layout store (fallback if props aren't passed)
  const storeSidebarOpen = useLayoutStore((s) => s.sidebarOpen);
  const storeToggleSidebar = useLayoutStore((s) => s.toggleSidebar);

  // Theme state
  const uiTheme = useLayoutStore((s) => s.uiTheme); // 'light' | 'brand'
  const toggleTheme = useLayoutStore((s) => s.toggleTheme);
  const isBrand = uiTheme === 'brand';

  // Back-compat: support parent-managed sidebar if props were provided
  const isSidebarOpen =
    typeof props?.isSidebarOpen === 'boolean' ? props.isSidebarOpen : storeSidebarOpen;
  const toggleSidebar =
    typeof props?.toggleSidebar === 'function' ? props.toggleSidebar : storeToggleSidebar;

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

  // Reusable styles for small round icon buttons on the right
  const iconBtnClass = [
    'inline-flex items-center justify-center w-10 h-10 rounded-md border transition',
    isBrand ? 'border-white/25 hover:bg-white/10 text-white' : 'border-gray-300 hover:bg-gray-100 text-gray-700',
  ].join(' ');

  return (
    <div className="header">
      <nav
        className="px-6 py-[10px] flex items-center justify-between shadow-sm border-b sticky top-0 z-30"
        style={{
          backgroundColor: isBrand ? BRAND_RGB : '#ffffff',
          borderColor: isBrand ? 'rgba(255,255,255,0.2)' : '#D1D5DB',
          color: isBrand ? '#ffffff' : '#111827',
        }}
      >
        {/* Mobile hamburger / X */}
        <button
          type="button"
          onClick={toggleSidebar}
          className={[
            'lg:hidden',
            'inline-flex items-center justify-center w-10 h-10 rounded-md border',
            isBrand ? 'border-white/25 hover:bg-white/10 text-white' : 'border-gray-300 hover:bg-gray-100 text-gray-700',
          ].join(' ')}
          aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
          aria-controls="mobile-sidebar"
          aria-expanded={!!isSidebarOpen}
        >
          {isSidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>

        {/* Center (lg: left) - optional logo */}
        <div className="flex-1 flex justify-center lg:justify-start">
          <Link to="/dashboard" className="hidden lg:inline-block">
            <img
              src="/assets/images/logo-dash.png"
              alt="Soundhive"
              className="h-6 w-auto"
              // If your logo is dark, you can uncomment the line below to make it visible on brand bg
              // style={{ filter: isBrand ? 'brightness(0) invert(1)' : 'none' }}
            />
          </Link>
        </div>

        {/* Right cluster */}
        <ul className="flex ml-auto items-center">
          {/* Notifications */}
          <li className="dropdown stopevent mr-2">
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
              className="dropdown-menu dropdown-menu-lg lg:left-auto lg:right-0"
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

          {/* Theme switcher (right beside bell) */}
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

          {/* User */}
          <li className="dropdown ml-2">
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
                  <img
                    alt="avatar"
                    src={user.profile_image}
                    className="rounded-full w-10 h-10 object-cover"
                  />
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
            <div className="dropdown-menu dropdown-menu-end p-2" aria-labelledby="dropdownUser">
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
