// src/store/investmentsStore.js
//
// WHAT THIS STORE DOES
// --------------------
// • Wraps all /admin/vests endpoints with Axios.
// • Normalizes the server shapes so the UI can rely on consistent keys.
// • Builds JSON bodies by default and auto-switches to multipart when any
//   image entry is a File object.
// • Treats ANY status that isn’t "CLOSED" as “ACTIVE” for tab filtering.
// • Exposes list (paginated), single fetch, create, update, delete.
//
// ENDPOINTS (NO trailing slash on :id)
// ------------------------------------
// GET    {BASE_URL}/admin/vests?page=1
// GET    {BASE_URL}/admin/vests/:id
// POST   {BASE_URL}/admin/vests
// PUT    {BASE_URL}/admin/vests/:id
// DELETE {BASE_URL}/admin/vests/:id
//
// PAYLOAD NOTES
// -------------
// • We NEVER force vest_for to lowercase. If you provide it, we send it UPPERCASE.
// • If you omit vest_for in your payload, we don’t send it at all (prevents “selected
//   vest for is invalid” when backend expects one of a fixed set).
// • Arrays (news/highlights/images) are kept as-is. For multipart, they’re appended as
//   images[] / news[] / highlights[].
// • We try to map common alternative API field names for counts/amounts/dates so the UI
//   “just works” regardless of backend naming.

import { create } from "zustand";
import axios from "axios";
import { BASE_URL } from "../config";

/* ------------------------------- axios ------------------------------- */

const api = axios.create({ baseURL: BASE_URL.replace(/\/$/, "") });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  config.headers = config.headers || {};
  config.headers.Accept = "application/json";
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ------------------------ response extraction helpers ------------------------ */

const extractArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  return [];
};

const extractObject = (res) => {
  const d = res?.data;
  if (d && typeof d === "object" && !Array.isArray(d)) {
    if (d.data && typeof d.data === "object" && !Array.isArray(d.data)) return d.data;
    return d;
  }
  const arr = extractArray(res);
  return arr[0] || null;
};

const extractMeta = (res) => {
  const d = res?.data?.data || {};
  return {
    current_page: Number(d.current_page) || 1,
    last_page: Number(d.last_page) || 1,
    per_page: Number(d.per_page) || 10,
    total: Number(d.total) || (Array.isArray(d.data) ? d.data.length : 0),
  };
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
};

/* -------------------------- normalization helpers -------------------------- */

// Map API status → UI tab ("ACTIVE" | "CLOSED").
// Anything that is NOT exactly "CLOSED" is considered "ACTIVE" (e.g. FUNDED/OPEN).
const toUiStatus = (s) => (String(s || "").toUpperCase() === "CLOSED" ? "CLOSED" : "ACTIVE");

// Convert a raw API object to our view model.
const decorateVest = (raw = {}) => {
  const statusRaw = String(raw.status || "").toUpperCase();

  // Images & links
  const images = Array.isArray(raw.images) ? raw.images : [];
  const news = Array.isArray(raw.news) ? raw.news : [];
  const highlights = Array.isArray(raw.highlights || raw.key_highlights)
    ? (raw.highlights || raw.key_highlights)
    : [];

  // Investor counts (support several possible backend keys)
  const active_investors =
    raw.active_investors ??
    raw.active_investors_count ??
    raw.activeInvestors ??
    raw.activeInvestorsCount ??
    0;

  const investors_count =
    raw.investors_count ??
    raw.total_investors ??
    raw.no_of_investors ??
    raw.number_of_investors ??
    active_investors ??
    0;

  // Money / aggregate volumes (support variant keys)
  const invested_value =
    Number(raw.invested_value ?? raw.total_invested ?? raw.investedValue ?? 0) || 0;

  const active_investment_volume =
    Number(
      raw.active_investment_volume ??
        raw.volume_of_active_investment ??
        raw.activeVolume ??
        0
    ) || 0;

  const paid_out_volume =
    Number(
      raw.paid_out_volume ??
        raw.volume_of_paid_out_investment ??
        raw.paidOutVolume ??
        0
    ) || 0;

  const paid_out_investors =
    Number(
      raw.paid_out_investors ??
        raw.paid_out_investors_count ??
        raw.paidOutInvestors ??
        0
    ) || 0;

  // Dates
  const closing_date = raw.closing_date ?? raw.closed_at ?? raw.closingDate ?? null;

  return {
    // main identifiers
    id: raw.id != null ? Number(raw.id) : undefined,
    vest_for: String(raw.vest_for || "").toUpperCase(), // "ARTIST" | "PROMOTER"
    beneficiary_name: raw.beneficiary_name || "",
    investment_name: raw.investment_name || "",

    // numbers as strings (we keep text to avoid flicker in inputs)
    minimum_amount: raw.minimum_amount != null ? String(raw.minimum_amount) : "",
    roi: raw.roi != null ? String(raw.roi) : "",
    duration: raw.duration != null ? String(raw.duration) : "",

    // text
    description: raw.description || "",
    risk_assessment: raw.risk_assessment || "",

    // media / lists
    images,
    news,
    highlights,

    // aggregates
    active_investors: Number(active_investors) || 0,
    investors_count: Number(investors_count) || 0,
    invested_value,
    active_investment_volume,
    paid_out_volume,
    paid_out_investors,

    // status & timestamps
    status: statusRaw,
    status_ui: toUiStatus(statusRaw),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    closing_date,
    createdAtReadable: fmtDate(raw.created_at),
    updatedAtReadable: fmtDate(raw.updated_at),
    closingDateReadable: fmtDate(closing_date),

    _raw: raw,
  };
};

