// src/pages/dashboard/InvestmentDetails.jsx
//
// CHANGES
// • Breadcrumb-style caption (“Investments / Active investment details”).
// • Top KPI cards: Invested value, Volume of active investment, Volume of paid out investment,
//   Total investors, Active investors, Paid out investors (auto-hide any with 0 if you prefer).
// • Compact meta table and a secondary row with Duration / ROI / Closing date.
// • Key Highlights list (if provided).
// • Small “View investors” button beside Delete (just a placeholder action for now).
// • Auto-open edit drawer when visiting with ?edit=1.
//
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiEdit2, FiTrash2, FiUsers } from "react-icons/fi";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { ToastAlert, useToastAlert } from "../../components/common/ToastAlert";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { Spinner } from "../../components/common/Spinner";
import useInvestmentsStore from "../../store/investmentsStore";
import useAuthGuard from "../../lib/useAuthGuard";

const BRAND = "rgb(77, 52, 144)";

const Text = (props) => (
  <input
    {...props}
    className={`h-10 px-3 rounded-lg border border-gray-300 outline-none focus:ring-2 text-sm w-full ${props.className || ""}`}
    style={{ "--tw-ring-color": BRAND }}
  />
);
const TextArea = (props) => (
  <textarea
    {...props}
    className={`min-h-[92px] px-3 py-2 rounded-lg border border-gray-300 outline-none focus:ring-2 text-sm w-full ${props.className || ""}`}
    style={{ "--tw-ring-color": BRAND }}
  />
);
const Select = (props) => (
  <select
    {...props}
    className={`h-10 px-3 rounded-lg border border-gray-300 outline-none focus:ring-2 text-sm w-full ${props.className || ""}`}
    style={{ "--tw-ring-color": BRAND }}
  />
);

