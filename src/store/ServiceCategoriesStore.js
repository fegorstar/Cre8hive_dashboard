// src/store/ServiceCategoriesStore.js
// Admin Service Categories & Subcategories store
// ✅ Uses src/lib/apiClient.js
// ✅ Categories: { category_name } for create/update
// ✅ Subcategories: { name, category_id } (category_id coerced to integer)
// ✅ Handles Laravel paginator { data: { data: [...] } } and wrapper {status, data:{data:[...]}} patterns
// ✅ Clear error messages from { message, errors }
// ✅ Parents-only in categories; subcategories kept separately

import { create } from "zustand";
import api from "../lib/apiClient";

/* ---------------- helpers ---------------- */

// "26 Jul, 2025"
const formatReadableDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.toLocaleDateString("en-GB", { day: "2-digit" });
  const mon = d.toLocaleDateString("en-GB", { month: "short" });
  const yr = d.getFullYear();
  return `${day} ${mon}, ${yr}`;
};

// Array extractor from raw or paginator
const extractArray = (res) => {
  if (!res) return [];
  const d = res.data;
  if (Array.isArray(d)) return d;                        // plain array
  if (Array.isArray(d?.data)) return d.data;             // { data: [...] }
  if (Array.isArray(d?.data?.data)) return d.data.data;  // { data: { data: [...] } } (Laravel paginator)
  if (Array.isArray(d?.result)) return d.result;         // { result: [...] }
  return [];
};

// Unified human-friendly error
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

// Coerce to an integer safely (no decimals)
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
};

/* ---- decoration: map API <-> UI models ---- */

// API category: { id, category_name, created_at, updated_at }
const decorateCategory = (raw = {}) => ({
  id: Number(raw.id),
  name: raw.category_name ?? raw.name ?? "",
  createdAtReadable: formatReadableDate(raw.created_at || raw.createdAt),
  updatedAtReadable: formatReadableDate(raw.updated_at || raw.updatedAt),
});

// API subcategory: typically { id, name, category_id, created_at, updated_at }
const decorateSubcategory = (raw = {}, parentName) => ({
  id: Number(raw.id),
  name:
    raw.name ??
    raw.sub_category_name ??
    raw.subcategory_name ??
    "",
  parentCategoryId:
    raw.category_id !== undefined && raw.category_id !== null
      ? Number(raw.category_id)
      : Number(raw.parentCategoryId),
  parentName,
  createdAtReadable: formatReadableDate(raw.created_at || raw.createdAt),
  updatedAtReadable: formatReadableDate(raw.updated_at || raw.updatedAt),
});

/* ================== STORE ================== */

