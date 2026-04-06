import React, { useState } from 'react';
import { Shield, LayoutDashboard, Vote, LogOut, Menu, X, KeySquare, User } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logoutUser } from '../../store/slices/voterSessionSlice';

const VoterNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const user = useSelector((state) => state.votes.voter);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const voterName = user?.name || "Voter";
  const voterRole = "Voter";

  const navigationItems = [
   
  ];

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/");
    setIsMenuOpen(false);
  };

  return (
    <>
      {isMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />}

      <nav className="bg-white border-b border-gray-200 shadow-sm relative z-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between h-16">

            
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">SecureVote</h1>
                <p className="text-xs text-gray-500">Voter Panel</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{voterName}</p>
                <p className="text-xs text-gray-500">{voterRole}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-md border border-red-200 text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>

              <div className="relative z-50">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden">
                    
                    <div className="sm:hidden px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{voterName}</p>
                      <p className="text-xs text-gray-500">{voterRole}</p>
                    </div>

                    <div className="py-1">
                      {navigationItems.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          className="flex items-center space-x-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <item.icon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium">{item.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!isMenuOpen && (
              <button
                onClick={() => setIsMenuOpen(true)}
                className="sm:hidden p-2 text-gray-600 hover:text-gray-900"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}

          </div>
        </div>
      </nav>
    </>
  );
};

export default VoterNavbar;