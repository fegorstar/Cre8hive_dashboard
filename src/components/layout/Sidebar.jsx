// src/components/layout/Sidebar.jsx
import React, { useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MdSpaceDashboard,
  MdOutlineBarChart,
  MdOutlineAttachMoney,
  MdOutlinePeopleAlt,
  MdOutlineFolder,
  MdOutlineReceiptLong,
  MdOutlineGavel,
  MdOutlineSettings,
  MdOutlineCategory,
} from 'react-icons/md';
import { FiX } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import useLayoutStore from '../../store/LayoutStore';

const ACCENT = '#4D3490';

const Sidebar = (props) => {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  // Store state (fallback if props not passed)
  const storeOpen = useLayoutStore((s) => s.sidebarOpen);
  const storeToggle = useLayoutStore((s) => s.toggleSidebar);
  const storeClose = useLayoutStore((s) => s.closeSidebar);

  const isOpen =
    typeof props?.isOpen === 'boolean' ? props.isOpen : storeOpen;
  const toggleSidebar =
    typeof props?.toggleSidebar === 'function' ? props.toggleSidebar : storeToggle;
  const closeSidebar =
    typeof props?.toggleSidebar === 'function' ? () => props.toggleSidebar() : storeClose;

  const drawerRef = useRef(null); // <-- for outside-click detection

  const menuItems = [
    { title: 'Dashboard', path: '/dashboard', icon: MdSpaceDashboard },
    { title: 'Reports', path: '/reports', icon: MdOutlineBarChart },
    { title: 'Investments', path: '/investments', icon: MdOutlineAttachMoney },
    { title: 'Services', path: '/service-categories', icon: MdOutlineCategory },
    { title: 'Reviews', path: '/reviews', icon: MdOutlinePeopleAlt },
    { title: 'Creators', path: '/creators', icon: MdOutlineFolder },
    { title: 'Users', path: '/members', icon: MdOutlinePeopleAlt },
    { title: 'Transactions', path: '/transactions', icon: MdOutlineReceiptLong },
    { title: 'Disputes', path: '/disputes', icon: MdOutlineGavel },
    { title: 'Settings', path: '/settings', icon: MdOutlineSettings },
  ];

  // -------- Update browser tab title on route change --------
  useEffect(() => {
    const found = menuItems.find(
      (m) => location.pathname === m.path || location.pathname.startsWith(m.path + '/')
    );
    document.title = `Soundhive — ${found ? found.title : 'Dashboard'}`;
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------- Disable body scroll when mobile drawer is open --------
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // -------- Close drawer on link click / backdrop / ESC (mobile) --------
  const handleLinkClick = useCallback(() => {
    if (isOpen) closeSidebar();
  }, [isOpen, closeSidebar]);

  // NEW: document-level outside click (pointerdown) — guarantees close on any outside area
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e) => {
      // ignore if the click is inside the drawer
      if (drawerRef.current && drawerRef.current.contains(e.target)) return;
      // otherwise, close (mobile)
      closeSidebar();
    };

    // use pointerdown for better mobile responsiveness
    document.addEventListener('pointerdown', onPointerDown, { capture: true });
    return () => document.removeEventListener('pointerdown', onPointerDown, { capture: true });
  }, [isOpen, closeSidebar]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeSidebar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeSidebar]);

  // Close on route change (mobile)
  useEffect(() => {
    if (isOpen) closeSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ---------- Nav item component with RIGHT-side active highlight ----------
  const NavItem = ({ title, path, icon: Icon }) => {
    const active =
      location.pathname === path || location.pathname.startsWith(path + '/');

    return (
      <li className="group relative">
        <Link
          to={path}
          aria-current={active ? 'page' : undefined}
          onClick={handleLinkClick}
          className={[
            'flex items-center rounded-md text-base font-medium transition-colors',
            'px-4 py-3 pr-6', // extra right padding so the right highlight doesn't overlap text
            active
              ? 'bg-violet-50 text-[#4D3490]'
              : 'text-[#667085] hover:bg-violet-50 hover:text-[#4D3490]',
          ].join(' ')}
        >
          {Icon ? (
            <Icon
              className={[
                'mr-3 h-5 w-5 transition-colors',
                active ? 'text-[#4D3490]' : 'text-[#667085] group-hover:text-[#4D3490]',
              ].join(' ')}
            />
          ) : null}
          <span>{title}</span>

          {/* Right-side highlighter for ACTIVE state */}
          {active && (
            <span
              aria-hidden="true"
              className="absolute right-0 top-1.5 bottom-1.5 w-1.5 rounded-l-full"
              style={{
                background: ACCENT,
                boxShadow: '0 0 0 2px rgba(77,52,144,0.12)', // subtle glow
              }}
            />
          )}
        </Link>
      </li>
    );
  };

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        ref={drawerRef}
        id="mobile-sidebar"
        className={[
          'fixed left-0 top-0 h-full w-[82vw] max-w-[18rem] bg-white border-r border-gray-200 z-50 shadow-xl',
          'transition-transform duration-200 lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Sidebar"
        tabIndex={-1}
      >
        {/* Drawer header with close button */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <Link to={user ? '/dashboard' : '/'} className="navbar-brand" onClick={handleLinkClick}>
            <img src="/assets/images/logo-dash.png" alt="Logo" className="h-6 w-auto" />
          </Link>
          <button
            type="button"
            onClick={closeSidebar}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-300"
            aria-label="Close menu"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Drawer body (extra top padding for roomy, modern feel) */}
        <div className="h-[calc(100%-56px)] overflow-y-auto pt-6 pb-4">
          <ul className="flex flex-col space-y-1 px-3">
            {menuItems.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
          </ul>
        </div>
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-20"
        aria-label="Sidebar"
      >
        <div className="h-full flex flex-col w-full">
          {/* Extra top padding per your request */}
          <div className="flex items-center justify-center pt-6 pb-3 border-b">
            <Link to={user ? '/dashboard' : '/'} className="navbar-brand">
              <img src="/assets/images/logo-dash.png" alt="Logo" className="w-32 h-auto" />
            </Link>
          </div>

          {/* MAIN NAV — extra top padding & right-edge active highlight */}
          <ul className="flex-1 overflow-y-auto flex flex-col space-y-1 px-3 pt-6 pb-4">
            {menuItems.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
