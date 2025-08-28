// src/pages/dashboard/Members.jsx
// Updates:
// - Reuse shared components (Modal, ToastAlert/useToastAlert, useClickOutside, useAuthGuard, Spinner/CenterLoader)
// - Summary cards (Total Users, Subscribed %, Non-subscribed %, Creators)
// - Tabs (Subscribers / Non-subscribers) with underline style (active thick BRAND_RGB)
// - Search input aligned to the RIGHT inside the tabs bar (icon on right)
// - Table, view/edit modals, toggles & pagination preserved
// - Tolerant subscription classification (isSubscribed)

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import useMembersStore from "../../store/MembersStore";
import useCreatorsStore from "../../store/CreatorsStore"; // for Creators summary card (falls back if not loaded)

import { FiMoreVertical, FiX, FiSearch } from "react-icons/fi";

import Modal from "../../components/common/Modal";
import { ToastAlert, useToastAlert } from "../../components/common/ToastAlert";
import useClickOutside from "../../lib/useClickOutside";
import useAuthGuard from "../../lib/useAuthGuard";
import { Spinner, CenterLoader } from "../../components/common/Spinner";

const BRAND_RGB = "rgb(77, 52, 144)";

/* ===========================
   Helpers
   =========================== */
const toNormStatus = (raw) => {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "active" ? "active" : "inactive";
};

const dash = (v) => (v === undefined || v === null || v === "" ? "—" : v);

/** Best-effort "is subscribed?" detector for varied backends */
const isSubscribed = (row = {}) => {
  const fields = [
    row.subscribed,
    row.is_subscribed,
    row.isSubscribed,
    row.subscription,
    row.subscription_status,
    row.plan,
  ];
  for (const f of fields) {
    const v = String(f ?? "").toLowerCase();
    if (v === "1" || v === "true" || v === "yes" || v === "subscribed" || v === "active" || v === "paid") {
      return true;
    }
    if (v === "0" || v === "false" || v === "no" || v === "unsubscribed" || v === "inactive" || v === "free") {
      return false;
    }
  }
  // Fallback: check for a non-empty plan name
  if (typeof row.plan === "string" && row.plan.trim()) return true;
  return false;
};

/* ===========================
   3-dots menu (closes on outside click)
   =========================== */
const ThreeDotsMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));
  const safeItems = Array.isArray(items) ? items : [];
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
   Small UI atoms
   =========================== */
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

const inputBase =
  "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm placeholder:text-xs placeholder:font-light placeholder:text-gray-400";
const selectBase =
  "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm";

/* ===========================
   Modal subcomponents
   =========================== */
const MemberView = ({ record }) => {
  if (!record) return null;
  const kyc = record.kyc || {};
  const resp = kyc.response || {};
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-base font-semibold">{dash(record.name)}</div>
          <div className="mt-1 text-xs text-gray-500">
            Member ID: <span className="font-medium text-gray-700">{dash(record.member_id)}</span>
          </div>
        </div>
        <StatusPill value={record.status} />
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-0.5 rounded border border-gray-200 text-gray-600">ID: {dash(record.id)}</span>
        <span className="px-2 py-0.5 rounded border border-gray-200 text-gray-600">Joined: {dash(record.createdAtReadable)}</span>
        <span className="px-2 py-0.5 rounded border border-gray-200 text-gray-600">Updated: {dash(record.updatedAtReadable)}</span>
      </div>

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

const MemberForm = ({ record, onSubmit, submitting }) => {
  const [name, setName] = useState(record?.name ?? "");
  const [email, setEmail] = useState(record?.email ?? "");
  const [phone, setPhone] = useState(record?.phone ?? "");
  const [dob, setDob] = useState(record?.dob ?? "");
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
        onSubmit({ name, email, phone, dob, status });
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputBase} placeholder="Full name" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputBase} placeholder="name@example.com" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputBase} placeholder="+2348012345678" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">DOB</label>
          <input type="date" value={dob || ""} onChange={(e) => setDob(e.target.value)} className={inputBase} placeholder="YYYY-MM-DD" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectBase}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <button type="submit" id="__member_submit_btn__" className="hidden" disabled={submitting} />
    </form>
  );
};

