import { create } from "zustand";
import axios from "axios";
import { BASE_URL } from "../config";

/* ---------------- helpers ---------------- */
const formatReadableDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
};

const extractArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  const maybe = d?.data?.data;
  if (Array.isArray(maybe)) return maybe;
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

// UI <-> API status mapping
const uiToApiListStatus = (ui = "pending") =>
  String(ui).toLowerCase() === "resolved" ? "RESOLVED" : "PENDING";

const apiToUiStatus = (statusOrResolve) => {
  const val = String(statusOrResolve || "").toUpperCase();
  if (val === "RESOLVED" || val === "CLOSED") return "resolved";
  return "pending"; // OPEN / PENDING / anything else → pending
};

const fullName = (obj) =>
  [obj?.first_name, obj?.last_name].filter(Boolean).join(" ").trim() || obj?.name || "";

/** Decorate a dispute object for table consumption */
const decorateDispute = (raw = {}, loose = false) => {
  const bookings = raw.bookings || raw.booking || {};
  const service = bookings.service || raw.service || {};
  const creator = service.creator || raw.creator || raw.provider || {};
  const client = bookings.user || raw.client || raw.user || {};
  const initiator = raw.user || raw.initiator || {};

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

  const initiatorCandidate = fullName(initiator) || raw.initiated_by || raw.initiatedBy || raw.raised_by;

  const statusSource = raw.resolve_status ?? raw.status;

  return {
    id: raw.id != null ? Number(raw.id) : undefined,
    status: apiToUiStatus(statusSource),
    serviceName: serviceCandidate || (loose ? undefined : ""),
    providerName: providerCandidate || (loose ? undefined : ""),
    clientName: clientCandidate || (loose ? undefined : ""),
    initiatedBy: initiatorCandidate || (loose ? undefined : ""),
    createdAtReadable: formatReadableDateTime(raw.created_at || raw.createdAt) || (loose ? undefined : ""),
    _raw: raw,
  };
};

/* ---------------- store (TABLE ONLY) ---------------- */
const useDisputesStore = create((set, get) => ({
  disputes: [],
  meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
  loading: false,
  error: null,
  currentStatus: "pending",

  fetchDisputes: async ({ status = "pending", page = 1 } = {}) => {
    set({ loading: true, error: null });
    try {
      const serverStatus = uiToApiListStatus(status);
      const res = await api.get(`/admin/dispute`, { params: { status: serverStatus, page } });
      const rows = extractArray(res).map((r) => decorateDispute(r, false));
      const meta = extractMeta(res);
      set({ disputes: rows, meta, currentStatus: status, loading: false });
    } catch (err) {
      set({ error: getErrorMessage(err, "Failed to fetch disputes."), loading: false });
      throw err;
    }
  },

  getDispute: async (id) => {
    try {
      const res = await api.get(`/admin/dispute/show/${id}`);
      const raw = res?.data?.data || res?.data || {};
      return decorateDispute(raw, true);
    } catch (err) {
      throw new Error(getErrorMessage(err, "Failed to load dispute details."));
    }
  },

  updateDispute: async (id, payload = {}) => {
    // Keep list visible; UI may show an overlay but we don't clear anything.
    set({ loading: true, error: null });
    try {
      let body = {};
      if (payload && typeof payload === "object" && payload.status) {
        body.resolve_status = String(payload.status).toLowerCase() === "resolved" ? "CLOSED" : "OPEN";
      }
      if (payload && typeof payload === "object" && payload.resolve_status) {
        body.resolve_status = payload.resolve_status;
      }

      await api.post(`/admin/dispute/update/${id}`, body);

      const { currentStatus, meta } = get();
      await get().fetchDisputes({ status: currentStatus, page: meta.current_page || 1 });

      set({ loading: false });
      return { message: "Dispute updated successfully" };
    } catch (err) {
      const message = getErrorMessage(err, "Failed to update dispute.");
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },
}));

export default useDisputesStore;
