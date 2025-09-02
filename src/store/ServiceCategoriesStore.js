// src/store/ServiceCategoriesStore.js
// Admin Service Categories & Subcategories store
// Now supports full-list fetching for subcategories to enable accurate client-side pagination/totals per filter.

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

// Extract pagination meta from Laravel-style payload
const extractMeta = (res) => {
  const root = res?.data || {};
  const box =
    root?.data && !Array.isArray(root.data) && (root.data.current_page || root.data.last_page)
      ? root.data
      : root;

  const currentPage = Number(box?.current_page) || 1;
  const lastPage = Number(box?.last_page) || 1;
  const perPage = Number(box?.per_page) || 10;
  const total = Number(box?.total) || 0;

  let from = Number(box?.from);
  let to = Number(box?.to);

  if (!Number.isFinite(from)) from = total ? (currentPage - 1) * perPage + 1 : 0;
  if (!Number.isFinite(to)) {
    const arrLen = extractArray(res).length;
    to = total ? Math.min(from + arrLen - 1, total) : 0;
  }

  return {
    currentPage,
    lastPage,
    perPage,
    total,
    from,
    to,
    nextPageUrl: box?.next_page_url || null,
    prevPageUrl: box?.prev_page_url || null,
    path: box?.path || "",
    links: Array.isArray(box?.links) ? box.links : [],
  };
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

const decorateCategory = (raw = {}) => ({
  id: Number(raw.id),
  name: raw.category_name ?? raw.name ?? "",
  createdAtReadable: formatReadableDate(raw.created_at || raw.createdAt),
  updatedAtReadable: formatReadableDate(raw.updated_at || raw.updatedAt),
});

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
  parentName:
    parentName ??
    raw.category_name ??
    raw.category?.name ??
    raw.category?.category_name,
  createdAtReadable: formatReadableDate(raw.created_at || raw.createdAt),
  updatedAtReadable: formatReadableDate(raw.updated_at || raw.updatedAt),
});

/* ================== STORE ================== */

