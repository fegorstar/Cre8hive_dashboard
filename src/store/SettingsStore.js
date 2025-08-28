// src/store/SettingsStore.js
// Settings store
// Endpoints are conventional; tweak paths to match your backend if needed.
// - PUT {BASE_URL}/admin/change-password
// - PUT {BASE_URL}/admin/change-pin
//
// Both requests include the Bearer token automatically.

import { create } from "zustand";
import axios from "axios";
import { BASE_URL } from "../config";

const api = axios.create({ baseURL: BASE_URL.replace(/\/$/, "") });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  config.headers = config.headers || {};
  config.headers.Accept = "application/json";
  if (!config.headers["Content-Type"]) config.headers["Content-Type"] = "application/json";
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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

const useSettingsStore = create((set) => ({
  loading: false,
  error: null,

  changePassword: async ({ current_password, new_password, new_password_confirmation }) => {
    set({ loading: true, error: null });
    try {
      await api.put("/admin/change-password", {
        current_password,
        new_password,
        new_password_confirmation,
      });
      set({ loading: false });
      return { message: "Password updated successfully." };
    } catch (err) {
      const message = getErrorMessage(err, "Failed to update password.");
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },

  changePin: async ({ current_pin, new_pin, new_pin_confirmation }) => {
    set({ loading: true, error: null });
    try {
      await api.put("/admin/change-pin", {
        current_pin,
        new_pin,
        new_pin_confirmation,
      });
      set({ loading: false });
      return { message: "PIN updated successfully." };
    } catch (err) {
      const message = getErrorMessage(err, "Failed to update PIN.");
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
}));

export default useSettingsStore;
