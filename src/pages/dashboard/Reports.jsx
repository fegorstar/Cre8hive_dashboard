// src/pages/dashboard/Reports.jsx
import React from 'react'; 
import Navbar from '../../components/layout/Navbar'; 
import Sidebar from '../../components/layout/Sidebar'; 
import Footer from '../../components/layout/Footer'; 

const Reports = () => {
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
              <h1 className="inline-block xl:text-xl text-lg font-semibold leading-6">Reports</h1>
            </div>

            {/* Placeholder for content */}
            <div className="bg-white p-6 shadow-md rounded-lg">
              <h3 className="text-gray-500 text-sm font-semibold">Report Content Will Go Here</h3>
            </div>
          </div>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Reports;
