// src/store/TransactionsStore.js
// Matches UI: tabs (deposits/withdrawals), range filter, pagination, export-ready data.

import { create } from "zustand";
import axios from "axios";
import { BASE_URL } from "../config";

const api = axios.create({ baseURL: BASE_URL.replace(/\/$/, "") });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  config.headers = config.headers || {};
  config.headers.Accept = "application/json";
  if (!config.headers["Content-Type"]) config.headers["Content-Type"] = "application/json";
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const formatMoney = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return "₦0";
  return `₦${num.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
};

const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
};

const extractArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data; // paginator
  return [];
};

const extractMeta = (res, fallback = {}) => {
  const p = res?.data?.data || {};
  return {
    current_page: Number(p.current_page) || fallback.page || 1,
    last_page: Number(p.last_page) || 1,
    per_page: Number(p.per_page) || fallback.per_page || 10,
    total: Number(p.total) || 0,
  };
};

const decorateTxn = (raw = {}) => ({
  id: raw.id ?? raw.txn_id ?? raw.transaction_id ?? undefined,
  code: String(raw.transaction_id || raw.reference || raw.code || raw.id || "—"),
  sender: raw.sender_name || raw.sender || raw.customer || "—",
  senderBank: raw.sender_bank || raw.bank || "—",
  senderAccount: raw.sender_account_number || raw.account_number || "—",
  receiver: raw.receiver_name || raw.receiver || raw.beneficiary || "—",
  amountReadable: formatMoney(raw.amount),
  status: (raw.status || "").toString().toLowerCase() || "completed",
  createdAtReadable: formatDateTime(raw.created_at || raw.createdAt || raw.date_initiated),
  _raw: raw,
});

const useTransactionsStore = create((set, get) => ({
  items: [],
  meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
  loading: false,
  error: null,

  current: { kind: "deposits", range: "this_week", page: 1 },

  fetchTransactions: async ({ kind = "deposits", page = 1, per_page = 10, range = "this_week" } = {}) => {
    set({ loading: true, error: null });
    try {
      // Adjust endpoint/params to your backend if different:
      const res = await api.get("/transactions", {
        params: {
          type: kind,       // 'deposits' | 'withdrawals'
          page,
          perpage: per_page,
          range,            // 'today' | 'this_week' | 'this_month' | ...
        },
      });

      const rows = extractArray(res).map(decorateTxn);
      const meta = extractMeta(res, { page, per_page });

      set({ items: rows, meta, current: { kind, range, page }, loading: false });
    } catch (err) {
      console.error("fetchTransactions:", err);
      set({
        error: err?.response?.data?.message || err?.message || "Failed to fetch transactions.",
        loading: false,
      });
      throw err;
    }
  },
}));

export default useTransactionsStore;
