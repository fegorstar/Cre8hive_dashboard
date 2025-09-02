// src/router/index.js
import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import Investments from '../pages/dashboard/Investments';
import InvestmentDetails from '../pages/dashboard/InvestmentDetails';
import Reports from '../pages/dashboard/Reports';
import ServiceCategories from '../pages/dashboard/ServiceCategories';
import Creators from '../pages/dashboard/Creators';
import CreatorDetails from '../pages/dashboard/CreatorDetails'; // 👈 NEW
import Members from '../pages/dashboard/Members';
import Disputes from '../pages/dashboard/Disputes';
import Reviews from '../pages/dashboard/Reviews';
import Settings from "../pages/dashboard/Settings";
import Transactions from "../pages/dashboard/Transactions";
import Profile from "../pages/dashboard/Profile";

import useAuthStore from '../store/authStore';

/**
 * ✅ IMPORTANT:
 * Use minimal selectors to avoid re-renders. Gate by token presence so
 * hard-refresh (token in localStorage) still works.
 */
const ProtectedRoute = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  const tokenFromStorage = token || localStorage.getItem('authToken');
  const allowed = Boolean(tokenFromStorage);

  if (!allowed) return <Navigate to="/" replace />;
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

  // Investments list
  {
    path: '/investments',
    element: (
      <ProtectedRoute>
        <Investments />
      </ProtectedRoute>
    ),
  },

  // Investment details
  {
    path: '/investments/:id',
    element: (
      <ProtectedRoute>
        <InvestmentDetails />
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

  // Creators list
  {
    path: '/creators',
    element: (
      <ProtectedRoute>
        <Creators />
      </ProtectedRoute>
    ),
  },

  // 👇 NEW: Creator details page (opened by "View")
  {
    path: '/creators/:id',
    element: (
      <ProtectedRoute>
        <CreatorDetails />
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
    path: '/disputes',
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
    path: '/settings',
    element: (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    ),
  },
  {
    path: '/transactions',
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

  // Optional catch-all:
  // { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

export default router;
