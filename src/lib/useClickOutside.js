import { useEffect } from "react";

/** Click outside + Esc hook */
const useClickOutside = (ref, onClose) => {
  useEffect(() => {
    const handleDown = (e) => {
      if (!ref?.current) return;
      if (!ref.current.contains(e.target)) onClose?.();
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [ref, onClose]);
};

export default useClickOutside;
