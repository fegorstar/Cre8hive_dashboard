// src/components/layout/Sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MdSpaceDashboard,
  MdOutlineBarChart,
  MdOutlineAttachMoney,
  MdOutlinePeopleAlt,
  MdOutlineFolder,
  MdOutlineReceiptLong,
  MdOutlineGavel,
  MdOutlineSettings,
  MdOutlineCategory,
} from 'react-icons/md';
import useAuthStore from '../../store/authStore';

const Sidebar = ({ isOpen }) => {
  const location = useLocation();
  const user = useAuthStore((s) => s.user); // ✅ pick only what you need

  const menuItems = [
    { title: 'Dashboard', path: '/dashboard', icon: MdSpaceDashboard },
    { title: 'Reports', path: '/reports', icon: MdOutlineBarChart },
    { title: 'Investments', path: '/investments', icon: MdOutlineAttachMoney },
    { title: 'Services', path: '/service-categories', icon: MdOutlineCategory },
    { title: 'Reviews', path: '/reviews', icon: MdOutlinePeopleAlt },
    { title: 'Creators', path: '/creators', icon: MdOutlineFolder },
    { title: 'Users', path: '/members', icon: MdOutlinePeopleAlt },
    { title: 'Transactions', path: '/transactions', icon: MdOutlineReceiptLong },
    { title: 'Disputes', path: '/disputes', icon: MdOutlineGavel }, // 👈 here
    { title: 'Settings', path: '/settings', icon: MdOutlineSettings },
  ];

  return (
    <div className={`navbar-vertical navbar bg-white transition-all duration-300 border-t border-gray-300 ${isOpen ? 'block' : 'hidden'} lg:block w-64`}>
      <div id="myScrollableElement" className="h-screen border-t border-gray-300 flex flex-col">
        <div className="flex items-center justify-center pt-2 pb-1">
          <Link to={user ? '/dashboard' : '/'} className="navbar-brand">
            <img src="/assets/images/logo-dash.png" alt="Logo" className="w-32 h-auto" />
          </Link>
        </div>

        <ul className="navbar-nav flex-col space-y-1 px-2 mt-1">
          {menuItems.map(({ title, path, icon: Icon }) => {
            const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
            return (
              <li key={path} className="nav-item group">
                <Link
                  to={path}
                  aria-current={isActive ? 'page' : undefined}
                  className={`nav-link flex items-center px-4 py-3 rounded-md text-base font-medium transition-all ${
                    isActive
                      ? 'bg-[#F1ECFF] text-[#4D3490] border-l-4 border-[#4D3490]'
                      : 'text-[#667085] hover:bg-[#F1ECFF] hover:text-[#4D3490]'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mr-3 transition-colors ${
                      isActive ? 'text-[#4D3490]' : 'text-[#667085] group-hover:text-[#4D3490]'
                    }`}
                  />
                  <span>{title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
