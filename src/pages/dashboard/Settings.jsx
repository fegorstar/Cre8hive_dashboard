// src/pages/dashboard/Settings.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiX } from "react-icons/fi";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import { ToastAlert, useToastAlert } from "../../components/common/ToastAlert";
import useAuthGuard from "../../lib/useAuthGuard";
import { Spinner } from "../../components/common/Spinner";
import useSettingsStore from "../../store/SettingsStore";

const BRAND_RGB = "rgb(77, 52, 144)";

/* ---------- SlideOver (right panel) ---------- */
const SlideOver = ({ open, title, onClose, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />
      {/* panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="flex flex-col h-full"
          onClick={(e) => e.stopPropagation()} // keep clicks inside
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <h3 className="text-base font-semibold">{title}</h3>
            <button className="p-2 rounded hover:bg-gray-100" onClick={onClose} aria-label="Close">
              <FiX className="w-5 h-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
};

/* ---------- small input ---------- */
const Input = (props) => (
  <input
    {...props}
    className={`w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm placeholder:text-xs placeholder:font-light placeholder:text-gray-400 ${props.className || ""}`}
  />
);

/* ---------- Forms (button sits close to inputs) ---------- */
const ChangePasswordForm = ({ submitting, onSubmit }) => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  return (
    <form
      className="flex-1 p-4 overflow-auto"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          current_password: current,
          new_password: next,
          new_password_confirmation: confirm,
        });
      }}
    >
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Current Password</label>
          <Input
            type="password"
            placeholder="Enter your current password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">New Password</label>
          <Input
            type="password"
            placeholder="Enter new password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Confirm New Password</label>
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        {/* Button sits right below inputs */}
        <button
          type="submit"
          className="mt-2 w-full px-4 py-2 rounded-full text-white inline-flex items-center justify-center gap-2"
          style={{ backgroundColor: BRAND_RGB }}
          disabled={submitting}
        >
          {submitting && <Spinner />}
          Continue
        </button>
      </div>
    </form>
  );
};

const ChangePinForm = ({ submitting, onSubmit }) => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  return (
    <form
      className="flex-1 p-4 overflow-auto"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          current_pin: current,
          new_pin: next,
          new_pin_confirmation: confirm,
        });
      }}
    >
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Current PIN</label>
          <Input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter current PIN"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">New PIN</label>
          <Input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter new PIN"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Confirm New PIN</label>
          <Input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Confirm new PIN"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        {/* Button sits right below inputs */}
        <button
          type="submit"
          className="mt-2 w-full px-4 py-2 rounded-full text-white inline-flex items-center justify-center gap-2"
          style={{ backgroundColor: BRAND_RGB }}
          disabled={submitting}
        >
          {submitting && <Spinner />}
          Continue
        </button>
      </div>
    </form>
  );
};

/* ---------- Page ---------- */
const Settings = () => {
  const navigate = useNavigate();
  useAuthGuard(navigate);

  const toast = useToastAlert();
  const { loading, changePassword, changePin } = useSettingsStore();

  const [panel, setPanel] = useState(null); // "password" | "pin" | null
  const closePanel = useCallback(() => setPanel(null), []);

  const handlePassword = async (payload) => {
    try {
      await changePassword(payload);
      toast.add({ type: "success", title: "Success", message: "Password updated successfully." });
      closePanel();
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Password update failed." });
    }
  };

  const handlePin = async (payload) => {
    try {
      await changePin(payload);
      toast.add({ type: "success", title: "Success", message: "PIN updated successfully." });
      closePanel();
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "PIN update failed." });
    }
  };

  return (
    <main>
      <ToastAlert toasts={toast.toasts} remove={toast.remove} />

      <div className="overflow-x-hidden flex bg-white border-t border-gray-300">
        <Sidebar />
        <div
          id="app-layout-content"
          className="relative min-h-screen w-full min-w-[100vw] md:min-w-0 ml-[15.625rem] [transition:margin_0.25s_ease-out]"
        >
          <Navbar />

          <div className="px-6 pb-20 pt-6">
            <div className="flex items-center mb-4 justify-between -mx-6 border-b border-gray-300 pb-3">
              <p className="inline-block px-6 text-base md:text-lg leading-5 font-semibold">Settings</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-3 text-sm font-semibold">Security</div>

              <div className="px-6 py-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Change Password</div>
                  <div className="text-xs text-gray-500 mt-1">Change your password to a new one</div>
                </div>
                <button onClick={() => setPanel("password")} className="text-sm font-medium" style={{ color: BRAND_RGB }}>
                  Change Password
                </button>
              </div>

              <div className="px-6 py-5 flex items-center justify-between border-t border-gray-100">
                <div>
                  <div className="text-sm font-medium">Change Authentication PIN</div>
                  <div className="text-xs text-gray-500 mt-1">Change or reset your PIN</div>
                </div>
                <button onClick={() => setPanel("pin")} className="text-sm font-medium" style={{ color: BRAND_RGB }}>
                  Change PIN
                </button>
              </div>
            </div>
          </div>

          {/* Panels */}
          <SlideOver open={panel === "password"} title="Reset Password" onClose={closePanel}>
            <ChangePasswordForm submitting={loading} onSubmit={handlePassword} />
          </SlideOver>

          <SlideOver open={panel === "pin"} title="Change PIN" onClose={closePanel}>
            <ChangePinForm submitting={loading} onSubmit={handlePin} />
          </SlideOver>

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Settings;
