// src/store/disputesStore.js
// Disputes store
// ✅ Endpoints (based on BASE_URL): 
//    - GET  {BASE_URL}/dispute?status=pending&page=1
//    - GET  {BASE_URL}/dispute/show/{id}
//    - PUT  {BASE_URL}/dispute/update/{id}
// ✅ Handles Laravel paginator: { status, data: { current_page, data: [...], ... } }
// ✅ Human-friendly error messages
// ✅ Decorates items for the UI (safe/fallback mapping)
// ✅ Preserves current filter + page after updates

import { create } from "zustand";
import axios from "axios";
import { BASE_URL } from "../config";

/* ---------------- helpers ---------------- */

// "26 Jul, 2025 • 12:01pm"
const formatReadableDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
};

// Extract array from Laravel paginator/wrapper
const extractArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data; // paginator
  return [];
};

// Extract meta from paginator
const extractMeta = (res) => {
  const p = res?.data?.data || {};
  return {
    current_page: Number(p.current_page) || 1,
    last_page: Number(p.last_page) || 1,
    per_page: Number(p.per_page) || 10,
    total: Number(p.total) || 0,
  };
};

// Error message
const getErrorMessage = (err, fallback = "Action failed.") => {
  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback;

  const errors = err?.response?.data?.errors;
  if (errors && typeof errors === "object") {
    const firsts = Object.entries(errors)
      .map(([field, arr]) => {
        const v = Array.isArray(arr) ? arr[0] : arr;
        return `${field}: ${v}`;
      })
      .join(" | ");
    return firsts || msg;
  }
  return msg;
};

// Axios instance with token
const api = axios.create({
  baseURL: BASE_URL.replace(/\/$/, ""),
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize one dispute object to UI shape
const decorateDispute = (raw = {}) => {
  // Safely pick service/provider/client names from common shapes or fallbacks
  const serviceName =
    raw.service?.name ||
    raw.service?.title ||
    raw.service_name ||
    raw.asset?.title ||
    raw.title ||
    "—";

  const providerName =
    raw.provider?.name ||
    [raw.provider?.first_name, raw.provider?.last_name].filter(Boolean).join(" ") ||
    raw.provider_name ||
    raw.service_provider ||
    raw.artist ||
    "—";

  const clientName =
    raw.client?.name ||
    [raw.client?.first_name, raw.client?.last_name].filter(Boolean).join(" ") ||
    raw.client_name ||
    raw.user?.name ||
    raw.customer ||
    "—";

  const initiatedBy =
    raw.initiated_by ||
    raw.initiatedBy ||
    raw.initiator ||
    raw.raised_by ||
    "—";

  return {
    id: Number(raw.id),
    status: (raw.status || "").toString().toLowerCase() || "pending",
    serviceName,
    providerName,
    clientName,
    initiatedBy,
    createdAtReadable: formatReadableDateTime(raw.created_at || raw.createdAt),
    // keep the raw for view modal if needed
    _raw: raw,
  };
};

const useDisputesStore = create((set, get) => ({
  disputes: [],
  meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
  loading: false,
  error: null,

  // Track current filter to refresh after update
  currentStatus: "pending",

  // Fetch list (server paginated)
  fetchDisputes: async ({ status = "pending", page = 1 } = {}) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/dispute`, {
        params: { status, page },
      });

      const rows = extractArray(res).map(decorateDispute);
      const meta = extractMeta(res);

      set({
        disputes: rows,
        meta,
        currentStatus: status,
        loading: false,
      });
    } catch (err) {
      console.error("fetchDisputes:", err);
      set({ error: getErrorMessage(err, "Failed to fetch disputes."), loading: false });
      throw err;
    }
  },

  // Get single dispute (for view modal)
  getDispute: async (id) => {
    try {
      const res = await api.get(`/dispute/show/${id}`);
      const raw = res?.data?.data || res?.data;
      return decorateDispute(raw);
    } catch (err) {
      console.error("getDispute:", err);
      throw new Error(getErrorMessage(err, "Failed to load dispute details."));
    }
  },

  // Update dispute (e.g. status, note). After success -> refresh current page & filter.
  updateDispute: async (id, payload = {}) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/dispute/update/${id}`, payload);

      // refetch list with same status + current page
      const { currentStatus, meta } = get();
      await get().fetchDisputes({
        status: currentStatus,
        page: meta.current_page || 1,
      });

      set({ loading: false });
      return { message: "Dispute updated successfully" };
    } catch (err) {
      console.error("updateDispute:", err);
      const message = getErrorMessage(err, "Failed to update dispute.");
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },
}));

export default useDisputesStore;
