// src/store/CreatorsStore.js
// Endpoints:
//   LIST:   GET {BASE_URL}/admin/user/creators?page=1
//           GET {BASE_URL}/admin/user/creators?search=JohnDoe&active=true
//   SINGLE: GET {BASE_URL}/admin/user/creators/:id
//   UPDATE: POST {BASE_URL}/admin/user/creators/update/:id
//   STATUS: POST {BASE_URL}/admin/user/creators/status/:id  (body: { active: true|false })
//
//   SERVICES:
//     LIST:   GET {BASE_URL}/admin/services?page=1
//             (server returns: { status, message, data: { current_page, data: [...], ... } })
//             Optional params we send if available: page, per_page, status, user_id
//     UPDATE: PUT {BASE_URL}/admin/services/:serviceId  (body: { status: "PUBLISHED" | "PENDING" | "REJECTED" })
//
// Notes:
//   - This store posts ONLY creator fields for updates (no nested user).
//   - Includes services fetching & status updates with per-creator caches.

import { create } from 'zustand';
import axios from 'axios';
import { BASE_URL } from '../config';

const api = axios.create({ baseURL: String(BASE_URL || '').replace(/\/$/, '') });

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

// Normalize to 'active' | 'inactive'
const toNormStatus = (raw) => {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'active') return 'active';
  if (raw === true) return 'active';
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
  if (Array.isArray(res?.data?.data?.data)) return res.data.data.data; // Laravel paginator nested
  return [];
};

const extractObject = (res) => {
  if (res?.data?.data && !Array.isArray(res.data.data) && typeof res.data.data === 'object') {
    return res.data.data;
  }
  if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
    return res.data;
  }
  const arr = extractArray(res);
  return arr.length ? arr[0] : null;
};

const normalizeIds = (it = {}) => ({
  ...it,
  id: it?.id !== undefined ? Number(it.id) : it?.id,
});

/** Decorate creator/user record */
const decorateCreator = (raw = {}) => {
  const norm = normalizeIds(raw);

  const user = norm.user && typeof norm.user === 'object' ? normalizeIds(norm.user) : {};
  const creator = norm.creator && typeof norm.creator === 'object' ? normalizeIds(norm.creator) : norm;

  const fullName =
    norm.name ||
    `${norm.first_name ?? ''} ${norm.last_name ?? ''}`.trim() ||
    `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() ||
    user.surname ||
    undefined;

  const email = norm.email || user.email || creator.email;
  const phone =
    norm.phone_number ||
    user.phone_number ||
    norm.phone ||
    norm.msisdn ||
    norm.mobile ||
    creator.phone ||
    undefined;

  const gender = (norm.gender ?? user.gender ?? creator.gender ?? '')?.toString()?.toLowerCase() || undefined;
  const nin = norm.nin ?? user.nin ?? creator.nin ?? undefined;
  const bvn = norm.bvn ?? user.bvn ?? creator.bvn ?? undefined;

  const activeFlag = norm.active ?? creator.active ?? user.active ?? (toNormStatus(norm.status) === 'active');

  return {
    ...norm,
    user,
    name: fullName,
    email,
    phone,
    gender,
    nin,
    bvn,
    status: toNormStatus(activeFlag ? 'active' : 'inactive'),
    createdAtReadable: formatReadableDate(
      norm.created_at || creator.created_at || user.created_at || norm.createdAt
    ),
    updatedAtReadable: formatReadableDate(
      norm.updated_at || creator.updated_at || user.updated_at || norm.updatedAt
    ),
  };
};

// ---- Services decoration ----
const decorateService = (raw = {}) => {
  const user = raw.user && typeof raw.user === 'object' ? normalizeIds(raw.user) : undefined;
  const creatorName =
    (user && `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()) ||
    user?.surname ||
    undefined;

  return {
    id: Number(raw.id),
    user_id: raw.user_id !== undefined && raw.user_id !== null ? Number(raw.user_id) : undefined,
    service_name: raw.service_name ?? raw.name ?? '',
    category_id:
      raw.category_id !== undefined && raw.category_id !== null ? Number(raw.category_id) : undefined,
    sub_category_id:
      raw.sub_category_id !== undefined && raw.sub_category_id !== null
        ? Number(raw.sub_category_id)
        : undefined,
    rate: raw.rate ?? '',
    cover_image: raw.cover_image ?? '',
    link: raw.link ?? '',
    service_image: raw.service_image ?? '',
    service_audio: raw.service_audio ?? '',
    status: String(raw.status || '').toUpperCase() || 'PENDING', // PUBLISHED | PENDING | REJECTED
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    createdAtReadable: formatReadableDate(raw.created_at),
    updatedAtReadable: formatReadableDate(raw.updated_at),
    user, // nested user (if present)
    creatorName,
  };
};

