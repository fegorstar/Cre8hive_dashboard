// src/pages/dashboard/Reviews.jsx
// UI matches the screenshot:
// - Top "Reviews" header
// - Primary tabs: Assets / Services / Songs (underline style, like other pages)
// - Secondary tabs: Pending / Published / Rejected (BOXED pills w/ full border; active = BRAND_RGB bg + white text)
// - Search box on the right of the tabs row (icon on the right)
// - Table columns: Creator Name, Asset name, Email address, Price, New, Date submitted
// - Uses shared Modal, ToastAlert, useClickOutside, useAuthGuard, Spinner/CenterLoader

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { FiSearch, FiMoreVertical } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import Modal from "../../components/common/Modal";
import { ToastAlert, useToastAlert } from "../../components/common/ToastAlert";
import useClickOutside from "../../lib/useClickOutside";
import useAuthGuard from "../../lib/useAuthGuard";
import { Spinner, CenterLoader } from "../../components/common/Spinner";

import useReviewsStore from "../../store/ReviewsStore";

const BRAND_RGB = "rgb(77, 52, 144)";

/* ---------------- Primary Tabs (underline style) ---------------- */
const Tabs = ({ value, onChange, tabs }) => (
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

/* ---------------- Secondary Tabs (BOXED pills) ---------------- */
const BoxedTabs = ({ value, onChange, tabs }) => (
  <div className="flex items-center gap-2">
    {tabs.map((t) => {
      const active = value === t.key;
      return (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          aria-pressed={active}
          className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1`}
          style={{
            color: active ? "#ffffff" : "#374151",
            borderColor: active ? BRAND_RGB : "#E5E7EB",
            backgroundColor: active ? BRAND_RGB : "#ffffff",
          }}
        >
          {t.label}
        </button>
      );
    })}
  </div>
);

/* ---------------- 3-dots menu ---------------- */
const ThreeDotsMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  useClickOutside(boxRef, () => setOpen(false));
  const safeItems = Array.isArray(items) ? items : [];
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

/* ---------------- Table ---------------- */
const ReviewsTable = ({ rows, footerLeft, footerRight }) => {
  const safe = Array.isArray(rows) ? rows : [];
  const dash = (v) => (v === undefined || v === null || v === "" ? "—" : v);
  const yesNo = (v) =>
    String(v ?? "").toLowerCase() === "yes" || v === true ? "Yes" : "No";

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Creator Name</th>
              <th className="text-left px-4 py-3 font-semibold">Asset name</th>
              <th className="text-left px-4 py-3 font-semibold">Email address</th>
              <th className="text-left px-4 py-3 font-semibold">Price</th>
              <th className="text-left px-4 py-3 font-semibold">New</th>
              <th className="text-left px-4 py-3 font-semibold">Date submitted</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {safe.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{dash(r.creatorName)}</td>
                <td className="px-4 py-3">{dash(r.assetName)}</td>
                <td className="px-4 py-3">{dash(r.email)}</td>
                <td className="px-4 py-3">{dash(r.priceReadable)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                      yesNo(r.isNew) === "Yes"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    {yesNo(r.isNew)}
                  </span>
                </td>
                <td className="px-4 py-3">{dash(r.submittedAtReadable)}</td>
                <td className="px-4 py-3 text-right">
                  <ThreeDotsMenu
                    items={[
                      { label: "View", onClick: r.onView },
                      { label: "Approve", onClick: r.onApprove },
                      { label: "Reject", onClick: r.onReject },
                    ]}
                  />
                </td>
              </tr>
            ))}

            {safe.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  No records
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

/* ---------------- Page ---------------- */
const Reviews = () => {
  const navigate = useNavigate();
  useAuthGuard(navigate);

  const toast = useToastAlert();
  const {
    reviews,
    meta,
    fetchReviews,
    getReview,
    updateReview,
    loading,
  } = useReviewsStore();

  // Primary scope tabs & status tabs
  const [scope, setScope] = useState("assets"); // assets | services | songs
  const [status, setStatus] = useState("pending"); // pending | published | rejected

  // Search & paging
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  // Modal state (simple viewer)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRecord, setModalRecord] = useState(null);
  const closeModal = () => setModalOpen(false);

  // Initial + reactive fetch
  useEffect(() => {
    fetchReviews({ scope, status, page, q });
  }, [scope, status, page, q, fetchReviews]);

  // Enter key triggers immediate fetch + reset to page 1
  const onSearchEnter = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        setPage(1);
        fetchReviews({ scope, status, page: 1, q });
      }
    },
    [scope, status, q, fetchReviews]
  );

  // List rows with inline handlers
  const tableRows = useMemo(
    () =>
      (Array.isArray(reviews) ? reviews : []).map((r) => ({
        ...r,
        onView: async () => {
          try {
            const full = await getReview(r.id);
            setModalRecord(full || r);
            setModalOpen(true);
          } catch (e) {
            toast.add({ type: "error", title: "Failed", message: e?.message || "Could not open record." });
          }
        },
        onApprove: async () => {
          try {
            await updateReview(r.id, { status: "published" });
            toast.add({ type: "success", title: "Approved" });
          } catch (e) {
            toast.add({ type: "error", title: "Failed", message: e?.message || "Approve failed." });
          }
        },
        onReject: async () => {
          try {
            await updateReview(r.id, { status: "rejected" });
            toast.add({ type: "success", title: "Rejected" });
          } catch (e) {
            toast.add({ type: "error", title: "Failed", message: e?.message || "Reject failed." });
          }
        },
      })),
    [reviews, getReview, updateReview, toast]
  );

  // Footer text & pagination controls
  const total = meta?.total || tableRows.length || 0;
  const totalPages = Math.max(1, Number(meta?.last_page || 1));
  const startIdx =
    total === 0
      ? 0
      : (Number(meta?.current_page || page) - 1) * Number(meta?.per_page || 10) + 1;
  const endIdx =
    total === 0 ? 0 : Math.min(startIdx + Number(meta?.per_page || 10) - 1, total);

  const footerLeft =
    total === 0
      ? q
        ? `No results for “${q}”`
        : "No records"
      : `Showing ${startIdx}–${endIdx} of ${total} record${total > 1 ? "s" : ""}`;

  const footerRight = (
    <div className="flex items-center gap-2">
      <button
        disabled={(meta?.current_page || page) <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className={`px-3 py-1.5 rounded-lg border ${
          (meta?.current_page || page) <= 1
            ? "text-gray-400 border-gray-200"
            : "border-gray-300 hover:bg-gray-50"
        }`}
      >
        Prev
      </button>
      <span className="text-sm text-gray-600">
        Page {meta?.current_page || page} / {totalPages}
      </span>
      <button
        disabled={(meta?.current_page || page) >= totalPages}
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        className={`px-3 py-1.5 rounded-lg border ${
          (meta?.current_page || page) >= totalPages
            ? "text-gray-400 border-gray-200"
            : "border-gray-300 hover:bg-gray-50"
        }`}
      >
        Next
      </button>
    </div>
  );

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
              <p className="inline-block px-6 text-base md:text-lg leading-5 font-semibold">
                Reviews
              </p>
            </div>

            {/* Primary tabs + search (same row) */}
            <div className="mb-3 bg-white rounded-xl border border-gray-200 px-4 pt-2 pb-3 shadow-sm">
              <div className="flex items-center justify-between">
                <Tabs
                  value={scope}
                  onChange={(key) => {
                    setScope(key);
                    setPage(1);
                  }}
                  tabs={[
                    { key: "assets", label: "Assets" },
                    { key: "services", label: "Services" },
                    { key: "songs", label: "Songs" },
                  ]}
                />

                {/* Search box (icon on the right) */}
                <div className="pl-4 py-2">
                  <div className="relative">
                    <input
                      value={q}
                      onChange={(e) => {
                        setPage(1);
                        setQ(e.target.value);
                      }}
                      onKeyDown={onSearchEnter}
                      className="h-9 pr-9 pl-3 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#4D3490] w-72 text-sm placeholder:text-xs leading-[1.25rem]"
                      placeholder="Search for asset, service, song"
                      aria-label="Search"
                    />
                    <FiSearch
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>

              {/* Secondary tabs (status) — BOXED pills */}
              <div className="mt-2">
                <BoxedTabs
                  value={status}
                  onChange={(key) => {
                    setStatus(key);
                    setPage(1);
                  }}
                  tabs={[
                    { key: "pending", label: "Pending" },
                    { key: "published", label: "Published" },
                    { key: "rejected", label: "Rejected" },
                  ]}
                />
              </div>
            </div>

            {/* Table / Loader */}
            {loading ? (
              <CenterLoader />
            ) : (
              <ReviewsTable
                rows={tableRows}
                footerLeft={footerLeft}
                footerRight={footerRight}
              />
            )}
          </div>

          {/* Minimal read-only modal (optional richer layout later) */}
          <Modal
            open={modalOpen}
            title="Review Details"
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
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Creator:</span>{" "}
                {modalRecord?.creatorName || "—"}
              </div>
              <div>
                <span className="text-gray-500">Asset name:</span>{" "}
                {modalRecord?.assetName || "—"}
              </div>
              <div>
                <span className="text-gray-500">Email:</span>{" "}
                {modalRecord?.email || "—"}
              </div>
              <div>
                <span className="text-gray-500">Price:</span>{" "}
                {modalRecord?.priceReadable || "—"}
              </div>
              <div>
                <span className="text-gray-500">New:</span>{" "}
                {String(modalRecord?.isNew ? "Yes" : "No")}
              </div>
              <div>
                <span className="text-gray-500">Submitted:</span>{" "}
                {modalRecord?.submittedAtReadable || "—"}
              </div>
            </div>
          </Modal>

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Reviews;
