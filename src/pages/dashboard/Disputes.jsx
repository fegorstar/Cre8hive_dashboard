// src/pages/dashboard/Disputes.jsx
// Disputes list UI (Pending/Resolved tabs w/ underline active style, search, paging, action menu)
// Reuses your common building blocks: Modal, ConfirmDialog, ToastAlert, useClickOutside, useAuthGuard
// Uses shared Spinner/CenterLoader from components/common/Spinner

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiMoreVertical, FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { ToastAlert, useToastAlert } from "../../components/common/ToastAlert";
import useClickOutside from "../../lib/useClickOutside";
import useAuthGuard from "../../lib/useAuthGuard";

import useDisputesStore from "../../store/disputesStore";
import { CenterLoader } from "../../components/common/Spinner"; // shared loader

const BRAND_RGB = "rgb(77, 52, 144)";


/* ---------- Tabs (active = brand text + thick underline) ---------- */
const Tabs = ({ value, onChange }) => {
    const tabs = [
      { key: "pending", label: "Pending" },
      { key: "resolved", label: "Resolved" },
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
                className={`relative -mb-px px-4 py-2 text-sm font-semibold transition-colors 
                  ${active ? "border-b-4" : "border-b-2"} border-b`}
                style={{
                  color: active ? BRAND_RGB : "#374151",                // text color
                  borderBottomColor: active ? BRAND_RGB : "#D1D5DB",   // gray-300 for inactive
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

/* ---------- details list (view modal) ---------- */
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

/* ---------- Table shell ---------- */
const TableShell = ({ children, footerLeft, footerRight }) => (
  <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
    <div className="overflow-auto">{children}</div>
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-t border-gray-200">
      <div className="text-sm text-gray-600">{footerLeft}</div>
      <div>{footerRight}</div>
    </div>
  </div>
);

const Disputes = () => {
  const navigate = useNavigate();
  useAuthGuard(navigate);

  const toast = useToastAlert();

  // store
  const disputes = useDisputesStore((s) => s.disputes);
  const meta = useDisputesStore((s) => s.meta);
  const loading = useDisputesStore((s) => s.loading);
  const fetchDisputes = useDisputesStore((s) => s.fetchDisputes);
  const getDispute = useDisputesStore((s) => s.getDispute);
  const updateDispute = useDisputesStore((s) => s.updateDispute);

  // ui state
  const [tab, setTab] = useState("pending"); // 'pending' | 'resolved'
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [viewOpen, setViewOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null); // { id, action: 'resolve' | 'reopen' }

  // initial + when tab/page changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchDisputes({ status: tab, page });
      } catch (e) {
        if (!cancelled) {
          toast.add({ type: "error", title: "Failed", message: e?.message || "Could not load disputes." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, page, fetchDisputes]); // eslint-disable-line

  // filter (client-side by provider/client name)
  const filteredRows = useMemo(() => {
    if (!search.trim()) return disputes;
    const q = search.trim().toLowerCase();
    return disputes.filter(
      (d) =>
        d.providerName?.toLowerCase().includes(q) ||
        d.clientName?.toLowerCase().includes(q)
    );
  }, [disputes, search]);

  const footerLeft =
    meta.total === 0
      ? "No records"
      : `Showing page ${meta.current_page} of ${meta.last_page} • Total ${meta.total} record${meta.total > 1 ? "s" : ""}`;

  const footerRight = (
    <div className="flex items-center gap-2">
      <button
        disabled={meta.current_page <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className={`px-3 py-1.5 rounded-lg border ${
          meta.current_page <= 1 ? "text-gray-400 border-gray-200" : "border-gray-300 hover:bg-gray-50"
        }`}
      >
        Prev
      </button>
      <span className="text-sm text-gray-600">
        Page {meta.current_page} / {meta.last_page}
      </span>
      <button
        disabled={meta.current_page >= meta.last_page}
        onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
        className={`px-3 py-1.5 rounded-lg border ${
          meta.current_page >= meta.last_page ? "text-gray-400 border-gray-200" : "border-gray-300 hover:bg-gray-50"
        }`}
      >
        Next
      </button>
    </div>
  );

  // actions
  const openView = async (row) => {
    try {
      const full = await getDispute(row.id);
      setViewRecord(full);
      setViewOpen(true);
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Could not open dispute." });
    }
  };

  const askResolve = (row) => {
    setConfirmPayload({ id: row.id, action: "resolve" });
    setConfirmOpen(true);
  };

  const askReopen = (row) => {
    setConfirmPayload({ id: row.id, action: "reopen" });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmPayload) return;
    setConfirmBusy(true);
    try {
      const payload =
        confirmPayload.action === "resolve"
          ? { status: "resolved" }
          : { status: "pending" };

      await updateDispute(confirmPayload.id, payload);

      toast.add({
        type: "success",
        title: "Updated",
        message:
          confirmPayload.action === "resolve"
            ? "Dispute marked as resolved."
            : "Dispute reopened.",
      });
      setConfirmOpen(false);
      setConfirmPayload(null);
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Update failed." });
    } finally {
      setConfirmBusy(false);
    }
  };

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
              <p className="inline-block text-lg leading-5 font-semibold">Disputes</p>
            </div>

            {/* Tabs + Search */}
            <div className="mb-4 bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <Tabs
                  value={tab}
                  onChange={(key) => {
                    setTab(key);
                    setPage(1);
                  }}
                />

                {/* Search box — icon inside input, centered vertically, left-aligned */}
                <div className="relative w-72">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search for name"
                    autoComplete="off"
                    aria-label="Search for name"
                    className="
                      w-full
                      rounded-lg
                      border border-gray-300
                      bg-white
                      pl-9 pr-3 py-2
                      text-sm font-normal text-gray-700
                      placeholder:text-gray-400 placeholder:font-normal
                      outline-none focus:ring-2 focus:ring-[#4D3490] focus:border-[#4D3490]
                    "
                    style={{ fontFamily: "inherit" }}
                  />
                  <FiSearch
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <CenterLoader label="Loading…" tint={BRAND_RGB} />
            ) : (
              <div className="space-y-4">
                <TableShell footerLeft={footerLeft} footerRight={footerRight}>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Service</th>
                        <th className="text-left px-4 py-3 font-semibold">Provider</th>
                        <th className="text-left px-4 py-3 font-semibold">Client</th>
                        <th className="text-left px-4 py-3 font-semibold">Initiated by</th>
                        <th className="text-left px-4 py-3 font-semibold">Date initiated</th>
                        <th className="text-right px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => (
                        <tr key={row.id} className="border-t border-gray-100">
                          <td className="px-4 py-3">{row.serviceName}</td>
                          <td className="px-4 py-3">{row.providerName}</td>
                          <td className="px-4 py-3">{row.clientName}</td>
                          <td className="px-4 py-3">{row.initiatedBy}</td>
                          <td className="px-4 py-3">{row.createdAtReadable}</td>
                          <td className="px-4 py-3 text-right">
                            <ThreeDotsMenu
                              items={[
                                { label: "View", onClick: () => openView(row) },
                                ...(tab === "pending"
                                  ? [{ label: "Mark as resolved", onClick: () => askResolve(row) }]
                                  : [{ label: "Reopen", onClick: () => askReopen(row) }]),
                              ]}
                            />
                          </td>
                        </tr>
                      ))}
                      {filteredRows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                            No disputes found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </TableShell>
              </div>
            )}
          </div>

          {/* View Modal */}
          <Modal
            open={viewOpen}
            title="Dispute details"
            onClose={() => setViewOpen(false)}
            footer={
              <div className="flex justify-end">
                <button onClick={() => setViewOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300">
                  Close
                </button>
              </div>
            }
            size="lg"
          >
            {viewRecord ? (
              <DetailsList
                items={[
                  { label: "Service", value: viewRecord.serviceName },
                  { label: "Provider", value: viewRecord.providerName },
                  { label: "Client", value: viewRecord.clientName },
                  { label: "Initiated by", value: viewRecord.initiatedBy },
                  { label: "Status", value: viewRecord.status },
                  { label: "Date initiated", value: viewRecord.createdAtReadable },
                ]}
              />
            ) : (
              <CenterLoader label="Loading details…" tint={BRAND_RGB} />
            )}
          </Modal>

          {/* Confirm change status */}
          <ConfirmDialog
            open={confirmOpen}
            busy={confirmBusy}
            title={confirmPayload?.action === "resolve" ? "Resolve dispute" : "Reopen dispute"}
            message={
              confirmPayload?.action === "resolve"
                ? "Are you sure you want to mark this dispute as resolved?"
                : "Are you sure you want to reopen this dispute?"
            }
            confirmText={confirmPayload?.action === "resolve" ? "Mark as resolved" : "Reopen"}
            onConfirm={handleConfirm}
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

export default Disputes;
