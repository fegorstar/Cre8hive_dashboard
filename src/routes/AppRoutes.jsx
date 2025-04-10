import React from 'react'; // Ensure React is imported
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Import your components
import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import Investments from '../pages/dashboard/Investments'; // Import the new Investments page
import Reports from '../pages/dashboard/Reports';
import useAuthStore from '../store/authStore'; // Zustand store for authentication state

// ProtectedRoute component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore((state) => state); // Check authentication from Zustand store
  if (!isAuthenticated) {
    // Redirect them to the login page if not authenticated
    return <Navigate to="/" replace />;
  }
  return children;
};

const router = createBrowserRouter([
  { path: '/', element: <Login /> }, // Login page (public route)
  { 
    path: '/dashboard', 
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ) 
  },
  { 
    path: '/investments', 
    element: (
      <ProtectedRoute>
        <Investments />
      </ProtectedRoute>
    ) 
  },
  { 
    path: '/reports', 
    element: (
      <ProtectedRoute>
        <Reports />
      </ProtectedRoute>
    ) 
  },
]);

export default router;
