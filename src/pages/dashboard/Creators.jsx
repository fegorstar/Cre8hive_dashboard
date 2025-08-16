// src/pages/dashboard/Creators.jsx
// - Search: icon on RIGHT, perfectly centered
// - Status filter: uses normalized backend values
// - Name, Gender, NIN columns; Status after Updated
// - Modal: closes on overlay click, wrapper click, and Esc
// - Status toggle: calls PUT /admin/creator/:id with {status}

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import useCreatorsStore from "../../store/CreatorsStore";
import { FiMoreVertical, FiX, FiSearch, FiUserPlus } from "react-icons/fi";

/* Toast (local) */
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

/* 3-dots menu */
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

/* Helpers for status mapping */
const toNormStatus = (raw) => {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "1" || v === "true" || v === "active") return "active";
  return "inactive";
};

/* Toggle + Status pill */
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

/* Modal — closes on outside click + Esc */
const Modal = ({ open, title, onClose, children, footer }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Overlay that closes on click */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />

      {/* Wrapper also closes on click (outside card) */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
        onClick={onClose}
      >
        {/* Card — stop propagation so clicks inside do NOT close */}
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

/* Form */
const CreatorForm = ({ mode, record, onSubmit, submitting }) => {
  const [gender, setGender] = useState(record?.gender ?? "male");
  const [bvn, setBvn] = useState(record?.bvn ?? "");
  const [nin, setNin] = useState(record?.nin ?? "");
  const [idType, setIdType] = useState(record?.id_type ?? "national_id");
  const [copyIdType, setCopyIdType] = useState(record?.copy_id_type ?? "");
  const [copyUtilityBill, setCopyUtilityBill] = useState(
    record?.copy_utility_bill ?? ""
  );
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490]"
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490]"
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490]"
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490]"
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490]"
            placeholder="wdmoklvwe"
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490]"
            placeholder="wejowmkle"
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490]"
            placeholder="x"
            required
          />
        </div>
      </div>

      <button type="submit" id="__modal_submit_btn__" className="hidden" />
    </form>
  );
};

/* Table */
const CreatorsTable = ({ rows, onView, onEdit, onToggle, togglingId }) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const dash = (v) => (v === undefined || v === null || v === "" ? "—" : v);

  return (
    <div className="overflow-auto rounded-xl border border-gray-200">
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
                No creators yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

/* Page */
const Creators = () => {
  const navigate = useNavigate();
  const toast = useToast();

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

  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // 'active' | 'inactive' | ''
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // initial fetch
  useEffect(() => {
    (async () => {
      await fetchCreators?.({ page, per_page: perPage, q, status });
      setHydrated(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reactive fetch
  useEffect(() => {
    const t = setTimeout(() => {
      fetchCreators?.({ page, per_page: perPage, q, status });
    }, 300);
    return () => clearTimeout(t);
  }, [page, q, status, fetchCreators]);

  const rows = useMemo(
    () => (Array.isArray(creators) ? creators : []),
    [creators]
  );

  /* Build status options from backend data (normalized) */
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
  const [modalMode, setModalMode] = useState("create");
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

  const handleToggle = async (row) => {
    try {
      setTogglingId(row.id);
      await toggleCreatorStatus?.(row.id); // uses PUT /admin/creator/:id { status }
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

  const modalTitle =
    modalMode === "create"
      ? "Create Creator"
      : modalMode === "edit"
      ? "Edit Creator"
      : "View Creator";

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
                {/* Search — icon on RIGHT */}
                <div className="relative">
                  <input
                    value={q}
                    onChange={(e) => {
                      setPage(1);
                      setQ(e.target.value);
                    }}
                    className="h-10 pr-9 pl-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] w-72 text-sm placeholder:text-xs leading-[1.25rem]"
                    placeholder="Search creators…"
                  />
                  <FiSearch
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>

                {/* Status filter — backend normalized */}
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
              <CreatorsTable
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
