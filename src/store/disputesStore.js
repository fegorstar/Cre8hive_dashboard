// src/store/disputesStore.js
// LIST/SHOW:   {BASE_URL}/admin/dispute[/*]
// UPDATE/RESOLVE: POST {BASE_URL}/admin/dispute/update/{id}  body: { resolve_status: "CLOSED" | "PENDING" }

import { create } from "zustand";
import axios from "axios";
import { BASE_URL } from "../config";

/* ---------- helpers ---------- */

const formatReadableDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
};

const extractArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  return [];
};

const extractMeta = (res) => {
  const p = res?.data?.data || {};
  return {
    current_page: Number(p.current_page) || 1,
    last_page: Number(p.last_page) || 1,
    per_page: Number(p.per_page) || 10,
    total: Number(p.total) || 0,
  };
};

const getErrorMessage = (err, fallback = "Action failed.") => {
  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback;

  const errors = err?.response?.data?.errors;
  if (errors && typeof errors === "object") {
    const firsts = Object.entries(errors)
      .map(([field, arr]) => `${field}: ${Array.isArray(arr) ? arr[0] : arr}`)
      .join(" | ");
    return firsts || msg;
  }
  return msg;
};

const api = axios.create({ baseURL: BASE_URL.replace(/\/$/, "") });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// UI <-> API mapping
const uiToApiStatus = (ui = "pending") =>
  String(ui).toLowerCase() === "resolved" ? "CLOSED" : "PENDING";

const apiToUiStatus = (status, resolve_status) => {
  const s = String(status || "").toUpperCase();
  const rs = String(resolve_status || "").toUpperCase();
  return s === "CLOSED" || rs === "CLOSED" ? "resolved" : "pending";
};

const fullName = (obj) =>
  [obj?.first_name, obj?.last_name].filter(Boolean).join(" ").trim() || obj?.name || "";

/** Decorate a dispute object (loose: don't fill placeholders where info is absent) */
const decorateDispute = (raw = {}, loose = false) => {
  const bookings = raw.bookings || raw.booking || {};
  const service = bookings.service || raw.service || {};
  const creator = service.creator || raw.creator || raw.provider || {};
  const client = bookings.user || raw.client || raw.user || {};
  const initiator = raw.user || raw.initiator || {};

  const or = (val, fallback) => (loose ? (val ?? undefined) : (val ?? fallback));

  const serviceCandidate =
    service.service_name || service.name || service.title || raw.service_name || raw.title || raw.asset?.title;

  const providerCandidate =
    fullName(creator) ||
    [raw.provider?.first_name, raw.provider?.last_name].filter(Boolean).join(" ") ||
    raw.provider_name || raw.service_provider || raw.artist;

  const clientCandidate =
    fullName(client) ||
    [raw.client?.first_name, raw.client?.last_name].filter(Boolean).join(" ") ||
    raw.client_name;

  const initiatorCandidate =
    fullName(initiator) || raw.initiated_by || raw.initiatedBy || raw.raised_by;

  return {
    id: raw.id != null ? Number(raw.id) : undefined,
    status: apiToUiStatus(raw.status, raw.resolve_status),
    serviceName: or(serviceCandidate, "—"),
    providerName: or(providerCandidate, "—"),
    clientName: or(clientCandidate, "—"),
    initiatedBy: or(initiatorCandidate, "—"),
    createdAtReadable: or(formatReadableDateTime(raw.created_at || raw.createdAt), "—"),
    _raw: raw,
  };
};

const useDisputesStore = create((set, get) => ({
  disputes: [],
  meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
  loading: false,
  error: null,

  currentStatus: "pending",

  // GET {BASE_URL}/admin/dispute?status=PENDING|CLOSED&page=1
  fetchDisputes: async ({ status = "pending", page = 1 } = {}) => {
    set({ loading: true, error: null });
    try {
      const serverStatus = uiToApiStatus(status);
      const res = await api.get(`/admin/dispute`, { params: { status: serverStatus, page } });
      const rows = extractArray(res).map((r) => decorateDispute(r, false));
      const meta = extractMeta(res);
      set({ disputes: rows, meta, currentStatus: status, loading: false });
    } catch (err) {
      console.error("fetchDisputes:", err);
      set({ error: getErrorMessage(err, "Failed to fetch disputes."), loading: false });
      throw err;
    }
  },

  // GET {BASE_URL}/admin/dispute/show/{id}
  getDispute: async (id) => {
    try {
      const res = await api.get(`/admin/dispute/show/${id}`);
      const raw = res?.data?.data || res?.data || {};
      return decorateDispute(raw, true); // loose so we don't overwrite table values with "—"
    } catch (err) {
      console.error("getDispute:", err);
      throw new Error(getErrorMessage(err, "Failed to load dispute details."));
    }
  },

  // POST {BASE_URL}/admin/dispute/update/{id}  body: { resolve_status: "CLOSED" | "PENDING" }
  updateDispute: async (id, payload = {}) => {
    set({ loading: true, error: null });
    try {
      let body = {};
      if (payload && typeof payload === "object" && payload.status) {
        body.resolve_status = String(payload.status).toLowerCase() === "resolved" ? "CLOSED" : "PENDING";
      }
      if (payload && typeof payload === "object" && payload.resolve_status) {
        body.resolve_status = payload.resolve_status;
      }

      await api.post(`/admin/dispute/update/${id}`, body);

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
