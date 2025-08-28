// src/router/index.js
import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import Investments from '../pages/dashboard/Investments';
import Reports from '../pages/dashboard/Reports';
import ServiceCategories from '../pages/dashboard/ServiceCategories';
import Creators from '../pages/dashboard/Creators';
import Members from '../pages/dashboard/Members';
import Disputes from '../pages/dashboard/Disputes'; // 👈 NEW
import Reviews from '../pages/dashboard/Reviews';
import Settings from "../pages/dashboard/Settings";
import Transactions from "../pages/dashboard/Transactions";
import Profile from "../pages/dashboard/Profile";


import useAuthStore from '../store/authStore';

/**
 * ✅ IMPORTANT:
 * Select primitives only to avoid returning a fresh object each render.
 */
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);

  // Allow access if there's a token either in store or localStorage (handles refresh)
  const tokenFromStorage = token || localStorage.getItem('authToken');
  const allowed = Boolean(tokenFromStorage);

  if (!allowed || !isAuthenticated) return <Navigate to="/" replace />;
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
    path: '/members',
    element: (
      <ProtectedRoute>
        <Members />
      </ProtectedRoute>
    ),
  },
  {
    path: '/disputes', // 👈 NEW
    element: (
      <ProtectedRoute>
        <Disputes />
      </ProtectedRoute>
    ),
  },

  {
    path: '/reviews',
    element: (
      <ProtectedRoute>
        <Reviews />
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    ),
  },

  {
    path: "/transactions",
    element: (
      <ProtectedRoute>
        <Transactions />
      </ProtectedRoute>
    ),
  },

  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },
  // { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

export default router;
