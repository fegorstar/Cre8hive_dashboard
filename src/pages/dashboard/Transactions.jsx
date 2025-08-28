// src/pages/dashboard/Transactions.jsx
// UI: primary tabs (Deposits / Withdrawals), range select + Export btn on right, table + pagination.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import useAuthGuard from "../../lib/useAuthGuard";
import { CenterLoader } from "../../components/common/Spinner";
import useTransactionsStore from "../../store/TransactionsStore";
import { FiDownload } from "react-icons/fi";

const BRAND_RGB = "rgb(77, 52, 144)";

/* ---------- Boxed Tabs (like your reviews status tabs) ---------- */
const BoxTabs = ({ value, onChange, tabs }) => (
  <div className="flex items-center gap-2">
    {tabs.map((t) => {
      const active = value === t.key;
      return (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          aria-current={active ? "page" : undefined}
          className={`px-3 py-1.5 text-sm font-medium rounded-md border ${
            active ? "text-white" : "text-gray-700"
          }`}
          style={{
            backgroundColor: active ? BRAND_RGB : "white",
            borderColor: active ? BRAND_RGB : "#E5E7EB",
          }}
        >
          {t.label}
        </button>
      );
    })}
  </div>
);

/* ---------- Status pill ---------- */
const StatusPill = ({ value = "completed" }) => {
  const v = String(value).toLowerCase();
  const map = {
    completed: "bg-green-50 text-green-700 border-green-200",
    success: "bg-green-50 text-green-700 border-green-200",
    pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
  };
  const cls = map[v] || "bg-gray-50 text-gray-700 border-gray-200";
  const label = v[0].toUpperCase() + v.slice(1);
  return (
    <span className={`inline-flex px-2 py-0.5 text-[11px] rounded-full border font-medium ${cls}`}>
      {label}
    </span>
  );
};

/* ---------- Table ---------- */
const TxnTable = ({ rows, footerLeft, footerRight }) => {
  const safe = Array.isArray(rows) ? rows : [];
  const dash = (v) => (v === undefined || v === null || v === "" ? "—" : v);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Transaction ID</th>
              <th className="text-left px-4 py-3 font-semibold">Sender</th>
              <th className="text-left px-4 py-3 font-semibold">Sender bank</th>
              <th className="text-left px-4 py-3 font-semibold">Sender account no</th>
              <th className="text-left px-4 py-3 font-semibold">Amount</th>
              <th className="text-left px-4 py-3 font-semibold">Receiver</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Date initiated</th>
            </tr>
          </thead>
          <tbody>
            {safe.map((t, i) => (
              <tr key={`${t.code}-${i}`} className="border-t border-gray-100">
                <td className="px-4 py-3">{dash(t.code)}</td>
                <td className="px-4 py-3">{dash(t.sender)}</td>
                <td className="px-4 py-3">{dash(t.senderBank)}</td>
                <td className="px-4 py-3">{dash(t.senderAccount)}</td>
                <td className="px-4 py-3">{dash(t.amountReadable)}</td>
                <td className="px-4 py-3">{dash(t.receiver)}</td>
                <td className="px-4 py-3">
                  <StatusPill value={t.status} />
                </td>
                <td className="px-4 py-3">{dash(t.createdAtReadable)}</td>
              </tr>
            ))}

            {safe.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                  No records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-4 py-3 bg-white border-t border-gray-200">
        <div className="text-sm text-gray-600">{footerLeft}</div>
        <div>{footerRight}</div>
      </div>
    </div>
  );
};

