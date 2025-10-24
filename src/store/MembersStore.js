// src/store/MembersStore.js
// Stable optimistic toggle. Primary endpoint: POST /admin/user/status/{id} { is_active: 1|0 }.
// Falls back to POST /admin/user/{id} with compatible fields. ID normalization + active derivation.

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
  if (v === '1' || v === 'true' || v === 'active' || v === 'yes') return 'active';
  if (v === '0' || v === 'false' || v === 'inactive' || v === 'no') return 'inactive';
  return 'inactive';
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
  const root = res?.data?.data;
  if (root && Array.isArray(root.data)) return root.data;
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

// Normalize ID: prefer id, fallback to user_id/member_id/uid. Keep member_id mirror for UI.
const normalizeIds = (it = {}) => {
  const idSource = it.id ?? it.user_id ?? it.member_id ?? it.uid;
  const id = idSource !== undefined && idSource !== null && !Number.isNaN(Number(idSource))
    ? Number(idSource)
    : undefined;
  return {
    ...it,
    id,
    member_id: it.member_id ?? id,
  };
};

const has = (v) => v !== undefined && v !== null && v !== '';

const decorateMember = (raw = {}) => {
  const norm = normalizeIds(raw);
  const first = norm.first_name ?? norm.firstName ?? '';
  const last = norm.last_name ?? norm.lastName ?? '';
  const name = (norm.name || `${first} ${last}`.trim()) || undefined;

  // Derive status + boolean
  let statusStr;
  if (has(norm.status)) statusStr = toNormStatus(norm.status);
  else if (has(norm.active)) statusStr = toNormStatus(norm.active);
  else if (has(norm?.creator?.active)) statusStr = toNormStatus(norm.creator.active);
  else if (has(norm.is_active)) statusStr = toNormStatus(norm.is_active);

  const activeBool = boolFromAny(
    has(norm.active) ? norm.active
    : has(norm.status) ? norm.status
    : has(norm?.creator?.active) ? norm.creator.active
    : has(norm.is_active) ? norm.is_active
    : false
  );

  return {
    ...norm,
    name,
    email: norm.email,
    phone: norm.phone_number || norm.phone || norm.msisdn || norm.mobile,
    is_active: norm.is_active, // keep raw if server sends it
    status: statusStr,         // 'active' | 'inactive'
    active: activeBool,        // boolean canonical for UI
    role: norm.role,
    kyc_status: norm.kyc_status,
    dob: norm.dob,
    dobReadable: formatReadableDate(norm.dob),
    createdAtReadable: formatReadableDate(norm.created_at || norm.createdAt),
    updatedAtReadable: formatReadableDate(norm.updated_at || norm.updatedAt),
  };
};

const sameEntity = (m, needleId) =>
  Number(m?.id ?? m?.member_id) === Number(needleId);

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
          sameEntity(m, id)
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

  // Toggle status with optimistic local update.
  // Primary:  POST /admin/user/status/{id}  body: { is_active: 1|0 }
  // Fallback: POST /admin/user/{id}         body: { is_active, active, status, status_int }
  // Creator?: POST /admin/creator/status/{creatorId}
  toggleMemberStatus: async (id, currentRow = undefined) => {
    set({ error: null });
    const state = get();

    // Determine current & next
    const current =
      currentRow ||
      state.members.find((m) => sameEntity(m, id)) ||
      {};

    const currentActive =
      typeof current.active === 'boolean'
        ? current.active
        : boolFromAny(
            (current.active !== undefined ? current.active : undefined) ??
            (current.status !== undefined ? current.status : undefined) ??
            (current?.creator?.active !== undefined ? current.creator.active : undefined) ??
            (current.is_active !== undefined ? current.is_active : undefined) ??
            false
          );

    const nextActive = !currentActive;

    // Optimistic local update first
    set((prev) => {
      const members = (prev.members || []).map((m) =>
        sameEntity(m, id)
          ? {
              ...m,
              active: nextActive,
              is_active: nextActive ? 1 : 0,
              status: nextActive ? 'active' : 'inactive',
              creator: m.creator ? { ...m.creator, active: nextActive } : m.creator,
            }
          : m
      );
      localStorage.setItem('members', JSON.stringify(members));
      return { members };
    });

    // Try API writes
    const primaryPayload = { is_active: nextActive ? 1 : 0 };
    const compatPayload = {
      is_active: nextActive ? 1 : 0,
      active: nextActive,
      status: nextActive ? 'active' : 'inactive',
      status_int: nextActive ? 1 : 0,
    };

    try {
      try {
        await api.post(`/admin/user/status/${id}`, primaryPayload);
      } catch (e1) {
        try {
          await api.post(`/admin/user/${id}`, compatPayload);
        } catch (e2) {
          const creatorId = current?.creator?.id ?? id;
          await api.post(`/admin/creator/status/${creatorId}`, primaryPayload);
        }
      }
      // success -> keep optimistic state
    } catch (error) {
      // rollback on failure
      set((prev) => {
        const members = (prev.members || []).map((m) =>
          sameEntity(m, id)
            ? {
                ...m,
                active: currentActive,
                is_active: currentActive ? 1 : 0,
                status: currentActive ? 'active' : 'inactive',
                creator: m.creator ? { ...m.creator, active: currentActive } : m.creator,
              }
            : m
        );
        localStorage.setItem('members', JSON.stringify(members));
        return { members };
      });
      console.error('Error toggling member status:', error);
      set({
        error: error?.response?.data?.message || error.message,
      });
      throw new Error(error?.response?.data?.message || error.message);
    }
  },
}));

export default useMembersStore;
