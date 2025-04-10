import React from 'react'; 
import { Link } from 'react-router-dom'; // For navigation between pages
import { FiHome, FiBarChart, FiDollarSign, FiUsers, FiFolder, FiFileText, FiSettings } from 'react-icons/fi'; // Using React Feather icons

const Sidebar = ({ isOpen }) => {
  return (
    <div className={`navbar-vertical navbar bg-white transition-all duration-300 border-t border-gray-300 ${isOpen ? 'block' : 'hidden'}`}>
      <div id="myScrollableElement" className="h-screen border-t border-gray-300">
        {/* Brand Logo */}
        <Link className="navbar-brand" to="/">
          <img src="assets/images/logo-dash.png" alt="Logo" className="w-40 h-auto" />
        </Link>

        {/* Sidebar Nav */}
        <ul className="navbar-nav flex-col">
          {/* Dashboard Section */}
          <li className="nav-item">
            <Link className="nav-link flex items-center" to="/dashboard">
              <FiHome className="w-4 h-4 mr-2" /> Dashboard
            </Link>
          </li>

          {/* Reports Section */}
          <li className="nav-item">
            <Link className="nav-link flex items-center" to="/reports">
              <FiBarChart className="w-4 h-4 mr-2" /> Reports
            </Link>
          </li>

          {/* Investments Section */}
          <li className="nav-item">
            <Link className="nav-link flex items-center" to="/investments">
              <FiDollarSign className="w-4 h-4 mr-2" /> Investments
            </Link>
          </li>

          {/* Reviews Section */}
          <li className="nav-item">
            <Link className="nav-link flex items-center" to="/reviews">
              <FiUsers className="w-4 h-4 mr-2" /> Reviews
            </Link>
          </li>

          {/* Creators Section */}
          <li className="nav-item">
            <Link className="nav-link flex items-center" to="/creators">
              <FiFolder className="w-4 h-4 mr-2" /> Creators
            </Link>
          </li>

          {/* Users Section */}
          <li className="nav-item">
            <Link className="nav-link flex items-center" to="/users">
              <FiUsers className="w-4 h-4 mr-2" /> Users
            </Link>
          </li>

          {/* Transactions Section */}
          <li className="nav-item">
            <Link className="nav-link flex items-center" to="/transactions">
              <FiFileText className="w-4 h-4 mr-2" /> Transactions
            </Link>
          </li>

          {/* Disputes Section */}
          <li className="nav-item">
            <Link className="nav-link flex items-center" to="/disputes">
              <FiFileText className="w-4 h-4 mr-2" /> Disputes
            </Link>
          </li>

          {/* Settings Section */}
          <li className="nav-item">
            <Link className="nav-link flex items-center" to="/settings">
              <FiSettings className="w-4 h-4 mr-2" /> Settings
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
