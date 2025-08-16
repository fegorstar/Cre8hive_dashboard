// src/pages/dashboard/Members.jsx
// - Search input: icon RIGHT, perfectly centered; text & placeholder vertically centered
// - Status filter built from backend data (normalized) -> accurate for 'inactive' etc.
// - Columns: ID, Member ID, Name, Email, Phone, DOB, Created, Updated, Status, Actions
// - Toggle status via PUT /admin/member/:id { status: ... } (no /toggle)
// - Modal closes when clicking outside (overlay). Content clicks don't close.

import React, { useEffect, useMemo, useState } from "react";
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

/* Modal (overlay click closes; content click doesn’t) */
const Modal = ({ open, title, onClose, children, footer }) => (
  <>
    <div
      className={`fixed inset-0 bg-black/30 transition-opacity ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      onClick={onClose}
    />
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 z-30 ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!open}
      onClick={onClose} // click outside content
    >
      <div
        className="w-full max-w-md bg-white rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside box
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

/* Table */
const MembersTable = ({ rows, onView, onEdit, onToggle, togglingId }) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const dash = (v) => (v === undefined || v === null || v === "" ? "—" : v);

  return (
    <div className="overflow-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">ID</th>
            <th className="text-left px-4 py-3 font-semibold">Member ID</th>
            <th className="text-left px-4 py-3 font-semibold">Name</th>
            <th className="text-left px-4 py-3 font-semibold">Email</th>
            <th className="text-left px-4 py-3 font-semibold">Phone</th>
            <th className="text-left px-4 py-3 font-semibold">DOB</th>
            <th className="text-left px-4 py-3 font-semibold">Joined</th>
            <th className="text-left px-4 py-3 font-semibold">Updated</th>
            <th className="text-left px-4 py-3 font-semibold">Status</th>
            <th className="text-right px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row) => {
            const isActive = toNormStatus(row.status) === "active";
            return (
              <tr key={row.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{dash(row.id)}</td>
                <td className="px-4 py-3">{dash(row.member_id)}</td>
                <td className="px-4 py-3">{dash(row.name)}</td>
                <td className="px-4 py-3">{dash(row.email)}</td>
                <td className="px-4 py-3">{dash(row.phone)}</td>
                <td className="px-4 py-3">{dash(row.dobReadable)}</td>
                <td className="px-4 py-3">{dash(row.createdAtReadable)}</td>
                <td className="px-4 py-3">{dash(row.updatedAtReadable)}</td>
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
              <td colSpan={10} className="px-4 py-6 text-center text-gray-500">
                No members yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

/* Simple read-only member view (with some KYC fields if present) */
const MemberView = ({ record }) => {
  if (!record) return null;
  const kyc = record.kyc || {};
  const resp = kyc.response || {};
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div><span className="font-medium">Member ID:</span> {record.member_id || "—"}</div>
        <div><span className="font-medium">Status:</span> {record.status}</div>
        <div><span className="font-medium">Name:</span> {record.name || "—"}</div>
        <div><span className="font-medium">Email:</span> {record.email || "—"}</div>
        <div><span className="font-medium">Phone:</span> {record.phone || "—"}</div>
        <div><span className="font-medium">DOB:</span> {record.dobReadable || "—"}</div>
        <div><span className="font-medium">Joined:</span> {record.createdAtReadable || "—"}</div>
        <div><span className="font-medium">Updated:</span> {record.updatedAtReadable || "—"}</div>
      </div>

      {record?.kyc && (
        <>
          <div className="mt-2 font-semibold">KYC</div>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="font-medium">BVN:</span> {resp.bvn || "—"}</div>
            <div><span className="font-medium">Gender:</span> {resp.gender || "—"}</div>
            <div><span className="font-medium">First Name:</span> {resp.firstName || "—"}</div>
            <div><span className="font-medium">Last Name:</span> {resp.lastName || "—"}</div>
            <div className="col-span-2"><span className="font-medium">Image:</span> {resp.imageBase64 ? "✓ embedded" : "—"}</div>
          </div>
        </>
      )}
    </div>
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
    updateMember,
    toggleMemberStatus,
  } = useMembersStore();

  const [hydrated, setHydrated] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // 'active' | 'inactive' | ''
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // initial fetch
  useEffect(() => {
    (async () => {
      await fetchMembers?.({ page, per_page: perPage, q, status });
      setHydrated(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reactive fetch
  useEffect(() => {
    const t = setTimeout(() => {
      fetchMembers?.({ page, per_page: perPage, q, status });
    }, 300);
    return () => clearTimeout(t);
  }, [page, q, status, fetchMembers]);

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
  const [modalMode, setModalMode] = useState("view");
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
    // You can reuse updateMember in a simple edit form if needed later
    try {
      const full = await getMember?.(record.id);
      setModalMode("view"); // keeping read-only for now; change to "edit" if you add form
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

  const total = pagination?.total || rows.length;
  const totalPages = Math.max(
    1,
    Math.ceil((pagination?.total || 0) / (pagination?.per_page || perPage))
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
                {/* Search — icon on RIGHT, vertically centered */}
                <div className="relative">
                  <input
                    value={q}
                    onChange={(e) => {
                      setPage(1);
                      setQ(e.target.value);
                    }}
                    className="h-10 pr-9 pl-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] w-72 text-sm placeholder:text-xs leading-[1.25rem]"
                    placeholder="Search members…"
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
                  className="h-10 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] w-48 text-sm"
                >
                  <option value="">All statuses</option>
                  {statusOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt[0].toUpperCase() + opt.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-sm text-gray-600">
                {total ? `Total: ${total}` : null}
              </div>
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
              />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={`px-3 py-1.5 rounded-lg border ${
                    page <= 1
                      ? "text-gray-400 border-gray-200"
                      : "border-gray-300 hover:bg-gray-50"
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
                    page >= totalPages
                      ? "text-gray-400 border-gray-200"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Modal */}
          <Modal
            open={modalOpen}
            title="Member"
            onClose={closeModal}
            footer={
              <div className="flex justify-end">
                <button
                  className="px-4 py-2 rounded-lg border border-gray-300"
                  onClick={closeModal}
                >
                  Close
                </button>
              </div>
            }
          >
            <MemberView record={modalRecord} />
          </Modal>

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Members;
