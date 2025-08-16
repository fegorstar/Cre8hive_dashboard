// src/store/ServiceCategoriesStore.js
// Service Categories + Sub-categories store
// - Auth header from localStorage token (Laravel-friendly: Accept + Bearer + Content-Type)
// - Member→Admin fallback on create (prevents "Unauthenticated" when token role mismatches)
// - Robust response parsing (array in several shapes)
// - Normalizes ids to numbers
// - Adds createdAtReadable / updatedAtReadable (e.g., "28 Jan, 2025")
// - Persists categories/subCategories in localStorage
// - Fallback for subcategories to categories[].children when API yields nothing

import { create } from 'zustand';
import axios from 'axios';
import { BASE_URL } from '../config';

const api = axios.create({ baseURL: BASE_URL });

// Attach Laravel-friendly headers + token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  config.headers = config.headers || {};
  // Laravel expects this for API responses
  config.headers.Accept = 'application/json';
  // default JSON unless caller sets something else (e.g., FormData)
  if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Format "2025-07-26T06:43:48.000000Z" → "26 Jul, 2025"
const formatReadableDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const day = d.toLocaleDateString('en-GB', { day: '2-digit' });
  const mon = d.toLocaleDateString('en-GB', { month: 'short' });
  const yr = d.getFullYear();
  return `${day} ${mon}, ${yr}`;
};

// Safely pull arrays regardless of backend envelope
const extractArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.result)) return res.data.result;
  return [];
};

// Coerce ids/parentCategoryId to numbers consistently
const normalizeIds = (it = {}) => ({
  ...it,
  id: it?.id !== undefined ? Number(it.id) : it?.id,
  parentCategoryId:
    it?.parentCategoryId !== undefined ? Number(it.parentCategoryId) : it?.parentCategoryId,
});

// Decorate one category
const decorateCategory = (raw = {}) => {
  const norm = normalizeIds(raw);
  return {
    ...norm,
    createdAtReadable: formatReadableDate(norm.created_at || norm.createdAt),
    updatedAtReadable: formatReadableDate(norm.updated_at || norm.updatedAt),
    children: Array.isArray(norm.children)
      ? norm.children.map((c) => decorateSubcategory(c, norm.name))
      : [],
  };
};

// Decorate one subcategory (parentName optional)
const decorateSubcategory = (raw = {}, parentName = undefined) => {
  const norm = normalizeIds(raw);
  return {
    ...norm,
    parentName,
    createdAtReadable: formatReadableDate(norm.created_at || norm.createdAt),
    updatedAtReadable: formatReadableDate(norm.updated_at || norm.updatedAt),
  };
};

