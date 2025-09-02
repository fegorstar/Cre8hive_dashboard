// src/store/ServiceCategoriesStore.js
// Admin Service Categories & Subcategories store
// ✅ Uses src/lib/apiClient.js
// ✅ Categories: { category_name } for create/update
// ✅ Subcategories: { name, category_id } (category_id coerced to integer)
// ✅ Handles Laravel paginator { data: { data: [...] } } and wrapper {status, data:{data:[...]}} patterns
// ✅ Clear error messages from { message, errors }
// ✅ Parents-only in categories; subcategories kept separately
// ✅ ADDED: Robust pagination meta (currentPage, lastPage, from, to, total, perPage, links)
// ✅ ADDED: page-aware fetchers without breaking your old call signatures
// ✅ ADDED: refresh after CRUD stays on current page

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
  // meta may live in data.* (Laravel paginator) or at root (some custom APIs)
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

  // Fallback calc if server didn’t send from/to
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
  // Parents list (UI, current page items)
  categories: JSON.parse(localStorage.getItem("categories") || "[]"),

  // ALL subcategories (kept as current page items; server pagination is source of truth)
  subCategories: JSON.parse(localStorage.getItem("subCategories") || "[]"),

  // Pagination meta (NEW)
  categoriesMeta: {
    currentPage: 1,
    lastPage: 1,
    perPage: 10,
    total: 0,
    from: 0,
    to: 0,
    links: [],
  },
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
  // NEW: accepts options object { page?: number }
  // Old calls (no args) still work and default to page=1
  fetchCategories: async (options = undefined) => {
    const page = typeof options === "object" && options?.page ? Number(options.page) : 1;

    set({ loading: true, error: null });
    try {
      // ✅ Correct endpoint; payload is {status, data:{data:[...], current_page, last_page,...}}
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

  /* --------- FETCH: subcategories (server-paginated) --------- */
  // Backwards compatible:
  //   fetchSubCategories()                    -> page=1
  //   fetchSubCategories(5)                   -> parentId=5, page=1
  //   fetchSubCategories({ parentId: 5 })     -> page=1
  //   fetchSubCategories({ page: 2 })         -> parentId=null, page=2
  //   fetchSubCategories({ parentId: 5, page: 2 })
  fetchSubCategories: async (arg = undefined) => {
    let parentId = null;
    let page = 1;

    if (typeof arg === "number") {
      parentId = arg;
    } else if (typeof arg === "object" && arg !== null) {
      if (arg.parentId !== undefined) parentId = arg.parentId;
      if (arg.page !== undefined) page = Number(arg.page);
    }

    set({ loading: true, error: null });
    try {
      const params = { page };
      if (parentId !== null && parentId !== undefined) {
        const cid = toInt(parentId);
        if (!Number.isNaN(cid)) params.category_id = cid;
      }

      // ✅ Correct endpoint; payload is {status, data:{data:[...], current_page,...}}
      const res = await api.get(`/admin/sub-category`, { params });

      const raw = extractArray(res);

      // Map categoryId -> name for display
      const cats = get().categories || [];
      const catsMap = new Map(cats.map((c) => [Number(c.id), c.name]));

      const list = raw.map((s) =>
        decorateSubcategory(s, catsMap.get(Number(s.category_id)))
      );

      const meta = extractMeta(res);

      set({
        subCategories: list,
        subCategoriesMeta: meta,
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

  /* --------- CREATE / UPDATE / DELETE: Category --------- */

  createCategory: async ({ name }) => {
    set({ loading: true, error: null });
    try {
      const payload = { category_name: (name || "").trim() };
      await api.post(`/admin/category/create`, payload);

      // Stay on current page after create
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
      // If deleting last item of the last page, make sure we don't exceed lastPage afterward
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

      const cur = get().subCategoriesMeta.currentPage || 1;
      await get().fetchSubCategories({ page: cur, parentId: null }); // keep same page

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

      const cur = get().subCategoriesMeta.currentPage || 1;
      await get().fetchSubCategories({ page: cur, parentId: null });

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

      const cur = get().subCategoriesMeta.currentPage || 1;
      await get().fetchSubCategories({ page: cur, parentId: null });

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
