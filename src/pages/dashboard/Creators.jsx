// src/pages/dashboard/Creators.jsx
// Updates:
// - Removed "New Creator" button
// - Search input now lives in the Tabs row on the RIGHT (replaces the button)
// - Removed duplicate search from filters section; kept Status filter only
// - Reuse shared components: Modal, ToastAlert/useToastAlert, useClickOutside, useAuthGuard, Spinner/CenterLoader
// - Summary cards + 3 tabs (Assets creators, Service providers, Artists)
// - View modal is read-only; Create/Edit modal uses same form

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import useCreatorsStore from "../../store/CreatorsStore";
import { FiMoreVertical, FiX, FiSearch, FiExternalLink, FiCopy } from "react-icons/fi";

import Modal from "../../components/common/Modal";
import { ToastAlert, useToastAlert } from "../../components/common/ToastAlert";
import useClickOutside from "../../lib/useClickOutside";
import useAuthGuard from "../../lib/useAuthGuard";
import { Spinner, CenterLoader } from "../../components/common/Spinner";

const BRAND_RGB = "rgb(77, 52, 144)";

/* ===========================
   Tiny helpers
   =========================== */
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
const toNormStatus = (raw) => {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "active" ? "active" : "inactive";
};
const dash = (v) => (v === undefined || v === null || v === "" ? "—" : v);

/* ----- classify creator for counts & tabs (tolerant to different API shapes) ----- */
const classifyType = (row = {}) => {
  const raw =
    row.type ||
    row.role ||
    row.category ||
    row.segment ||
    row.creator_type ||
    row.kind ||
    row.group ||
    "";
  const v = String(raw).toLowerCase();

  if (v.includes("service")) return "service_providers";
  if (v.includes("artist")) return "artists";
  if (v.includes("asset") || v.includes("assets")) return "assets_creators";

  // Boolean-ish flags some APIs use
  if (row.is_artist) return "artists";
  if (row.is_service || row.service_provider) return "service_providers";
  if (row.is_asset || row.assets_creator) return "assets_creators";

  // Default
  return "assets_creators";
};

/* ===========================
   3-dots menu (reusing useClickOutside)
   =========================== */
const ThreeDotsMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  const safeItems = Array.isArray(items) ? items : [];
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));
  return (
    <div className="relative inline-block text-left" ref={ref}>
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
   Read-only "View Details"
   =========================== */
const inputBase =
  "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm placeholder:text-xs placeholder:font-light placeholder:text-gray-400";
const selectBase =
  "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm";

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
          <img src={href} alt="preview" className="h-14 w-14 object-cover rounded border border-gray-200" />
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

const StatusPill = ({ value = "inactive" }) => {
  const active = String(value).toLowerCase() === "active";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
        active ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-700 border border-gray-200"
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
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-green-500" : "bg-gray-300"}`}
    aria-pressed={checked}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked ? "translate-x-5" : "translate-x-1"}`} />
  </button>
);

const CreatorDetailsView = ({ record }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-[13px] font-medium">{dash(record?.name)}</div>
        <StatusPill value={toNormStatus(record?.status)} />
      </div>
      <div className="text-[12px] text-gray-500">ID: {dash(record?.id)}</div>
    </div>

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
  const [copyUtilityBillType, setCopyUtilityBillType] = useState(record?.copy_utility_bill_type ?? "");

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
          <select disabled={isView} value={gender} onChange={(e) => setGender(e.target.value)} className={selectBase}>
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
          <select disabled={isView} value={idType} onChange={(e) => setIdType(e.target.value)} className={selectBase}>
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
   Tabs (underline style)
   =========================== */
const Tabs = ({ value, onChange }) => {
  const tabs = [
    { key: "assets_creators", label: "Assets creators" },
    { key: "service_providers", label: "Service providers" },
    { key: "artists", label: "Artists" },
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

/* ===========================
   Table
   =========================== */
const CreatorsTable = ({
  rows,
  q,
  onView,
  onEdit,
  onToggle,
  togglingId,
  footerLeft,
  footerRight,
}) => {
  const safeRows = Array.isArray(rows) ? rows : [];
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
  useAuthGuard(navigate); // shared guard

  const toast = useToastAlert();
  const { creators, pagination, fetchCreators, toggleCreatorStatus } = useCreatorsStore();

  const [hydrated, setHydrated] = useState(false);

  // Search/filter/page (server-driven); Enter = instant
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // 'active' | 'inactive' | ''
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Tabs
  const [tab, setTab] = useState("assets_creators"); // assets_creators | service_providers | artists

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

  const allRows = useMemo(() => (Array.isArray(creators) ? creators : []), [creators]);

  // Classification + counts
  const buckets = useMemo(() => {
    const map = { assets_creators: [], service_providers: [], artists: [] };
    for (const r of allRows) {
      map[classifyType(r)].push(r);
    }
    return map;
  }, [allRows]);

  // Rows shown for current tab
  const rows = useMemo(() => buckets[tab] || [], [buckets, tab]);

  // Status filter options built from current rows
  const statusOptions = ["active", "inactive"];

  // Toggle status handler
  const handleToggle = async (row) => {
    try {
      setTogglingId(row.id);
      await toggleCreatorStatus?.(row.id);
      toast.add({ type: "success", title: "Status updated" });
      await fetchCreators?.({ page, per_page: perPage, q, status });
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Status change failed." });
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  };

  // Pagination math (using API pagination if provided)
  const total = pagination?.total ?? allRows.length ?? 0;
  const per = pagination?.per_page || perPage;
  const totalPages = Math.max(1, Math.ceil((pagination?.total || 0) / per));
  const startIdx = total === 0 ? 0 : (page - 1) * per + 1;
  const endIdx = total === 0 ? 0 : Math.min(page * per, total);

  const footerLeftText =
    total === 0 ? (q ? `No results for “${q}”` : "No records") : `Showing ${startIdx}–${endIdx} of ${total} record${total > 1 ? "s" : ""}`;

  const footerRightControls = (
    <div className="flex items-center gap-2">
      <button
        disabled={page <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className={`px-3 py-1.5 rounded-lg border ${page <= 1 ? "text-gray-400 border-gray-200" : "border-gray-300 hover:bg-gray-50"}`}
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

  // Summary counts (derived if API doesn’t provide)
  const formatNum = (n) =>
    typeof n === "number" ? n.toLocaleString("en-NG") : typeof n === "string" ? n : "—";

  const summary = {
    totalCreators: total,
    assets: buckets.assets_creators.length,
    services: buckets.service_providers.length,
    artists: buckets.artists.length,
  };

  // Apply status and search filters on the *current-tab* rows for display
  const filteredRows = useMemo(() => {
    let list = rows;
    if (status) list = list.filter((r) => toNormStatus(r.status) === status);
    if (q) {
      const qv = q.toLowerCase();
      list = list.filter(
        (r) =>
          String(r.name || "").toLowerCase().includes(qv) ||
          String(r.nin || "").toLowerCase().includes(qv) ||
          String(r.id || "").toLowerCase().includes(qv)
      );
    }
    return list;
  }, [rows, status, q]);

  return (
    <main>
      <ToastAlert toasts={toast.toasts} remove={toast.remove} />

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
              <p className="inline-block px-6 text-base md:text-lg leading-5 font-semibold">Creators</p>
              <div className="px-6" />
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {[
                { label: "Total Creators", value: formatNum(summary.totalCreators) },
                { label: "Assets Creators", value: formatNum(summary.assets) },
                { label: "Service Providers", value: formatNum(summary.services) },
                { label: "Artists", value: formatNum(summary.artists) },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                  <div className="text-xs text-gray-600 mb-2">{c.label}</div>
                  <div className="text-2xl font-semibold">{c.value}</div>
                </div>
              ))}
            </div>

            {/* Tabs + Search (search replaces removed button) */}
            <div className="mb-3 bg-white rounded-xl border border-gray-200 px-4 pt-2 pb-3 shadow-sm">
              <div className="flex items-center justify-between">
                <Tabs value={tab} onChange={setTab} />
                <div className="pl-4 py-2">
                  <div className="relative">
                    <input
                      value={q}
                      onChange={(e) => {
                        setPage(1);
                        setQ(e.target.value);
                      }}
                      onKeyDown={onSearchEnter}
                      className="h-10 pr-9 pl-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] w-72 text-sm placeholder:text-xs leading-[1.25rem]"
                      placeholder="Search creators…"
                      aria-label="Search creators"
                    />
                    <FiSearch
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters (status only) */}
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm text-gray-700">Status</label>
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
                {["active", "inactive"].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt[0].toUpperCase() + opt.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Table / Loader */}
            {!hydrated ? (
              <CenterLoader />
            ) : (
              <CreatorsTable
                rows={filteredRows}
                q={q}
                onView={(rec) => {
                  // open read-only
                  console.log(rec);
                }}
                onEdit={(rec) => {
                  // open edit
                  console.log(rec);
                }}
                onToggle={handleToggle}
                togglingId={togglingId}
                footerLeft={footerLeftText}
                footerRight={footerRightControls}
              />
            )}
          </div>

          {/* Modal placeholder in case you still use it elsewhere */}
          <Modal open={false} title="" onClose={() => {}} />

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Creators;
