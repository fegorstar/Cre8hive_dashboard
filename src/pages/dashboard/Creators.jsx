// src/pages/dashboard/Creators.jsx
// Updates:
// - Search filters the TABLE; inline "No results…" row when empty.
// - Footer: bottom-left shows "Showing X–Y of Z records" (respects q/filter); bottom-right has pagination.
// - Search width preserved (w-72).
// - Placeholders small + light everywhere.
// - View modal is read-only, with image thumbnail + Open/Copy for URLs.
// - Modal closes on overlay/outside click and Esc.
// - General cleanup + comments.

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import useCreatorsStore from "../../store/CreatorsStore";
import {
  FiMoreVertical,
  FiX,
  FiSearch,
  FiUserPlus,
  FiExternalLink,
  FiCopy,
} from "react-icons/fi";

/* ===========================
   Toast (local)
   =========================== */
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

/* ===========================
   Loaders
   =========================== */
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

/* ===========================
   3-dots menu
   =========================== */
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

/* ===========================
   Helpers
   =========================== */
const toNormStatus = (raw) => {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "1" || v === "true" || v === "active") return "active";
  return "inactive";
};

const isUrl = (v) => {
  if (!v || typeof v !== "string") return false;
  try {
    new URL(v, window.location.origin);
    return true;
  } catch {
    return false;
  }
};

const isImageUrl = (v) => /\.(png|jpe?g|gif|webp|svg)$/i.test(String(v || ""));

/* ===========================
   Toggle + Status pill
   =========================== */
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

const StatusPill = ({ value = "inactive" }) => {
  const active = String(value).toLowerCase() === "active";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
        active
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-gray-50 text-gray-700 border border-gray-200"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
};

/* ===========================
   Modal — overlay/outside/Esc to close
   =========================== */
