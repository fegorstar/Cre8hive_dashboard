// src/components/layout/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLogOut, FiBell, FiUser, FiMenu, FiX } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import useLayoutStore from '../../store/LayoutStore';

const Navbar = (props) => {
  const navigate = useNavigate();

  // Auth (pick only what we need)
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Layout store (fallback if props aren't passed)
  const storeSidebarOpen = useLayoutStore((s) => s.sidebarOpen);
  const storeToggleSidebar = useLayoutStore((s) => s.toggleSidebar);

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

  return (
    <div className="header">
      <nav className="bg-white px-6 py-[10px] flex items-center justify-between shadow-sm border-b border-gray-300 sticky top-0 z-30">
        {/* Mobile hamburger / X */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-gray-300"
          aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
          aria-controls="mobile-sidebar"
          aria-expanded={!!isSidebarOpen}
        >
          {isSidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>

        {/* Center (lg: left) - optional logo */}
        <div className="flex-1 flex justify-center lg:justify-start">
          <Link to="/dashboard" className="hidden lg:inline-block">
            <img src="/assets/images/logo-dash.png" alt="Soundhive" className="h-6 w-auto" />
          </Link>
        </div>

        {/* Right cluster */}
        <ul className="flex ml-auto items-center">
          {/* Notifications */}
          <li className="dropdown stopevent mr-2">
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a
              className="text-gray-600"
              href="#"
              role="button"
              id="dropdownNotification"
              data-bs-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false"
            >
              <FiBell className="w-6 h-6" />
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
                  <div className="flex justify-center items-center w-10 h-10 rounded-full bg-gray-400 text-white">
                    {avatarInitials(user?.first_name, user?.last_name)}
                  </div>
                )}
                <div className="absolute border-gray-200 border-2 rounded-full right-0 bottom-0 bg-green-600 h-3 w-3" />
              </div>
              <div className="ml-2 flex flex-col">
                <span className="text-gray-800 font-semibold">
                  {user?.first_name} {user?.last_name}
                </span>
                <span className="text-gray-500 text-sm">{user?.email}</span>
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
