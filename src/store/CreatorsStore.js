// src/store/CreatorsStore.js
// - Auth like "create category": Accept + Bearer from localStorage
// - Status normalization so UI + filter stay accurate (handles 1/0/true/false/strings)
// - Fetch, Create (member->admin fallback), Update, Toggle (PUT /admin/creator/:id with {status})
// - LocalStorage caching for list + pagination

import { create } from 'zustand';
import axios from 'axios';
import { BASE_URL } from '../config';

const api = axios.create({ baseURL: BASE_URL });

// Attach default headers + token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  config.headers = config.headers || {};
  config.headers.Accept = 'application/json';
  if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize any status into 'active' | 'inactive'
const toNormStatus = (raw) => {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'active') return 'active';
  return 'inactive';
};

// "2025-07-26T06:43:48.000000Z" => "26 Jul, 2025"
const formatReadableDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const day = d.toLocaleDateString('en-GB', { day: '2-digit' });
  const mon = d.toLocaleDateString('en-GB', { month: 'short' });
  const yr = d.getFullYear();
  return `${day} ${mon}, ${yr}`;
};

// Robust extraction for varied API envelopes
const extractArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.result)) return res.data.result;
  if (Array.isArray(res?.data?.data?.data)) return res.data.data.data;
  return [];
};

const extractObject = (res) => {
  if (!res) return null;
  if (res?.data?.data && typeof res.data.data === 'object') return res.data.data;
  if (res?.data && typeof res.data === 'object') return res.data;
  return null;
};

const normalizeIds = (it = {}) => ({
  ...it,
  id: it?.id !== undefined ? Number(it.id) : it?.id,
});

// Decorate a raw creator object for consistent table display
const decorateCreator = (raw = {}) => {
  const norm = normalizeIds(raw);

  const fullName =
    norm.name ||
    norm.fullName ||
    `${norm?.member?.first_name ?? ''} ${norm?.member?.last_name ?? ''}`.trim() ||
    `${norm.first_name ?? ''} ${norm.last_name ?? ''}`.trim() ||
    undefined;

  const gender =
    (norm.gender ?? norm?.member?.gender ?? norm?.profile?.gender ?? '')
      ?.toString()
      ?.toLowerCase() || undefined;

  const nin = norm.nin ?? norm?.member?.nin ?? norm?.profile?.nin ?? undefined;

  return {
    ...norm,
    name: fullName || norm.name,
    email: norm?.member?.email || norm.email,
    phone: norm?.member?.phone_number || norm.phone || norm.msisdn || norm.mobile,
    gender,
    nin,
    status: toNormStatus(norm.status),
    createdAtReadable: formatReadableDate(norm.created_at || norm.createdAt),
    updatedAtReadable: formatReadableDate(norm.updated_at || norm.updatedAt),
  };
};

// Restore cache
const defaultCached = JSON.parse(localStorage.getItem('creators') || '[]');
const defaultPagination = JSON.parse(
  localStorage.getItem('creitors_pagination') ||
    localStorage.getItem('creators_pagination') ||
    '{"page":1,"per_page":10,"total":0}'
);

const useCreatorsStore = create((set, get) => ({
  creators: defaultCached,
  pagination: defaultPagination,
  loading: false,
  error: null,

  /**
   * GET /admin/creator/list?perpage=…&page=…&status=…&search=…
   */
  fetchCreators: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const { page = 1, per_page = 10, q = '', status = '' } = params;

      const res = await api.get('/admin/creator/list', {
        params: {
          page,
          perpage: per_page,
          status: status ? toNormStatus(status) : undefined,
          search: q || undefined,
        },
      });

      const root = res?.data?.data || {};
      const list = Array.isArray(root?.data) ? root.data : extractArray(res);
      const decorated = list.map(decorateCreator);

      const nextPagination = {
        page: Number(root?.current_page ?? page),
        per_page: Number(root?.per_page ?? per_page),
        total: Number(root?.total ?? decorated.length),
      };

      set({ creators: decorated, pagination: nextPagination, loading: false });
      localStorage.setItem('creators', JSON.stringify(decorated));
      localStorage.setItem('creators_pagination', JSON.stringify(nextPagination));
    } catch (error) {
      console.error('Error fetching creators:', error);
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  /**
   * Create (member first; fallback to admin).
   * POST /member/creator/create  (401 => fallback)  -> POST /admin/creator/create
   */
  createCreator: async (payload) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Not authenticated. Please log in again.');

      let res;
      try {
        res = await api.post('/member/creator/create', payload);
      } catch (err) {
        if (err?.response?.status === 401) {
          res = await api.post('/admin/creator/create', payload);
        } else {
          throw err;
        }
      }

      const createdRaw = extractArray(res)[0] || extractObject(res) || res?.data;
      const created = decorateCreator(createdRaw);

      set((state) => {
        const updated = [created, ...state.creators];
        const pagination = {
          ...state.pagination,
          total: (state.pagination?.total || 0) + 1,
        };
        localStorage.setItem('creators', JSON.stringify(updated));
        localStorage.setItem('creators_pagination', JSON.stringify(pagination));
        return { creators: updated, pagination, loading: false };
      });

      return { message: 'Creator created successfully!' };
    } catch (error) {
      console.error('Error creating creator:', error);
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
      throw new Error(error?.response?.data?.message || error.message);
    }
  },

  /**
   * Update (admin) — PUT /admin/creator/:id
   */
  updateCreator: async (id, updatedData) => {
    set({ loading: true, error: null });
    try {
      const res = await api.put(`/admin/creator/${id}`, updatedData);
      const updatedRaw = extractObject(res) || res?.data;

      set((state) => {
        const creators = (state.creators || []).map((c) =>
          Number(c.id) === Number(id)
            ? { ...c, ...decorateCreator({ ...c, ...updatedRaw }) }
            : c
        );
        localStorage.setItem('creators', JSON.stringify(creators));
        return { creators, loading: false };
      });

      return { message: 'Creator updated successfully!' };
    } catch (error) {
      console.error('Error updating creator:', error);
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
      throw new Error(error?.response?.data?.message || error.message);
    }
  },

  /**
   * Toggle status (admin) — PUT /admin/creator/:id { status: "active" | "inactive" }
   */
  toggleCreatorStatus: async (id) => {
    set({ loading: true, error: null });
    try {
      const current = get().creators.find((c) => Number(c.id) === Number(id));
      const currentStatus = toNormStatus(current?.status);
      const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';

      await api.put(`/admin/creator/${id}`, { status: nextStatus });

      set((state) => {
        const creators = (state.creators || []).map((c) =>
          Number(c.id) === Number(id) ? { ...c, status: nextStatus } : c
        );
        localStorage.setItem('creators', JSON.stringify(creators));
        return { creators, loading: false };
      });
    } catch (error) {
      console.error('Error toggling creator status:', error);
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
      throw new Error(error?.response?.data?.message || error.message);
    }
  },
}));

export default useCreatorsStore;
