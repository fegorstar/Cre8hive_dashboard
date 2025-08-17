// src/pages/ServiceCategories/ServiceCategories.jsx
// - Auth guard based on localStorage (prevents logout on refresh)
// - Per-tab hydration loaders (no data flash): show loader first, then tables
// - Toast component (no external lib), clean UI
// - Dates & robust store usage retained
// - Modal closes on overlay/outside click and Esc
// - Inputs/selects: smaller, lighter placeholders
// - NEW: Table footer with "Showing X–Y of Z" (left) and pagination (right) for Categories & Sub-categories
// - NEW: Modal footer button shows a loader ("Saving…") during create/update

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import useServiceCategoriesStore from "../../store/ServiceCategoriesStore";
import { FiMoreVertical, FiX } from "react-icons/fi";

/* ---------------- Toast (no external lib) ---------------- */
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
          <button className="opacity-80 hover:opacity-100" onClick={() => remove(t.id)}>
            <FiX className="h-4 w-4" />
          </button>
        </div>
        {t.message && <div className="mt-1 text-[13px] opacity-95">{t.message}</div>}
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

/* ---------------- Little UI helpers ---------------- */
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

const Tabs = ({ value, onChange }) => {
  const tabs = [
    { key: "categories", label: "Categories" },
    { key: "subcategories", label: "Sub-categories" },
  ];
  return (
    <div className="border-b border-gray-300 flex items-center justify-between">
      <div className="flex gap-6">
        {tabs.map((t) => {
          const active = value === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`py-3 text-sm font-medium border-b-2 -mb-px transition ${
                active
                  ? "border-[#4D3490] text-[#4D3490]"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ThreeDotsMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <div className="relative inline-block text-left">
      <button className="p-2 rounded hover:bg-gray-100" onClick={() => setOpen((v) => !v)}>
        <FiMoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 origin-top-right rounded-md border border-gray-200 bg-white shadow-lg z-20">
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

/* ----------- Shared input styles (small, light placeholders) ----------- */
const inputBase =
  "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm placeholder:text-xs placeholder:font-light placeholder:text-gray-400";
const selectBase =
  "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm";

/* ---------------- Modal: overlay/outside/Esc to close ---------------- */
const Modal = ({ open, title, onClose, children, footer }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop (overlay click closes) */}
      <div
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />
      {/* Wrapper (outside click closes) */}
      <div
        className={`fixed inset-0 z-40 flex items-center justify-center p-4 transition ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
        onClick={onClose}
      >
        {/* Panel (stop inside clicks) */}
        <div
          className="w-full max-w-md bg-white rounded-lg shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-base font-semibold">{title}</h3>
            <button className="p-2 rounded hover:bg-gray-100" onClick={onClose} aria-label="Close">
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

/* ---------------- Forms ---------------- */
const CategoryForm = ({ mode, type, record, categories, onSubmit }) => {
  const [name, setName] = useState(record?.name ?? "");
  const [parentCategoryId, setParentCategoryId] = useState(
    record?.parentCategoryId ?? ""
  );

  const isView = mode === "view";
  const isSub = type === "subcategory";
  const safeCategories = Array.isArray(categories) ? categories : [];

  useEffect(() => {
    setName(record?.name ?? "");
    setParentCategoryId(record?.parentCategoryId ?? "");
  }, [record]);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const payload = isSub
          ? { name, parentCategoryId: Number(parentCategoryId) }
          : { name };
        onSubmit(payload);
      }}
    >
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          value={name}
          disabled={isView}
          onChange={(e) => setName(e.target.value)}
          className={inputBase}
          placeholder="e.g. Professional Services"
          required
        />
      </div>

      {isSub && (
        <div>
          <label className="block text-sm font-medium mb-1">Parent Category</label>
          <select
            disabled={isView}
            value={parentCategoryId || ""}
            onChange={(e) => setParentCategoryId(e.target.value)}
            className={selectBase}
            required
          >
            <option value="" disabled>
              Select parent…
            </option>
            {safeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isView && <button type="submit" id="__modal_submit_btn__" className="hidden" />}
    </form>
  );
};

/* ---------------- Tables with footer (showing + pagination) ---------------- */
const TableShell = ({ children, footerLeft, footerRight }) => (
  <div className="rounded-xl border border-gray-200 overflow-hidden">
    <div className="overflow-auto">{children}</div>
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-4 py-3 bg-white border-t border-gray-200">
      <div className="text-sm text-gray-600">{footerLeft}</div>
      <div>{footerRight}</div>
    </div>
  </div>
);

const CategoriesTable = ({ rows, onView, onEdit, footerLeft, footerRight }) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  return (
    <TableShell footerLeft={footerLeft} footerRight={footerRight}>
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Name</th>
            <th className="text-left px-4 py-3 font-semibold">Created</th>
            <th className="text-left px-4 py-3 font-semibold">Updated</th>
            <th className="text-right px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row) => (
            <tr key={row.id ?? row.name} className="border-t border-gray-100">
              <td className="px-4 py-3">{row.name}</td>
              <td className="px-4 py-3">{row.createdAtReadable}</td>
              <td className="px-4 py-3">{row.updatedAtReadable}</td>
              <td className="px-4 py-3 text-right">
                <ThreeDotsMenu
                  items={[
                    { label: "View", onClick: () => onView(row) },
                    { label: "Edit", onClick: () => onEdit(row) },
                  ]}
                />
              </td>
            </tr>
          ))}
          {safeRows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                No categories yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </TableShell>
  );
};

const SubcategoriesTable = ({ rows, onView, onEdit, footerLeft, footerRight }) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  return (
    <TableShell footerLeft={footerLeft} footerRight={footerRight}>
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Name</th>
            <th className="text-left px-4 py-3 font-semibold">Parent</th>
            <th className="text-left px-4 py-3 font-semibold">Created</th>
            <th className="text-left px-4 py-3 font-semibold">Updated</th>
            <th className="text-right px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row) => (
            <tr key={row.id ?? row.name} className="border-t border-gray-100">
              <td className="px-4 py-3">{row.name}</td>
              <td className="px-4 py-3">
                {row?.parentCategory?.name ?? row?.parentName ?? "—"}
              </td>
              <td className="px-4 py-3">{row.createdAtReadable}</td>
              <td className="px-4 py-3">{row.updatedAtReadable}</td>
              <td className="px-4 py-3 text-right">
                <ThreeDotsMenu
                  items={[
                    { label: "View", onClick: () => onView(row) },
                    { label: "Edit", onClick: () => onEdit(row) },
                  ]}
                />
              </td>
            </tr>
          ))}
          {safeRows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                No sub-categories for this parent.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </TableShell>
  );
};

