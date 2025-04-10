import React, { useState, useEffect } from 'react'; // Added useState for sidebar toggle
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore'; // Zustand store for auth management
import Navbar from '../../components/layout/Navbar'; // Import Navbar component
import Sidebar from '../../components/layout/Sidebar'; // Import Sidebar component
import Footer from '../../components/layout/Footer'; // Import Footer component

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // State to toggle sidebar visibility
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuthStore((state) => state);

  useEffect(() => {
    if (!token) {
      navigate('/');  // Redirect to home if no token is found
    }
  }, [navigate, token]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen); // Toggle the sidebar visibility
  };

  return (
    <main>
      <div id="app-layout" className="overflow-x-hidden flex bg-white border-t border-gray-300">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} />

        <div id="app-layout-content" className="relative min-h-screen w-full min-w-[100vw] md:min-w-0 ml-[15.625rem] [transition:margin_0.25s_ease-out]">
          {/* Navbar */}
          <Navbar toggleSidebar={toggleSidebar} />


          {/* Content Section */}
          <div className="px-6 pb-20 pt-6">
            <div className="flex items-center mb-6 justify-between w-full border-b border-gray-300 pb-4">
              {/* Title */}
              <p className="inline-block text-lg leading-5 font-semibold">Dashboard</p>
            </div>

            {/* Parent Card for 4 Cards */}
            <div className="card h-full p-6 bg-white shadow-md rounded-lg mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: Soundhive Vest Balance */}
                <div className="card h-full p-6 bg-white shadow-md rounded-lg flex flex-col items-center">
                  <p className="text-shadow-indigo-50 text-sm">Soundhive Vest Balance</p>
                  <h3 className="font-bold mt-2 text-lg">₦1,000,000,121.12</h3>
                </div>

                {/* Card 2: Escrow Wallet Balance */}
                <div className="card h-full p-6 bg-white shadow-md rounded-lg flex flex-col items-center">
                  <p className="text-shadow-indigo-50 text-sm">Escrow Wallet Balance</p>
                  <h3 className="font-bold mt-2 text-lg">₦491,810,091.74</h3>
                </div>

                {/* Card 3: Total Inflows */}
                <div className="card h-full p-6 bg-white shadow-md rounded-lg flex flex-col items-center">
                  <p className="text-shadow-indigo-50 text-sm">Total Inflows</p>
                  <h3 className="font-bold mt-2 text-lg">₦9,000,401,887.90</h3>
                </div>

                {/* Card 4: Total Outflows */}
                <div className="card h-full p-6 bg-white shadow-md rounded-lg flex flex-col items-center">
                  <p className="text-shadow-indigo-50 text-sm">Total Outflows</p>
                  <h3 className="font-bold mt-2 text-lg">₦2,120,816,362.42</h3>
                </div>
              </div>
            </div>

            {/* Content After Cards */}
            <div className="xl:col-span-8">
              <div className="card h-full">
                <div className="border-b border-gray-300 px-5 py-3 flex justify-between items-center">
                  <h4>Best Selling Products</h4>
                </div>
                <div className="leading-tight">
                  <div className="relative overflow-x-auto">
                    <table className="text-left w-full whitespace-nowrap">
                      <thead className="bg-gray-200 text-gray-700">
                        <tr>
                          <th className="px-6 py-3">Image</th>
                          <th className="px-6 py-3">Product Name</th>
                          <th className="px-6 py-3">Invoice</th>
                          <th className="px-6 py-3">QTY</th>
                          <th className="px-6 py-3">Price</th>
                          <th className="px-6 py-3">Order Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-gray-300 border-b">
                          <td className="px-6 py-3">
                            <a href="#!">
                              <img src="assets/images/ecommerce/product-1.jpg" alt="Image" className="h-11 w-auto rounded-lg" />
                            </a>
                          </td>
                          <td className="px-6 py-3"><a href="#!">Apple Watch</a></td>
                          <td className="px-6 py-3"><a href="#!" className="text-indigo-600">#21345</a></td>
                          <td className="px-6 py-3">1</td>
                          <td className="px-6 py-3" >$968.09</td>
                          <td className="px-6 py-3">27-08-2023</td>
                        </tr>
                        {/* Add other rows here */}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
