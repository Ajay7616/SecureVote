import React, { useState } from 'react';
import { Shield, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm relative z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">

          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">SecureVote</h1>
              <p className="text-xs text-gray-500">Blockchain Voting System</p>
            </div>
          </div>

          
          <div className="hidden md:flex items-center space-x-8">
            <a href="/#/" className="text-gray-700 hover:text-blue-600">Home</a>
            <a href="#about" className="text-gray-700 hover:text-blue-600">About</a>
            <a href="#features" className="text-gray-700 hover:text-blue-600">Features</a>
            <a href="#contact" className="text-gray-700 hover:text-blue-600">Contact</a>
            <a href="/#/feedback" className="text-gray-700 hover:text-blue-600">Feedback</a>
          </div>

          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={() => navigate('/employee-login')}
              className="px-4 py-2 text-sm text-gray-700 hover:text-blue-600"
            >
              Employee Login
            </button>

            <button
              onClick={() => navigate('/voter-login')}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Voter Login
            </button>
          </div>

          <div className="relative md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
                
                <a href="/#/" className="block px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setIsMenuOpen(false)}>Home</a>
                <a href="#about" className="block px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setIsMenuOpen(false)}>About</a>
                <a href="#features" className="block px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setIsMenuOpen(false)}>Features</a>
                <a href="#contact" className="block px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setIsMenuOpen(false)}>Contact</a>
                <a href="/#/feedback" className="block px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setIsMenuOpen(false)}>Feedback</a>

                <div className="border-t my-2"></div>

                <button
                  onClick={() => {
                    navigate('/employee-login');
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Employee Login
                </button>

                <button
                  onClick={() => {
                    navigate('/voter-login');
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
                >
                  Voter Login
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;