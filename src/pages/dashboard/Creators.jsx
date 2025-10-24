// src/pages/dashboard/Creators.jsx
// List page with tabs + filters. "View" navigates to /creators/:id (details page).
// Row menu has only View + Edit. Table shows S/N (serial number) instead of DB id.

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import useCreatorsStore from "../../store/CreatorsStore";
import { FiMoreVertical, FiSearch } from "react-icons/fi";

import Modal from "../../components/common/Modal";
import { ToastAlert, useToastAlert } from "../../components/common/ToastAlert";
import useClickOutside from "../../lib/useClickOutside";
import useAuthGuard from "../../lib/useAuthGuard";
import { Spinner } from "../../components/common/Spinner";

const BRAND_RGB = "rgb(77, 52, 144)";

/* ---------- tiny helpers ---------- */
const dash = (v) => (v === undefined || v === null || v === "" ? "—" : v);
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleString("en-NG", { year: "numeric", month: "short", day: "2-digit" });
};
const getName = (row = {}) => {
  const fn = row.user?.first_name?.trim();
  const ln = row.user?.last_name?.trim();
  if (fn || ln) return [fn, ln].filter(Boolean).join(" ");
  if (row.user?.surname) return row.user.surname;
  return row.name || "";
};
const getStatus = (row = {}) => {
  if (typeof row.active === "boolean") return row.active ? "active" : "inactive";
  const v = String(row.status ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "active" ? "active" : "inactive";
};

/* ---------- classify ---------- */
const classifyType = (row = {}) => {
  const job = String(row.job_title || "").toLowerCase();
  if (Number(row.services_count) > 0 || (Array.isArray(row.services) && row.services.length > 0))
    return "service_providers";
  if (job.includes("artist") || job.includes("dj") || job.includes("singer")) return "artists";
  if (job.includes("asset") || job.includes("assets")) return "assets_creators";
  if (row.is_artist) return "artists";
  if (row.is_service || row.service_provider) return "service_providers";
  if (row.is_asset || row.assets_creator) return "assets_creators";
  return "service_providers";
};

/* ---------- 3-dots menu ---------- */
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
        <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md border border-gray-200 bg-white shadow-lg z-20">
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

/* ---------- small UI atoms ---------- */
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

const TextArea = (props) => (
  <textarea
    {...props}
    className={`min-h-[84px] px-3 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm w-full ${
      props.className || ""
    }`}
  />
);
const Text = (props) => (
  <input
    {...props}
    className={`h-10 px-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm w-full ${
      props.className || ""
    }`}
  />
);
const Select = (props) => (
  <select
    {...props}
    className={`h-10 px-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm w-full ${
      props.className || ""
    }`}
  />
);

/* ---------- top tabs ---------- */
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

/* ---------- EDIT MODAL (reused here) ---------- */
const EditCreatorModal = ({ open, data, saving, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    gender: "",
    nin: "",
    id_type: "",
    copy_of_id: "",
    utility_bill: "",
    copy_of_utility_bill: "",
    job_title: "",
    bio: "",
    active: false,
    location: "",
    linkedin: "",
    x: "",
    instagram: "",
  });

  useEffect(() => {
    if (!data) return;
    const getStatus = (row = {}) => {
      if (typeof row.active === "boolean") return row.active ? "active" : "inactive";
      const v = String(row.status ?? "").trim().toLowerCase();
      return v === "1" || v === "true" || v === "active" ? "active" : "inactive";
    };
    setForm({
      gender: data.gender || data.user?.gender || "",
      nin: data.nin || data.user?.nin || "",
      id_type: data.id_type || "",
      copy_of_id: data.copy_of_id || "",
      utility_bill: data.utility_bill || "",
      copy_of_utility_bill: data.copy_of_utility_bill || "",
      job_title: data.job_title || "",
      bio: data.bio || "",
      active: typeof data.active === "boolean" ? data.active : getStatus(data) === "active",
      location: data.location || "",
      linkedin: data.linkedin || "",
      x: data.x || "",
      instagram: data.instagram || "",
    });
  }, [data]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal open={open} title={data ? `Edit Creator: ${getName(data) || `#${data.id}`}` : ""} onClose={onClose}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-600 mb-1">Gender</div>
            <Select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">NIN</div>
            <Text value={form.nin} onChange={(e) => set("nin", e.target.value)} />
          </div>

          <div>
            <div className="text-xs text-gray-600 mb-1">ID Type</div>
            <Text value={form.id_type} onChange={(e) => set("id_type", e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Copy of ID (URL)</div>
            <Text value={form.copy_of_id} onChange={(e) => set("copy_of_id", e.target.value)} />
          </div>

          <div>
            <div className="text-xs text-gray-600 mb-1">Utility bill</div>
            <Text
              placeholder="e.g., electricity_bill"
              value={form.utility_bill}
              onChange={(e) => set("utility_bill", e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Copy of utility bill (URL)</div>
            <Text
              value={form.copy_of_utility_bill}
              onChange={(e) => set("copy_of_utility_bill", e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-gray-600 mb-1">Job title</div>
            <Text value={form.job_title} onChange={(e) => set("job_title", e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-gray-600 mb-1">Bio</div>
            <TextArea value={form.bio} onChange={(e) => set("bio", e.target.value)} />
          </div>

          <div>
            <div className="text-xs text-gray-600 mb-1">Location</div>
            <Text value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>

          <div>
            <div className="text-xs text-gray-600 mb-1">LinkedIn</div>
            <Text value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">X</div>
            <Text value={form.x} onChange={(e) => set("x", e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Instagram</div>
            <Text value={form.instagram} onChange={(e) => set("instagram", e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-gray-600 mb-1">Active</div>
            <div className="flex items-center gap-2">
              <Toggle checked={!!form.active} onChange={(v) => set("active", v)} />
              <span className="text-sm">{form.active ? "Active" : "Inactive"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white"
            style={{ backgroundColor: BRAND_RGB }}
            disabled={saving}
          >
            {saving ? (
              <>
                <Spinner className="!text-white" /> Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

/* ---------- creators table ---------- */
const CreatorsTable = ({
  rows,
  q,
  loadingList,
  onView,
  onEdit,
  onToggle,
  togglingId,
  footerLeft,
  footerRight,
  startIndex = 1, // NEW: base index for S/N
}) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const emptyText = q ? `No results found for “${q}”` : "No creators yet.";

  return (
    <div className="relative rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">S/N</th>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">Gender</th>
              <th className="text-left px-4 py-3 font-semibold">NIN</th>
              <th className="text-left px-4 py-3 font-semibold">Joined</th>
              <th className="text-left px-4 py-3 font-semibold">Updated</th>
              <th className="text-left px-4 py-3 font-semibold">Services</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {safeRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                  {loadingList ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner className="!text-gray-500" /> Loading…
                    </span>
                  ) : (
                    emptyText
                  )}
                </td>
              </tr>
            ) : (
              safeRows.map((row, idx) => {
                const active = getStatus(row) === "active";
                const name = getName(row);
                const isToggling = togglingId === row.id;
                const count =
                  typeof row.services_count === "number"
                    ? row.services_count
                    : Array.isArray(row.services)
                    ? row.services.length
                    : "—";
                const sn = startIndex + idx; // S/N per page
                return (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">{sn}</td>
                    <td className="px-4 py-3">{dash(name)}</td>
                    <td className="px-4 py-3 capitalize">{dash(row.gender || row.user?.gender)}</td>
                    <td className="px-4 py-3">{dash(row.nin || row.user?.nin)}</td>
                    <td className="px-4 py-3">{dash(row.createdAtReadable || fmtDate(row.created_at))}</td>
                    <td className="px-4 py-3">{dash(row.updatedAtReadable || fmtDate(row.updated_at))}</td>
                    <td className="px-4 py-3">{dash(count)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <StatusPill value={getStatus(row)} />
                        <Toggle checked={active} onChange={() => onToggle(row)} />
                        {isToggling && (
                          <span className="inline-flex items-center text-xs text-gray-500 gap-1">
                            <Spinner className="!text-gray-500" /> updating…
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
              })
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

/* ---------- PAGE ---------- */
const Creators = () => {
  const navigate = useNavigate();
  useAuthGuard(navigate);

  const toast = useToastAlert();
  const {
    creators,
    pagination,
    fetchCreators,
    toggleCreatorStatus,
    updateCreator,
  } = useCreatorsStore();

  const [loadingList, setLoadingList] = useState(false);
  const fetchList = useCallback(
    async (params) => {
      setLoadingList(true);
      try {
        await fetchCreators?.(params);
      } finally {
        setLoadingList(false);
      }
    },
    [fetchCreators]
  );

  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // 'active' | 'inactive' | ''
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [togglingId, setTogglingId] = useState(null);

  const [tab, setTab] = useState("service_providers");

  // EDIT modal
  const [editRec, setEditRec] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Initial fetch
  useEffect(() => {
    fetchList({ page: 1, per_page: perPage, q: "", status: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced reactive fetch
  useEffect(() => {
    const t = setTimeout(() => {
      fetchList({ page, per_page: perPage, q, status });
    }, 300);
    return () => clearTimeout(t);
  }, [page, q, status, fetchList]);

  const onSearchEnter = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        setPage(1);
        fetchList({ page: 1, per_page: perPage, q, status });
      }
    },
    [q, status, fetchList]
  );

  const allRowsRaw = useMemo(() => (Array.isArray(creators) ? creators : []), [creators]);

  const allRows = useMemo(
    () =>
      allRowsRaw.map((r) => ({
        ...r,
        name: getName(r),
        gender: r.gender || r.user?.gender,
        nin: r.nin || r.user?.nin,
        createdAtReadable: r.createdAtReadable || fmtDate(r.created_at),
        updatedAtReadable: r.updatedAtReadable || fmtDate(r.updated_at),
      })),
    [allRowsRaw]
  );

  const buckets = useMemo(() => {
    const map = { assets_creators: [], service_providers: [], artists: [] };
    for (const r of allRows) map[classifyType(r)].push(r);
    return map;
  }, [allRows]);

  const rows = useMemo(() => buckets[tab] || [], [buckets, tab]);

  const handleToggle = async (row) => {
    try {
      setTogglingId(row.id);
      await toggleCreatorStatus?.(row.id);
      toast.add({ type: "success", title: "Status updated Successfully" });
      fetchList({ page, per_page: perPage, q, status });
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Status change failed." });
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  };

  const total = pagination?.total ?? allRows.length ?? 0;
  const per = pagination?.per_page || perPage;
  const totalPages = Math.max(1, Math.ceil((pagination?.total || total) / per));
  const startIdx = total === 0 ? 0 : (page - 1) * per + 1; // base for S/N
  const endIdx = total === 0 ? 0 : Math.min(page * per, total);

  const footerLeftText =
    total === 0 ? (q ? `No results for “${q}”` : "No records") : `Showing ${startIdx}–${endIdx} of ${total} record${total > 1 ? "s" : ""}`;

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

  const filteredRows = useMemo(() => {
    let list = rows;
    if (status) list = list.filter((r) => getStatus(r) === status);
    if (q) {
      const qv = q.toLowerCase();
      list = list.filter((r) => {
        const hay = [
          getName(r),
          r.nin,
          r.id,
          r.user?.email,
          r.user?.phone_number,
          r.job_title,
          ...(Array.isArray(r.services) ? r.services.map((s) => s.service_name) : []),
        ]
          .filter(Boolean)
          .map(String)
          .map((s) => s.toLowerCase());
        return hay.some((s) => s.includes(qv));
      });
    }
    return list;
  }, [rows, status, q]);

  const submitEdit = async (values) => {
    if (!editRec) return;
    try {
      setSavingEdit(true);

      const creatorPayload = {
        gender: values.gender || undefined,
        nin: values.nin || undefined,
        id_type: values.id_type || undefined,
        copy_of_id: values.copy_of_id || undefined,
        utility_bill: values.utility_bill || undefined,
        copy_of_utility_bill: values.copy_of_utility_bill || undefined,
        job_title: values.job_title || undefined,
        bio: values.bio || undefined,
        active: typeof values.active === "boolean" ? values.active : undefined,
        location: values.location || undefined,
        linkedin: values.linkedin || undefined,
        x: values.x || undefined,
        instagram: values.instagram || undefined,
      };

      await updateCreator?.(editRec.id, creatorPayload);
      toast.add({ type: "success", title: "Creator updated Successfully" });

      await fetchList({ page, per_page: perPage, q, status });
      setEditRec(null);
    } catch (e) {
      toast.add({ type: "error", title: "Update failed", message: e?.message || "Could not update creator." });
      console.error(e);
    } finally {
      setSavingEdit(false);
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
            {/* Header */}
            <div className="flex items-center mb-4 justify-between -mx-6 border-b border-gray-300 pb-3">
              <p className="inline-block px-6 text-base md:text-lg leading-5 font-semibold">Creators</p>
              <div className="px-6" />
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {[
                { label: "Total Creators", value: (pagination?.total ?? allRows.length ?? 0).toLocaleString("en-NG") },
                { label: "Assets Creators", value: (buckets.assets_creators.length || 0).toLocaleString("en-NG") },
                { label: "Service Providers", value: (buckets.service_providers.length || 0).toLocaleString("en-NG") },
                { label: "Artists", value: (buckets.artists.length || 0).toLocaleString("en-NG") },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                  <div className="text-xs text-gray-600 mb-2">{c.label}</div>
                  <div className="text-2xl font-semibold">{c.value}</div>
                </div>
              ))}
            </div>

            {/* Tabs + Search */}
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

            {/* Filters */}
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

            {/* Table */}
            <CreatorsTable
              rows={filteredRows}
              q={q}
              loadingList={loadingList}
              onView={(rec) => navigate(`/creators/${rec.id}`)}
              onEdit={(rec) => setEditRec(rec)}
              onToggle={handleToggle}
              togglingId={togglingId}
              footerLeft={footerLeftText}
              footerRight={footerRightControls}
              startIndex={startIdx} // base for S/N
            />
          </div>

          {/* Edit modal */}
          <EditCreatorModal
            open={!!editRec}
            data={editRec}
            saving={savingEdit}
            onClose={() => setEditRec(null)}
            onSubmit={submitEdit}
          />

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Creators;