const useServiceCategoriesStore = create((set, get) => ({
  // parents list (UI)
  categories: JSON.parse(localStorage.getItem("categories") || "[]"),

  // ALL subcategories (we filter client-side for reliability)
  subCategories: JSON.parse(localStorage.getItem("subCategories") || "[]"),

  loading: false,
  error: null,

  /* --------- FETCH: categories (parents) --------- */
  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      // ✅ Correct endpoint; payload is {status, data:{data:[...]}}
      const res = await api.get(`/admin/category`);
      const raw = extractArray(res);
      const data = raw.map(decorateCategory);

      set({ categories: data, loading: false });
      localStorage.setItem("categories", JSON.stringify(data));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("fetchCategories:", err);
      set({
        error: getErrorMessage(err, "Failed to fetch categories."),
        loading: false,
      });
      throw err;
    }
  },

  /* --------- FETCH: subcategories (ALL; filter done client-side) --------- */
  // We still try to pass category_id to server, but always keep a full list locally
  fetchSubCategories: async (parentId = null) => {
    set({ loading: true, error: null });
    try {
      const params = {};
      if (parentId !== null && parentId !== undefined) {
        const cid = toInt(parentId);
        if (!Number.isNaN(cid)) params.category_id = cid;
      }

      // ✅ Correct endpoint; payload is {status, data:{data:[...]}}
      let res;
      try {
        res = await api.get(`/admin/sub-category`, { params });
      } catch (e) {
        // fallback in case of temporary variant
        res = await api.get(`/admin/sub-category`, { params: {} });
      }

      const raw = extractArray(res);

      const cats = get().categories || [];
      const catsMap = new Map(cats.map((c) => [Number(c.id), c.name]));

      const list = raw.map((s) =>
        decorateSubcategory(s, catsMap.get(Number(s.category_id)))
      );

      // Always store the full set; UI will filter before paginating
      set({ subCategories: list, loading: false });
      localStorage.setItem("subCategories", JSON.stringify(list));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("fetchSubCategories:", err);
      set({
        error: getErrorMessage(err, "Failed to fetch subcategories."),
        loading: false,
      });
      throw err;
    }
  },

  /* --------- CREATE / UPDATE / DELETE: Category --------- */

  createCategory: async ({ name }) => {
    set({ loading: true, error: null });
    try {
      const payload = { category_name: (name || "").trim() };
      await api.post(`/admin/category/create`, payload);

      await get().fetchCategories();
      set({ loading: false });
      return { message: "Category created successfully" };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("createCategory:", err);
      const message = getErrorMessage(
        err,
        "Failed to create category. Please try again."
      );
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  updateCategory: async (id, { name }) => {
    set({ loading: true, error: null });
    try {
      const payload = { category_name: (name || "").trim() };
      await api.put(`/admin/category/${id}`, payload);

      await get().fetchCategories();
      set({ loading: false });
      return { message: "Category updated successfully" };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("updateCategory:", err);
      const message = getErrorMessage(
        err,
        "Failed to update category. Please try again."
      );
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  deleteCategory: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/admin/category/${id}`);

      await get().fetchCategories();
      set({ loading: false });
      return { message: "Category deleted successfully" };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("deleteCategory:", err);
      const message = getErrorMessage(
        err,
        "Failed to delete category. Please try again."
      );
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  /* --------- CREATE / UPDATE / DELETE: Subcategory --------- */

  createSubCategory: async ({ name, parentCategoryId }) => {
    set({ loading: true, error: null });
    try {
      const cleanName = (name || "").trim();
      const category_id = toInt(parentCategoryId);

      const payload = { name: cleanName, category_id };
      await api.post(`/admin/sub-category/create`, payload);

      // Refresh full list; UI applies current filter
      await get().fetchSubCategories(null);
      set({ loading: false });
      return { message: "Subcategory created successfully" };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("createSubCategory:", err);
      const message = getErrorMessage(
        err,
        "Failed to create subcategory. Please try again."
      );
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  updateSubCategory: async (id, { name, parentCategoryId }) => {
    set({ loading: true, error: null });
    try {
      const cleanName = (name || "").trim();
      const category_id = toInt(parentCategoryId);

      const payload = { name: cleanName, category_id };
      await api.put(`/admin/sub-category/${id}`, payload);

      // Refresh full list; UI applies current filter
      await get().fetchSubCategories(null);
      set({ loading: false });
      return { message: "Subcategory updated successfully" };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("updateSubCategory:", err);
      const message = getErrorMessage(
        err,
        "Failed to update subcategory. Please try again."
      );
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  deleteSubCategory: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/admin/sub-category/${id}`);

      // Refresh full list; UI applies current filter
      await get().fetchSubCategories(null);
      set({ loading: false });
      return { message: "Subcategory deleted successfully" };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("deleteSubCategory:", err);
      const message = getErrorMessage(
        err,
        "Failed to delete subcategory. Please try again."
      );
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  // Optional: view one subcategory
  getSubCategory: async (id) => {
    try {
      const res = await api.get(`/admin/sub-category/${id}`);
      return res?.data?.data || res?.data;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("getSubCategory:", err);
      throw err;
    }
  },
}));

export default useServiceCategoriesStore;