// Helper: strip undefined keys before sending
const pruneUndefined = (obj = {}) => {
  const copy = { ...obj };
  Object.keys(copy).forEach((k) => {
    if (copy[k] === undefined) delete copy[k];
  });
  return copy;
};

// Restore cache
const defaultCached = JSON.parse(localStorage.getItem('creators') || '[]');
const defaultPagination = JSON.parse(
  localStorage.getItem('creators_pagination') || '{"page":1,"per_page":10,"total":0}'
);

// Services cache
const defaultServices = JSON.parse(localStorage.getItem('services_all') || '[]');
const defaultServicesMeta = JSON.parse(
  localStorage.getItem('services_meta') ||
    '{"currentPage":1,"lastPage":1,"perPage":10,"total":0,"from":0,"to":0}'
);
const defaultServicesByUser = JSON.parse(localStorage.getItem('services_by_user') || '{}');
const defaultServicesMetaByUser = JSON.parse(
  localStorage.getItem('services_meta_by_user') || '{}'
);

const extractPaginatorMeta = (box = {}, fallback = {}) => ({
  currentPage: Number(box?.current_page ?? fallback.currentPage ?? 1),
  lastPage: Number(box?.last_page ?? fallback.lastPage ?? 1),
  perPage: Number(box?.per_page ?? fallback.perPage ?? 10),
  total: Number(box?.total ?? fallback.total ?? 0),
  from: Number(box?.from ?? fallback.from ?? 0),
  to: Number(box?.to ?? fallback.to ?? 0),
  nextPageUrl: box?.next_page_url || null,
  prevPageUrl: box?.prev_page_url || null,
  path: box?.path || '',
  links: Array.isArray(box?.links) ? box.links : [],
});

