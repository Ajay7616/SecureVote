import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-600">© 2026 SecureVote. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="" className="text-sm text-gray-600 hover:text-blue-600">Privacy Policy</a>
            <a href="" className="text-sm text-gray-600 hover:text-blue-600">Terms of Service</a>
            <a href="/#/feedback" className="text-sm text-gray-600 hover:text-blue-600">Help</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;