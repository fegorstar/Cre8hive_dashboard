// src/router/index.js
import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import Investments from '../pages/dashboard/Investments';
import Reports from '../pages/dashboard/Reports';
import ServiceCategories from '../pages/dashboard/ServiceCategories';
import Creators from '../pages/dashboard/Creators';
import Members from '../pages/dashboard/Members'; // ✅ NEW

import useAuthStore from '../store/authStore';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore((s) => s);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

const router = createBrowserRouter([
  { path: '/', element: <Login /> },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/investments',
    element: (
      <ProtectedRoute>
        <Investments />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports',
    element: (
      <ProtectedRoute>
        <Reports />
      </ProtectedRoute>
    ),
  },
  {
    path: '/service-categories',
    element: (
      <ProtectedRoute>
        <ServiceCategories />
      </ProtectedRoute>
    ),
  },
  {
    path: '/creators',
    element: (
      <ProtectedRoute>
        <Creators />
      </ProtectedRoute>
    ),
  },
  {
    path: '/members', // ✅ NEW ROUTE
    element: (
      <ProtectedRoute>
        <Members />
      </ProtectedRoute>
    ),
  },
  // optional catch-all:
  // { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

export default router;
