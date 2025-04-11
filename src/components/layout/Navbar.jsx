import React, { useState } from 'react'; // Import useState for handling the sidebar toggle
import { Link, useNavigate } from 'react-router-dom'; // For navigation between pages
import { FiHome, FiBarChart, FiDollarSign, FiUsers, FiFolder, FiFileText, FiSettings, FiLogOut, FiBell, FiUser } from 'react-icons/fi'; // Using React Feather icons
import useAuthStore from '../../store/authStore'; // Zustand store for auth management
import HamburgerMenu from 'react-hamburger-menu'; // Import the Hamburger menu

const Navbar = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // State to toggle sidebar visibility
  const navigate = useNavigate();  // useNavigate hook for redirect
  const { user, logout } = useAuthStore((state) => state);

  const handleLogout = () => {
    logout();  // Call the logout function from Zustand store
    navigate('/', { replace: true });  // Explicitly navigate to the home page with replace to avoid hash
  };

  // Fallback avatar generation (first and last initial)
  const generateAvatar = (firstName, lastName) => {
    if (!firstName || !lastName) return 'NN'; // Default if name is missing
    return firstName.charAt(0).toUpperCase() + lastName.charAt(0).toUpperCase();
  };

  // Toggle the sidebar visibility
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen); // Toggle sidebar state
  };

  return (
    <div className="header">
      <nav className="bg-white px-6 py-[10px] flex items-center justify-between shadow-sm border-b border-gray-300">
        {/* Hamburger Menu Buttonv */}
        <button
          id="nav-toggle"
          onClick={toggleSidebar} // Toggle sidebar on click
          className="lg:hidden" // Hide on larger screens
        >
         <HamburgerMenu
  isOpen={sidebarOpen}
  menuClicked={toggleSidebar}
  width={30}
  height={20}
  strokeWidth={2}
  color="black"
  animationDuration={0.5}
/>

        </button>

       

        {/* Navbar Nav */}
        <ul className="flex ml-auto items-center">
          {/* Notification Dropdown */}
          <li className="dropdown stopevent mr-2">
            <a className="text-gray-600" href="#" role="button" id="dropdownNotification" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
              {/* Notification Icon */}
              <FiBell className="w-6 h-6" />
            </a>
            <div className="dropdown-menu dropdown-menu-lg lg:left-auto lg:right-0" aria-labelledby="dropdownNotification">
              <div className="border-b px-3 pt-2 pb-3 flex justify-between items-center">
                <span className="text-lg text-gray-800 font-semibold">Notifications</span>
                <a href="#">
                  <span className="text-gray-800 font-semibold">View all</span>
                </a>
              </div>
              <ul className="h-56" data-simplebar="">
                <li className="bg-gray-100 px-3 py-2 border-b">
                  <a href="#">
                    <h5 className="mb-1">New Comment</h5>
                    <p>You have a new comment on your post.</p>
                  </a>
                </li>
                {/* Additional notifications */}
              </ul>
            </div>
          </li>

          {/* Profile Section */}
          <li className="dropdown ml-2">
            <a className="flex items-center cursor-pointer" href="#" role="button" id="dropdownUser" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
              <div className="w-10 h-10 relative">
                {/* Check if user has a profile image */}
                {user?.profile_image ? (
                  <img alt="avatar" src={user?.profile_image} className="rounded-full" />
                ) : (
                  // If no profile image, use the initials as the avatar
                  <div className="flex justify-center items-center w-10 h-10 rounded-full bg-gray-400 text-white">
                    {generateAvatar(user?.first_name, user?.last_name)}
                  </div>
                )}
                <div className="absolute border-gray-200 border-2 rounded-full right-0 bottom-0 bg-green-600 h-3 w-3"></div>
              </div>
              <div className="ml-2 flex flex-col">
                <span className="text-gray-800 font-semibold">{user?.first_name} {user?.last_name}</span>
                <span className="text-gray-500 text-sm">{user?.email}</span>
              </div>
            </a>
            <div className="dropdown-menu dropdown-menu-end p-2" aria-labelledby="dropdownUser">
              <div className="px-4 pb-0 pt-2">
                
                <div className="border-b mt-3 mb-2"></div>
              </div>

              <ul>
                {/* Profile Link */}
                <li>
                  <Link className="dropdown-item" to="/profile">
                    <FiUser className="mr-2" /> Profile
                  </Link>
                </li>
                {/* Logout Button */}
                <li>
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
