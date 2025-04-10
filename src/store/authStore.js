import { create } from 'zustand';
import axios from 'axios';
import { BASE_URL } from '../config'; // Import the base URL from the config file

// Zustand store for managing authentication state
const useAuthStore = create((set) => ({
  isAuthenticated: false,  // Initially not authenticated
  user: null,              // User info will be set after login
  token: localStorage.getItem('authToken') || null,  // Load token from localStorage if available

  // Method for login
  login: async (email, password) => {
    try {
      const response = await axios.post(`${BASE_URL}/admin/login`, { email, password });
      const { access_token, admin } = response.data; // Destructure response to get access_token and admin data

      // Update the store with the user data and token
      set({
        isAuthenticated: true,
        user: admin,  // Save the full user object (not just first_name)
        token: access_token,
      });

      // Save token and user information to localStorage
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('user', JSON.stringify(admin));  // Store entire user object

      return { message: 'Login successful' };
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;  // Rethrow the error to handle it in the component
    }
  },

  // Method for logging out
  logout: () => {
    try {
      // Remove token and user from localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      // Reset Zustand store
      set({
        isAuthenticated: false,
        user: null,
        token: null,
      });

      console.log('Logout successful');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  },

  // Load stored authentication data from localStorage when the app starts
  loadStoredAuthData: () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user'); // Get the entire user object

    if (token && user) {
      set({
        isAuthenticated: true,
        user: JSON.parse(user),  // Parse the user data and store the full object
        token,
      });
    }
  },
}));

// Load stored auth data when the store is initialized
useAuthStore.getState().loadStoredAuthData();

export default useAuthStore;