/* ---------- Page ---------- */
const Transactions = () => {
  const navigate = useNavigate();
  useAuthGuard(navigate);

  const { items, meta, loading, fetchTransactions } = useTransactionsStore();

  const [kind, setKind] = useState("deposits"); // deposits | withdrawals
  const [range, setRange] = useState("this_week");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchTransactions({ kind, page, per_page: 10, range });
  }, [kind, page, range, fetchTransactions]);

  const rows = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const total = meta?.total || rows.length || 0;
  const totalPages = Math.max(1, Number(meta?.last_page || 1));
  const startIdx =
    total === 0 ? 0 : (Number(meta?.current_page || page) - 1) * Number(meta?.per_page || 10) + 1;
  const endIdx = total === 0 ? 0 : Math.min(startIdx + Number(meta?.per_page || 10) - 1, total);

  const footerLeft =
    total === 0 ? "No records" : `Showing ${startIdx}–${endIdx} of ${total} record${total > 1 ? "s" : ""}`;

  const footerRight = (
    <div className="flex items-center gap-2">
      <button
        disabled={(meta?.current_page || page) <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className={`px-3 py-1.5 rounded-lg border ${
          (meta?.current_page || page) <= 1 ? "text-gray-400 border-gray-200" : "border-gray-300 hover:bg-gray-50"
        }`}
      >
        Prev
      </button>
      <span className="text-sm text-gray-600">
        Page {meta?.current_page || page} / {totalPages}
      </span>
      <button
        disabled={(meta?.current_page || page) >= totalPages}
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        className={`px-3 py-1.5 rounded-lg border ${
          (meta?.current_page || page) >= totalPages ? "text-gray-400 border-gray-200" : "border-gray-300 hover:bg-gray-50"
        }`}
      >
        Next
      </button>
    </div>
  );

  return (
    <main>
      <div className="overflow-x-hidden flex bg-white border-t border-gray-300">
        <Sidebar />
        <div
          id="app-layout-content"
          className="relative min-h-screen w-full min-w-[100vw] md:min-w-0 ml-[15.625rem] [transition:margin_0.25s_ease-out]"
        >
          <Navbar />

          <div className="px-6 pb-20 pt-6">
            {/* Header */}
            <div className="flex items-center mb-4 justify-between -mx-6 border-b border-gray-300 pb-3">
              <p className="inline-block px-6 text-base md:text-lg leading-5 font-semibold">Transactions</p>
            </div>

            {/* Tabs + right controls */}
            <div className="mb-3 bg-white rounded-xl border border-gray-200 px-4 pt-3 pb-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <BoxTabs
                  value={kind}
                  onChange={(k) => {
                    setKind(k);
                    setPage(1);
                  }}
                  tabs={[
                    { key: "deposits", label: "Deposits" },
                    { key: "withdrawals", label: "Withdrawals" },
                  ]}
                />

                <div className="flex items-center gap-3">
                  {/* Range filter */}
                  <select
                    value={range}
                    onChange={(e) => {
                      setPage(1);
                      setRange(e.target.value);
                    }}
                    className="h-9 pr-9 pl-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm"
                  >
                    <option value="today">Today</option>
                    <option value="this_week">This week</option>
                    <option value="this_month">This month</option>
                    <option value="last_30">Last 30 days</option>
                  </select>

                  {/* Export (CSV of current rows) */}
                  <button
                    type="button"
                    onClick={() => {
                      const csv = [
                        [
                          "Transaction ID",
                          "Sender",
                          "Sender bank",
                          "Sender account no",
                          "Amount",
                          "Receiver",
                          "Status",
                          "Date initiated",
                        ],
                        ...rows.map((r) => [
                          r.code,
                          r.sender,
                          r.senderBank,
                          r.senderAccount,
                          r.amountReadable,
                          r.receiver,
                          r.status,
                          r.createdAtReadable,
                        ]),
                      ]
                        .map((a) => a.join(","))
                        .join("\n");
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `transactions_${kind}_${range}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="h-9 px-3 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FiDownload size={16} className="-ml-0.5" />
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Table / Loader */}
            {loading ? <CenterLoader /> : <TxnTable rows={rows} footerLeft={footerLeft} footerRight={footerRight} />}
          </div>

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Transactions;
