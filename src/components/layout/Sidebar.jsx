import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MdSpaceDashboard, MdOutlineBarChart, MdOutlineAttachMoney, MdOutlinePeopleAlt, MdOutlineFolder, MdOutlineReceiptLong, MdOutlineGavel, MdOutlineSettings } from 'react-icons/md';
import useAuthStore from '../../store/authStore'; // Import auth store

const Sidebar = ({ isOpen }) => {
  const location = useLocation();
  const { user } = useAuthStore((state) => state); // Get user session from Zustand

  const menuItems = [
    { title: 'Dashboard', path: '/dashboard', icon: MdSpaceDashboard },
    { title: 'Reports', path: '/reports', icon: MdOutlineBarChart },
    { title: 'Investments', path: '/investments', icon: MdOutlineAttachMoney },
    { title: 'Reviews', path: '/reviews', icon: MdOutlinePeopleAlt },
    { title: 'Creators', path: '/creators', icon: MdOutlineFolder },
    { title: 'Users', path: '/users', icon: MdOutlinePeopleAlt },
    { title: 'Transactions', path: '/transactions', icon: MdOutlineReceiptLong },
    { title: 'Disputes', path: '/disputes', icon: MdOutlineGavel },
    { title: 'Settings', path: '/settings', icon: MdOutlineSettings },
  ];

  return (
    <div className={`navbar-vertical navbar bg-white transition-all duration-300 border-t border-gray-300 ${isOpen ? 'block' : 'hidden'} lg:block w-64`}>
      <div id="myScrollableElement" className="h-screen border-t border-gray-300 flex flex-col">
        
        {/* Logo Section */}
        <div className="flex items-center justify-center pt-2 pb-1">
          <Link to={user ? '/dashboard' : '/'} className="navbar-brand">
            <img src="/assets/images/logo-dash.png" alt="Logo" className="w-32 h-auto" />
          </Link>
        </div>

        {/* Sidebar Navigation */}
        <ul className="navbar-nav flex-col space-y-1 px-2 mt-1">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <li key={index} className="nav-item group">
                <Link
                  to={item.path}
                  className={`nav-link flex items-center px-4 py-3 rounded-md text-base font-medium transition-all ${
                    isActive
                      ? 'bg-[#F1ECFF] text-[#4D3490] border-l-4 border-[#4D3490]'
                      : 'text-[#667085] hover:bg-[#F1ECFF] hover:text-[#4D3490]'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mr-3 transition-colors ${
                      isActive
                        ? 'text-[#4D3490]'
                        : 'text-[#667085] group-hover:text-[#4D3490]'
                    }`}
                  />
                  <span>{item.title}</span>
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
