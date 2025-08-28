import React, { useEffect } from "react";
import { FiX } from "react-icons/fi";

/** Generic modal with overlay + Esc-to-close */
const Modal = ({ open, title, onClose, children, footer, size = "md", lock = false }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !lock && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, lock]);

  const maxW = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => !lock && onClose?.()}
        aria-hidden={!open}
      />
      <div
        className={`fixed inset-0 z-40 flex items-center justify-center p-4 transition ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
        onClick={() => !lock && onClose?.()}
      >
        <div
          className={`w-full ${maxW} bg-white rounded-xl shadow-xl`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h3 className="text-base font-semibold">{title}</h3>
            <button
              className="p-2 rounded hover:bg-gray-100"
              onClick={() => !lock && onClose?.()}
              aria-label="Close"
              disabled={lock}
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 max-h-[70vh] overflow-auto">{children}</div>

          <div className="px-5 py-4 border-t border-gray-200">{footer}</div>
        </div>
      </div>
    </>
  );
};

export default Modal;