/* ===========================
   Tabs (underline style)
   =========================== */
const Tabs = ({ value, onChange }) => {
  const tabs = [
    { key: "subscribers", label: "Subscribers" },
    { key: "non_subscribers", label: "Non-subscribers" },
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
   Table + Footer
   =========================== */
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

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">Phone number</th>
              <th className="text-left px-4 py-3 font-semibold">Date of birth</th>
              <th className="text-left px-4 py-3 font-semibold">Account status</th>
              <th className="text-left px-4 py-3 font-semibold">KYC Status</th>
              <th className="text-left px-4 py-3 font-semibold">Date created</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {safeRows.map((row) => {
              const active = toNormStatus(row.status) === "active";
              return (
                <tr key={row.id || row.member_id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{dash(row.name)}</td>
                  <td className="px-4 py-3">{dash(row.phone)}</td>
                  <td className="px-4 py-3">{dash(row.dobReadable)}</td>
                  <td className="px-4 py-3">
                    <StatusPill value={toNormStatus(row.status)} />
                  </td>
                  <td className="px-4 py-3">
                    {/* KYC badge (simple mapping) */}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        String(row.kyc_status ?? "").toLowerCase() === "approved"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : String(row.kyc_status ?? "").toLowerCase() === "pending"
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : String(row.kyc_status ?? "").toLowerCase() === "rejected"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      }`}
                    >
                      {dash(row.kyc_status) || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{dash(row.createdAtReadable)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-3 justify-end">
                      <Toggle checked={active} onChange={() => onToggle(row)} />
                      {togglingId === (row.id || row.member_id) && (
                        <span className="inline-flex items-center text-xs text-gray-500">
                          <Spinner className="!text-gray-500 mr-1" /> updating…
                        </span>
                      )}
                      <ThreeDotsMenu
                        items={[
                          { label: "View", onClick: () => onView(row) },
                          { label: "Edit", onClick: () => onEdit(row) },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {safeRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  No members yet.
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
const Members = () => {
  const navigate = useNavigate();
  useAuthGuard(navigate);

  const toast = useToastAlert();

  const { members, pagination, fetchMembers, getMember, updateMember, toggleMemberStatus } = useMembersStore();
  const creatorsStore = useCreatorsStore(); // optional; for Creators summary card

  const [hydrated, setHydrated] = useState(false);

  // Search, page (status filter omitted to mirror UI)
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Tabs
  const [tab, setTab] = useState("subscribers"); // subscribers | non_subscribers

  const [togglingId, setTogglingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // initial fetch
  useEffect(() => {
    (async () => {
      await fetchMembers?.({ page: 1, per_page: perPage, q: "" });
      setHydrated(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounced fetch on q/page
  useEffect(() => {
    const t = setTimeout(() => {
      fetchMembers?.({ page, per_page: perPage, q });
    }, 300);
    return () => clearTimeout(t);
  }, [page, q, fetchMembers]);

  // Enter = immediate fetch & reset page
  const onSearchEnter = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        setPage(1);
        fetchMembers?.({ page: 1, per_page: perPage, q });
      }
    },
    [q, fetchMembers]
  );

  const allRows = useMemo(() => (Array.isArray(members) ? members : []), [members]);

  // Apply tab filter then search
  const tabbedRows = useMemo(() => {
    const wantSub = tab === "subscribers";
    return allRows.filter((r) => isSubscribed(r) === wantSub);
  }, [allRows, tab]);

  const filteredRows = useMemo(() => {
    if (!q) return tabbedRows;
    const qv = q.toLowerCase();
    return tabbedRows.filter(
      (r) =>
        String(r.name || "").toLowerCase().includes(qv) ||
        String(r.phone || "").toLowerCase().includes(qv) ||
        String(r.email || "").toLowerCase().includes(qv)
    );
  }, [tabbedRows, q]);

  // Summary metrics
  const totalUsers = pagination?.total ?? allRows.length ?? 0;
  const subscribedCount = useMemo(() => allRows.filter((r) => isSubscribed(r)).length, [allRows]);
  const nonSubscribedCount = Math.max(0, totalUsers - subscribedCount);
  const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

  const creatorsCount =
    creatorsStore?.pagination?.total ??
    JSON.parse(localStorage.getItem("creators_pagination") || "{}")?.total ??
    0;

  // Modal state
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
      setTogglingId(row.id || row.member_id);
      await toggleMemberStatus?.(row.id || row.member_id);
      toast.add({ type: "success", title: "Status updated" });
      await fetchMembers?.({ page, per_page: perPage, q });
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Status change failed." });
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
      await fetchMembers?.({ page, per_page: perPage, q });
      closeModal();
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Update failed." });
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Pagination math (API-first)
  const per = pagination?.per_page || perPage;
  const totalPages = Math.max(1, Math.ceil((pagination?.total || filteredRows.length || 0) / per));
  const startIdx = (page - 1) * per + 1;
  const endIdx = Math.min(page * per, pagination?.total || filteredRows.length || 0);

  // Slice for client view if API doesn’t server-paginate by tab/q (we’re defensive)
  const pageRows =
    pagination?.total ? filteredRows : filteredRows.slice((page - 1) * per, page * per);

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
              <p className="inline-block px-6 text-base md:text-lg leading-5 font-semibold">Users</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="text-xs text-gray-600 mb-2">Total Users</div>
                <div className="text-2xl font-semibold">{totalUsers.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="text-xs text-gray-600 mb-2">Subscribed Users ({pct(subscribedCount, totalUsers)}%)</div>
                <div className="text-2xl font-semibold">{subscribedCount.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="text-xs text-gray-600 mb-2">Non-subscribed users ({pct(nonSubscribedCount, totalUsers)}%)</div>
                <div className="text-2xl font-semibold">{nonSubscribedCount.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="text-xs text-gray-600 mb-2">Creators</div>
                <div className="text-2xl font-semibold">{Number(creatorsCount || 0).toLocaleString()}</div>
              </div>
            </div>

            {/* Tabs + Search (same row) */}
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
                      className="h-9 pr-9 pl-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] w-64 text-sm placeholder:text-xs leading-[1.25rem]"
                      placeholder="Search for a user"
                      aria-label="Search users"
                    />
                    <FiSearch
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Table / Loader */}
            {!hydrated ? (
              <CenterLoader />
            ) : (
              <MembersTable
                rows={pageRows}
                onView={openView}
                onEdit={openEdit}
                onToggle={handleToggle}
                togglingId={togglingId}
                footerLeft={
                  (pagination?.total || filteredRows.length)
                    ? `Showing ${Math.max(1, startIdx)}–${Math.max(startIdx, endIdx)} of ${(pagination?.total || filteredRows.length).toLocaleString()} record${(pagination?.total || filteredRows.length) > 1 ? "s" : ""}`
                    : q
                    ? `No results for “${q}”`
                    : "No records"
                }
                footerRight={
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
                }
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
                  <button className="px-4 py-2 rounded-lg border border-gray-300" onClick={closeModal} disabled={submitting}>
                    Cancel
                  </button>
                  <button
                    onClick={() => document.getElementById("__member_submit_btn__")?.click()}
                    className="px-4 py-2 rounded-lg text-white inline-flex items-center gap-2"
                    style={{ backgroundColor: BRAND_RGB }}
                    disabled={submitting}
                  >
                    {submitting && <Spinner />}
                    {submitting ? "Saving…" : "Save changes"}
                  </button>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button className="px-4 py-2 rounded-lg border border-gray-300" onClick={closeModal}>
                    Close
                  </button>
                </div>
              )
            }
          >
            {modalMode === "edit" ? (
              <MemberForm record={modalRecord} onSubmit={handleUpdate} submitting={submitting} />
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