// Build JSON or multipart body depending on presence of File objects.
const buildBody = (payload = {}) => {
  const hasFiles =
    Array.isArray(payload.images) && payload.images.some((x) => x && typeof x !== "string");

  // JSON path
  if (!hasFiles) {
    const clean = { ...payload };

    // only send vest_for if provided, in UPPERCASE (avoid backend validation errors)
    if (clean.vest_for) clean.vest_for = String(clean.vest_for).toUpperCase();

    if (Array.isArray(clean.news)) clean.news = clean.news.filter((n) => String(n || "").trim());
    if (Array.isArray(clean.highlights))
      clean.highlights = clean.highlights.filter((t) => String(t || "").trim());

    return { body: clean, isMultipart: false };
  }

  // multipart path
  const fd = new FormData();
  const appendMaybe = (k, v) => {
    if (v === undefined || v === null || v === "") return;
    fd.append(k, v);
  };

  appendMaybe("vest_for", payload.vest_for && String(payload.vest_for).toUpperCase());
  appendMaybe("beneficiary_name", payload.beneficiary_name);
  appendMaybe("investment_name", payload.investment_name);
  if (payload.minimum_amount !== undefined) fd.append("minimum_amount", String(payload.minimum_amount));
  if (payload.roi !== undefined) fd.append("roi", String(payload.roi));
  if (payload.duration !== undefined) fd.append("duration", String(payload.duration));
  appendMaybe("description", payload.description);
  appendMaybe("risk_assessment", payload.risk_assessment);
  appendMaybe("status", payload.status);

  // images[] (URLs and Files)
  (payload.images || []).forEach((item) => {
    if (item && typeof item !== "string") fd.append("images[]", item);
    else if (item && typeof item === "string") fd.append("images[]", item);
  });

  (payload.news || [])
    .filter((n) => String(n || "").trim())
    .forEach((n) => fd.append("news[]", n));

  (payload.highlights || [])
    .filter((t) => String(t || "").trim())
    .forEach((t) => fd.append("highlights[]", t));

  return { body: fd, isMultipart: true };
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

/* --------------------------------- store -------------------------------- */

const useInvestmentsStore = create((set, get) => ({
  vests: [],
  meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
  loading: false,
  error: null,

  // Summary metrics (computed from current loaded page; used by header cards)
  summary: {
    totalMinValue: 0,
    curatedCount: 0,
    investorCount: 0,
    activeCount: 0,
    closedCount: 0,
  },

  /* ------------------------------ LIST (paginated) ------------------------------ */
  fetchVests: async (page = 1) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/admin/vests`, { params: { page } });

      const arr = extractArray(res).map(decorateVest);
      const meta = extractMeta(res);

      // header stats from CURRENT page
      const totalMinValue = arr.reduce((sum, r) => sum + (parseFloat(r.minimum_amount) || 0), 0);
      const activeCount = arr.filter((r) => r.status_ui === "ACTIVE").length;
      const closedCount = arr.filter((r) => r.status_ui === "CLOSED").length;
      const curatedCount = arr.length;
      const investorCount = arr.reduce((sum, r) => sum + (Number(r.active_investors) || 0), 0);

      set({
        vests: arr,
        meta,
        summary: { totalMinValue, curatedCount, investorCount, activeCount, closedCount },
        loading: false,
      });
    } catch (err) {
      console.error("fetchVests:", err);
      set({ error: getErrorMessage(err, "Failed to fetch investments."), loading: false });
      throw err;
    }
  },

  /* --------------------------------- SINGLE --------------------------------- */
  fetchVest: async (id) => {
    set({ error: null });
    try {
      const res = await api.get(`/admin/vests/${id}`); // no trailing slash
      const obj = extractObject(res);
      if (!obj) throw new Error("Investment not found");
      return decorateVest(obj);
    } catch (err) {
      console.error("fetchVest:", err);
      throw new Error(getErrorMessage(err, "Failed to fetch investment."));
    }
  },

  /* --------------------------------- CREATE --------------------------------- */
  createVest: async (payload = {}) => {
    set({ loading: true, error: null });
    try {
      const { body, isMultipart } = buildBody(payload);
      const res = await api.post(`/admin/vests`, body, {
        headers: isMultipart ? { "Content-Type": "multipart/form-data" } : undefined,
      });

      const created = decorateVest(extractObject(res));
      // Optimistically add to the current page
      set((s) => {
        const list = [created, ...s.vests];
        const meta = { ...s.meta, total: s.meta.total + 1 };
        const totalMinValue = list.reduce((sum, r) => sum + (parseFloat(r.minimum_amount) || 0), 0);
        const activeCount = list.filter((r) => r.status_ui === "ACTIVE").length;
        const closedCount = list.filter((r) => r.status_ui === "CLOSED").length;
        const curatedCount = list.length;
        const investorCount = list.reduce((sum, r) => sum + (Number(r.active_investors) || 0), 0);
        return {
          vests: list,
          meta,
          summary: { totalMinValue, curatedCount, investorCount, activeCount, closedCount },
          loading: false,
        };
      });

      return created;
    } catch (err) {
      console.error("createVest:", err);
      set({ error: getErrorMessage(err, "Failed to create investment."), loading: false });
      throw new Error(getErrorMessage(err));
    }
  },

  /* --------------------------------- UPDATE --------------------------------- */
  updateVest: async (id, payload = {}) => {
    set({ loading: true, error: null });
    try {
      const { body, isMultipart } = buildBody(payload);
      const res = await api.put(`/admin/vests/${id}`, body, {
        headers: isMultipart ? { "Content-Type": "multipart/form-data" } : undefined,
      });

      const updated = decorateVest({ ...extractObject(res), id });
      set((s) => {
        const list = (s.vests || []).map((v) => (Number(v.id) === Number(id) ? { ...v, ...updated } : v));
        const totalMinValue = list.reduce((sum, r) => sum + (parseFloat(r.minimum_amount) || 0), 0);
        const activeCount = list.filter((r) => r.status_ui === "ACTIVE").length;
        const closedCount = list.filter((r) => r.status_ui === "CLOSED").length;
        const curatedCount = list.length;
        const investorCount = list.reduce((sum, r) => sum + (Number(r.active_investors) || 0), 0);
        return { vests: list, summary: { totalMinValue, curatedCount, investorCount, activeCount, closedCount }, loading: false };
      });

      return updated;
    } catch (err) {
      console.error("updateVest:", err);
      set({ error: getErrorMessage(err, "Failed to update investment."), loading: false });
      throw new Error(getErrorMessage(err));
    }
  },

  /* --------------------------------- DELETE --------------------------------- */
  deleteVest: async (id) => {
    set({ error: null });
    try {
      await api.delete(`/admin/vests/${id}`); // no trailing slash
      set((s) => {
        const list = (s.vests || []).filter((v) => Number(v.id) !== Number(id));
        const meta = { ...s.meta, total: Math.max(0, s.meta.total - 1) };
        const totalMinValue = list.reduce((sum, r) => sum + (parseFloat(r.minimum_amount) || 0), 0);
        const activeCount = list.filter((r) => r.status_ui === "ACTIVE").length;
        const closedCount = list.filter((r) => r.status_ui === "CLOSED").length;
        const curatedCount = list.length;
        const investorCount = list.reduce((sum, r) => sum + (Number(r.active_investors) || 0), 0);
        return { vests: list, meta, summary: { totalMinValue, curatedCount, investorCount, activeCount, closedCount } };
      });
      return { message: "VestDeleted Successfully" };
    } catch (err) {
      console.error("deleteVest:", err);
      throw new Error(getErrorMessage(err, "Failed to delete investment."));
    }
  },
}));

export default useInvestmentsStore;
