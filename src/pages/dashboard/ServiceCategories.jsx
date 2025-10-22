// src/pages/ServiceCategories/ServiceCategories.jsx
// Complete, filter-accurate subcategory pagination (client-side over fully loaded list)
// Now includes "description" field for Categories (create/update + view)

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import useServiceCategoriesStore from "../../store/ServiceCategoriesStore";
import { FiMoreVertical } from "react-icons/fi";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { ToastAlert, useToastAlert } from "../../components/common/ToastAlert";
import useClickOutside from "../../lib/useClickOutside";
import useAuthGuard from "../../lib/useAuthGuard";
import { Spinner } from "../../components/common/Spinner";

const BRAND_RGB = "rgb(77, 52, 144)";

/* ---------- Tabs ---------- */
const Tabs = ({ value, onChange }) => {
  const tabs = [
    { key: "categories", label: "Categories" },
    { key: "subcategories", label: "Subcategories" },
  ];
  return (
    <div className="border-b border-gray-200 flex items-center justify-between">
      <div className="flex gap-2">
        {tabs.map((t) => {
          const active = value === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              aria-current={active ? "page" : undefined}
              className={`relative -mb-px px-4 py-2 text-sm font-semibold transition-colors border-solid ${
                active ? "border-b-4" : "border-b-2"
              } border-b rounded-t-lg`}
              style={{
                color: active ? BRAND_RGB : "#374151",
                borderBottomColor: active ? BRAND_RGB : "#D1D5DB",
                backgroundColor: "transparent",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- 3-dots menu ---------- */
const ThreeDotsMenu = ({ items = [] }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  useClickOutside(boxRef, () => setOpen(false));
  return (
    <div className="relative inline-block text-left" ref={boxRef}>
      <button
        type="button"
        className="p-2 rounded hover:bg-gray-100"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <FiMoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 origin-top-right rounded-md border border-gray-200 bg-white shadow-lg z-20">
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
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

const inputBase =
  "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm placeholder:text-xs placeholder:font-light placeholder:text-gray-400";
const selectBase =
  "rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm";

/* ---------- Readonly details for View ---------- */
const DetailsList = ({ items }) => (
  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
    {items.map((item) => (
      <div key={item.label} className="space-y-1">
        <dt className="text-xs uppercase tracking-wide text-gray-500">{item.label}</dt>
        <dd className="text-sm font-medium text-gray-900">{item.value ?? "—"}</dd>
      </div>
    ))}
  </dl>
);

/* ---------- Category/Subcategory form ---------- */
const CategoryForm = ({ mode, type, record, categories, onSubmit }) => {
  const isView = mode === "view";
  const isSub = type === "subcategory";
  const safeCategories = Array.isArray(categories) ? categories : [];

  // state
  const [name, setName] = useState(record?.name ?? "");
  const [description, setDescription] = useState(record?.description ?? ""); // NEW: description for categories
  const [parentCategoryId, setParentCategoryId] = useState(record?.parentCategoryId ?? "");

  // sync when record changes
  useEffect(() => {
    setName(record?.name ?? "");
    setDescription(record?.description ?? "");
    setParentCategoryId(record?.parentCategoryId ?? "");
  }, [record]);

  if (isView) {
    return (
      <DetailsList
        items={[
          { label: isSub ? "Subcategory Name" : "Category Name", value: record?.name || "—" },
          ...(isSub
            ? [
                {
                  label: "Category",
                  value:
                    safeCategories.find((c) => Number(c.id) === Number(record?.parentCategoryId))
                      ?.name || "—",
                },
              ]
            : [{ label: "Description", value: record?.description || "—" }]),
          { label: "Created", value: record?.createdAtReadable || "—" },
          { label: "Updated", value: record?.updatedAtReadable || "—" },
        ]}
      />
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const payload = isSub
          ? { name, parentCategoryId: Number(parentCategoryId) }
          : { name, description: (description || "").trim() }; // pass description up
        onSubmit(payload);
      }}
    >
      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-1">
          {isSub ? "Subcategory Name" : "Category Name"}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputBase}
          placeholder={isSub ? "e.g. Accounting" : "e.g. Professional Services"}
          required
        />
      </div>

      {/* Description (categories only) */}
      {!isSub && (
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputBase} min-h-[96px]`}
            placeholder="Short summary/description of this category"
            required
          />
        </div>
      )}

      {/* Parent Category (subcategories only) */}
      {isSub && (
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={parentCategoryId || ""}
            onChange={(e) => setParentCategoryId(e.target.value)}
            className={`${selectBase} w-full`}
            required
          >
            <option value="" disabled>
              Select category…
            </option>
            {safeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <button type="submit" id="__modal_submit_btn__" className="hidden" />
    </form>
  );
};

/* ---------- Table shells ---------- */
const TableShell = ({ children, footerLeft, footerRight, showOverlay }) => (
  <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
    <div className="overflow-auto">{children}</div>

    {showOverlay && (
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <span className="inline-flex items-center gap-2 text-sm text-gray-700">
          <Spinner className="!text-gray-700" /> Loading…
        </span>
      </div>
    )}

    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-t border-gray-200">
      <div className="text-sm text-gray-600">{footerLeft}</div>
      <div>{footerRight}</div>
    </div>
  </div>
);

const CategoriesTable = ({ rows, loading, onView, onEdit, onDelete, footerLeft, footerRight }) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const hasRows = safeRows.length > 0;
  return (
    <TableShell footerLeft={footerLeft} footerRight={footerRight} showOverlay={loading && hasRows}>
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
          {!hasRows ? (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="!text-gray-500" /> Loading…
                  </span>
                ) : (
                  "No categories yet."
                )}
              </td>
            </tr>
          ) : (
            safeRows.map((row) => (
              <tr key={row.id ?? row.name} className="border-t border-gray-100">
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3">{row.createdAtReadable}</td>
                <td className="px-4 py-3">{row.updatedAtReadable}</td>
                <td className="px-4 py-3 text-right">
                  <ThreeDotsMenu
                    items={[
                      { label: "View", onClick: () => onView(row) },
                      { label: "Edit", onClick: () => onEdit(row) },
                      { label: "Delete", onClick: () => onDelete(row) },
                    ]}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </TableShell>
  );
};

const SubcategoriesTable = ({
  rows,
  loading,
  categoryNameById,
  onView,
  onEdit,
  onDelete,
  footerLeft,
  footerRight,
}) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const hasRows = safeRows.length > 0;
  return (
    <TableShell footerLeft={footerLeft} footerRight={footerRight} showOverlay={loading && hasRows}>
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Name</th>
            <th className="text-left px-4 py-3 font-semibold">Category</th>
            <th className="text-left px-4 py-3 font-semibold">Created</th>
            <th className="text-left px-4 py-3 font-semibold">Updated</th>
            <th className="text-right px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {!hasRows ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="!text-gray-500" /> Loading…
                  </span>
                ) : (
                  "No subcategories."
                )}
              </td>
            </tr>
          ) : (
            safeRows.map((row) => (
              <tr key={row.id ?? row.name} className="border-t border-gray-100">
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3">
                  {row.parentName ||
                    categoryNameById.get(Number(row.parentCategoryId)) ||
                    "—"}
                </td>
                <td className="px-4 py-3">{row.createdAtReadable}</td>
                <td className="px-4 py-3">{row.updatedAtReadable}</td>
                <td className="px-4 py-3 text-right">
                  <ThreeDotsMenu
                    items={[
                      { label: "View", onClick: () => onView(row) },
                      { label: "Edit", onClick: () => onEdit(row) },
                      { label: "Delete", onClick: () => onDelete(row) },
                    ]}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </TableShell>
  );
};

/* ---------- store pickers ---------- */
const useServiceCategoriesStoreActions = () => {
  const categories = useServiceCategoriesStore((s) => s.categories);

  // Client-side full dataset for subcategories
  const subAll = useServiceCategoriesStore((s) => s.subAll);
  const subAllLoading = useServiceCategoriesStore((s) => s.subAllLoading);
  const subAllPerPage = useServiceCategoriesStore((s) => s.subAllPerPage);
  const fetchAllSubCategories = useServiceCategoriesStore((s) => s.fetchAllSubCategories);

  // Remote meta used only for categories table
  const categoriesMeta = useServiceCategoriesStore((s) => s.categoriesMeta);

  // Remembered filter helpers
  const rememberedFilter = useServiceCategoriesStore((s) => s.subFilterCategoryId);
  const setSubFilterCategoryId = useServiceCategoriesStore((s) => s.setSubFilterCategoryId);

  // CRUD
  const fetchCategories = useServiceCategoriesStore((s) => s.fetchCategories);
  const createCategory = useServiceCategoriesStore((s) => s.createCategory);
  const createSubCategory = useServiceCategoriesStore((s) => s.createSubCategory);
  const updateCategory = useServiceCategoriesStore((s) => s.updateCategory);
  const updateSubCategory = useServiceCategoriesStore((s) => s.updateSubCategory);
  const deleteCategory = useServiceCategoriesStore((s) => s.deleteCategory);
  const deleteSubCategory = useServiceCategoriesStore((s) => s.deleteSubCategory);

  return {
    categories,
    subAll,
    subAllLoading,
    subAllPerPage,
    fetchAllSubCategories,
    categoriesMeta,
    rememberedFilter,
    setSubFilterCategoryId,
    fetchCategories,
    createCategory,
    createSubCategory,
    updateCategory,
    updateSubCategory,
    deleteCategory,
    deleteSubCategory,
  };
};

const ServiceCategories = () => {
  const navigate = useNavigate();
  useAuthGuard(navigate);

  const toast = useToastAlert();

  const [submitting, setSubmitting] = useState(false);

  const {
    categories,
    subAll,
    subAllLoading,
    subAllPerPage,
    fetchAllSubCategories,
    categoriesMeta,
    rememberedFilter,
    setSubFilterCategoryId,
    fetchCategories,
    createCategory,
    createSubCategory,
    updateCategory,
    updateSubCategory,
    deleteCategory,
    deleteSubCategory,
  } = useServiceCategoriesStoreActions();

  const safeCategories = Array.isArray(categories) ? categories : [];
  const categoriesMap = useMemo(
    () => new Map(safeCategories.map((c) => [Number(c.id), c.name])),
    [safeCategories]
  );

  const [tab, setTab] = useState("categories");

  // UI dropdown; sync to remembered filter
  const [subcatFilter, setSubcatFilter] = useState("ALL");
  useEffect(() => {
    setSubcatFilter(rememberedFilter == null ? "ALL" : String(rememberedFilter));
  }, [rememberedFilter]);

  // precise table loaders
  const [catsLoading, setCatsLoading] = useState(false);
  const [catsPage, setCatsPage] = useState(1);

  useEffect(() => {
    setCatsPage(categoriesMeta?.currentPage || 1);
  }, [categoriesMeta?.currentPage]);

  // initial categories
  useEffect(() => {
    (async () => {
      try {
        setCatsLoading(true);
        await fetchCategories({ page: 1 });
      } catch (e) {
        toast.add({ type: "error", title: "Failed", message: e?.message || "Could not load categories." });
      } finally {
        setCatsLoading(false);
      }
    })();
  }, [fetchCategories]); // eslint-disable-line

  // load ALL subcats when tab opens (for accurate client pagination + totals)
  useEffect(() => {
    if (tab !== "subcategories") return;
    (async () => {
      try {
        await fetchAllSubCategories();
      } catch (e) {
        toast.add({ type: "error", title: "Failed", message: e?.message || "Could not load subcategories." });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /* ----- CATEGORIES (remote pagination) ----- */
  const catsTotal = categoriesMeta?.total || 0;
  const catsTotalPages = categoriesMeta?.lastPage || 1;
  const catsStart = categoriesMeta?.from || 0;
  const catsEnd = categoriesMeta?.to || 0;
  const catsVisible = categories;

  const makeFooterLeft = (total, start, end) =>
    total === 0 ? "No records" : `Showing ${start}–${end} of ${total} record${total > 1 ? "s" : ""}`;

  const catsFooterLeft = makeFooterLeft(catsTotal, catsStart, catsEnd);

  const catsFooterRight = (
    <div className="flex items-center gap-2">
      <button
        disabled={catsPage <= 1}
        onClick={async () => {
          if (catsPage <= 1) return;
          try {
            setCatsLoading(true);
            await fetchCategories({ page: catsPage - 1 });
          } finally {
            setCatsLoading(false);
          }
        }}
        className={`px-3 py-1.5 rounded-lg border ${
          catsPage <= 1 ? "text-gray-400 border-gray-200" : "border-gray-300 hover:bg-gray-50"
        }`}
      >
        Prev
      </button>
      <span className="text-sm text-gray-600">
        Page {catsPage} / {catsTotalPages}
      </span>
      <button
        disabled={catsPage >= catsTotalPages}
        onClick={async () => {
          if (catsPage >= catsTotalPages) return;
          try {
            setCatsLoading(true);
            await fetchCategories({ page: catsPage + 1 });
          } finally {
            setCatsLoading(false);
          }
        }}
        className={`px-3 py-1.5 rounded-lg border ${
          catsPage >= catsTotalPages ? "text-gray-400 border-gray-200" : "border-gray-300 hover:bg-gray-50"
        }`}
      >
        Next
      </button>
    </div>
  );

  /* ----- SUBCATEGORIES (client pagination over full list) ----- */
  const pageSize = subAllPerPage || 10;

  // Full list -> filter by selected category
  const allSubs = Array.isArray(subAll) ? subAll : [];
  const subsFiltered =
    subcatFilter === "ALL"
      ? allSubs
      : allSubs.filter((r) => Number(r.parentCategoryId) === Number(subcatFilter));

  // Client-side paginator over filtered list
  const [subsPage, setSubsPage] = useState(1);
  useEffect(() => {
    // whenever filter changes or full list reloads, reset page 1
    setSubsPage(1);
  }, [subcatFilter, allSubs.length]);

  const subsTotal = subsFiltered.length;
  const subsTotalPages = Math.max(1, Math.ceil(subsTotal / pageSize));

  // clamp current page within bounds
  useEffect(() => {
    if (subsPage > subsTotalPages) setSubsPage(subsTotalPages);
  }, [subsPage, subsTotalPages]);

  const subsStart = subsTotal === 0 ? 0 : (subsPage - 1) * pageSize + 1;
  const subsEnd = subsTotal === 0 ? 0 : Math.min(subsPage * pageSize, subsTotal);

  const subsRows = subsFiltered.slice(subsStart - 1, subsEnd);

  const subsFooterLeft =
    subcatFilter === "ALL"
      ? makeFooterLeft(subsTotal, subsStart, subsEnd)
      : `Showing ${subsStart}–${subsEnd} of ${subsTotal} (Category: ${
          categoriesMap.get(Number(subcatFilter)) || "—"
        })`;

  const subsFooterRight = (
    <div className="flex items-center gap-2">
      <button
        disabled={subsPage <= 1}
        onClick={() => subsPage > 1 && setSubsPage(subsPage - 1)}
        className={`px-3 py-1.5 rounded-lg border ${
          subsPage <= 1 ? "text-gray-400 border-gray-200" : "border-gray-300 hover:bg-gray-50"
        }`}
      >
        Prev
      </button>
      <span className="text-sm text-gray-600">
        Page {subsPage} / {subsTotalPages}
      </span>
      <button
        disabled={subsPage >= subsTotalPages}
        onClick={() => subsPage < subsTotalPages && setSubsPage(subsPage + 1)}
        className={`px-3 py-1.5 rounded-lg border ${
          subsPage >= subsTotalPages ? "text-gray-400 border-gray-200" : "border-gray-300 hover:bg-gray-50"
        }`}
      >
        Next
      </button>
    </div>
  );

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'view' | 'edit'
  const [modalType, setModalType] = useState("category"); // 'category' | 'subcategory'
  const [modalRecord, setModalRecord] = useState(null);

  const openCreateCategory = () => {
    setModalMode("create");
    setModalType("category");
    setModalRecord(null);
    setModalOpen(true);
  };

  const openCreateSubcategory = () => {
    setModalMode("create");
    setModalType("subcategory");
    const prefillParent =
      subcatFilter === "ALL" ? (safeCategories[0]?.id || "") : subcatFilter;
    setModalRecord({ parentCategoryId: prefillParent });
    setModalOpen(true);
  };

  const openView = (type, record) => {
    setModalMode("view");
    setModalType(type);
    setModalRecord({ ...record });
    setModalOpen(true);
  };

  const openEdit = (type, record) => {
    setModalMode("edit");
    setModalType(type);
    setModalRecord({ ...record });
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  // Delete with refresh that keeps filter/page
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);

  const askDeleteCategory = (row) => {
    setConfirmPayload({ type: "category", row });
    setConfirmOpen(true);
  };
  const askDeleteSubcategory = (row) => {
    setConfirmPayload({ type: "subcategory", row });
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmPayload) return;
    setConfirmBusy(true);
    const { type, row } = confirmPayload;
    try {
      if (type === "category") {
        await deleteCategory(row.id);
        toast.add({ type: "success", title: "Deleted", message: "Category deleted successfully." });

        // Refresh categories (remote)
        try {
          setCatsLoading(true);
          await fetchCategories({ page: catsPage || 1 });
        } finally {
          setCatsLoading(false);
        }

        // Also refresh full subcategory list (since parent may affect display)
        await fetchAllSubCategories();
      } else {
        await deleteSubCategory(row.id);
        toast.add({ type: "success", title: "Deleted", message: "Subcategory deleted successfully." });

        // Refresh full subcategory list for accurate totals + pages
        await fetchAllSubCategories();
      }
      setConfirmOpen(false);
      setConfirmPayload(null);
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Delete failed." });
    } finally {
      setConfirmBusy(false);
    }
  };

  // Submit create/edit
  const handleSubmit = async (payload) => {
    try {
      setSubmitting(true);
      if (modalType === "subcategory") {
        if (modalMode === "edit" && modalRecord?.id) {
          await updateSubCategory(modalRecord.id, payload);
          toast.add({ type: "success", title: "Updated", message: "Subcategory updated successfully." });
        } else {
          await createSubCategory(payload);
          toast.add({ type: "success", title: "Created", message: "Subcategory created successfully." });
        }
        await fetchAllSubCategories(); // refresh full list so totals/pages are correct
      } else {
        if (modalMode === "edit" && modalRecord?.id) {
          await updateCategory(modalRecord.id, payload); // payload includes description
          toast.add({ type: "success", title: "Updated", message: "Category updated successfully." });
        } else {
          await createCategory(payload); // payload includes description
          toast.add({ type: "success", title: "Created", message: "Category created successfully." });
        }
        try {
          setCatsLoading(true);
          await fetchCategories({ page: catsPage || 1 });
        } finally {
          setCatsLoading(false);
        }
        await fetchAllSubCategories(); // keep sub list consistent with new parent
      }
      closeModal();
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Action failed." });
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle = `${modalMode[0].toUpperCase()}${modalMode.slice(1)} ${
    modalType === "category" ? "Category" : "Subcategory"
  }`;

  return (
    <main>
      <ToastAlert toasts={toast.toasts} remove={toast.remove} />

      <div className="overflow-x-hidden flex bg-gray-50">
        <Sidebar />

        <div
          id="app-layout-content"
          className="relative min-h-screen w-full min-w-[100vw] md:min-w-0 ml-[15.625rem] [transition:margin_0.25s_ease-out]"
        >
          <Navbar />

          <div className="px-6 pb-20 pt-6">
            {/* Header */}
            <div className="flex items-center mb-6 justify-between -mx-6 border-b border-gray-200 pb-4 bg-white px-6">
              <p className="inline-block text-lg leading-5 font-semibold">Service Categories</p>
            </div>

            {/* Tabs + Create */}
            <div className="mb-4 bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between">
                <Tabs value={tab} onChange={(key) => setTab(key)} />
                <div className="pl-4 py-2">
                  {tab === "categories" ? (
                    <button
                      onClick={openCreateCategory}
                      className="inline-flex items-center gap-2 rounded-lg text-white px-4 py-2 text-sm shadow"
                      style={{ backgroundColor: BRAND_RGB, height: "36px" }}
                    >
                      + New Category
                    </button>
                  ) : (
                    <button
                      onClick={openCreateSubcategory}
                      className="inline-flex items-center gap-2 rounded-lg text-white px-4 py-2 text-sm shadow"
                      style={{ backgroundColor: BRAND_RGB, height: "36px" }}
                    >
                      + New Subcategory
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Subcategories filter */}
            {tab === "subcategories" && (
              <div className="flex items-center gap-3 mb-4">
                <label className="text-sm text-gray-700">Category filter</label>
                <select
                  value={subcatFilter}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSubFilterCategoryId(next === "ALL" ? null : Number(next)); // persist
                    setSubcatFilter(next); // local
                    // page reset handled by useEffect
                  }}
                  className={`${selectBase} w-60`}
                >
                  <option value="ALL">All categories</option>
                  {safeCategories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tables */}
            <div className="space-y-4">
              {tab === "categories" && (
                <CategoriesTable
                  rows={catsVisible}
                  loading={catsLoading}
                  onView={(row) => openView("category", row)}
                  onEdit={(row) => openEdit("category", row)}
                  onDelete={askDeleteCategory}
                  footerLeft={catsFooterLeft}
                  footerRight={catsFooterRight}
                />
              )}

              {tab === "subcategories" && (
                <SubcategoriesTable
                  rows={subsRows /* client-paginated filtered rows */}
                  loading={subAllLoading}
                  categoryNameById={categoriesMap}
                  onView={(row) => openView("subcategory", row)}
                  onEdit={(row) => openEdit("subcategory", row)}
                  onDelete={askDeleteSubcategory}
                  footerLeft={subsFooterLeft}
                  footerRight={subsFooterRight}
                />
              )}
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
                  <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-gray-300">
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
                    onClick={() => document.getElementById("__modal_submit_btn__")?.click()}
                    className="px-4 py-2 rounded-lg text-white inline-flex items-center gap-2"
                    style={{ backgroundColor: BRAND_RGB }}
                    disabled={submitting}
                  >
                    {submitting && <Spinner />}
                    {submitting ? "Saving…" : modalMode === "create" ? "Create" : "Save changes"}
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

          {/* Delete confirmation */}
          <ConfirmDialog
            open={confirmOpen}
            busy={confirmBusy}
            title="Delete record"
            message={
              confirmPayload?.type === "category"
                ? `Are you sure you want to delete the category “${confirmPayload?.row?.name}”?`
                : `Are you sure you want to delete the subcategory “${confirmPayload?.row?.name}”?`
            }
            confirmText="Delete"
            onConfirm={handleConfirmDelete}
            onCancel={() => {
              if (confirmBusy) return;
              setConfirmOpen(false);
              setConfirmPayload(null);
            }}
          />

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default ServiceCategories;
