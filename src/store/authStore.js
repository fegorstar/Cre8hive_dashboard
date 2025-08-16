// src/store/authStore.js
import { create } from 'zustand';
import axios from 'axios';
import { BASE_URL } from '../config';

// Helper: set/clear global Authorization header for axios
const setAuthHeader = (token) => {
  if (token) {
    axios.defaults.baseURL = BASE_URL;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

const useAuthStore = create((set, get) => ({
  // ---------- STATE ----------
  isAuthenticated: false,
  user: null,
  token: localStorage.getItem('authToken') || null,

  // ---------- ACTIONS ----------
  // Initialize from localStorage (called at the bottom on store init)
  loadStoredAuthData: () => {
    const token = localStorage.getItem('authToken');
    const rawUser = localStorage.getItem('user');

    try {
      const user =
        rawUser && rawUser !== 'undefined' ? JSON.parse(rawUser) : null;

      if (token && user) {
        set({ isAuthenticated: true, user, token });
        setAuthHeader(token);
      } else if (token && !user) {
        // If only token exists, still allow (some endpoints might fetch user later)
        set({ isAuthenticated: true, user: null, token });
        setAuthHeader(token);
      } else {
        set({ isAuthenticated: false, user: null, token: null });
        setAuthHeader(null);
      }
    } catch {
      // Corrupt user in storage; clear it and continue with token-only if present
      localStorage.removeItem('user');
      if (token) {
        set({ isAuthenticated: true, user: null, token });
        setAuthHeader(token);
      } else {
        set({ isAuthenticated: false, user: null, token: null });
        setAuthHeader(null);
      }
    }
  },

  // Login with email/password
  login: async (email, password) => {
    const res = await axios.post(`${BASE_URL}/admin/login`, { email, password });
    const { access_token, admin } = res.data;

    // Persist
    localStorage.setItem('authToken', access_token);
    localStorage.setItem('user', JSON.stringify(admin ?? null));

    // Set global header for subsequent requests
    setAuthHeader(access_token);

    // Update store
    set({
      isAuthenticated: true,
      user: admin ?? null,
      token: access_token,
    });

    return { message: 'Login successful' };
  },

  // Logout everywhere
  logout: () => {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      set({ isAuthenticated: false, user: null, token: null });
      setAuthHeader(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  },
}));

// Run loader on store init so refresh keeps you logged in
useAuthStore.getState().loadStoredAuthData();

export default useAuthStore;
