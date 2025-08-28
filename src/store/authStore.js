// src/store/authStore.js
// Auth state using Zustand.
// - Matches your login response: { message, token, user }.
// - Persists token/user in localStorage.
// - Exposes login() & logout().
// - Rehydrates on app start so refresh keeps you logged in.

import { create } from "zustand";
import apiClient from "../lib/apiClient"; // <-- unified HTTP client

// (Optional fallback) Set global header for any stray axios usage you might have.
// The main path is apiClient which already injects Authorization for each request.
const setAuthHeader = (token) => {
  // Intentionally left minimal; prefer apiClient everywhere.
};

const useAuthStore = create((set, get) => ({
  // ---------- STATE ----------
  isAuthenticated: false,
  user: null,
  token: localStorage.getItem("authToken") || null,

  // ---------- ACTIONS ----------
  // Rehydrate from localStorage (called once at the bottom)
  loadStoredAuthData: () => {
    const token = localStorage.getItem("authToken");
    const rawUser = localStorage.getItem("user");

    try {
      const user = rawUser && rawUser !== "undefined" ? JSON.parse(rawUser) : null;

      if (token) {
        set({ isAuthenticated: true, user, token });
        setAuthHeader(token);
      } else {
        set({ isAuthenticated: false, user: null, token: null });
        setAuthHeader(null);
      }
    } catch {
      // Corrupt user JSON → clear it; keep token if present
      localStorage.removeItem("user");
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
  // Your API returns:
  // {
  //   "message": "Admin login successful",
  //   "token": "6|xxxx",
  //   "user": { ... }
  // }
  login: async (email, password) => {
    const res = await apiClient.post(`/admin/login`, { email, password });
    const { token, user } = res.data || {};

    if (!token) {
      throw new Error("Login response missing token");
    }

    // Persist to localStorage (used by router + apiClient)
    localStorage.setItem("authToken", token);
    localStorage.setItem("user", JSON.stringify(user ?? null));

    // Update store
    set({
      isAuthenticated: true,
      user: user ?? null,
      token,
    });

    // (Optional) set global header for any stray axios usage
    setAuthHeader(token);

    return { message: "Login successful" };
  },

  // Logout everywhere
  logout: () => {
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      set({ isAuthenticated: false, user: null, token: null });
      setAuthHeader(null);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  },
}));

// Rehydrate on store init so refresh keeps you logged in
useAuthStore.getState().loadStoredAuthData();

export default useAuthStore;
