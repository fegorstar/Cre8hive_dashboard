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
const BRAND_RGB = 'rgb(77, 52, 144)';
const LOGO_LIGHT = '/assets/images/logo-dash.png';
const LOGO_BRAND = '/assets/images/logo-white.png';

const Sidebar = (props) => {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  // Store state (fallback if props not passed)
  const storeOpen = useLayoutStore((s) => s.sidebarOpen);
  const storeToggle = useLayoutStore((s) => s.toggleSidebar);
  const storeClose = useLayoutStore((s) => s.closeSidebar);

  const uiTheme = useLayoutStore((s) => s.uiTheme); // 'light' | 'brand'
  const isBrand = uiTheme === 'brand';

  const isOpen =
    typeof props?.isOpen === 'boolean' ? props.isOpen : storeOpen;
  const toggleSidebar =
    typeof props?.toggleSidebar === 'function' ? props.toggleSidebar : storeToggle;
  const closeSidebar =
    typeof props?.toggleSidebar === 'function' ? () => props.toggleSidebar() : storeClose;

  const drawerRef = useRef(null); // for outside-click detection

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

  // document-level outside click (pointerdown)
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e) => {
      if (drawerRef.current && drawerRef.current.contains(e.target)) return;
      closeSidebar();
    };
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
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Nav item with RIGHT-side active highlight & theme-aware colors ----------
  const NavItem = ({ title, path, icon: Icon }) => {
    const active =
      location.pathname === path || location.pathname.startsWith(path + '/');

    const base =
      'flex items-center rounded-md text-base font-medium transition-colors px-4 py-3 pr-6';

    const textCls = isBrand
      ? active
        ? 'text-white bg-white/20'
        : 'text-white/90 hover:text-white hover:bg-white/10'
      : active
        ? 'bg-violet-50 text-[#4D3490]'
        : 'text-[#667085] hover:bg-violet-50 hover:text-[#4D3490]';

    const iconCls = isBrand
      ? active
        ? 'text-white'
        : 'text-white/90 group-hover:text-white'
      : active
        ? 'text-[#4D3490]'
        : 'text-[#667085] group-hover:text-[#4D3490]';

    const barColor = isBrand ? 'rgba(255,255,255,0.9)' : ACCENT;

    return (
      <li className="group relative">
        <Link
          to={path}
          aria-current={active ? 'page' : undefined}
          onClick={handleLinkClick}
          className={[base, textCls].join(' ')}
        >
          {Icon ? <Icon className={['mr-3 h-5 w-5 transition-colors', iconCls].join(' ')} /> : null}
          <span>{title}</span>

          {/* Right-side highlighter for ACTIVE state */}
          {active && (
            <span
              aria-hidden="true"
              className="absolute right-0 top-1.5 bottom-1.5 w-1.5 rounded-l-full"
              style={{
                background: barColor,
                boxShadow: isBrand
                  ? '0 0 0 2px rgba(255,255,255,0.18)'
                  : '0 0 0 2px rgba(77,52,144,0.12)',
              }}
            />
          )}
        </Link>
      </li>
    );
  };

  // Shared container styles for asides
  const asideStyle = {
    backgroundColor: isBrand ? BRAND_RGB : '#ffffff',
    borderColor: isBrand ? 'rgba(255,255,255,0.2)' : '#E5E7EB',
    color: isBrand ? '#ffffff' : '#111827',
  };

  const logoSrc = isBrand ? LOGO_BRAND : LOGO_LIGHT;

  // HIDE scrollbars but keep scrollability (Firefox + legacy Edge)
  const hideScrollInline = {
    scrollbarWidth: 'none',   // Firefox
    msOverflowStyle: 'none',  // IE/Edge (legacy)
  };

  const sbTheme = isBrand ? 'brand' : 'light'; // just a hook if you need it later

  return (
    <>
      {/* component-scoped, inline CSS for WebKit to hide scrollbars */}
      <style>{`
        [data-sb="scroll"]::-webkit-scrollbar { width: 0; height: 0; }
        [data-sb="scroll"]::-webkit-scrollbar-track { background: transparent; }
        [data-sb="scroll"]::-webkit-scrollbar-thumb { background: transparent; }
      `}</style>

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
          'fixed left-0 top-0 h-full w-[82vw] max-w-[18rem] border-r z-50 shadow-xl',
          'transition-transform duration-200 lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={asideStyle}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Sidebar"
        tabIndex={-1}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: asideStyle.borderColor }}
        >
          <Link to={user ? '/dashboard' : '/'} className="navbar-brand" onClick={handleLinkClick} aria-label="Soundhive">
            <img src={logoSrc} alt="Soundhive" className="h-6 w-auto" />
          </Link>
          <button
            type="button"
            onClick={closeSidebar}
            className={[
              'inline-flex items-center justify-center w-9 h-9 rounded-md border',
              isBrand ? 'border-white/25 hover:bg-white/10 text-white' : 'border-gray-300 hover:bg-gray-100 text-gray-700',
            ].join(' ')}
            aria-label="Close menu"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Drawer body (scrollable, scrollbar hidden) */}
        <div
          className="h-[calc(100%-56px)] overflow-y-auto pt-6 pb-4"
          data-sb="scroll"
          data-sb-theme={sbTheme}
          style={hideScrollInline}
        >
          <ul className="flex flex-col space-y-1 px-3">
            {menuItems.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
          </ul>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 h-full w-64 border-r z-20"
        style={asideStyle}
        aria-label="Sidebar"
      >
        <div className="h-full flex flex-col w-full">
          {/* Logo header */}
          <div
            className="flex items-center justify-center pt-6 pb-3 border-b"
            style={{ borderColor: asideStyle.borderColor }}
          >
            <Link to={user ? '/dashboard' : '/'} className="navbar-brand" aria-label="Soundhive">
              <img src={logoSrc} alt="Soundhive" className="w-32 h-auto" />
            </Link>
          </div>

          {/* MAIN NAV (scrollable, scrollbar hidden) */}
          <ul
            className="flex-1 overflow-y-auto flex flex-col space-y-1 px-3 pt-6 pb-4"
            data-sb="scroll"
            data-sb-theme={sbTheme}
            style={hideScrollInline}
          >
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
