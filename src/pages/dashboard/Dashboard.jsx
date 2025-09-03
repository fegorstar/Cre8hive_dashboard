import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import Navbar from "../../components/layout/Navbar";
import Sidebar from "../../components/layout/Sidebar";
import Footer from "../../components/layout/Footer";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

/**
 * Register only what we use to keep bundle light.
 * Your Reports view also does targeted registration.
 */
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const BRAND = "#4D3490";

const Dashboard = () => {
  /**
   * Auth: follow the same pattern you already use elsewhere.
   * If there is no token, bounce to "/".
   */
  const navigate = useNavigate();
  const { token } = useAuthStore((s) => s);

  useEffect(() => {
    if (!token) navigate("/");
  }, [token, navigate]);

  /**
   * Sidebar open state (mobile only). On lg+ it’s always visible,
   * but we still keep this state to drive the overlay & hamburger.
   */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen((v) => !v);
  const closeSidebar = () => setSidebarOpen(false);

  /**
   * Tabs & filters
   */
  const [activeTab, setActiveTab] = useState("deposits"); // 'deposits' | 'withdrawals'
  const [selectedPeriod, setSelectedPeriod] = useState("Today");

  /**
   * Demo transactions (replace with API data when ready).
   * Table shape and chips mirror the screenshot + your other tables.
   */
  const transactions = useMemo(
    () => [
      {
        transactionId: "TX123456",
        sender: "Christopher Owen",
        senderBank: "GTBank",
        amount: "₦100,000",
        receiver: "Christopher Owen",
        date: "12/01/2025, 12:01pm",
        status: "Completed",
        type: "deposits",
      },
      {
        transactionId: "TX123457",
        sender: "Christopher Owen",
        senderBank: "First Bank",
        amount: "₦100,000",
        receiver: "Christopher Owen",
        date: "12/01/2025, 12:01pm",
        status: "Rejected",
        type: "withdrawals",
      },
      {
        transactionId: "TX123458",
        sender: "Christopher Owen",
        senderBank: "Fidelity Bank",
        amount: "₦100,000",
        receiver: "Christopher Owen",
        date: "12/01/2025, 12:01pm",
        status: "Completed",
        type: "deposits",
      },
      {
        transactionId: "TX123459",
        sender: "Christopher Owen",
        senderBank: "Fidelity Bank",
        amount: "₦100,000",
        receiver: "Christopher Owen",
        date: "12/01/2025, 12:01pm",
        status: "Completed",
        type: "withdrawals",
      },
    ],
    []
  );

  const filteredTransactions = useMemo(
    () => transactions.filter((t) => t.type === activeTab),
    [transactions, activeTab]
  );

  /**
   * Chart: simple inflow/outflow datasets
   * Matches the time labels in the mock and keeps y-axis legible (K/M).
   */
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });

  useEffect(() => {
    // mock fetch for the chart – swap to real API when ready
    const fetchTransactionData = async () => ({
      inflow: [500000, 1200000, 1500000, 2500000, 2900000, 3000000, 3200000],
      outflow: [100000, 300000, 700000, 1500000, 1800000, 2400000, 2600000],
    });

    (async () => {
      const data = await fetchTransactionData();
      setChartData({
        labels: [
          "12:00am",
          "4:00am",
          "8:00am",
          "12:00pm",
          "4:00pm",
          "8:00pm",
          "11:59pm",
        ],
        datasets: [
          {
            label: "Inflow",
            data: data.inflow,
            borderColor: "green",
            backgroundColor: "rgba(0, 128, 0, 0.12)",
            fill: true,
            tension: 0.4,
            borderWidth: 1.5,
            pointRadius: 0,
          },
          {
            label: "Outflow",
            data: data.outflow,
            borderColor: "red",
            backgroundColor: "rgba(255, 0, 0, 0.12)",
            fill: true,
            tension: 0.4,
            borderWidth: 1.5,
            pointRadius: 0,
          },
        ],
      });
    })();
  }, []);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        tooltip: { mode: "index", intersect: false },
      },
      scales: {
        x: { ticks: { maxRotation: 0 } },
        y: {
          min: 500000,
          max: 3000000,
          ticks: {
            callback: (v) => (v >= 1000000 ? `${v / 1_000_000}M` : `${v / 1_000}K`),
          },
          grid: { color: "rgba(0,0,0,0.05)" },
        },
      },
    }),
    []
  );

  return (
    <main>
      <div id="app-layout" className="overflow-x-hidden flex bg-white border-t border-gray-300">
        {/* Sidebar (controlled on mobile by sidebarOpen) */}
        <Sidebar isOpen={sidebarOpen} />

        {/* Mobile overlay to close the sidebar by clicking outside */}
        <button
          aria-label="Close sidebar"
          onClick={closeSidebar}
          className={`fixed inset-0 bg-black/30 lg:hidden transition-opacity ${
            sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />

        <div
          id="app-layout-content"
          className="relative min-h-screen w-full min-w-[100vw] md:min-w-0 ml-[15.625rem] [transition:margin_0.25s_ease-out]"
        >
          {/* Navbar – pass toggle + state so hamburger reflects reality */}
          <Navbar onToggleSidebar={toggleSidebar} mobileSidebarOpen={sidebarOpen} />

          <div className="px-6 pb-20 pt-6">
            {/* Page header */}
            <div className="flex items-center mb-6 justify-between -mx-6 border-b border-gray-300 pb-4">
              <p className="inline-block text-lg px-6 leading-5 font-semibold">Dashboard</p>
            </div>

            {/* KPI cards */}
            <div className="card h-full p-6 bg-white shadow-md rounded-lg mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  ["Soundhive Vest Balance", "₦1,000,000,121.12"],
                  ["Escrow Wallet Balance", "₦491,810,091.74"],
                  ["Total Inflows", "₦9,000,401,887.90"],
                  ["Total Outflows", "₦2,120,816,362.42"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="card h-full p-6 bg-white shadow-md rounded-lg flex flex-col items-center"
                  >
                    <p className="text-shadow-indigo-50 text-sm">{label}</p>
                    <h3 className="font-bold mt-2 text-lg">{value}</h3>
                  </div>
                ))}
              </div>
            </div>

            {/* Analytics chart */}
            <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <p className="text-lg font-semibold">Analytics</p>
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full text-white"
                    style={{ background: "green" }}
                  >
                    Inflow
                  </span>
                  <span
                    className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full text-white"
                    style={{ background: "red" }}
                  >
                    Outflow
                  </span>

                  <select
                    className="p-2 border border-gray-300 rounded text-sm"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                  >
                    <option>Today</option>
                    <option>This Week</option>
                    <option>This Month</option>
                  </select>
                </div>
              </div>

              <div className="w-full h-[300px]">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* Recent Transactions + tabs */}
            <div className="flex items-center mb-4 justify-between w-full border-b border-gray-300 pb-4">
              <p className="inline-block text-lg leading-5 font-semibold">Recent Transactions</p>

              <div className="flex justify-center space-x-0 flex-grow max-w-[420px]">
                <button
                  className={`px-6 py-2 font-semibold border ${
                    activeTab === "deposits"
                      ? "text-[${BRAND}] text-purple-600 bg-gray-200 rounded-l-full border-gray-200"
                      : "text-black bg-transparent rounded-l-full border-gray-300"
                  }`}
                  onClick={() => setActiveTab("deposits")}
                >
                  Deposits
                </button>
                <button
                  className={`px-6 py-2 font-semibold border ${
                    activeTab === "withdrawals"
                      ? "text-purple-600 bg-gray-200 rounded-r-full border-gray-200"
                      : "text-black bg-transparent rounded-r-full border-gray-300"
                  }`}
                  onClick={() => setActiveTab("withdrawals")}
                >
                  Withdrawals
                </button>
              </div>

              <Link to="/transactions" className="text-indigo-600">
                View all
              </Link>
            </div>

            {/* Transactions table */}
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto text-left text-gray-700">
                <thead className="bg-gray-200">
                  <tr>
                    {[
                      "Transaction ID",
                      "Sender",
                      "Sender Bank",
                      "Amount",
                      "Receiver",
                      "Date Initiated",
                      "Status",
                    ].map((h) => (
                      <th key={h} className="px-6 py-3 whitespace-nowrap text-sm font-semibold">
                        {h}
                      </th>
                    ))}
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
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            t.status === "Completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Graceful empty state */}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-6 text-center text-sm text-gray-500">
                        No {activeTab} yet.
                      </td>
                    </tr>
                  )}
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
