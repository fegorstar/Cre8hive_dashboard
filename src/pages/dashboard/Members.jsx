// src/pages/dashboard/Members.jsx
// - Search input: icon RIGHT, perfectly centered; text & placeholder vertically centered
// - Status filter built from backend data (normalized) -> accurate for 'inactive' etc.
// - Columns: Member ID, Name, Email, Phone, DOB, Created, Status, Actions  (ID & Updated removed from table)
// - Toggle status via PUT /admin/member/:id { status: ... } (no /toggle)
// - Modal closes when clicking outside (overlay) and on Esc. Content clicks don't close.
// - Footer: bottom-left shows "Showing X–Y of Z records"; bottom-right has pagination
// - Placeholders small + light; Enter in search does instant fetch
// - View modal: richer presentation incl. ID & Updated
// - Edit modal: real form with inputs and loader

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import useMembersStore from "../../store/MembersStore";
import { FiMoreVertical, FiX, FiSearch } from "react-icons/fi";

/* Toast */
const Toast = ({ toasts, remove }) => (
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
          <button
            className="opacity-80 hover:opacity-100"
            onClick={() => remove(t.id)}
            aria-label="Dismiss toast"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
        {t.message && (
          <div className="mt-1 text-[13px] opacity-95">{t.message}</div>
        )}
      </div>
    ))}
  </div>
);

const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const add = (toast) => {
    const id = Math.random().toString(36).slice(2);
    const t = { id, type: "success", timeout: 3500, ...toast };
    setToasts((prev) => [...prev, t]);
    setTimeout(() => remove(id), t.timeout);
  };
  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));
  return { toasts, add, remove };
};

/* Loaders */
const Spinner = ({ className = "" }) => (
  <span
    className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent align-[-0.125em] text-white ${className}`}
    role="status"
    aria-label="loading"
  />
);

const CenterLoader = ({ label = "Loading…" }) => (
  <div className="w-full py-12 flex items-center justify-center">
    <div className="flex items-center gap-3 rounded-lg bg-[#4D3490] text-white px-4 py-3 shadow-lg">
      <Spinner />
      <span className="text-sm font-medium">{label}</span>
    </div>
  </div>
);

/* 3-dots */
const ThreeDotsMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <div className="relative inline-block text-left">
      <button
        className="p-2 rounded hover:bg-gray-100"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <FiMoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 origin-top-right rounded-md border border-gray-200 bg-white shadow-lg z-20">
          {safeItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setOpen(false);
                item.onClick?.();
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* Shared input styles (small, light placeholders) */
const inputBase =
  "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm placeholder:text-xs placeholder:font-light placeholder:text-gray-400";
const selectBase =
  "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm";

/* Modal (overlay/outside/Esc closes; content click doesn’t) */
const Modal = ({ open, title, onClose, children, footer }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <div
        className={`fixed inset-0 z-40 flex items-center justify-center p-4 transition ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-white rounded-lg shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm md:text-base font-semibold">{title}</h3>
            <button
              className="p-2 rounded hover:bg-gray-100"
              onClick={onClose}
              aria-label="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 max-h-[70vh] overflow-auto">{children}</div>
          <div className="px-4 py-3 border-t border-gray-200">{footer}</div>
        </div>
      </div>
    </>
  );
};

const StatusPill = ({ value = "inactive" }) => {
  const active = String(value).toLowerCase() === "active";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        active
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-gray-50 text-gray-700 border border-gray-200"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
};

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
      checked ? "bg-green-500" : "bg-gray-300"
    }`}
    aria-pressed={checked}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
        checked ? "translate-x-5" : "translate-x-1"
      }`}
    />
  </button>
);

/* Helpers */
const toNormStatus = (raw) => {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "1" || v === "true" || v === "active") return "active";
  return "inactive";
};

