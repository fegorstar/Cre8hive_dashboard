// Footer.jsx
import React from 'react';

const Footer = () => {
  return (
    <footer className="px-6 border-t border-gray-300 py-3 flex justify-between items-center absolute bottom-0 w-full">
      <div className="flex flex-col sm:flex-row items-center">
        <p className="m-0 leading-6">
          © {new Date().getFullYear()} Soundhive
        </p>
      </div>
      <div className="text-right">
        <p className="m-0 leading-6">
          Designed by{' '}
          <a href="https://webedge.com.ng/" target="_blank" className="text-indigo-600">
            Webedge
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
