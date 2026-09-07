
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '');

const SuperAdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/super-admin/login`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          credentials: 'include',

          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Super Admin login failed'
        );
      }

      console.log(
        'Super Admin Login:',
        data
      );

      // Redirect to Super Admin Dashboard
      navigate(
        '/super-admin/dashboard',
        { replace: true }
      );

    } catch (error) {
      console.error(
        'Super Admin Login Error:',
        error
      );

      setError(
        error.message ||
          'Super Admin login failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">

      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">

        {/* Header */}
        <div className="text-center mb-6">

          <h1 className="text-2xl font-bold text-gray-900">
            Super Admin Login
          </h1>

          <p className="text-gray-500 mt-2">
            System Administrator
          </p>

        </div>


        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-100 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}


        {/* Login Form */}
        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >

          {/* Email */}
          <div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="superadmin@shop.com"
              required
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black focus:border-black"
            />

          </div>


          {/* Password */}
          <div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter Super Admin password"
              required
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black focus:border-black"
            />

          </div>


          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded-lg py-3 font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? 'Logging in...'
              : 'Login as Super Admin'}
          </button>

        </form>


        {/* Back to Admin Login */}
        <div className="mt-6 text-center">

          <button
            type="button"
            onClick={() =>
              navigate('/login')
            }
            className="text-sm text-gray-600 hover:text-black font-medium transition-colors"
          >
            ← Back to Admin Login
          </button>

        </div>

      </div>

    </div>
  );
};

export default SuperAdminLogin;
