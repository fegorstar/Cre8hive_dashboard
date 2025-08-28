// src/lib/apiClient.js
// A single Axios instance for the whole app.
// - Injects Bearer token from localStorage into every request.
// - Adds Laravel-friendly headers.
// - On 401/419 (expired/invalid session), logs out and hard-redirects to "/".

import axios from "axios";
import { BASE_URL } from "../config";
import useAuthStore from "../store/authStore";

const apiClient = axios.create({ baseURL: BASE_URL });

// Attach default headers + token before every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  config.headers = config.headers || {};
  config.headers.Accept = "application/json";
  if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If backend says "Unauthenticated"/expired, clean up and bounce to login
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 419) {
      try {
        useAuthStore.getState().logout();
      } finally {
        // Hard redirect (works even outside React tree)
        window.location.assign("/");
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
