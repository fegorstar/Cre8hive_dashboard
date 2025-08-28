// src/store/MembersStore.js
// Endpoints (updated):
//  - LIST/SEARCH: GET {BASE_URL}/admin/user?role=CREATOR&search=John&page=1&per_page=10
//  - SHOW:        GET {BASE_URL}/admin/user/{id}
//  - UPDATE:      POST {BASE_URL}/admin/user/{id}        (payload: arbitrary fields e.g. { name, status })
//  - TOGGLE:      POST {BASE_URL}/admin/user/status/{id} (body: { is_active: true|false })
// Notes:
//  - Auth headers (Accept + Bearer)
//  - Status normalization (1/0/true/false/strings) with tolerant derivation (status → active → creator.active → is_active)
//  - Local cache for quick hydration
//  - Stores `counts` from API for summary cards

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

const toNormStatus = (raw) => {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'active') return 'active';
  if (v === '0' || v === 'false' || v === 'inactive') return 'inactive';
  return v ? (v === 'yes' ? 'active' : 'inactive') : 'inactive';
};

const boolFromAny = (raw) => toNormStatus(raw) === 'active';

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
  // paginator lives under res.data.data (object), with list at .data
  const root = res?.data?.data;
  if (root && Array.isArray(root.data)) return root.data;
  // fallbacks
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res)) return res;
  return [];
};

const extractObject = (res) => {
  if (res?.data?.data && typeof res.data.data === 'object') return res.data.data;
  if (res?.data && typeof res.data === 'object') return res.data;
  return null;
};

const normalizeIds = (it = {}) => ({
  ...it,
  id: it?.id !== undefined ? Number(it.id) : it?.id,
});

const has = (v) => v !== undefined && v !== null && v !== '';

const decorateMember = (raw = {}) => {
  const norm = normalizeIds(raw);
  const first = norm.first_name ?? norm.firstName ?? '';
  const last = norm.last_name ?? norm.lastName ?? '';
  const name = (norm.name || `${first} ${last}`.trim()) || undefined;

  // Derive status (string) + active (bool) in priority:
  // status → active → creator.active → is_active
  let statusStr;
  if (has(norm.status)) statusStr = toNormStatus(norm.status);
  else if (has(norm.active)) statusStr = toNormStatus(norm.active);
  else if (has(norm?.creator?.active)) statusStr = toNormStatus(norm.creator.active);
  else if (has(norm.is_active)) statusStr = toNormStatus(norm.is_active);

  const activeBool = boolFromAny(
    has(norm.status) ? norm.status
    : has(norm.active) ? norm.active
    : has(norm?.creator?.active) ? norm.creator.active
    : has(norm.is_active) ? norm.is_active
    : false
  );

  return {
    ...norm,
    name,
    email: norm.email,
    phone: norm.phone_number || norm.phone || norm.msisdn || norm.mobile,
    member_id: norm.member_id,
    status: statusStr,   // 'active' | 'inactive' | undefined
    active: activeBool,  // boolean for convenience
    role: norm.role,
    kyc_status: norm.kyc_status,
    dob: norm.dob,
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
const defaultCounts = JSON.parse(localStorage.getItem('members_counts') || '{}');

const useMembersStore = create((set, get) => ({
  members: defaultCached,
  pagination: defaultPagination,
  counts: defaultCounts,
  loading: false,
  error: null,

  // GET /admin/user?role=&search=&page=&per_page=
  fetchMembers: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const { page = 1, per_page = 10, q = '', role = '' } = params;

      const res = await api.get('/admin/user', {
        params: {
          page,
          per_page,
          role: role || undefined,
          search: q || undefined,
        },
      });

      const list = extractArray(res).map(decorateMember);
      const root = res?.data?.data || {};
      const counts = res?.data?.counts || {};

      const nextPagination = {
        page: Number(root?.current_page ?? page),
        per_page: Number(root?.per_page ?? per_page),
        total: Number(root?.total ?? list.length),
      };

      set({ members: list, pagination: nextPagination, counts, loading: false });
      localStorage.setItem('members', JSON.stringify(list));
      localStorage.setItem('members_pagination', JSON.stringify(nextPagination));
      localStorage.setItem('members_counts', JSON.stringify(counts));
    } catch (error) {
      console.error('Error fetching members:', error);
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  // GET single: /admin/user/{id}
  getMember: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/admin/user/${id}`);
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

  // UPDATE (admin): POST /admin/user/{id}
  updateMember: async (id, updatedData) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post(`/admin/user/${id}`, updatedData);
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

  // Toggle status: POST /admin/user/status/{id}  body: { is_active: true|false }
  toggleMemberStatus: async (id) => {
    set({ loading: true, error: null });
    try {
      const current = get().members.find((m) => Number(m.id) === Number(id));

      // derive current boolean active from any available source
      const currentActive =
        current?.active !== undefined
          ? !!current.active
          : boolFromAny(
              (current?.status !== undefined ? current.status : undefined) ??
              (current?.active !== undefined ? current.active : undefined) ??
              (current?.creator?.active !== undefined ? current.creator.active : undefined) ??
              false
            );

      const nextActive = !currentActive;

      await api.post(`/admin/user/status/${id}`, { is_active: nextActive });

      set((state) => {
        const members = (state.members || []).map((m) =>
          Number(m.id) === Number(id)
            ? { ...m, active: nextActive, status: nextActive ? 'active' : 'inactive' }
            : m
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