/* Table with footer (showing + pagination) */
const MembersTable = ({
  rows,
  onView,
  onEdit,
  onToggle,
  togglingId,
  footerLeft,
  footerRight,
}) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const dash = (v) => (v === undefined || v === null || v === "" ? "—" : v);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {/* ID column removed */}
              <th className="text-left px-4 py-3 font-semibold">Member ID</th>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">Email</th>
              <th className="text-left px-4 py-3 font-semibold">Phone</th>
              <th className="text-left px-4 py-3 font-semibold">DOB</th>
              <th className="text-left px-4 py-3 font-semibold">Created</th>
              {/* Updated column removed */}
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {safeRows.map((row) => {
              const isActive = toNormStatus(row.status) === "active";
              return (
                <tr key={row.id} className="border-t border-gray-100">
                  {/* <td className="px-4 py-3">{dash(row.id)}</td> */}
                  <td className="px-4 py-3">{dash(row.member_id)}</td>
                  <td className="px-4 py-3">{dash(row.name)}</td>
                  <td className="px-4 py-3">{dash(row.email)}</td>
                  <td className="px-4 py-3">{dash(row.phone)}</td>
                  <td className="px-4 py-3">{dash(row.dobReadable)}</td>
                  <td className="px-4 py-3">{dash(row.createdAtReadable)}</td>
                  {/* <td className="px-4 py-3">{dash(row.updatedAtReadable)}</td> */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <StatusPill value={toNormStatus(row.status)} />
                      <Toggle checked={isActive} onChange={() => onToggle(row)} />
                      {togglingId === row.id && (
                        <span className="inline-flex items-center text-xs text-gray-500">
                          <Spinner className="!text-gray-500 mr-1" /> updating…
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ThreeDotsMenu
                      items={[
                        { label: "View", onClick: () => onView(row) },
                        { label: "Edit", onClick: () => onEdit(row) },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
            {safeRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-4 py-3 bg-white border-t border-gray-200">
        <div className="text-sm text-gray-600">{footerLeft}</div>
        <div>{footerRight}</div>
      </div>
    </div>
  );
};

/* Read-only view (richer presentation) */
const MemberView = ({ record }) => {
  if (!record) return null;
  const dash = (v) => (v === undefined || v === null || v === "" ? "—" : v);
  const kyc = record.kyc || {};
  const resp = kyc.response || {};

  return (
    <div className="space-y-5">
      {/* Title / Meta */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-base font-semibold">{dash(record.name)}</div>
          <div className="mt-1 text-xs text-gray-500">
            Member ID: <span className="font-medium text-gray-700">{dash(record.member_id)}</span>
          </div>
        </div>
        <StatusPill value={record.status} />
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-0.5 rounded border border-gray-200 text-gray-600">
          ID: {dash(record.id)}
        </span>
        <span className="px-2 py-0.5 rounded border border-gray-200 text-gray-600">
          Joined: {dash(record.createdAtReadable)}
        </span>
        <span className="px-2 py-0.5 rounded border border-gray-200 text-gray-600">
          Updated: {dash(record.updatedAtReadable)}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Email</div>
          <div className="text-gray-800">{dash(record.email)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Phone</div>
          <div className="text-gray-800">{dash(record.phone)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500">DOB</div>
          <div className="text-gray-800">{dash(record.dobReadable)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Status</div>
          <div className="text-gray-800 capitalize">{dash(record.status)}</div>
        </div>
      </div>

      {/* KYC (if present) */}
      {record?.kyc && (
        <div className="space-y-2">
          <div className="text-sm font-semibold">KYC</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-gray-500">BVN</div>
              <div className="text-gray-800">{dash(resp.bvn)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Gender</div>
              <div className="text-gray-800">{dash(resp.gender)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-gray-500">First Name</div>
              <div className="text-gray-800">{dash(resp.firstName)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Last Name</div>
              <div className="text-gray-800">{dash(resp.lastName)}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Image</div>
              <div className="text-gray-800">{resp.imageBase64 ? "✓ embedded" : "—"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* Edit form */
const MemberForm = ({ record, onSubmit, submitting }) => {
  const [name, setName] = useState(record?.name ?? "");
  const [email, setEmail] = useState(record?.email ?? "");
  const [phone, setPhone] = useState(record?.phone ?? "");
  const [dob, setDob] = useState(record?.dob ?? ""); // assume raw dob is acceptable by API
  const [status, setStatus] = useState(toNormStatus(record?.status ?? "inactive"));

  useEffect(() => {
    setName(record?.name ?? "");
    setEmail(record?.email ?? "");
    setPhone(record?.phone ?? "");
    setDob(record?.dob ?? "");
    setStatus(toNormStatus(record?.status ?? "inactive"));
  }, [record]);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name,
          email,
          phone,
          dob,
          status, // include normalized status
        });
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputBase}
            placeholder="Full name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputBase}
            placeholder="name@example.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputBase}
            placeholder="+2348012345678"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">DOB</label>
          <input
            type="date"
            value={dob || ""}
            onChange={(e) => setDob(e.target.value)}
            className={inputBase}
            placeholder="YYYY-MM-DD"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectBase}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <button type="submit" id="__member_submit_btn__" className="hidden" disabled={submitting} />
    </form>
  );
};

/* Page */
const Members = () => {
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) navigate("/login");
  }, [navigate]);

  const {
    members,
    pagination,
    fetchMembers,
    getMember,
    updateMember,       // used for edit
    toggleMemberStatus, // store should call PUT /admin/member/:id with status
  } = useMembersStore();

  const [hydrated, setHydrated] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // 'active' | 'inactive' | ''
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [togglingId, setTogglingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // initial fetch
  useEffect(() => {
    (async () => {
      await fetchMembers?.({ page: 1, per_page: perPage, q: "", status: "" });
      setHydrated(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reactive fetch (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      fetchMembers?.({ page, per_page: perPage, q, status });
    }, 300);
    return () => clearTimeout(t);
  }, [page, q, status, fetchMembers]);

  // Enter in search = immediate fetch + reset to page 1
  const onSearchEnter = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        setPage(1);
        fetchMembers?.({ page: 1, per_page: perPage, q, status });
      }
    },
    [q, status, fetchMembers]
  );

  const rows = useMemo(() => (Array.isArray(members) ? members : []), [members]);

  /* Status options from backend (normalized) */
  const statusSet = useMemo(() => {
    const s = new Set();
    rows.forEach((r) => s.add(toNormStatus(r.status)));
    return s;
  }, [rows]);

  const statusOptions = useMemo(() => {
    const opts = Array.from(statusSet);
    if (opts.length === 0) return ["active", "inactive"];
    if (!opts.includes("active")) opts.push("active");
    if (!opts.includes("inactive")) opts.push("inactive");
    return ["active", "inactive"].filter((o) => opts.includes(o));
  }, [statusSet]);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("view"); // 'view' | 'edit'
  const [modalRecord, setModalRecord] = useState(null);

  const openView = async (record) => {
    try {
      const full = await getMember?.(record.id);
      setModalMode("view");
      setModalRecord(full || record);
      setModalOpen(true);
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Could not load member." });
    }
  };
  const openEdit = async (record) => {
    try {
      const full = await getMember?.(record.id);
      setModalMode("edit");
      setModalRecord(full || record);
      setModalOpen(true);
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Could not load member." });
    }
  };
  const closeModal = () => setModalOpen(false);

  const handleToggle = async (row) => {
    try {
      setTogglingId(row.id);
      await toggleMemberStatus?.(row.id);
      toast.add({ type: "success", title: "Status updated" });
      await fetchMembers?.({ page, per_page: perPage, q, status });
    } catch (e) {
      toast.add({
        type: "error",
        title: "Failed",
        message: e?.message || "Status change failed.",
      });
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  };

  const handleUpdate = async (payload) => {
    try {
      if (!modalRecord?.id) return;
      setSubmitting(true);
      await updateMember?.(modalRecord.id, payload);
      toast.add({ type: "success", title: "Updated", message: "Member updated successfully." });
      await fetchMembers?.({ page, per_page: perPage, q, status });
      closeModal();
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Update failed." });
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Pagination math (API-first; falls back gracefully)
  const total = pagination?.total ?? rows.length ?? 0;
  const per = pagination?.per_page || perPage;
  const totalPages = Math.max(1, Math.ceil((pagination?.total || 0) / per));
  const startIdx = total === 0 ? 0 : (page - 1) * per + 1;
  const endIdx = total === 0 ? 0 : Math.min(page * per, total);

  const footerLeftText =
    total === 0
      ? (q ? `No results for “${q}”` : "No records")
      : `Showing ${startIdx}–${endIdx} of ${total} record${total > 1 ? "s" : ""}`;

  const footerRightControls = (
    <div className="flex items-center gap-2">
      <button
        disabled={page <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className={`px-3 py-1.5 rounded-lg border ${
          page <= 1 ? "text-gray-400 border-gray-200" : "border-gray-300 hover:bg-gray-50"
        }`}
      >
        Prev
      </button>
      <span className="text-sm text-gray-600">
        Page {page} / {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        className={`px-3 py-1.5 rounded-lg border ${
          page >= totalPages ? "text-gray-400 border-gray-200" : "border-gray-300 hover:bg-gray-50"
        }`}
      >
        Next
      </button>
    </div>
  );

  return (
    <main>
      <Toast toasts={toast.toasts} remove={toast.remove} />

      <div className="overflow-x-hidden flex bg-white border-t border-gray-300">
        <Sidebar />
        <div
          id="app-layout-content"
          className="relative min-h-screen w-full min-w-[100vw] md:min-w-0 ml-[15.625rem] [transition:margin_0.25s_ease-out]"
        >
          <Navbar />

          <div className="px-6 pb-20 pt-6">
            {/* Header */}
            <div className="flex items-center mb-4 justify-between -mx-6 border-b border-gray-300 pb-3">
              <p className="inline-block px-6 text-base md:text-lg leading-5 font-semibold">
                Members
              </p>
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                {/* Search — icon on RIGHT, vertically centered; width preserved (w-72) */}
                <div className="relative">
                  <input
                    value={q}
                    onChange={(e) => {
                      setPage(1);
                      setQ(e.target.value);
                    }}
                    onKeyDown={onSearchEnter}
                    className={`h-10 pr-10 pl-3 ${inputBase} w-72`}
                    placeholder="Search members…"
                    aria-label="Search members"
                  />
                  <FiSearch
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>

                {/* Status filter from backend (normalized) */}
                <select
                  value={status}
                  onChange={(e) => {
                    setPage(1);
                    setStatus(e.target.value);
                  }}
                  className={`h-10 ${selectBase} w-48`}
                  aria-label="Filter by status"
                >
                  <option value="">All statuses</option>
                  {statusOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt[0].toUpperCase() + opt.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Right side header space intentionally left blank */}
              <div />
            </div>

            {/* Table / Loader */}
            {!hydrated ? (
              <CenterLoader />
            ) : (
              <MembersTable
                rows={rows}
                onView={openView}
                onEdit={openEdit}
                onToggle={handleToggle}
                togglingId={togglingId}
                footerLeft={footerLeftText}
                footerRight={footerRightControls}
              />
            )}
          </div>

          {/* Modal */}
          <Modal
            open={modalOpen}
            title={modalMode === "edit" ? "Edit Member" : "Member Details"}
            onClose={closeModal}
            footer={
              modalMode === "edit" ? (
                <div className="flex items-center justify-end gap-2">
                  <button
                    className="px-4 py-2 rounded-lg border border-gray-300"
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      document.getElementById("__member_submit_btn__")?.click()
                    }
                    className="px-4 py-2 rounded-lg text-white inline-flex items-center gap-2"
                    style={{ backgroundColor: "#4D3490" }}
                    disabled={submitting}
                  >
                    {submitting && <Spinner />}
                    {submitting ? "Saving…" : "Save changes"}
                  </button>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    className="px-4 py-2 rounded-lg border border-gray-300"
                    onClick={closeModal}
                  >
                    Close
                  </button>
                </div>
              )
            }
          >
            {modalMode === "edit" ? (
              <MemberForm
                record={modalRecord}
                onSubmit={handleUpdate}
                submitting={submitting}
              />
            ) : (
              <MemberView record={modalRecord} />
            )}
          </Modal>

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Members;