const Modal = ({ open, title, onClose, children, footer }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Overlay (clicking closes) */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />
      {/* Wrapper (click outside card closes) */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
        onClick={onClose}
      >
        {/* Card (stop propagation so inside clicks don't close) */}
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

/* ===========================
   Shared input styles
   - placeholders small & light
   =========================== */
const inputBase =
  "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm placeholder:text-xs placeholder:font-light placeholder:text-gray-400";
const selectBase =
  "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm";

/* ===========================
   Read-only "View Details"
   =========================== */
const CopyBtn = ({ value, small }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] ${
        small ? "" : "ml-2"
      } border-gray-300 hover:bg-gray-50`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(String(value || ""));
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {}
      }}
      title="Copy"
    >
      <FiCopy className="w-3.5 h-3.5" />
      {done ? "Copied" : "Copy"}
    </button>
  );
};

const LinkField = ({ url }) => {
  if (!isUrl(url)) return <span className="text-gray-700 text-[13px] break-all">—</span>;
  const href = String(url);

  const openBtn = (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 text-[11px]"
      title="Open in new tab"
    >
      <FiExternalLink className="w-3.5 h-3.5" />
      Open
    </a>
  );

  if (isImageUrl(href)) {
    return (
      <div className="flex items-center gap-2">
        <a href={href} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <img
            src={href}
            alt="preview"
            className="h-14 w-14 object-cover rounded border border-gray-200"
          />
        </a>
        <div className="flex items-center gap-2">
          {openBtn}
          <CopyBtn value={href} small />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[14rem] truncate text-[12px] text-gray-700" title={href}>
        {href}
      </span>
      {openBtn}
      <CopyBtn value={href} small />
    </div>
  );
};

const Field = ({ label, children }) => (
  <div className="space-y-1">
    <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
    <div className="text-[13px] text-gray-800">{children ?? <span>—</span>}</div>
  </div>
);

const CreatorDetailsView = ({ record }) => {
  const dash = (v) => (v === undefined || v === null || v === "" ? "—" : v);
  return (
    <div className="space-y-4">
      {/* Top meta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-[13px] font-medium">{dash(record?.name)}</div>
          <StatusPill value={toNormStatus(record?.status)} />
        </div>
        <div className="text-[12px] text-gray-500">ID: {dash(record?.id)}</div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Gender">{dash(record?.gender)}</Field>
        <Field label="BVN">
          <span className="text-[13px]">{dash(record?.bvn)}</span>
          {record?.bvn ? <CopyBtn value={record.bvn} /> : null}
        </Field>
        <Field label="NIN">
          <span className="text-[13px]">{dash(record?.nin)}</span>
          {record?.nin ? <CopyBtn value={record.nin} /> : null}
        </Field>
        <Field label="ID Type">{dash(record?.id_type)}</Field>
        <Field label="Copy of ID (value)"><LinkField url={record?.copy_id_type} /></Field>
        <Field label="Copy Utility Bill (value)"><LinkField url={record?.copy_utility_bill} /></Field>
        <Field label="Utility Bill Type">{dash(record?.copy_utility_bill_type)}</Field>
        <Field label="Joined">{dash(record?.createdAtReadable)}</Field>
        <Field label="Updated">{dash(record?.updatedAtReadable)}</Field>
      </div>
    </div>
  );
};

/* ===========================
   Create/Edit Form
   =========================== */
const CreatorForm = ({ mode, record, onSubmit, submitting }) => {
  const [gender, setGender] = useState(record?.gender ?? "male");
  const [bvn, setBvn] = useState(record?.bvn ?? "");
  const [nin, setNin] = useState(record?.nin ?? "");
  const [idType, setIdType] = useState(record?.id_type ?? "national_id");
  const [copyIdType, setCopyIdType] = useState(record?.copy_id_type ?? "");
  const [copyUtilityBill, setCopyUtilityBill] = useState(record?.copy_utility_bill ?? "");
  const [copyUtilityBillType, setCopyUtilityBillType] = useState(
    record?.copy_utility_bill_type ?? ""
  );

  const isView = mode === "view";

  useEffect(() => {
    setGender(record?.gender ?? "male");
    setBvn(record?.bvn ?? "");
    setNin(record?.nin ?? "");
    setIdType(record?.id_type ?? "national_id");
    setCopyIdType(record?.copy_id_type ?? "");
    setCopyUtilityBill(record?.copy_utility_bill ?? "");
    setCopyUtilityBillType(record?.copy_utility_bill_type ?? "");
  }, [record]);

  if (isView) return <CreatorDetailsView record={record} />;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          gender,
          bvn,
          nin,
          id_type: idType,
          copy_id_type: copyIdType,
          copy_utility_bill: copyUtilityBill,
          copy_utility_bill_type: copyUtilityBillType,
        });
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Gender</label>
          <select
            disabled={isView}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className={selectBase}
          >
            <option value="male">male</option>
            <option value="female">female</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">BVN</label>
          <input
            type="text"
            value={bvn}
            disabled={isView}
            onChange={(e) => setBvn(e.target.value)}
            className={inputBase}
            placeholder="22344760934"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">NIN</label>
          <input
            type="text"
            value={nin}
            disabled={isView}
            onChange={(e) => setNin(e.target.value)}
            className={inputBase}
            placeholder="23298489129"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">ID Type</label>
          <select
            disabled={isView}
            value={idType}
            onChange={(e) => setIdType(e.target.value)}
            className={selectBase}
          >
            <option value="national_id">national_id</option>
            <option value="driver_license">driver_license</option>
            <option value="passport">passport</option>
            <option value="voters_card">voters_card</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Copy of ID (value)</label>
          <input
            type="text"
            value={copyIdType}
            disabled={isView}
            onChange={(e) => setCopyIdType(e.target.value)}
            className={inputBase}
            placeholder="https://… or value"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Copy Utility Bill (value)</label>
          <input
            type="text"
            value={copyUtilityBill}
            disabled={isView}
            onChange={(e) => setCopyUtilityBill(e.target.value)}
            className={inputBase}
            placeholder="https://… or value"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Utility Bill Type</label>
          <input
            type="text"
            value={copyUtilityBillType}
            disabled={isView}
            onChange={(e) => setCopyUtilityBillType(e.target.value)}
            className={inputBase}
            placeholder="e.g., PHCN"
            required
          />
        </div>
      </div>

      <button type="submit" id="__modal_submit_btn__" className="hidden" />
    </form>
  );
};

/* ===========================
   Table
   - If no rows AND q present -> "No results for 'q'"
   - If no rows AND no q -> "No creators yet."
   - Footer: left total; right pagination
   =========================== */
const CreatorsTable = ({
  rows,
  q,
  onView,
  onEdit,
  onToggle,
  togglingId,
  footerLeft,  // text node
  footerRight, // controls node
}) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const dash = (v) => (v === undefined || v === null || v === "" ? "—" : v);
  const emptyText = q ? `No results found for “${q}”` : "No creators yet.";

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">ID</th>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">Gender</th>
              <th className="text-left px-4 py-3 font-semibold">NIN</th>
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
                  <td className="px-4 py-3">{dash(row.name)}</td>
                  <td className="px-4 py-3 capitalize">{dash(row.gender)}</td>
                  <td className="px-4 py-3">{dash(row.nin)}</td>
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
                <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                  {emptyText}
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

/* ===========================
   Page
   =========================== */
const Creators = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) navigate("/login");
  }, [navigate]);

  const {
    creators,
    pagination,
    fetchCreators,
    createCreator,
    toggleCreatorStatus,
  } = useCreatorsStore();

  const [hydrated, setHydrated] = useState(false);

  // Search/filter/page (server-driven); debounced typing; Enter = instant
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // 'active' | 'inactive' | ''
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // Initial fetch
  useEffect(() => {
    (async () => {
      await fetchCreators?.({ page: 1, per_page: perPage, q: "", status: "" });
      setHydrated(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced reactive fetch on q/status/page
  useEffect(() => {
    const t = setTimeout(() => {
      fetchCreators?.({ page, per_page: perPage, q, status });
    }, 300);
    return () => clearTimeout(t);
  }, [page, q, status, fetchCreators]);

  // Enter = immediate search and reset to page 1
  const onSearchEnter = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        setPage(1);
        fetchCreators?.({ page: 1, per_page: perPage, q, status });
      }
    },
    [q, status, fetchCreators]
  );

  const rows = useMemo(() => (Array.isArray(creators) ? creators : []), [creators]);

  // Status filter options built from data
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

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // create | edit | view
  const [modalRecord, setModalRecord] = useState(null);

  const openCreate = () => {
    setModalMode("create");
    setModalRecord(null);
    setModalOpen(true);
  };
  const openView = (record) => {
    setModalMode("view");
    setModalRecord(record);
    setModalOpen(true);
  };
  const openEdit = (record) => {
    setModalMode("edit");
    setModalRecord(record);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  // Create handler
  const handleSubmit = async (payload) => {
    try {
      setSubmitting(true);
      await createCreator?.(payload);
      toast.add({
        type: "success",
        title: "Created",
        message: "Creator created successfully.",
      });
      await fetchCreators?.({ page, per_page: perPage, q, status });
      closeModal();
    } catch (e) {
      toast.add({
        type: "error",
        title: "Failed",
        message: e?.message || "Action failed.",
      });
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle status handler
  const handleToggle = async (row) => {
    try {
      setTogglingId(row.id);
      await toggleCreatorStatus?.(row.id); // PUT /admin/creator/:id { status }
      toast.add({ type: "success", title: "Status updated" });
      await fetchCreators?.({ page, per_page: perPage, q, status });
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

  // Titles
  const modalTitle =
    modalMode === "create"
      ? "Create Creator"
      : modalMode === "edit"
      ? "Edit Creator"
      : "View Creator";

  // Pagination math (using API pagination if provided)
  const total = pagination?.total ?? rows.length ?? 0;
  const per = pagination?.per_page || perPage;
  const totalPages = Math.max(1, Math.ceil((pagination?.total || 0) / per));
  const startIdx = total === 0 ? 0 : (page - 1) * per + 1;
  const endIdx = total === 0 ? 0 : Math.min(page * per, total);

  // Footer (left text)
  const footerLeftText =
    total === 0
      ? (q ? `No results for “${q}”` : "No records")
      : `Showing ${startIdx}–${endIdx} of ${total} record${total > 1 ? "s" : ""}`;

  // Footer (right controls: Prev/Next)
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
          className="relative min-h-screen w-full min-w-[100vw] md:min-w-0 ml=[15.625rem] md:ml-[15.625rem] [transition:margin_0.25s_ease-out]"
        >
          <Navbar />

          <div className="px-6 pb-20 pt-6">
            {/* Header */}
            <div className="flex items-center mb-4 justify-between -mx-6 border-b border-gray-300 pb-3">
              <p className="inline-block px-6 text-base md:text-lg leading-5 font-semibold">
                Creators
              </p>
              <div className="px-6">
                <button
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 rounded-lg text-white px-4 py-2 text-sm"
                  style={{ backgroundColor: "#4D3490", height: "36px" }}
                >
                  <FiUserPlus className="w-4 h-4" />
                  New Creator
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                {/* Search — width preserved (w-72) */}
                <div className="relative">
                  <input
                    value={q}
                    onChange={(e) => {
                      setPage(1);           // reset to first page when query changes
                      setQ(e.target.value); // debounced fetch in effect
                    }}
                    onKeyDown={onSearchEnter} // Enter = instant fetch
                    className="h-10 pr-9 pl-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] w-48 text-sm placeholder:text-xs leading-[1.25rem]"
                    placeholder="Search creators…"
                    aria-label="Search creators"
                  />
                  <FiSearch
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>

                {/* Status filter — normalized */}
                <select
                  value={status}
                  onChange={(e) => {
                    setPage(1);
                    setStatus(e.target.value);
                  }}
                  className="h-10 pr-9 pl-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] w-48 text-sm placeholder:text-xs leading-[1.25rem]"
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

              {/* (Right side header space intentionally left blank as requested) */}
              <div />
            </div>

            {/* Table / Loader */}
            {!hydrated ? (
              <CenterLoader />
            ) : (
              <CreatorsTable
                rows={rows}
                q={q}
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
            title={modalTitle}
            onClose={closeModal}
            footer={
              modalMode === "view" ? (
                <div className="flex justify-end">
                  <button
                    className="px-4 py-2 rounded-lg border border-gray-300"
                    onClick={closeModal}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2">
                  <button
                    className="px-4 py-2 rounded-lg border border-gray-300"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      document.getElementById("__modal_submit_btn__")?.click()
                    }
                    className="px-4 py-2 rounded-lg text-white inline-flex items-center gap-2"
                    style={{ backgroundColor: "#4D3490" }}
                    disabled={submitting}
                  >
                    {submitting && <Spinner />}
                    {submitting
                      ? "Saving…"
                      : modalMode === "create"
                      ? "Create"
                      : "Save changes"}
                  </button>
                </div>
              )
            }
          >
            <CreatorForm
              mode={modalMode}
              record={modalRecord}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          </Modal>

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Creators;
