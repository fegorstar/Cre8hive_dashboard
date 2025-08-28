// src/store/ReviewsStore.js
// Reviews store (server-paginated; tolerant to envelope shapes)
//
// Endpoints (conventional; adjust if your backend differs):
//   - GET  /reviews?scope=assets|services|songs&status=pending|published|rejected&page=1&search=
//   - GET  /reviews/show/:id
//   - PUT  /reviews/update/:id   (e.g., { status: "published" } or { status: "rejected" })
//
// Decorates list items into a consistent UI shape. Works with varied payloads.

import { create } from "zustand";
import axios from "axios";
import { BASE_URL } from "../config";

/* ---------- helpers ---------- */
const api = axios.create({
  baseURL: BASE_URL.replace(/\/$/, ""),
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers.Accept = "application/json";
  return config;
});

const money = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `₦${n.toLocaleString()}`;
};

// "12/01/2025, 12:01pm"
const formatReadableDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
};

const extractArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data; // Laravel paginator
  if (Array.isArray(d?.result)) return d.result;
  return [];
};

const extractMeta = (res) => {
  const p = res?.data?.data || {};
  return {
    current_page: Number(p.current_page) || 1,
    last_page: Number(p.last_page) || 1,
    per_page: Number(p.per_page) || 10,
    total: Number(p.total) || extractArray(res).length || 0,
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
      .map(([field, arr]) => {
        const v = Array.isArray(arr) ? arr[0] : arr;
        return `${field}: ${v}`;
      })
      .join(" | ");
    return firsts || msg;
  }
  return msg;
};

/* ---------- normalizer ---------- */
const decorateReview = (raw = {}) => {
  const creatorName =
    raw.creatorName ||
    raw.creator_name ||
    raw.creator ||
    [raw?.creator?.first_name, raw?.creator?.last_name].filter(Boolean).join(" ") ||
    raw?.creator?.name ||
    "—";

  const assetName =
    raw.assetName ||
    raw.asset_name ||
    raw.title ||
    raw.name ||
    raw.asset?.title ||
    raw.service?.name ||
    raw.song?.title ||
    "—";

  const email = raw.email || raw.creator_email || raw?.creator?.email || "—";

  const price =
    raw.price ??
    raw.amount ??
    raw.cost ??
    raw.asset?.price ??
    raw.service?.price ??
    raw.song?.price;

  const isNew =
    raw.is_new ??
    raw.isNew ??
    raw.new ??
    (String(raw?.badge || "").toLowerCase() === "new");

  const submitted =
    raw.submitted_at ||
    raw.created_at ||
    raw.createdAt ||
    raw.date_submitted ||
    raw.date;

  return {
    id: Number(raw.id ?? raw._id ?? Math.random() * 1e9),
    scope:
      raw.scope ||
      (raw.service ? "services" : raw.song ? "songs" : "assets"),
    status: String(raw.status || "pending").toLowerCase(),
    creatorName,
    assetName,
    email,
    price,
    priceReadable: money(price),
    isNew: Boolean(isNew),
    submittedAtReadable: formatReadableDateTime(submitted),
    _raw: raw,
  };
};

/* ---------- store ---------- */
const useReviewsStore = create((set, get) => ({
  reviews: [],
  meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
  loading: false,
  error: null,

  currentScope: "assets",
  currentStatus: "pending",
  currentPage: 1,
  currentQ: "",

  fetchReviews: async ({ scope = "assets", status = "pending", page = 1, q = "" } = {}) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/reviews`, {
        params: { scope, status, page, search: q || undefined },
      });

      const rows = extractArray(res).map(decorateReview);
      const meta = extractMeta(res);

      set({
        reviews: rows,
        meta,
        currentScope: scope,
        currentStatus: status,
        currentPage: page,
        currentQ: q,
        loading: false,
      });
    } catch (err) {
      console.error("fetchReviews:", err);
      set({ error: getErrorMessage(err, "Failed to fetch reviews."), loading: false });
      throw err;
    }
  },

  getReview: async (id) => {
    try {
      const res = await api.get(`/reviews/show/${id}`);
      const raw = res?.data?.data || res?.data;
      return decorateReview(raw);
    } catch (err) {
      console.error("getReview:", err);
      throw new Error(getErrorMessage(err, "Failed to load review details."));
    }
  },

  updateReview: async (id, payload = {}) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/reviews/update/${id}`, payload);

      // refetch with the same filters & page
      const { currentScope, currentStatus, currentPage, currentQ } = get();
      await get().fetchReviews({
        scope: currentScope,
        status: currentStatus,
        page: currentPage,
        q: currentQ,
      });

      set({ loading: false });
      return { message: "Review updated successfully" };
    } catch (err) {
      console.error("updateReview:", err);
      const message = getErrorMessage(err, "Failed to update review.");
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },
}));

export default useReviewsStore;