const useCreatorsStore = create((set, get) => ({
  creators: defaultCached,
  pagination: defaultPagination,
  loading: false,
  error: null,

  currentCreator: null,

  // ======== SERVICES STATE ========
  services: defaultServices, // last general fetch
  servicesMeta: defaultServicesMeta,
  servicesByUser: defaultServicesByUser, // { [userId]: Service[] }
  servicesMetaByUser: defaultServicesMetaByUser, // { [userId]: Meta }
  loadingServices: false,

  // ======== CREATORS ========
  fetchCreators: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const { page = 1, per_page = 10, q = '', status = '' } = params;

      let active;
      if (status === 'active') active = true;
      else if (status === 'inactive') active = false;

      const res = await api.get('/admin/user/creators', {
        params: {
          page,
          per_page,
          search: q || undefined,
          active,
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

  fetchCreator: async (id) => {
    if (!id && id !== 0) throw new Error('Missing id');
    set({ error: null });
    try {
      const res = await api.get(`/admin/user/creators/${id}`);
      const raw = extractObject(res);
      if (!raw) throw new Error('Creator not found');
      const decorated = decorateCreator(raw);

      set((state) => {
        const list = Array.isArray(state.creators) ? state.creators.slice() : [];
        const idx = list.findIndex((c) => Number(c.id) === Number(id));
        if (idx >= 0) list[idx] = { ...list[idx], ...decorated };
        localStorage.setItem('creators', JSON.stringify(list));
        return { creators: list, currentCreator: decorated };
      });

      return decorated;
    } catch (error) {
      console.error('Error fetching creator:', error);
      set({
        error: error?.response?.data?.message || error.message,
      });
      throw new Error(error?.response?.data?.message || error.message);
    }
  },

  clearCurrentCreator: () => set({ currentCreator: null }),

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

  // Update creator (fields only)
  updateCreator: async (id, updatedData) => {
    set({ loading: true, error: null });
    try {
      const body = pruneUndefined(updatedData || {});
      const res = await api.post(`/admin/user/creators/update/${id}`, body);

      const updatedRaw = extractObject(res) || res?.data || {};
      const decorated = decorateCreator({ ...updatedRaw, ...body });

      set((state) => {
        const creators = (state.creators || []).map((c) =>
          Number(c.id) === Number(id) ? { ...c, ...decorated } : c
        );
        localStorage.setItem('creators', JSON.stringify(creators));

        const currentCreator =
          Number(state.currentCreator?.id) === Number(id)
            ? { ...state.currentCreator, ...decorated }
            : state.currentCreator;

        return { creators, currentCreator, loading: false };
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

  // Toggle status
  toggleCreatorStatus: async (id) => {
    set({ error: null });
    try {
      const state = get();
      const current =
        state.creators.find((c) => Number(c.id) === Number(id)) || state.currentCreator;
      const currentStatus = toNormStatus(current?.status);
      const nextActive = currentStatus !== 'active';

      await api.post(`/admin/user/creators/status/${id}`, { active: nextActive });

      set((s) => {
        const creators = (s.creators || []).map((c) =>
          Number(c.id) === Number(id)
            ? { ...c, status: nextActive ? 'active' : 'inactive', active: nextActive }
            : c
        );
        localStorage.setItem('creators', JSON.stringify(creators));

        const currentCreator =
          Number(s.currentCreator?.id) === Number(id)
            ? { ...s.currentCreator, status: nextActive ? 'active' : 'inactive', active: nextActive }
            : s.currentCreator;

        return { creators, currentCreator };
      });
    } catch (error) {
      console.error('Error toggling creator status:', error);
      set({
        error: error?.response?.data?.message || error.message,
      });
      throw new Error(error?.response?.data?.message || error.message);
    }
  },

  // ======== SERVICES ========
  fetchServices: async (params = {}) => {
    const { page = 1, per_page = 10, status, user_id } = params || {};
    const normalizedStatus = status ? String(status).toUpperCase() : undefined;

    set({ loadingServices: true, error: null });
    try {
      const res = await api.get('/admin/services', {
        params: pruneUndefined({
          page,
          per_page,
          status: normalizedStatus,
          user_id,
        }),
      });

      const box = res?.data?.data || {};
      const list = Array.isArray(box?.data) ? box.data : extractArray(res);
      const decorated = list.map(decorateService);
      const meta = extractPaginatorMeta(box, { currentPage: page, perPage: per_page });

      set((s) => {
        const next = { ...s };
        next.services = decorated;
        next.servicesMeta = meta;
        localStorage.setItem('services_all', JSON.stringify(decorated));
        localStorage.setItem('services_meta', JSON.stringify(meta));

        if (user_id !== undefined && user_id !== null) {
          const uid = Number(user_id);
          const map = { ...(s.servicesByUser || {}) };
          const metaMap = { ...(s.servicesMetaByUser || {}) };
          map[uid] = decorated;
          metaMap[uid] = meta;
          next.servicesByUser = map;
          next.servicesMetaByUser = metaMap;
          localStorage.setItem('services_by_user', JSON.stringify(map));
          localStorage.setItem('services_meta_by_user', JSON.stringify(metaMap));
        }

        return { ...next, loadingServices: false };
      });

      return { data: decorated, meta };
    } catch (error) {
      console.error('Error fetching services:', error);
      set({ loadingServices: false, error: error?.response?.data?.message || error.message });
      throw new Error(error?.response?.data?.message || error.message);
    }
  },

  updateServiceStatus: async (serviceId, nextStatus) => {
    const allowed = ['PUBLISHED', 'PENDING', 'REJECTED'];
    const status = String(nextStatus || '').toUpperCase();
    if (!allowed.includes(status)) {
      throw new Error(`Invalid status "${nextStatus}". Use one of: ${allowed.join(', ')}`);
    }

    try {
      await api.put(`/admin/services/${serviceId}`, { status });
      const updatedAtReadable = formatReadableDate(new Date().toISOString());

      set((s) => {
        const patch = (svc) =>
          Number(svc.id) === Number(serviceId) ? { ...svc, status, updatedAtReadable } : svc;

        const services = (s.services || []).map(patch);
        const servicesByUser = { ...(s.servicesByUser || {}) };
        for (const uid of Object.keys(servicesByUser)) {
          servicesByUser[uid] = (servicesByUser[uid] || []).map(patch);
        }

        localStorage.setItem('services_all', JSON.stringify(services));
        localStorage.setItem('services_by_user', JSON.stringify(servicesByUser));

        return { services, servicesByUser };
      });

      return { message: 'Service status updated Successfully' };
    } catch (error) {
      console.error('Error updating service status:', error);
      throw new Error(error?.response?.data?.message || error.message);
    }
  },
}));

export default useCreatorsStore;
