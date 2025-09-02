// src/pages/dashboard/Investments.jsx
//
// WHAT CHANGED
// ------------
// • Search icon now uses `absolute inset-y-0 left-3 flex items-center` so it’s
//   perfectly centered vertically in all browsers.
// • Search input remains short, left-aligned, scoped visually per tab.
// • Rest of the page: create via drawer, view/edit via row menu, delete with confirm.
//
// DEPENDENCIES
// ------------
// Sidebar, Navbar, Footer, ToastAlert, ConfirmDialog, Spinner
// Store: useInvestmentsStore
// Guard: useAuthGuard

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMoreVertical, FiPlus, FiSearch, FiTrash2, FiEdit2, FiExternalLink } from "react-icons/fi";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { ToastAlert, useToastAlert } from "../../components/common/ToastAlert";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { Spinner } from "../../components/common/Spinner";
import useInvestmentsStore from "../../store/investmentsStore";
import useAuthGuard from "../../lib/useAuthGuard";

const BRAND = "rgb(77, 52, 144)";
// short fixed width like your “All categories” control
const SEARCH_WIDTH = "w-[240px] sm:w-[260px]";

/* ----------------------------- tiny helpers ---------------------------- */
const asNGN = (v) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 })
    .format(Number(v) || 0);
const dash = (v) => (v === undefined || v === null || v === "" ? "—" : v);
const badgeCls = (s) =>
  String(s || "").toUpperCase() === "CLOSED"
    ? "bg-gray-100 text-gray-700 border border-gray-200"
    : "bg-green-50 text-green-700 border border-green-200";
const toUiStatus = (s) => (String(s || "").toUpperCase() === "CLOSED" ? "CLOSED" : "ACTIVE");

