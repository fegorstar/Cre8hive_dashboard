import React, { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const Reports = () => {
  const [selectedMetric, setSelectedMetric] = useState('Total Users');
  const [selectedRange, setSelectedRange] = useState('Today');

  // Dummy graph data mapped to different ranges
  const lineDataMap = {
    Today: [500000, 1500000, 2500000, 3000000, 2000000, 1500000, 700000],
    Yesterday: [400000, 1200000, 2300000, 2800000, 1800000, 1400000, 600000],
    'Last 7 Days': [1000000, 2000000, 3000000, 4000000, 3000000, 2000000, 1000000],
    'Last 30 Days': [800000, 1600000, 2400000, 3200000, 2800000, 1800000, 900000],
  };

  // Line chart data config
  const lineData = {
    labels: ['12:00am', '4:00am', '8:00am', '12:00pm', '4:00pm', '8:00pm', '11:59pm'],
    datasets: [
      {
        label: selectedMetric,
        data: lineDataMap[selectedRange] || [],
        borderColor: '#4D3490',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(77, 52, 144, 0.1)');
          gradient.addColorStop(1, 'rgba(77, 52, 144, 0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Line chart Y-axis options
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 500000,
        max: 5000000,
        ticks: {
          stepSize: 500000,
          callback: (value) => (value >= 1000000 ? `${value / 1000000}M` : `${value / 1000}k`),
        },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  // Doughnut chart data for Users
  const donutData = {
    labels: ['Active users', 'Passive users'],
    datasets: [
      {
        label: 'Users',
        data: [11400, 1000],
        backgroundColor: ['#4D3490', '#E5E5E5'],
        borderWidth: 0,
      },
    ],
  };

  const metricOptions = [
    'Total Users',
    'Premium Users',
    'No of Assets',
    'No of services',
    'No of disputes',
    'No of purchased assets',
    'No of accessed services',
    'No of uploaded songs',
  ];

  const dateOptions = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days'];

  return (
    <main>
      <div className="overflow-x-hidden flex bg-white border-t border-gray-300">
        <Sidebar />

        <div id="app-layout-content" className="relative min-h-screen w-full min-w-[100vw] md:min-w-0 ml-[15.625rem] transition-all duration-250 ease-out">
          <Navbar />

          <div className="px-6 pb-20 pt-6">
            {/* Page Header */}
            <div className="flex items-center mb-6 justify-between -mx-6 border-b border-gray-300 pb-4">
              <p className="inline-block px-6 text-lg leading-5 font-semibold">Reports</p>
            </div>

            {/* Top Statistic Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {[
                { title: 'Total Users', value: '11.7k' },
                { title: 'Premium Users', value: '11,049' },
                { title: 'Number of Assets', value: '1,049' },
                { title: 'Number of Services', value: '2,912' },
                { title: 'Number of purchased assets', value: '19,001' },
                { title: 'Number of accessed services', value: '8,098' },
                { title: 'Number of uploaded songs', value: '18,834' },
                { title: 'Number of disputes', value: '10' },
              ].map((item, idx) => (
                <div key={idx} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">{item.title}</p>
                  <h3 className="text-xl font-bold">{item.value}</h3>
                </div>
              ))}
            </div>

            {/* Analytics + Users Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Analytics Section */}
              <div className="col-span-2 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-semibold">Analytics</h3>
                  {/* Today Dropdown */}
                  <select
                    value={selectedRange}
                    onChange={(e) => setSelectedRange(e.target.value)}
                    className="border text-sm px-3 py-2 rounded-md"
                  >
                    {dateOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Metric Buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {metricOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => setSelectedMetric(option)}
                      style={{
                        backgroundColor: selectedMetric === option ? '#E8DFFF' : '#ffffff',
                        color: selectedMetric === option ? '#4D3490' : '#000000',
                        border: '1px solid #E5E5E5',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {/* Line Chart */}
                <div className="w-full h-[300px]">
                  <Line data={lineData} options={lineOptions} />
                </div>
              </div>

              {/* Users Section */}
              <div className="relative p-6 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col items-center">
                {/* Users Heading */}
                <div className="w-full text-left mb-4">
                  <h3 className="text-md font-semibold">Users</h3>
                </div>

                {/* Donut Chart */}
                <div className="relative w-48 h-48 mb-6">
                  <Doughnut
                    data={donutData}
                    options={{
                      cutout: '75%',
                      plugins: { tooltip: { enabled: true }, legend: { display: false } },
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  />
                  {/* Center Text inside Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <h4 className="text-2xl font-bold">12.4k</h4>
                    <p className="text-xs text-gray-500 mt-1">Total Users</p>
                  </div>
                </div>

                {/* Active and Passive Users Info */}
                <div className="flex justify-around w-full text-xs text-gray-600">
                  {/* Active Users */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-2 h-2 bg-[#4D3490]"></div> {/* Square not round */}
                    <p>Active users</p>
                    <p className="font-bold text-black">11.4k</p>
                  </div>

                  {/* Passive Users */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-2 h-2 bg-gray-300"></div> {/* Square not round */}
                    <p>Passive users</p>
                    <p className="font-bold text-black">1k</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Reports;
