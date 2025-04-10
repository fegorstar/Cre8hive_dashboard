import React, { useState, useEffect } from 'react'; // Import useState for handling the tab toggle
import { useNavigate, Link } from 'react-router-dom'; // For navigation between pages
import useAuthStore from '../../store/authStore'; // Zustand store for auth management
import Navbar from '../../components/layout/Navbar'; // Import Navbar component
import Sidebar from '../../components/layout/Sidebar'; // Import Sidebar component
import Footer from '../../components/layout/Footer'; // Import Footer component
import { Line } from 'react-chartjs-2'; // Import the Line chart from react-chartjs-2
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js'; // Import necessary chartjs components

// Register the chart components
ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // State to toggle sidebar visibility
  const [activeTab, setActiveTab] = useState('deposits'); // State to toggle between Deposits and Withdrawals
  const [selectedPeriod, setSelectedPeriod] = useState('Today'); // State to track selected time period
  const navigate = useNavigate();  // useNavigate hook for redirect
  const { token, isAuthenticated } = useAuthStore((state) => state);

  useEffect(() => {
    if (!token) {
      navigate('/');  // Redirect to home if no token is found
    }
  }, [navigate, token]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen); // Toggle the sidebar visibility
  };

  // Transaction Data
  const transactions = [
    {
      transactionId: 'TX123456',
      sender: 'Christopher Owen',
      senderBank: 'GTBank',
      amount: '₦100,000',
      receiver: 'Christopher Owen',
      date: '12/01/2025, 12:01pm',
      status: 'Completed',
      type: 'deposits',
    },
    {
      transactionId: 'TX123457',
      sender: 'Christopher Owen',
      senderBank: 'First Bank',
      amount: '₦100,000',
      receiver: 'Christopher Owen',
      date: '12/01/2025, 12:01pm',
      status: 'Rejected',
      type: 'withdrawals',
    },
    {
      transactionId: 'TX123458',
      sender: 'Christopher Owen',
      senderBank: 'Fidelity Bank',
      amount: '₦100,000',
      receiver: 'Christopher Owen',
      date: '12/01/2025, 12:01pm',
      status: 'Completed',
      type: 'deposits',
    },
    {
      transactionId: 'TX123459',
      sender: 'Christopher Owen',
      senderBank: 'Fidelity Bank',
      amount: '₦100,000',
      receiver: 'Christopher Owen',
      date: '12/01/2025, 12:01pm',
      status: 'Completed',
      type: 'withdrawals',
    },
  ];

  // Filter transactions based on active tab
  const filteredTransactions = transactions.filter(
    (transaction) => transaction.type === activeTab
  );

  // Chart Data for React-Chart.js
  const chartData = {
    labels: ['12:00am', '4:00am', '8:00am', '12:00pm', '4:00pm', '8:00pm', '11:59pm'],
    datasets: [
      {
        label: 'Inflow',
        data: [1000000, 1500000, 2000000, 2200000, 2500000, 2700000, 3000000],
        borderColor: 'green',
        backgroundColor: 'rgba(0, 255, 0, 0.2)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Outflow',
        data: [500000, 800000, 1200000, 1600000, 2000000, 2300000, 2700000],
        borderColor: 'red',
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Chart Options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
      },
      y: {
        ticks: {
          callback: function (value) {
            return value / 1000 + 'k'; // Format the y-axis to show values in "k" (thousands)
          },
        },
      },
    },
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

            {/* Chart Section */}
            <div className="mb-6 p-8">
              <p className="text-lg font-semibold">Analytics</p>
              <div className="flex justify-end items-center space-x-4">
                {/* Dropdown for time period */}
                <select
                  className="p-2 border border-gray-300 rounded"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                </select>
              </div>
              <Line data={chartData} options={chartOptions} height={300} width={600} />
            </div>

            {/* Tabs for Deposits and Withdrawals */}
            <div className="flex items-center mb-6 justify-between w-full border-b border-gray-300 pb-4">
              <p className="inline-block text-lg leading-5 font-semibold">Recent Transactions</p>
              <div className="flex justify-center space-x-8 flex-grow">
                <button
                  className={`px-6 py-2 font-semibold ${activeTab === 'deposits' ? 'text-purple-600 bg-gray-200 rounded-l-full' : 'text-black bg-transparent border border-gray-300 rounded-l-full'}`}
                  onClick={() => setActiveTab('deposits')}
                >
                  Deposits
                </button>
                <button
                  className={`px-6 py-2 font-semibold ${activeTab === 'withdrawals' ? 'text-purple-600 bg-gray-200 rounded-r-full' : 'text-black bg-transparent border border-gray-300 rounded-r-full'}`}
                  onClick={() => setActiveTab('withdrawals')}
                >
                  Withdrawals
                </button>
              </div>
              <Link to="/transactions" className="text-indigo-600">View all</Link>
            </div>

            {/* Transaction Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto text-left text-gray-700">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-6 py-3 whitespace-nowrap">Transaction ID</th>
                    <th className="px-6 py-3 whitespace-nowrap">Sender</th>
                    <th className="px-6 py-3 whitespace-nowrap">Sender Bank</th>
                    <th className="px-6 py-3 whitespace-nowrap">Amount</th>
                    <th className="px-6 py-3 whitespace-nowrap">Receiver</th>
                    <th className="px-6 py-3 whitespace-nowrap">Date Initiated</th>
                    <th className="px-6 py-3 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.transactionId} className="border-b">
                      <td className="px-6 py-3">{transaction.transactionId}</td>
                      <td className="px-6 py-3">{transaction.sender}</td>
                      <td className="px-6 py-3">{transaction.senderBank}</td>
                      <td className="px-6 py-3">{transaction.amount}</td>
                      <td className="px-6 py-3">{transaction.receiver}</td>
                      <td className="px-6 py-3">{transaction.date}</td>
                      <td className="px-6 py-3">
                        <span className={`px-3 py-1 rounded-full text-white ${transaction.status === 'Completed' ? 'bg-green-500' : 'bg-red-500'}`}>
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