/* ---------------------------- Drawer (create) --------------------------- */
const Drawer = ({ open, title, onClose, children, footer }) => (
  <>
    <div
      className={`fixed inset-0 bg-black/30 transition-opacity z-[60] ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      onClick={onClose}
    />
    <aside
      className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[61] transform transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between px-4 h-14 border-b">
        <h3 className="font-semibold">{title}</h3>
        <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="p-4 overflow-auto h-[calc(100%-3.5rem-64px)]">{children}</div>
      <div className="px-4 py-3 border-t bg-white">{footer}</div>
    </aside>
  </>
);

/* ------------------------------ Inputs ------------------------------ */
const Text = (props) => (
  <input
    {...props}
    className={`h-10 px-3 rounded-lg border border-gray-300 outline-none focus:ring-2 text-sm w-full ${
      props.className || ""
    }`}
    style={{ "--tw-ring-color": BRAND }}
  />
);
const TextArea = (props) => (
  <textarea
    {...props}
    className={`min-h-[92px] px-3 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 text-sm w-full ${
      props.className || ""
    }`}
    style={{ "--tw-ring-color": BRAND }}
  />
);
const Select = (props) => (
  <select
    {...props}
    className={`h-10 px-3 rounded-lg border border-gray-300 outline-none focus:ring-2 text-sm w-full ${
      props.className || ""
    }`}
    style={{ "--tw-ring-color": BRAND }}
  />
);

/* ---------------------------- 3-dots menu ----------------------------- */
const Menu = ({ items = [] }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button className="p-2 rounded hover:bg-gray-100" onClick={() => setOpen((v) => !v)}>
        <FiMoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 origin-top-right rounded-md border border-gray-200 bg-white shadow-lg z-20">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => {
                setOpen(false);
                it.onClick?.();
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* --------------------------------- Page -------------------------------- */
const Investments = () => {
  const navigate = useNavigate();
  useAuthGuard(navigate);

  const toast = useToastAlert();

  // store
  const vests = useInvestmentsStore((s) => s.vests);
  const meta = useInvestmentsStore((s) => s.meta);
  const summary = useInvestmentsStore((s) => s.summary);
  const loading = useInvestmentsStore((s) => s.loading);
  const fetchVests = useInvestmentsStore((s) => s.fetchVests);
  const createVest = useInvestmentsStore((s) => s.createVest);
  const deleteVest = useInvestmentsStore((s) => s.deleteVest);

  // ui state
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("ACTIVE"); // "ACTIVE" | "CLOSED"
  const [q, setQ] = useState("");

  // drawer (create only)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // initial + pagination changes
  useEffect(() => {
    (async () => {
      try {
        await fetchVests(page);
      } catch (e) {
        toast.add({ type: "error", title: "Failed", message: e?.message || "Could not load investments." });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // derived rows (tab + search)
  const rows = useMemo(() => {
    let list = Array.isArray(vests) ? vests : [];
    list = list.filter((r) => toUiStatus(r.status) === tab);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((r) =>
        [r.investment_name, r.beneficiary_name, r.vest_for, r.description, r.risk_assessment]
          .filter(Boolean)
          .map(String)
          .some((v) => v.toLowerCase().includes(s))
      );
    }
    return list;
  }, [vests, tab, q]);

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

  /* ---------------------------- create form ---------------------------- */
  const [form, setForm] = useState({
    vest_for: "ARTIST",
    beneficiary_name: "",
    investment_name: "",
    minimum_amount: "",
    roi: "",
    duration: "",
    description: "",
    images: [],
    risk_assessment: "",
    news: [""],
  });
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setForm({
      vest_for: "ARTIST",
      beneficiary_name: "",
      investment_name: "",
      minimum_amount: "",
      roi: "",
      duration: "",
      description: "",
      images: [],
      risk_assessment: "",
      news: [""],
    });
    setDrawerOpen(true);
  };

  const submitCreate = async () => {
    try {
      setSaving(true);
      const payload = {
        vest_for: String(form.vest_for || "").toUpperCase(),
        beneficiary_name: form.beneficiary_name?.trim(),
        investment_name: form.investment_name?.trim(),
        minimum_amount: form.minimum_amount ? Number(form.minimum_amount) : undefined,
        roi: form.roi ? Number(form.roi) : undefined,
        duration: form.duration ? String(form.duration) : undefined,
        description: form.description?.trim(),
        images: form.images,
        risk_assessment: form.risk_assessment?.trim(),
        news: (form.news || []).filter((n) => String(n || "").trim()),
      };
      await createVest(payload);
      toast.add({ type: "success", title: "Created", message: "Investment created Successfully" });
      setDrawerOpen(false);
      await fetchVests(page);
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Could not save investment." });
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (row) => {
    setToDelete(row);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setConfirmBusy(true);
    try {
      await deleteVest(toDelete.id);
      toast.add({ type: "success", title: "Deleted", message: "Investment removed Successfully." });
      setConfirmOpen(false);
      setToDelete(null);
      await fetchVests(page);
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Delete failed." });
    } finally {
      setConfirmBusy(false);
    }
  };

  const hasRows = rows.length > 0;

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
            <div className="flex items-center mb-4 justify-between -mx-6 border-b border-gray-200 pb-3 bg-white px-6">
              <p className="inline-block text-lg leading-5 font-semibold">Investments</p>
            </div>

            {/* Summary KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="text-xs text-gray-600 mb-2">Investment Value</div>
                <div className="text-2xl font-semibold">{asNGN(summary.totalMinValue)}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="text-xs text-gray-600 mb-2">Curated Investment</div>
                <div className="text-2xl font-semibold">{summary.curatedCount}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="text-xs text-gray-600 mb-2">Number of Investors</div>
                <div className="text-2xl font-semibold">{summary.investorCount}</div>
              </div>
            </div>

            {/* Tabs + Create */}
            <div className="mb-3 bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                {/* Tabs */}
                <div className="flex gap-2">
                  {["ACTIVE", "CLOSED"].map((key) => {
                    const active = tab === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={`relative -mb-px px-4 py-2 text-sm font-semibold transition-colors ${
                          active ? "border-b-4" : "border-b-2"
                        } border-b rounded-t`}
                        style={{
                          color: active ? BRAND : "#374151",
                          borderBottomColor: active ? BRAND : "#D1D5DB",
                          backgroundColor: "transparent",
                        }}
                      >
                        {key === "ACTIVE" ? "Active investments" : "Closed investments"}
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1" />

                {/* Create button */}
                <button
                  onClick={openCreate}
                  className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white shadow-sm"
                  style={{ backgroundColor: BRAND }}
                >
                  <FiPlus className="w-4 h-4" /> Create New Investment
                </button>
              </div>
            </div>

            {/* Compact search (left aligned, icon vertically centered) */}
            <div className="mb-3">
              <div className={`relative ${SEARCH_WIDTH}`}>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`Search within ${tab === "ACTIVE" ? "Active" : "Closed"} investments…`}
                  className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm font-normal text-gray-700 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#4D3490] focus:border-[#4D3490]"
                />
                {/* Centered icon */}
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <FiSearch className="w-4 h-4 text-gray-400" />
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Investment</th>
                      <th className="text-left px-4 py-3 font-semibold">Beneficiary</th>
                      <th className="text-left px-4 py-3 font-semibold">For</th>
                      <th className="text-left px-4 py-3 font-semibold">Min amount</th>
                      <th className="text-left px-4 py-3 font-semibold">ROI (p.a)</th>
                      <th className="text-left px-4 py-3 font-semibold">Duration</th>
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
                            "No investments found."
                          )}
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.id} className="border-t border-gray-100">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {Array.isArray(row.images) && row.images[0] ? (
                                <img src={row.images[0]} alt="" className="w-10 h-10 rounded object-cover border" />
                              ) : (
                                <div className="w-10 h-10 rounded border bg-gray-50" />
                              )}
                              <span className="font-medium">{dash(row.investment_name)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">{dash(row.beneficiary_name)}</td>
                          <td className="px-4 py-3">{dash(row.vest_for)}</td>
                          <td className="px-4 py-3">{asNGN(row.minimum_amount)}</td>
                          <td className="px-4 py-3">{dash(row.roi)}%</td>
                          <td className="px-4 py-3">{dash(row.duration)} months</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 text-[11px] rounded-full ${badgeCls(row.status)}`}>
                              {String(row.status || "").toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3">{dash(row.createdAtReadable)}</td>
                          <td className="px-4 py-3 text-right">
                            <Menu
                              items={[
                                {
                                  label: (
                                    <span className="inline-flex items-center gap-2">
                                      <FiExternalLink /> View
                                    </span>
                                  ),
                                  onClick: () => navigate(`/investments/${row.id}`),
                                },
                                {
                                  label: (
                                    <span className="inline-flex items-center gap-2">
                                      <FiEdit2 /> Edit
                                    </span>
                                  ),
                                  onClick: () => navigate(`/investments/${row.id}?edit=1`),
                                },
                                {
                                  label: (
                                    <span className="inline-flex items-center gap-2 text-red-600">
                                      <FiTrash2 /> Delete
                                    </span>
                                  ),
                                  onClick: () => askDelete(row),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* overlay only when there are rows and loading */}
              {loading && hasRows && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <Spinner className="!text-gray-700" /> Loading…
                  </span>
                </div>
              )}

              {/* Footer */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  {meta.total === 0
                    ? "No records"
                    : `Showing page ${meta.current_page} of ${meta.last_page} • Total ${meta.total} record${
                        meta.total > 1 ? "s" : ""
                      }`}
                </div>
                {footerRight}
              </div>
            </div>
          </div>

          {/* Create Drawer */}
          <Drawer
            open={drawerOpen}
            title="Create New Investment"
            onClose={() => {
              if (saving) return;
              setDrawerOpen(false);
            }}
            footer={
              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm"
                  onClick={() => {
                    if (saving) return;
                    setDrawerOpen(false);
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white"
                  style={{ backgroundColor: BRAND }}
                  onClick={submitCreate}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Spinner className="!text-white" /> Saving…
                    </>
                  ) : (
                    "Create investment"
                  )}
                </button>
              </div>
            }
          >
            {/* form (drawer content) */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="text-xs text-gray-600 mb-1">Vest for</div>
                <Select value={form.vest_for} onChange={(e) => setF("vest_for", e.target.value)}>
                  <option value="ARTIST">Artist</option>
                  <option value="PROMOTER">Promoter</option>
                </Select>
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-1">Beneficiary name</div>
                <Text value={form.beneficiary_name} onChange={(e) => setF("beneficiary_name", e.target.value)} />
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-1">Investment name</div>
                <Text value={form.investment_name} onChange={(e) => setF("investment_name", e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Minimum amount (₦)</div>
                  <Text type="number" inputMode="decimal" value={form.minimum_amount} onChange={(e) => setF("minimum_amount", e.target.value)} />
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">ROI (p.a) %</div>
                  <Text type="number" inputMode="decimal" step="0.01" value={form.roi} onChange={(e) => setF("roi", e.target.value)} />
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-1">Duration (months)</div>
                <Text type="number" inputMode="numeric" value={form.duration} onChange={(e) => setF("duration", e.target.value)} />
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-1">About investment</div>
                <TextArea value={form.description} onChange={(e) => setF("description", e.target.value)} />
              </div>

              {/* Images: URLs OR file uploads */}
              <div className="space-y-2">
                <div className="text-xs text-gray-600">Images</div>

                {/* URL inputs */}
                {Array.isArray(form.images) &&
                  form.images
                    .filter((x) => typeof x === "string")
                    .map((url, idx) => (
                      <div key={`img-url-${idx}`} className="flex gap-2">
                        <Text
                          placeholder="https://…"
                          value={url}
                          onChange={(e) =>
                            setF(
                              "images",
                              form.images.map((v, i) => (i === idx ? e.target.value : v))
                            )
                          }
                        />
                        <button
                          className="px-3 rounded border hover:bg-gray-50"
                          onClick={() => setF("images", form.images.filter((_, i) => i !== idx))}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    ))}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm"
                    onClick={() => setF("images", [...(form.images || []), ""])}
                  >
                    + Add image URL
                  </button>

                  <label className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm cursor-pointer">
                    Upload images
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setF("images", [...(form.images || []), ...files]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                {/* Preview of files */}
                {Array.isArray(form.images) &&
                  form.images.some((x) => x && typeof x !== "string") && (
                    <div className="flex flex-wrap gap-2">
                      {form.images
                        .filter((x) => x && typeof x !== "string")
                        .map((file, i) => (
                          <div key={`file-${i}`} className="text-xs bg-gray-50 border rounded px-2 py-1">
                            {(file && file.name) || "Image file"}
                          </div>
                        ))}
                    </div>
                  )}
              </div>

              {/* Risk & News */}
              <div>
                <div className="text-xs text-gray-600 mb-1">Risk assessment</div>
                <TextArea value={form.risk_assessment} onChange={(e) => setF("risk_assessment", e.target.value)} />
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-600">News Links</div>
                {(form.news || [""]).map((n, idx) => (
                  <div key={`news-${idx}`} className="flex gap-2">
                    <Text
                      placeholder="https://news-site.com/article"
                      value={n}
                      onChange={(e) => setF("news", form.news.map((v, i) => (i === idx ? e.target.value : v)))}
                    />
                    <button className="px-3 rounded border hover:bg-gray-50" onClick={() => setF("news", form.news.filter((_, i) => i !== idx))} type="button">
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm" onClick={() => setF("news", [...(form.news || []), ""])}>
                  + Add news link
                </button>
              </div>
            </div>
          </Drawer>

          {/* Delete confirm */}
          <ConfirmDialog
            open={confirmOpen}
            busy={confirmBusy}
            title="Delete investment"
            message="This action cannot be undone. Are you sure you want to delete this investment?"
            confirmText="Delete"
            onConfirm={handleDelete}
            onCancel={() => {
              if (confirmBusy) return;
              setConfirmOpen(false);
              setToDelete(null);
            }}
          />

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default Investments;
