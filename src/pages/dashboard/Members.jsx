// src/pages/dashboard/Members.jsx
// Summary cards are stable (use store.counts from an unfiltered fetch)
// Table uses single-loader UX (like Creators):
//  - Table always renders
//  - If no rows: show a single "Loading…" row or "No members yet."
//  - If rows exist and loading: show centered overlay spinner
// Edit modal opens instantly and hydrates fields once data arrives.
// Edit form matches POST /admin/user/:userId schema (no status field).

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import useMembersStore from "../../store/MembersStore";

import { FiMoreVertical, FiSearch } from "react-icons/fi";

import Modal from "../../components/common/Modal";
import { ToastAlert, useToastAlert } from "../../components/common/ToastAlert";
import useClickOutside from "../../lib/useClickOutside";
import useAuthGuard from "../../lib/useAuthGuard";
import { Spinner } from "../../components/common/Spinner";

const BRAND_RGB = "rgb(77, 52, 144)";

/* =========================== Helpers =========================== */
const toNormStatus = (raw) => {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "active" ? "active" : "inactive";
};
const dash = (v) => (v === undefined || v === null || v === "" ? "—" : v);

const VerifiedBadge = ({ ok }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
      ok ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"
    }`}
  >
    {ok ? "Verified" : "Unverified"}
  </span>
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

const inputBase =
  "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm placeholder:text-xs placeholder:font-light placeholder:text-gray-400";
const selectBase =
  "w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-[#4D3490] text-sm";

/* =========================== 3-dots menu =========================== */
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

/* =========================== View =========================== */
const MemberView = ({ record }) => {
  if (!record) return null;
  const creator = record.creator || {};
  // Derive status: status → active → creator.active → (fallback) email_verified_at
  const status = toNormStatus(
    record?.status ?? record?.active ?? creator?.active ?? (record?.email_verified_at ? "active" : "inactive")
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-base font-semibold">
            {dash(record.name || `${record.first_name ?? ""} ${record.last_name ?? ""}`.trim())}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Member ID: <span className="font-medium text-gray-700">{dash(record.id)}</span>
          </div>
        </div>
        <StatusPill value={status} />
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-0.5 rounded border border-gray-200 text-gray-600">Role: {dash(record.role)}</span>
        <span className="px-2 py-0.5 rounded border border-gray-200 text-gray-600">
          Created: {dash(record.createdAtReadable || record.created_at)}
        </span>
        <span className="px-2 py-0.5 rounded border border-gray-200 text-gray-600">
          Updated: {dash(record.updatedAtReadable || record.updated_at)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Email</div>
          <div className="text-gray-800">{dash(record.email)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Phone</div>
          <div className="text-gray-800">{dash(record.phone || record.phone_number)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Date of birth</div>
          <div className="text-gray-800">{dash(record.dobReadable || record.dob)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Email status</div>
          <div className="text-gray-800">
            <VerifiedBadge ok={!!record.email_verified_at} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================== Edit form (matches POST schema) =========================== */
const MemberForm = ({ record = {}, onSubmit, submitting }) => {
  const [first_name, setFirstName] = useState(record.first_name ?? "");
  const [last_name, setLastName] = useState(record.last_name ?? "");
  const [surname, setSurname] = useState(record.surname ?? "");
  const [middle_name, setMiddleName] = useState(record.middle_name ?? "");
  const [email, setEmail] = useState(record.email ?? "");
  const [phone_number, setPhoneNumber] = useState(record.phone_number ?? "");
  const [phone_number1, setPhoneNumber1] = useState(record.phone_number1 ?? "");
  const [phone_number2, setPhoneNumber2] = useState(record.phone_number2 ?? "");
  const [dob, setDob] = useState(record.dob ?? "");
  const [gender, setGender] = useState(record.gender ?? "");
  const [role, setRole] = useState(record.role ?? "USER");
  const [marital_status, setMaritalStatus] = useState(record.marital_status ?? "");

  useEffect(() => {
    setFirstName(record.first_name ?? "");
    setLastName(record.last_name ?? "");
    setSurname(record.surname ?? "");
    setMiddleName(record.middle_name ?? "");
    setEmail(record.email ?? "");
    setPhoneNumber(record.phone_number ?? "");
    setPhoneNumber1(record.phone_number1 ?? "");
    setPhoneNumber2(record.phone_number2 ?? "");
    setDob(record.dob ?? "");
    setGender(record.gender ?? "");
    setRole(record.role ?? "USER");
    setMaritalStatus(record.marital_status ?? "");
  }, [record]);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          first_name,
          last_name,
          surname,
          middle_name,
          email,
          phone_number,
          phone_number1,
          phone_number2,
          dob,
          gender,
          role,
          marital_status,
        });
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">First name</label>
          <input className={inputBase} value={first_name} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Last name</label>
          <input className={inputBase} value={last_name} onChange={(e) => setLastName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Surname</label>
          <input className={inputBase} value={surname} onChange={(e) => setSurname(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Middle name</label>
          <input className={inputBase} value={middle_name} onChange={(e) => setMiddleName(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" className={inputBase} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Primary phone</label>
          <input className={inputBase} value={phone_number} onChange={(e) => setPhoneNumber(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Alt phone 1</label>
          <input className={inputBase} value={phone_number1} onChange={(e) => setPhoneNumber1(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Alt phone 2</label>
          <input className={inputBase} value={phone_number2} onChange={(e) => setPhoneNumber2(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">DOB</label>
          <input type="date" className={inputBase} value={dob || ""} onChange={(e) => setDob(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Gender</label>
          <select className={selectBase} value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Select…</option>
            <option value="male">male</option>
            <option value="female">female</option>
            <option value="other">other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select className={selectBase} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="USER">USER</option>
            <option value="CREATOR">CREATOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Marital status</label>
          <select className={selectBase} value={marital_status} onChange={(e) => setMaritalStatus(e.target.value)}>
            <option value="">Select…</option>
            <option value="single">single</option>
            <option value="married">married</option>
            <option value="divorced">divorced</option>
            <option value="widowed">widowed</option>
          </select>
        </div>
      </div>

      <button type="submit" id="__member_submit_btn__" className="hidden" disabled={submitting} />
    </form>
  );
};

/* =========================== Table =========================== */
const MembersTable = ({
  rows,
  loading,
  onView,
  onEdit,
  onToggle,
  togglingId,
  footerLeft,
  footerRight,
}) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const hasRows = safeRows.length > 0;

  return (
    <div className="relative rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">Email</th>
              <th className="text-left px-4 py-3 font-semibold">Phone</th>
              <th className="text-left px-4 py-3 font-semibold">DOB</th>
              <th className="text-left px-4 py-3 font-semibold">Role</th>
              <th className="text-left px-4 py-3 font-semibold">Verified</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Created</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!hasRows ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner className="!text-gray-500" /> Loading…
                    </span>
                  ) : (
                    "No members yet."
                  )}
                </td>
              </tr>
            ) : (
              safeRows.map((row) => {
                const active =
                  toNormStatus(row?.status ?? row?.active ?? row?.creator?.active ?? (row?.email_verified_at ? "active" : "")) ===
                  "active";
                const id = row.id || row.member_id;
                return (
                  <tr key={id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      {dash(row.name || `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim())}
                    </td>
                    <td className="px-4 py-3">{dash(row.email)}</td>
                    <td className="px-4 py-3">{dash(row.phone || row.phone_number)}</td>
                    <td className="px-4 py-3">{dash(row.dobReadable || row.dob)}</td>
                    <td className="px-4 py-3">{dash(row.role)}</td>
                    <td className="px-4 py-3">
                      <VerifiedBadge ok={!!row.email_verified_at} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <StatusPill value={active ? "active" : "inactive"} />
                        <Toggle checked={active} onChange={() => onToggle(row)} />
                        {togglingId === id && (
                          <span className="inline-flex items-center text-xs text-gray-500">
                            <Spinner className="!text-gray-500 mr-1" /> updating…
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{dash(row.createdAtReadable || row.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-3 justify-end">
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
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Overlay only if we already have rows */}
      {loading && hasRows && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="inline-flex items-center gap-2 text-sm text-gray-700">
            <Spinner className="!text-gray-700" /> Loading…
          </span>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-4 py-3 bg-white border-t border-gray-200">
        <div className="text-sm text-gray-600">{footerLeft}</div>
        <div>{footerRight}</div>
      </div>
    </div>
  );
};

/* =========================== Page =========================== */
const Members = () => {
  const navigate = useNavigate();
  useAuthGuard(navigate);

  const toast = useToastAlert();

  const {
    members,
    pagination,
    counts,          // global, only refreshed on unfiltered fetch
    fetchMembers,
    getMember,
    updateMember,
    toggleMemberStatus,
    loading,
  } = useMembersStore();

  // Filters & paging (server-driven)
  const [q, setQ] = useState("");
  const [role, setRole] = useState(""); // '', 'CREATOR', 'ADMIN', etc.
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [togglingId, setTogglingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("view"); // 'view' | 'edit'
  const [modalRecord, setModalRecord] = useState(null);

  // Initial unfiltered fetch to seed table + GLOBAL counts
  useEffect(() => {
    fetchMembers?.({ page: 1, per_page: perPage, q: "", role: "" }); // this one updates counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced fetch on q/role/page (does NOT update counts in store)
  useEffect(() => {
    const t = setTimeout(() => {
      fetchMembers?.({ page, per_page: perPage, q, role });
    }, 300);
    return () => clearTimeout(t);
  }, [page, q, role, fetchMembers]);

  // Enter = immediate fetch
  const onSearchEnter = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        setPage(1);
        fetchMembers?.({ page: 1, per_page: perPage, q, role });
      }
    },
    [q, role, fetchMembers]
  );

  const allRows = useMemo(() => (Array.isArray(members) ? members : []), [members]);

  // STABLE summary metrics from counts (fall back gently if missing)
  const totalUsers =
    counts?.total_users ?? counts?.total ?? counts?.users ?? pagination?.total ?? 0;
  const totalCreators =
    counts?.total_creators ?? counts?.creators ?? counts?.by_role?.CREATOR ?? 0;
  const verifiedEmails =
    counts?.verified_emails ?? counts?.verified ?? 0;
  const activeUsers =
    counts?.active_users ?? counts?.active ?? 0;

  // Modal open instantly; then hydrate with GET /admin/user/:id and merge
  const merge = (a, b) => ({ ...(a || {}), ...(b || {}) });

  const openView = async (record) => {
    setModalMode("view");
    setModalRecord(record);
    setModalOpen(true);
    try {
      const full = await getMember?.(record.id);
      setModalRecord((prev) => merge(prev, full));
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Could not load member." });
    }
  };

  const openEdit = async (record) => {
    setModalMode("edit");
    setModalRecord(record);
    setModalOpen(true);
    try {
      const full = await getMember?.(record.id);
      setModalRecord((prev) => merge(prev, full));
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Could not load member." });
    }
  };

  const closeModal = () => setModalOpen(false);

  const handleToggle = async (row) => {
    try {
      const id = row.id || row.member_id;
      setTogglingId(id);
      await toggleMemberStatus?.(id);
      toast.add({ type: "success", title: "Status updated" });
      await fetchMembers?.({ page, per_page: perPage, q, role });
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Status change failed." });
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  };

  const handleUpdate = async (payload) => {
    try {
      if (!modalRecord?.id) return;
      setSubmitting(true);
      await updateMember?.(modalRecord.id, payload); // POST /admin/user/:id
      toast.add({ type: "success", title: "Updated", message: "Member updated successfully." });
      await fetchMembers?.({ page, per_page: perPage, q, role });
      closeModal();
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Update failed." });
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Pagination math (API-first)
  const per = pagination?.per_page || perPage;
  const totalPages = Math.max(1, Math.ceil((pagination?.total || allRows.length || 0) / per));
  const startIdx = (page - 1) * per + 1;
  const endIdx = Math.min(page * per, pagination?.total || allRows.length || 0);

  // Server already filtered; keep as-is
  const filteredRows = allRows;
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

            {/* Summary cards (stable via counts) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="text-xs text-gray-600 mb-2">Total Users</div>
                <div className="text-2xl font-semibold">{Number(totalUsers || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="text-xs text-gray-600 mb-2">Total Creators</div>
                <div className="text-2xl font-semibold">{Number(totalCreators || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="text-xs text-gray-600 mb-2">Verified Emails</div>
                <div className="text-2xl font-semibold">{Number(verifiedEmails || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="text-xs text-gray-600 mb-2">Active Users</div>
                <div className="text-2xl font-semibold">{Number(activeUsers || 0).toLocaleString()}</div>
              </div>
            </div>

            {/* Filters bar: Role + Search */}
            <div className="mb-3 bg-white rounded-xl border border-gray-200 px-4 pt-2 pb-3 shadow-sm">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-700">Role</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      setPage(1);
                      setRole(e.target.value);
                    }}
                    className="h-9 pr-9 pl-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] w-52 text-sm placeholder:text-xs leading-[1.25rem]"
                    aria-label="Filter by role"
                  >
                    <option value="">All roles</option>
                    <option value="CREATOR">CREATOR</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="USER">USER</option>
                  </select>
                </div>

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
                      placeholder="Search users…"
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

            {/* Table — always render */}
            <MembersTable
              rows={pageRows}
              loading={loading}
              onView={openView}
              onEdit={openEdit}
              onToggle={handleToggle}
              togglingId={togglingId}
              footerLeft={
                (pagination?.total || allRows.length)
                  ? `Showing ${Math.max(1, startIdx)}–${Math.max(startIdx, endIdx)} of ${(pagination?.total || allRows.length).toLocaleString()} record${(pagination?.total || allRows.length) > 1 ? "s" : ""}`
                  : q
                  ? `No results for “${q}”`
                  : "No records"
              }
              footerRight={
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
              }
            />
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
