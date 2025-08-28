// src/pages/dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // ⬅️ no navigate here
import Navbar from '../../components/layout/Navbar';
import Sidebar from '../../components/layout/Sidebar';
import Footer from '../../components/layout/Footer';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('deposits');
  const [selectedPeriod, setSelectedPeriod] = useState('Today');

  // ✅ these were referenced but not declared; define them to avoid state calls on undefined setters
  const [highlightInflow, setHighlightInflow] = useState(false);
  const [highlightOutflow, setHighlightOutflow] = useState(false);

  const toggleSidebar = () => setSidebarOpen((v) => !v);

  const transactions = [
    { transactionId: 'TX123456', sender: 'Christopher Owen', senderBank: 'GTBank', amount: '₦100,000', receiver: 'Christopher Owen', date: '12/01/2025, 12:01pm', status: 'Completed', type: 'deposits' },
    { transactionId: 'TX123457', sender: 'Christopher Owen', senderBank: 'First Bank', amount: '₦100,000', receiver: 'Christopher Owen', date: '12/01/2025, 12:01pm', status: 'Rejected', type: 'withdrawals' },
    { transactionId: 'TX123458', sender: 'Christopher Owen', senderBank: 'Fidelity Bank', amount: '₦100,000', receiver: 'Christopher Owen', date: '12/01/2025, 12:01pm', status: 'Completed', type: 'deposits' },
    { transactionId: 'TX123459', sender: 'Christopher Owen', senderBank: 'Fidelity Bank', amount: '₦100,000', receiver: 'Christopher Owen', date: '12/01/2025, 12:01pm', status: 'Completed', type: 'withdrawals' },
  ];
  const filteredTransactions = transactions.filter(t => t.type === activeTab);

  const fetchTransactionData = async () => ({
    inflow:  [500000, 1200000, 1500000, 2500000, 2900000, 3000000, 3200000],
    outflow: [100000,  300000,  700000, 1500000, 1800000, 2400000, 2600000],
    periods: ['12/01/2025', '12/02/2025', '12/03/2025'],
  });

  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      { label: 'Inflow',  data: [], borderColor: 'green', backgroundColor: 'rgba(0, 255, 0, 0.2)', fill: true, tension: 0.4, borderWidth: 1 },
      { label: 'Outflow', data: [], borderColor: 'red',   backgroundColor: 'rgba(255, 0, 0, 0.2)', fill: true, tension: 0.4, borderWidth: 1 },
    ],
  });

  // ✅ run once; do NOT depend on highlight states or you'll create re-renders on hover
  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await fetchTransactionData();
      if (!mounted) return;

      setChartData({
        labels: ['12:00am', '4:00am', '8:00am', '12:00pm', '4:00pm', '8:00pm', '11:59pm'],
        datasets: [
          { label: 'Inflow',  data: data.inflow,  borderColor: 'green', backgroundColor: 'rgba(0, 255, 0, 0.2)', fill: true, tension: 0.4, borderWidth: 1 },
          { label: 'Outflow', data: data.outflow, borderColor: 'red',   backgroundColor: 'rgba(255, 0, 0, 0.2)', fill: true, tension: 0.4, borderWidth: 1 },
        ],
      });
      setSelectedPeriod(data.periods[0]);
    })();
    return () => { mounted = false; };
  }, []);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { beginAtZero: true },
      y: {
        min: 500000,
        max: 3000000,
        ticks: {
          callback: (value) => (value >= 1000000 ? value / 1000000 + 'M' : value / 1000 + 'K'),
        },
      },
    },
  };

  return (
    <main>
      <div id="app-layout" className="overflow-x-hidden flex bg-white border-t border-gray-300">
        <Sidebar isOpen={sidebarOpen} />

        <div id="app-layout-content" className="relative min-h-screen w-full min-w-[100vw] md:min-w-0 ml-[15.625rem] [transition:margin_0.25s_ease-out]">
          <Navbar toggleSidebar={toggleSidebar} isSidebarOpen={sidebarOpen} />

          <div className="px-6 pb-20 pt-6">
            <div className="flex items-center mb-6 justify-between -mx-6 start-full end-full border-b border-gray-300 pb-4">
              <p className="inline-block text-lg px-6 leading-5 font-semibold">Dashboard</p>
            </div>

            {/* KPIs */}
            <div className="card h-full p-6 bg-white shadow-md rounded-lg mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card h-full p-6 bg-white shadow-md rounded-lg flex flex-col items-center">
                  <p className="text-shadow-indigo-50 text-sm">Soundhive Vest Balance</p>
                  <h3 className="font-bold mt-2 text-lg">₦1,000,000,121.12</h3>
                </div>
                <div className="card h-full p-6 bg-white shadow-md rounded-lg flex flex-col items-center">
                  <p className="text-shadow-indigo-50 text-sm">Escrow Wallet Balance</p>
                  <h3 className="font-bold mt-2 text-lg">₦491,810,091.74</h3>
                </div>
                <div className="card h-full p-6 bg-white shadow-md rounded-lg flex flex-col items-center">
                  <p className="text-shadow-indigo-50 text-sm">Total Inflows</p>
                  <h3 className="font-bold mt-2 text-lg">₦9,000,401,887.90</h3>
                </div>
                <div className="card h-full p-6 bg-white shadow-md rounded-lg flex flex-col items-center">
                  <p className="text-shadow-indigo-50 text-sm">Total Outflows</p>
                  <h3 className="font-bold mt-2 text-lg">₦2,120,816,362.42</h3>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="mb-6 p-8">
              <p className="text-lg font-semibold">Analytics</p>
              <div className="flex justify-end items-center space-x-4">
                <div
                  className="text-green-500 text-lg cursor-pointer"
                  onMouseEnter={() => setHighlightInflow(true)}
                  onMouseLeave={() => setHighlightInflow(false)}
                >
                  <span className="inline-block px-3 py-1 rounded-full" style={{ backgroundColor: 'green', color: 'white' }}>
                    Inflow
                  </span>
                </div>
                <div
                  className="text-red-500 text-lg cursor-pointer"
                  onMouseEnter={() => setHighlightOutflow(true)}
                  onMouseLeave={() => setHighlightOutflow(false)}
                >
                  <span className="inline-block px-3 py-1 rounded-full" style={{ backgroundColor: 'red', color: 'white' }}>
                    Outflow
                  </span>
                </div>

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

            {/* Transactions */}
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
                  {filteredTransactions.map((t) => (
                    <tr key={t.transactionId} className="border-b">
                      <td className="px-6 py-3">{t.transactionId}</td>
                      <td className="px-6 py-3">{t.sender}</td>
                      <td className="px-6 py-3">{t.senderBank}</td>
                      <td className="px-6 py-3">{t.amount}</td>
                      <td className="px-6 py-3">{t.receiver}</td>
                      <td className="px-6 py-3">{t.date}</td>
                      <td className="px-6 py-3">
                        <span className={`px-3 py-1 rounded-full text-white ${t.status === 'Completed' ? 'bg-green-500' : 'bg-red-500'}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
