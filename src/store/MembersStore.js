// src/store/MembersStore.js
// - Auth headers (Accept + Bearer from localStorage)
// - Status normalization (1/0/true/false/strings)
// - Fetch list, Get single, Update, Toggle (PUT /admin/member/:id {status})
// - Local cache for quick hydration

import { create } from 'zustand';
import axios from 'axios';
import { BASE_URL } from '../config';

const api = axios.create({ baseURL: BASE_URL });

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

const toNormStatus = (raw) => {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'active') return 'active';
  return 'inactive';
};

const formatReadableDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const day = d.toLocaleDateString('en-GB', { day: '2-digit' });
  const mon = d.toLocaleDateString('en-GB', { month: 'short' });
  const yr = d.getFullYear();
  return `${day} ${mon}, ${yr}`;
};

const extractArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.result)) return res.data.result;
  if (Array.isArray(res?.data?.data?.data)) return res.data.data.data;
  // Some APIs (like the sample blob) might return a single object under data
  const single = res?.data?.data;
  if (single && typeof single === 'object' && !Array.isArray(single)) return [single];
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

const decorateMember = (raw = {}) => {
  const norm = normalizeIds(raw);

  const first = norm.first_name ?? norm.firstName ?? '';
  const last = norm.last_name ?? norm.lastName ?? '';
  const name = (norm.name || `${first} ${last}`.trim()) || undefined;

  return {
    ...norm,
    name,
    email: norm.email,
    phone: norm.phone_number || norm.phone || norm.msisdn || norm.mobile,
    member_id: norm.member_id,
    status: toNormStatus(norm.status),
    dobReadable: formatReadableDate(norm.dob),
    createdAtReadable: formatReadableDate(norm.created_at || norm.createdAt),
    updatedAtReadable: formatReadableDate(norm.updated_at || norm.updatedAt),
  };
};

/* Local hydration */
const defaultCached = JSON.parse(localStorage.getItem('members') || '[]');
const defaultPagination = JSON.parse(
  localStorage.getItem('members_pagination') || '{"page":1,"per_page":10,"total":0}'
);

const useMembersStore = create((set, get) => ({
  members: defaultCached,
  pagination: defaultPagination,
  loading: false,
  error: null,

  // GET /admin/member/list?perpage=…&page=…&status=…&search=…
  fetchMembers: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const { page = 1, per_page = 10, q = '', status = '' } = params;

      const res = await api.get('/admin/member/list', {
        params: {
          page,
          perpage: per_page, // API expects 'perpage'
          status: status ? toNormStatus(status) : undefined,
          search: q || undefined,
        },
      });

      // Try standard paginated shape first, then fallback to array extraction
      const root = res?.data?.data || {};
      const list = Array.isArray(root?.data) ? root.data : extractArray(res);

      const decorated = list.map(decorateMember);

      const nextPagination = {
        page: Number(root?.current_page ?? page),
        per_page: Number(root?.per_page ?? per_page),
        total: Number(root?.total ?? decorated.length),
      };

      set({ members: decorated, pagination: nextPagination, loading: false });
      localStorage.setItem('members', JSON.stringify(decorated));
      localStorage.setItem('members_pagination', JSON.stringify(nextPagination));
    } catch (error) {
      console.error('Error fetching members:', error);
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  // GET single: /admin/member/:id
  getMember: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/admin/member/${id}`);
      const raw = extractObject(res) || res?.data;
      const member = decorateMember(raw);
      set({ loading: false });
      return member;
    } catch (error) {
      console.error('Error getting member:', error);
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
      throw new Error(error?.response?.data?.message || error.message);
    }
  },

  // Update arbitrary fields (admin)
  updateMember: async (id, updatedData) => {
    set({ loading: true, error: null });
    try {
      const res = await api.put(`/admin/member/${id}`, updatedData);
      const updatedRaw = extractObject(res) || res?.data;

      set((state) => {
        const members = (state.members || []).map((m) =>
          Number(m.id) === Number(id)
            ? { ...m, ...decorateMember({ ...m, ...updatedRaw }) }
            : m
        );
        localStorage.setItem('members', JSON.stringify(members));
        return { members, loading: false };
      });

      return { message: 'Member updated successfully!' };
    } catch (error) {
      console.error('Error updating member:', error);
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
      throw new Error(error?.response?.data?.message || error.message);
    }
  },

  // Toggle / set status using PUT /admin/member/:id  { status: "active"|"inactive" }
  toggleMemberStatus: async (id) => {
    set({ loading: true, error: null });
    try {
      const current = get().members.find((m) => Number(m.id) === Number(id));
      const currentStatus = toNormStatus(current?.status);
      const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';

      await api.put(`/admin/member/${id}`, { status: nextStatus });

      set((state) => {
        const members = (state.members || []).map((m) =>
          Number(m.id) === Number(id) ? { ...m, status: nextStatus } : m
        );
        localStorage.setItem('members', JSON.stringify(members));
        return { members, loading: false };
      });
    } catch (error) {
      console.error('Error toggling member status:', error);
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
      throw new Error(error?.response?.data?.message || error.message);
    }
  },
}));

export default useMembersStore;
