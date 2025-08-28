import { create } from "zustand";
import axios from "axios";
import { BASE_URL } from "../config";

const api = axios.create({ baseURL: BASE_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  config.headers = config.headers || {};
  config.headers.Accept = "application/json";
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// defensively unwrap api payloads
const getObject = (res) =>
  (res?.data?.data && typeof res.data.data === "object" && res.data.data) ||
  (res?.data && typeof res.data === "object" && res.data) ||
  null;

const useProfileStore = create((set, get) => ({
  me: null,
  loading: false,
  error: null,

  fetchMe: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get("/profile/me");
      const me = getObject(res) || res?.data;
      set({ me, loading: false });
    } catch (e) {
      set({ loading: false, error: e?.message || "Failed to load profile." });
      throw e;
    }
  },

  updateMe: async (payload) => {
    set({ loading: true, error: null });
    try {
      const res = await api.put("/profile/update", payload);
      const me = getObject(res) || res?.data;
      set({ me, loading: false });
    } catch (e) {
      set({ loading: false, error: e?.message || "Failed to update profile." });
      throw e;
    }
  },
}));

export default useProfileStore;