const Drawer = ({ open, title, onClose, children, footer }) => (
  <>
    <div
      className={`fixed inset-0 bg-black/30 transition-opacity z-[60] ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      onClick={onClose}
    />
    <aside
      className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[61] transform transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
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

const asNGN = (v) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 })
    .format(Number(v) || 0);

const InvestmentDetails = () => {
  const navigate = useNavigate();
  useAuthGuard(navigate);

  const { id } = useParams();
  const [search] = useSearchParams();
  const toast = useToastAlert();

  const fetchVest = useInvestmentsStore((s) => s.fetchVest);
  const updateVest = useInvestmentsStore((s) => s.updateVest);
  const deleteVest = useInvestmentsStore((s) => s.deleteVest);

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);

  // edit drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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
    highlights: [""],
  });

  // delete confirm state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchVest(id);
        if (!cancelled) {
          setItem(data);
          setForm({
            vest_for: String(data.vest_for || "ARTIST").toUpperCase(),
            beneficiary_name: data.beneficiary_name || "",
            investment_name: data.investment_name || "",
            minimum_amount: data.minimum_amount || "",
            roi: data.roi ?? "",
            duration: data.duration ?? "",
            description: data.description || "",
            images: Array.isArray(data.images) ? data.images.slice() : [],
            risk_assessment: data.risk_assessment || "",
            news: Array.isArray(data.news) && data.news.length ? data.news.slice() : [""],
            highlights: Array.isArray(data.highlights) && data.highlights.length ? data.highlights.slice() : [""],
          });
          if (search.get("edit") === "1") setDrawerOpen(true);
        }
      } catch (e) {
        toast.add({ type: "error", title: "Failed", message: e?.message || "Could not load investment." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => (cancelled = true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    try {
      setSaving(true);
      const payload = {
        ...(form.vest_for ? { vest_for: String(form.vest_for).toUpperCase() } : {}),
        beneficiary_name: form.beneficiary_name?.trim(),
        investment_name: form.investment_name?.trim(),
        minimum_amount: form.minimum_amount ? Number(form.minimum_amount) : undefined,
        roi: form.roi ? Number(form.roi) : undefined,
        duration: form.duration ? String(form.duration) : undefined,
        description: form.description?.trim(),
        images: form.images,
        risk_assessment: form.risk_assessment?.trim(),
        news: (form.news || []).filter((n) => String(n || "").trim()),
        highlights: (form.highlights || []).filter((t) => String(t || "").trim()),
      };
      const updated = await updateVest(id, payload);
      setItem(updated);
      setDrawerOpen(false);
      toast.add({ type: "success", title: "Updated", message: "Investment updated Successfully." });
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Could not update investment." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setConfirmBusy(true);
    try {
      await deleteVest(id);
      toast.add({ type: "success", title: "Deleted", message: "Investment removed." });
      navigate("/investments");
    } catch (e) {
      toast.add({ type: "error", title: "Failed", message: e?.message || "Delete failed." });
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <main>
      <ToastAlert toasts={toast.toasts} remove={toast.remove} />

      <div className="overflow-x-hidden flex bg-gray-50">
        <Sidebar />
        <div id="app-layout-content" className="relative min-h-screen w-full min-w-[100vw] md:min-w-0 ml-[15.625rem] [transition:margin_0.25s_ease-out]">
          <Navbar />

          <div className="px-6 pb-20 pt-6">
            {/* Breadcrumb-ish caption */}
            <div className="text-xs text-gray-500 mb-2">
              <span className="font-medium text-gray-600">Investments</span>
              <span className="mx-1">/</span>
              <span>Active investment details</span>
            </div>

            {/* Top bar with back + actions */}
            <div className="flex items-center justify-between mb-4">
              <button className="inline-flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50" onClick={() => navigate("/investments")}>
                <FiArrowLeft /> Back to Investments
              </button>

              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50" onClick={() => {/* wire up when ready */}}>
                  <FiUsers /> View investors
                </button>

                <button className="inline-flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50" onClick={() => setDrawerOpen(true)}>
                  <FiEdit2 /> Edit
                </button>
                <button className="inline-flex items-center gap-2 px-3 py-2 rounded border border-red-300 text-red-700 hover:bg-red-50" onClick={() => setConfirmOpen(true)}>
                  <FiTrash2 /> Delete
                </button>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-600">
                <Spinner className="!text-gray-600" /> Loading…
              </div>
            ) : !item ? (
              <div className="text-center text-gray-600 py-16">Investment not found.</div>
            ) : (
              <>
                {/* Heading */}
                <div className="mb-4">
                  <h1 className="text-xl font-semibold">{item.investment_name}</h1>
                </div>

                {/* KPI cards block A (money) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                    <div className="text-xs text-gray-600 mb-2">Invested value</div>
                    <div className="text-2xl font-semibold">{asNGN(item.invested_value)}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                    <div className="text-xs text-gray-600 mb-2">Volume of active investment</div>
                    <div className="text-2xl font-semibold">{asNGN(item.active_investment_volume)}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                    <div className="text-xs text-gray-600 mb-2">Volume of paid out investment</div>
                    <div className="text-2xl font-semibold">{asNGN(item.paid_out_volume)}</div>
                  </div>
                </div>

                {/* KPI cards block B (counts) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                    <div className="text-xs text-gray-600 mb-2">Total investors</div>
                    <div className="text-2xl font-semibold">{item.investors_count || 0}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                    <div className="text-xs text-gray-600 mb-2">Active investors</div>
                    <div className="text-2xl font-semibold">{item.active_investors || 0}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                    <div className="text-xs text-gray-600 mb-2">Paid out investors</div>
                    <div className="text-2xl font-semibold">{item.paid_out_investors || 0}</div>
                  </div>
                </div>

                {/* Meta table (top of detail) */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 overflow-auto mb-6">
                  <table className="min-w-[640px] w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="pb-2 pr-4 font-semibold">Investment</th>
                        <th className="pb-2 pr-4 font-semibold">Min amount</th>
                        <th className="pb-2 pr-4 font-semibold">ROI</th>
                        <th className="pb-2 pr-4 font-semibold">No of Investors</th>
                        <th className="pb-2 pr-4 font-semibold">Invested value</th>
                        <th className="pb-2 pr-4 font-semibold">Date created</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="py-3 pr-4">{item.investment_name || "—"}</td>
                        <td className="py-3 pr-4">{asNGN(item.minimum_amount)}</td>
                        <td className="py-3 pr-4">{item.roi}% p.a</td>
                        <td className="py-3 pr-4">{item.investors_count || item.active_investors || 0}</td>
                        <td className="py-3 pr-4">{asNGN(item.invested_value)}</td>
                        <td className="py-3 pr-4">{item.createdAtReadable}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div>
                      <div className="text-xs text-gray-600">Duration</div>
                      <div className="font-medium">{item.duration} months</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">ROI</div>
                      <div className="font-medium">{item.roi}% p.a</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Closing date</div>
                      <div className="font-medium">{item.closingDateReadable || "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Images + side panels */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* images */}
                  <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-sm font-semibold mb-3">Images</div>
                    {Array.isArray(item.images) && item.images.length ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                        {item.images.map((src, i) => (
                          <a key={i} href={src} target="_blank" rel="noreferrer" className="block rounded border overflow-hidden">
                            <img src={src} alt="" className="w-full h-28 object-cover" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">No images.</div>
                    )}
                  </div>

                  {/* about / risk / highlights / news */}
                  <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
                    <div>
                      <div className="text-sm font-semibold mb-1">About Investment</div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.description || "—"}</p>
                    </div>

                    <div>
                      <div className="text-sm font-semibold mb-1">Risk Assessment</div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.risk_assessment || "—"}</p>
                    </div>

                    {!!(item.highlights && item.highlights.length) && (
                      <div>
                        <div className="text-sm font-semibold mb-1">Key Highlights</div>
                        <ul className="list-disc list-inside text-sm">
                          {item.highlights.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <div className="text-sm font-semibold mb-1">News</div>
                      {Array.isArray(item.news) && item.news.length ? (
                        <ul className="list-disc list-inside text-sm">
                          {item.news.map((n, i) => (
                            <li key={i}>
                              <a href={n} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                                {n}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-800">—</p>
                      )}
                    </div>

                    <div className="text-xs text-gray-600 pt-2 border-t">
                      Created: {item.createdAtReadable} • Updated: {item.updatedAtReadable}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Edit drawer */}
          <Drawer
            open={drawerOpen}
            title="Edit Investment"
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
                  onClick={submit}
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
            }
          >
            {/* same fields, plus Highlights */}
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

              {/* Images URLs (simple) */}
              <div className="space-y-2">
                <div className="text-xs text-gray-600">Images</div>
                {Array.isArray(form.images) &&
                  form.images.map((url, idx) => (
                    <div key={`img-url-${idx}`} className="flex gap-2">
                      <Text
                        placeholder="https://…"
                        value={typeof url === "string" ? url : ""}
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
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm"
                  onClick={() => setF("images", [...(form.images || []), ""])}
                >
                  + Add image URL
                </button>
              </div>

              {/* Risk, Highlights, News */}
              <div>
                <div className="text-xs text-gray-600 mb-1">Risk assessment</div>
                <TextArea value={form.risk_assessment} onChange={(e) => setF("risk_assessment", e.target.value)} />
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-600">Key highlights</div>
                {(form.highlights || [""]).map((t, idx) => (
                  <div key={`hi-${idx}`} className="flex gap-2">
                    <Text
                      placeholder="e.g. Secured by escrow…"
                      value={t}
                      onChange={(e) => setF("highlights", form.highlights.map((v, i) => (i === idx ? e.target.value : v)))}
                    />
                    <button className="px-3 rounded border hover:bg-gray-50" onClick={() => setF("highlights", form.highlights.filter((_, i) => i !== idx))} type="button">
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm" onClick={() => setF("highlights", [...(form.highlights || []), ""])}>
                  + Add highlight
                </button>
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
            }}
          />

          <Footer />
        </div>
      </div>
    </main>
  );
};

export default InvestmentDetails;
