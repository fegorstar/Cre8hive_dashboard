import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore'; // Import Zustand store for login

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // State to handle loading
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  const navigate = useNavigate();

  // Access the login function from Zustand store
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    document.title = 'Login'; // Dynamically set the title of the page
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); // Set loading to true when login starts

    try {
      // Call the login method from Zustand store
      await login(email, password);
      navigate('/dashboard'); // Redirect to the Dashboard after successful login
    } catch (err) {
      setLoading(false); // Set loading to false after the login attempt

      // Check if the error response has specific field errors
      if (err?.response?.data?.errors) {
        const errorMessages = err.response.data.errors;

        // Extract the first error message for each field
        const errorMessage = Object.keys(errorMessages)
          .map((field) => `${field}: ${errorMessages[field][0]}`)
          .join(' | ');

        setError(errorMessage);
      } else {
        setError('Invalid login credentials.');
      }

      // Set a timeout to remove the error message after 5 seconds
      setTimeout(() => {
        setError('');
      }, 5000);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="w-full max-w-sm bg-white shadow-sm rounded-xl p-8">
        {/* Logo — same dimensions as Navbar */}
        <div className="flex justify-center mb-6">
          <img
            src="/assets/images/Crea8Hive-Logo.png"
            alt="Crea8Hive Logo"
            className="block w-auto h-10 object-contain shrink-0"
            style={{ aspectRatio: 'auto', imageRendering: 'auto' }}
          />
        </div>

        <h3 className="text-bg font-semibold text-center text-gray-800 mb-5">Login to Admin</h3>

        {/* Display the error message if login fails */}
        {error && <div className="text-red-500 mb-4 text-center">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-600">
              Username/Email address
            </label>
            <input
              type="text"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g johndoe@gmail.com"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D3490] transition duration-200"
              required
              autoFocus
            />
          </div>

          <div className="mb-6 relative">
            <label htmlFor="password" className="block text-sm font-medium text-gray-600">
              Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D3490] transition duration-200"
              required
            />
            {/* Font Awesome Eye Icon */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-gray-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <i className="fa fa-eye-slash" /> : <i className="fa fa-eye" />}
            </button>
          </div>

          <button
            type="submit"
            className="w-full p-3 rounded-lg text-white transition duration-200 disabled:opacity-70"
            style={{ backgroundColor: '#4D3490' }}
            disabled={loading}
          >
            {loading ? (
              <div className="flex justify-center items-center">
                <svg
                  role="status"
                  className="w-6 h-6 text-white animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 3v3m0 12v3m9-9h-3m-12 0H3"
                  />
                </svg>
              </div>
            ) : (
              'Login'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
