import { create } from 'zustand';
import axios from 'axios';
import { BASE_URL } from '../config'; // Import the base URL from the config file

const useInvestmentStore = create((set) => ({
  investments: [],
  loading: false,
  error: null,

  // Action to create a new investment
  createInvestment: async (investmentData) => {
    set({ loading: true, error: null });
    try {
      // Make an API call to create the investment
      const response = await axios.post(`${BASE_URL}/api/v1/admin/investment/create`, investmentData);
      const newInvestment = response.data.data;  // The created investment data

      // Add the new investment to the state
      set((state) => ({
        investments: [...state.investments, newInvestment],
        loading: false,
      }));

      return { message: 'Investment created successfully!' };
    } catch (error) {
      console.error('Error creating investment:', error);
      set({ error: error.message, loading: false });
      throw new Error(error.message);  // Rethrow the error to be handled in the component
    }
  },
}));

export default useInvestmentStore;