const useServiceCategoriesStore = create((set, get) => ({
  // ===== STATE =====
  categories: JSON.parse(localStorage.getItem('categories') || '[]'),
  subCategories: JSON.parse(localStorage.getItem('subCategories') || '[]'),
  loading: false,
  error: null,

  // ===== ACTIONS =====

  // Fetch all categories
  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/categories`);
      const raw = extractArray(res);
      const data = raw.map(decorateCategory);

      set({ categories: data, loading: false });
      localStorage.setItem('categories', JSON.stringify(data));
    } catch (error) {
      console.error('Error fetching categories:', error);
      set({ error: error?.response?.data?.message || error.message, loading: false });
    }
  },

  // Fetch sub-categories for given parent id; fallback to categories[].children if API empty
  fetchSubCategories: async (parentCategoryId) => {
    set({ loading: true, error: null });
    try {
      const pid = Number(parentCategoryId);
      const res = await api.get(`/categories/subcategory`, { params: { parentCategoryId: pid } });
      let subs = extractArray(res);

      // Fallback from local categories[].children
      if (!subs.length) {
        const parent = get().categories.find((c) => Number(c.id) === pid);
        subs = Array.isArray(parent?.children) ? parent.children : [];
      }

      const parent = get().categories.find((c) => Number(c.id) === pid);
      const parentName = parent?.name || '—';
      const decorated = subs.map((s) => decorateSubcategory(s, parentName));

      set({ subCategories: decorated, loading: false });
      localStorage.setItem('subCategories', JSON.stringify(decorated));
    } catch (error) {
      console.error('Error fetching sub-categories:', error);
      set({ error: error?.response?.data?.message || error.message, loading: false });
    }
  },

  // Create category (member → admin fallback like Creators)
  createCategory: async (categoryData) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Not authenticated. Please log in again.');

      let res;
      try {
        // Primary route (adjust if yours differs)
        res = await api.post(`/categories`, categoryData);
      } catch (err) {
        // If role/token can’t hit the primary, try an admin-scoped route
        if (err?.response?.status === 401) {
          res = await api.post(`/admin/categories`, categoryData);
        } else {
          throw err;
        }
      }

      const createdRaw = extractArray(res)[0] || res?.data?.data || res?.data;
      const created = decorateCategory(createdRaw);

      set((state) => {
        const updated = [...state.categories, created];
        localStorage.setItem('categories', JSON.stringify(updated));
        return { categories: updated, loading: false };
      });

      return { message: 'Category created successfully!' };
    } catch (error) {
      console.error('Error creating category:', error);
      set({ error: error?.response?.data?.message || error.message, loading: false });
      throw new Error(error?.response?.data?.message || error.message);
    }
  },

  // Create sub-category (member → admin fallback)
  createSubCategory: async (subCategoryData) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Not authenticated. Please log in again.');

      const payload = {
        ...subCategoryData,
        parentCategoryId: Number(subCategoryData.parentCategoryId),
      };

      let res;
      try {
        // If your API actually has /categories/subcategory for creation, swap this first call.
        res = await api.post(`/categories`, payload);
      } catch (err) {
        if (err?.response?.status === 401) {
          res = await api.post(`/admin/categories`, payload);
        } else {
          throw err;
        }
      }

      const createdRaw = extractArray(res)[0] || res?.data?.data || res?.data;

      // Find parent for parentName
      const parent = get().categories.find((c) => Number(c.id) === Number(payload.parentCategoryId));
      const parentName = parent?.name || '—';

      const created = decorateSubcategory(createdRaw, parentName);

      set((state) => {
        // update categories[].children
        const categories = (state.categories || []).map((c) =>
          Number(c.id) === Number(payload.parentCategoryId)
            ? { ...c, children: [...(c.children || []), created] }
            : c
        );

        // update current subCategories list if viewing same parent
        const subCategories =
          Number(state.subCategories?.[0]?.parentCategoryId) === Number(payload.parentCategoryId)
            ? [...state.subCategories, created]
            : state.subCategories;

        localStorage.setItem('categories', JSON.stringify(categories));
        localStorage.setItem('subCategories', JSON.stringify(subCategories));

        return { categories, subCategories, loading: false };
      });

      return { message: 'Sub-category created successfully!' };
    } catch (error) {
      console.error('Error creating sub-category:', error);
      set({ error: error?.response?.data?.message || error.message, loading: false });
      throw new Error(error?.response?.data?.message || error.message);
    }
  },

  // Update (category or sub-category)
  updateCategory: async (id, updatedData) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Not authenticated. Please log in again.');

      let res;
      try {
        res = await api.put(`/categories/${id}`, updatedData);
      } catch (err) {
        if (err?.response?.status === 401) {
          res = await api.put(`/admin/categories/${id}`, updatedData);
        } else {
          throw err;
        }
      }

      const updatedRaw = res?.data?.data || res?.data;

      set((state) => {
        // Update top-level categories
        let categories = (state.categories || []).map((c) =>
          Number(c.id) === Number(id)
            ? {
                ...c,
                ...updatedRaw,
                ...decorateCategory(updatedRaw), // ensures readable dates
              }
            : c
        );

        // Update nested subcategories
        categories = categories.map((c) => ({
          ...c,
          children: Array.isArray(c.children)
            ? c.children.map((sc) =>
                Number(sc.id) === Number(id)
                  ? {
                      ...sc,
                      ...updatedRaw,
                      ...decorateSubcategory(updatedRaw, c.name),
                    }
                  : sc
              )
            : c.children,
        }));

        // Update the currently viewed subCategories list
        const subCategories = (state.subCategories || []).map((sc) =>
          Number(sc.id) === Number(id)
            ? { ...sc, ...updatedRaw, ...decorateSubcategory(updatedRaw, sc.parentName) }
            : sc
        );

        localStorage.setItem('categories', JSON.stringify(categories));
        localStorage.setItem('subCategories', JSON.stringify(subCategories));

        return { categories, subCategories, loading: false };
      });

      return { message: 'Category updated successfully!' };
    } catch (error) {
      console.error('Error updating category:', error);
      set({ error: error?.response?.data?.message || error.message, loading: false });
      throw new Error(error?.response?.data?.message || error.message);
    }
  },
}));

export default useServiceCategoriesStore;