const ServiceCategories = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // NEW: submitting state for modal button loader
  const [submitting, setSubmitting] = useState(false);

  // Auth guard like Dashboard: check localStorage directly (prevents logout on refresh)
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) navigate('/login');
  }, [navigate]);

  const {
    categories,
    subCategories,
    fetchCategories,
    fetchSubCategories,
    createCategory,
    createSubCategory,
    updateCategory,
  } = useServiceCategoriesStore();

  const safeCategories = Array.isArray(categories) ? categories : [];

  const [tab, setTab] = useState("categories");
  const [activeParent, setActiveParent] = useState("");

  // Per-tab hydration flags to control initial loaders & avoid data flash
  const [catsHydrated, setCatsHydrated] = useState(false);
  const [subsHydrated, setSubsHydrated] = useState(false);

  // Pagination state (client-side) per tab
  const perPage = 10;
  const [catsPage, setCatsPage] = useState(1);
  const [subsPage, setSubsPage] = useState(1);

  // Initial categories load with hydration control
  useEffect(() => {
    (async () => {
      await fetchCategories?.();
      setCatsHydrated(true);
    })();
  }, [fetchCategories]);

  // Ensure a default parent is set when going to subcategories
  useEffect(() => {
    if (tab === "subcategories" && !activeParent && safeCategories.length > 0) {
      setActiveParent(safeCategories[0].id);
    }
  }, [tab, activeParent, safeCategories]);

  // Reset pages when switching tab/parent
  useEffect(() => {
    setCatsPage(1);
  }, [catsHydrated]);
  useEffect(() => {
    setSubsPage(1);
  }, [activeParent, subsHydrated, tab]);

  // Load subcategories when parent changes (with hydration control)
  useEffect(() => {
    if (tab === "subcategories" && activeParent) {
      setSubsHydrated(false);
      (async () => {
        await fetchSubCategories?.(Number(activeParent));
        setSubsHydrated(true);
      })();
    }
  }, [tab, activeParent, fetchSubCategories]);

  const subRows = useMemo(() => {
    if (!activeParent) return [];
    return Array.isArray(subCategories) ? subCategories : [];
  }, [subCategories, activeParent]);

  // Slice helpers
  const catsTotal = safeCategories.length;
  const catsTotalPages = Math.max(1, Math.ceil(catsTotal / perPage));
  const catsStart = catsTotal === 0 ? 0 : (catsPage - 1) * perPage + 1;
  const catsEnd = catsTotal === 0 ? 0 : Math.min(catsPage * perPage, catsTotal);
  const catsVisible = useMemo(
    () => safeCategories.slice((catsPage - 1) * perPage, catsPage * perPage),
    [safeCategories, catsPage]
  );

  const subsTotal = subRows.length;
  const subsTotalPages = Math.max(1, Math.ceil(subsTotal / perPage));
  const subsStart = subsTotal === 0 ? 0 : (subsPage - 1) * perPage + 1;
  const subsEnd = subsTotal === 0 ? 0 : Math.min(subsPage * perPage, subsTotal);
  const subsVisible = useMemo(
    () => subRows.slice((subsPage - 1) * perPage, subsPage * perPage),
    [subRows, subsPage]
  );

  // Footer makers
  const makeFooterLeft = (total, start, end) =>
    total === 0
      ? "No records"
      : `Showing ${start}–${end} of ${total} record${total > 1 ? "s" : ""}`;

  const makeFooterRight = (page, totalPages, setPage) => (
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

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'view' | 'edit'
  const [modalType, setModalType] = useState("category"); // 'category' | 'subcategory'
  const [modalRecord, setModalRecord] = useState(null);

  // Helpers to open modal
  const openCreateCategory = () => {
    setModalMode("create");
    setModalType("category");
    setModalRecord(null);
    setModalOpen(true);
  };

  const openCreateSubcategory = () => {
    setModalMode("create");
    setModalType("subcategory");
    setModalRecord({ parentCategoryId: activeParent || safeCategories[0]?.id || "" });
    setModalOpen(true);
  };

  const openView = (type, record) => {
    setModalMode("view");
    setModalType(type);
    setModalRecord({
      ...record,
      parentCategoryId: record?.parentCategoryId ?? record?.parentCategory?.id ?? "",
    });
    setModalOpen(true);
  };

  const openEdit = (type, record) => {
    setModalMode("edit");
    setModalType(type);
    setModalRecord({
      ...record,
      parentCategoryId: record?.parentCategoryId ?? record?.parentCategory?.id ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  // Submit handler — shows only a button loader (no extra page spinner)
  const handleSubmit = async (payload) => {
    try {
      setSubmitting(true);
      if (modalType === "subcategory") {
        if (modalMode === "edit" && modalRecord?.id) {
          await updateCategory?.(modalRecord.id, payload);
          toast.add({ type: "success", title: "Updated", message: "Sub-category updated successfully." });
        } else {
          await createSubCategory?.(payload);
          toast.add({ type: "success", title: "Created", message: "Sub-category created successfully." });
        }
      } else {
        if (modalMode === "edit" && modalRecord?.id) {
          await updateCategory?.(modalRecord.id, payload);
          toast.add({ type: "success", title: "Updated", message: "Category updated successfully." });
        } else {
          await createCategory?.(payload);
          toast.add({ type: "success", title: "Created", message: "Category created successfully." });
        }
      }

      // Refresh lists
      await fetchCategories?.();
      if (modalType === "subcategory") {
        const pid = payload.parentCategoryId || modalRecord?.parentCategoryId || activeParent;
        if (pid) await fetchSubCategories?.(Number(pid));
      }

      closeModal();
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Action failed." });
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle = `${modalMode[0].toUpperCase()}${modalMode.slice(1)} ${
    modalType === "category" ? "Category" : "Sub-category"
  }`;

  return (
    <main>
      {/* Toasts */}
      <Toast toasts={toast.toasts} remove={toast.remove} />

      <div className="overflow-x-hidden flex bg-white border-t border-gray-300">
        {/* Sidebar */}
        <Sidebar />

        <div
          id="app-layout-content"
          className="relative min-h-screen w-full min-w-[100vw] md:min-w-0 ml-[15.625rem] [transition:margin_0.25s_ease-out]"
        >
          {/* Navbar */}
          <Navbar />

          <div className="px-6 pb-20 pt-6">
            {/* Header */}
            <div className="flex items-center mb-6 justify-between -mx-6 border-b border-gray-300 pb-4">
              <p className="inline-block px-6 text-lg leading-5 font-semibold">
                Service Categories
              </p>
            </div>

            {/* Tabs + Create */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <Tabs value={tab} onChange={(key) => { setTab(key); }} />
                <div className="pl-4 py-2">
                  {tab === "categories" ? (
                    <button
                      onClick={openCreateCategory}
                      className="inline-flex items-center gap-2 rounded-lg text-white px-4 py-2 text-sm"
                      style={{ backgroundColor: "#4D3490", height: "36px" }}
                    >
                      + New Category
                    </button>
                  ) : (
                    <button
                      onClick={openCreateSubcategory}
                      className="inline-flex items-center gap-2 rounded-lg text-white px-4 py-2 text-sm"
                      style={{ backgroundColor: "#4D3490", height: "36px" }}
                    >
                      + New Sub-category
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Parent selector for subcategories */}
            {tab === "subcategories" && (
              <div className="flex items-center gap-3 mb-4">
                <label className="text-sm text-gray-600">Parent:</label>
                <select
                  value={activeParent || ""}
                  onChange={(e) => setActiveParent(e.target.value)}
                  className={selectBase}
                >
                  {safeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tables with hydration loaders */}
            <div>
              {/* Categories tab */}
              {tab === "categories" && !catsHydrated ? (
                <CenterLoader />
              ) : tab === "categories" ? (
                <CategoriesTable
                  rows={catsVisible}
                  onView={(row) => openView("category", row)}
                  onEdit={(row) => openEdit("category", row)}
                  footerLeft={makeFooterLeft(catsTotal, catsStart, catsEnd)}
                  footerRight={makeFooterRight(catsPage, catsTotalPages, setCatsPage)}
                />
              ) : null}

              {/* Sub-categories tab */}
              {tab === "subcategories" && (!catsHydrated || !subsHydrated) ? (
                <CenterLoader />
              ) : tab === "subcategories" ? (
                <SubcategoriesTable
                  rows={subsVisible}
                  onView={(row) => openView("subcategory", row)}
                  onEdit={(row) => openEdit("subcategory", row)}
                  footerLeft={makeFooterLeft(subsTotal, subsStart, subsEnd)}
                  footerRight={makeFooterRight(subsPage, subsTotalPages, setSubsPage)}
                />
              ) : null}
            </div>
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
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg border border-gray-300"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg border border-gray-300"
                    disabled={submitting}
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
            <CategoryForm
              mode={modalMode}
              type={modalType}
              record={modalRecord}
              categories={safeCategories}
              onSubmit={handleSubmit}
            />
          </Modal>

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default ServiceCategories;
