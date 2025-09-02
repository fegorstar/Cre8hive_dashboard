// src/store/LayoutStore.js
// Global UI state: sidebar + theme (light | brand)
// Persists theme to localStorage so it sticks across refreshes.

import { create } from "zustand";

const THEME_KEY = "ui_theme"; // 'light' | 'brand'
const initialTheme =
  (typeof window !== "undefined" && localStorage.getItem(THEME_KEY)) || "light";

const useLayoutStore = create((set, get) => ({
  // Sidebar
  sidebarOpen: false,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),

  // Theme
  uiTheme: initialTheme, // 'light' | 'brand'
  setTheme: (theme) => {
    const t = theme === "brand" ? "brand" : "light";
    if (typeof window !== "undefined") localStorage.setItem(THEME_KEY, t);
    set({ uiTheme: t });
  },
  toggleTheme: () => {
    const next = get().uiTheme === "brand" ? "light" : "brand";
    if (typeof window !== "undefined") localStorage.setItem(THEME_KEY, next);
    set({ uiTheme: next });
  },
}));

export default useLayoutStore;
