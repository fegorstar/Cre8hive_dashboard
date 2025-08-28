import React, { useState } from "react";
import { FiX } from "react-icons/fi";

/** Lightweight toast system (no external lib) */
export const ToastAlert = ({ toasts, remove }) => (
  <div className="fixed top-4 right-4 z-[100] space-y-2">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`min-w-[240px] max-w-[360px] rounded-md shadow-lg px-4 py-3 text-sm text-white ${
          t.type === "error" ? "bg-red-600" : "bg-green-600"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="font-medium">
            {t.title || (t.type === "error" ? "Error" : "Success")}
          </div>
          <button className="opacity-80 hover:opacity-100" onClick={() => remove(t.id)}>
            <FiX className="h-4 w-4" />
          </button>
        </div>
        {t.message && <div className="mt-1 text-[13px] opacity-95">{t.message}</div>}
      </div>
    ))}
  </div>
);

export const useToastAlert = () => {
  const [toasts, setToasts] = useState([]);
  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));
  const add = (toast) => {
    const id = Math.random().toString(36).slice(2);
    const t = { id, type: "success", timeout: 3500, ...toast };
    setToasts((prev) => [...prev, t]);
    setTimeout(() => remove(id), t.timeout);
  };
  return { toasts, add, remove };
};
