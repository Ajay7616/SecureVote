import React from 'react';
import { AlertTriangle, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
        <AlertTriangle className="w-10 h-10 text-red-600" />
      </div>

      <h1 className="text-5xl font-bold text-gray-900 mb-4">404</h1>

      <h2 className="text-2xl font-semibold text-gray-800 mb-2">
        Page Not Found
      </h2>

      <p className="text-gray-600 max-w-md mb-8">
        Oops! The page you’re looking for doesn’t exist or may have been moved.
        Don’t worry—your vote is still safe 😉
      </p>

      <Link
        to="/"
        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        <Home className="w-5 h-5 mr-2" />
        Back to Home
      </Link>
    </div>
  );
};

export default NotFound;
