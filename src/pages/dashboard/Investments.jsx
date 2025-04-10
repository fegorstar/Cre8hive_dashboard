import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore'; // Zustand store for auth management
import Navbar from '../../components/layout/Navbar'; // Import Navbar component
import Sidebar from '../../components/layout/Sidebar'; // Import Sidebar component
import Footer from '../../components/layout/Footer'; // Import Footer component

const Investments = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuthStore((state) => state);

  useEffect(() => {
    if (!token) {
      navigate('/login');  // Redirect to login if no token is found
    }
  }, [navigate, token]);

  return (
    <main>
      <div id="app-layout" className="overflow-x-hidden flex bg-white border-t border-gray-300">
        {/* Sidebar */}
        <Sidebar />

        <div id="app-layout-content" className="relative min-h-screen w-full min-w-[100vw] md:min-w-0 ml-[15.625rem] [transition:margin_0.25s_ease-out]">
          {/* Navbar */}
          <Navbar />

          {/* Content Section */}
          <div className="px-6 pb-20 pt-6">
            <div className="flex items-center mb-4 justify-between">
              {/* Title */}
              <h1 className="inline-block xl:text-xl text-lg font-semibold leading-6">Investments</h1>
            </div>

            {/* Content goes here */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">Investment Details</h3>
              <p className="text-gray-700">Here, you will be able to view and manage all investments.</p>
            </div>
          </div>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Investments;