const useServiceCategoriesStore = create((set, get) => ({
  categories: JSON.parse(localStorage.getItem("categories") || "[]"),

  // Legacy page slice (no longer used by the page, kept for compatibility)
  subCategories: JSON.parse(localStorage.getItem("subCategories") || "[]"),

  // Full list of subcategories across ALL pages (the page uses this for client-side pagination)
  subAll: JSON.parse(localStorage.getItem("subCategories") || "[]"),
  subAllLoading: false,
  subAllPerPage: 10, // we reuse server per_page for a consistent page size

  // Remembered filter (null => ALL)
  subFilterCategoryId: null,

  categoriesMeta: {
    currentPage: 1,
    lastPage: 1,
    perPage: 10,
    total: 0,
    from: 0,
    to: 0,
    links: [],
  },
  // kept for backward-compat (not used by the page anymore)
  subCategoriesMeta: {
    currentPage: 1,
    lastPage: 1,
    perPage: 10,
    total: 0,
    from: 0,
    to: 0,
    links: [],
  },

  loading: false,
  error: null,

  /* --------- FETCH: categories (parents) --------- */
  fetchCategories: async (options = undefined) => {
    const page = typeof options === "object" && options?.page ? Number(options.page) : 1;

    set({ loading: true, error: null });
    try {
      const res = await api.get(`/admin/category`, { params: { page } });

      const raw = extractArray(res);
      const data = raw.map(decorateCategory);
      const meta = extractMeta(res);

      set({
        categories: data,
        categoriesMeta: meta,
        loading: false,
      });
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

  /* --------- NEW: FETCH ALL SUBCATEGORIES (across pages) --------- */
  // We fetch every page once, then the UI does perfect client-side filtering & pagination.
  // We still pass category_id to the server (helps if it supports filtering),
  // but we always post-process client-side to guarantee correctness.
  fetchAllSubCategories: async (arg = undefined) => {
    // optional: arg.parentId can be used to request server-side filtering if supported
    let parentId = null;
    if (typeof arg === "number") parentId = arg;
    else if (arg && typeof arg === "object" && arg.parentId !== undefined) parentId = arg.parentId;

    set({ subAllLoading: true, error: null });
    try {
      let page = 1;
      let lastPage = 1;
      let perPage = 10;
      const acc = [];

      const baseParams = {};
      if (parentId !== null && parentId !== undefined) {
        const cidInt = toInt(parentId);
        if (!Number.isNaN(cidInt)) {
          const cid = String(cidInt);
          baseParams.category_id = cid;
          baseParams.categoryId = cid;
          baseParams.category = cid;
        }
      }

      // safety cap to avoid infinite loops
      const MAX_PAGES = 200;

      do {
        const res = await api.get(`/admin/sub-category`, { params: { ...baseParams, page } });
        const meta = extractMeta(res);
        if (page === 1) {
          perPage = meta.perPage || 10;
        }
        lastPage = meta.lastPage || 1;

        const arr = extractArray(res);
        acc.push(...arr);

        page += 1;
      } while (page <= lastPage && page <= MAX_PAGES);

      // decorate with category names if available
      const cats = get().categories || [];
      const catsMap = new Map(cats.map((c) => [Number(c.id), c.name]));

      const list = acc.map((s) =>
        decorateSubcategory(
          s,
          catsMap.get(Number(s.category_id ?? s.categoryId ?? s.category))
        )
      );

      set({
        subAll: list,
        subCategories: list, // keep legacy mirror updated for other places
        subAllPerPage: perPage,
        subCategoriesMeta: {
          currentPage: 1,
          lastPage,
          perPage,
          total: acc.length,
          from: 1,
          to: Math.min(perPage, acc.length),
          links: [],
        },
        subAllLoading: false,
      });

      localStorage.setItem("subCategories", JSON.stringify(list));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("fetchAllSubCategories:", err);
      set({
        error: getErrorMessage(err, "Failed to fetch subcategories."),
        subAllLoading: false,
      });
      throw err;
    }
  },

  /* --------- Legacy: page-by-page fetch (kept in case other screens use it) --------- */
  fetchSubCategories: async (arg = undefined) => {
    let parentId = get().subFilterCategoryId; // default to remembered
    let page = 1;

    if (typeof arg === "number") {
      parentId = arg;
    } else if (typeof arg === "object" && arg !== null) {
      if (arg.parentId !== undefined) parentId = arg.parentId; // can be null (ALL)
      if (arg.page !== undefined) page = Number(arg.page);
    }

    set({ loading: true, error: null });
    try {
      const params = { page };

      if (parentId !== null && parentId !== undefined) {
        const cidInt = toInt(parentId);
        if (!Number.isNaN(cidInt)) {
          const cid = String(cidInt);
          params.category_id = cid; // Laravel-style
          params.categoryId = cid;  // camelCase
          params.category   = cid;  // generic
        }
      }

      const res = await api.get(`/admin/sub-category`, { params });

      const raw = extractArray(res);

      const cats = get().categories || [];
      const catsMap = new Map(cats.map((c) => [Number(c.id), c.name]));

      const list = raw.map((s) =>
        decorateSubcategory(
          s,
          catsMap.get(
            Number(
              s.category_id ?? s.categoryId ?? s.category
            )
          )
        )
      );

      const meta = extractMeta(res);

      set({
        subCategories: list,
        subCategoriesMeta: meta,
        subFilterCategoryId: parentId ?? null,
        loading: false,
      });
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

  /* --------- Filter memory helper --------- */
  setSubFilterCategoryId: (id) => set({ subFilterCategoryId: id ?? null }),

  /* --------- CREATE / UPDATE / DELETE: Category --------- */

  createCategory: async ({ name }) => {
    set({ loading: true, error: null });
    try {
      const payload = { category_name: (name || "").trim() };
      await api.post(`/admin/category/create`, payload);

      const cur = get().categoriesMeta.currentPage || 1;
      await get().fetchCategories({ page: cur });

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

      const cur = get().categoriesMeta.currentPage || 1;
      await get().fetchCategories({ page: cur });

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

      const cur = get().categoriesMeta.currentPage || 1;
      await get().fetchCategories({ page: cur });

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

      // do not rely on server meta — refresh ALL
      await get().fetchAllSubCategories();

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

      await get().fetchAllSubCategories();

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

      await get().fetchAllSubCategories();

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
