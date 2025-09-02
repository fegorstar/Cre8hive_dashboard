// src/store/LayoutStore.js
// Minimal global UI state for layout-wide bits like the mobile sidebar.
// Components can import this directly OR keep passing legacy props.

import { create } from "zustand";

const useLayoutStore = create((set, get) => ({
  sidebarOpen: false,

  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
}));

export default useLayoutStore;
