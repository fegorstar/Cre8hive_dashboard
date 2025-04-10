import React from 'react'; // Ensure React is imported

import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom'; // Import RouterProvider to handle routing
import router from './routes/AppRoutes'; // Import the router setup from AppRoutes.js
import './index.css';  // Ensure the CSS file is imported here


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} /> {/* Render the routes using RouterProvider */}
  </React.StrictMode>
);
