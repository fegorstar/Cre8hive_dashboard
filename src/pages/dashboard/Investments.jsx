import React, { useState } from 'react';
import { FaPlus } from 'react-icons/fa'; // Plus icon for "Create New Investment"
import Sidebar from '../../components/layout/Sidebar'; // Sidebar component
import Navbar from '../../components/layout/Navbar'; // Navbar component
import Footer from '../../components/layout/Footer'; // Footer component

const Investments = () => {
  const [activeTab, setActiveTab] = useState('active'); // Active/Closed tab state
  const [isSlideInOpen, setIsSlideInOpen] = useState(false); // State to control the slide-in visibility
  const [loading, setLoading] = useState(false); // For loading state on the button
  const [investments, setInvestments] = useState({
    investmentValue: "₦1,712,909,121.12",
    curatedInvestment: 1918,
    numOfInvestors: 229,
    activeInvestments: [
      {
        investment: 'London Music Fair',
        noOfInvestors: 32,
        minAmount: '₦100,000',
        investedValue: '₦100,000',
        dateCreated: '12/01/2025, 12:01pm',
        closingDate: '12/01/2025, 12:01pm',
      },
      {
        investment: 'Tech Venture Fund',
        noOfInvestors: 18,
        minAmount: '₦200,000',
        investedValue: '₦300,000',
        dateCreated: '12/01/2025, 12:02pm',
        closingDate: '12/01/2025, 12:02pm',
      },
      {
        investment: 'Healthcare Innovation',
        noOfInvestors: 50,
        minAmount: '₦150,000',
        investedValue: '₦150,000',
        dateCreated: '12/01/2025, 12:03pm',
        closingDate: '12/01/2025, 12:03pm',
      },
    ],
    closedInvestments: [
      {
        investment: 'Real Estate Fund',
        noOfInvestors: 15,
        minAmount: '₦250,000',
        investedValue: '₦250,000',
        dateCreated: '01/01/2025, 10:00am',
        closingDate: '01/01/2025, 10:05am',
      },
      {
        investment: 'Startup Equity',
        noOfInvestors: 25,
        minAmount: '₦300,000',
        investedValue: '₦500,000',
        dateCreated: '02/01/2025, 11:00am',
        closingDate: '02/01/2025, 11:30am',
      },
    ]
  });

  const toggleTab = (tab) => {
    setActiveTab(tab);
  };

  const investmentsData = activeTab === 'active' ? investments.activeInvestments : investments.closedInvestments;

  const openSlideIn = () => {
    setIsSlideInOpen(true);
  };

  const closeSlideIn = () => {
    setIsSlideInOpen(false);
  };

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert('Investment Created!');
    }, 2000);
  };

  return (
    <main>
      <div className="overflow-x-hidden flex bg-white border-t border-gray-300">
        {/* Sidebar */}
        <Sidebar />

        <div id="app-layout-content" className="relative min-h-screen w-full min-w-[100vw] md:min-w-0 ml-[15.625rem] [transition:margin_0.25s_ease-out]">
          {/* Navbar */}
          <Navbar />

          {/* Content Section */}
          <div className="px-6 pb-20 pt-6">
            {/* Content Header */}
            <div className="flex items-center mb-6 justify-between -mx-6 start-full end-full border-b border-gray-300 pb-4">
              <p className="inline-block px-6 text-lg leading-5 font-semibold">Investments</p>
            </div>

            {/* Cards Section */}
            <div className="card h-full p-6 bg-white shadow-md rounded-lg mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: Investment Value */}
              <div className="card h-full p-6 bg-white shadow-md rounded-lg flex flex-col items-center">
                <p className="text-shadow-indigo-50 text-sm">Investment Value</p>
                <h3 className="font-bold mt-2 text-lg">{investments.investmentValue}</h3>
              </div>

              {/* Card 2: Curated Investment */}
              <div className="card h-full p-6 bg-white shadow-md rounded-lg flex flex-col items-center">
                <p className="text-shadow-indigo-50 text-sm">Curated Investments</p>
                <h3 className="font-bold mt-2 text-lg">{investments.curatedInvestment}</h3>
              </div>

              {/* Card 3: Number of Investors */}
              <div className="card h-full p-6 bg-white shadow-md rounded-lg flex flex-col items-center">
                <p className="text-shadow-indigo-50 text-sm">Number of Investors</p>
                <h3 className="font-bold mt-2 text-lg">{investments.numOfInvestors}</h3>
              </div>
            </div>

            {/* Tab for Active/Closed Investments */}
            <div className="flex space-x-4 mb-6 justify-between">
              <div className="flex">
                <button
                  className={`px-6 py-2 font-semibold ${activeTab === 'active' ? 'text-purple-600 bg-gray-200 rounded-l-full' : 'text-black bg-transparent border border-gray-300 rounded-l-full'}`}
                  onClick={() => toggleTab('active')}
                >
                  Active Investments
                </button>
                <button
                  className={`px-6 py-2 font-semibold ${activeTab === 'closed' ? 'text-purple-600 bg-gray-200 rounded-r-full' : 'text-black bg-transparent border border-gray-300 rounded-r-full'}`}
                  onClick={() => toggleTab('closed')}
                >
                  Closed Investments
                </button>
              </div>

              {/* Create New Investment Button - Positioned at the far right of the tab */}
              <button
                className="flex items-center text-white py-2 px-4 rounded-lg"
                style={{ backgroundColor: '#4D3490', height: '36px' }}
                onClick={openSlideIn}
              >
                <FaPlus className="mr-2" /> {/* Plus icon */}
                Create New Investment
              </button>
            </div>

            {/* Table Section: Active or Closed Investments */}
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto text-left text-gray-700">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-6 py-3 whitespace-nowrap">Investment</th>
                    <th className="px-6 py-3 whitespace-nowrap">No of Investors</th>
                    <th className="px-6 py-3 whitespace-nowrap">Min Amount</th>
                    <th className="px-6 py-3 whitespace-nowrap">Invested Value</th>
                    <th className="px-6 py-3 whitespace-nowrap">Date Created</th>
                    <th className="px-6 py-3 whitespace-nowrap">Closing Date</th>
                  </tr>
                </thead>
                <tbody>
                  {investmentsData.map((investment, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-6 py-3">{investment.investment}</td>
                      <td className="px-6 py-3">{investment.noOfInvestors}</td>
                      <td className="px-6 py-3">{investment.minAmount}</td>
                      <td className="px-6 py-3">{investment.investedValue}</td>
                      <td className="px-6 py-3">{investment.dateCreated}</td>
                      <td className="px-6 py-3">{investment.closingDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create New Investment Slide-in Section */}
          {isSlideInOpen && (
            <div className="fixed top-0 right-0 w-1/3 h-full bg-white shadow-lg z-50 transition-all duration-500 ease-in-out overflow-y-auto">
              <div className="p-6">
                {/* Close Button on the Left */}
                <button
                  className="absolute top-4 left-4 text-lg text-gray-600"
                  onClick={closeSlideIn}
                >
                  X
                </button>

                {/* Slide-In Content */}
                <h3 className="text-lg font-semibold mb-4 pt-8">Create New Investment</h3>
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold">Investment Name</label>
                    <input type="text" className="w-full p-2 text-sm border rounded" placeholder="e.g London Music Fair" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold">Minimum Amount</label>
                    <input type="text" className="w-full p-2 text-sm border rounded" placeholder="e.g ₦100,000" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold">ROI</label>
                    <input type="text" className="w-full p-2 text-sm border rounded" placeholder="e.g 30%" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold">Duration</label>
                    <input type="text" className="w-full p-2 text-sm border rounded" placeholder="e.g 9 months" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold">About Investment</label>
                    <textarea className="w-full p-2 text-sm border rounded" placeholder="Brief description of the investment" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold">Featured Image</label>
                    <input type="file" className="w-full p-2 text-sm border rounded" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold">Risk Assessment</label>
                    <textarea className="w-full p-2 text-sm border rounded" placeholder="Risk details" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold">Key Highlights</label>
                    <textarea className="w-full p-2 text-sm border rounded" placeholder="Key highlights of the investment" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold">Featured News URL</label>
                    <input type="url" className="w-full p-2 text-sm border rounded" placeholder="e.g https://www.google.com" />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full p-3 rounded-lg text-white transition duration-200"
                    style={{ backgroundColor: '#4D3490' }} // Inline style for custom background color
                    disabled={loading} // Disable the button when loading
                  >
                    {loading ? (
                      <div className="flex justify-center items-center">
                        <svg
                          role="status"
                          className="w-6 h-6 text-white animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 3v3m0 12v3m9-9h-3m-12 0H3"
                          />
                        </svg>
                      </div>
                    ) : (
                      'Create New Investment'
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Investments;
